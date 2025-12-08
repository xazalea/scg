import { NextRequest, NextResponse } from 'next/server';
import { createFakeCredentials, getFakeAuthHeaders, getFakeAuthCookies } from '@/lib/auth/fake-auth';

/**
 * Root proxy endpoint for Cloud Shell
 */
export async function GET(request: NextRequest) {
  try {
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

    const searchParams = request.nextUrl.searchParams.toString();
    const targetUrl = `https://shell.cloud.google.com/?show=ide%2Cterminal${searchParams ? '&' + searchParams : ''}`;

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

    // Inject comprehensive authentication bypass
    const bypassScript = `
      <script>
        (function() {
          const fakeToken = '${fakeCreds.access_token}';
          
          // Set in all storage
          try {
            localStorage.setItem('oauth_token', fakeToken);
            localStorage.setItem('cloud_shell_auth', 'verified');
            localStorage.setItem('auth_user', '0');
            sessionStorage.setItem('oauth_token', fakeToken);
            sessionStorage.setItem('auth_verified', 'true');
          } catch(e) {}
          
          // Override fetch
          const originalFetch = window.fetch;
          window.fetch = function(...args) {
            const [url, options = {}] = args;
            options.headers = options.headers || {};
            if (typeof options.headers === 'object' && !(options.headers instanceof Headers)) {
              options.headers['Authorization'] = 'Bearer ' + fakeToken;
              options.headers['X-Goog-AuthUser'] = '0';
              options.headers['X-Goog-Cloud-Shell-Auth'] = 'verified';
            }
            return originalFetch.apply(this, [url, options]);
          };
          
          // Override XMLHttpRequest
          const originalSend = XMLHttpRequest.prototype.send;
          XMLHttpRequest.prototype.send = function(...args) {
            this.setRequestHeader('Authorization', 'Bearer ' + fakeToken);
            this.setRequestHeader('X-Goog-AuthUser', '0');
            this.setRequestHeader('X-Goog-Cloud-Shell-Auth', 'verified');
            return originalSend.apply(this, args);
          };
          
          // Set cookies
          document.cookie = 'oauth_token=' + fakeToken + '; path=/; domain=.google.com';
          document.cookie = 'SID=fake-sid; path=/; domain=.google.com';
          
          // Block login redirects
          const originalLocation = window.location;
          let loginBlocked = false;
          Object.defineProperty(window, 'location', {
            get: () => originalLocation,
            set: (url) => {
              if (url.includes('signin') || url.includes('ServiceLogin')) {
                if (!loginBlocked) {
                  loginBlocked = true;
                  console.log('Blocked login redirect');
                  setTimeout(() => { loginBlocked = false; }, 1000);
                }
                return;
              }
              originalLocation.href = url;
            }
          });
        })();
      </script>
    `;

    content = content.replace('</head>', bypassScript + '</head>') ||
               content.replace('<body', bypassScript + '<body') ||
               bypassScript + content;

    // Create response
    const modifiedResponse = new NextResponse(content, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        ...Object.fromEntries(response.headers.entries()),
        'Content-Type': response.headers.get('content-type') || 'text/html',
        // Don't set X-Frame-Options to avoid conflicts
        'Access-Control-Allow-Origin': '*',
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
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Proxy error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

