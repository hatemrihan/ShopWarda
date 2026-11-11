'use client';

/**
 * Global `next/image` loader (wired up in next.config.ts).
 *
 * Why this exists: the built-in optimizer runs on Vercel's metered Image
 * Optimization. Once the plan's monthly quota was used up, every uncached
 * `/_next/image` request answered `402 OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED`
 * and the storefront rendered with no category or product photos at all.
 *
 * Remote catalogue images now go through our own /api/img route (sharp +
 * long-lived CDN caching), which has no such quota. Files shipped in /public
 * are already small and are served as plain static assets.
 */
export default function imageLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  // Inline previews (e.g. the InstaPay receipt the buyer just picked).
  if (src.startsWith('data:') || src.startsWith('blob:')) return src;

  if (/^https?:\/\//i.test(src)) {
    return `/api/img?url=${encodeURIComponent(src)}&w=${width}&q=${quality ?? 75}`;
  }

  // Local static asset. The width is appended only so each srcset candidate
  // is a distinct URL; the file itself is served untouched.
  return `${src}${src.includes('?') ? '&' : '?'}w=${width}`;
}
