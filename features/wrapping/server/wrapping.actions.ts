'use server';

/**
 * Wrapping paper admin actions.
 *
 * Wrapping papers are ordinary catalogue products living in a dedicated
 * "Wrapping Paper" category, so everything downstream — shop page, product
 * page, cart, orders, emails — works with no special cases. What this module
 * adds is a *simple* way to manage them: a sheet of paper has no options and
 * no variant matrix, so the full product form is the wrong tool.
 *
 * The category is created on demand; the admin never has to set it up.
 */

import { requireAdmin } from '@/lib/auth/require-admin';
import { ValidationError, handleError } from '@/lib/errors';
import logger from '@/lib/logger';
import connectDB from '@/lib/db/mongoose';
import { Category } from '@/lib/db/models/category.model';
import { Product } from '@/lib/db/models/product.model';
import { productService } from '@/features/catalog/server/product.service';
import { invalidateProducts, invalidateCategories } from '@/lib/cache';
import type { WrappingPaperDTO, WrappingPaperInput } from '../types';

import {
  WRAPPING_CATEGORY_SLUG,
  WRAPPING_CATEGORY_NAME,
  WRAPPING_CATEGORY_DESCRIPTION,
} from '../constants';

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; details?: Record<string, string[]> };

function fail(error: unknown, context: string): ActionResult<never> {
  const appError = handleError(error);
  logger.error(`${context} failed`, { error: appError.message });
  return {
    success: false,
    error: appError.message,
    details: appError instanceof ValidationError ? appError.details : undefined,
  };
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Get the Wrapping Paper category, creating it the first time it is needed. */
async function ensureCategoryId(): Promise<string> {
  await connectDB();

  const existing = await Category.findOne({ slug: WRAPPING_CATEGORY_SLUG });
  if (existing) return existing._id.toString();

  const created = await Category.create({
    name: WRAPPING_CATEGORY_NAME,
    slug: WRAPPING_CATEGORY_SLUG,
    description: WRAPPING_CATEGORY_DESCRIPTION,
    status: 'active',
    sortOrder: 10,
  });

  logger.info('Created Wrapping Paper category', { id: created._id.toString() });
  invalidateCategories();
  return created._id.toString();
}

function validate(input: WrappingPaperInput): void {
  const details: Record<string, string[]> = {};

  if (!input.name?.trim()) details.name = ['Name is required'];
  if (!Number.isFinite(input.priceMinor) || input.priceMinor < 0) {
    details.priceMinor = ['Price must be zero or more'];
  }
  if (!Number.isInteger(input.priceMinor)) {
    details.priceMinor = [...(details.priceMinor ?? []), 'Price must be whole piasters'];
  }
  if (!Number.isFinite(input.stock) || input.stock < 0) {
    details.stock = ['Stock must be zero or more'];
  }

  if (Object.keys(details).length > 0) {
    throw new ValidationError('Please correct the highlighted fields', details);
  }
}

/** List every product in the wrapping paper category, drafts included. */
export async function listWrappingPapersAction(): Promise<ActionResult<WrappingPaperDTO[]>> {
  try {
    await requireAdmin();
    await connectDB();

    const category = await Category.findOne({ slug: WRAPPING_CATEGORY_SLUG });
    if (!category) return { success: true, data: [] };

    const products = await Product.find({ categoryIds: category._id })
      .sort({ createdAt: -1 })
      .lean();

    const papers: WrappingPaperDTO[] = products.map((p) => {
      const variant = p.variants?.[0];
      return {
        id: p._id.toString(),
        name: p.name,
        slug: p.slug,
        description: p.description ?? '',
        priceMinor: variant?.priceMinor ?? 0,
        stock: variant?.stock ?? 0,
        trackInventory: variant?.trackInventory ?? false,
        status: p.status as WrappingPaperDTO['status'],
        imageUrl: p.media?.find((m) => m.type === 'image')?.publicUrl,
        media: (p.media ?? []).map((m) => ({
          assetKey: m.assetKey,
          url: m.publicUrl,
          alt: m.alt ?? '',
          type: (m.type ?? 'image') as 'image' | 'video',
          width: m.width,
          height: m.height,
        })),
      };
    });

    return { success: true, data: papers };
  } catch (error) {
    return fail(error, 'listWrappingPapersAction');
  }
}

export async function createWrappingPaperAction(
  input: WrappingPaperInput
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdmin();
    validate(input);

    const categoryId = await ensureCategoryId();
    const name = input.name.trim();
    const slug = slugify(name);

    // One default variant, no options — a sheet of paper has no matrix.
    const product = await productService.create({
      name,
      slug,
      description: input.description?.trim() || undefined,
      type: 'simple',
      categoryIds: [categoryId],
      status: input.status,
      options: undefined,
      variants: [
        {
          sku: `WRAP-${slug.toUpperCase()}`.slice(0, 50),
          optionValues: [],
          pricePiasters: input.priceMinor,
          stock: input.stock,
          lowStockThreshold: 5,
          isDefault: true,
          isActive: true,
          trackInventory: input.trackInventory,
        },
      ],
      media: input.media.map((m, i) => ({
        assetKey: m.assetKey,
        url: m.url,
        alt: m.alt || name,
        type: m.type,
        isPrimary: i === 0,
        sortOrder: i,
        width: m.width,
        height: m.height,
      })),
    });

    invalidateProducts();
    return { success: true, data: { id: product.id } };
  } catch (error) {
    return fail(error, 'createWrappingPaperAction');
  }
}

export async function updateWrappingPaperAction(
  id: string,
  input: WrappingPaperInput
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdmin();
    validate(input);

    await connectDB();
    const existing = await Product.findById(id);
    if (!existing) throw new ValidationError('Wrapping paper not found', {});

    const name = input.name.trim();
    const existingSku = existing.variants?.[0]?.sku;

    const product = await productService.update({
      id,
      name,
      description: input.description?.trim() || undefined,
      status: input.status,
      variants: [
        {
          sku: existingSku || `WRAP-${slugify(name).toUpperCase()}`.slice(0, 50),
          optionValues: [],
          pricePiasters: input.priceMinor,
          stock: input.stock,
          lowStockThreshold: 5,
          isDefault: true,
          isActive: true,
          trackInventory: input.trackInventory,
        },
      ],
      media: input.media.map((m, i) => ({
        assetKey: m.assetKey,
        url: m.url,
        alt: m.alt || name,
        type: m.type,
        isPrimary: i === 0,
        sortOrder: i,
        width: m.width,
        height: m.height,
      })),
    });

    invalidateProducts();
    return { success: true, data: { id: product.id } };
  } catch (error) {
    return fail(error, 'updateWrappingPaperAction');
  }
}

/** Archive rather than hard-delete: past orders reference this product. */
export async function archiveWrappingPaperAction(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    await productService.archive(id);
    invalidateProducts();
    return { success: true, data: undefined };
  } catch (error) {
    return fail(error, 'archiveWrappingPaperAction');
  }
}
