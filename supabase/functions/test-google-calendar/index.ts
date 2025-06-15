
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

    console.log('Test: Starting Google Calendar test with Service Account and Domain-wide delegation');

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

    // Get access token using Service Account with Domain-wide delegation
    const impersonateEmail = 'info@auto-city.nl';
    const accessToken = await getServiceAccountToken(credentials, impersonateEmail);
    console.log('Test: Access token obtained successfully with Domain-wide delegation');

    // Test calendar access via Domain-wide delegation
    console.log('Test: Testing calendar access via Domain-wide delegation...');
    const calendarListResponse = await fetch(
      'https://www.googleapis.com/calendar/v3/users/me/calendarList',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    const calendarList = await calendarListResponse.json();
    console.log('Test: Available calendars via Domain-wide delegation:', calendarList);

    // Create a simple test event for today in primary calendar
    const today = new Date();
    const startTime = new Date(today);
    startTime.setHours(14, 0, 0, 0); // 2 PM today
    
    const endTime = new Date(startTime);
    endTime.setHours(15, 0, 0, 0); // 3 PM today

    const testEvent = {
      summary: `🧪 DOMAIN-WIDE DELEGATION TEST - ${new Date().toLocaleString('nl-NL')}`,
      description: `Dit is een test event in de primary calendar via Domain-wide delegation om te controleren of de sync werkt.\n\nAangemaakt op: ${new Date().toLocaleString('nl-NL')}\nService Account: ${credentials.client_email}\nImpersonating: ${impersonateEmail}`,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: 'Europe/Amsterdam',
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'Europe/Amsterdam',
      },
      location: 'Primary Calendar via Domain-wide Delegation - Auto City',
      colorId: '2', // Green color to make it stand out
    };

    console.log('Test: Creating event with data:', testEvent);

    // TARGET CALENDAR: gebruik primary calendar via Domain-wide delegation
    const targetCalendar = 'primary';
    
    console.log(`Test: Creating event in primary calendar via Domain-wide delegation`);
    
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
    console.log('Test: Primary calendar response via Domain-wide delegation:', responseData);

    if (!createResponse.ok) {
      console.error('Test: Primary calendar failed via Domain-wide delegation:', responseData);
      
      return new Response(JSON.stringify({ 
        success: false,
        error: `Failed to create test event: ${responseData.error?.message || 'Unknown error'}`,
        details: `Primary calendar is niet toegankelijk via Domain-wide delegation. Controleer de Domain-wide delegation configuratie.`,
        debugInfo: {
          serviceAccount: credentials.client_email,
          impersonateEmail: impersonateEmail,
          targetCalendar: targetCalendar,
          error: responseData,
          availableCalendars: calendarList.items?.map(cal => ({
            id: cal.id,
            summary: cal.summary,
            accessRole: cal.accessRole,
            primary: cal.primary
          })) || []
        }
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Test: Successfully created test event with ID:', responseData.id);

    return new Response(JSON.stringify({ 
      success: true,
      message: `Test event succesvol aangemaakt in primary calendar via Domain-wide delegation! 🎉`,
      eventId: responseData.id,
      eventLink: responseData.htmlLink,
      eventTime: `${startTime.toLocaleString('nl-NL')} - ${endTime.toLocaleString('nl-NL')}`,
      calendarUsed: impersonateEmail,
      targetCalendar: 'primary',
      domainWideDelegation: true,
      credentials: {
        clientEmail: credentials.client_email,
        projectId: credentials.project_id,
        impersonateEmail: impersonateEmail
      },
      availableCalendars: calendarList.items?.map(cal => ({
        id: cal.id,
        summary: cal.summary,
        accessRole: cal.accessRole,
        primary: cal.primary
      })) || [],
      calendarAccessible: true,
      sharingInstructions: {
        calendarId: impersonateEmail,
        steps: [
          "1. De calendar is nu toegankelijk via info@auto-city.nl",
          "2. Alle medewerkers kunnen de calendar zien als ze ingelogd zijn met hun Auto City Google account",
          "3. Events worden aangemaakt in de primary calendar van info@auto-city.nl",
          "4. Domain-wide delegation zorgt ervoor dat het Service Account namens de organisatie kan handelen",
          "5. Geen handmatige sharing meer nodig - alles werkt via de organisatie account"
        ]
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Test: Google Calendar test failed:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      details: 'Controleer de logs voor meer informatie. Mogelijk is Domain-wide delegation niet correct geconfigureerd.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Helper function to get Service Account access token with Domain-wide delegation
async function getServiceAccountToken(credentials: any, impersonateEmail: string): Promise<string> {
  try {
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
      sub: impersonateEmail, // This enables impersonation via Domain-wide delegation
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
