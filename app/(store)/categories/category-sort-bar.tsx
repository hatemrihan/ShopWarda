'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowUpDown } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const SORT_OPTIONS = [
  { value: 'default', label: 'Default' },
  { value: 'name-asc', label: 'Name: A → Z' },
  { value: 'name-desc', label: 'Name: Z → A' },
  { value: 'products-desc', label: 'Most Products' },
  { value: 'products-asc', label: 'Fewest Products' },
];

interface CategorySortBarProps {
  totalCategories: number;
}

export function CategorySortBar({ totalCategories }: CategorySortBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSort = searchParams.get('sort') || 'default';

  const handleSortChange = (value: string | null) => {
    if (!value) return;
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'default') {
      params.delete('sort');
    } else {
      params.set('sort', value);
    }
    const qs = params.toString();
    router.push(`/categories${qs ? `?${qs}` : ''}`);
  };

  return (
    <div className="flex items-center gap-6 text-xs sm:text-[13px] text-neutral-600 font-light tracking-wide self-end sm:self-auto">
      <span className="text-neutral-400 hidden sm:inline">
        {totalCategories} {totalCategories === 1 ? 'collection' : 'collections'}
      </span>

      <Select value={currentSort} onValueChange={handleSortChange}>
        <SelectTrigger className="w-auto min-w-[140px] bg-transparent border-none shadow-none text-xs sm:text-[13px] text-neutral-600 font-light tracking-wide h-auto p-0 gap-1.5 focus:ring-0 [&>svg]:h-3 [&>svg]:w-3">
          <ArrowUpDown className="h-3 w-3 text-neutral-400 shrink-0" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-[#faf6f1] border border-neutral-200 rounded-md shadow-lg min-w-[160px]">
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
    </div>
  );
}
