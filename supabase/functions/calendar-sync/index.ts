
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// TARGET CALENDAR naar primary met Domain-wide delegation
const TARGET_CALENDAR = 'primary';
const IMPERSONATE_EMAIL = 'inkoop@auto-city.nl';

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

    const { action, appointmentId } = await req.json();

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

    // Get fresh access token using Service Account with Domain-wide delegation DIRECTLY
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
        console.log('🕐 Raw appointment times:', {
          starttime: appointment.starttime,
          endtime: appointment.endtime,
          startType: typeof appointment.starttime,
          endType: typeof appointment.endtime
        });

        // Convert database timestamps to proper Google Calendar format
        const startDateTime = formatDateTimeForGoogle(appointment.starttime);
        const endDateTime = formatDateTimeForGoogle(appointment.endtime);

        console.log('🕐 Converted times for Google:', {
          startDateTime,
          endDateTime
        });

        const googleEvent: CalendarEvent = {
          summary: appointment.title,
          description: `${appointment.description || appointment.notes || ''}\n\nKlant: ${appointment.customername}\nEmail: ${appointment.customeremail || ''}\nTelefoon: ${appointment.customerphone || ''}`,
          start: {
            dateTime: startDateTime,
            timeZone: 'Europe/Amsterdam',
          },
          end: {
            dateTime: endDateTime,
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

        console.log('📋 Google Event payload:', JSON.stringify(googleEvent, null, 2));

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

          console.log('📡 Google Calendar API response status:', createResponse.status);

          if (!createResponse.ok) {
            const errorText = await createResponse.text();
            console.error('❌ Google Calendar create error response:', errorText);
            
            let errorData;
            try {
              errorData = JSON.parse(errorText);
            } catch {
              errorData = { error: { message: errorText } };
            }
            
            throw new Error(`Failed to create Google Calendar event: ${errorData.error?.message || 'Unknown error'}`);
          }

          const createdEvent = await createResponse.json();
          googleEventId = createdEvent.id;
          syncAction = 'create';
          console.log('✅ Created Google Calendar event with ID:', googleEventId);
          console.log('📋 Created event details:', JSON.stringify(createdEvent, null, 2));
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

          console.log('📡 Google Calendar API update response status:', updateResponse.status);

          if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            console.error('❌ Google Calendar update error response:', errorText);
            
            let errorData;
            try {
              errorData = JSON.parse(errorText);
            } catch {
              errorData = { error: { message: errorText } };
            }
            
            throw new Error(`Failed to update Google Calendar event: ${errorData.error?.message || 'Unknown error'}`);
          }
          
          const updatedEvent = await updateResponse.json();
          console.log('✅ Updated Google Calendar event successfully');
          console.log('📋 Updated event details:', JSON.stringify(updatedEvent, null, 2));
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
          
          // Get fresh access token for delete operation
          const deleteAccessToken = await getServiceAccountToken();
          
          const deleteResponse = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(TARGET_CALENDAR)}/events/${appointment.google_event_id}`,
            {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${deleteAccessToken}` },
            }
          );

          if (!deleteResponse.ok && deleteResponse.status !== 404) {
            const errorText = await deleteResponse.text();
            console.error('❌ Failed to delete from Google Calendar:', errorText);
            
            let errorData;
            try {
              errorData = JSON.parse(errorText);
            } catch {
              errorData = { error: { message: errorText } };
            }
            
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

// Helper function to format datetime for Google Calendar API
function formatDateTimeForGoogle(dateTimeInput: string | Date): string {
  try {
    // Ensure we have a proper Date object
    const date = typeof dateTimeInput === 'string' ? new Date(dateTimeInput) : dateTimeInput;
    
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date: ${dateTimeInput}`);
    }
    
    // Convert to ISO string and ensure it's in the correct format
    // Google Calendar expects: YYYY-MM-DDTHH:mm:ss.sssZ or YYYY-MM-DDTHH:mm:ss+HH:mm
    const isoString = date.toISOString();
    console.log(`🕐 Formatted ${dateTimeInput} to ${isoString}`);
    
    return isoString;
  } catch (error) {
    console.error(`❌ Error formatting datetime ${dateTimeInput}:`, error);
    throw new Error(`Failed to format datetime: ${error.message}`);
  }
}

// Helper function to get Service Account access token with Domain-wide delegation DIRECTLY
async function getServiceAccountToken(): Promise<string> {
  try {
    console.log('🔄 Getting Service Account token directly...');
    
    const serviceAccountKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
    
    if (!serviceAccountKey) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY not found in environment');
    }

    let credentials;
    try {
      credentials = JSON.parse(serviceAccountKey);
    } catch (error) {
      throw new Error('Invalid Service Account key format');
    }

    const now = Math.floor(Date.now() / 1000);
    const expires = now + 3600; // 1 hour

    // Create JWT header
    const header = {
      alg: "RS256",
      typ: "JWT",
      kid: credentials.private_key_id
    };

    // Create JWT payload with Domain-wide delegation
    const payload = {
      iss: credentials.client_email,
      sub: IMPERSONATE_EMAIL, // This enables impersonation via Domain-wide delegation
      scope: 'https://www.googleapis.com/auth/calendar',
      aud: 'https://oauth2.googleapis.com/token',
      exp: expires,
      iat: now
    };

    console.log('🔑 Creating JWT with impersonation for:', IMPERSONATE_EMAIL);

    // Create JWT assertion
    const jwt = await createJWTAssertion(header, payload, credentials.private_key);

    // Exchange JWT for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt
      }),
    });

    const tokenData = await tokenResponse.json();
    
    if (!tokenResponse.ok) {
      console.error('❌ Token exchange failed:', tokenData);
      throw new Error(`Token exchange failed: ${tokenData.error_description || tokenData.error}`);
    }

    console.log('✅ Successfully obtained access token directly');
    return tokenData.access_token;
  } catch (error) {
    console.error('❌ Service Account token error:', error);
    throw error;
  }
}

// Helper to create JWT assertion with proper RS256 signing
async function createJWTAssertion(header: any, payload: any, privateKey: string): Promise<string> {
  // Base64url encode header and payload
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  
  // Create signature input
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  
  // Clean up private key
  const cleanPrivateKey = privateKey
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');
  
  // Convert to Uint8Array
  const keyData = Uint8Array.from(atob(cleanPrivateKey), c => c.charCodeAt(0));
  
  // Import the private key
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );
  
  // Sign the input
  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    encoder.encode(signatureInput)
  );
  
  // Encode signature
  const encodedSignature = base64UrlEncode(signature);
  
  return `${signatureInput}.${encodedSignature}`;
}

// Helper function for base64url encoding
function base64UrlEncode(data: string | ArrayBuffer): string {
  let base64;
  if (typeof data === 'string') {
    base64 = btoa(data);
  } else {
    base64 = btoa(String.fromCharCode(...new Uint8Array(data)));
  }
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
