import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Paths that don't require authentication
const PUBLIC_PATHS = [
  '/api/health',
  '/api/proxy-tiles',
  '/api/feed-health',
  '/api/feeds/status',
];

// Check if path is public
function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

// Simple session check - replace with NextAuth when ready
function hasValidSession(request: NextRequest): boolean {
  // TODO: Integrate with NextAuth v5
  // For now, check for a basic auth header or session cookie
  const authHeader = request.headers.get('authorization');
  const sessionCookie = request.cookies.get('beacon-session');
  
  // In production, verify JWT/session here
  return !!authHeader || !!sessionCookie;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip non-API routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Allow public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Check authentication
  if (!hasValidSession(request)) {
    return new NextResponse(
      JSON.stringify({ error: 'Unauthorized', message: 'Valid session required' }),
      { 
        status: 401, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};