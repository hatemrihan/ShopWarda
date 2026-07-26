'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/features/cart/context/cart-context';

export default function CartPage() {
  const router = useRouter();
  const { state: cartState, isLoaded } = useCart();

  useEffect(() => {
    if (!isLoaded) return;

    if (cartState && cartState.items.length > 0) {
      router.replace('/checkout');
    } else {
      router.replace('/shop');
    }
  }, [isLoaded, cartState, router]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="animate-pulse text-stone-400 text-sm">Redirecting to checkout…</div>
    </div>
  );
}
