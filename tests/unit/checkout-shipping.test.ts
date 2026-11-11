import { describe, it, expect } from 'vitest';
import {
  resolveShippingZone,
  qualifiesForFreeDelivery,
  type ShippingZoneLike,
} from '@/features/checkout/shipping';

// All money is integer piasters.

const zones: ShippingZoneLike[] = [
  { governorate: 'Cairo', feeMinor: 3000, codFeeMinor: 1000, estimatedDays: 2, enabled: true },
  // Saved by the admin screen for every city, but never given a rate.
  { governorate: 'Cairo - Maadi', feeMinor: 0, codFeeMinor: 0, estimatedDays: 3, enabled: true },
  // A city with its own rate.
  { governorate: 'Cairo - New Cairo', feeMinor: 5000, codFeeMinor: 1500, estimatedDays: 3, enabled: true },
  // A city the shop switched off.
  { governorate: 'Cairo - Helwan', feeMinor: 4000, codFeeMinor: 0, estimatedDays: 3, enabled: false },
  { governorate: 'Aswan', feeMinor: 8000, codFeeMinor: 0, estimatedDays: 5, enabled: false },
];

describe('resolveShippingZone', () => {
  it('charges the governorate rate when no city is given', () => {
    const result = resolveShippingZone(zones, 'Cairo');
    expect(result).toEqual({
      ok: true,
      shipping: { zoneKey: 'Cairo', feeMinor: 3000, codFeeMinor: 1000, estimatedDays: 2 },
    });
  });

  it('prefers a city rate over the governorate rate', () => {
    const result = resolveShippingZone(zones, 'Cairo', 'New Cairo');
    expect(result.ok && result.shipping?.feeMinor).toBe(5000);
    expect(result.ok && result.shipping?.codFeeMinor).toBe(1500);
    expect(result.ok && result.shipping?.zoneKey).toBe('Cairo - New Cairo');
  });

  it('treats a city row with no fees as "not set", not as free delivery', () => {
    const result = resolveShippingZone(zones, 'Cairo', 'Maadi');
    expect(result.ok && result.shipping?.feeMinor).toBe(3000);
    expect(result.ok && result.shipping?.zoneKey).toBe('Cairo');
  });

  it('falls back to the governorate for a city with no row at all', () => {
    const result = resolveShippingZone(zones, 'Cairo', 'Somewhere Else');
    expect(result.ok && result.shipping?.feeMinor).toBe(3000);
  });

  it('ignores surrounding whitespace in the city', () => {
    const result = resolveShippingZone(zones, 'Cairo', '  New Cairo ');
    expect(result.ok && result.shipping?.feeMinor).toBe(5000);
  });

  it('refuses a governorate that is switched off', () => {
    expect(resolveShippingZone(zones, 'Aswan')).toEqual({ ok: false, reason: 'unsupported' });
  });

  it('refuses a governorate that is not configured', () => {
    expect(resolveShippingZone(zones, 'Atlantis')).toEqual({ ok: false, reason: 'unsupported' });
  });

  it('refuses a city that is switched off, even inside an enabled governorate', () => {
    expect(resolveShippingZone(zones, 'Cairo', 'Helwan')).toEqual({
      ok: false,
      reason: 'unsupported',
    });
  });

  it('allows any address when no zones are configured yet', () => {
    expect(resolveShippingZone([], 'Cairo', 'Maadi')).toEqual({ ok: true, shipping: null });
  });
});

describe('qualifiesForFreeDelivery', () => {
  it('applies at and above the threshold', () => {
    expect(qualifiesForFreeDelivery(100_000, 100_000)).toBe(true);
    expect(qualifiesForFreeDelivery(150_000, 100_000)).toBe(true);
  });

  it('does not apply below the threshold', () => {
    expect(qualifiesForFreeDelivery(99_999, 100_000)).toBe(false);
  });

  it('is off when no threshold is set', () => {
    expect(qualifiesForFreeDelivery(1_000_000, null)).toBe(false);
    expect(qualifiesForFreeDelivery(1_000_000, undefined)).toBe(false);
    expect(qualifiesForFreeDelivery(1_000_000, 0)).toBe(false);
  });
});
