import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { categoryService } from '@/features/catalog/server/category.service';
import { EmptyState } from '@/components/shared/empty-state';
import { CategorySortBar } from './category-sort-bar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

export const metadata: Metadata = {
  title: 'Categories',
  description: 'Browse our collections.',
};

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function CategoriesPage({ searchParams }: Props) {
  const params = await searchParams;
  const sortKey = typeof params.sort === 'string' ? params.sort : 'default';

  const categories = await categoryService.list({ status: 'active' });

  // Sort categories based on URL param
  const sorted = [...categories].sort((a, b) => {
    switch (sortKey) {
      case 'name-asc':
        return a.name.localeCompare(b.name);
      case 'name-desc':
        return b.name.localeCompare(a.name);
      case 'products-desc':
        return b.productCount - a.productCount;
      case 'products-asc':
        return a.productCount - b.productCount;
      default:
        return a.displayOrder - b.displayOrder;
    }
  });

  return (
    <div className="min-h-screen bg-[#faf6f1]">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 pb-16">
        {/* Top Bar: Breadcrumbs + Sort */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 border-b border-neutral-200/40 sm:border-none">
          <Breadcrumb>
            <BreadcrumbList className="text-xs sm:text-[13px] tracking-wide text-neutral-500 font-light">
              <BreadcrumbItem>
                <BreadcrumbLink render={<Link href="/" />}>Home</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="font-normal text-neutral-900">Categories</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <Suspense fallback={null}>
            <CategorySortBar totalCategories={sorted.length} />
          </Suspense>
        </div>

        {/* Centered Page Title */}
        <h1 className="text-2xl sm:text-3xl font-light text-center tracking-wide text-neutral-900 my-8 sm:my-12 font-[family-name:var(--font-playfair)]">
          Categories
        </h1>

        {sorted.length === 0 ? (
          <EmptyState
            title="No categories yet"
            description="Check back soon."
          />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-5 gap-y-10 sm:gap-x-7 sm:gap-y-14">
            {sorted.map((cat) => (
              <Link
                key={cat.id}
                href={`/categories/${cat.slug}`}
                className="group"
              >
                {/* Category Image */}
                <div className="aspect-[3/4] overflow-hidden bg-neutral-100 mb-3">
                  {cat.imageUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={cat.imageUrl}
                      alt={cat.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-300">
                      <span className="text-4xl font-[family-name:var(--font-playfair)]">
                        {cat.name.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Category Info */}
                <h2 className="text-xs sm:text-sm font-light text-neutral-900 tracking-wide group-hover:underline underline-offset-4">
                  {cat.name}
                </h2>
                <p className="text-[11px] text-neutral-400 font-light mt-0.5">
                  {cat.productCount} {cat.productCount === 1 ? 'product' : 'products'}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
