import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import { Promotion } from '@/lib/db/models/promotion.model';
import { checkRateLimit, checkoutLimiter } from '@/lib/security/rate-limit';
import { getClientIp } from '@/lib/auth/api-guard';
import { RateLimitError } from '@/lib/errors';

/**
 * POST /api/promo/validate
 * Public endpoint — validates a promo code and returns the discount.
 *
 * Body: { code: string, subtotalMinor: number }
 * Response: { success: true, discount: { type, value, discountMinor, code } }
 *        or { success: false, error: string }
 */
export async function POST(req: NextRequest) {
  try {
    // Public — rate limited per IP so codes cannot be brute-forced.
    await checkRateLimit(checkoutLimiter, `promo:${getClientIp(req)}`);

    await connectDB();
    const { code, subtotalMinor } = await req.json();

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Promo code is required' },
        { status: 400 },
      );
    }

    const now = new Date();
    const promo = await Promotion.findOne({
      code: code.toUpperCase().trim(),
      status: 'active',
    });

    if (!promo) {
      return NextResponse.json(
        { success: false, error: 'Invalid promo code' },
        { status: 404 },
      );
    }

    // Check date range
    if (now < promo.validFrom || now > promo.validUntil) {
      return NextResponse.json(
        { success: false, error: 'Promo code has expired' },
        { status: 400 },
      );
    }

    // Check usage limit
    if (promo.usageLimit && promo.usageCount >= promo.usageLimit) {
      return NextResponse.json(
        { success: false, error: 'Promo code usage limit reached' },
        { status: 400 },
      );
    }

    // Check minimum order
    const subtotal = subtotalMinor ?? 0;
    if (promo.minOrderMinor && subtotal < promo.minOrderMinor) {
      const minEGP = (promo.minOrderMinor / 100).toFixed(0);
      return NextResponse.json(
        { success: false, error: `Minimum order of EGP ${minEGP} required` },
        { status: 400 },
      );
    }

    // Calculate discount
    let discountMinor = 0;
    if (promo.type === 'percentage') {
      discountMinor = Math.round(subtotal * (promo.value / 100));
      if (promo.maxDiscountMinor) {
        discountMinor = Math.min(discountMinor, promo.maxDiscountMinor);
      }
    } else {
      // fixed_amount
      discountMinor = Math.min(promo.value, subtotal);
    }

    return NextResponse.json({
      success: true,
      discount: {
        type: promo.type,
        value: promo.value,
        discountMinor,
        code: promo.code,
        name: promo.name,
      },
    });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { success: false, error: 'Too many attempts. Please wait a moment.' },
        { status: 429 },
      );
    }

    console.error('[POST /api/promo/validate]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to validate promo code' },
      { status: 500 },
    );
  }
}
