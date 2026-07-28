'use client';

import React, { useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SlidersHorizontal, X, ArrowUpDown, Check } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
  productCount: number;
}

interface ProductFilterBarProps {
  categories: CategoryOption[];
  totalProducts: number;
  /** If inside a category page, don't show category filter */
  activeCategoryId?: string;
  basePath?: string;
}

type SortOption = {
  value: string;
  label: string;
  sortBy: string;
  sortOrder: string;
};

const SORT_OPTIONS: SortOption[] = [
  { value: 'newest', label: 'Newest', sortBy: 'createdAt', sortOrder: 'desc' },
  { value: 'oldest', label: 'Oldest', sortBy: 'createdAt', sortOrder: 'asc' },
  { value: 'price-asc', label: 'Price: Low → High', sortBy: 'price', sortOrder: 'asc' },
  { value: 'price-desc', label: 'Price: High → Low', sortBy: 'price', sortOrder: 'desc' },
  { value: 'name-asc', label: 'Name: A → Z', sortBy: 'name', sortOrder: 'asc' },
  { value: 'name-desc', label: 'Name: Z → A', sortBy: 'name', sortOrder: 'desc' },
];

export function ProductFilterBar({
  categories,
  totalProducts,
  activeCategoryId,
  basePath = '/shop',
}: ProductFilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filterOpen, setFilterOpen] = useState(false);

  // Read current filters from URL
  const currentSort = searchParams.get('sort') || 'newest';
  const currentCategoryIds = searchParams.getAll('cat');

  const activeFilterCount =
    currentCategoryIds.length + (currentSort !== 'newest' ? 1 : 0);

  const buildUrl = useCallback(
    (updates: Record<string, string | string[] | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(updates)) {
        params.delete(key);
        if (value === null) continue;
        if (Array.isArray(value)) {
          value.forEach((v) => params.append(key, v));
        } else {
          params.set(key, value);
        }
      }

      // Remove defaults
      if (params.get('sort') === 'newest') params.delete('sort');

      const qs = params.toString();
      return `${basePath}${qs ? `?${qs}` : ''}`;
    },
    [searchParams, basePath]
  );

  const handleSortChange = (value: string | null) => {
    if (value) router.push(buildUrl({ sort: value }));
  };

  const toggleCategory = (catId: string) => {
    const newIds = currentCategoryIds.includes(catId)
      ? currentCategoryIds.filter((id) => id !== catId)
      : [...currentCategoryIds, catId];
    router.push(buildUrl({ cat: newIds.length > 0 ? newIds : null }));
  };

  const clearAllFilters = () => {
    router.push(basePath);
    setFilterOpen(false);
  };

  return (
    <>
      {/* Controls Bar */}
      <div className="flex items-center gap-6 text-xs sm:text-[13px] text-neutral-600 font-light tracking-wide self-end sm:self-auto">
        {/* Product count */}
        <span className="text-neutral-400 hidden sm:inline">
          {totalProducts} {totalProducts === 1 ? 'product' : 'products'}
        </span>

        {/* Sort Dropdown */}
        <Select value={currentSort} onValueChange={handleSortChange}>
          <SelectTrigger className="w-auto min-w-[140px] bg-transparent border-none shadow-none text-xs sm:text-[13px] text-neutral-600 font-light tracking-wide h-auto p-0 gap-1.5 focus:ring-0 [&>svg]:h-3 [&>svg]:w-3">
            <ArrowUpDown className="h-3 w-3 text-neutral-400 shrink-0" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white border border-neutral-200 rounded-md shadow-lg min-w-[160px]">
            {SORT_OPTIONS.map((opt) => (
              <SelectItem
                key={opt.value}
                value={opt.value}
                className="text-xs cursor-pointer hover:bg-neutral-100/50 text-neutral-700"
              >
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filter Button */}
        {!activeCategoryId && categories.length > 0 && (
          <button
            type="button"
            onClick={() => setFilterOpen(true)}
            className="hover:text-neutral-900 transition-colors flex items-center gap-1.5 relative"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Filter</span>
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-3 bg-black text-white text-[9px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-medium">
                {activeFilterCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Filter Sheet */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent
          side="right"
          className="bg-white border-l border-neutral-300 w-full sm:max-w-sm p-0 text-[#1a1a1a]"
        >
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-neutral-200">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-lg font-normal font-[family-name:var(--font-playfair)] tracking-wide">
                Filters
              </SheetTitle>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-[11px] text-neutral-500 underline underline-offset-2 hover:text-neutral-900 transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>
            <SheetDescription className="text-xs text-neutral-500 font-light">
              {totalProducts} {totalProducts === 1 ? 'product' : 'products'} found
            </SheetDescription>
          </SheetHeader>

          <div className="px-6 py-6 space-y-8 overflow-y-auto max-h-[calc(100vh-180px)]">
            {/* Category Filter */}
            {!activeCategoryId && categories.length > 0 && (
              <div>
                <h3 className="text-[11px] text-neutral-400 uppercase tracking-wider font-medium mb-4">
                  Category
                </h3>
                <div className="space-y-1">
                  {categories.map((cat) => {
                    const isSelected = currentCategoryIds.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => toggleCategory(cat.id)}
                        className={`w-full flex items-center justify-between py-2.5 px-3 rounded-md text-sm transition-all ${
                          isSelected
                            ? 'bg-black/[0.05] text-neutral-900 font-normal'
                            : 'text-neutral-600 hover:bg-black/[0.02] hover:text-neutral-900 font-light'
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <span
                            className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                              isSelected
                                ? 'bg-black border-black'
                                : 'border-neutral-300'
                            }`}
                          >
                            {isSelected && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                          </span>
                          {cat.name}
                        </span>
                        <span className="text-[11px] text-neutral-400">
                          {cat.productCount}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sort Inside Sheet (mobile-friendly duplicate) */}
            <div>
              <h3 className="text-[11px] text-neutral-400 uppercase tracking-wider font-medium mb-4">
                Sort by
              </h3>
              <div className="space-y-1">
                {SORT_OPTIONS.map((opt) => {
                  const isSelected = currentSort === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        handleSortChange(opt.value);
                        setFilterOpen(false);
                      }}
                      className={`w-full flex items-center justify-between py-2.5 px-3 rounded-md text-sm transition-all ${
                        isSelected
                          ? 'bg-black/[0.05] text-neutral-900 font-normal'
                          : 'text-neutral-600 hover:bg-black/[0.02] hover:text-neutral-900 font-light'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {isSelected && (
                        <div className="w-1.5 h-1.5 rounded-full bg-black" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Apply / footer */}
          {activeFilterCount > 0 && (
            <div className="absolute bottom-0 left-0 right-0 px-6 py-4 border-t border-neutral-200 bg-white">
              <button
                type="button"
                onClick={() => setFilterOpen(false)}
                className="w-full py-3 bg-black text-white text-sm font-medium tracking-wide hover:bg-gray-900 transition-colors"
              >
                Show {totalProducts} {totalProducts === 1 ? 'Product' : 'Products'}
              </button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Active Filter Pills */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 mt-4 sm:mt-0">
          {currentCategoryIds.map((catId) => {
            const cat = categories.find((c) => c.id === catId);
            if (!cat) return null;
            return (
              <button
                key={catId}
                type="button"
                onClick={() => toggleCategory(catId)}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-black/[0.05] text-neutral-700 text-[11px] rounded-full hover:bg-black/[0.10] transition-colors"
              >
                {cat.name}
                <X className="h-3 w-3" />
              </button>
            );
          })}
          {currentSort !== 'newest' && (
            <button
              type="button"
              onClick={() => router.push(buildUrl({ sort: null }))}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-black/[0.05] text-neutral-700 text-[11px] rounded-full hover:bg-black/[0.10] transition-colors"
            >
              {SORT_OPTIONS.find((o) => o.value === currentSort)?.label}
              <X className="h-3 w-3" />
            </button>
          )}
          <button
            type="button"
            onClick={clearAllFilters}
            className="text-[11px] text-neutral-500 underline underline-offset-2 hover:text-neutral-900 transition-colors ml-1"
          >
            Clear all
          </button>
        </div>
      )}
    </>
  );
}
