
import { supabase } from "@/integrations/supabase/client";
import { ExactOnlineTokenData, ExactOnlineAuthResult } from "@/types/exactOnline";

export class ExactOnlineAuthService {
  private readonly clientId = 'YOUR_EXACT_ONLINE_CLIENT_ID'; // Will be from environment
  private readonly clientSecret = 'YOUR_EXACT_ONLINE_CLIENT_SECRET';
  private readonly redirectUri = `${window.location.origin}/auth/exact-online/callback`;
  private readonly authBaseUrl = 'https://start.exactonline.nl/api/oauth2';
  private readonly scope = 'read write';

  /**
   * Generate authorization URL for OAuth flow
   */
  generateAuthUrl(userId: string): string {
    const state = this.generateState(userId);
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: this.scope,
      state: state,
      force_login: '0'
    });

    return `${this.authBaseUrl}/auth?${params.toString()}`;
  }

  /**
   * Handle OAuth callback and exchange code for tokens
   */
  async handleCallback(code: string, state: string): Promise<ExactOnlineTokenData> {
    try {
      // Verify state parameter
      const userId = this.verifyState(state);
      if (!userId) {
        throw new Error('Invalid state parameter');
      }

      // Exchange code for tokens
      const tokenResponse = await this.exchangeCodeForTokens(code);
      
      // Get division information
      const divisionInfo = await this.getDivisionInfo(tokenResponse.access_token);
      
      // Store tokens in database
      const tokenData = await this.storeTokens(userId, tokenResponse, divisionInfo);
      
      return tokenData;
    } catch (error) {
      console.error('OAuth callback handling failed:', error);
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(tokenData: ExactOnlineTokenData): Promise<ExactOnlineTokenData> {
    try {
      const response = await fetch(`${this.authBaseUrl}/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: tokenData.refreshToken,
          client_id: this.clientId,
          client_secret: this.clientSecret
        })
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.status} ${response.statusText}`);
      }

      const authResult: ExactOnlineAuthResult = await response.json();
      
      // Update tokens in database
      const expiresAt = new Date(Date.now() + authResult.expires_in * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('exact_online_tokens' as any)
        .update({
          access_token: authResult.access_token,
          refresh_token: authResult.refresh_token || tokenData.refreshToken,
          expires_at: expiresAt,
          updated_at: new Date().toISOString()
        })
        .eq('id', tokenData.id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update tokens: ${error.message}`);
      }

      return {
        id: data.id,
        userId: data.user_id,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: data.expires_at,
        divisionCode: data.division_code,
        companyName: data.company_name,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };

    } catch (error) {
      console.error('Token refresh failed:', error);
      throw error;
    }
  }

  /**
   * Revoke tokens and remove from database
   */
  async revokeTokens(userId: string): Promise<void> {
    try {
      // Get current tokens
      const { data: tokenData } = await supabase
        .from('exact_online_tokens' as any)
        .select('*')
        .eq('user_id', userId)
        .single();

      if (tokenData) {
        // Revoke tokens at Exact Online
        try {
          await fetch(`${this.authBaseUrl}/revoke`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
              token: tokenData.access_token,
              client_id: this.clientId,
              client_secret: this.clientSecret
            })
          });
        } catch (error) {
          console.warn('Failed to revoke tokens at provider:', error);
        }

        // Remove tokens from database
        await supabase
          .from('exact_online_tokens' as any)
          .delete()
          .eq('user_id', userId);
      }
    } catch (error) {
      console.error('Token revocation failed:', error);
      throw error;
    }
  }

  /**
   * Check if user has valid tokens
   */
  async hasValidTokens(userId: string): Promise<boolean> {
    try {
      const { data } = await supabase
        .from('exact_online_tokens' as any)
        .select('expires_at')
        .eq('user_id', userId)
        .single();

      if (!data) {
        return false;
      }

      // Check if token is still valid (not expired)
      const expiryTime = new Date(data.expires_at).getTime();
      const currentTime = Date.now();
      
      return expiryTime > currentTime;
    } catch (error) {
      console.error('Error checking token validity:', error);
      return false;
    }
  }

  /**
   * Generate secure state parameter for OAuth
   */
  private generateState(userId: string): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(7);
    const state = btoa(`${userId}:${timestamp}:${random}`);
    
    // Store state in session storage for verification
    sessionStorage.setItem('exact_online_oauth_state', state);
    
    return state;
  }

  /**
   * Verify state parameter and return user ID
   */
  private verifyState(state: string): string | null {
    try {
      const storedState = sessionStorage.getItem('exact_online_oauth_state');
      if (storedState !== state) {
        return null;
      }

      const decoded = atob(state);
      const [userId] = decoded.split(':');
      
      // Clear stored state
      sessionStorage.removeItem('exact_online_oauth_state');
      
      return userId;
    } catch (error) {
      console.error('State verification failed:', error);
      return null;
    }
  }

  /**
   * Exchange authorization code for access tokens
   */
  private async exchangeCodeForTokens(code: string): Promise<ExactOnlineAuthResult> {
    const response = await fetch(`${this.authBaseUrl}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code: code,
        redirect_uri: this.redirectUri
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token exchange failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.json();
  }

  /**
   * Get division information using access token
   */
  private async getDivisionInfo(accessToken: string): Promise<{ divisionCode: string; companyName: string }> {
    try {
      const response = await fetch('https://start.exactonline.nl/api/v1/current/Me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get division info: ${response.status}`);
      }

      const data = await response.json();
      const result = data.d.results[0];
      
      return {
        divisionCode: result.CurrentDivision.toString(),
        companyName: result.FullName || 'Unknown Company'
      };
    } catch (error) {
      console.warn('Failed to get division info:', error);
      return {
        divisionCode: '0',
        companyName: 'Unknown Company'
      };
    }
  }

  /**
   * Store tokens in Supabase database
   */
  private async storeTokens(
    userId: string, 
    authResult: ExactOnlineAuthResult,
    divisionInfo: { divisionCode: string; companyName: string }
  ): Promise<ExactOnlineTokenData> {
    const expiresAt = new Date(Date.now() + authResult.expires_in * 1000).toISOString();
    
    // Delete existing tokens for this user
    await supabase
      .from('exact_online_tokens' as any)
      .delete()
      .eq('user_id', userId);

    // Insert new tokens
    const { data, error } = await supabase
      .from('exact_online_tokens' as any)
      .insert({
        user_id: userId,
        access_token: authResult.access_token,
        refresh_token: authResult.refresh_token,
        expires_at: expiresAt,
        division_code: divisionInfo.divisionCode,
        company_name: divisionInfo.companyName
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to store tokens: ${error.message}`);
    }

    return {
      id: data.id,
      userId: data.user_id,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_at,
      divisionCode: data.division_code,
      companyName: data.company_name,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
}
