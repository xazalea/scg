import crypto from 'crypto';

/**
 * OAuth Client ID Spoofing System
 * Generates fake but valid-looking OAuth Client IDs to trick Google
 */

/**
 * Generate a fake OAuth Client ID
 * Google Client IDs typically look like: 123456789-abcdefghijklmnop.apps.googleusercontent.com
 */
export function generateFakeClientId(): string {
  // Generate a random number (Google project numbers are typically 12 digits)
  const projectNumber = Math.floor(Math.random() * 900000000000) + 100000000000;
  
  // Generate a random string (typically 24 characters)
  const randomString = crypto.randomBytes(12).toString('hex');
  
  return `${projectNumber}-${randomString}.apps.googleusercontent.com`;
}

/**
 * Generate OAuth authorization URL with fake client ID
 */
export function generateFakeAuthUrl(clientId?: string): string {
  const fakeClientId = clientId || generateFakeClientId();
  const redirectUri = 'urn:ietf:wg:oauth:2.0:oob'; // Out-of-band redirect
  const scope = 'https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/cloudshell';
  
  return `https://accounts.google.com/o/oauth2/auth?` +
    `client_id=${encodeURIComponent(fakeClientId)}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `scope=${encodeURIComponent(scope)}&` +
    `response_type=code&` +
    `access_type=offline&` +
    `prompt=consent`;
}

/**
 * Generate fake authorization code
 */
export function generateFakeAuthCode(): string {
  // Google auth codes are typically base64-like strings
  return crypto.randomBytes(32).toString('base64url').substring(0, 50);
}

/**
 * Create fake OAuth token response
 */
export function createFakeOAuthResponse(clientId: string) {
  const accessToken = `ya29.${crypto.randomBytes(60).toString('base64url')}`;
  const refreshToken = `1//${crypto.randomBytes(40).toString('base64url')}`;
  
  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: 3600,
    token_type: 'Bearer',
    scope: 'https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/cloudshell',
    client_id: clientId,
  };
}

/**
 * Get spoofed OAuth headers
 */
export function getSpoofedOAuthHeaders(clientId: string, accessToken: string): Record<string, string> {
  return {
    'Authorization': `Bearer ${accessToken}`,
    'X-Goog-AuthUser': '0',
    'X-Goog-Api-Key': 'AIzaSyFakeKeyForCloudShell',
    'X-Goog-Cloud-Shell-Auth': 'verified',
    'X-Goog-Client-Id': clientId,
    'X-Goog-Request-Id': crypto.randomUUID(),
    'Referer': 'https://console.cloud.google.com/',
    'Origin': 'https://console.cloud.google.com',
  };
}

