/**
 * Bouquet builder Zod schemas — admin CRUD and the guest submission.
 */

import { z } from 'zod';
import { BOUQUET_SEASONS, BOUQUET_STATUS } from '@/lib/db/models/bouquet.model';

const hexColor = z
  .string()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Must be a hex colour like #D0D48D');

export const flowerColorSchema = z.object({
  key: z.string().min(1).max(50).trim(),
  label: z.string().min(1).max(80).trim(),
  swatchHex: hexColor,
  imageUrl: z.string().url().optional().or(z.literal('')),
  available: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
});

export const mediaSchema = z.object({
  assetKey: z.string(),
  publicUrl: z.string(),
  // Widths/heights default to 0 rather than being optional: IProductMedia
  // requires them, and the uploader does not always report dimensions.
  alt: z.string().default(''),
  type: z.enum(['image', 'video']).default('image'),
  width: z.number().default(0),
  height: z.number().default(0),
  sortOrder: z.number().int().default(0),
});

export const flowerInputSchema = z.object({
  name: z.string().min(1).max(120).trim(),
  nameAr: z.string().max(120).trim().optional(),
  slug: z.string().min(1).max(140).trim().optional(),
  pricePerStemMinor: z.number().int().min(0),
  colors: z.array(flowerColorSchema).default([]),
  seasons: z.array(z.enum(BOUQUET_SEASONS)).default([]),
  available: z.boolean().default(true),
  media: z.array(mediaSchema).default([]),
  sortOrder: z.number().int().min(0).default(0),
  status: z.enum(BOUQUET_STATUS).default('draft'),
});

export const wrapInputSchema = z.object({
  name: z.string().min(1).max(120).trim(),
  nameAr: z.string().max(120).trim().optional(),
  material: z.string().min(1).max(80).trim().default('paper'),
  priceMinor: z.number().int().min(0).default(0),
  imageUrl: z.string().url().optional().or(z.literal('')),
  swatchHex: hexColor.optional().or(z.literal('')),
  available: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
  status: z.enum(BOUQUET_STATUS).default('draft'),
});

export const bouquetSettingsSchema = z.object({
  enabled: z.boolean(),
  minStems: z.number().int().min(1).max(500),
  maxStems: z.number().int().min(1).max(500),
  basePriceMinor: z.number().int().min(0),
  card: z.object({
    enabled: z.boolean(),
    priceMinor: z.number().int().min(0),
    maxLength: z.number().int().min(1).max(2000),
  }),
}).refine((v) => v.maxStems >= v.minStems, {
  message: 'Maximum stems must be at least the minimum',
  path: ['maxStems'],
});

// ─── Guest submission ───────────────────────────────────────────

/**
 * What the storefront sends. Note there are no prices here: the server reads
 * every price from the database, so a tampered payload cannot set its own.
 */
export const bouquetConfigSchema = z.object({
  flowers: z
    .array(
      z.object({
        flowerId: z.string().min(1),
        colorKey: z.string().max(50).default(''),
        qty: z.number().int().min(1).max(500),
      })
    )
    .min(1, 'Choose at least one flower'),
  wrapId: z.string().min(1, 'Choose a wrapping'),
  cardMessage: z.string().max(2000).optional(),
});

export type FlowerInput = z.infer<typeof flowerInputSchema>;
export type WrapInput = z.infer<typeof wrapInputSchema>;
export type BouquetSettingsInput = z.infer<typeof bouquetSettingsSchema>;
export type BouquetConfig = z.infer<typeof bouquetConfigSchema>;
