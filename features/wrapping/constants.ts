/**
 * Wrapping paper constants.
 *
 * Kept out of wrapping.actions.ts because a 'use server' module may only
 * export async functions — a non-function export silently strips every
 * export from the module.
 */

export const WRAPPING_CATEGORY_SLUG = 'wrapping-paper';
export const WRAPPING_CATEGORY_NAME = 'Wrapping Paper';
export const WRAPPING_CATEGORY_DESCRIPTION =
  'Papers, silks and ribbons to finish your bouquet.';
