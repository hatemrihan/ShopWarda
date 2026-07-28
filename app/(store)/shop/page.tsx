import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { productService } from '@/features/catalog/server/product.service';
import { categoryService } from '@/features/catalog/server/category.service';
import { ProductCard } from '@/components/sections/product-card';
import { ProductFilterBar } from '@/components/sections/product-filter-bar';
import { EmptyState } from '@/components/shared/empty-state';
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

const SORT_MAP: Record<string, { sortBy: 'name' | 'price' | 'createdAt' | 'updatedAt'; sortOrder: 'asc' | 'desc' }> = {
  newest: { sortBy: 'createdAt', sortOrder: 'desc' },
  oldest: { sortBy: 'createdAt', sortOrder: 'asc' },
  'price-asc': { sortBy: 'price', sortOrder: 'asc' },
  'price-desc': { sortBy: 'price', sortOrder: 'desc' },
  'name-asc': { sortBy: 'name', sortOrder: 'asc' },
  'name-desc': { sortBy: 'name', sortOrder: 'desc' },
};

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ShopPage({ searchParams }: Props) {
  const params = await searchParams;

  // Parse filters from URL
  const sortKey = (typeof params.sort === 'string' ? params.sort : 'newest');
  const sort = SORT_MAP[sortKey] ?? SORT_MAP.newest;
  const categoryIds = Array.isArray(params.cat) ? params.cat : (params.cat ? [params.cat] : []);

  // Fetch categories for filter UI
  const allCategories = await categoryService.list({ status: 'active' });

  // If filtering by categories, fetch products for each and merge
  let items: Awaited<ReturnType<typeof productService.list>>['items'] = [];
  let total = 0;

  if (categoryIds.length > 0) {
    // Fetch products filtered by each selected category, then dedupe
    const seen = new Set<string>();
    for (const catId of categoryIds) {
      const result = await productService.list(
        { status: 'active', categoryId: catId, ...sort },
        { page: 1, pageSize: 100 }
      );
      for (const item of result.items) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          items.push(item);
        }
      }
    }
    total = items.length;
    // Re-sort merged results client-side
    if (sort.sortBy === 'name') {
      items.sort((a, b) => sort.sortOrder === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name));
    } else if (sort.sortBy === 'price') {
      items.sort((a, b) => sort.sortOrder === 'asc' ? a.pricePiasters - b.pricePiasters : b.pricePiasters - a.pricePiasters);
    }
  } else {
    const result = await productService.list(
      { status: 'active', ...sort },
      { page: 1, pageSize: 24 }
    );
    items = result.items;
    total = result.total;
  }

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
            description={categoryIds.length > 0 ? 'Try adjusting your filters.' : 'Check back soon for new arrivals.'}
          />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-5 gap-y-10 sm:gap-x-7 sm:gap-y-14">
            {items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
