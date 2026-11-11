import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { productService } from '@/features/catalog/server/product.service';
import { categoryService } from '@/features/catalog/server/category.service';
import {
  PRODUCTS_PER_PAGE,
  pageHref,
  parsePage,
  parseSort,
  type SearchParams,
} from '@/features/catalog/listing';
import { ProductCard } from '@/components/sections/product-card';
import { ProductFilterBar } from '@/components/sections/product-filter-bar';
import { EmptyState } from '@/components/shared/empty-state';
import { Pagination } from '@/components/shared/pagination';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

export const metadata: Metadata = {
  title: 'Shop',
  description: 'Browse our complete collection.',
};

interface Props {
  searchParams: Promise<SearchParams>;
}

export default async function ShopPage({ searchParams }: Props) {
  const params = await searchParams;

  const sort = parseSort(params);
  const page = parsePage(params);
  const requestedCategoryIds = Array.isArray(params.cat) ? params.cat : params.cat ? [params.cat] : [];

  const allCategories = await categoryService.listCached({ status: 'active' });

  // Only ids of categories that exist and are active are honoured.
  const knownIds = new Set(allCategories.map((c) => c.id));
  const categoryIds = requestedCategoryIds.filter((id) => knownIds.has(id)).sort();

  // One paginated query, whatever the filter. Selecting categories used to
  // fire a query per category (up to 100 products each), merge and re-sort
  // them in memory, and ignore the "newest/oldest" sort while doing so.
  const result =
    requestedCategoryIds.length > 0 && categoryIds.length === 0
      ? { items: [], total: 0, totalPages: 0 }
      : await productService.listCached(
          { status: 'active', ...(categoryIds.length ? { categoryIds } : {}), ...sort },
          { page, pageSize: PRODUCTS_PER_PAGE },
        );

  const { items, total, totalPages } = result;

  const categoryOptions = allCategories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    productCount: c.productCount,
  }));

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 pb-16">
        {/* Top Bar: Breadcrumbs + Filter/Sort Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 border-b border-neutral-200/40 sm:border-none">
          <Breadcrumb>
            <BreadcrumbList className="text-xs sm:text-[13px] tracking-wide text-neutral-500 font-light">
              <BreadcrumbItem>
                <BreadcrumbLink render={<Link href="/" />}>Home</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="font-normal text-neutral-900">Shop</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <Suspense fallback={null}>
            <ProductFilterBar
              categories={categoryOptions}
              totalProducts={total}
              basePath="/shop"
            />
          </Suspense>
        </div>

        {/* Centered Page Title */}
        <h1 className="text-2xl sm:text-3xl font-light text-center tracking-wide text-neutral-900 my-8 sm:my-12 font-[family-name:var(--font-playfair)]">
          Shop
        </h1>

        {items.length === 0 ? (
          <EmptyState
            title="No products found"
            description={
              requestedCategoryIds.length > 0
                ? 'Try adjusting your filters.'
                : page > 1
                  ? 'There are no more products on this page.'
                  : 'Check back soon for new arrivals.'
            }
            action={
              requestedCategoryIds.length > 0 || page > 1 ? (
                <Link href="/shop" className="text-sm underline underline-offset-4 hover:no-underline">
                  View all products
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-5 gap-y-10 sm:gap-x-7 sm:gap-y-14">
            {items.map((product, index) => (
              <ProductCard key={product.id} product={product} priority={index < 4} />
            ))}
          </div>
        )}

        <Pagination
          page={page}
          totalPages={totalPages}
          hrefFor={(p) => pageHref('/shop', params, p)}
        />
      </div>
    </div>
  );
}
