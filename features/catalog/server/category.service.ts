/**
 * Category Service — business logic layer.
 * Validates inputs, enforces invariants, delegates to repository.
 */

import { categoryRepository } from './category.repository';
import type { ICategory } from '@/lib/db/models/category.model';
import { createCategorySchema, updateCategorySchema, type CreateCategoryInput, type UpdateCategoryInput } from '../schemas';
import type { CategoryDTO, CategoryListItem, CategoryFilter } from '../types';
import { ValidationError, NotFoundError } from '@/lib/errors';
import { invalidateCategory, invalidateCategories, CACHE_TAGS } from '@/lib/cache';
import { unstable_cache } from 'next/cache';

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

  while (await categoryRepository.isSlugTaken(candidate, excludeId)) {
    attempt++;
    candidate = `${slug}-${attempt}`;
  }

  return candidate;
}

// ─── Service ────────────────────────────────────────────────────

const CATALOG_REVALIDATE_SECONDS = 300;

export const categoryService = {
  async list(filter: CategoryFilter = {}): Promise<CategoryListItem[]> {
    return categoryRepository.findAll(filter);
  },

  /** Cached variant of `list` for storefront pages. */
  async listCached(filter: CategoryFilter = {}): Promise<CategoryListItem[]> {
    const cached = unstable_cache(
      () => categoryRepository.findAll(filter),
      ['category-list', JSON.stringify(filter)],
      { tags: [CACHE_TAGS.CATEGORIES], revalidate: CATALOG_REVALIDATE_SECONDS },
    );
    return cached();
  },

  async getById(id: string): Promise<CategoryDTO> {
    const category = await categoryRepository.findById(id);
    if (!category) throw new NotFoundError('Category', id);
    return category;
  },

  /**
   * Cached storefront lookup. Misses (and old-slug redirects) are not cached,
   * mirroring productService.getBySlug.
   */
  async getBySlugCached(slug: string): Promise<CategoryDTO> {
    const cached = unstable_cache(
      () => categoryRepository.findBySlug(slug),
      ['category-by-slug', slug],
      {
        tags: [CACHE_TAGS.CATEGORIES, CACHE_TAGS.category(slug)],
        revalidate: CATALOG_REVALIDATE_SECONDS,
      },
    );
    const category = await cached();
    if (category) return category;
    return this.getBySlug(slug);
  },

  async getBySlug(slug: string): Promise<CategoryDTO> {
    const category = await categoryRepository.findBySlug(slug);
    if (category) return category;

    // Check previous slugs for redirect
    const newSlug = await categoryRepository.findByPreviousSlug(slug);
    if (newSlug) {
      // The caller should handle this as a redirect
      throw Object.assign(new NotFoundError('Category', slug), { redirectSlug: newSlug });
    }

    throw new NotFoundError('Category', slug);
  },

  async create(input: CreateCategoryInput): Promise<CategoryDTO> {
    // Validate
    const parsed = createCategorySchema.safeParse(input);
    if (!parsed.success) {
      const details: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path.join('.');
        details[path] = details[path] ?? [];
        details[path].push(issue.message);
      }
      throw new ValidationError('Invalid category data', details);
    }

    const data = parsed.data;

    // Generate slug
    const rawSlug = data.slug || generateSlug(data.name);
    const slug = await ensureUniqueSlug(rawSlug);

    // Cycle check if parentId provided
    if (data.parentId) {
      const parentExists = await categoryRepository.findById(data.parentId);
      if (!parentExists) {
        throw new ValidationError('Parent category not found', { parentId: ['Category does not exist'] });
      }
    }

    const category = await categoryRepository.create({
      name: data.name,
      slug,
      description: data.description,
      parentId: data.parentId ?? undefined,
      image: data.imageUrl ? {
        assetKey: data.imageAssetKey || data.imageUrl.split('/').slice(-2).join('/'),
        publicUrl: data.imageUrl,
        alt: data.name,
        width: 0,
        height: 0,
      } : undefined,
      sortOrder: data.displayOrder,
      seo: data.seo ? {
        title: data.seo.title,
        description: data.seo.description,
      } : undefined,
      status: data.status,
    } as Partial<ICategory>);

    invalidateCategories();
    return category;
  },

  async update(input: UpdateCategoryInput): Promise<CategoryDTO> {
    const parsed = updateCategorySchema.safeParse(input);
    if (!parsed.success) {
      const details: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path.join('.');
        details[path] = details[path] ?? [];
        details[path].push(issue.message);
      }
      throw new ValidationError('Invalid category data', details);
    }

    const data = parsed.data;
    const existing = await categoryRepository.findById(data.id);
    if (!existing) throw new NotFoundError('Category', data.id);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {};

    // Handle slug change
    if (data.slug && data.slug !== existing.slug) {
      const newSlug = await ensureUniqueSlug(data.slug, data.id);
      updateData.slug = newSlug;
      updateData.$push = { previousSlugs: existing.slug };
    } else if (data.name && data.name !== existing.name && !data.slug) {
      // Auto-generate new slug from name
      const rawSlug = generateSlug(data.name);
      if (rawSlug !== existing.slug) {
        const newSlug = await ensureUniqueSlug(rawSlug, data.id);
        updateData.slug = newSlug;
        updateData.$push = { previousSlugs: existing.slug };
      }
    }

    // Cycle check
    if (data.parentId && data.parentId !== existing.parentId) {
      const isCyclic = await categoryRepository.checkCyclicParent(data.id, data.parentId);
      if (isCyclic) {
        throw new ValidationError('Circular parent reference detected', {
          parentId: ['Setting this parent would create a cycle'],
        });
      }
    }

    // Map fields
    if (data.name) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.parentId !== undefined) updateData.parentId = data.parentId || null;
    if (data.displayOrder !== undefined) updateData.sortOrder = data.displayOrder;
    if (data.status) updateData.status = data.status;
    if (data.imageUrl !== undefined) {
      updateData.image = data.imageUrl ? {
        assetKey: data.imageAssetKey || data.imageUrl.split('/').slice(-2).join('/'),
        publicUrl: data.imageUrl,
        alt: data.name ?? existing.name,
        width: 0,
        height: 0,
      } : null;
    }
    if (data.seo) {
      updateData.seo = {
        title: data.seo.title,
        description: data.seo.description,
      };
    }

    const updated = await categoryRepository.update(data.id, updateData);
    if (!updated) throw new NotFoundError('Category', data.id);

    invalidateCategory(updated.slug);
    return updated;
  },

  async archive(id: string): Promise<void> {
    const existing = await categoryRepository.findById(id);
    if (!existing) throw new NotFoundError('Category', id);

    await categoryRepository.archive(id);
    invalidateCategory(existing.slug);
  },

  async getForSelect() {
    return categoryRepository.findForSelect();
  },
};
