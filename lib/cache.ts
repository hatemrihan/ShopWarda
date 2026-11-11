/**
 * Cache tags and invalidation helpers.
 * Used with Next.js revalidateTag.
 *
 * Next.js 16 requires a second argument for revalidateTag. A named profile
 * (we used 'default') only marks the entry *stale*: the next visitor is still
 * served the old data while a refresh happens in the background. For a shop
 * that meant an admin saved a price or archived a product and the storefront
 * kept showing the old one. `{ expire: 0 }` drops the entry immediately.
 */

import { revalidateTag } from 'next/cache';

// ─── Cache Tag Constants ────────────────────────────────────────

export const CACHE_TAGS = {
  CATEGORIES: 'categories',
  PRODUCTS: 'products',
  SETTINGS: 'store-settings',
  BOUQUET: 'bouquet',

  category: (slug: string) => `category:${slug}`,
  product: (slug: string) => `product:${slug}`,
} as const;

const PROFILE = { expire: 0 } as const;

// ─── Invalidation Helpers ───────────────────────────────────────

export function invalidateCategories() {
  revalidateTag(CACHE_TAGS.CATEGORIES, PROFILE);
}

export function invalidateCategory(slug: string) {
  revalidateTag(CACHE_TAGS.category(slug), PROFILE);
  revalidateTag(CACHE_TAGS.CATEGORIES, PROFILE);
}

export function invalidateProducts() {
  revalidateTag(CACHE_TAGS.PRODUCTS, PROFILE);
}

export function invalidateProduct(slug: string) {
  revalidateTag(CACHE_TAGS.product(slug), PROFILE);
  revalidateTag(CACHE_TAGS.PRODUCTS, PROFILE);
}

export function invalidateSettings() {
  revalidateTag(CACHE_TAGS.SETTINGS, PROFILE);
}

export function invalidateBouquet() {
  revalidateTag(CACHE_TAGS.BOUQUET, PROFILE);
}

export function invalidateAll() {
  revalidateTag(CACHE_TAGS.CATEGORIES, PROFILE);
  revalidateTag(CACHE_TAGS.PRODUCTS, PROFILE);
  revalidateTag(CACHE_TAGS.SETTINGS, PROFILE);
  revalidateTag(CACHE_TAGS.BOUQUET, PROFILE);
}
