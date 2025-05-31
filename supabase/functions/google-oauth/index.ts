
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

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    console.log('Google OAuth request:', { method: req.method, action, url: req.url });

    // Handle callback without authentication (Google redirects here)
    if (action === 'callback') {
      console.log('OAuth callback handling');
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state'); // user_id:mode
      
      if (!code || !state) {
        throw new Error('Missing code or state parameter');
      }

      const [userId, mode] = state.split(':');
      const isCompanyMode = mode === 'company';

      console.log('Processing OAuth callback:', { userId, mode, isCompanyMode });

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
      console.log('Token exchange result:', { success: !!tokens.access_token });
      
      if (!tokens.access_token) {
        throw new Error('Failed to get access token');
      }

      // Get user's primary calendar
      const calendarResponse = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary', {
        headers: { 'Authorization': `Bearer ${tokens.access_token}` },
      });
      
      const calendar = await calendarResponse.json();

      // Get user's email from Google
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { 'Authorization': `Bearer ${tokens.access_token}` },
      });
      
      const userInfo = await userInfoResponse.json();
      console.log('User info:', { email: userInfo.email });

      // Store tokens in appropriate table
      const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000));
      
      if (isCompanyMode) {
        console.log('Storing company calendar settings');
        // Store in company_calendar_settings
        const { error } = await supabase
          .from('company_calendar_settings')
          .upsert({
            company_id: 'auto-city',
            google_access_token: tokens.access_token,
            google_refresh_token: tokens.refresh_token,
            google_token_expires_at: expiresAt.toISOString(),
            google_calendar_id: calendar.id,
            calendar_name: calendar.summary,
            calendar_email: userInfo.email,
            sync_enabled: true,
            managed_by_user_id: userId,
          });

        if (error) {
          console.error('Database error:', error);
          throw error;
        }
        console.log('Company calendar settings saved successfully');
      } else {
        console.log('Storing user calendar settings');
        // Store in user_calendar_settings (legacy mode)
        const { error } = await supabase
          .from('user_calendar_settings')
          .upsert({
            user_id: userId,
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
      }

      // Redirect to success page
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `${Deno.env.get('SITE_URL')}/settings?tab=calendar&status=connected`,
        },
      });
    }

    // All other actions require authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Unauthorized - missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      throw new Error('Unauthorized');
    }

    // Handle GET request for getting auth URL (company mode)
    if (req.method === 'GET' && !action) {
      console.log('GET request for auth URL - company mode');
      const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
      const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/google-oauth?action=callback`;
      
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent('https://www.googleapis.com/auth/calendar')}&` +
        `access_type=offline&` +
        `prompt=consent&` +
        `state=${user.id}:company`;

      console.log('Generated auth URL for company mode');

      return new Response(JSON.stringify({ authUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle specific actions
    switch (action) {
      case 'get_auth_url': {
        console.log('Legacy get_auth_url action');
        const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
        const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/google-oauth?action=callback`;
        
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
          `client_id=${clientId}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `response_type=code&` +
          `scope=${encodeURIComponent('https://www.googleapis.com/auth/calendar')}&` +
          `access_type=offline&` +
          `prompt=consent&` +
          `state=${user.id}:company`;

        return new Response(JSON.stringify({ authUrl }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'refresh_token': {
        console.log('Refreshing token');
        const { refresh_token, company_mode } = await req.json();
        
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
        
        if (company_mode) {
          // Update company calendar settings
          const { error } = await supabase
            .from('company_calendar_settings')
            .update({
              google_access_token: tokens.access_token,
              google_token_expires_at: expiresAt.toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('company_id', 'auto-city');

          if (error) throw error;
        } else {
          // Update user calendar settings (legacy)
          const { error } = await supabase
            .from('user_calendar_settings')
            .update({
              google_access_token: tokens.access_token,
              google_token_expires_at: expiresAt.toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', user.id);

          if (error) throw error;
        }

        return new Response(JSON.stringify({ 
          access_token: tokens.access_token,
          expires_at: expiresAt.toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        console.log('No valid action specified, defaulting to company auth URL');
        // Default behavior for company mode - same as GET without action
        const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
        const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/google-oauth?action=callback`;
        
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
          `client_id=${clientId}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `response_type=code&` +
          `scope=${encodeURIComponent('https://www.googleapis.com/auth/calendar')}&` +
          `access_type=offline&` +
          `prompt=consent&` +
          `state=${user.id}:company`;

        return new Response(JSON.stringify({ authUrl }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('Google OAuth error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
