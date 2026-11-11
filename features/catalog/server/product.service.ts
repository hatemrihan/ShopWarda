/**
 * Product Service — business logic layer.
 * Enforces all product invariants before delegating to repository.
 */

import { productRepository } from './product.repository';
import type { IProduct } from '@/lib/db/models/product.model';
import {
  createProductSchema,
  updateProductSchema,
  type CreateProductInput,
  type UpdateProductInput,
} from '../schemas';
import type { ProductDTO, ProductListItem, ProductFilter, PaginationParams, PaginatedResult } from '../types';
import { ValidationError, NotFoundError } from '@/lib/errors';
import { invalidateProduct, invalidateProducts } from '@/lib/cache';
import { unstable_cache } from 'next/cache';
import { CACHE_TAGS } from '@/lib/cache';
import { categoryRepository } from './category.repository';

// ─── Slug generation ────────────────────────────────────────────

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function ensureUniqueSlug(slug: string, excludeId?: string): Promise<string> {
  let candidate = slug;
  let attempt = 0;

  while (await productRepository.isSlugTaken(candidate, excludeId)) {
    attempt++;
    candidate = `${slug}-${attempt}`;
  }

  return candidate;
}

// ─── Invariant Checks ───────────────────────────────────────────

/**
 * Invariant #1: No two variants share identical optionValues.
 */
function checkVariantUniqueness(variants: CreateProductInput['variants']) {
  const signatures = new Set<string>();

  for (const v of variants) {
    const sig = v.optionValues
      .map((ov) => `${ov.name}:${ov.value}`)
      .sort()
      .join('|');

    if (signatures.has(sig)) {
      throw new ValidationError('Duplicate variant option combination', {
        variants: [`Two variants have identical options: ${sig || '(no options)'}`],
      });
    }
    signatures.add(sig);
  }
}

/**
 * Validate categories exist and are active.
 */
async function validateCategoryIds(categoryIds: string[]): Promise<void> {
  // One query for all of them (was a sequential lookup per category).
  const usable = await categoryRepository.countUsable(categoryIds);
  if (usable !== new Set(categoryIds).size) {
    throw new ValidationError('One or more categories no longer exist or are archived', {
      categoryIds: ['One or more categories are invalid'],
    });
  }
}

/** Order-independent identity of a variant's option combination. */
function optionSignature(optionValues: { name: string; value: string }[]): string {
  return optionValues
    .map((ov) => `${slugKey(ov.name)}:${slugKey(ov.value)}`)
    .sort()
    .join('|');
}

function slugKey(value: string): string {
  return value.toLowerCase().replace(/\s+/g, '-');
}

// ─── Service ────────────────────────────────────────────────────

/**
 * Storefront reads are tag-cached. The admin services already call the
 * lib/cache invalidation helpers on every mutation, but nothing was cached, so
 * revalidateTag had nothing to invalidate and every page view hit MongoDB.
 *
 * A bounded revalidate window backs up the tags: order placement changes stock
 * without going through the admin mutation path.
 */
const CATALOG_REVALIDATE_SECONDS = 300;

