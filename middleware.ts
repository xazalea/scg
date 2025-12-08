import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware to inject authentication headers into all requests
 */
export function middleware(request: NextRequest) {
  // Add fake authentication headers to all requests
  const requestHeaders = new Headers(request.headers);
  
  // Only add to Google Cloud Shell requests
  if (request.nextUrl.pathname.includes('/api/proxy-full') || 
      request.nextUrl.pathname.includes('/shell')) {
    requestHeaders.set('X-Goog-AuthUser', '0');
    requestHeaders.set('X-Goog-Cloud-Shell-Auth', 'verified');
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    '/api/proxy-full/:path*',
    '/shell/:path*',
  ],
};

