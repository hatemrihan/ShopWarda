'use client';

import Image from 'next/image';
import Link from 'next/link';

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string;
  productCount: number;
}

interface CategoryShowcaseSectionProps {
  categories: CategoryItem[];
}

export function CategoryShowcaseSection({ categories }: CategoryShowcaseSectionProps) {
  if (!categories.length) return null;

  return (
    <section className="relative bg-[#faf6f1] overflow-hidden py-16 md:py-28">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        {categories.map((cat, index) => {
          const isEven = index % 2 === 0;
          const num = String(index + 1).padStart(2, '0');

          return (
            <div
              key={cat.id}
              className={`
                grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center
                ${index > 0 ? 'mt-20 md:mt-32' : ''}
              `}
            >
              {/* Text Side */}
              <div
                className={`
                  flex flex-col
                  ${isEven ? 'lg:order-1' : 'lg:order-2'}
                  ${isEven ? 'lg:items-start' : 'lg:items-start lg:pl-12'}
                `}
              >
                {/* Large Number */}
                <span
                  className="text-[clamp(3rem,8vw,7rem)] leading-[1] text-[#1a1a1a] font-normal tracking-[-0.03em] mb-3"
                  style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}
                >
                  {num}
                </span>

                {/* Category Name */}
                <h3
                  className="text-[13px] md:text-[14px] tracking-[0.25em] uppercase text-[#1a1a1a] font-normal mb-4"
                  style={{ fontFamily: 'var(--font-inter), sans-serif' }}
                >
                  {cat.name}
                </h3>

                {/* View All Link */}
                <Link
                  href={`/categories/${cat.slug}`}
                  className="group inline-flex items-center gap-2 text-[11px] tracking-[0.15em] uppercase text-[#1a1a1a]/40 hover:text-[#1a1a1a] transition-colors duration-300"
                >
                  <span>View All</span>
                  <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">
                    →
                  </span>
                </Link>
              </div>

              {/* Image Side */}
              <div
                className={`
                  relative overflow-hidden
                  ${isEven ? 'lg:order-2' : 'lg:order-1'}
                `}
              >
                <div className="relative aspect-[4/5] max-w-[520px] overflow-hidden">
                  {cat.imageUrl ? (
                    <Image
                      src={cat.imageUrl}
                      alt={cat.name}
                      fill
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      className="object-contain transition-transform duration-700 hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-[12px] text-[#1a1a1a]/30 tracking-wider uppercase">
                      No image
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
