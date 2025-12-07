import { NextRequest, NextResponse } from 'next/server';
import { createFakeCredentials, getFakeAuthHeaders, getFakeAuthCookies } from '@/lib/auth/fake-auth';
import { createSession } from '@/lib/auth/session';

/**
 * Create a fake authenticated session
 * This endpoint generates fake credentials and stores them in a session
 */
export async function GET(request: NextRequest) {
  try {
    // Generate fake credentials
    const fakeCreds = createFakeCredentials();

    // Create session with fake tokens
    const sessionData = {
      tokens: {
        access_token: fakeCreds.access_token,
        refresh_token: fakeCreds.refresh_token,
        expiry_date: Date.now() + (fakeCreds.expires_in * 1000),
        scope: fakeCreds.scope,
        token_type: fakeCreds.token_type,
      },
      userId: fakeCreds.user_id,
      email: fakeCreds.email,
      expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
    };

    const sessionToken = await createSession(sessionData);

    // Create response with session cookie
    const response = NextResponse.json({
      success: true,
      credentials: {
        access_token: fakeCreds.access_token,
        email: fakeCreds.email,
        user_id: fakeCreds.user_id,
      },
    });

    // Set session cookie
    response.cookies.set('scg_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    // Also set fake Google cookies to trick the iframe
    const fakeCookies = getFakeAuthCookies(fakeCreds);
    fakeCookies.forEach(cookie => {
      const [nameValue, ...attributes] = cookie.split(';');
      const [name, value] = nameValue.split('=');
      response.cookies.set(name.trim(), value.trim(), {
        httpOnly: cookie.includes('HttpOnly'),
        secure: cookie.includes('Secure'),
        sameSite: cookie.includes('SameSite=None') ? 'none' : 'lax',
        path: '/',
        domain: '.google.com',
      });
    });

    return response;
  } catch (error) {
    console.error('Fake auth error:', error);
    return NextResponse.json(
      { error: 'Failed to create fake session' },
      { status: 500 }
    );
  }
}

