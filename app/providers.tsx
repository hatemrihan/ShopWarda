'use client';

import { CartProvider } from '@/features/cart/context/cart-context';
import { AnalyticsTracker } from '@/components/shared/analytics-tracker';
import type { ReactNode } from 'react';

/**
 * Storefront providers (mounted by app/(store)/layout.tsx).
 *
 * This used to be mounted in the root layout and also wrapped everything in
 * NextAuth's <SessionProvider>. Only the admin login page reads the session,
 * yet every shopper's browser called /api/auth/session on every page load —
 * and again each time the tab regained focus — waking a server function for
 * nothing. The session provider now lives with the login page, and the cart
 * with the storefront (the admin panel no longer loads or validates a cart).
 */
export default function StoreProviders({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      <AnalyticsTracker />
      {children}
    </CartProvider>
  );
}
