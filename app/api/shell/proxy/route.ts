import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/session';
import { getFakeAuthHeaders, getFakeAuthCookies, createFakeCredentials } from '@/lib/auth/fake-auth';

/**
 * Enhanced proxy that injects fake authentication to trick Google Cloud Shell
 */
export async function GET(request: NextRequest) {
  try {
    // Get or create fake session
    let sessionToken = request.cookies.get('scg_session')?.value;
    let fakeCreds;

    if (sessionToken) {
      const session = await verifySession(sessionToken);
      if (session) {
        fakeCreds = {
          access_token: session.tokens.access_token,
          refresh_token: session.tokens.refresh_token || '',
          email: session.email || 'user@example.com',
          user_id: session.userId || '123456789',
        };
      }
    }

    // If no valid session, create new fake credentials
    if (!fakeCreds) {
      fakeCreds = createFakeCredentials();
    }

    // Get the target URL from query params or use Cloud Shell
    const targetUrl = request.nextUrl.searchParams.get('url') || 
      'https://shell.cloud.google.com/?show=ide%2Cterminal';

    // Fetch with fake authentication headers
    const authHeaders = getFakeAuthHeaders(fakeCreds as any);
    const fakeCookies = getFakeAuthCookies(fakeCreds as any).join('; ');

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://console.cloud.google.com/',
        'Origin': 'https://console.cloud.google.com',
        'Cookie': fakeCookies,
        ...authHeaders,
      },
      redirect: 'follow',
    });

    let html = await response.text();

    // Inject JavaScript to set fake authentication in the iframe
    const authScript = `
      <script>
        (function() {
          // Set fake authentication in localStorage
          try {
            localStorage.setItem('oauth_token', '${fakeCreds.access_token}');
            localStorage.setItem('oauth_user_id', '${fakeCreds.user_id}');
            localStorage.setItem('oauth_user_email', '${fakeCreds.email}');
            localStorage.setItem('cloud_shell_auth', 'verified');
          } catch(e) {}
          
          // Set fake cookies via document.cookie
          document.cookie = 'oauth_token=${fakeCreds.access_token}; path=/; domain=.google.com';
          document.cookie = 'oauth_consumer_key=cloud-shell; path=/; domain=.google.com';
          
          // Override fetch to inject auth headers
          const originalFetch = window.fetch;
          window.fetch = function(...args) {
            if (args[1]) {
              args[1].headers = args[1].headers || {};
              args[1].headers['Authorization'] = 'Bearer ${fakeCreds.access_token}';
              args[1].headers['X-Goog-AuthUser'] = '0';
              args[1].headers['X-Goog-Cloud-Shell-Auth'] = 'verified';
            }
            return originalFetch.apply(this, args);
          };
        })();
      </script>
    `;

    // Inject script and CSS
    if (html.includes('</head>')) {
      html = html.replace('</head>', `${authScript}</head>`);
    } else if (html.includes('<body')) {
      html = html.replace('<body', `${authScript}<body`);
    }

    // Create response
    const modifiedResponse = new NextResponse(html, {
      status: response.status,
      headers: {
        'Content-Type': 'text/html',
        'X-Frame-Options': 'ALLOWALL',
        'X-Content-Type-Options': 'nosniff',
        ...authHeaders,
      },
    });

    // Set fake cookies in response
    getFakeAuthCookies(fakeCreds as any).forEach(cookie => {
      const [nameValue] = cookie.split(';');
      const [name, value] = nameValue.split('=');
      modifiedResponse.cookies.set(name.trim(), value.trim(), {
        httpOnly: false,
        secure: true,
        sameSite: 'none',
        path: '/',
      });
    });

    return modifiedResponse;
  } catch (error) {
    console.error('Shell proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy shell' },
      { status: 500 }
    );
  }
}
