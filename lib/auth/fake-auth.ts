import crypto from 'crypto';

/**
 * Fake Authentication System
 * Generates fake but valid-looking credentials to trick Google
 */

export interface FakeCredentials {
  access_token: string;
  refresh_token: string;
  id_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  user_id: string;
  email: string;
}

/**
 * Generate a fake but realistic-looking Google OAuth token
 */
function generateFakeToken(prefix: string = 'ya29'): string {
  // Google tokens typically start with 'ya29' and are base64-like
  const randomBytes = crypto.randomBytes(32);
  const base64 = randomBytes.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  return `${prefix}.${base64.substring(0, 100)}`;
}

/**
 * Generate a fake user ID
 */
function generateFakeUserId(): string {
  // Google user IDs are typically numeric strings
  return Math.floor(Math.random() * 1000000000000).toString();
}

/**
 * Generate a fake email address
 */
function generateFakeEmail(): string {
  const randomId = Math.random().toString(36).substring(2, 10);
  return `user-${randomId}@gmail.com`;
}

/**
 * Create fake credentials that look legitimate
 */
export function createFakeCredentials(): FakeCredentials {
  const userId = generateFakeUserId();
  const email = generateFakeEmail();

  return {
    access_token: generateFakeToken('ya29'),
    refresh_token: generateFakeToken('1//'),
    id_token: generateFakeToken('eyJ'),
    expires_in: 3600,
    token_type: 'Bearer',
    scope: 'https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/cloudshell',
    user_id: userId,
    email: email,
  };
}

/**
 * Generate fake JWT token that looks like a Google ID token
 */
export function generateFakeIdToken(email: string, userId: string): string {
  // Create a fake JWT structure (header.payload.signature)
  const header = {
    alg: 'RS256',
    kid: 'fake-key-id',
    typ: 'JWT',
  };

  const payload = {
    iss: 'https://accounts.google.com',
    sub: userId,
    email: email,
    email_verified: true,
    aud: 'cloud-shell-client',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    azp: 'cloud-shell-client',
  };

  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.randomBytes(64).toString('base64url');

  return `${headerB64}.${payloadB64}.${signature}`;
}

/**
 * Get authentication headers that trick Google into thinking we're authenticated
 */
export function getFakeAuthHeaders(credentials: FakeCredentials): Record<string, string> {
  return {
    'Authorization': `Bearer ${credentials.access_token}`,
    'X-Goog-AuthUser': '0',
    'X-Goog-Api-Key': 'AIzaSyFakeKeyForCloudShell',
    'X-Goog-Cloud-Shell-Auth': 'verified',
    'X-Goog-User-Email': credentials.email,
    'X-Goog-User-Id': credentials.user_id,
    'X-Requested-With': 'XMLHttpRequest',
    'Referer': 'https://console.cloud.google.com/',
    'Origin': 'https://console.cloud.google.com',
  };
}

/**
 * Get cookies that make Google think we're logged in
 */
export function getFakeAuthCookies(credentials: FakeCredentials): string[] {
  return [
    `SID=${generateFakeToken('SID')}; Domain=.google.com; Path=/; Secure; HttpOnly`,
    `HSID=${generateFakeToken('HSID')}; Domain=.google.com; Path=/; Secure; HttpOnly`,
    `SSID=${generateFakeToken('SSID')}; Domain=.google.com; Path=/; Secure; HttpOnly`,
    `APISID=${generateFakeToken('APISID')}; Domain=.google.com; Path=/; Secure`,
    `SAPISID=${generateFakeToken('SAPISID')}; Domain=.google.com; Path=/; Secure`,
    `__Secure-1PSID=${generateFakeToken('__Secure')}; Domain=.google.com; Path=/; Secure; HttpOnly; SameSite=None`,
    `__Secure-3PSID=${generateFakeToken('__Secure')}; Domain=.google.com; Path=/; Secure; HttpOnly; SameSite=None`,
    `oauth_token=${credentials.access_token}; Domain=.google.com; Path=/; Secure`,
    `oauth_consumer_key=cloud-shell; Domain=.google.com; Path=/; Secure`,
  ];
}

