/**
 * Next.js 16 Proxy (formerly Middleware).
 * Protects admin panel routes — redirects to login if no session.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip login page — always accessible
  if (pathname.startsWith('/admin/login') || pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Admin panel routes require authentication
  if (pathname.startsWith('/admin')) {
    // Check for NextAuth v4 session token cookie
    const sessionToken =
      request.cookies.get('next-auth.session-token')?.value ??
      request.cookies.get('__Secure-next-auth.session-token')?.value ??
      request.cookies.get('authjs.session-token')?.value ??
      request.cookies.get('__Secure-authjs.session-token')?.value;

    if (!sessionToken) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
