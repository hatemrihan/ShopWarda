import { NextResponse } from 'next/server';
import { getCheckoutConfig } from '@/features/settings/server/settings.service';

/**
 * GET /api/payment-settings
 * Public: the payment configuration a guest needs to complete checkout.
 *
 * Deliberately narrow — only the fields the checkout UI renders. Admin reads
 * and all writes stay on /api/admin/payment-settings behind a session check.
 */
export async function GET() {
  try {
    const config = await getCheckoutConfig();

    return NextResponse.json({
      success: true,
      settings: {
        codEnabled: config.codEnabled,
        instaPayEnabled: config.instaPayEnabled,
        instaPay: config.instaPay,
      },
    });
  } catch (error) {
    console.error('[GET /api/payment-settings]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payment settings' },
      { status: 500 },
    );
  }
}
