import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import { Promotion } from '@/lib/db/models/promotion.model';
import { guardAdmin } from '@/lib/auth/api-guard';

// GET /api/admin/promo — list all promos
export async function GET() {
  const denied = await guardAdmin();
  if (denied) return denied;

  await connectDB();
  const promos = await Promotion.find({}).sort({ createdAt: -1 }).lean();
  const items = promos.map((p) => ({
    id: String(p._id),
    code: p.code,
    name: p.name,
    type: p.type,
    value: p.value,
    minOrderMinor: p.minOrderMinor ?? 0,
    maxDiscountMinor: p.maxDiscountMinor ?? 0,
    usageLimit: p.usageLimit ?? null,
    usageCount: p.usageCount,
    perPhoneLimit: p.perPhoneLimit ?? null,
    validFrom: p.validFrom.toISOString(),
    validUntil: p.validUntil.toISOString(),
    scope: p.scope,
    status: p.status,
    createdAt: p.createdAt.toISOString(),
  }));
  return NextResponse.json({ items, total: items.length });
}

// POST /api/admin/promo — create new promo
export async function POST(request: Request) {
  const denied = await guardAdmin();
  if (denied) return denied;

  await connectDB();
  try {
    const body = await request.json();
    const promo = await Promotion.create({
      code: body.code,
      name: body.name || body.code,
      type: body.type,
      value: body.value,
      minOrderMinor: body.minOrderMinor ?? 0,
      maxDiscountMinor: body.maxDiscountMinor ?? undefined,
      usageLimit: body.usageLimit ?? undefined,
      perPhoneLimit: body.perPhoneLimit ?? undefined,
      validFrom: body.validFrom ? new Date(body.validFrom) : new Date(),
      validUntil: body.validUntil ? new Date(body.validUntil) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      scope: body.scope ?? 'all',
      status: body.status ?? 'active',
    });
    return NextResponse.json({ success: true, id: String(promo._id) }, { status: 201 });
  } catch (err: unknown) {
    const errorObj = err as { code?: number; message?: string };
    if (errorObj?.code === 11000) {
      return NextResponse.json({ error: 'Promo code already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: errorObj?.message || 'Failed to create promo' }, { status: 400 });
  }
}
