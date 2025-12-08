import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy endpoint that intercepts Google Cloud Shell requests
 * and injects fake authentication headers and modifies responses
 */
export async function GET(request: NextRequest) {
  const targetUrl = request.nextUrl.searchParams.get('url');
  
  if (!targetUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  try {
    // Fetch the target URL with modified headers to trick Google
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://console.cloud.google.com/',
        'Origin': 'https://console.cloud.google.com',
        'X-Requested-With': 'XMLHttpRequest',
        // Inject fake authentication headers
        'Authorization': 'Bearer fake-token-for-cloud-shell',
        'X-Goog-AuthUser': '0',
        'X-Goog-Cloud-Shell-Auth': 'verified',
      },
    });

    let html = await response.text();

    // Inject CSS to make it look nice
    const customCSS = `
      <style>
        body {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif !important;
        }
        .cloudshell-container {
          border-radius: 12px !important;
          box-shadow: 0 0 30px rgba(102, 126, 234, 0.5) !important;
        }
        .terminal, .editor {
          background: rgba(17, 24, 39, 0.95) !important;
          backdrop-filter: blur(10px) !important;
          border-radius: 8px !important;
        }
        /* Hide Google branding */
        .google-logo, [aria-label*="Google"], .gb_logo {
          display: none !important;
        }
        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 5px;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(102, 126, 234, 0.5);
          border-radius: 5px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(102, 126, 234, 0.7);
        }
      </style>
    `;

    // Inject CSS before closing head tag or at the beginning of body
    if (html.includes('</head>')) {
      html = html.replace('</head>', `${customCSS}</head>`);
    } else if (html.includes('<body')) {
      html = html.replace('<body', `${customCSS}<body`);
    } else {
      html = customCSS + html;
    }

    // Create response with modified HTML
    const modifiedResponse = new NextResponse(html, {
      status: response.status,
      headers: {
        'Content-Type': 'text/html',
        // Don't set X-Frame-Options to avoid conflicts
        'X-Content-Type-Options': 'nosniff',
      },
    });

    return modifiedResponse;
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy request' },
      { status: 500 }
    );
  }
}

