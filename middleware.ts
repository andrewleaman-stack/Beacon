import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = [
  '/api/health',
  '/api/proxy-tiles',
  '/api/feed-health',
  '/api/feeds/status',
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

function hasValidSession(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const sessionCookie = request.cookies.get('beacon-session');
  return !!authHeader || !!sessionCookie;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api/')) {
    if (isPublicPath(pathname)) {
      return NextResponse.next();
    }
    if (!hasValidSession(request)) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized', message: 'Valid session required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    '/api/:path*',
  ],
};