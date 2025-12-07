import { NextRequest, NextResponse } from 'next/server';
import { GoogleAuthManager } from '@/lib/auth/google-auth';

export async function GET(request: NextRequest) {
  try {
    const authManager = new GoogleAuthManager();
    const authUrl = authManager.getAuthUrl();
    
    return NextResponse.json({ authUrl }, { status: 200 });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { error: 'Failed to generate auth URL' },
      { status: 500 }
    );
  }
}

