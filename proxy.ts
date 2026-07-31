/**
 * Next.js 16 Proxy (formerly Middleware).
 * Protects admin panel routes — redirects to login if no session.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function getSessionToken(request: NextRequest): string | undefined {
  // NextAuth v4 and Auth.js cookie names, plain and __Secure- prefixed.
  return (
    request.cookies.get('next-auth.session-token')?.value ??
    request.cookies.get('__Secure-next-auth.session-token')?.value ??
    request.cookies.get('authjs.session-token')?.value ??
    request.cookies.get('__Secure-authjs.session-token')?.value
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin API routes: cheap defense-in-depth. This only proves a session
  // cookie is present — it does NOT validate it. Every route still performs
  // its own `guardAdmin()` check; this just turns away anonymous traffic early.
  if (pathname.startsWith('/api/admin/')) {
    if (!getSessionToken(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }
    return NextResponse.next();
  }

  // Skip login page — always accessible
  if (pathname.startsWith('/admin/login') || pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Admin panel routes require authentication
  if (pathname.startsWith('/admin')) {
    if (!getSessionToken(request)) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
