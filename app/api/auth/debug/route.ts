import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { cookies, headers } from 'next/headers';
import { authOptions } from '@/lib/auth-options';

export const dynamic = 'force-dynamic';

export async function GET() {
  const results: Record<string, unknown> = {};

  // 1. Check cookies
  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    results.cookies = allCookies.map(c => ({ name: c.name, valueLength: c.value.length }));
    results.hasSessionCookie = allCookies.some(c => 
      c.name === 'next-auth.session-token' || 
      c.name === '__Secure-next-auth.session-token'
    );
  } catch (err: unknown) {
    results.cookieError = err instanceof Error ? err.message : String(err);
  }

  // 2. Try getServerSession
  try {
    const session = await getServerSession(authOptions);
    results.getServerSession = session;
  } catch (err: unknown) {
    results.getServerSessionError = err instanceof Error ? err.message : String(err);
  }

  // 3. Try getToken
  try {
    const cookieStore = await cookies();
    const headerStore = await headers();
    const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || '';
    
    const token = await getToken({
      req: {
        cookies: Object.fromEntries(cookieStore.getAll().map(c => [c.name, c.value])),
        headers: Object.fromEntries(headerStore.entries()),
      } as unknown as Parameters<typeof getToken>[0]['req'],
      secret,
    });
    results.getToken = token;
  } catch (err: unknown) {
    results.getTokenError = err instanceof Error ? err.message : String(err);
  }

  // 4. Environment check
  results.env = {
    hasAuthSecret: !!process.env.AUTH_SECRET,
    hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
    hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
    nextAuthUrl: process.env.NEXTAUTH_URL,
    hasGoogleId: !!process.env.AUTH_GOOGLE_ID,
  };

  return NextResponse.json(results, { 
    headers: { 'Cache-Control': 'no-store' } 
  });
}
