import Link from 'next/link';
import { categoryService } from '@/features/catalog/server/category.service';
import { productService } from '@/features/catalog/server/product.service';
import { ProductCard } from '@/components/sections/product-card';
import { HeroSection } from '@/components/sections/hero';
import { CategoryShowcaseSection } from '@/components/sections/category-showcase';
import { BouquetShowcase } from '@/components/sections/bouqet';
import { getActiveCatalog } from '@/features/bouquet/server/bouquet.service';

/** Re-render the homepage at most every 60 s so bouquet/settings changes appear. */
export const revalidate = 60;

export default async function HomePage() {
  const [categories, products, bouquetCatalog] = await Promise.all([
    categoryService.listCached({ status: 'active' }),
    productService.listCached(
      { status: 'active', sortBy: 'createdAt', sortOrder: 'desc' },
      { page: 1, pageSize: 8 }
    ),
    getActiveCatalog().catch((err) => {
      console.error('[HomePage] Failed to load bouquet catalog:', err);
      return null;
    }),
  ]);

  const showBouquet =
    bouquetCatalog &&
    (bouquetCatalog.flowers.length > 0 || bouquetCatalog.wraps.length > 0);

  return (
    <div>
      {/* Hero */}
      <HeroSection />


      {/* Category Showcase — dynamic from admin categories */}
      <CategoryShowcaseSection categories={categories} />

      {/* New Arrivals */}
      {products.items.length > 0 && (
        <section className="max-w-[1400px] mx-auto px-6 md:px-10 pb-24">
          <div className="flex items-end justify-between mb-10">
            <div>
              <span className="text-[11px] tracking-[0.2em] uppercase text-[#c75c3a] font-medium">
                New
              </span>
              <h2 className="text-[28px] font-[var(--font-playfair)] text-[#1a1a1a] mt-1">
                Latest Arrivals
              </h2>
            </div>
            <Link
              href="/shop"
              className="text-[12px] tracking-[0.1em] uppercase text-[#1a1a1a]/40 hover:text-[#c75c3a] transition-colors duration-300"
            >
              Shop all →
            </Link>
          </div>
          <div className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-none touch-pan-x scroll-smooth -mx-6 px-6 md:-mx-10 md:px-10">
            {products.items.map((product) => (
              <div key={product.id} className="w-[240px] sm:w-[280px] md:w-[300px] shrink-0 snap-start">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Bouquet Showcase — only when enabled in admin */}
      {showBouquet && (
        <BouquetShowcase
          flowers={bouquetCatalog.flowers}
          wraps={bouquetCatalog.wraps}
          settings={bouquetCatalog.settings}
        />
      )}

      {/* Advertisement */}
      {/* <ModernDriedFlowersSection /> */}
    </div>
  );
}

