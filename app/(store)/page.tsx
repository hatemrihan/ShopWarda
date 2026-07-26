import Link from 'next/link';
import { categoryService } from '@/features/catalog/server/category.service';
import { productService } from '@/features/catalog/server/product.service';
import { ProductCard } from '@/components/sections/product-card';
import { HeroSection } from '@/components/sections/hero';
import { ModernDriedFlowersSection } from '@/components/sections/modern-dried-flowers';
import { CategoryShowcaseSection } from '@/components/sections/category-showcase';

export default async function HomePage() {
  const [categories, products] = await Promise.all([
    categoryService.list({ status: 'active' }),
    productService.list(
      { status: 'active', sortBy: 'createdAt', sortOrder: 'desc' },
      { page: 1, pageSize: 8 }
    ),
  ]);

  return (
    <div>
      {/* Hero */}
      <HeroSection />


      {/* Modern Dried Flowers */}
      <ModernDriedFlowersSection />

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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {products.items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
