import { describe, it, expect } from 'vitest';
import {
  computeOrderPricing,
  computePromoDiscount,
  type PromoRules,
} from '@/features/checkout/pricing';

// All money is integer piasters.

describe('computeOrderPricing', () => {
  it('sums subtotal, shipping and COD fee', () => {
    const result = computeOrderPricing({
      subtotalMinor: 50_000,
      shippingFeeMinor: 5_000,
      codFeeMinor: 1_000,
      discountMinor: 0,
    });

    expect(result.totalMinor).toBe(56_000);
    expect(result.shippingMinor).toBe(5_000);
  });

  it('subtracts the discount', () => {
    const result = computeOrderPricing({
      subtotalMinor: 50_000,
      shippingFeeMinor: 5_000,
      codFeeMinor: 0,
      discountMinor: 10_000,
    });

    expect(result.totalMinor).toBe(45_000);
  });

  it('waives shipping once the free-delivery threshold is met', () => {
    const result = computeOrderPricing({
      subtotalMinor: 100_000,
      shippingFeeMinor: 5_000,
      codFeeMinor: 0,
      discountMinor: 0,
      freeDeliveryThresholdMinor: 100_000,
    });

    expect(result.shippingMinor).toBe(0);
    expect(result.totalMinor).toBe(100_000);
  });

  it('charges shipping below the threshold', () => {
    const result = computeOrderPricing({
      subtotalMinor: 99_999,
      shippingFeeMinor: 5_000,
      codFeeMinor: 0,
      discountMinor: 0,
      freeDeliveryThresholdMinor: 100_000,
    });

    expect(result.shippingMinor).toBe(5_000);
  });

  it('applies the threshold to the pre-discount subtotal', () => {
    // A discount must not retroactively cost the customer free delivery.
    const result = computeOrderPricing({
      subtotalMinor: 100_000,
      shippingFeeMinor: 5_000,
      codFeeMinor: 0,
      discountMinor: 20_000,
      freeDeliveryThresholdMinor: 100_000,
    });

    expect(result.shippingMinor).toBe(0);
    expect(result.totalMinor).toBe(80_000);
  });

  it('never produces a negative total', () => {
    const result = computeOrderPricing({
      subtotalMinor: 10_000,
      shippingFeeMinor: 0,
      codFeeMinor: 0,
      discountMinor: 50_000,
    });

    expect(result.totalMinor).toBe(0);
  });

  it('ignores a zero threshold rather than making everything free', () => {
    const result = computeOrderPricing({
      subtotalMinor: 1_000,
      shippingFeeMinor: 5_000,
      codFeeMinor: 0,
      discountMinor: 0,
      freeDeliveryThresholdMinor: 0,
    });

    expect(result.shippingMinor).toBe(5_000);
  });
});

describe('computePromoDiscount', () => {
  const now = new Date('2026-06-15T12:00:00Z');

  const base: PromoRules = {
    type: 'percentage',
    value: 10,
    usageCount: 0,
    validFrom: new Date('2026-06-01T00:00:00Z'),
    validUntil: new Date('2026-06-30T00:00:00Z'),
  };

  it('takes a percentage of the subtotal', () => {
    expect(computePromoDiscount(base, 50_000, now)).toBe(5_000);
  });

  it('rounds to whole piasters', () => {
    expect(computePromoDiscount({ ...base, value: 33 }, 10_001, now)).toBe(3_300);
  });

  it('caps a percentage discount at maxDiscountMinor', () => {
    const promo = { ...base, value: 50, maxDiscountMinor: 10_000 };
    expect(computePromoDiscount(promo, 100_000, now)).toBe(10_000);
  });

  it('applies a fixed discount', () => {
    const promo: PromoRules = { ...base, type: 'fixed_amount', value: 7_500 };
    expect(computePromoDiscount(promo, 50_000, now)).toBe(7_500);
  });

  it('never discounts more than the subtotal', () => {
    const promo: PromoRules = { ...base, type: 'fixed_amount', value: 90_000 };
    expect(computePromoDiscount(promo, 50_000, now)).toBe(50_000);
  });

  it('rejects a code before its validity window', () => {
    expect(computePromoDiscount(base, 50_000, new Date('2026-05-31T00:00:00Z'))).toBe(0);
  });

  it('rejects an expired code', () => {
    expect(computePromoDiscount(base, 50_000, new Date('2026-07-01T00:00:00Z'))).toBe(0);
  });

  it('rejects a code that has hit its usage limit', () => {
    const promo = { ...base, usageLimit: 5, usageCount: 5 };
    expect(computePromoDiscount(promo, 50_000, now)).toBe(0);
  });

  it('allows a code still under its usage limit', () => {
    const promo = { ...base, usageLimit: 5, usageCount: 4 };
    expect(computePromoDiscount(promo, 50_000, now)).toBe(5_000);
  });

  it('rejects an order below the minimum', () => {
    const promo = { ...base, minOrderMinor: 60_000 };
    expect(computePromoDiscount(promo, 50_000, now)).toBe(0);
  });

  it('accepts an order exactly at the minimum', () => {
    const promo = { ...base, minOrderMinor: 50_000 };
    expect(computePromoDiscount(promo, 50_000, now)).toBe(5_000);
  });
});
