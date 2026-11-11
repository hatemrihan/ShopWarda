import { cache } from 'react';
import { cookies } from 'next/headers';
import { decode } from 'next-auth/jwt';
import type { Session } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export { authOptions };

const SESSION_COOKIES = [
  '__Secure-next-auth.session-token',
  'next-auth.session-token',
] as const;

/**
 * The current admin session, or null.
 *
 * Reads and verifies the NextAuth JWT cookie directly. This replaces a chain
 * that called `getServerSession`, fell back to `getToken`, and on the way
 * logged the decoded token, every cookie name and the first characters of the
 * signing secret on *every* admin request. Four routes also carried their own
 * copy of the check.
 *
 * Wrapped in React `cache`, so a page that needs the session in its layout,
 * its data loader and a server action verifies the cookie once per request.
 */
export const auth = cache(async (): Promise<Session | null> => {
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  if (!secret) return null;

  try {
    const cookieStore = await cookies();
    const sessionToken = SESSION_COOKIES.map((name) => cookieStore.get(name)?.value).find(Boolean);
    if (!sessionToken) return null;

    // `decode` verifies the signature and expiry; a tampered or expired
    // cookie throws or yields null.
    const token = await decode({ token: sessionToken, secret });
    if (!token?.adminId) return null;

    const expires =
      typeof token.exp === 'number'
        ? new Date(token.exp * 1000).toISOString()
        : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    return {
      user: {
        id: token.sub ?? '',
        email: (token.email as string | undefined) ?? '',
        name: (token.name as string | undefined) ?? '',
        image: (token.picture as string | undefined) ?? undefined,
        adminId: token.adminId,
        role: token.role ?? 'owner',
      },
      expires,
    };
  } catch {
    return null;
  }
});
