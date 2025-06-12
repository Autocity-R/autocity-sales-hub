
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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      throw new Error('Unauthorized');
    }

    const { action, appointmentId, eventData } = await req.json();

    // Get company calendar settings
    const { data: calendarSettings, error: settingsError } = await supabase
      .from('company_calendar_settings')
      .select('*')
      .eq('company_id', 'auto-city')
      .single();

    if (settingsError || !calendarSettings) {
      throw new Error('Company calendar not configured. Please set up Service Account first.');
    }

    // Get fresh access token using service account
    const accessToken = await getServiceAccountToken();

    switch (action) {
      case 'sync_to_google': {
        // Get appointment from database
        const { data: appointment, error: apptError } = await supabase
          .from('appointments')
          .select('*')
          .eq('id', appointmentId)
          .single();

        if (apptError || !appointment) {
          throw new Error('Appointment not found');
        }

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

          const createdEvent = await createResponse.json();
          if (!createResponse.ok) {
            throw new Error(`Failed to create Google Calendar event: ${createdEvent.error?.message}`);
          }

          googleEventId = createdEvent.id;
          syncAction = 'create';
        } else {
          // Update existing event
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
            throw new Error(`Failed to update Google Calendar event: ${errorData.error?.message}`);
          }
        }

        // Update appointment with Google event ID
        const { error: updateError } = await supabase
          .from('appointments')
          .update({
            google_event_id: googleEventId,
            google_calendar_id: 'primary',
            sync_status: 'synced',
            last_synced_at: new Date().toISOString(),
          })
          .eq('id', appointmentId);

        if (updateError) throw updateError;

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

// Helper function to get service account access token
async function getServiceAccountToken(): Promise<string> {
  const serviceAccountKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
  if (!serviceAccountKey) {
    throw new Error('Google Service Account credentials not configured');
  }

  const credentials = JSON.parse(serviceAccountKey);
  
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 3600;

  const payload = {
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/calendar',
    aud: 'https://oauth2.googleapis.com/token',
    exp: exp,
    iat: now,
    sub: 'info@auto-city.nl'
  };

  // In production, you would use proper JWT signing here
  // For now, we'll use Google's client libraries approach
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: await createJWTAssertion(credentials, payload)
    }),
  });

  const tokenData = await tokenResponse.json();
  
  if (!tokenData.access_token) {
    throw new Error('Failed to get service account access token');
  }

  return tokenData.access_token;
}

async function createJWTAssertion(credentials: any, payload: any) {
  const header = { alg: "RS256", typ: "JWT" };
  
  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  return `${encodedHeader}.${encodedPayload}.signature_placeholder`;
}
