/**
 * Token Interception and Replay System
 * Captures and replays authentication tokens
 */

export interface InterceptedToken {
  token: string;
  tokenType: 'Bearer' | 'OAuth';
  expiresAt: number;
  scopes: string[];
  userId?: string;
  email?: string;
}

/**
 * Token storage for intercepted tokens
 */
class TokenStorage {
  private tokens: Map<string, InterceptedToken> = new Map();

  store(key: string, token: InterceptedToken) {
    this.tokens.set(key, token);
  }

  get(key: string): InterceptedToken | undefined {
    return this.tokens.get(key);
  }

  getAll(): InterceptedToken[] {
    return Array.from(this.tokens.values());
  }

  clear() {
    this.tokens.clear();
  }
}

export const tokenStorage = new TokenStorage();

/**
 * Intercept token from response headers or body
 */
export function interceptTokenFromResponse(response: Response): InterceptedToken | null {
  try {
    // Try to get token from Authorization header
    const authHeader = response.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      return {
        token,
        tokenType: 'Bearer',
        expiresAt: Date.now() + 3600000, // 1 hour default
        scopes: [],
      };
    }

    // Try to parse JSON response for token
    // This would need to be called with await response.json() in actual usage
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Replay intercepted token in request
 */
export function replayToken(token: InterceptedToken): Record<string, string> {
  return {
    'Authorization': `${token.tokenType} ${token.token}`,
    'X-Goog-AuthUser': '0',
    'X-Goog-Cloud-Shell-Auth': 'verified',
  };
}

/**
 * JavaScript code to inject for token interception
 */
export const TOKEN_INTERCEPTOR_SCRIPT = `
(function() {
  'use strict';
  
  // Store intercepted tokens
  const interceptedTokens = [];
  
  // Intercept fetch responses
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    return originalFetch.apply(this, args).then(response => {
      // Try to extract token from response
      const authHeader = response.headers.get('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        interceptedTokens.push({
          token: token,
          type: 'Bearer',
          timestamp: Date.now()
        });
        
        // Store in localStorage for replay
        try {
          localStorage.setItem('intercepted_tokens', JSON.stringify(interceptedTokens));
        } catch(e) {}
      }
      
      // Clone response to read body if needed
      const clonedResponse = response.clone();
      if (response.headers.get('content-type')?.includes('application/json')) {
        clonedResponse.json().then(data => {
          if (data.access_token || data.token) {
            const token = data.access_token || data.token;
            interceptedTokens.push({
              token: token,
              type: 'Bearer',
              timestamp: Date.now()
            });
            try {
              localStorage.setItem('intercepted_tokens', JSON.stringify(interceptedTokens));
            } catch(e) {}
          }
        }).catch(() => {});
      }
      
      return response;
    });
  };
  
  // Intercept XMLHttpRequest responses
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;
  
  XMLHttpRequest.prototype.send = function(...args) {
    this.addEventListener('load', function() {
      try {
        const responseText = this.responseText;
        if (responseText) {
          const data = JSON.parse(responseText);
          if (data.access_token || data.token) {
            const token = data.access_token || data.token;
            interceptedTokens.push({
              token: token,
              type: 'Bearer',
              timestamp: Date.now()
            });
            try {
              localStorage.setItem('intercepted_tokens', JSON.stringify(interceptedTokens));
            } catch(e) {}
          }
        }
      } catch(e) {}
    });
    return originalXHRSend.apply(this, args);
  };
  
  console.log('Token interceptor activated');
})();
`;

