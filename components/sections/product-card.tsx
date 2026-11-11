'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { ProductListItem } from '@/features/catalog/types';
import { piastersToCurrency } from '@/lib/money/egp';
import { Skeleton } from '@/components/ui/skeleton';

interface ProductCardProps {
  product: ProductListItem;
  /** Load eagerly — set for the first row of a grid, which is above the fold. */
  priority?: boolean;
}

export function ProductCard({ product, priority = false }: ProductCardProps) {
  // 'loading' → 'loaded' | 'failed'. A failed image used to leave the card
  // pulsing as a skeleton forever, with the photo held at opacity 0.
  const [imageState, setImageState] = useState<'loading' | 'loaded' | 'failed'>('loading');

  const showImage = product.primaryImageUrl && imageState !== 'failed';

  return (
    <Link
      href={`/product/${product.slug}`}
      className="group block space-y-3"
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-transparent flex items-center justify-center">
        {showImage ? (
          <>
            {/* Skeleton placeholder until image loads */}
            {imageState === 'loading' && (
              <Skeleton className="absolute inset-0 bg-neutral-100/60" />
            )}
            <Image
              src={product.primaryImageUrl!}
              alt={product.name}
              fill
              priority={priority}
              sizes="(max-width: 768px) 50vw, 25vw"
              className={`
                object-contain transition-transform duration-500 ease-out
                group-hover:scale-105
                ${imageState === 'loaded' ? 'opacity-100' : 'opacity-0'}
              `}
              onLoad={() => setImageState('loaded')}
              onError={() => setImageState('failed')}
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
          {product.maxPricePiasters ? (
            <span className="text-neutral-400 font-light">
              {' '}– {piastersToCurrency(product.maxPricePiasters)}
            </span>
          ) : null}
        </p>
      </div>
    </Link>
  );
}
