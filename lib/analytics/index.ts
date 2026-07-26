'use client';

/**
 * Client-side analytics hook.
 * Wraps Facebook Pixel and Google Analytics calls.
 * Falls back to no-op if pixels are not loaded.
 */

type CheckoutEvent =
  | 'InitiateCheckout'
  | 'AddPaymentInfo'
  | 'Purchase'
  | 'AddToCart'
  | 'ViewContent';

interface EventData {
  value?: number;
  currency?: string;
  content_ids?: string[];
  content_type?: string;
  num_items?: number;
  [key: string]: unknown;
}

type WindowWithAnalytics = Window & typeof globalThis & {
  fbq?: (action: string, event: string, params?: Record<string, unknown>) => void;
  gtag?: (action: string, event: string, params?: Record<string, unknown>) => void;
};

export function useAnalytics() {
  const track = (event: CheckoutEvent, data?: EventData) => {
    try {
      const win = typeof window !== 'undefined' ? (window as WindowWithAnalytics) : undefined;

      // Facebook Pixel
      if (win?.fbq) {
        win.fbq('track', event, {
          ...data,
          currency: data?.currency ?? 'EGP',
        });
      }

      // Google Analytics (gtag)
      if (win?.gtag) {
        const gaEvent = {
          InitiateCheckout: 'begin_checkout',
          AddPaymentInfo: 'add_payment_info',
          Purchase: 'purchase',
          AddToCart: 'add_to_cart',
          ViewContent: 'view_item',
        }[event];

        if (gaEvent) {
          win.gtag('event', gaEvent, {
            value: data?.value ? data.value / 100 : undefined,
            currency: data?.currency ?? 'EGP',
            items: data?.content_ids?.map((id: string) => ({ item_id: id })),
          });
        }
      }
    } catch {
      // Never throw from analytics
    }
  };

  return { track };
}
