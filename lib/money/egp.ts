/**
 * Egyptian Pound (EGP) currency utilities.
 * All prices stored as piasters (1/100 EGP) to avoid floating-point issues.
 */

/**
 * Convert piasters to a formatted EGP string.
 * e.g. 2550 → "25.50 EGP"
 */
export function piastersToCurrency(piasters: number): string {
  const pounds = piasters / 100;
  return `${pounds.toFixed(2)} EGP`;
}

/**
 * Convert EGP pounds to piasters.
 * e.g. 25.50 → 2550
 */
export function poundsToPiasters(pounds: number): number {
  return Math.round(pounds * 100);
}

/**
 * Format piasters as a compact display string.
 * e.g. 2550 → "EGP 25.50"
 */
export function formatEGP(piasters: number): string {
  const pounds = piasters / 100;
  return new Intl.NumberFormat('en-EG', {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 2,
  }).format(pounds);
}