export const productService = {
  async list(
    filter: ProductFilter = {},
    pagination?: PaginationParams
  ): Promise<PaginatedResult<ProductListItem>> {
    return productRepository.findAll(filter, pagination);
  },

  /** Cached variant of `list` for storefront pages. */
  async listCached(
    filter: ProductFilter = {},
    pagination?: PaginationParams
  ): Promise<PaginatedResult<ProductListItem>> {
    const cached = unstable_cache(
      () => productRepository.findAll(filter, pagination),
      ['product-list', JSON.stringify(filter), JSON.stringify(pagination ?? {})],
      { tags: [CACHE_TAGS.PRODUCTS], revalidate: CATALOG_REVALIDATE_SECONDS },
    );
    return cached();
  },

  /** Cached product detail lookup. Returns null rather than throwing so the
   *  not-found and previous-slug redirect paths stay uncached. */
  async findBySlugCached(slug: string): Promise<ProductDTO | null> {
    const cached = unstable_cache(
      () => productRepository.findBySlug(slug),
      ['product-by-slug', slug],
      {
        tags: [CACHE_TAGS.PRODUCTS, CACHE_TAGS.product(slug)],
        revalidate: CATALOG_REVALIDATE_SECONDS,
      },
    );
    return cached();
  },

  async getById(id: string): Promise<ProductDTO> {
    const product = await productRepository.findById(id);
    if (!product) throw new NotFoundError('Product', id);
    return product;
  },

  async getBySlug(slug: string): Promise<ProductDTO> {
    const product = await this.findBySlugCached(slug);
    if (product) return product;

    // Old slug, or a link that only knew the product's id (bags saved before
    // slugs were stored link this way).
    const newSlug =
      (await productRepository.findByPreviousSlug(slug)) ??
      (await productRepository.findSlugById(slug));
    if (newSlug && newSlug !== slug) {
      throw Object.assign(new NotFoundError('Product', slug), { redirectSlug: newSlug });
    }

    throw new NotFoundError('Product', slug);
  },

  /** A few other active products for the "more from this collection" strip. */
  async listRelatedCached(productId: string, categoryIds: string[], limit = 4): Promise<ProductListItem[]> {
    const cached = unstable_cache(
      async () => {
        const pick = async (filter: ProductFilter) =>
          (
            await productRepository.findAll(
              { status: 'active', sortBy: 'createdAt', sortOrder: 'desc', ...filter },
              { page: 1, pageSize: limit + 1 },
            )
          ).items.filter((item) => item.id !== productId);

        // Same categories first; top up from the rest of the shop.
        const related = categoryIds.length ? await pick({ categoryIds }) : [];
        if (related.length < limit) {
          const seen = new Set(related.map((r) => r.id));
          for (const item of await pick({})) {
            if (related.length >= limit) break;
            if (!seen.has(item.id)) related.push(item);
          }
        }
        return related.slice(0, limit);
      },
      ['product-related', productId, categoryIds.join(','), String(limit)],
      { tags: [CACHE_TAGS.PRODUCTS], revalidate: CATALOG_REVALIDATE_SECONDS },
    );
    return cached();
  },

  async create(input: CreateProductInput): Promise<ProductDTO> {
    const parsed = createProductSchema.safeParse(input);
    if (!parsed.success) {
      const details: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path.join('.');
        details[path] = details[path] ?? [];
        details[path].push(issue.message);
      }
      throw new ValidationError('Invalid product data', details);
    }

    const data = parsed.data;

    // Validate categories
    await validateCategoryIds(data.categoryIds);

    // Invariant #1: variant uniqueness
    checkVariantUniqueness(data.variants);

    // Generate slug
    const rawSlug = data.slug || generateSlug(data.name);
    const slug = await ensureUniqueSlug(rawSlug);

    // Map to Mongoose schema shape
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const productData: Record<string, any> = {
      name: data.name,
      slug,
      description: data.description,
      shortDescription: data.shortDescription,
      type: data.type,
      categoryIds: data.categoryIds,
      primaryCategoryId: data.categoryIds[0],
      status: data.status,
      options: data.options?.map((o, i) => ({
        key: o.name.toLowerCase().replace(/\s+/g, '-'),
        label: o.name,
        sortOrder: i,
        values: o.values.map((v, vi) => ({
          key: v.label.toLowerCase().replace(/\s+/g, '-'),
          label: v.label,
          // Drives the real colour swatches on the PDP.
          swatchHex: v.swatchHex,
          sortOrder: vi,
        })),
      })) ?? [],
      variants: data.variants.map((v) => ({
        sku: v.sku,
        optionValues: v.optionValues.map((ov) => ({
          optionKey: ov.name.toLowerCase().replace(/\s+/g, '-'),
          valueKey: ov.value.toLowerCase().replace(/\s+/g, '-'),
        })),
        priceMinor: v.pricePiasters,
        compareAtPriceMinor: v.compareAtPricePiasters,
        costPriceMinor: v.costPiasters,
        stock: v.stock,
        lowStockThreshold: v.lowStockThreshold,
        trackInventory: v.trackInventory,
        weightGrams: v.weight,
        status: v.isActive ? 'active' : 'disabled',
      })),
      media: data.media?.map((m, i) => ({
        assetKey: m.assetKey,
        publicUrl: m.url,
        alt: m.alt ?? '',
        width: m.width ?? 0,
        height: m.height ?? 0,
        sortOrder: i,
        type: m.type,
      })) ?? [],
      bundleItems: data.bundleItems ?? [],
      seo: data.seo ? {
        title: data.seo.title,
        description: data.seo.description,
      } : undefined,
    };

    const product = await productRepository.create(productData as Partial<IProduct>);

    invalidateProducts();
    return product;
  },

  async update(input: UpdateProductInput): Promise<ProductDTO> {
    const parsed = updateProductSchema.safeParse(input);
    if (!parsed.success) {
      const details: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path.join('.');
        details[path] = details[path] ?? [];
        details[path].push(issue.message);
      }
      throw new ValidationError('Invalid product data', details);
    }

    const data = parsed.data;
    const existing = await productRepository.findById(data.id);
    if (!existing) throw new NotFoundError('Product', data.id);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {};

    // Handle slug change
    if (data.slug && data.slug !== existing.slug) {
      const newSlug = await ensureUniqueSlug(data.slug, data.id);
      updateData.slug = newSlug;
      updateData.$push = { previousSlugs: existing.slug };
    } else if (data.name && data.name !== existing.name && !data.slug) {
      const rawSlug = generateSlug(data.name);
      if (rawSlug !== existing.slug) {
        const newSlug = await ensureUniqueSlug(rawSlug, data.id);
        updateData.slug = newSlug;
        updateData.$push = { previousSlugs: existing.slug };
      }
    }

    // Validate categories
    if (data.categoryIds) {
      await validateCategoryIds(data.categoryIds);
      updateData.categoryIds = data.categoryIds;
      updateData.primaryCategoryId = data.categoryIds[0];
    }

    // Variant uniqueness check
    if (data.variants) {
      checkVariantUniqueness(data.variants);

      // Keep each surviving variant's id. The array used to be replaced with
      // brand-new subdocuments on every save, so merely editing a product's
      // description gave all of its variants new ids — orphaning every bag
      // that held one and every order that referenced one.
      const bySku = new Map(existing.variants.map((v) => [v.sku, v.id]));
      const bySignature = new Map(
        existing.variants.map((v) => [optionSignature(v.optionValues), v.id]),
      );
      const claimed = new Set<string>();
      const carriedId = (v: (typeof data.variants)[number]): string | undefined => {
        const id = bySku.get(v.sku) ?? bySignature.get(optionSignature(v.optionValues));
        if (!id || claimed.has(id)) return undefined;
        claimed.add(id);
        return id;
      };

      updateData.variants = data.variants.map((v) => ({
        _id: carriedId(v),
        sku: v.sku,
        optionValues: v.optionValues.map((ov) => ({
          optionKey: ov.name.toLowerCase().replace(/\s+/g, '-'),
          valueKey: ov.value.toLowerCase().replace(/\s+/g, '-'),
        })),
        priceMinor: v.pricePiasters,
        compareAtPriceMinor: v.compareAtPricePiasters,
        costPriceMinor: v.costPiasters,
        stock: v.stock,
        lowStockThreshold: v.lowStockThreshold,
        trackInventory: v.trackInventory,
        weightGrams: v.weight,
        status: v.isActive ? 'active' : 'disabled',
      }));
    }

    if (data.name) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.shortDescription !== undefined) updateData.shortDescription = data.shortDescription;
    if (data.options) {
      updateData.options = data.options.map((o, i) => ({
        key: o.name.toLowerCase().replace(/\s+/g, '-'),
        label: o.name,
        sortOrder: i,
        values: o.values.map((v, vi) => ({
          key: v.label.toLowerCase().replace(/\s+/g, '-'),
          label: v.label,
          swatchHex: v.swatchHex,
          sortOrder: vi,
        })),
      }));
    }
    if (data.media) {
      updateData.media = data.media.map((m, i) => ({
        assetKey: m.assetKey,
        publicUrl: m.url,
        alt: m.alt ?? '',
        width: m.width ?? 0,
        height: m.height ?? 0,
        sortOrder: i,
        type: m.type,
      }));
    }
    if (data.status) updateData.status = data.status;
    if (data.seo) updateData.seo = data.seo;
    if (data.bundleItems) updateData.bundleItems = data.bundleItems;

    const updated = await productRepository.update(data.id, updateData);
    if (!updated) throw new NotFoundError('Product', data.id);

    invalidateProduct(updated.slug);
    return updated;
  },

  async archive(id: string): Promise<void> {
    const existing = await productRepository.findById(id);
    if (!existing) throw new NotFoundError('Product', id);

    await productRepository.archive(id);
    invalidateProduct(existing.slug);
  },

  async getByCategory(categoryId: string, pagination?: PaginationParams) {
    return productRepository.findByCategory(categoryId, pagination);
  },

  async getDashboardStats() {
    return productRepository.getCounts();
  },
};
