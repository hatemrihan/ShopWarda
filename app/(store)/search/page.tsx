import type { Metadata } from 'next';
import Link from 'next/link';
import { productService } from '@/features/catalog/server/product.service';
import {
  PRODUCTS_PER_PAGE,
  pageHref,
  parsePage,
  type SearchParams,
} from '@/features/catalog/listing';
import { ProductCard } from '@/components/sections/product-card';
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
  title: 'Search',
  robots: { index: false, follow: true },
};

interface Props {
  searchParams: Promise<SearchParams>;
}

/**
 * /search?q=… — full results for a search term.
 *
 * This page was an empty placeholder (a bare "Search" heading). It now lists
 * every match, in the same grid as the shop, so the header search has
 * somewhere to send a shopper who wants more than its ten suggestions.
 */
export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams;
  const raw = Array.isArray(params.q) ? params.q[0] : params.q;
  const query = (raw ?? '').trim().slice(0, 100);
  const page = parsePage(params);

  const result = query
    ? await productService.list(
        { status: 'active', search: query, sortBy: 'createdAt', sortOrder: 'desc' },
        { page, pageSize: PRODUCTS_PER_PAGE },
      )
    : null;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 pb-16">
        <div className="py-2">
          <Breadcrumb>
            <BreadcrumbList className="text-xs sm:text-[13px] tracking-wide text-neutral-500 font-light">
              <BreadcrumbItem>
                <BreadcrumbLink render={<Link href="/" />}>Home</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="font-normal text-neutral-900">Search</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <h1 className="text-2xl sm:text-3xl font-light text-center tracking-wide text-neutral-900 my-8 sm:my-12 font-[family-name:var(--font-playfair)]">
          {query ? <>Results for &ldquo;{query}&rdquo;</> : 'Search'}
        </h1>

        {/* Works without JavaScript: a plain GET form. */}
        <form action="/search" method="get" role="search" className="max-w-md mx-auto mb-12 flex border-b border-neutral-300">
          <label htmlFor="search-q" className="sr-only">Search products</label>
          <input
            id="search-q"
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search products..."
            className="flex-1 bg-transparent py-2 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none"
          />
          <button
            type="submit"
            className="text-[12px] tracking-[0.1em] uppercase text-neutral-900 hover:opacity-60 transition-opacity pl-4"
          >
            Search
          </button>
        </form>

        {!result ? (
          <EmptyState title="What are you looking for?" description="Type a product name above." />
        ) : result.items.length === 0 ? (
          <EmptyState
            title="No products found"
            description={`Nothing matched "${query}". Try a different word.`}
            action={
              <Link href="/shop" className="text-sm underline underline-offset-4 hover:no-underline">
                Browse all products
              </Link>
            }
          />
        ) : (
          <>
            <p className="text-center text-[13px] text-neutral-400 font-light -mt-6 mb-10">
              {result.total} {result.total === 1 ? 'product' : 'products'}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-5 gap-y-10 sm:gap-x-7 sm:gap-y-14">
              {result.items.map((product, index) => (
                <ProductCard key={product.id} product={product} priority={index < 4} />
              ))}
            </div>
            <Pagination
              page={page}
              totalPages={result.totalPages}
              hrefFor={(p) => pageHref('/search', params, p)}
            />
          </>
        )}
      </div>
    </div>
  );
}
