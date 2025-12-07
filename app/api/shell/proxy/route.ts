import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/session';
import { GoogleAuthManager } from '@/lib/auth/google-auth';
import axios from 'axios';

/**
 * Proxy endpoint for Cloud Shell
 * This handles authentication and proxies requests to Google Cloud Shell
 */
export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('scg_session')?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { error: 'No session found' },
        { status: 401 }
      );
    }

    const session = await verifySession(sessionToken);

    if (!session) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    const authManager = new GoogleAuthManager();

    // Refresh token if needed
    let accessToken = session.tokens.access_token;
    if (
      authManager.isTokenExpired(session.tokens.expiry_date) &&
      session.tokens.refresh_token
    ) {
      const refreshed = await authManager.refreshAccessToken(
        session.tokens.refresh_token
      );
      accessToken = refreshed.access_token;
    }

    // Return the shell URL with authentication
    // Note: Google Cloud Shell requires the user to be logged in
    // We'll redirect to Cloud Shell which will use the user's session
    const shellUrl = `https://shell.cloud.google.com/?show=ide%2Cterminal&authuser=0`;

    return NextResponse.json({
      shellUrl,
      authenticated: true,
    });
  } catch (error) {
    console.error('Shell proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize shell' },
      { status: 500 }
    );
  }
}

