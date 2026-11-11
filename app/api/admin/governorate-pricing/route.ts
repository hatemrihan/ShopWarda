import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import connectDB from '@/lib/db/mongoose';
import { getSettings } from '@/lib/db/models/store-settings.model';
import { guardAdmin } from '@/lib/auth/api-guard';
import { invalidateSettings } from '@/lib/cache';
import type { IShippingZone } from '@/lib/db/types';

const piasters = z.number().int('Amounts must be whole piasters').min(0).max(100_000_000);

const entrySchema = z.object({
  governorate: z.string().trim().min(1).max(150),
  shipping_cost: piasters,
  cod_fee: piasters.optional(),
  estimated_days: z.number().min(0).max(60).optional(),
  is_active: z.boolean().optional(),
});

const bodySchema = z.union([
  z.object({ bulk: z.literal(true), entries: z.array(entrySchema).min(1).max(500) }),
  entrySchema,
]);

/**
 * GET /api/admin/governorate-pricing
 * Admin: Fetch all shipping zones.
 */
export async function GET() {
  const denied = await guardAdmin();
  if (denied) return denied;

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
  const denied = await guardAdmin();
  if (denied) return denied;

  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return NextResponse.json(
        {
          success: false,
          error: issue ? `${issue.path.join('.')}: ${issue.message}` : 'Invalid pricing data',
        },
        { status: 400 },
      );
    }

    const entries = 'bulk' in parsed.data ? parsed.data.entries : [parsed.data];

    await connectDB();
    const settings = await getSettings();

    const zones = new Map<string, IShippingZone>(
      settings.shippingZones.map((z) => [
        z.governorate,
        {
          governorate: z.governorate,
          feeMinor: z.feeMinor,
          codFeeMinor: z.codFeeMinor ?? 0,
          estimatedDays: z.estimatedDays,
          enabled: z.enabled,
        },
      ]),
    );

    for (const entry of entries) {
      const existing = zones.get(entry.governorate);
      zones.set(entry.governorate, {
        governorate: entry.governorate,
        feeMinor: entry.shipping_cost,
        codFeeMinor: entry.cod_fee ?? 0,
        // The admin screen does not edit delivery days; keep what is stored
        // instead of resetting it to 3 on every save.
        estimatedDays: entry.estimated_days ?? existing?.estimatedDays ?? 3,
        enabled: entry.is_active ?? existing?.enabled ?? true,
      });
    }

    // Saved through the document (not a raw $set) so the schema's validators
    // run — a negative or fractional fee can no longer be stored.
    settings.shippingZones = Array.from(zones.values());
    await settings.save();

    // Checkout reads zones from the settings cache.
    invalidateSettings();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[POST /api/admin/governorate-pricing]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update pricing' },
      { status: 500 },
    );
  }
}
