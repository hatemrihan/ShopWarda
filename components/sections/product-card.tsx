'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { ProductListItem } from '@/features/catalog/types';
import { piastersToCurrency } from '@/lib/money/egp';
import { Skeleton } from '@/components/ui/skeleton';

interface ProductCardProps {
  product: ProductListItem;
}

export function ProductCard({ product }: ProductCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <Link
      href={`/product/${product.slug}`}
      className="group block space-y-3"
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-transparent flex items-center justify-center">
        {product.primaryImageUrl ? (
          <>
            {/* Skeleton placeholder until image loads */}
            {!imageLoaded && (
              <Skeleton className="absolute inset-0 bg-neutral-100/60" />
            )}
            <Image
              src={product.primaryImageUrl}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 25vw"
              className={`
                object-contain transition-transform duration-500 ease-out
                group-hover:scale-105
                ${imageLoaded ? 'opacity-100' : 'opacity-0'}
              `}
              onLoad={() => setImageLoaded(true)}
            />
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-[11px] text-neutral-400 tracking-widest uppercase font-light">
            No image
          </div>
        )}
      </div>
      <div className="space-y-0.5">
        <h3 className="text-[13px] sm:text-[14px] font-normal text-neutral-900 tracking-wide group-hover:opacity-75 transition-opacity">
          {product.name}
        </h3>
        <p className="text-[13px] font-normal text-neutral-600 tracking-wide">
          {piastersToCurrency(product.pricePiasters)}
          {product.maxPricePiasters && (
            <span className="text-neutral-400 font-light">
              {' '}– {piastersToCurrency(product.maxPricePiasters)}
            </span>
          )}
        </p>
      </div>
    </Link>
  );
}
