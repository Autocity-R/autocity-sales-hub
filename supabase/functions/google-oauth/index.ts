
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

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      throw new Error('Unauthorized');
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    switch (action) {
      case 'get_auth_url': {
        const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
        const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/google-oauth?action=callback`;
        
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
          `client_id=${clientId}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `response_type=code&` +
          `scope=${encodeURIComponent('https://www.googleapis.com/auth/calendar')}&` +
          `access_type=offline&` +
          `prompt=consent&` +
          `state=${user.id}`;

        return new Response(JSON.stringify({ authUrl }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'callback': {
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state'); // user_id
        
        if (!code || !state) {
          throw new Error('Missing code or state parameter');
        }

        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
            client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
            code,
            grant_type: 'authorization_code',
            redirect_uri: `${Deno.env.get('SUPABASE_URL')}/functions/v1/google-oauth?action=callback`,
          }),
        });

        const tokens = await tokenResponse.json();
        
        if (!tokens.access_token) {
          throw new Error('Failed to get access token');
        }

        // Get user's primary calendar
        const calendarResponse = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary', {
          headers: { 'Authorization': `Bearer ${tokens.access_token}` },
        });
        
        const calendar = await calendarResponse.json();

        // Store tokens in database
        const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000));
        
        const { error } = await supabase
          .from('user_calendar_settings')
          .upsert({
            user_id: state,
            google_access_token: tokens.access_token,
            google_refresh_token: tokens.refresh_token,
            google_token_expires_at: expiresAt.toISOString(),
            google_calendar_id: calendar.id,
            calendar_name: calendar.summary,
            sync_enabled: true,
          });

        if (error) {
          console.error('Database error:', error);
          throw error;
        }

        // Redirect to success page
        return new Response(null, {
          status: 302,
          headers: {
            'Location': `${Deno.env.get('SITE_URL')}/settings?tab=calendar&status=connected`,
          },
        });
      }

      case 'refresh_token': {
        const { refresh_token } = await req.json();
        
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
            client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
            refresh_token,
            grant_type: 'refresh_token',
          }),
        });

        const tokens = await tokenResponse.json();
        
        if (!tokens.access_token) {
          throw new Error('Failed to refresh token');
        }

        const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000));
        
        const { error } = await supabase
          .from('user_calendar_settings')
          .update({
            google_access_token: tokens.access_token,
            google_token_expires_at: expiresAt.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        if (error) throw error;

        return new Response(JSON.stringify({ 
          access_token: tokens.access_token,
          expires_at: expiresAt.toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('Google OAuth error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
