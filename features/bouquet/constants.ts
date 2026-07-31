/**
 * Bouquet enums shared by client and server.
 *
 * Deliberately free of any database import: client components need these, and
 * importing them from the Mongoose model pulls the whole driver into the
 * browser bundle (where Node built-ins like `dns` and `tls` do not resolve).
 */

export const BOUQUET_SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const;
export type BouquetSeason = (typeof BOUQUET_SEASONS)[number];

export const BOUQUET_STATUS = ['draft', 'active', 'archived'] as const;
export type BouquetStatus = (typeof BOUQUET_STATUS)[number];
