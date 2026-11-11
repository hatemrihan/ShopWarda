/**
 * Shipping-zone resolution — pure, no I/O.
 *
 * Shared by the checkout UI (to show the fee) and the order service (to charge
 * it), so the two can never disagree about what delivery costs.
 *
 * Zones are keyed by governorate name. Governorates with per-city pricing
 * (Cairo, Giza) may also carry "<governorate> - <city>" rows. The admin screen
 * saves a row for every city whether or not a rate was entered, so a city row
 * with no fees at all means "not set — use the governorate rate", not "free".
 */

export interface ShippingZoneLike {
  governorate: string;
  feeMinor: number;
  codFeeMinor?: number | null;
  estimatedDays?: number | null;
  enabled: boolean;
}

export interface ResolvedShipping {
  /** The zone row that priced this address. */
  zoneKey: string;
  feeMinor: number;
  codFeeMinor: number;
  estimatedDays: number | null;
}

export type ShippingResolution =
  | { ok: true; shipping: ResolvedShipping }
  /** No zones configured at all — delivery is not priced yet. */
  | { ok: true; shipping: null }
  /** Zones exist, but this governorate is switched off or unknown. */
  | { ok: false; reason: 'unsupported' };

export function subCityKey(governorate: string, city: string): string {
  return `${governorate} - ${city}`;
}

function toResolved(zone: ShippingZoneLike): ResolvedShipping {
  return {
    zoneKey: zone.governorate,
    feeMinor: zone.feeMinor ?? 0,
    codFeeMinor: zone.codFeeMinor ?? 0,
    estimatedDays: zone.estimatedDays ?? null,
  };
}

export function resolveShippingZone(
  zones: readonly ShippingZoneLike[],
  governorate: string,
  city?: string | null,
): ShippingResolution {
  if (zones.length === 0) return { ok: true, shipping: null };

  const parent = zones.find((z) => z.governorate === governorate);
  if (!parent || !parent.enabled) return { ok: false, reason: 'unsupported' };

  const trimmedCity = city?.trim();
  if (trimmedCity) {
    const sub = zones.find((z) => z.governorate === subCityKey(governorate, trimmedCity));
    if (sub) {
      // A city the shop explicitly switched off is not deliverable.
      if (!sub.enabled) return { ok: false, reason: 'unsupported' };

      const hasOwnRate = (sub.feeMinor ?? 0) > 0 || (sub.codFeeMinor ?? 0) > 0;
      if (hasOwnRate) return { ok: true, shipping: toResolved(sub) };
    }
  }

  return { ok: true, shipping: toResolved(parent) };
}

/** Free delivery applies to the pre-discount subtotal (see computeOrderPricing). */
export function qualifiesForFreeDelivery(
  subtotalMinor: number,
  thresholdMinor?: number | null,
): boolean {
  return Boolean(thresholdMinor && thresholdMinor > 0 && subtotalMinor >= thresholdMinor);
}
