import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import connectDB from '@/lib/db/mongoose';
import { getSettings, StoreSettings } from '@/lib/db/models/store-settings.model';

/**
 * GET /api/admin/payment-settings
 * Admin: Fetch payment method configuration.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.adminId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
  const session = await getServerSession(authOptions);
  if (!session?.user?.adminId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
        updateFields['instaPay.accountLink'] = body.instaPay.accountLink;
      }
      if (typeof body.instaPay.instructions === 'string') {
        updateFields['instaPay.instructions'] = body.instaPay.instructions;
      }
    }

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 },
      );
    }

    await StoreSettings.updateOne(
      { key: 'main' },
      { $set: updateFields },
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[PUT /api/admin/payment-settings]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update payment settings' },
      { status: 500 },
    );
  }
}
