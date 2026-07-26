'use client';

import React, { useState, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { ImageUpload } from '@/components/admin/image-upload';
import {
  createCategoryAction,
  updateCategoryAction,
} from '@/features/catalog/server/catalog.actions';
import type { CategoryDTO } from '@/features/catalog/types';

interface CategoryFormProps {
  category?: CategoryDTO;
  parentOptions: { id: string; name: string }[];
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

const inputClass = 'w-full p-3 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white text-[13px] focus:border-white/[0.2] focus:outline-none focus:ring-1 focus:ring-white/[0.1] placeholder:text-white/20 transition-colors';

function InputLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-[13px] font-medium text-white/50 mb-2">{children}</label>;
}

export function CategoryForm({ category, parentOptions }: CategoryFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEditing = !!category;

  const [name, setName] = useState(category?.name ?? '');
  const [slug, setSlug] = useState(category?.slug ?? '');
  const [slugManual, setSlugManual] = useState(!!category);
  const [description, setDescription] = useState(category?.description ?? '');
  const [parentId, setParentId] = useState(category?.parentId ?? '');
  const [status, setStatus] = useState<'active' | 'hidden' | 'archived'>(category?.status ?? 'active');
  const [displayOrder, setDisplayOrder] = useState(category?.displayOrder ?? 0);
  const [seoTitle, setSeoTitle] = useState(category?.seo?.title ?? '');
  const [seoDescription, setSeoDescription] = useState(category?.seo?.description ?? '');

  // Image state
  const [imageUrl, setImageUrl] = useState<string | undefined>(category?.imageUrl);
  const [imageAssetKey, setImageAssetKey] = useState<string | undefined>(category?.imageAssetKey);

  // Auto-slug derived from name (no useEffect needed)
  const effectiveSlug = slugManual ? slug : (name ? slugify(name) : '');

  const handleImageChange = useCallback((url: string | undefined, assetKey: string | undefined) => {
    setImageUrl(url);
    setImageAssetKey(assetKey);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const input = {
        name,
        slug: effectiveSlug || undefined,
        description: description || undefined,
        parentId: parentId || undefined,
        status,
        displayOrder,
        imageUrl: imageUrl || undefined,
        imageAssetKey: imageAssetKey || undefined,
        seo: seoTitle || seoDescription
          ? { title: seoTitle || undefined, description: seoDescription || undefined }
          : undefined,
      };

      const result = isEditing
        ? await updateCategoryAction({ ...input, id: category!.id })
        : await createCategoryAction(input);

      if (result.success) {
        toast.success(isEditing ? 'Category updated' : 'Category created');
        router.push('/admin/categories');
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl">
      {/* Header */}
      <button type="button" onClick={() => router.back()} className="text-white/30 hover:text-white transition-colors text-xs flex items-center gap-1.5 font-medium mb-6">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Categories
      </button>
      <h1 className="text-lg font-bold text-white mb-1">{isEditing ? 'Edit Category' : 'New Category'}</h1>
      <span className="text-[10px] font-medium tracking-wider text-white/25 uppercase">Catalog Management</span>

      <div className="mt-8 space-y-6">
        {/* Category Image */}
        <div>
          <InputLabel>Category Image</InputLabel>
          <ImageUpload
            value={imageUrl}
            onChange={handleImageChange}
            purpose="category-image"
            className="[&_button]:bg-white/[0.03] [&_button]:border-white/[0.06] [&_button]:text-white/40 [&_button]:hover:bg-white/[0.06] [&_button]:hover:text-white/60 [&_button]:hover:border-white/[0.12]"
          />
        </div>

        {/* Name & Slug */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <InputLabel>Category Name *</InputLabel>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Enter category name" required />
          </div>
          <div>
            <InputLabel>Slug</InputLabel>
            <input
              type="text"
              value={slugManual ? slug : effectiveSlug}
              onChange={(e) => { setSlug(e.target.value); setSlugManual(true); }}
              className={`${inputClass} font-mono`}
            />
            <p className="text-[10px] text-white/15 mt-1">/category/{effectiveSlug || '...'}</p>
          </div>
        </div>

        {/* Description */}
        <div>
          <InputLabel>Description</InputLabel>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} rows={3} placeholder="Category description" />
        </div>

        {/* Parent & Status */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <InputLabel>Parent Category</InputLabel>
            <select value={parentId} onChange={(e) => setParentId(e.target.value)} className={inputClass}>
              <option value="">None (top-level)</option>
              {parentOptions.filter((p) => p.id !== category?.id).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <InputLabel>Status</InputLabel>
            <select value={status} onChange={(e) => setStatus(e.target.value as 'active' | 'hidden' | 'archived')} className={inputClass}>
              <option value="active">Active</option>
              <option value="hidden">Hidden</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div>
            <InputLabel>Display Order</InputLabel>
            <input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(Number(e.target.value))} className={inputClass} min={0} />
          </div>
        </div>

        {/* SEO */}
        <div className="pt-6 border-t border-white/[0.06]">
          <span className="text-[11px] text-white/25 uppercase tracking-wider font-medium block mb-4">SEO</span>
          <div className="space-y-4">
            <div>
              <InputLabel>SEO Title</InputLabel>
              <input type="text" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} maxLength={70} placeholder={name} className={inputClass} />
              <span className="text-[10px] text-white/15 mt-1 block">{seoTitle.length}/70</span>
            </div>
            <div>
              <InputLabel>SEO Description</InputLabel>
              <textarea value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} maxLength={160} rows={2} placeholder="Category meta description" className={inputClass} />
              <span className="text-[10px] text-white/15 mt-1 block">{seoDescription.length}/160</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-6 border-t border-white/[0.06] flex justify-end gap-3">
          <button type="button" onClick={() => router.back()} className="px-6 py-2.5 rounded-lg text-[13px] text-white/40 border border-white/[0.06] hover:bg-white/[0.04] transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={isPending || !name.trim()}
            className="bg-white hover:bg-stone-200 text-stone-900 px-8 py-2.5 rounded-lg font-medium text-[13px] transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isPending ? 'Saving...' : isEditing ? 'Update Category' : 'Create Category'}
          </button>
        </div>
      </div>
    </form>
  );
}
