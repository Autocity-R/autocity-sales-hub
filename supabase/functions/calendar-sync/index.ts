
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// TARGET CALENDAR naar primary met Domain-wide delegation
const TARGET_CALENDAR = 'primary';
const IMPERSONATE_EMAIL = 'inkoop@auto-city.nl'; // Email van de hoofdaccount die we impersoneren

interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone?: string };
  end: { dateTime: string; timeZone?: string };
  location?: string;
  attendees?: Array<{ email: string; displayName?: string }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use service role key for database operations to bypass RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    
    // Verify user authentication with anon key client
    const anonSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await anonSupabase.auth.getUser(token);

    if (!user) {
      throw new Error('Unauthorized');
    }

    const { action, appointmentId, eventData } = await req.json();

    console.log('🔄 Calendar sync action:', action, 'for appointment:', appointmentId);
    console.log('🎯 Target calendar (Domain-wide delegation):', TARGET_CALENDAR, 'impersonating:', IMPERSONATE_EMAIL);

    // Get company calendar settings using service role
    const { data: calendarSettingsArray, error: settingsError } = await supabase
      .from('company_calendar_settings')
      .select('*')
      .eq('company_id', 'auto-city')
      .eq('auth_type', 'service_account')
      .order('created_at', { ascending: false })
      .limit(1);

    console.log('📋 Calendar settings query result:', { calendarSettingsArray, settingsError });

    if (settingsError || !calendarSettingsArray || calendarSettingsArray.length === 0) {
      console.error('❌ Calendar settings error:', settingsError);
      throw new Error('Company calendar not configured. Please set up Service Account first.');
    }

    const calendarSettings = calendarSettingsArray[0];

    if (!calendarSettings.auth_type || calendarSettings.auth_type !== 'service_account') {
      throw new Error('Service Account authentication not configured');
    }

    // Get fresh access token using Service Account with Domain-wide delegation
    let accessToken: string;
    
    try {
      console.log('🔑 Getting fresh access token with Domain-wide delegation...');
      accessToken = await getServiceAccountToken();
      console.log('✅ Got access token successfully with Domain-wide delegation');
    } catch (tokenError) {
      console.error('❌ Failed to get access token:', tokenError);
      throw new Error(`Failed to get Service Account access token: ${tokenError.message}`);
    }

    switch (action) {
      case 'sync_to_google': {
        // Get appointment details using service role
        const { data: appointment, error: apptError } = await supabase
          .from('appointments')
          .select('*')
          .eq('id', appointmentId)
          .single();

        if (apptError || !appointment) {
          console.error('❌ Appointment query error:', apptError);
          throw new Error('Appointment not found');
        }

        console.log('📅 Creating Google Calendar event for appointment:', appointment.title);

        const googleEvent: CalendarEvent = {
          summary: appointment.title,
          description: `${appointment.description || appointment.notes || ''}\n\nKlant: ${appointment.customername}\nEmail: ${appointment.customeremail || ''}\nTelefoon: ${appointment.customerphone || ''}`,
          start: {
            dateTime: appointment.starttime,
            timeZone: 'Europe/Amsterdam',
          },
          end: {
            dateTime: appointment.endtime,
            timeZone: 'Europe/Amsterdam',
          },
          location: appointment.location || 'Auto City Showroom',
        };

        if (appointment.customeremail) {
          googleEvent.attendees = [{
            email: appointment.customeremail,
            displayName: appointment.customername,
          }];
        }

        let googleEventId = appointment.google_event_id;
        let syncAction = 'update';

        if (!googleEventId) {
          // Create new event in primary calendar via Domain-wide delegation
          console.log('➕ Creating new Google Calendar event in primary calendar...');
          const createResponse = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(TARGET_CALENDAR)}/events`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(googleEvent),
            }
          );

          if (!createResponse.ok) {
            const errorData = await createResponse.json();
            console.error('❌ Google Calendar create error:', errorData);
            throw new Error(`Failed to create Google Calendar event: ${errorData.error?.message || 'Unknown error'}`);
          }

          const createdEvent = await createResponse.json();
          googleEventId = createdEvent.id;
          syncAction = 'create';
          console.log('✅ Created Google Calendar event with ID:', googleEventId);
        } else {
          // Update existing event in primary calendar via Domain-wide delegation
          console.log('📝 Updating existing Google Calendar event:', googleEventId);
          const updateResponse = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(TARGET_CALENDAR)}/events/${googleEventId}`,
            {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(googleEvent),
            }
          );

          if (!updateResponse.ok) {
            const errorData = await updateResponse.json();
            console.error('❌ Google Calendar update error:', errorData);
            throw new Error(`Failed to update Google Calendar event: ${errorData.error?.message || 'Unknown error'}`);
          }
          console.log('✅ Updated Google Calendar event successfully');
        }

        // Update appointment with Google event ID using service role
        const { error: updateError } = await supabase
          .from('appointments')
          .update({
            google_event_id: googleEventId,
            google_calendar_id: IMPERSONATE_EMAIL,
            sync_status: 'synced',
            last_synced_at: new Date().toISOString(),
          })
          .eq('id', appointmentId);

        if (updateError) {
          console.error('❌ Failed to update appointment:', updateError);
          throw updateError;
        }

        // Log sync action
        await supabase
          .from('calendar_sync_logs')
          .insert({
            appointment_id: appointmentId,
            google_event_id: googleEventId,
            sync_direction: 'crm_to_google',
            sync_action: syncAction,
            sync_status: 'success',
            performed_by_user_id: user.id,
            sync_data: { appointment, googleEvent, targetCalendar: TARGET_CALENDAR, impersonateEmail: IMPERSONATE_EMAIL },
          });

        console.log('🎉 Sync completed successfully to primary calendar via Domain-wide delegation');

        return new Response(JSON.stringify({ 
          success: true, 
          googleEventId,
          syncAction,
          targetCalendar: TARGET_CALENDAR,
          impersonateEmail: IMPERSONATE_EMAIL,
          message: `Event successfully synced to ${IMPERSONATE_EMAIL} primary calendar`
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'delete_from_google': {
        const { data: appointment } = await supabase
          .from('appointments')
          .select('google_event_id')
          .eq('id', appointmentId)
          .single();

        if (appointment?.google_event_id) {
          console.log('🗑️ Deleting Google Calendar event:', appointment.google_event_id);
          const deleteResponse = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(TARGET_CALENDAR)}/events/${appointment.google_event_id}`,
            {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${accessToken}` },
            }
          );

          if (!deleteResponse.ok && deleteResponse.status !== 404) {
            const errorData = await deleteResponse.json();
            console.error('❌ Failed to delete from Google Calendar:', errorData);
            throw new Error(`Failed to delete Google Calendar event: ${errorData.error?.message || 'Unknown error'}`);
          }

          console.log('✅ Successfully deleted from Google Calendar');

          // Log sync action
          await supabase
            .from('calendar_sync_logs')
            .insert({
              appointment_id: appointmentId,
              google_event_id: appointment.google_event_id,
              sync_direction: 'crm_to_google',
              sync_action: 'delete',
              sync_status: 'success',
              performed_by_user_id: user.id,
            });
        }

        return new Response(JSON.stringify({ 
          success: true,
          message: 'Event successfully deleted from Google Calendar'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('❌ Calendar sync error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Check function logs for more information'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Helper function to get Service Account access token with Domain-wide delegation
async function getServiceAccountToken(): Promise<string> {
  try {
    console.log('🔄 Calling google-service-auth function for access token...');
    
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/google-service-auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({ 
        action: 'get_access_token',
        impersonate_email: IMPERSONATE_EMAIL
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ google-service-auth function error:', errorText);
      throw new Error(`Failed to get access token: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data?.access_token) {
      console.error('❌ No access token in response:', data);
      throw new Error('No access token received from google-service-auth function');
    }

    console.log('✅ Successfully obtained access token via google-service-auth function');
    return data.access_token;
  } catch (error) {
    console.error('❌ Service account token error:', error);
    throw error;
  }
}
