'use client';

import React, { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { MediaGalleryUpload, type MediaFile } from '@/components/admin/media-gallery-upload';
import {
  createProductAction,
  updateProductAction,
} from '@/features/catalog/server/catalog.actions';
import type { ProductDTO } from '@/features/catalog/types';

// ── Types ─────────────────────────────────────────────────────

interface OptionDef {
  name: string;
  values: string[];
}

interface VariantRow {
  sku: string;
  optionValues: { name: string; value: string }[];
  pricePiasters: number;
  compareAtPricePiasters?: number;
  stock: number;
  lowStockThreshold: number;
  weight?: number;
  isDefault: boolean;
  isActive: boolean;
}

interface ProductFormProps {
  product?: ProductDTO;
  categories: { id: string; name: string }[];
}

// ── Helpers ───────────────────────────────────────────────────

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function generateVariantMatrix(options: OptionDef[]): VariantRow[] {
  if (options.length === 0) {
    return [{ sku: 'DEFAULT', optionValues: [], pricePiasters: 0, stock: 0, lowStockThreshold: 5, isDefault: true, isActive: true }];
  }
  function cartesian(arrays: string[][]): string[][] {
    return arrays.reduce<string[][]>((acc, arr) => acc.flatMap((combo) => arr.map((val) => [...combo, val])), [[]]);
  }
  const combos = cartesian(options.map((o) => o.values));
  return combos.map((combo, i) => ({
    sku: combo.join('-').toUpperCase(),
    optionValues: combo.map((val, j) => ({ name: options[j].name, value: val })),
    pricePiasters: 0, stock: 0, lowStockThreshold: 5, isDefault: i === 0, isActive: true,
  }));
}

// ── Steps ─────────────────────────────────────────────────────

const STEPS = [
  { id: 'media', num: '01', title: 'Product Media' },
  { id: 'general', num: '02', title: 'General Info' },
  { id: 'pricing', num: '03', title: 'Pricing & Status' },
  { id: 'variants', num: '04', title: 'Options & Variants' },
  { id: 'seo', num: '05', title: 'SEO' },
];

function LeftStepper() {
  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <aside className="hidden lg:block w-56 shrink-0 relative z-0">
      <div className="sticky top-[100px] pt-4">
        <div className="absolute left-[11.5px] top-6 bottom-4 w-px bg-white/[0.06]" />
        <ul className="space-y-6 relative">
          {STEPS.map((step) => (
            <li key={step.id}>
              <a
                href={`#${step.id}`}
                onClick={(e) => scrollToSection(e, step.id)}
                className="group flex items-center gap-4 text-white/40 hover:text-white transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-white/[0.04] border-2 border-white/[0.12] flex items-center justify-center text-[10px] text-white font-bold font-mono transition-colors z-10 shrink-0 group-hover:border-white/40">
                  {step.num}
                </div>
                <span className="text-[13px] font-semibold tracking-wide">{step.title}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-16">
      <h3 className="text-[15px] font-semibold text-white mb-6 tracking-tight border-b border-white/[0.06] pb-4">{title}</h3>
      <div className="space-y-6">{children}</div>
    </div>
  );
}

function InputLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-[13px] font-medium text-white/50 mb-2">{children}</label>;
}

const inputClass = 'w-full p-3 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white text-[13px] focus:border-white/[0.2] focus:outline-none focus:ring-1 focus:ring-white/[0.1] placeholder:text-white/20 transition-colors';

// ── Main Component ────────────────────────────────────────────

export function ProductForm({ product, categories }: ProductFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEditing = !!product;

  // Basic
  const [name, setName] = useState(product?.name ?? '');
  const [slug, setSlug] = useState(product?.slug ?? '');
  const [slugManual, setSlugManual] = useState(!!product);
  const [description, setDescription] = useState(product?.description ?? '');
  const [shortDescription, setShortDescription] = useState(product?.shortDescription ?? '');
  const [type, setType] = useState<'simple' | 'bundle'>(product?.type ?? 'simple');
  const [categoryIds, setCategoryIds] = useState<string[]>(product?.categoryIds ?? []);
  const [status, setStatus] = useState<'draft' | 'active' | 'archived'>(product?.status ?? 'draft');

  // Options & Variants
  const [options, setOptions] = useState<OptionDef[]>(product?.options ?? []);
  const [variants, setVariants] = useState<VariantRow[]>(
    product?.variants.map((v) => ({
      sku: v.sku || 'DEFAULT', optionValues: v.optionValues, pricePiasters: v.pricePiasters,
      compareAtPricePiasters: v.compareAtPricePiasters, stock: v.stock,
      lowStockThreshold: v.lowStockThreshold, weight: v.weight, isDefault: v.isDefault, isActive: v.isActive,
    })) ?? [{ sku: 'DEFAULT', optionValues: [], pricePiasters: 0, stock: 0, lowStockThreshold: 5, isDefault: true, isActive: true }]
  );

  // Media
  const [media, setMedia] = useState<MediaFile[]>(
    product?.media.map((m) => ({ assetKey: m.assetKey, url: m.url, alt: m.alt ?? '', type: m.type, width: m.width, height: m.height })) ?? []
  );

  // SEO
  const [seoTitle, setSeoTitle] = useState(product?.seo?.title ?? '');
  const [seoDescription, setSeoDescription] = useState(product?.seo?.description ?? '');

  // Option editing
  const [newOptionName, setNewOptionName] = useState('');
  const [newOptionValues, setNewOptionValues] = useState('');

  // Auto slug — derived, no effect needed
  const effectiveSlug = useMemo(() => {
    if (!slugManual && name) return slugify(name);
    return slug;
  }, [name, slugManual, slug]);

  // ── Handlers ─────────────────────────────────────────────

  function toggleCategory(catId: string) {
    setCategoryIds((prev) => (prev.includes(catId) ? prev.filter((c) => c !== catId) : [...prev, catId]));
  }

  function addOption() {
    if (!newOptionName.trim()) return;
    const values = newOptionValues.split(',').map((v) => v.trim()).filter(Boolean);
    if (values.length === 0) return;
    const updated = [...options, { name: newOptionName.trim(), values }];
    setOptions(updated);
    setVariants(generateVariantMatrix(updated));
    setNewOptionName('');
    setNewOptionValues('');
  }

  function removeOption(index: number) {
    const updated = options.filter((_, i) => i !== index);
    setOptions(updated);
    setVariants(generateVariantMatrix(updated));
  }

  function updateVariant(index: number, field: keyof VariantRow, value: VariantRow[keyof VariantRow]) {
    const updated = [...variants];
    const variant = { ...updated[index], [field]: value };
    updated[index] = variant;
    if (field === 'isDefault' && value === true) {
      updated.forEach((v, i) => { if (i !== index) v.isDefault = false; });
    }
    setVariants(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const finalSlug = effectiveSlug || undefined;
      const baseSku = slugify(name || 'prod').toUpperCase() || 'SKU';

      // Auto-assign SKU behind the scenes so user doesn't have to enter one manually
      const preparedVariants = variants.map((v, i) => ({
        ...v,
        sku: v.sku.trim() && v.sku !== 'DEFAULT' ? v.sku : `${baseSku}-${i + 1}`,
      }));

      const input = {
        name, slug: finalSlug, description: description || undefined,
        shortDescription: shortDescription || undefined, type, categoryIds,
        options: options.length > 0 ? options : undefined, variants: preparedVariants,
        media: media.map((m, i) => ({
          assetKey: m.assetKey, url: m.url, alt: m.alt, type: m.type as 'image' | 'video',
          isPrimary: i === 0, sortOrder: i, width: m.width, height: m.height,
        })),
        status,
        seo: seoTitle || seoDescription ? { title: seoTitle || undefined, description: seoDescription || undefined } : undefined,
      };
      const result = isEditing
        ? await updateProductAction({ ...input, id: product!.id })
        : await createProductAction(input);
      if (result.success) {
        toast.success(isEditing ? 'Product updated' : 'Product created');
        router.push('/admin/products');
      } else {
        const detailMsg = result.details
          ? Object.entries(result.details).map(([k, v]) => `${k}: ${v.join(', ')}`).join('\n')
          : '';
        toast.error(detailMsg ? `${result.error}\n${detailMsg}` : result.error, { duration: 8000 });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Header */}
      <div className="border-b border-white/[0.06] pb-4 mb-8">
        <button type="button" onClick={() => router.back()} className="text-white/30 hover:text-white transition-colors text-xs flex items-center gap-1.5 font-medium w-fit mb-2">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Products
        </button>
        <h1 className="text-lg font-bold text-white tracking-tight">{isEditing ? 'Edit Product' : 'New Product'}</h1>
        <span className="text-[10px] font-medium tracking-wider text-white/25 uppercase">Catalog Management</span>
      </div>

      <div className="flex items-start gap-8">
        <LeftStepper />

        <main className="w-full max-w-3xl shrink min-w-0 space-y-12 pb-32">
          {/* 01 Media */}
          <div id="media" className="scroll-mt-32">
            <Section title="01. Product Media">
              <MediaGalleryUpload value={media} onChange={setMedia} maxFiles={20} />
            </Section>
          </div>

          {/* 02 General */}
          <div id="general" className="scroll-mt-32">
            <Section title="02. General Information">
              <div className="space-y-5">
                <div>
                  <InputLabel>Product Name *</InputLabel>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Enter product name" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <InputLabel>Slug</InputLabel>
                    <input type="text" value={effectiveSlug} onChange={(e) => { setSlug(e.target.value); setSlugManual(true); }} className={`${inputClass} font-mono`} />
                    <p className="text-[10px] text-white/15 mt-1">/product/{effectiveSlug || '...'}</p>
                  </div>
                  <div>
                    <InputLabel>Type</InputLabel>
                    <select value={type} onChange={(e) => setType(e.target.value as 'simple' | 'bundle')} className={inputClass}>
                      <option value="simple">Simple</option>
                      <option value="bundle">Bundle</option>
                    </select>
                  </div>
                </div>
                <div>
                  <InputLabel>Short Description</InputLabel>
                  <input type="text" value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} className={inputClass} placeholder="Brief summary" maxLength={500} />
                </div>
                <div>
                  <InputLabel>Description</InputLabel>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} rows={4} placeholder="Full product description" />
                </div>
                <div>
                  <InputLabel>Categories *</InputLabel>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {categories.map((cat) => (
                      <button type="button" key={cat.id} onClick={() => toggleCategory(cat.id)}
                        className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors border ${
                          categoryIds.includes(cat.id)
                            ? 'bg-white/[0.1] border-white/[0.15] text-white'
                            : 'bg-white/[0.02] border-white/[0.06] text-white/30 hover:text-white/50'
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                  {categoryIds.length === 0 && <p className="text-[11px] text-red-400/60 mt-1">Select at least one category</p>}
                </div>
              </div>
            </Section>
          </div>

          {/* 03 Pricing & Status */}
          <div id="pricing" className="scroll-mt-32">
            <Section title="03. Pricing & Status">
              <div className="flex items-center justify-between mb-6 p-3 bg-white/[0.02] rounded-lg border border-white/[0.04]">
                <div>
                  <h4 className="text-[13px] font-medium text-white mb-0.5">Product Status</h4>
                  <p className="text-[11px] text-white/25">
                    {status === 'active' ? 'Visible in store' : status === 'draft' ? 'Hidden from store' : 'Archived'}
                  </p>
                </div>
                <select value={status} onChange={(e) => setStatus(e.target.value as 'draft' | 'active' | 'archived')}
                  className="bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-1.5 text-[12px] text-white focus:outline-none"
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <p className="text-[11px] text-white/25 mb-3">
                Pricing and stock are configured per-variant in section 04 below.
              </p>
            </Section>
          </div>

          {/* 04 Options & Variants */}
          <div id="variants" className="scroll-mt-32">
            <Section title="04. Options & Variants">
              {/* Existing options */}
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-white/[0.02] rounded-md border border-white/[0.04]">
                  <Badge className="bg-white/[0.06] text-white/60 text-[11px]">{opt.name}</Badge>
                  <span className="text-[12px] text-white/30">{opt.values.join(', ')}</span>
                  <button type="button" onClick={() => removeOption(i)} className="ml-auto text-red-400/40 hover:text-red-400 transition-colors">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}

              {/* Add option */}
              <div className="flex gap-2">
                <input value={newOptionName} onChange={(e) => setNewOptionName(e.target.value)} placeholder="Option name (e.g. Color)" className={`${inputClass} w-40`} />
                <input value={newOptionValues} onChange={(e) => setNewOptionValues(e.target.value)} placeholder="Values (comma: Red, Blue)" className={`${inputClass} flex-1`} />
                <button type="button" onClick={addOption} className="flex items-center gap-1 px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-md text-[12px] text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors shrink-0">
                  <Plus className="h-3 w-3" /> Add
                </button>
              </div>

              {/* Variant matrix */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[12px] text-white/40">Variants ({variants.length})</span>
                  {options.length > 0 && (
                    <button type="button" onClick={() => setVariants(generateVariantMatrix(options))} className="text-[11px] text-white/30 hover:text-white/60 transition-colors">
                      Regenerate
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  {variants.map((v, i) => (
                    <div key={i} className="p-4 bg-white/[0.02] rounded-lg border border-white/[0.04]">
                      {v.optionValues.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {v.optionValues.map((ov) => (
                            <span key={`${ov.name}-${ov.value}`} className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] text-white/40 font-medium">
                              {ov.name}: {ov.value}
                            </span>
                          ))}
                          {v.isDefault && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-400/10 text-blue-400 font-medium">Default</span>}
                        </div>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <span className="text-[11px] font-semibold text-white/50 block mb-1">Price (EGP) *</span>
                          <input type="number" min={0} step={0.01} value={v.pricePiasters / 100 || ''} onChange={(e) => updateVariant(i, 'pricePiasters', Math.round(Number(e.target.value) * 100))} className={`${inputClass} text-[12px] p-2.5`} placeholder="0.00" required />
                        </div>
                        <div>
                          <span className="text-[11px] font-semibold text-white/50 block mb-1">Original Price (Sale EGP)</span>
                          <input type="number" min={0} step={0.01} value={(v.compareAtPricePiasters ?? 0) / 100 || ''} onChange={(e) => updateVariant(i, 'compareAtPricePiasters', e.target.value ? Math.round(Number(e.target.value) * 100) : undefined)} className={`${inputClass} text-[12px] p-2.5${v.compareAtPricePiasters !== undefined && v.compareAtPricePiasters <= v.pricePiasters ? ' !border-red-400/40' : ''}`} placeholder="Optional" />
                          <p className="text-[10px] text-white/30 mt-1 leading-tight">
                            The store will display the original price crossed out (e.g. <span className="line-through">EGP 500</span> EGP 350) and automatically show a SALE badge!
                          </p>
                          {v.compareAtPricePiasters !== undefined && v.compareAtPricePiasters > 0 && v.compareAtPricePiasters <= v.pricePiasters && (
                            <span className="text-[10px] text-red-400/70 mt-0.5 block font-medium">Must exceed price</span>
                          )}
                        </div>
                        <div>
                          <span className="text-[11px] font-semibold text-white/50 block mb-1">Stock *</span>
                          <input type="number" min={0} value={v.stock} onChange={(e) => updateVariant(i, 'stock', Number(e.target.value))} className={`${inputClass} text-[12px] p-2.5`} required />
                        </div>
                      </div>
                      {!v.isDefault && variants.length > 1 && (
                        <div className="mt-2 pt-2 border-t border-white/[0.03] flex justify-end">
                          <button type="button" onClick={() => updateVariant(i, 'isDefault', true)} className="text-[10px] text-white/30 hover:text-white/60 transition-colors px-2 py-1 border border-white/[0.06] rounded-md">
                            Set Default Variant
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </Section>
          </div>

          {/* 05 SEO */}
          <div id="seo" className="scroll-mt-32">
            <Section title="05. SEO">
              <div className="space-y-4">
                <div>
                  <InputLabel>SEO Title</InputLabel>
                  <input type="text" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} maxLength={70} placeholder={name} className={inputClass} />
                  <span className="text-[10px] text-white/15 mt-1 block">{seoTitle.length}/70</span>
                </div>
                <div>
                  <InputLabel>SEO Description</InputLabel>
                  <textarea value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} maxLength={160} rows={3} placeholder="Auto-generated from product description" className={inputClass} />
                  <span className="text-[10px] text-white/15 mt-1 block">{seoDescription.length}/160</span>
                </div>
                {/* Preview */}
                <div className="p-4 bg-white/[0.02] rounded-lg border border-white/[0.04]">
                  <span className="text-[11px] text-white/25 block mb-2">Search Preview</span>
                  <p className="text-blue-400 text-[14px]">{seoTitle || name || 'Product Title'}</p>
                  <p className="text-[11px] text-green-400/60">shopwarda.com/product/{effectiveSlug || '...'}</p>
                  <p className="text-[12px] text-white/30 mt-1">{seoDescription || shortDescription || 'Product description…'}</p>
                </div>
              </div>
            </Section>
          </div>

          {/* Submit */}
          <div className="pt-8 border-t border-white/[0.06] flex justify-end gap-3">
            <button type="button" onClick={() => router.back()} className="px-6 py-2.5 rounded-lg text-[13px] text-white/40 border border-white/[0.06] hover:bg-white/[0.04] transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isPending || !name.trim() || categoryIds.length === 0 || variants.length === 0}
              className="bg-white hover:bg-stone-200 text-stone-900 px-8 py-2.5 rounded-lg font-medium text-[13px] transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isPending ? 'Saving...' : isEditing ? 'Update Product' : 'Create Product'}
            </button>
          </div>
        </main>
      </div>
    </form>
  );
}
