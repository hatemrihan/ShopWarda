import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense, cache } from 'react';
import { notFound, redirect } from 'next/navigation';
import { categoryService } from '@/features/catalog/server/category.service';
import { productService } from '@/features/catalog/server/product.service';
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
import type { CategoryDTO } from '@/features/catalog/types';
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
  searchParams: Promise<SearchParams>;
}

type Lookup =
  | { kind: 'found'; category: CategoryDTO }
  | { kind: 'moved'; slug: string }
  | { kind: 'missing' };

/** Resolved once per request for both generateMetadata and the page. */
const lookupCategory = cache(async (slug: string): Promise<Lookup> => {
  try {
    return { kind: 'found', category: await categoryService.getBySlugCached(slug) };
  } catch (error: unknown) {
    const redirectSlug = (error as { redirectSlug?: unknown } | null)?.redirectSlug;
    if (typeof redirectSlug === 'string') return { kind: 'moved', slug: redirectSlug };
    return { kind: 'missing' };
  }
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const result = await lookupCategory(slug);
  if (result.kind !== 'found') return { title: 'Category' };

  const { category } = result;
  return {
    title: category.seo?.title ?? category.name,
    description: category.seo?.description ?? category.description ?? `Shop ${category.name}`,
    alternates: { canonical: `/categories/${category.slug}` },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;

  const result = await lookupCategory(slug);
  if (result.kind === 'moved') redirect(`/categories/${result.slug}`);
  if (result.kind === 'missing') notFound();
  const { category } = result;

  const sort = parseSort(sp);
  const page = parsePage(sp);
  const basePath = `/categories/${category.slug}`;

  const products = await productService.listCached(
    { status: 'active', categoryId: category.id, ...sort },
    { page, pageSize: PRODUCTS_PER_PAGE },
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
              basePath={basePath}
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
            action={
              <Link href="/shop" className="text-sm underline underline-offset-4 hover:no-underline">
                Browse all products
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-5 gap-y-10 sm:gap-x-7 sm:gap-y-14">
            {products.items.map((product, index) => (
              <ProductCard key={product.id} product={product} priority={index < 4} />
            ))}
          </div>
        )}

        <Pagination
          page={page}
          totalPages={products.totalPages}
          hrefFor={(p) => pageHref(basePath, sp, p)}
        />
      </div>
    </div>
  );
}
