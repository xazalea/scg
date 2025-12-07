import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';

export interface GoogleAuthTokens {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
  scope?: string;
  token_type?: string;
}

/**
 * Google OAuth2 Client Manager
 * Handles authentication and token refresh for Google Cloud services
 */
export class GoogleAuthManager {
  private oauth2Client: OAuth2Client;
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    this.clientId = process.env.GOOGLE_CLIENT_ID || '';
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
    this.redirectUri = process.env.NEXTAUTH_URL 
      ? `${process.env.NEXTAUTH_URL}/api/auth/callback`
      : 'http://localhost:3000/api/auth/callback';

    this.oauth2Client = new google.auth.OAuth2(
      this.clientId,
      this.clientSecret,
      this.redirectUri
    );
  }

  /**
   * Get authorization URL for OAuth flow
   */
  getAuthUrl(state?: string): string {
    const scopes = [
      'https://www.googleapis.com/auth/cloud-platform',
      'https://www.googleapis.com/auth/cloudshell',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      state: state || 'default',
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokens(code: string): Promise<GoogleAuthTokens> {
    const { tokens } = await this.oauth2Client.getToken(code);
    return {
      access_token: tokens.access_token || '',
      refresh_token: tokens.refresh_token || undefined,
      expiry_date: tokens.expiry_date || undefined,
      scope: tokens.scope as string | undefined,
      token_type: tokens.token_type || undefined,
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<GoogleAuthTokens> {
    this.oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    const { credentials } = await this.oauth2Client.refreshAccessToken();
    
    return {
      access_token: credentials.access_token || '',
      refresh_token: credentials.refresh_token || refreshToken || undefined,
      expiry_date: credentials.expiry_date || undefined,
      scope: credentials.scope as string | undefined,
      token_type: credentials.token_type || undefined,
    };
  }

  /**
   * Set credentials and get authenticated client
   */
  getAuthenticatedClient(tokens: GoogleAuthTokens): OAuth2Client {
    this.oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
    });
    return this.oauth2Client;
  }

  /**
   * Verify if token is expired or will expire soon (within 5 minutes)
   */
  isTokenExpired(expiryDate?: number): boolean {
    if (!expiryDate) return true;
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    return expiryDate <= (now + fiveMinutes);
  }
}

