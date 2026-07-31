'use server';

/**
 * Bouquet builder Server Actions — admin mutations.
 * Every action: requireAdmin() → validate → repository → invalidate cache.
 */

import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/require-admin';
import { ValidationError, handleError } from '@/lib/errors';
import logger from '@/lib/logger';
import { invalidateBouquet } from '@/lib/cache';
import { StoreSettings } from '@/lib/db/models/store-settings.model';
import connectDB from '@/lib/db/mongoose';
import { bouquetRepository } from './bouquet.repository';
import {
  flowerInputSchema,
  wrapInputSchema,
  bouquetSettingsSchema,
  type FlowerInput,
  type WrapInput,
  type BouquetSettingsInput,
} from '../schemas';

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

function parseOrThrow<T>(schema: z.ZodType<T>, input: unknown, message: string): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const details: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path.map(String).join('.') || '_';
      details[path] = [...(details[path] ?? []), issue.message];
    }
    throw new ValidationError(message, details);
  }
  return parsed.data;
}

// ─── Flowers ────────────────────────────────────────────────────

export async function createFlowerAction(
  input: FlowerInput
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdmin();
    const data = parseOrThrow(flowerInputSchema, input, 'Invalid flower');

    const flower = await bouquetRepository.createFlower({
      ...data,
      slug: data.slug?.trim() || slugify(data.name),
    });

    invalidateBouquet();
    return { success: true, data: { id: flower._id.toString() } };
  } catch (error) {
    return fail(error, 'createFlowerAction');
  }
}

export async function updateFlowerAction(
  id: string,
  input: FlowerInput
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdmin();
    const data = parseOrThrow(flowerInputSchema, input, 'Invalid flower');

    const flower = await bouquetRepository.updateFlower(id, {
      ...data,
      slug: data.slug?.trim() || slugify(data.name),
    });
    if (!flower) throw new ValidationError('Flower not found', {});

    invalidateBouquet();
    return { success: true, data: { id: flower._id.toString() } };
  } catch (error) {
    return fail(error, 'updateFlowerAction');
  }
}

export async function deleteFlowerAction(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    await bouquetRepository.deleteFlower(id);
    invalidateBouquet();
    return { success: true, data: undefined };
  } catch (error) {
    return fail(error, 'deleteFlowerAction');
  }
}

/** Inline availability toggle from the list view. */
export async function toggleFlowerAvailabilityAction(
  id: string,
  available: boolean
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const flower = await bouquetRepository.updateFlower(id, { available });
    if (!flower) throw new ValidationError('Flower not found', {});
    invalidateBouquet();
    return { success: true, data: undefined };
  } catch (error) {
    return fail(error, 'toggleFlowerAvailabilityAction');
  }
}

// ─── Wraps ──────────────────────────────────────────────────────

export async function createWrapAction(
  input: WrapInput
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdmin();
    const data = parseOrThrow(wrapInputSchema, input, 'Invalid wrapping');

    const wrap = await bouquetRepository.createWrap(data);
    invalidateBouquet();
    return { success: true, data: { id: wrap._id.toString() } };
  } catch (error) {
    return fail(error, 'createWrapAction');
  }
}

export async function updateWrapAction(
  id: string,
  input: WrapInput
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdmin();
    const data = parseOrThrow(wrapInputSchema, input, 'Invalid wrapping');

    const wrap = await bouquetRepository.updateWrap(id, data);
    if (!wrap) throw new ValidationError('Wrapping not found', {});

    invalidateBouquet();
    return { success: true, data: { id: wrap._id.toString() } };
  } catch (error) {
    return fail(error, 'updateWrapAction');
  }
}

export async function deleteWrapAction(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    await bouquetRepository.deleteWrap(id);
    invalidateBouquet();
    return { success: true, data: undefined };
  } catch (error) {
    return fail(error, 'deleteWrapAction');
  }
}

export async function toggleWrapAvailabilityAction(
  id: string,
  available: boolean
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const wrap = await bouquetRepository.updateWrap(id, { available });
    if (!wrap) throw new ValidationError('Wrapping not found', {});
    invalidateBouquet();
    return { success: true, data: undefined };
  } catch (error) {
    return fail(error, 'toggleWrapAvailabilityAction');
  }
}

// ─── Settings ───────────────────────────────────────────────────

export async function updateBouquetSettingsAction(
  input: BouquetSettingsInput
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const data = parseOrThrow(bouquetSettingsSchema, input, 'Invalid bouquet settings');

    await connectDB();
    await StoreSettings.updateOne(
      { key: 'main' },
      { $set: { bouquetBuilder: data } },
      { upsert: true },
    );

    invalidateBouquet();
    return { success: true, data: undefined };
  } catch (error) {
    return fail(error, 'updateBouquetSettingsAction');
  }
}
