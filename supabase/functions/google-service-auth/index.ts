
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
    // Use service role key for database operations to bypass RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Unauthorized - missing authorization header');
    }

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

    // Check if user is admin/owner
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'owner'].includes(profile.role)) {
      throw new Error('Insufficient permissions - admin/owner role required');
    }

    const { action, impersonate_email } = await req.json();

    switch (action) {
      case 'setup_service_account': {
        console.log('Setting up Google Service Account for company calendar with Domain-wide delegation');
        
        // Get Service Account key from Supabase secrets
        const serviceAccountKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
        
        if (!serviceAccountKey) {
          throw new Error('Service Account key not found. Please configure GOOGLE_SERVICE_ACCOUNT_KEY in Supabase secrets.');
        }

        let credentials;
        try {
          credentials = JSON.parse(serviceAccountKey);
        } catch (error) {
          throw new Error('Invalid Service Account key format. Please ensure it is valid JSON.');
        }

        // Validate required fields
        if (!credentials.private_key || !credentials.client_email || !credentials.project_id) {
          throw new Error('Service Account key is missing required fields (private_key, client_email, project_id)');
        }

        // Get access token using Service Account with Domain-wide delegation
        const accessToken = await getServiceAccountToken(credentials, 'inkoop@auto-city.nl');
        
        // Test calendar access by impersonating the main account
        const calendarResponse = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary', {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        });
        
        if (!calendarResponse.ok) {
          const errorData = await calendarResponse.json();
          console.error('Calendar access failed:', errorData);
          throw new Error(`Calendar access failed with Domain-wide delegation: ${errorData.error?.message || 'Unknown error'}. Make sure Domain-wide delegation is configured correctly.`);
        }

        const calendar = await calendarResponse.json();

        // Store Service Account setup in company_calendar_settings using service role
        const { error } = await supabase
          .from('company_calendar_settings')
          .upsert({
            company_id: 'auto-city',
            google_calendar_id: 'primary',
            calendar_name: calendar.summary || 'Auto City Calendar',
            calendar_email: 'inkoop@auto-city.nl', // The impersonated email
            sync_enabled: true,
            auth_type: 'service_account',
            managed_by_user_id: user.id,
            service_account_email: credentials.client_email,
          });

        if (error) {
          console.error('Database error:', error);
          throw error;
        }

        return new Response(JSON.stringify({ 
          success: true,
          calendar: {
            id: 'primary',
            name: calendar.summary || 'Auto City Calendar',
            email: 'inkoop@auto-city.nl'
          },
          authType: 'service_account',
          domainWideDelegation: true
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_access_token': {
        console.log('Getting fresh access token via Service Account with Domain-wide delegation');
        
        const serviceAccountKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
        
        if (!serviceAccountKey) {
          throw new Error('Service Account key not found');
        }

        const credentials = JSON.parse(serviceAccountKey);
        const emailToImpersonate = impersonate_email || 'inkoop@auto-city.nl';
        const accessToken = await getServiceAccountToken(credentials, emailToImpersonate);

        return new Response(JSON.stringify({ 
          access_token: accessToken,
          expires_in: 3600,
          impersonate_email: emailToImpersonate
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('Google Service Account error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Helper function to get access token using Service Account with Domain-wide delegation
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

    console.log('Creating JWT with impersonation for:', impersonateEmail);

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
      console.error('Token exchange failed:', tokenData);
      throw new Error(`Token exchange failed with Domain-wide delegation: ${tokenData.error_description || tokenData.error}`);
    }

    console.log('Successfully obtained access token with Domain-wide delegation');
    return tokenData.access_token;
  } catch (error) {
    console.error('Service Account token error with Domain-wide delegation:', error);
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
