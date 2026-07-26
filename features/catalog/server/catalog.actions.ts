'use server';

/**
 * Catalog Server Actions — entry points for admin mutations.
 * Every action: requireAdmin() → validate → service → return result.
 */

import { requireAdmin } from '@/lib/auth/require-admin';
import { categoryService } from './category.service';
import { productService } from './product.service';
import type { CreateCategoryInput, UpdateCategoryInput, CreateProductInput, UpdateProductInput, MediaItemInput } from '../schemas';
import { ValidationError, handleError } from '@/lib/errors';
import logger from '@/lib/logger';

// ─── Response type ──────────────────────────────────────────────

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; details?: Record<string, string[]> };

// ─── Category Actions ───────────────────────────────────────────

export async function createCategoryAction(
  input: CreateCategoryInput
): Promise<ActionResult<{ id: string; slug: string }>> {
  try {
    const admin = await requireAdmin();
    logger.info('Creating category', { adminId: admin.adminId, name: input.name });

    const category = await categoryService.create(input);
    return { success: true, data: { id: category.id, slug: category.slug } };
  } catch (error) {
    const appError = handleError(error);
    logger.error('createCategoryAction failed', { error: appError.message });
    return {
      success: false,
      error: appError.message,
      details: appError instanceof ValidationError ? appError.details : undefined,
    };
  }
}

export async function updateCategoryAction(
  input: UpdateCategoryInput
): Promise<ActionResult<{ id: string; slug: string }>> {
  try {
    const admin = await requireAdmin();
    logger.info('Updating category', { adminId: admin.adminId, id: input.id });

    const category = await categoryService.update(input);
    return { success: true, data: { id: category.id, slug: category.slug } };
  } catch (error) {
    const appError = handleError(error);
    logger.error('updateCategoryAction failed', { error: appError.message });
    return {
      success: false,
      error: appError.message,
      details: appError instanceof ValidationError ? appError.details : undefined,
    };
  }
}

export async function archiveCategoryAction(
  id: string
): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    logger.info('Archiving category', { adminId: admin.adminId, id });

    await categoryService.archive(id);
    return { success: true, data: undefined };
  } catch (error) {
    const appError = handleError(error);
    logger.error('archiveCategoryAction failed', { error: appError.message });
    return { success: false, error: appError.message };
  }
}

// ─── Product Actions ────────────────────────────────────────────

export async function createProductAction(
  input: CreateProductInput
): Promise<ActionResult<{ id: string; slug: string }>> {
  try {
    const admin = await requireAdmin();
    logger.info('Creating product', { adminId: admin.adminId, name: input.name });

    const product = await productService.create(input);
    return { success: true, data: { id: product.id, slug: product.slug } };
  } catch (error) {
    const appError = handleError(error);
    logger.error('createProductAction failed', { error: appError.message });
    return {
      success: false,
      error: appError.message,
      details: appError instanceof ValidationError ? appError.details : undefined,
    };
  }
}

export async function updateProductAction(
  input: UpdateProductInput
): Promise<ActionResult<{ id: string; slug: string }>> {
  try {
    const admin = await requireAdmin();
    logger.info('Updating product', { adminId: admin.adminId, id: input.id });

    const product = await productService.update(input);
    return { success: true, data: { id: product.id, slug: product.slug } };
  } catch (error) {
    const appError = handleError(error);
    logger.error('updateProductAction failed', { error: appError.message });
    return {
      success: false,
      error: appError.message,
      details: appError instanceof ValidationError ? appError.details : undefined,
    };
  }
}

export async function archiveProductAction(
  id: string
): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    logger.info('Archiving product', { adminId: admin.adminId, id });

    await productService.archive(id);
    return { success: true, data: undefined };
  } catch (error) {
    const appError = handleError(error);
    logger.error('archiveProductAction failed', { error: appError.message });
    return { success: false, error: appError.message };
  }
}

// ─── Media Actions ──────────────────────────────────────────────

export async function reorderMediaAction(
  productId: string,
  assetKeys: string[]
): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    logger.info('Reordering media', { adminId: admin.adminId, productId });

    const product = await productService.getById(productId);
    const reorderedMedia = assetKeys
      .map((key, index) => {
        const existing = product.media.find((m) => m.assetKey === key);
        if (!existing) return null;
        return { ...existing, sortOrder: index, isPrimary: index === 0 };
      })
      .filter((m): m is NonNullable<typeof m> => m !== null);

    await productService.update({
      id: productId,
      media: reorderedMedia as MediaItemInput[],
    });

    return { success: true, data: undefined };
  } catch (error) {
    const appError = handleError(error);
    return { success: false, error: appError.message };
  }
}
