
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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Unauthorized - missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      throw new Error('Unauthorized');
    }

    const { action } = await req.json();

    switch (action) {
      case 'setup_workload_identity': {
        console.log('Setting up Workload Identity Federation for company calendar');
        
        // Get Workload Identity configuration from Supabase secrets
        const workloadIdentityProvider = Deno.env.get('GOOGLE_WORKLOAD_IDENTITY_PROVIDER');
        const serviceAccountEmail = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL');
        
        if (!workloadIdentityProvider || !serviceAccountEmail) {
          throw new Error('Workload Identity configuration not found. Please configure GOOGLE_WORKLOAD_IDENTITY_PROVIDER and GOOGLE_SERVICE_ACCOUNT_EMAIL in Supabase secrets.');
        }

        // Get access token using Workload Identity Federation
        const accessToken = await getWorkloadIdentityToken(workloadIdentityProvider, serviceAccountEmail);
        
        // Test calendar access
        const calendarResponse = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary', {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        });
        
        const calendar = await calendarResponse.json();

        if (!calendarResponse.ok) {
          throw new Error(`Calendar access failed: ${calendar.error?.message}`);
        }

        // Store Workload Identity setup in company_calendar_settings
        const { error } = await supabase
          .from('company_calendar_settings')
          .upsert({
            company_id: 'auto-city',
            google_calendar_id: calendar.id,
            calendar_name: calendar.summary,
            calendar_email: 'info@auto-city.nl',
            sync_enabled: true,
            auth_type: 'workload_identity',
            managed_by_user_id: user.id,
            service_account_email: serviceAccountEmail,
          });

        if (error) throw error;

        return new Response(JSON.stringify({ 
          success: true,
          calendar: {
            id: calendar.id,
            name: calendar.summary,
            email: 'info@auto-city.nl'
          },
          authType: 'workload_identity'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_access_token': {
        console.log('Getting fresh access token via Workload Identity');
        
        const workloadIdentityProvider = Deno.env.get('GOOGLE_WORKLOAD_IDENTITY_PROVIDER');
        const serviceAccountEmail = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL');
        
        if (!workloadIdentityProvider || !serviceAccountEmail) {
          throw new Error('Workload Identity configuration not found');
        }

        const accessToken = await getWorkloadIdentityToken(workloadIdentityProvider, serviceAccountEmail);

        return new Response(JSON.stringify({ 
          access_token: accessToken,
          expires_in: 3600
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('Google Workload Identity error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Helper function to get access token using Workload Identity Federation
async function getWorkloadIdentityToken(provider: string, serviceAccountEmail: string): Promise<string> {
  try {
    // Step 1: Get OIDC token from Supabase environment
    // In Supabase edge functions, we can use the built-in identity
    const idToken = await getSupabaseIdToken();
    
    // Step 2: Exchange OIDC token for Google access token via STS
    const stsResponse = await fetch('https://sts.googleapis.com/v1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
        audience: provider,
        scope: 'https://www.googleapis.com/auth/cloud-platform',
        subject_token_type: 'urn:ietf:params:oauth:token-type:id_token',
        subject_token: idToken,
        requested_token_type: 'urn:ietf:params:oauth:token-type:access_token'
      }),
    });

    const stsData = await stsResponse.json();
    
    if (!stsResponse.ok) {
      throw new Error(`STS token exchange failed: ${stsData.error_description || stsData.error}`);
    }

    // Step 3: Impersonate Service Account to get Calendar access
    const impersonateResponse = await fetch(
      `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${serviceAccountEmail}:generateIdToken`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stsData.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audience: serviceAccountEmail,
          includeEmail: true,
          scope: ['https://www.googleapis.com/auth/calendar']
        }),
      }
    );

    const impersonateData = await impersonateResponse.json();
    
    if (!impersonateResponse.ok) {
      throw new Error(`Service Account impersonation failed: ${impersonateData.error?.message}`);
    }

    return impersonateData.idToken;
  } catch (error) {
    console.error('Workload Identity token error:', error);
    throw error;
  }
}

// Helper to get OIDC token from Supabase environment
async function getSupabaseIdToken(): Promise<string> {
  // In Supabase edge functions, we can use the JWT from the request context
  // For now, we'll create a basic JWT that Google can validate
  const header = {
    alg: "RS256",
    typ: "JWT",
    kid: "supabase-edge-function"
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: 'https://fnwagrmoyfyimdoaynkg.supabase.co',
    aud: 'https://sts.googleapis.com/',
    sub: 'supabase-edge-function',
    iat: now,
    exp: now + 3600,
    email: 'edge-function@fnwagrmoyfyimdoaynkg.iam.gserviceaccount.com'
  };

  // For demo purposes - in production you'd sign this properly
  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  return `${encodedHeader}.${encodedPayload}.mock_signature`;
}
