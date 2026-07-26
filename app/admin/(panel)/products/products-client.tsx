'use client';

import { useState, useMemo } from 'react';
import { Package, Plus, Search, Trash2, Pencil, ImageIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { formatEGP } from '@/lib/money/egp';
import type { ProductListItem } from '@/features/catalog/types';

export function ProductsClient({ initialProducts }: { initialProducts: ProductListItem[] }) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(
    () => initialProducts.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())),
    [initialProducts, search]
  );

  return (
    <div className="text-white max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="text-[13px] text-white/25 mb-1">Catalog</div>
          <h1 className="text-xl font-semibold text-white">Products</h1>
        </div>
        <Link
          href="/admin/products/new"
          className="flex items-center gap-1.5 bg-white text-stone-900 hover:bg-stone-200 text-[13px] font-medium h-9 px-4 rounded-md transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Product
        </Link>
      </div>

      {/* Empty state */}
      {initialProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-6">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-5">
            <Package className="h-7 w-7 text-white/15" />
          </div>
          <h2 className="text-[15px] font-medium text-white/60 mb-1.5">No products yet</h2>
          <p className="text-[13px] text-white/25 text-center max-w-sm mb-6">
            Start building your catalog by adding your first product.
          </p>
          <Link
            href="/admin/products/new"
            className="flex items-center gap-1.5 bg-white text-stone-900 hover:bg-stone-200 text-[13px] font-medium h-9 px-4 rounded-md transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add First Product
          </Link>
        </div>
      ) : (
        <>
          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25" />
            <input
              placeholder="Search products…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 h-10 bg-white/[0.03] border border-white/[0.06] rounded-lg text-[13px] text-white placeholder:text-white/25 focus:outline-none focus:border-white/[0.15] transition-colors"
            />
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((product) => (
              <div
                key={product.id}
                className="group bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden hover:border-white/[0.12] transition-all duration-150"
              >
                {/* Image */}
                <div className="relative aspect-square bg-white/[0.02]">
                  {product.primaryImageUrl ? (
                    <Image
                      src={product.primaryImageUrl}
                      alt={product.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-white/10" />
                    </div>
                  )}

                  {/* Hover actions */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-150 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    <Link
                      href={`/admin/products/${product.id}/edit`}
                      className="h-8 w-8 rounded-lg bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 flex items-center justify-center transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Link>
                    <Link
                      href={`/admin/products/${product.id}/delete`}
                      className="h-8 w-8 rounded-lg bg-red-500/10 backdrop-blur-sm text-red-400 hover:bg-red-500/20 flex items-center justify-center transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Link>
                  </div>

                  {/* Status badge */}
                  {product.status !== 'active' && (
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-400/20 text-amber-400 border border-amber-400/20">
                      {product.status === 'draft' ? 'Draft' : 'Archived'}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="px-4 py-3.5">
                  <h3 className="text-[14px] font-medium text-white truncate">{product.name}</h3>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[13px] font-semibold text-white tabular-nums font-mono">
                      {formatEGP(product.pricePiasters)}
                      {product.maxPricePiasters && product.maxPricePiasters !== product.pricePiasters && (
                        <span className="text-white/25 text-[11px] ml-1">→ {formatEGP(product.maxPricePiasters)}</span>
                      )}
                    </span>
                    <span
                      className={`text-[11px] ${
                        product.totalStock > 5
                          ? 'text-green-400'
                          : product.totalStock > 0
                          ? 'text-amber-400'
                          : 'text-red-400'
                      }`}
                    >
                      {product.totalStock > 5
                        ? `${product.totalStock} in stock`
                        : product.totalStock > 0
                        ? `Low: ${product.totalStock}`
                        : 'Out of stock'}
                    </span>
                  </div>
                  {product.categoryNames?.[0] && (
                    <span className="text-[11px] text-white/25 mt-1 block">{product.categoryNames[0]}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && search && (
            <div className="text-center py-12">
              <Search className="h-6 w-6 text-white/15 mx-auto mb-3" />
              <p className="text-[13px] text-white/30">No products match &quot;{search}&quot;</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
