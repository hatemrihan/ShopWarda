import { NextResponse } from 'next/server';
import { getCheckoutConfig } from '@/features/settings/server/settings.service';

/**
 * GET /api/governorate-pricing
 * Public endpoint — enabled shipping zones.
 *
 * The checkout page now receives this from the server with its first render
 * (see app/(store)/checkout/page.tsx); the route remains for other clients.
 */
export async function GET() {
  try {
    const config = await getCheckoutConfig();

    const pricing = config.shippingZones
      .filter((z) => z.enabled)
      .map((z) => ({
        governorate: z.governorate,
        shipping_cost: z.feeMinor,
        cod_fee: z.codFeeMinor,
        estimated_days: z.estimatedDays,
        is_active: true,
      }));

    return NextResponse.json({
      success: true,
      pricing,
      freeDeliveryThresholdMinor: config.freeDeliveryThresholdMinor,
    });
  } catch (error) {
    console.error('[GET /api/governorate-pricing]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch pricing' },
      { status: 500 },
    );
  }
}
