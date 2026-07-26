import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import { getSettings } from '@/lib/db/models/store-settings.model';

/**
 * GET /api/governorate-pricing
 * Public endpoint — returns shipping zones for checkout form.
 */
export async function GET() {
  try {
    await connectDB();
    const settings = await getSettings();

    const pricing = settings.shippingZones
      .filter((z) => z.enabled)
      .map((z) => ({
        governorate: z.governorate,
        shipping_cost: z.feeMinor,
        cod_fee: z.codFeeMinor ?? 0,
        estimated_days: z.estimatedDays,
        is_active: true,
      }));

    return NextResponse.json({ success: true, pricing });
  } catch (error) {
    console.error('[GET /api/governorate-pricing]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch pricing' },
      { status: 500 },
    );
  }
}
