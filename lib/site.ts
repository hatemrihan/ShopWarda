/**
 * Canonical public origin of the storefront.
 *
 * `NEXT_PUBLIC_VERCEL_URL` (what this used to read) is the per-deployment
 * *.vercel.app hostname, so the sitemap, robots.txt and Open Graph tags all
 * pointed search engines and link previews away from the real domain.
 *
 * Resolution order:
 *   1. NEXT_PUBLIC_SITE_URL            — explicit override
 *   2. VERCEL_PROJECT_PRODUCTION_URL   — the production domain, set by Vercel
 *   3. NEXT_PUBLIC_VERCEL_URL          — preview deployments
 *   4. http://localhost:3000           — local development
 */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, '');

  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (production) return `https://${production}`;

  const preview = process.env.NEXT_PUBLIC_VERCEL_URL?.trim();
  if (preview) return `https://${preview}`;

  return 'http://localhost:3000';
}
