/**
 * URL → listing parameters for the storefront product grids.
 * Shared by /shop, /categories/[slug] and /search, which each used to carry
 * their own copy of the sort table.
 */

import type { ProductFilter } from './types';

type SortSpec = Required<Pick<ProductFilter, 'sortBy' | 'sortOrder'>>;

export const PRODUCT_SORTS: Record<string, SortSpec> = {
  newest: { sortBy: 'createdAt', sortOrder: 'desc' },
  oldest: { sortBy: 'createdAt', sortOrder: 'asc' },
  'price-asc': { sortBy: 'price', sortOrder: 'asc' },
  'price-desc': { sortBy: 'price', sortOrder: 'desc' },
  'name-asc': { sortBy: 'name', sortOrder: 'asc' },
  'name-desc': { sortBy: 'name', sortOrder: 'desc' },
};

/** Products per page on every storefront grid. */
export const PRODUCTS_PER_PAGE = 24;

export type SearchParams = { [key: string]: string | string[] | undefined };

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseSort(params: SearchParams): SortSpec {
  return PRODUCT_SORTS[first(params.sort) ?? 'newest'] ?? PRODUCT_SORTS.newest;
}

export function parsePage(params: SearchParams): number {
  const page = Number.parseInt(first(params.page) ?? '1', 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

/**
 * Href for another page of the same listing, preserving every other filter.
 * Page 1 is the bare URL so it has a single canonical address.
 */
export function pageHref(basePath: string, params: SearchParams, page: number): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === 'page' || value === undefined) continue;
    for (const v of Array.isArray(value) ? value : [value]) query.append(key, v);
  }
  if (page > 1) query.set('page', String(page));
  const qs = query.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
