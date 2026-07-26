import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { cookies } from 'next/headers';
import { decode } from 'next-auth/jwt';
import connectDB from '@/lib/db/mongoose';
import { getSettings, StoreSettings } from '@/lib/db/models/store-settings.model';

async function checkAdminAuth() {
  const session = await getServerSession(authOptions);
  if (session?.user?.adminId) return true;

  try {
    const cookieStore = await cookies();
    const sessionToken =
      cookieStore.get('next-auth.session-token')?.value ||
      cookieStore.get('__Secure-next-auth.session-token')?.value;

    if (sessionToken) {
      const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || '';
      const token = await decode({ token: sessionToken, secret });
      if (token?.adminId) return true;
    }
  } catch (err) {
    console.error('[ADMIN AUTH CHECK] Error decoding token:', err);
  }
  return false;
}

/**
 * GET /api/admin/governorate-pricing
 * Admin: Fetch all shipping zones.
 */
export async function GET() {
  const isAuth = await checkAdminAuth();
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();
    const settings = await getSettings();

    const pricing = settings.shippingZones.map((z) => ({
      governorate: z.governorate,
      shipping_cost: z.feeMinor,
      cod_fee: z.codFeeMinor ?? 0,
      estimated_days: z.estimatedDays,
      is_active: z.enabled,
    }));

    return NextResponse.json({ success: true, pricing });
  } catch (error) {
    console.error('[GET /api/admin/governorate-pricing]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch pricing' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/governorate-pricing
 * Admin: Upsert single or bulk governorate pricing entries.
 */
export async function POST(req: NextRequest) {
  const isAuth = await checkAdminAuth();
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();
    const body = await req.json();

    if (body.bulk && Array.isArray(body.entries)) {
      // Bulk upsert
      const settings = await getSettings();
      const existingMap = new Map(
        settings.shippingZones.map((z) => [z.governorate, z])
      );

      for (const entry of body.entries) {
        existingMap.set(entry.governorate, {
          governorate: entry.governorate,
          feeMinor: entry.shipping_cost,
          codFeeMinor: entry.cod_fee ?? 0,
          estimatedDays: entry.estimated_days ?? 3,
          enabled: entry.is_active ?? true,
        });
      }

      await StoreSettings.updateOne(
        { key: 'main' },
        { $set: { shippingZones: Array.from(existingMap.values()) } },
      );

      return NextResponse.json({ success: true });
    }

    // Single upsert
    const { governorate, shipping_cost, cod_fee, estimated_days, is_active } = body;

    if (!governorate || shipping_cost == null) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 },
      );
    }

    const settings = await getSettings();
    const idx = settings.shippingZones.findIndex(
      (z) => z.governorate === governorate
    );

    const zone = {
      governorate,
      feeMinor: shipping_cost,
      codFeeMinor: cod_fee ?? 0,
      estimatedDays: estimated_days ?? 3,
      enabled: is_active ?? true,
    };

    if (idx >= 0) {
      settings.shippingZones[idx] = zone;
    } else {
      settings.shippingZones.push(zone);
    }

    await settings.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[POST /api/admin/governorate-pricing]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update pricing' },
      { status: 500 },
    );
  }
}
