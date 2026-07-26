import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { cookies, headers } from 'next/headers';
import { authOptions } from '@/lib/auth-options';

export { authOptions };

/**
 * Helper to get the server session in server components / API routes.
 * Falls back to reading the JWT token directly if getServerSession fails.
 */
export async function auth() {
  console.log('[AUTH-HELPER] auth() called');

  // Try getServerSession first
  try {
    const session = await getServerSession(authOptions);
    console.log('[AUTH-HELPER] getServerSession result:', JSON.stringify(session));
    if (session?.user?.adminId) {
      console.log('[AUTH-HELPER] Session found via getServerSession, adminId:', session.user.adminId);
      return session;
    }
    console.log('[AUTH-HELPER] getServerSession returned no adminId, trying JWT fallback');
  } catch (err) {
    console.error('[AUTH-HELPER] getServerSession threw error:', err);
  }

  // Fallback: read JWT token directly from cookies
  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    console.log('[AUTH-HELPER] All cookies:', allCookies.map(c => c.name).join(', '));
    
    const nextAuthCookie = allCookies.find(c => 
      c.name === 'next-auth.session-token' || 
      c.name === '__Secure-next-auth.session-token'
    );
    console.log('[AUTH-HELPER] NextAuth session cookie found:', !!nextAuthCookie);

    if (!nextAuthCookie) {
      console.log('[AUTH-HELPER] No session cookie — user not logged in');
      return null;
    }

    const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || '';
    console.log('[AUTH-HELPER] Using secret (first 5 chars):', secret.substring(0, 5));

    const headerStore = await headers();
    
    const token = await getToken({
      req: {
        cookies: Object.fromEntries(allCookies.map(c => [c.name, c.value])),
        headers: Object.fromEntries(headerStore.entries()),
      } as unknown as Parameters<typeof getToken>[0]['req'],
      secret,
    });

    console.log('[AUTH-HELPER] getToken result:', JSON.stringify(token));

    if (token?.adminId) {
      console.log('[AUTH-HELPER] Token found with adminId:', token.adminId);
      return {
        user: {
          id: token.sub || '',
          email: (token.email as string) || '',
          name: (token.name as string) || '',
          image: token.picture as string | undefined,
          adminId: token.adminId as string,
          role: (token.role as string) || 'owner',
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };
    }

    console.log('[AUTH-HELPER] Token found but no adminId');
  } catch (err) {
    console.error('[AUTH-HELPER] JWT fallback error:', err);
  }

  console.log('[AUTH-HELPER] Returning null — no valid session');
  return null;
}
