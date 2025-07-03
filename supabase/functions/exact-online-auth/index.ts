
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

interface ExactOnlineAuthConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
  authBaseUrl: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log(`Received ${req.method} request to ${req.url}`);

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    // Get auth config from environment variables
    const config: ExactOnlineAuthConfig = {
      clientId: Deno.env.get('EXACT_ONLINE_CLIENT_ID') ?? '',
      clientSecret: Deno.env.get('EXACT_ONLINE_CLIENT_SECRET') ?? '',
      redirectUri: Deno.env.get('EXACT_ONLINE_REDIRECT_URI') ?? '',
      authBaseUrl: 'https://start.exactonline.nl/api/oauth2'
    }

    if (!config.clientId || !config.clientSecret) {
      console.error('Missing Exact Online credentials');
      return new Response(
        JSON.stringify({ error: 'Missing Exact Online credentials' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle POST requests by reading action from body
    if (req.method === 'POST') {
      const body = await req.json();
      const { action } = body;
      
      console.log(`Processing action: ${action}`);

      // Handle authorization initiation
      if (action === 'initiate') {
        const { userId } = body;
        
        if (!userId) {
          console.error('User ID is required for initiate action');
          return new Response(
            JSON.stringify({ error: 'User ID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Generate state parameter
        const state = generateState(userId)
        
        // Build authorization URL
        const authParams = new URLSearchParams({
          client_id: config.clientId,
          redirect_uri: config.redirectUri,
          response_type: 'code',
          scope: 'read write',
          state: state,
          force_login: '0'
        })

        const authUrl = `${config.authBaseUrl}/auth?${authParams.toString()}`
        
        console.log(`Generated auth URL for user ${userId}`);

        return new Response(
          JSON.stringify({ authUrl, state }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Handle OAuth callback
      if (action === 'callback') {
        const { code, state } = body;
        
        if (!code || !state) {
          console.error('Authorization code and state are required for callback');
          return new Response(
            JSON.stringify({ error: 'Authorization code and state are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Verify state and extract user ID
        const userId = verifyState(state)
        if (!userId) {
          console.error('Invalid state parameter');
          return new Response(
            JSON.stringify({ error: 'Invalid state parameter' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        console.log(`Processing callback for user ${userId}`);

        // Exchange code for tokens
        const tokenResponse = await fetch(`${config.authBaseUrl}/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: config.clientId,
            client_secret: config.clientSecret,
            code: code,
            redirect_uri: config.redirectUri
          })
        })

        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text()
          console.error('Token exchange failed:', errorText)
          return new Response(
            JSON.stringify({ error: 'Token exchange failed' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const tokens = await tokenResponse.json()
        
        // Get division information
        const divisionInfo = await getDivisionInfo(tokens.access_token)
        
        // Store tokens in database
        const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        
        // Delete existing tokens for this user
        await supabaseClient
          .from('exact_online_tokens')
          .delete()
          .eq('user_id', userId)

        // Insert new tokens
        const { data: tokenData, error: insertError } = await supabaseClient
          .from('exact_online_tokens')
          .insert({
            user_id: userId,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_at: expiresAt,
            division_code: divisionInfo.divisionCode,
            company_name: divisionInfo.companyName
          })
          .select()
          .single()

        if (insertError) {
          console.error('Failed to store tokens:', insertError)
          return new Response(
            JSON.stringify({ error: 'Failed to store authentication tokens' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        console.log(`Successfully stored tokens for user ${userId}`);

        return new Response(
          JSON.stringify({ 
            success: true, 
            tokenData: {
              id: tokenData.id,
              divisionCode: tokenData.division_code,
              companyName: tokenData.company_name,
              expiresAt: tokenData.expires_at
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Handle token refresh
      if (action === 'refresh') {
        const { userId, refreshToken } = body;
        
        if (!userId || !refreshToken) {
          console.error('User ID and refresh token are required for refresh');
          return new Response(
            JSON.stringify({ error: 'User ID and refresh token are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        console.log(`Refreshing tokens for user ${userId}`);

        // Refresh tokens
        const refreshResponse = await fetch(`${config.authBaseUrl}/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: config.clientId,
            client_secret: config.clientSecret
          })
        })

        if (!refreshResponse.ok) {
          console.error('Token refresh failed');
          return new Response(
            JSON.stringify({ error: 'Token refresh failed' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const newTokens = await refreshResponse.json()
        const expiresAt = new Date(Date.now() + newTokens.expires_in * 1000).toISOString()

        // Update tokens in database
        const { error: updateError } = await supabaseClient
          .from('exact_online_tokens')
          .update({
            access_token: newTokens.access_token,
            refresh_token: newTokens.refresh_token || refreshToken,
            expires_at: expiresAt,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)

        if (updateError) {
          console.error('Failed to update tokens:', updateError);
          return new Response(
            JSON.stringify({ error: 'Failed to update tokens' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        console.log(`Successfully refreshed tokens for user ${userId}`);

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Unknown action
      console.error(`Unknown action: ${action}`);
      return new Response(
        JSON.stringify({ error: `Unknown action: ${action}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Method not allowed
    console.error(`Method ${req.method} not allowed`);
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function generateState(userId: string): string {
  const timestamp = Date.now().toString()
  const random = Math.random().toString(36).substring(7)
  return btoa(`${userId}:${timestamp}:${random}`)
}

function verifyState(state: string): string | null {
  try {
    const decoded = atob(state)
    const [userId] = decoded.split(':')
    return userId
  } catch {
    return null
  }
}

async function getDivisionInfo(accessToken: string): Promise<{ divisionCode: string; companyName: string }> {
  try {
    const response = await fetch('https://start.exactonline.nl/api/v1/current/Me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to get division info: ${response.status}`)
    }

    const data = await response.json()
    const result = data.d.results[0]
    
    return {
      divisionCode: result.CurrentDivision.toString(),
      companyName: result.FullName || 'Unknown Company'
    }
  } catch (error) {
    console.warn('Failed to get division info:', error)
    return {
      divisionCode: '0',
      companyName: 'Unknown Company'
    }
  }
}
