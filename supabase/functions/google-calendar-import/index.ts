import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const IMPERSONATE_EMAIL = 'verkoop@auto-city.nl';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get Service Account credentials
    const serviceAccountKeyJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
    if (!serviceAccountKeyJson) {
      throw new Error('Google Service Account key not found');
    }

    const credentials = JSON.parse(serviceAccountKeyJson);
    console.log('Import: Using service account:', credentials.client_email);

    // Get access token using Domain-wide delegation
    const accessToken = await getServiceAccountToken(credentials, IMPERSONATE_EMAIL);
    console.log('Import: Access token obtained successfully');

    // Get date range for import (next 30 days)
    const now = new Date();
    const endDate = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days from now
    
    const timeMin = now.toISOString();
    const timeMax = endDate.toISOString();

    console.log(`Import: Fetching events from ${timeMin} to ${timeMax}`);

    // Fetch events from Google Calendar
    const calendarResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!calendarResponse.ok) {
      throw new Error(`Google Calendar API error: ${calendarResponse.status}`);
    }

    const calendarData = await calendarResponse.json();
    console.log(`Import: Found ${calendarData.items?.length || 0} events in Google Calendar`);

    // Get existing appointments from database
    const { data: existingAppointments, error: fetchError } = await supabaseClient
      .from('appointments')
      .select('google_event_id')
      .not('google_event_id', 'is', null);

    if (fetchError) {
      throw new Error(`Database error: ${fetchError.message}`);
    }

    const existingEventIds = new Set(existingAppointments?.map(a => a.google_event_id) || []);
    console.log(`Import: Found ${existingEventIds.size} existing synced appointments in CRM`);

    // Filter new events that don't exist in CRM
    const newEvents = (calendarData.items || []).filter((event: any) => 
      !existingEventIds.has(event.id) && 
      event.start && 
      (event.start.dateTime || event.start.date)
    );

    console.log(`Import: ${newEvents.length} new events to import`);

    let importedCount = 0;
    const errors = [];

    // Import each new event
    for (const event of newEvents) {
      try {
        const appointment = convertGoogleEventToAppointment(event);
        
        const { error: insertError } = await supabaseClient
          .from('appointments')
          .insert([appointment]);

        if (insertError) {
          console.error(`Import error for event ${event.id}:`, insertError);
          errors.push(`Event "${event.summary}": ${insertError.message}`);
        } else {
          importedCount++;
          console.log(`Import: Successfully imported event "${event.summary}"`);
        }
      } catch (error) {
        console.error(`Import error for event ${event.id}:`, error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`Event "${event.summary}": ${errorMessage}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        imported: importedCount,
        total: newEvents.length,
        errors: errors,
        message: `Imported ${importedCount} new appointments from Google Calendar`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Import function error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

function convertGoogleEventToAppointment(googleEvent: any) {
  // Convert Google Calendar event to CRM appointment format
  const startTime = googleEvent.start.dateTime || googleEvent.start.date;
  const endTime = googleEvent.end.dateTime || googleEvent.end.date;
  
  // Extract customer info from description or title if available
  const description = googleEvent.description || '';
  const summary = googleEvent.summary || 'Geïmporteerde afspraak';
  
  // Try to determine appointment type based on title/description
  let appointmentType = 'overig';
  const lowerSummary = summary.toLowerCase();
  if (lowerSummary.includes('proefrit') || lowerSummary.includes('testrit')) {
    appointmentType = 'proefrit';
  } else if (lowerSummary.includes('aflevering') || lowerSummary.includes('levering')) {
    appointmentType = 'aflevering';
  } else if (lowerSummary.includes('ophalen') || lowerSummary.includes('ophaal')) {
    appointmentType = 'ophalen';
  } else if (lowerSummary.includes('onderhoud') || lowerSummary.includes('service')) {
    appointmentType = 'onderhoud';
  } else if (lowerSummary.includes('intake') || lowerSummary.includes('inname')) {
    appointmentType = 'intake';
  } else if (lowerSummary.includes('bezichtiging') || lowerSummary.includes('bekijken')) {
    appointmentType = 'bezichtiging';
  }

  return {
    title: summary,
    description: description || null,
    starttime: startTime,
    endtime: endTime,
    type: appointmentType,
    status: 'gepland',
    location: googleEvent.location || null,
    notes: `Geïmporteerd uit Google Calendar op ${new Date().toLocaleString('nl-NL')}`,
    createdby: 'google-calendar-import',
    assignedto: null,
    customerid: null,
    customername: null,
    customeremail: null,
    customerphone: null,
    vehicleid: null,
    vehiclebrand: null,
    vehiclemodel: null,
    vehiclelicensenumber: null,
    leadid: null,
    remindersent: false,
    confirmationsent: false,
    google_event_id: googleEvent.id,
    google_calendar_id: IMPERSONATE_EMAIL,
    sync_status: 'synced',
    created_by_ai: false,
    ai_agent_id: null
  };
}

async function getServiceAccountToken(credentials: any, impersonateEmail: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/calendar',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
    sub: impersonateEmail
  };

  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };

  const assertion = await createJWTAssertion(header, payload, credentials.private_key);

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: assertion,
    }),
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`Token request failed: ${JSON.stringify(data)}`);
  }

  return data.access_token;
}

async function createJWTAssertion(header: any, payload: any, privateKey: string): Promise<string> {
  const encoder = new TextEncoder();
  
  const headerBase64 = base64UrlEncode(JSON.stringify(header));
  const payloadBase64 = base64UrlEncode(JSON.stringify(payload));
  
  const data = `${headerBase64}.${payloadBase64}`;
  
  const privateKeyFormatted = privateKey
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  
  const keyData = Uint8Array.from(atob(privateKeyFormatted), c => c.charCodeAt(0));
  
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
  
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    encoder.encode(data)
  );
  
  const signatureBase64 = base64UrlEncode(new Uint8Array(signature));
  
  return `${data}.${signatureBase64}`;
}

function base64UrlEncode(data: string | Uint8Array): string {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}