/**
 * Bouquet builder DTOs — what crosses the server/client boundary.
 * Money is integer piasters, like everywhere else on the server.
 */

import type { BouquetSeason, BouquetStatus } from '@/lib/db/models/bouquet.model';

export interface FlowerColorDTO {
  key: string;
  label: string;
  swatchHex: string;
  imageUrl?: string;
  available: boolean;
  sortOrder: number;
}

export interface FlowerDTO {
  id: string;
  name: string;
  nameAr?: string;
  slug: string;
  pricePerStemMinor: number;
  colors: FlowerColorDTO[];
  seasons: BouquetSeason[];
  available: boolean;
  media: { publicUrl: string; alt?: string }[];
  imageUrl?: string;
  sortOrder: number;
  status: BouquetStatus;
  /** Derived: master toggle AND in season AND at least one available colour. */
  inSeason: boolean;
  selectable: boolean;
}

export interface WrapDTO {
  id: string;
  name: string;
  nameAr?: string;
  material: string;
  priceMinor: number;
  imageUrl?: string;
  swatchHex?: string;
  available: boolean;
  sortOrder: number;
  status: BouquetStatus;
}

export interface BouquetSettingsDTO {
  enabled: boolean;
  minStems: number;
  maxStems: number;
  basePriceMinor: number;
  card: { enabled: boolean; priceMinor: number; maxLength: number };
}

export interface BouquetCatalogDTO {
  flowers: FlowerDTO[];
  wraps: WrapDTO[];
  settings: BouquetSettingsDTO;
}

/** Result of server-side pricing — the only prices ever trusted. */
export interface PricedBouquet {
  flowers: {
    flowerId: string;
    name: string;
    colorKey: string;
    colorLabel: string;
    qty: number;
    perStemMinor: number;
    lineMinor: number;
  }[];
  wrap: { wrapId: string; name: string; material: string; priceMinor: number };
  cardMessage?: string;
  cardPriceMinor: number;
  basePriceMinor: number;
  stemCount: number;
  totalMinor: number;
  /** Human-readable lines for order snapshots, admin tables and emails. */
  summaryLines: { label: string; value: string }[];
}
