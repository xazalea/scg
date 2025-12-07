import { SignJWT, jwtVerify } from 'jose';
import { GoogleAuthTokens } from './google-auth';

const secret = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || 'default-secret-change-in-production'
);

export interface SessionData {
  tokens: GoogleAuthTokens;
  userId?: string;
  email?: string;
  expiresAt: number;
}

/**
 * Create a session token with encrypted user data
 */
export async function createSession(data: SessionData): Promise<string> {
  const token = await new SignJWT(data)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);

  return token;
}

/**
 * Verify and decode session token
 */
export async function verifySession(token: string): Promise<SessionData | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as SessionData;
  } catch (error) {
    return null;
  }
}

/**
 * Check if session is expired
 */
export function isSessionExpired(session: SessionData): boolean {
  return Date.now() >= session.expiresAt;
}

