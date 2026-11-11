/**
 * Storefront view of the store settings — cached, plain-JSON DTOs.
 *
 * `getSettings()` returns a live Mongoose document and was called uncached
 * from the product page, both checkout endpoints and the bouquet catalogue,
 * i.e. one database read per visitor per view for data that changes a few
 * times a year. Storefront readers use the cached snapshot below; every admin
 * write to settings calls `invalidateSettings()` so changes show immediately.
 *
 * The order service still reads the live document — money is never priced
 * from a cache.
 */

import { unstable_cache } from 'next/cache';
import connectDB from '@/lib/db/mongoose';
import { getSettings } from '@/lib/db/models/store-settings.model';
import { CACHE_TAGS } from '@/lib/cache';
import type { ISizeGuide } from '@/lib/db/types';
import type { ShippingZoneLike } from '@/features/checkout/shipping';

export interface CheckoutConfigDTO {
  codEnabled: boolean;
  instaPayEnabled: boolean;
  instaPay: { accountLink: string; instructions: string };
  /** Every configured zone, enabled or not — the resolver needs both. */
  shippingZones: Required<ShippingZoneLike>[];
  freeDeliveryThresholdMinor: number | null;
}

export interface StorefrontSettingsDTO extends CheckoutConfigDTO {
  sizeGuide: ISizeGuide | null;
}

const SETTINGS_REVALIDATE_SECONDS = 3600;

async function loadStorefrontSettings(): Promise<StorefrontSettingsDTO> {
  await connectDB();
  const settings = await getSettings();

  return {
    codEnabled: settings.codEnabled !== false,
    instaPayEnabled: settings.instaPayEnabled !== false,
    instaPay: {
      accountLink: settings.instaPay?.accountLink ?? '',
      instructions: settings.instaPay?.instructions ?? '',
    },
    shippingZones: (settings.shippingZones ?? []).map((z) => ({
      governorate: z.governorate,
      feeMinor: z.feeMinor ?? 0,
      codFeeMinor: z.codFeeMinor ?? 0,
      estimatedDays: z.estimatedDays ?? 0,
      enabled: z.enabled !== false,
    })),
    freeDeliveryThresholdMinor: settings.freeDeliveryThresholdMinor ?? null,
    // Round-trip strips Mongoose internals so the value is cacheable and can
    // cross the server → client boundary.
    sizeGuide: settings.sizeGuide
      ? (JSON.parse(JSON.stringify(settings.sizeGuide)) as ISizeGuide)
      : null,
  };
}

export const getStorefrontSettings = unstable_cache(
  loadStorefrontSettings,
  ['storefront-settings'],
  { tags: [CACHE_TAGS.SETTINGS], revalidate: SETTINGS_REVALIDATE_SECONDS },
);

export async function getCheckoutConfig(): Promise<CheckoutConfigDTO> {
  const { codEnabled, instaPayEnabled, instaPay, shippingZones, freeDeliveryThresholdMinor } =
    await getStorefrontSettings();
  return { codEnabled, instaPayEnabled, instaPay, shippingZones, freeDeliveryThresholdMinor };
}
