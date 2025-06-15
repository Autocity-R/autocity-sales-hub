import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use service role key for database operations
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

    console.log('Test: Starting Google Calendar test');

    // Get Service Account key from Supabase secrets
    const serviceAccountKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
    
    if (!serviceAccountKey) {
      throw new Error('Service Account key not found in secrets');
    }

    console.log('Test: Service Account key found');

    let credentials;
    try {
      credentials = JSON.parse(serviceAccountKey);
      console.log('Test: Service Account key parsed successfully');
      console.log('Test: Using service account:', credentials.client_email);
    } catch (error) {
      throw new Error('Invalid Service Account key format');
    }

    // Get access token using Service Account
    const accessToken = await getServiceAccountToken(credentials);
    console.log('Test: Access token obtained successfully');

    // First, let's check which calendars are available
    console.log('Test: Fetching available calendars...');
    const calendarListResponse = await fetch(
      'https://www.googleapis.com/calendar/v3/users/me/calendarList',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    const calendarList = await calendarListResponse.json();
    console.log('Test: Available calendars:', calendarList);

    // Create a simple test event for today
    const today = new Date();
    const startTime = new Date(today);
    startTime.setHours(14, 0, 0, 0); // 2 PM today
    
    const endTime = new Date(startTime);
    endTime.setHours(15, 0, 0, 0); // 3 PM today

    const testEvent = {
      summary: `🧪 TEST EVENT - ${new Date().toLocaleString('nl-NL')}`,
      description: `Dit is een test event om te controleren of de Google Calendar sync werkt.\n\nAangemaakt op: ${new Date().toLocaleString('nl-NL')}\nService Account: ${credentials.client_email}`,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: 'Europe/Amsterdam',
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'Europe/Amsterdam',
      },
      location: 'Test Locatie - Auto City',
      colorId: '2', // Green color to make it stand out
    };

    console.log('Test: Creating event with data:', testEvent);

    // TARGET CALENDAR: inkoop@auto-city.nl
    const targetCalendar = 'inkoop@auto-city.nl';
    
    console.log(`Test: Trying to create event in target calendar: ${targetCalendar}`);
    
    // First, let's try to get information about the target calendar
    console.log('Test: Checking target calendar access...');
    try {
      const calendarInfoResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetCalendar)}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );
      
      const calendarInfo = await calendarInfoResponse.json();
      console.log('Test: Target calendar info:', calendarInfo);
      
      if (!calendarInfoResponse.ok) {
        console.log('Test: Cannot access target calendar, trying ACL check...');
        
        // Check calendar ACL (Access Control List)
        const aclResponse = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetCalendar)}/acl`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        );
        
        const aclInfo = await aclResponse.json();
        console.log('Test: Target calendar ACL:', aclInfo);
      }
    } catch (aclError) {
      console.log('Test: Error checking calendar access:', aclError);
    }
    
    let createResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetCalendar)}/events`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testEvent),
      }
    );

    let responseData = await createResponse.json();
    console.log('Test: Target calendar response:', responseData);

    // If target calendar fails, try primary calendar as fallback
    if (!createResponse.ok) {
      console.log('Test: Target calendar failed, trying primary calendar...');
      
      createResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(testEvent),
        }
      );

      responseData = await createResponse.json();
      console.log('Test: Primary calendar response:', responseData);
    }

    if (!createResponse.ok) {
      console.error('Test: Both calendar attempts failed:', responseData);
      
      return new Response(JSON.stringify({ 
        success: false,
        error: `Failed to create test event: ${responseData.error?.message || 'Unknown error'}`,
        details: `Target calendar (${targetCalendar}) is niet toegankelijk. Controleer de calendar permissions.`,
        debugInfo: {
          serviceAccount: credentials.client_email,
          targetCalendar: targetCalendar,
          targetCalendarError: responseData,
          availableCalendars: calendarList.items?.map(cal => ({
            id: cal.id,
            summary: cal.summary,
            accessRole: cal.accessRole,
            primary: cal.primary
          })) || [],
          troubleshooting: [
            `1. Ga naar calendar.google.com met inkoop@auto-city.nl account`,
            `2. Ga naar Settings -> jouw calendar -> "Share with specific people"`,
            `3. Voeg toe: ${credentials.client_email}`,
            `4. Geef "Make changes to events" rechten`,
            `5. Wacht 1-2 minuten en probeer opnieuw`
          ]
        }
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Test: Successfully created test event with ID:', responseData.id);

    const calendarUsed = responseData.organizer?.email === targetCalendar ? targetCalendar : 
                        (responseData.organizer?.email || 'primary');

    return new Response(JSON.stringify({ 
      success: true,
      message: calendarUsed === targetCalendar ? 
        `Test event succesvol aangemaakt in inkoop@auto-city.nl calendar! 🎉` :
        `Test event aangemaakt in Service Account calendar (inkoop@auto-city.nl niet toegankelijk)`,
      eventId: responseData.id,
      eventLink: responseData.htmlLink,
      eventTime: `${startTime.toLocaleString('nl-NL')} - ${endTime.toLocaleString('nl-NL')}`,
      calendarUsed: calendarUsed,
      targetCalendar: targetCalendar,
      credentials: {
        clientEmail: credentials.client_email,
        projectId: credentials.project_id
      },
      availableCalendars: calendarList.items?.map(cal => ({
        id: cal.id,
        summary: cal.summary,
        accessRole: cal.accessRole,
        primary: cal.primary
      })) || [],
      calendarAccessible: calendarUsed === targetCalendar
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Test: Google Calendar test failed:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      details: 'Controleer de logs voor meer informatie'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Helper function to get Service Account access token
async function getServiceAccountToken(credentials: any): Promise<string> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const expires = now + 3600; // 1 hour

    // Create JWT header
    const header = {
      alg: "RS256",
      typ: "JWT",
      kid: credentials.private_key_id
    };

    // Create JWT payload
    const payload = {
      iss: credentials.client_email,
      scope: 'https://www.googleapis.com/auth/calendar',
      aud: 'https://oauth2.googleapis.com/token',
      exp: expires,
      iat: now
    };

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
      throw new Error(`Token exchange failed: ${tokenData.error_description || tokenData.error}`);
    }

    return tokenData.access_token;
  } catch (error) {
    console.error('Service Account token error:', error);
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
