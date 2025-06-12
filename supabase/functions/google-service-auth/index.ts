
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
      case 'setup_service_account': {
        console.log('Setting up Google Service Account for company calendar');
        
        // Get service account credentials from Supabase secrets
        const serviceAccountKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
        if (!serviceAccountKey) {
          throw new Error('Google Service Account credentials not configured');
        }

        const credentials = JSON.parse(serviceAccountKey);
        
        // Create JWT for service account authentication
        const now = Math.floor(Date.now() / 1000);
        const exp = now + 3600; // 1 hour expiration

        const header = {
          alg: "RS256",
          typ: "JWT"
        };

        const payload = {
          iss: credentials.client_email,
          scope: 'https://www.googleapis.com/auth/calendar',
          aud: 'https://oauth2.googleapis.com/token',
          exp: exp,
          iat: now,
          sub: 'info@auto-city.nl' // Impersonate the main calendar account
        };

        // Create JWT assertion (this would require crypto library in production)
        // For now, we'll use Google's token endpoint directly with service account
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

        // Test calendar access
        const calendarResponse = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary', {
          headers: { 'Authorization': `Bearer ${tokenData.access_token}` },
        });
        
        const calendar = await calendarResponse.json();

        if (!calendarResponse.ok) {
          throw new Error(`Calendar access failed: ${calendar.error?.message}`);
        }

        // Store service account setup in company_calendar_settings
        const { error } = await supabase
          .from('company_calendar_settings')
          .upsert({
            company_id: 'auto-city',
            google_calendar_id: calendar.id,
            calendar_name: calendar.summary,
            calendar_email: 'info@auto-city.nl',
            sync_enabled: true,
            auth_type: 'service_account',
            managed_by_user_id: user.id,
            service_account_email: credentials.client_email,
          });

        if (error) throw error;

        return new Response(JSON.stringify({ 
          success: true,
          calendar: {
            id: calendar.id,
            name: calendar.summary,
            email: 'info@auto-city.nl'
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_access_token': {
        console.log('Getting fresh access token for service account');
        
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

        return new Response(JSON.stringify({ 
          access_token: tokenData.access_token,
          expires_in: tokenData.expires_in || 3600
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('Google Service Auth error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Helper function to create JWT assertion for service account
async function createJWTAssertion(credentials: any, payload: any) {
  // This is a simplified version - in production you'd use proper crypto libraries
  // For now, we'll use a basic implementation
  const header = { alg: "RS256", typ: "JWT" };
  
  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  // In a real implementation, you'd sign this with the private key
  // For now, we'll return a placeholder that Google's libraries would handle
  return `${encodedHeader}.${encodedPayload}.signature_placeholder`;
}
