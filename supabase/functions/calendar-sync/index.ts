
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    console.log('Calendar sync action:', action, 'for appointment:', appointmentId);

    // Get company calendar settings using service role
    const { data: calendarSettings, error: settingsError } = await supabase
      .from('company_calendar_settings')
      .select('*')
      .eq('company_id', 'auto-city')
      .single();

    console.log('Calendar settings query result:', { calendarSettings, settingsError });

    if (settingsError || !calendarSettings) {
      console.error('Calendar settings error:', settingsError);
      throw new Error('Company calendar not configured. Please set up Service Account first.');
    }

    if (!calendarSettings.auth_type || calendarSettings.auth_type !== 'service_account') {
      throw new Error('Service Account authentication not configured');
    }

    // Get fresh access token using Service Account
    let accessToken: string;
    
    try {
      accessToken = await getServiceAccountToken();
      console.log('Got access token successfully');
    } catch (tokenError) {
      console.error('Failed to get access token:', tokenError);
      throw new Error('Failed to get Service Account access token');
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
          console.error('Appointment query error:', apptError);
          throw new Error('Appointment not found');
        }

        console.log('Creating Google Calendar event for appointment:', appointment.title);

        const googleEvent: CalendarEvent = {
          summary: appointment.title,
          description: appointment.description || appointment.notes,
          start: {
            dateTime: appointment.starttime,
            timeZone: 'Europe/Amsterdam',
          },
          end: {
            dateTime: appointment.endtime,
            timeZone: 'Europe/Amsterdam',
          },
          location: appointment.location,
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
          // Create new event
          console.log('Creating new Google Calendar event');
          const createResponse = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events`,
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
            console.error('Google Calendar create error:', errorData);
            throw new Error(`Failed to create Google Calendar event: ${errorData.error?.message}`);
          }

          const createdEvent = await createResponse.json();
          googleEventId = createdEvent.id;
          syncAction = 'create';
          console.log('Created Google Calendar event with ID:', googleEventId);
        } else {
          // Update existing event
          console.log('Updating existing Google Calendar event:', googleEventId);
          const updateResponse = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`,
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
            console.error('Google Calendar update error:', errorData);
            throw new Error(`Failed to update Google Calendar event: ${errorData.error?.message}`);
          }
          console.log('Updated Google Calendar event successfully');
        }

        // Update appointment with Google event ID using service role
        const { error: updateError } = await supabase
          .from('appointments')
          .update({
            google_event_id: googleEventId,
            google_calendar_id: 'primary',
            sync_status: 'synced',
            last_synced_at: new Date().toISOString(),
          })
          .eq('id', appointmentId);

        if (updateError) {
          console.error('Failed to update appointment:', updateError);
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
            sync_data: { appointment, googleEvent },
          });

        console.log('Sync completed successfully');

        return new Response(JSON.stringify({ 
          success: true, 
          googleEventId,
          syncAction 
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
          const deleteResponse = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events/${appointment.google_event_id}`,
            {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${accessToken}` },
            }
          );

          if (!deleteResponse.ok && deleteResponse.status !== 404) {
            throw new Error('Failed to delete Google Calendar event');
          }

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

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('Calendar sync error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Helper function to get Service Account access token
async function getServiceAccountToken(): Promise<string> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const { data, error } = await supabase.functions.invoke('google-service-auth', {
    body: { action: 'get_access_token' }
  });

  if (error || !data?.access_token) {
    console.error('Service account token error:', error);
    throw new Error('Failed to get Service Account access token');
  }

  return data.access_token;
}
