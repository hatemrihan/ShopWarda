/**
 * Order pricing — pure functions, no I/O and no database imports.
 *
 * Kept deliberately free of server dependencies so the money maths can be
 * unit tested (and reasoned about) without a MongoDB connection.
 *
 * All money is integer piasters.
 */

export interface PricingInput {
  subtotalMinor: number;
  shippingFeeMinor: number;
  codFeeMinor: number;
  discountMinor: number;
  freeDeliveryThresholdMinor?: number | null;
}

export interface PricingResult {
  subtotalMinor: number;
  discountMinor: number;
  shippingMinor: number;
  codFeeMinor: number;
  totalMinor: number;
}

export interface PromoRules {
  type: 'percentage' | 'fixed_amount';
  value: number;
  minOrderMinor?: number | null;
  maxDiscountMinor?: number | null;
  usageLimit?: number | null;
  usageCount: number;
  validFrom: Date;
  validUntil: Date;
}

/**
 * Decide whether a promotion applies and by how much.
 * Returns 0 when the promotion does not apply.
 */
export function computePromoDiscount(
  promo: PromoRules,
  subtotalMinor: number,
  now: Date = new Date(),
): number {
  const withinWindow = now >= promo.validFrom && now <= promo.validUntil;
  const underLimit = !promo.usageLimit || promo.usageCount < promo.usageLimit;
  const meetsMinimum = !promo.minOrderMinor || subtotalMinor >= promo.minOrderMinor;

  if (!withinWindow || !underLimit || !meetsMinimum) return 0;

  if (promo.type === 'percentage') {
    let discount = Math.round(subtotalMinor * (promo.value / 100));
    if (promo.maxDiscountMinor) {
      discount = Math.min(discount, promo.maxDiscountMinor);
    }
    // Never discount more than the goods are worth.
    return Math.min(discount, subtotalMinor);
  }

  return Math.min(promo.value, subtotalMinor);
}

/**
 * Combine subtotal, discount, shipping and COD fee into the order total.
 *
 * The free-delivery threshold is tested against the *pre-discount* subtotal:
 * a promo code must not retroactively cost the customer free delivery.
 */
export function computeOrderPricing(input: PricingInput): PricingResult {
  const { subtotalMinor, shippingFeeMinor, codFeeMinor, discountMinor } = input;

  const threshold = input.freeDeliveryThresholdMinor;
  const shippingMinor = threshold && subtotalMinor >= threshold ? 0 : shippingFeeMinor;

  const totalMinor = subtotalMinor - discountMinor + shippingMinor + codFeeMinor;

  return {
    subtotalMinor,
    discountMinor,
    shippingMinor,
    codFeeMinor,
    // An order can never be worth less than nothing.
    totalMinor: Math.max(0, totalMinor),
  };
}
