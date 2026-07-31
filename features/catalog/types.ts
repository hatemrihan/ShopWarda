/**
 * Catalog DTOs — clean types for UI consumption (not raw Mongoose docs).
 */

import type { CreateCategoryInput, CreateProductInput, VariantInput, MediaItemInput } from './schemas';

// ─── Category DTOs ──────────────────────────────────────────────

export interface CategoryDTO {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  parentName?: string;
  imageUrl?: string;
  imageAssetKey?: string;
  displayOrder: number;
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
  status: 'active' | 'hidden' | 'archived';
  productCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryListItem {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string;
  parentName?: string;
  status: 'active' | 'hidden' | 'archived';
  displayOrder: number;
  productCount: number;
}

// ─── Product DTOs ───────────────────────────────────────────────

/** A selectable value. `key` is the stable identity; `label` is for display. */
export interface OptionValueDTO {
  key: string;
  label: string;
  swatchHex?: string;
}

export interface OptionDTO {
  key: string;
  label: string;
  values: OptionValueDTO[];
}

export interface VariantDTO {
  id: string;
  sku: string;
  /**
   * Keyed by option/value `key` — the same identity space as `OptionDTO`.
   * These used to be compared against option *labels*, which never matched for
   * any multi-word or capitalized value.
   */
  optionValues: { name: string; value: string }[];
  pricePiasters: number;
  compareAtPricePiasters?: number;
  costPiasters?: number;
  stock: number;
  lowStockThreshold: number;
  trackInventory: boolean;
  weight?: number;
  isDefault: boolean;
  isActive: boolean;
}

export interface MediaDTO {
  assetKey: string;
  url: string;
  alt?: string;
  type: 'image' | 'video';
  isPrimary: boolean;
  sortOrder: number;
  width?: number;
  height?: number;
}

export interface ProductDTO {
  id: string;
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  type: 'simple' | 'bundle';
  categoryIds: string[];
  categoryNames?: string[];
  options?: OptionDTO[];
  variants: VariantDTO[];
  media: MediaDTO[];
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
  pricePiasters: number;
  maxPricePiasters?: number;
  status: 'draft' | 'active' | 'archived';
  bundleItems?: {
    productId: string;
    productName?: string;
    variantId?: string;
    quantity: number;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductListItem {
  id: string;
  name: string;
  slug: string;
  primaryImageUrl?: string;
  categoryNames: string[];
  pricePiasters: number;
  maxPricePiasters?: number;
  totalStock: number;
  status: 'draft' | 'active' | 'archived';
  type: 'simple' | 'bundle';
}

// ─── Pagination ─────────────────────────────────────────────────

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Filters ────────────────────────────────────────────────────

export interface CategoryFilter {
  status?: 'active' | 'hidden' | 'archived';
  parentId?: string | null;
}

export interface ProductFilter {
  status?: 'draft' | 'active' | 'archived';
  categoryId?: string;
  search?: string;
  sortBy?: 'name' | 'price' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

// Re-export input types from schemas for convenience
export type { CreateCategoryInput, CreateProductInput, VariantInput, MediaItemInput };
