import type { Metadata } from 'next';
import { getCheckoutConfig } from '@/features/settings/server/settings.service';
import { CheckoutClient } from './checkout-client';

export const metadata: Metadata = {
  title: 'Checkout',
  robots: { index: false, follow: false },
};

/**
 * Checkout shell.
 *
 * Payment methods and shipping zones are read here (from the settings cache)
 * and handed to the form with its first render. The form used to mount, then
 * fetch /api/payment-settings and /api/governorate-pricing from the browser —
 * so the address fields sat behind a skeleton and the payment options and
 * delivery fee popped in afterwards.
 */
export default async function CheckoutPage() {
  const config = await getCheckoutConfig();
  return <CheckoutClient config={config} />;
}
