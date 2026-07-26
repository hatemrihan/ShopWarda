/**
 * Catalog Zod validation schemas.
 * All mutation inputs pass through these before reaching the service layer.
 */

import { z } from 'zod';

// ─── Shared Sub-schemas ─────────────────────────────────────────

export const seoMetaSchema = z.object({
  title: z.string().max(70).optional(),
  description: z.string().max(160).optional(),
  keywords: z.array(z.string()).max(10).optional(),
});

export const optionValueSchema = z.object({
  name: z.string().min(1).max(50),
  value: z.string().min(1).max(100),
});

export const mediaItemSchema = z.object({
  assetKey: z.string().min(1),
  url: z.string().url(),
  alt: z.string().max(200).optional(),
  type: z.enum(['image', 'video']),
  isPrimary: z.boolean().default(false),
  sortOrder: z.number().int().min(0).default(0),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

// ─── Category Schemas ───────────────────────────────────────────

export const createCategorySchema = z.object({
  name: z.string().min(1).max(100).trim(),
  slug: z.string().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format').optional(),
  description: z.string().max(2000).optional(),
  parentId: z.string().optional(),
  imageUrl: z.string().url().optional(),
  imageAssetKey: z.string().optional(),
  displayOrder: z.number().int().min(0).default(0),
  seo: seoMetaSchema.optional(),
  status: z.enum(['active', 'hidden', 'archived']).default('active'),
});

export const updateCategorySchema = createCategorySchema.partial().extend({
  id: z.string().min(1),
});

// ─── Variant Schema ─────────────────────────────────────────────

export const variantBaseSchema = z.object({
  sku: z.string().min(1).max(50).trim(),
  optionValues: z.array(optionValueSchema).min(0),
  pricePiasters: z.number().int().min(0),
  compareAtPricePiasters: z.number().int().min(0).optional(),
  costPiasters: z.number().int().min(0).optional(),
  stock: z.number().int().min(0).default(0),
  lowStockThreshold: z.number().int().min(0).default(5),
  weight: z.number().min(0).optional(),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const variantSchema = variantBaseSchema.refine(
  (data) => {
    if (data.compareAtPricePiasters !== undefined) {
      return data.compareAtPricePiasters > data.pricePiasters;
    }
    return true;
  },
  { message: 'Compare-at price must exceed current price', path: ['compareAtPricePiasters'] }
);

// ─── Product Schemas ────────────────────────────────────────────

export const createProductSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  slug: z.string().min(1).max(220).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format').optional(),
  description: z.string().max(5000).optional(),
  shortDescription: z.string().max(500).optional(),
  type: z.enum(['simple', 'bundle']).default('simple'),
  categoryIds: z.array(z.string()).min(1, 'At least one category required'),
  options: z.array(z.object({
    name: z.string().min(1).max(50),
    values: z.array(z.string().min(1).max(100)).min(1),
  })).optional(),
  variants: z.array(variantSchema).min(1, 'At least one variant required'),
  media: z.array(mediaItemSchema).optional(),
  seo: seoMetaSchema.optional(),
  status: z.enum(['draft', 'active', 'archived']).default('draft'),
  // Bundle fields
  bundleItems: z.array(z.object({
    productId: z.string().min(1),
    variantId: z.string().optional(),
    quantity: z.number().int().min(1).default(1),
  })).optional(),
}).refine(
  (data) => {
    // Exactly one default variant
    const defaults = data.variants.filter((v) => v.isDefault);
    return defaults.length === 1;
  },
  { message: 'Exactly one variant must be marked as default', path: ['variants'] }
).refine(
  (data) => {
    // Bundle products must have bundleItems
    if (data.type === 'bundle') {
      return data.bundleItems && data.bundleItems.length > 0;
    }
    return true;
  },
  { message: 'Bundle products require at least one bundle item', path: ['bundleItems'] }
);

export const updateProductSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(200).trim().optional(),
  slug: z.string().min(1).max(220).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  description: z.string().max(5000).optional(),
  shortDescription: z.string().max(500).optional(),
  categoryIds: z.array(z.string()).min(1).optional(),
  options: z.array(z.object({
    name: z.string().min(1).max(50),
    values: z.array(z.string().min(1).max(100)).min(1),
  })).optional(),
  variants: z.array(variantSchema).min(1).optional(),
  media: z.array(mediaItemSchema).optional(),
  seo: seoMetaSchema.optional(),
  status: z.enum(['draft', 'active', 'archived']).optional(),
  bundleItems: z.array(z.object({
    productId: z.string().min(1),
    variantId: z.string().optional(),
    quantity: z.number().int().min(1).default(1),
  })).optional(),
});

// ─── Action Input Schemas ───────────────────────────────────────

export const reorderMediaSchema = z.object({
  productId: z.string().min(1),
  assetKeys: z.array(z.string().min(1)).min(1),
});

export const addVariantSchema = z.object({
  productId: z.string().min(1),
  variant: variantSchema,
});

export const updateVariantSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1),
  variant: variantBaseSchema.partial(),
});

export const deleteVariantSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1),
});

// ─── Type Exports ───────────────────────────────────────────────

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type VariantInput = z.infer<typeof variantSchema>;
export type MediaItemInput = z.infer<typeof mediaItemSchema>;
