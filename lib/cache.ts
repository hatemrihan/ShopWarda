/**
 * Cache tags and invalidation helpers.
 * Used with Next.js revalidateTag.
 *
 * Next.js 16 requires a second `profile` argument for revalidateTag.
 * We use 'default' for standard invalidation.
 */

import { revalidateTag } from 'next/cache';

// ─── Cache Tag Constants ────────────────────────────────────────

export const CACHE_TAGS = {
  CATEGORIES: 'categories',
  PRODUCTS: 'products',
  SETTINGS: 'store-settings',

  category: (slug: string) => `category:${slug}`,
  product: (slug: string) => `product:${slug}`,
} as const;

const PROFILE = 'default';

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

export function invalidateAll() {
  revalidateTag(CACHE_TAGS.CATEGORIES, PROFILE);
  revalidateTag(CACHE_TAGS.PRODUCTS, PROFILE);
  revalidateTag(CACHE_TAGS.SETTINGS, PROFILE);
}
