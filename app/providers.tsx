'use client';

import { SessionProvider } from 'next-auth/react';
import { CartProvider } from '@/features/cart/context/cart-context';
import type { ReactNode } from 'react';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <CartProvider>{children}</CartProvider>
    </SessionProvider>
  );
}
