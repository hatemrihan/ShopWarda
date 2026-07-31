'use client';

/**
 * Wrapping paper admin.
 *
 * These are ordinary catalogue products, so they appear on the shop page,
 * get their own product page, and flow through cart, orders and emails with
 * no special handling. This screen just spares the florist the full product
 * form: a sheet of paper has one price and no variant matrix.
 */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, Archive, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

import { MediaGalleryUpload, type MediaFile } from '@/components/admin/media-gallery-upload';
import type { WrappingPaperDTO } from '@/features/wrapping/types';
import {
  createWrappingPaperAction,
  updateWrappingPaperAction,
  archiveWrappingPaperAction,
} from '@/features/wrapping/server/wrapping.actions';

// ── Shared styling (matches product-form.tsx) ─────────────────

const inputClass =
  'w-full p-3 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white text-[13px] focus:border-white/[0.2] focus:outline-none focus:ring-1 focus:ring-white/[0.1] placeholder:text-white/20 transition-colors';

function InputLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-[11px] text-white/40 mb-1.5">{children}</label>;
}

const egpToMinor = (egp: number) => Math.round((egp || 0) * 100);
const minorToEgp = (minor: number) => (minor || 0) / 100;

type Draft = {
  id?: string;
  name: string;
  description: string;
  priceEgp: number;
  stock: number;
  trackInventory: boolean;
  status: 'draft' | 'active' | 'archived';
  media: MediaFile[];
};

const EMPTY: Draft = {
  name: '',
  description: '',
  priceEgp: 0,
  stock: 0,
  trackInventory: true,
  status: 'active',
  media: [],
};

interface Props {
  initialPapers: WrappingPaperDTO[];
  loadError?: string;
}

export function WrappingPaperManager({ initialPapers, loadError }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState<Draft | null>(null);

  const refresh = () => router.refresh();

  const edit = (p: WrappingPaperDTO) =>
    setDraft({
      id: p.id,
      name: p.name,
      description: p.description,
      priceEgp: minorToEgp(p.priceMinor),
      stock: p.stock,
      trackInventory: p.trackInventory,
      status: p.status,
      media: p.media.map((m) => ({
        assetKey: m.assetKey,
        url: m.url,
        alt: m.alt,
        type: m.type,
        width: m.width,
        height: m.height,
      })),
    });

  const save = () => {
    if (!draft) return;
    if (!draft.name.trim()) {
      toast.error('Name is required');
      return;
    }

    const payload = {
      name: draft.name.trim(),
      description: draft.description.trim() || undefined,
      priceMinor: egpToMinor(draft.priceEgp),
      stock: draft.stock,
      trackInventory: draft.trackInventory,
      status: draft.status,
      media: draft.media.map((m) => ({
        assetKey: m.assetKey,
        url: m.url,
        alt: m.alt || draft.name,
        type: m.type,
        width: m.width,
        height: m.height,
      })),
    };

    startTransition(async () => {
      const res = draft.id
        ? await updateWrappingPaperAction(draft.id, payload)
        : await createWrappingPaperAction(payload);

      if (res.success) {
        toast.success(draft.id ? 'Wrapping paper updated' : 'Wrapping paper added');
        setDraft(null);
        refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  const archive = (p: WrappingPaperDTO) => {
    if (!confirm(`Archive "${p.name}"? It will be hidden from the shop.`)) return;
    startTransition(async () => {
      const res = await archiveWrappingPaperAction(p.id);
      if (res.success) {
        toast.success('Archived');
        refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  const visible = initialPapers.filter((p) => p.status !== 'archived');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[20px] font-medium text-white">Wrapping Paper</h1>
          <p className="text-[13px] text-white/40 mt-1">
            Sold on the shop like any other product — each one gets its own product page.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setDraft({ ...EMPTY })}
          className="flex items-center gap-1.5 px-3 py-2 bg-white text-stone-900 rounded-lg text-[13px] font-medium hover:bg-stone-200 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> Add wrapping paper
        </button>
      </div>

      {loadError && (
        <p className="text-[13px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
          {loadError}
        </p>
      )}

      {/* List */}
      {visible.length === 0 && !draft && (
        <p className="text-[13px] text-white/30 text-center py-12">
          No wrapping paper yet. Add one — the category is created automatically.
        </p>
      )}

      <div className="grid gap-3">
        {visible.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-4 p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl"
          >
            <div className="h-12 w-12 rounded-lg bg-white/[0.04] overflow-hidden flex-shrink-0 flex items-center justify-center">
              {p.imageUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
              ) : (
                <ImageIcon className="h-4 w-4 text-white/20" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[13px] text-white">{p.name}</span>
                {p.status !== 'active' && (
                  <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-white/[0.05] text-white/40">
                    {p.status}
                  </span>
                )}
              </div>
              <span className="font-mono text-[12px] text-white/50">
                EGP {minorToEgp(p.priceMinor).toLocaleString()}
                {p.trackInventory && ` · ${p.stock} in stock`}
              </span>
            </div>

            <button
              type="button"
              onClick={() => edit(p)}
              className="px-3 py-1.5 text-[12px] text-white/60 hover:text-white border border-white/[0.06] rounded-lg transition-colors"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => archive(p)}
              aria-label={`Archive ${p.name}`}
              className="p-1.5 text-white/30 hover:text-red-400 transition-colors"
            >
              <Archive className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Editor */}
      {draft && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 space-y-4">
          <h3 className="text-[13px] font-medium text-white/70">
            {draft.id ? 'Edit wrapping paper' : 'New wrapping paper'}
          </h3>

          <div>
            <InputLabel>Photos</InputLabel>
            <MediaGalleryUpload
              value={draft.media}
              onChange={(media) => setDraft({ ...draft, media })}
              maxFiles={6}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <InputLabel>Name</InputLabel>
              <input
                className={inputClass}
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Blush kraft paper"
              />
            </div>
            <div>
              <InputLabel>Price (EGP)</InputLabel>
              <input
                type="number"
                min={0}
                step="0.01"
                className={`${inputClass} font-mono`}
                value={draft.priceEgp}
                onChange={(e) => setDraft({ ...draft, priceEgp: Number(e.target.value) })}
              />
            </div>
          </div>

          <div>
            <InputLabel>Description</InputLabel>
            <textarea
              className={inputClass}
              rows={3}
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="Matte kraft sheet, 70 × 70 cm."
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <InputLabel>Stock</InputLabel>
              <input
                type="number"
                min={0}
                disabled={!draft.trackInventory}
                className={`${inputClass} font-mono disabled:opacity-40`}
                value={draft.stock}
                onChange={(e) => setDraft({ ...draft, stock: Number(e.target.value) })}
              />
            </div>
            <div>
              <InputLabel>Status</InputLabel>
              <select
                className={inputClass}
                value={draft.status}
                onChange={(e) =>
                  setDraft({ ...draft, status: e.target.value as Draft['status'] })
                }
              >
                <option value="active" className="bg-stone-900">active</option>
                <option value="draft" className="bg-stone-900">draft</option>
                <option value="archived" className="bg-stone-900">archived</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-[13px] text-white/60">
            <input
              type="checkbox"
              checked={draft.trackInventory}
              onChange={(e) => setDraft({ ...draft, trackInventory: e.target.checked })}
            />
            Track stock (uncheck if you never run out)
          </label>

          <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="px-3 py-2 text-[13px] text-white/40 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className="flex items-center gap-1.5 px-4 py-2 bg-white text-stone-900 rounded-lg text-[13px] font-medium hover:bg-stone-200 transition-colors disabled:opacity-50"
            >
              {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
