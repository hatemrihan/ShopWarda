/**
 * The only widths the image pipeline will ever produce.
 *
 * Shared by next.config.ts (which builds every `srcset` from these) and the
 * /api/img route (which refuses anything else). Keeping the list short and
 * closed means an attacker cannot mint unlimited resize variants, and each
 * source image is transformed at most a handful of times before the CDN
 * serves it forever.
 */
export const DEVICE_SIZES = [640, 828, 1200, 1920] as const;
export const IMAGE_SIZES = [64, 128, 256, 384] as const;

export const ALLOWED_WIDTHS: readonly number[] = [...IMAGE_SIZES, ...DEVICE_SIZES];

/** Snap a requested width up to the nearest width we actually serve. */
export function snapWidth(requested: number): number {
  for (const w of ALLOWED_WIDTHS) {
    if (w >= requested) return w;
  }
  return ALLOWED_WIDTHS[ALLOWED_WIDTHS.length - 1];
}
