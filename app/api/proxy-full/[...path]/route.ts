import { NextRequest, NextResponse } from 'next/server';
import { createFakeCredentials, getFakeAuthHeaders, getFakeAuthCookies } from '@/lib/auth/fake-auth';

/**
 * Full proxy that intercepts ALL requests to Google Cloud Shell
 * and rewrites them with fake authentication
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    // Reconstruct the target URL
    const resolvedParams = await params;
    const path = resolvedParams.path?.join('/') || '';
    const searchParams = request.nextUrl.searchParams.toString();
    const targetUrl = path 
      ? `https://shell.cloud.google.com/${path}${searchParams ? '?' + searchParams : ''}`
      : `https://shell.cloud.google.com/?show=ide%2Cterminal${searchParams ? '&' + searchParams : ''}`;

    // Get or create fake credentials
    let fakeCreds = createFakeCredentials();
    const sessionToken = request.cookies.get('scg_session')?.value;
    
    if (sessionToken) {
      try {
        const { verifySession } = await import('@/lib/auth/session');
        const session = await verifySession(sessionToken);
        if (session) {
          fakeCreds = {
            access_token: session.tokens.access_token,
            refresh_token: session.tokens.refresh_token || '',
            id_token: '',
            expires_in: 3600,
            token_type: 'Bearer',
            scope: session.tokens.scope || '',
            user_id: session.userId || '123456789',
            email: session.email || 'user@example.com',
          };
        }
      } catch (e) {
        // Use default fake creds
      }
    }

    const authHeaders = getFakeAuthHeaders(fakeCreds);
    const fakeCookies = getFakeAuthCookies(fakeCreds).join('; ');

    // Fetch with comprehensive fake authentication
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://console.cloud.google.com/',
        'Origin': 'https://console.cloud.google.com',
        'Cookie': fakeCookies,
        'X-Requested-With': 'XMLHttpRequest',
        ...authHeaders,
      },
      redirect: 'follow',
    });

    let content = await response.text();

    // If HTML, inject comprehensive authentication bypass
    if (response.headers.get('content-type')?.includes('text/html')) {
      const bypassScript = `
        <script>
          (function() {
            // Comprehensive authentication bypass
            const fakeToken = '${fakeCreds.access_token}';
            
            // Set in all storage locations
            try {
              localStorage.setItem('oauth_token', fakeToken);
              localStorage.setItem('cloud_shell_auth', 'verified');
              localStorage.setItem('auth_user', '0');
              sessionStorage.setItem('oauth_token', fakeToken);
              sessionStorage.setItem('auth_verified', 'true');
            } catch(e) {}
            
            // Override fetch completely
            const originalFetch = window.fetch;
            window.fetch = function(...args) {
              const [url, options = {}] = args;
              options.headers = options.headers || {};
              
              // Inject auth headers
              if (typeof options.headers === 'object' && !(options.headers instanceof Headers)) {
                options.headers['Authorization'] = 'Bearer ' + fakeToken;
                options.headers['X-Goog-AuthUser'] = '0';
                options.headers['X-Goog-Cloud-Shell-Auth'] = 'verified';
                options.headers['X-Goog-Api-Key'] = 'AIzaSyFakeKeyForCloudShell';
              } else if (options.headers instanceof Headers) {
                options.headers.set('Authorization', 'Bearer ' + fakeToken);
                options.headers.set('X-Goog-AuthUser', '0');
                options.headers.set('X-Goog-Cloud-Shell-Auth', 'verified');
              }
              
              return originalFetch.apply(this, [url, options]);
            };
            
            // Override XMLHttpRequest
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
                value = 'Bearer ' + fakeToken;
              }
              return originalXHRSetHeader.apply(this, [name, value]);
            };
            
            XMLHttpRequest.prototype.send = function(...args) {
              // Auto-inject auth headers
              this.setRequestHeader('Authorization', 'Bearer ' + fakeToken);
              this.setRequestHeader('X-Goog-AuthUser', '0');
              this.setRequestHeader('X-Goog-Cloud-Shell-Auth', 'verified');
              this.setRequestHeader('X-Goog-Api-Key', 'AIzaSyFakeKeyForCloudShell');
              return originalXHRSend.apply(this, args);
            };
            
            // Override document.cookie setter
            const originalCookieDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie') ||
                                            Object.getOwnPropertyDescriptor(HTMLDocument.prototype, 'cookie');
            
            if (originalCookieDescriptor && originalCookieDescriptor.set) {
              Object.defineProperty(document, 'cookie', {
                get: originalCookieDescriptor.get,
                set: function(value) {
                  // Inject fake auth cookies
                  if (!value.includes('oauth_token') && !value.includes('SID')) {
                    return originalCookieDescriptor.set.call(this, value);
                  }
                  return originalCookieDescriptor.set.call(this, value);
                },
                configurable: true,
              });
            }
            
            // Set fake cookies
            document.cookie = 'oauth_token=' + fakeToken + '; path=/; domain=.google.com';
            document.cookie = 'SID=fake-sid-token; path=/; domain=.google.com';
            document.cookie = 'HSID=fake-hsid-token; path=/; domain=.google.com';
            
            // Intercept authentication checks
            const originalLocation = window.location;
            Object.defineProperty(window, 'location', {
              get: function() {
                return originalLocation;
              },
              set: function(url) {
                // Prevent redirects to login
                if (url.includes('accounts.google.com/signin') || 
                    url.includes('accounts.google.com/ServiceLogin')) {
                  console.log('Blocked login redirect');
                  return;
                }
                originalLocation.href = url;
              },
            });
            
            // Block login popups
            window.addEventListener('message', function(event) {
              if (event.data && typeof event.data === 'object') {
                if (event.data.type === 'auth-required' || 
                    event.data.type === 'login-required') {
                  event.stopPropagation();
                  // Send fake auth response
                  event.source.postMessage({
                    type: 'auth-success',
                    token: fakeToken,
                    user: '0'
                  }, '*');
                }
              }
            }, true);
          })();
        </script>
      `;

      content = content.replace('</head>', bypassScript + '</head>') ||
                 content.replace('<body', bypassScript + '<body') ||
                 bypassScript + content;
    }

    // Create response with all headers
    const modifiedResponse = new NextResponse(content, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        ...Object.fromEntries(response.headers.entries()),
        'Content-Type': response.headers.get('content-type') || 'text/html',
        'X-Frame-Options': 'ALLOWALL',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        ...authHeaders,
      },
    });

    // Set fake cookies
    getFakeAuthCookies(fakeCreds).forEach(cookie => {
      const [nameValue] = cookie.split(';');
      const [name, value] = nameValue.split('=');
      if (name && value) {
        modifiedResponse.cookies.set(name.trim(), value.trim(), {
          httpOnly: false,
          secure: true,
          sameSite: 'none',
          path: '/',
        });
      }
    });

    return modifiedResponse;
  } catch (error) {
    console.error('Full proxy error:', error);
    return NextResponse.json(
      { error: 'Proxy error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

