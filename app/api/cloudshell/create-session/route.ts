import { NextRequest, NextResponse } from 'next/server';
import { createCloudShellSession, getCloudShellSessionUrl } from '@/lib/auth/cloudshell-api';
import { createFakeCredentials } from '@/lib/auth/fake-auth';
import { generateFakeClientId } from '@/lib/auth/oauth-spoof';

/**
 * Create a Cloud Shell session using direct API calls with fake credentials
 */
export async function POST(request: NextRequest) {
  try {
    // Get or create fake credentials
    let fakeToken = request.cookies.get('scg_fake_creds')?.value;
    let fakeClientId = request.cookies.get('scg_fake_client_id')?.value;
    
    if (!fakeToken) {
      const fakeCreds = createFakeCredentials();
      fakeToken = fakeCreds.access_token;
    }
    
    if (!fakeClientId) {
      fakeClientId = generateFakeClientId();
    }

    // Try to parse token from cookie if it's JSON
    let accessToken = fakeToken;
    try {
      const parsed = JSON.parse(fakeToken);
      accessToken = parsed.access_token || fakeToken;
    } catch (e) {
      // Use as-is if not JSON
    }

    // Create Cloud Shell session using direct API call
    const session = await createCloudShellSession(accessToken, fakeClientId);
    
    if (session) {
      return NextResponse.json({
        success: true,
        session: session,
        sessionUrl: await getCloudShellSessionUrl(accessToken, fakeClientId),
      });
    }

    // If direct API fails, return a constructed URL
    return NextResponse.json({
      success: true,
      sessionUrl: `https://shell.cloud.google.com/?show=ide%2Cterminal&authuser=0`,
      message: 'Using fallback URL',
    });
  } catch (error) {
    console.error('Cloud Shell session creation error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create session',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Same as POST for convenience
  return POST(request);
}

