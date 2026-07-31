import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import { Promotion } from '@/lib/db/models/promotion.model';
import { isValidObjectId } from 'mongoose';
import { guardAdmin } from '@/lib/auth/api-guard';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/admin/promo/[id]
export async function GET(_req: Request, ctx: RouteContext) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { id } = await ctx.params;
  if (!isValidObjectId(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  await connectDB();
  const promo = await Promotion.findById(id).lean();
  if (!promo) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({
    id: String(promo._id),
    code: promo.code,
    name: promo.name,
    type: promo.type,
    value: promo.value,
    minOrderMinor: promo.minOrderMinor ?? 0,
    maxDiscountMinor: promo.maxDiscountMinor ?? 0,
    usageLimit: promo.usageLimit ?? null,
    usageCount: promo.usageCount,
    perPhoneLimit: promo.perPhoneLimit ?? null,
    validFrom: promo.validFrom.toISOString(),
    validUntil: promo.validUntil.toISOString(),
    scope: promo.scope,
    status: promo.status,
    createdAt: promo.createdAt.toISOString(),
  });
}

// PUT /api/admin/promo/[id]
export async function PUT(req: Request, ctx: RouteContext) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { id } = await ctx.params;
  if (!isValidObjectId(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  await connectDB();
  try {
    const body = await req.json();
    const updated = await Promotion.findByIdAndUpdate(
      id,
      {
        ...(body.code && { code: body.code }),
        ...(body.name && { name: body.name }),
        ...(body.type && { type: body.type }),
        ...(body.value !== undefined && { value: body.value }),
        ...(body.minOrderMinor !== undefined && { minOrderMinor: body.minOrderMinor }),
        ...(body.maxDiscountMinor !== undefined && { maxDiscountMinor: body.maxDiscountMinor }),
        ...(body.usageLimit !== undefined && { usageLimit: body.usageLimit }),
        ...(body.perPhoneLimit !== undefined && { perPhoneLimit: body.perPhoneLimit }),
        ...(body.validFrom && { validFrom: new Date(body.validFrom) }),
        ...(body.validUntil && { validUntil: new Date(body.validUntil) }),
        ...(body.scope && { scope: body.scope }),
        ...(body.status && { status: body.status }),
      },
      { new: true, runValidators: true }
    );

    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Update failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// DELETE /api/admin/promo/[id]
export async function DELETE(_req: Request, ctx: RouteContext) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { id } = await ctx.params;
  if (!isValidObjectId(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  await connectDB();
  const deleted = await Promotion.findByIdAndDelete(id);
  if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
