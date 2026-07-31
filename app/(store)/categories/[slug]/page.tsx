import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { categoryService } from '@/features/catalog/server/category.service';
import { productService } from '@/features/catalog/server/product.service';
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

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

const SORT_MAP: Record<string, { sortBy: 'name' | 'price' | 'createdAt' | 'updatedAt'; sortOrder: 'asc' | 'desc' }> = {
  newest: { sortBy: 'createdAt', sortOrder: 'desc' },
  oldest: { sortBy: 'createdAt', sortOrder: 'asc' },
  'price-asc': { sortBy: 'price', sortOrder: 'asc' },
  'price-desc': { sortBy: 'price', sortOrder: 'desc' },
  'name-asc': { sortBy: 'name', sortOrder: 'asc' },
  'name-desc': { sortBy: 'name', sortOrder: 'desc' },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const category = await categoryService.getBySlug(slug);
    return {
      title: category.seo?.title ?? category.name,
      description: category.seo?.description ?? category.description ?? `Shop ${category.name}`,
    };
  } catch {
    return { title: 'Category' };
  }
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;

  let category;
  try {
    category = await categoryService.getBySlug(slug);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'redirectSlug' in error && typeof (error as { redirectSlug?: unknown }).redirectSlug === 'string') {
      redirect(`/categories/${(error as { redirectSlug: string }).redirectSlug}`);
    }
    notFound();
  }

  // Parse sort from URL
  const sortKey = typeof sp.sort === 'string' ? sp.sort : 'newest';
  const sort = SORT_MAP[sortKey] ?? SORT_MAP.newest;

  // Fetch products for this category with sort
  const products = await productService.listCached(
    { status: 'active', categoryId: category.id, ...sort },
    { page: 1, pageSize: 24 }
  );

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 pb-16">
        {/* Top Bar: Breadcrumbs + Sort Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 border-b border-neutral-200/40 sm:border-none">
          <Breadcrumb>
            <BreadcrumbList className="text-xs sm:text-[13px] tracking-wide text-neutral-500 font-light">
              <BreadcrumbItem>
                <BreadcrumbLink render={<Link href="/" />}>Home</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink render={<Link href="/categories" />}>Categories</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="font-normal text-neutral-900">{category.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <Suspense fallback={null}>
            <ProductFilterBar
              categories={[]}
              totalProducts={products.total}
              activeCategoryId={category.id}
              basePath={`/categories/${slug}`}
            />
          </Suspense>
        </div>

        {/* Centered Page Title */}
        <h1 className="text-2xl sm:text-3xl font-light text-center tracking-wide text-neutral-900 my-8 sm:my-12 font-[family-name:var(--font-playfair)]">
          {category.name}
        </h1>

        {/* Category Description */}
        {category.description && (
          <p className="text-sm text-neutral-500 font-light text-center max-w-xl mx-auto -mt-4 mb-10">
            {category.description}
          </p>
        )}

        {products.items.length === 0 ? (
          <EmptyState
            title="No products in this category"
            description="Check back soon for new additions."
          />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-5 gap-y-10 sm:gap-x-7 sm:gap-y-14">
            {products.items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
