import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import { getSettings } from '@/lib/db/models/store-settings.model';

/**
 * GET /api/payment-settings
 * Public: the payment configuration a guest needs to complete checkout.
 *
 * Deliberately narrow — only the fields the checkout UI renders. Admin reads
 * and all writes stay on /api/admin/payment-settings behind a session check.
 */
export async function GET() {
  try {
    await connectDB();
    const settings = await getSettings();

    return NextResponse.json({
      success: true,
      settings: {
        codEnabled: settings.codEnabled,
        instaPayEnabled: settings.instaPayEnabled,
        instaPay: {
          accountLink: settings.instaPay?.accountLink ?? '',
          instructions: settings.instaPay?.instructions ?? '',
        },
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
