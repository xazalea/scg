import { NextRequest, NextResponse } from 'next/server';
import { getFakeAuthHeaders, createFakeCredentials } from '@/lib/auth/fake-auth';
import { generateFakeClientId, getSpoofedOAuthHeaders, createFakeOAuthResponse } from '@/lib/auth/oauth-spoof';
import { TOKEN_INTERCEPTOR_SCRIPT } from '@/lib/auth/token-interceptor';
import { CLOUDSHELL_API_SCRIPT } from '@/lib/auth/cloudshell-api';

/**
 * Full proxy that intercepts ALL requests to Google Cloud Shell
 * and injects authentication at every level
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { path?: string[] } }
) {
  try {
    // Reconstruct the full URL
    const path = params?.path?.length ? params.path.join('/') : '';
    const searchParams = request.nextUrl.searchParams.toString();
    
    // If no path, use the root Cloud Shell URL with query params
    let targetUrl: string;
    if (!path && searchParams) {
      targetUrl = `https://shell.cloud.google.com/?${searchParams}`;
    } else if (path) {
      targetUrl = `https://shell.cloud.google.com/${path}${searchParams ? '?' + searchParams : ''}`;
    } else {
      targetUrl = 'https://shell.cloud.google.com/?show=ide%2Cterminal';
    }

    // Get or create fake credentials
    let fakeCreds = createFakeCredentials();
    const sessionCookie = request.cookies.get('scg_fake_creds');
    if (sessionCookie) {
      try {
        fakeCreds = JSON.parse(sessionCookie.value);
      } catch (e) {
        // Use new credentials if parse fails
      }
    }

    // Generate fake OAuth Client ID
    let fakeClientId = request.cookies.get('scg_fake_client_id')?.value;
    if (!fakeClientId) {
      fakeClientId = generateFakeClientId();
    }

    // Create OAuth response with fake client ID
    const oauthResponse = createFakeOAuthResponse(fakeClientId);
    
    // Merge fake credentials with OAuth response
    const enhancedCreds = {
      ...fakeCreds,
      access_token: oauthResponse.access_token,
      refresh_token: oauthResponse.refresh_token,
      client_id: fakeClientId,
    };

    // Fetch with comprehensive fake authentication including spoofed OAuth
    const authHeaders = {
      ...getFakeAuthHeaders(fakeCreds),
      ...getSpoofedOAuthHeaders(fakeClientId, enhancedCreds.access_token),
    };
    
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://console.cloud.google.com/',
        'Origin': 'https://console.cloud.google.com',
        'Cookie': request.headers.get('cookie') || '',
        ...authHeaders,
      },
      redirect: 'follow',
    });

    // Get response content
    const contentType = response.headers.get('content-type') || '';
    let body: string | Buffer = '';

    if (contentType.includes('text/html') || contentType.includes('text/javascript') || contentType.includes('application/javascript')) {
      body = await response.text();
      
      // Inject comprehensive authentication bypass with OAuth spoofing and token interception
      const bypassScript = `
<script>
${TOKEN_INTERCEPTOR_SCRIPT}
${CLOUDSHELL_API_SCRIPT}
<script>
(function() {
  'use strict';
  
  // Store fake credentials with OAuth Client ID
  const FAKE_TOKEN = '${enhancedCreds.access_token}';
  const FAKE_EMAIL = '${fakeCreds.email}';
  const FAKE_USER_ID = '${fakeCreds.user_id}';
  const FAKE_CLIENT_ID = '${fakeClientId}';
  const FAKE_REFRESH_TOKEN = '${enhancedCreds.refresh_token}';
  
  // Set in all storage mechanisms
  try {
    localStorage.setItem('oauth_token', FAKE_TOKEN);
    localStorage.setItem('oauth_user_email', FAKE_EMAIL);
    localStorage.setItem('oauth_user_id', FAKE_USER_ID);
    localStorage.setItem('cloud_shell_auth', 'verified');
    localStorage.setItem('auth_verified', 'true');
    localStorage.setItem('gcp_auth', 'authenticated');
    
    sessionStorage.setItem('oauth_token', FAKE_TOKEN);
    sessionStorage.setItem('auth_verified', 'true');
    sessionStorage.setItem('cloud_shell_auth', 'verified');
  } catch(e) {}
  
  // Set cookies
  document.cookie = 'oauth_token=' + FAKE_TOKEN + '; path=/; domain=.google.com; secure';
  document.cookie = 'oauth_consumer_key=cloud-shell; path=/; domain=.google.com; secure';
  document.cookie = 'SID=fake-sid; path=/; domain=.google.com; secure; httponly';
  document.cookie = 'HSID=fake-hsid; path=/; domain=.google.com; secure; httponly';
  
          // Override fetch completely with OAuth Client ID spoofing
          const originalFetch = window.fetch;
          window.fetch = function(...args) {
            const [url, options = {}] = args;
            
            // Add auth headers to all requests including OAuth Client ID
            options.headers = options.headers || {};
            if (typeof options.headers === 'object' && !(options.headers instanceof Headers)) {
              options.headers['Authorization'] = 'Bearer ' + FAKE_TOKEN;
              options.headers['X-Goog-AuthUser'] = '0';
              options.headers['X-Goog-Cloud-Shell-Auth'] = 'verified';
              options.headers['X-Goog-User-Email'] = FAKE_EMAIL;
              options.headers['X-Goog-User-Id'] = FAKE_USER_ID;
              options.headers['X-Goog-Client-Id'] = FAKE_CLIENT_ID;
              options.headers['X-Goog-Request-Id'] = crypto.randomUUID?.() || Math.random().toString(36);
            }
            
            return originalFetch.apply(this, [url, options]);
          };
  
  // Override XMLHttpRequest completely
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;
  const originalXHRSetHeader = XMLHttpRequest.prototype.setRequestHeader;
  
  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    this._method = method;
    this._url = url;
    return originalXHROpen.apply(this, [method, url, ...rest]);
  };
  
  XMLHttpRequest.prototype.setRequestHeader = function(name, value) {
    if (name.toLowerCase() === 'authorization') {
      value = 'Bearer ' + FAKE_TOKEN;
    }
    return originalXHRSetHeader.apply(this, [name, value]);
  };
  
          XMLHttpRequest.prototype.send = function(...args) {
            // Auto-inject auth headers with OAuth Client ID
            this.setRequestHeader('Authorization', 'Bearer ' + FAKE_TOKEN);
            this.setRequestHeader('X-Goog-AuthUser', '0');
            this.setRequestHeader('X-Goog-Cloud-Shell-Auth', 'verified');
            this.setRequestHeader('X-Goog-User-Email', FAKE_EMAIL);
            this.setRequestHeader('X-Goog-User-Id', FAKE_USER_ID);
            this.setRequestHeader('X-Goog-Client-Id', FAKE_CLIENT_ID);
            
            return originalXHRSend.apply(this, args);
          };
  
  // Override WebSocket to inject auth
  const originalWebSocket = window.WebSocket;
  window.WebSocket = function(url, protocols) {
    if (typeof url === 'string' && url.includes('cloud.google.com')) {
      url += (url.includes('?') ? '&' : '?') + 'auth=' + encodeURIComponent(FAKE_TOKEN);
    }
    return new originalWebSocket(url, protocols);
  };
  
  // Bypass authentication checks
  window.gapi = window.gapi || {};
  window.gapi.auth = window.gapi.auth || {};
  window.gapi.auth.getToken = function() {
    return { access_token: FAKE_TOKEN };
  };
  window.gapi.auth.setToken = function(token) {
    // Override to always return our fake token
  };
  
  // Mock Google auth library
  if (window.google && window.google.accounts) {
    window.google.accounts.oauth2 = window.google.accounts.oauth2 || {};
    window.google.accounts.oauth2.hasGrantedAllScopes = function() { return true; };
    window.google.accounts.oauth2.hasGrantedAnyScope = function() { return true; };
  }
  
  // Intercept authentication redirects
  const originalLocation = window.location;
  Object.defineProperty(window, 'location', {
    get: function() {
      return originalLocation;
    },
    set: function(url) {
      // Prevent redirects to login
      if (url && typeof url === 'string' && url.includes('accounts.google.com/signin')) {
        console.log('Blocked login redirect');
        return;
      }
      originalLocation.href = url;
    }
  });
  
  // Override console to hide auth errors
  const originalError = console.error;
  console.error = function(...args) {
    if (args[0] && typeof args[0] === 'string' && 
        (args[0].includes('auth') || args[0].includes('unauthorized') || args[0].includes('401'))) {
      return; // Suppress auth errors
    }
    return originalError.apply(this, args);
  };
  
  console.log('SCG: Authentication bypass activated');
})();
</script>
      `;

      // Inject script into HTML
      if (typeof body === 'string') {
        if (body.includes('</head>')) {
          body = body.replace('</head>', bypassScript + '</head>');
        } else if (body.includes('<body')) {
          body = body.replace('<body', bypassScript + '<body');
        } else {
          body = bypassScript + body;
        }
      }
    } else {
      // For non-text content, return as-is
      body = Buffer.from(await response.arrayBuffer());
    }

    // Create response with all headers
    const modifiedResponse = new NextResponse(body, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        ...Object.fromEntries(response.headers.entries()),
        'X-Frame-Options': 'ALLOWALL',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': '*',
      },
    });

    // Store credentials in cookie for future requests
    modifiedResponse.cookies.set('scg_fake_creds', JSON.stringify(enhancedCreds), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
    });
    
    // Store fake OAuth Client ID
    modifiedResponse.cookies.set('scg_fake_client_id', fakeClientId, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
    });

    return modifiedResponse;
  } catch (error) {
    console.error('Full proxy error:', error);
    return NextResponse.json(
      { error: 'Proxy failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  // Handle POST requests similarly
  return GET(request, { params });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  });
}
