import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import { getSettings, StoreSettings } from '@/lib/db/models/store-settings.model';
import { guardAdmin } from '@/lib/auth/api-guard';
import { invalidateSettings } from '@/lib/cache';

/**
 * GET /api/admin/payment-settings
 * Admin: Fetch payment method configuration.
 */
export async function GET() {
  const denied = await guardAdmin();
  if (denied) return denied;

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
    console.error('[GET /api/admin/payment-settings]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payment settings' },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/admin/payment-settings
 * Admin: Update payment method configuration.
 */
export async function PUT(req: NextRequest) {
  const denied = await guardAdmin();
  if (denied) return denied;

  try {
    await connectDB();
    const body = await req.json();

    const updateFields: Record<string, unknown> = {};

    if (typeof body.codEnabled === 'boolean') {
      updateFields.codEnabled = body.codEnabled;
    }
    if (typeof body.instaPayEnabled === 'boolean') {
      updateFields.instaPayEnabled = body.instaPayEnabled;
    }
    if (body.instaPay) {
      if (typeof body.instaPay.accountLink === 'string') {
        const link = body.instaPay.accountLink.trim();
        // Rendered as the "Pay with InstaPay" link at checkout — it must be a
        // web link, never javascript: or another scheme.
        if (link && !/^https?:\/\//i.test(link)) {
          return NextResponse.json(
            { success: false, error: 'The InstaPay link must start with https://' },
            { status: 400 },
          );
        }
        updateFields['instaPay.accountLink'] = link;
      }
      if (typeof body.instaPay.instructions === 'string') {
        updateFields['instaPay.instructions'] = body.instaPay.instructions.slice(0, 2000);
      }
    }

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 },
      );
    }

    // Make sure the singleton exists before the targeted update.
    await getSettings();
    await StoreSettings.updateOne({ key: 'main' }, { $set: updateFields });

    invalidateSettings();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[PUT /api/admin/payment-settings]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update payment settings' },
      { status: 500 },
    );
  }
}
