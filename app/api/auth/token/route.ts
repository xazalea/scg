import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/session';
import { GoogleAuthManager } from '@/lib/auth/google-auth';
import { createSession } from '@/lib/auth/session';

/**
 * Get or refresh access token
 * This endpoint handles token refresh automatically
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

    // Check if token needs refresh
    if (
      authManager.isTokenExpired(session.tokens.expiry_date) &&
      session.tokens.refresh_token
    ) {
      // Refresh the token
      const refreshedTokens = await authManager.refreshAccessToken(
        session.tokens.refresh_token
      );

      // Update session
      const updatedSession = {
        ...session,
        tokens: refreshedTokens,
        expiresAt: refreshedTokens.expiry_date || session.expiresAt,
      };

      const newSessionToken = await createSession(updatedSession);

      const response = NextResponse.json({
        access_token: refreshedTokens.access_token,
        expires_at: refreshedTokens.expiry_date,
      });

      response.cookies.set('scg_session', newSessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
      });

      return response;
    }

    // Return existing token
    return NextResponse.json({
      access_token: session.tokens.access_token,
      expires_at: session.tokens.expiry_date,
    });
  } catch (error) {
    console.error('Token error:', error);
    return NextResponse.json(
      { error: 'Failed to get token' },
      { status: 500 }
    );
  }
}

