'use client';

/**
 * Client-side analytics.
 *
 * Every event goes to our own /api/analytics/events endpoint, which feeds the
 * admin Funnel page. Until now nothing ever did: this module only forwarded to
 * Facebook Pixel / Google Analytics globals that no page loads, and the events
 * endpoint was a stub — so the Funnel page has shown zeros since launch.
 *
 * If a pixel or gtag snippet is added later, events are forwarded to it too.
 */

export type AnalyticsEventName =
  | 'PageView'
  | 'ViewContent'
  | 'AddToCart'
  | 'InitiateCheckout'
  | 'AddPaymentInfo'
  | 'Purchase';

interface EventData {
  /** Monetary value in piasters. */
  value?: number;
  currency?: string;
  content_ids?: string[];
  content_type?: string;
  content_name?: string;
  num_items?: number;
  [key: string]: unknown;
}

type WindowWithAnalytics = Window & typeof globalThis & {
  fbq?: (action: string, event: string, params?: Record<string, unknown>) => void;
  gtag?: (action: string, event: string, params?: Record<string, unknown>) => void;
};

const SESSION_KEY = 'warda_sid';
const ENDPOINT = '/api/analytics/events';

/** Anonymous id for this browser tab's visit. Holds no personal data. */
function getSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return 'unknown'; // storage blocked — still count the event
  }
}

/** Keep only small scalar values; the server stores these as-is. */
function toProperties(data?: EventData): Record<string, string | number | boolean> {
  const props: Record<string, string | number | boolean> = {};
  if (!data) return props;

  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') props[key] = value.slice(0, 200);
    else if (typeof value === 'number' && Number.isFinite(value)) props[key] = value;
    else if (typeof value === 'boolean') props[key] = value;
  }
  if (data.content_ids?.length) {
    props.productId = String(data.content_ids[0]).slice(0, 64);
  }
  return props;
}

function sendFirstParty(event: AnalyticsEventName, data?: EventData): void {
  const body = JSON.stringify({
    event,
    sessionId: getSessionId(),
    path: window.location.pathname,
    referrer: document.referrer || undefined,
    properties: toProperties(data),
  });

  // sendBeacon survives the page being closed or navigated away from — which
  // is exactly when "Purchase" fires.
  if (navigator.sendBeacon?.(ENDPOINT, new Blob([body], { type: 'application/json' }))) return;

  void fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => { });
}

const GA_EVENT: Partial<Record<AnalyticsEventName, string>> = {
  ViewContent: 'view_item',
  AddToCart: 'add_to_cart',
  InitiateCheckout: 'begin_checkout',
  AddPaymentInfo: 'add_payment_info',
  Purchase: 'purchase',
};

/** Record an analytics event. Never throws. */
export function track(event: AnalyticsEventName, data?: EventData): void {
  if (typeof window === 'undefined') return;

  try {
    sendFirstParty(event, data);

    const win = window as WindowWithAnalytics;

    // Facebook Pixel (PageView is sent by the pixel snippet itself).
    if (win.fbq && event !== 'PageView') {
      win.fbq('track', event, { ...data, currency: data?.currency ?? 'EGP' });
    }

    // Google Analytics (gtag)
    const gaEvent = GA_EVENT[event];
    if (win.gtag && gaEvent) {
      win.gtag('event', gaEvent, {
        value: data?.value ? data.value / 100 : undefined,
        currency: data?.currency ?? 'EGP',
        items: data?.content_ids?.map((id: string) => ({ item_id: id })),
      });
    }
  } catch {
    // Never throw from analytics
  }
}

/** Hook form, kept for existing callers. `track` is a stable reference. */
export function useAnalytics() {
  return { track };
}
