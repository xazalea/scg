import { NextRequest, NextResponse } from 'next/server';
import { GoogleAuthManager } from '@/lib/auth/google-auth';
import { createSession } from '@/lib/auth/session';
import { google } from 'googleapis';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(error)}`, request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/?error=missing_code', request.url)
    );
  }

  try {
    const authManager = new GoogleAuthManager();
    const tokens = await authManager.getTokens(code);

    // Get user info
    const oauth2Client = authManager.getAuthenticatedClient(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    // Create session
    const sessionData = {
      tokens,
      userId: userInfo.data.id || undefined,
      email: userInfo.data.email || undefined,
      expiresAt: tokens.expiry_date || Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days default
    };

    const sessionToken = await createSession(sessionData);

    // Redirect to shell with session token
    const redirectUrl = new URL('/shell', request.url);
    redirectUrl.searchParams.set('session', sessionToken);

    const response = NextResponse.redirect(redirectUrl);
    response.cookies.set('scg_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error) {
    console.error('Callback error:', error);
    return NextResponse.redirect(
      new URL('/?error=auth_failed', request.url)
    );
  }
}

