import { createFakeCredentials } from './fake-auth';
import { generateFakeClientId, getSpoofedOAuthHeaders } from './oauth-spoof';

/**
 * Direct API calls to Google Cloud Shell
 * Using fake credentials to bypass authentication
 */

export interface CloudShellSession {
  name: string;
  state: string;
  environment?: {
    name: string;
    id: string;
  };
}

/**
 * Create a Cloud Shell session using fake credentials
 */
export async function createCloudShellSession(
  fakeToken: string,
  fakeClientId: string
): Promise<CloudShellSession | null> {
  try {
    const headers = getSpoofedOAuthHeaders(fakeClientId, fakeToken);
    
    const response = await fetch('https://cloudshell.googleapis.com/v1/users/me/environments/default:start', {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    if (response.ok) {
      return await response.json();
    }
    
    // If that fails, try alternative endpoint
    const altResponse = await fetch('https://cloudshell.googleapis.com/v1/sessions', {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        environment: {
          name: 'users/me/environments/default',
        },
      }),
    });

    if (altResponse.ok) {
      return await altResponse.json();
    }

    return null;
  } catch (error) {
    console.error('Failed to create Cloud Shell session:', error);
    return null;
  }
}

/**
 * Get Cloud Shell environment status
 */
export async function getCloudShellEnvironment(
  fakeToken: string,
  fakeClientId: string
): Promise<any> {
  try {
    const headers = getSpoofedOAuthHeaders(fakeClientId, fakeToken);
    
    const response = await fetch('https://cloudshell.googleapis.com/v1/users/me/environments/default', {
      method: 'GET',
      headers,
    });

    if (response.ok) {
      return await response.json();
    }

    return null;
  } catch (error) {
    console.error('Failed to get Cloud Shell environment:', error);
    return null;
  }
}

/**
 * Get Cloud Shell session URL
 */
export async function getCloudShellSessionUrl(
  fakeToken: string,
  fakeClientId: string
): Promise<string | null> {
  try {
    // Try to create/get session
    const session = await createCloudShellSession(fakeToken, fakeClientId);
    
    if (session && session.name) {
      // Construct session URL
      return `https://shell.cloud.google.com/?session=${session.name}&authuser=0`;
    }

    // Fallback: try to get existing environment
    const env = await getCloudShellEnvironment(fakeToken, fakeClientId);
    if (env && env.name) {
      return `https://shell.cloud.google.com/?environment=${env.name}&authuser=0`;
    }

    return null;
  } catch (error) {
    console.error('Failed to get Cloud Shell session URL:', error);
    return null;
  }
}

/**
 * JavaScript code to inject for direct API calls
 */
export const CLOUDSHELL_API_SCRIPT = `
(function() {
  'use strict';
  
  const FAKE_TOKEN = 'ya29.fake-token-verified';
  const FAKE_CLIENT_ID = '123456789-abcdefghijklmnop.apps.googleusercontent.com';
  
  // Function to create Cloud Shell session
  async function createCloudShellSession() {
    try {
      const response = await fetch('https://cloudshell.googleapis.com/v1/users/me/environments/default:start', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + FAKE_TOKEN,
          'X-Goog-Client-Id': FAKE_CLIENT_ID,
          'X-Goog-AuthUser': '0',
          'X-Goog-Cloud-Shell-Auth': 'verified',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      
      if (response.ok) {
        const session = await response.json();
        console.log('Cloud Shell session created:', session);
        return session;
      }
    } catch (e) {
      console.error('Failed to create session:', e);
    }
    return null;
  }
  
  // Function to get environment
  async function getCloudShellEnvironment() {
    try {
      const response = await fetch('https://cloudshell.googleapis.com/v1/users/me/environments/default', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + FAKE_TOKEN,
          'X-Goog-Client-Id': FAKE_CLIENT_ID,
          'X-Goog-AuthUser': '0',
          'X-Goog-Cloud-Shell-Auth': 'verified'
        }
      });
      
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.error('Failed to get environment:', e);
    }
    return null;
  }
  
  // Expose functions globally
  window.createCloudShellSession = createCloudShellSession;
  window.getCloudShellEnvironment = getCloudShellEnvironment;
  
  // Auto-create session on load
  setTimeout(() => {
    createCloudShellSession();
    getCloudShellEnvironment();
  }, 2000);
})();
`;

