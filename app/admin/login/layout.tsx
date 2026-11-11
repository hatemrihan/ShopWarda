'use client';

import { SessionProvider } from 'next-auth/react';
import type { ReactNode } from 'react';

/**
 * The login page is the only screen that reads the NextAuth session on the
 * client, so it is the only one that pays for the provider.
 */
export default function AdminLoginLayout({ children }: { children: ReactNode }) {
  return <SessionProvider refetchOnWindowFocus={false}>{children}</SessionProvider>;
}
