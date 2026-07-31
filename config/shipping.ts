/**
 * Shipping configuration — flat rate per governorate.
 * Stored in code for now; will move to StoreSettings once admin UI is built.
 */

export interface ShippingRate {
  governorate: string;
  feeMinor: number; // piasters
  estimatedDays: number;
  enabled: boolean;
}

export const EGYPT_GOVERNORATES: ShippingRate[] = [
  { governorate: 'Cairo', feeMinor: 5000, estimatedDays: 1, enabled: true },
  { governorate: 'Giza', feeMinor: 5000, estimatedDays: 1, enabled: true },
  { governorate: 'Alexandria', feeMinor: 6000, estimatedDays: 2, enabled: true },
  { governorate: 'Qalyubia', feeMinor: 5500, estimatedDays: 2, enabled: true },
  { governorate: 'Dakahlia', feeMinor: 6000, estimatedDays: 3, enabled: true },
  { governorate: 'Sharqia', feeMinor: 6000, estimatedDays: 3, enabled: true },
  { governorate: 'Gharbia', feeMinor: 6000, estimatedDays: 3, enabled: true },
  { governorate: 'Menoufia', feeMinor: 6000, estimatedDays: 3, enabled: true },
  { governorate: 'Beheira', feeMinor: 6500, estimatedDays: 3, enabled: true },
  { governorate: 'Kafr El Sheikh', feeMinor: 6500, estimatedDays: 3, enabled: true },
  { governorate: 'Damietta', feeMinor: 6500, estimatedDays: 3, enabled: true },
  { governorate: 'Port Said', feeMinor: 6500, estimatedDays: 3, enabled: true },
  { governorate: 'Ismailia', feeMinor: 6000, estimatedDays: 2, enabled: true },
  { governorate: 'Suez', feeMinor: 6000, estimatedDays: 2, enabled: true },
  { governorate: 'Fayoum', feeMinor: 6500, estimatedDays: 3, enabled: true },
  { governorate: 'Beni Suef', feeMinor: 7000, estimatedDays: 3, enabled: true },
  { governorate: 'Minya', feeMinor: 7000, estimatedDays: 4, enabled: true },
  { governorate: 'Asyut', feeMinor: 7500, estimatedDays: 4, enabled: true },
  { governorate: 'Sohag', feeMinor: 7500, estimatedDays: 4, enabled: true },
  { governorate: 'Qena', feeMinor: 8000, estimatedDays: 5, enabled: true },
  { governorate: 'Luxor', feeMinor: 8000, estimatedDays: 5, enabled: true },
  { governorate: 'Aswan', feeMinor: 8500, estimatedDays: 5, enabled: true },
  { governorate: 'Red Sea', feeMinor: 8000, estimatedDays: 5, enabled: true },
  { governorate: 'North Sinai', feeMinor: 8500, estimatedDays: 5, enabled: true },
  { governorate: 'South Sinai', feeMinor: 8500, estimatedDays: 5, enabled: true },
  { governorate: 'Matrouh', feeMinor: 9000, estimatedDays: 5, enabled: true },
  { governorate: 'New Valley', feeMinor: 9000, estimatedDays: 6, enabled: true },
];

/**
 * Shipping fees are configured per-governorate in store settings and read from
 * the database at checkout (see features/checkout/server/order.service.ts).
 * The hardcoded feeMinor/estimatedDays above remain only as seed defaults for
 * the governorate list; do not price orders from them.
 */
export function getEnabledGovernorates(): string[] {
  return EGYPT_GOVERNORATES.filter((z) => z.enabled).map((z) => z.governorate);
}
