'use client';

/**
 * Bouquet builder admin — flowers, wrappings, and builder settings.
 * Follows the hand-rolled dark style of components/admin/product-form.tsx.
 */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, Trash2, Flower2, Package, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { MediaGalleryUpload, type MediaFile } from '@/components/admin/media-gallery-upload';

import type { FlowerDTO, WrapDTO, BouquetSettingsDTO, FlowerColorDTO } from '@/features/bouquet/types';
import { BOUQUET_SEASONS, type BouquetSeason, BOUQUET_STATUS, type BouquetStatus } from '@/features/bouquet/constants';
import {
  createFlowerAction,
  updateFlowerAction,
  deleteFlowerAction,
  toggleFlowerAvailabilityAction,
  createWrapAction,
  updateWrapAction,
  deleteWrapAction,
  updateBouquetSettingsAction,
} from '@/features/bouquet/server/bouquet.actions';

// ── Shared styling (matches product-form.tsx) ─────────────────

const inputClass =
  'w-full p-3 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white text-[13px] focus:border-white/[0.2] focus:outline-none focus:ring-1 focus:ring-white/[0.1] placeholder:text-white/20 transition-colors';

function InputLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-[11px] text-white/40 mb-1.5">{children}</label>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 space-y-4">
      <h3 className="text-[13px] font-medium text-white/70">{title}</h3>
      {children}
    </div>
  );
}

const egpToMinor = (egp: number) => Math.round((egp || 0) * 100);
const minorToEgp = (minor: number) => (minor || 0) / 100;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// ── Editor state types ────────────────────────────────────────

type FlowerDraft = {
  id?: string;
  name: string;
  nameAr: string;
  pricePerStemEgp: number;
  colors: FlowerColorDTO[];
  seasons: BouquetSeason[];
  available: boolean;
  media: MediaFile[];
  sortOrder: number;
  status: BouquetStatus;
};

type WrapDraft = {
  id?: string;
  name: string;
  nameAr: string;
  material: string;
  priceEgp: number;
  media: MediaFile[];
  swatchHex: string;
  available: boolean;
  sortOrder: number;
  status: BouquetStatus;
};

const EMPTY_FLOWER: FlowerDraft = {
  name: '', nameAr: '', pricePerStemEgp: 0, colors: [], seasons: [],
  available: true, media: [], sortOrder: 0, status: 'draft',
};

const EMPTY_WRAP: WrapDraft = {
  name: '', nameAr: '', material: 'paper', priceEgp: 0, media: [],
  swatchHex: '', available: true, sortOrder: 0, status: 'draft',
};

// ── Component ─────────────────────────────────────────────────

interface Props {
  initialFlowers: FlowerDTO[];
  initialWraps: WrapDTO[];
  initialSettings: BouquetSettingsDTO;
}

export function BouquetManager({ initialFlowers, initialWraps, initialSettings }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<'flowers' | 'wraps' | 'settings'>('flowers');

  const [flowerDraft, setFlowerDraft] = useState<FlowerDraft | null>(null);
  const [wrapDraft, setWrapDraft] = useState<WrapDraft | null>(null);
  const [settings, setSettings] = useState<BouquetSettingsDTO>(initialSettings);

  const refresh = () => router.refresh();

  // ── Flowers ─────────────────────────────────────────────────

  const editFlower = (f: FlowerDTO) =>
    setFlowerDraft({
      id: f.id,
      name: f.name,
      nameAr: f.nameAr ?? '',
      pricePerStemEgp: minorToEgp(f.pricePerStemMinor),
      colors: f.colors,
      seasons: f.seasons,
      available: f.available,
      media: f.media.map((m) => ({ assetKey: m.publicUrl, url: m.publicUrl, alt: m.alt ?? '', type: 'image' as const })),
      sortOrder: f.sortOrder,
      status: f.status,
    });

  const saveFlower = () => {
    if (!flowerDraft) return;
    if (!flowerDraft.name.trim()) {
      toast.error('Name is required');
      return;
    }

    const payload = {
      name: flowerDraft.name.trim(),
      nameAr: flowerDraft.nameAr.trim() || undefined,
      slug: slugify(flowerDraft.name),
      pricePerStemMinor: egpToMinor(flowerDraft.pricePerStemEgp),
      colors: flowerDraft.colors.map((c, i) => ({
        key: c.key || slugify(c.label) || `color-${i}`,
        label: c.label,
        swatchHex: c.swatchHex || '#D0D48D',
        imageUrl: c.imageUrl || '',
        available: c.available,
        sortOrder: i,
      })),
      seasons: flowerDraft.seasons,
      available: flowerDraft.available,
      media: flowerDraft.media.map((m, i) => ({
        assetKey: m.assetKey,
        publicUrl: m.url,
        alt: m.alt || flowerDraft.name,
        type: m.type ?? 'image' as const,
        width: m.width ?? 0,
        height: m.height ?? 0,
        sortOrder: i,
      })),
      sortOrder: flowerDraft.sortOrder,
      status: flowerDraft.status,
    };

    startTransition(async () => {
      const res = flowerDraft.id
        ? await updateFlowerAction(flowerDraft.id, payload)
        : await createFlowerAction(payload);

      if (res.success) {
        toast.success(flowerDraft.id ? 'Flower updated' : 'Flower created');
        setFlowerDraft(null);
        refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  const removeFlower = (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const res = await deleteFlowerAction(id);
      if (res.success) {
        toast.success('Flower deleted');
        refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  const toggleFlower = (id: string, available: boolean) => {
    startTransition(async () => {
      const res = await toggleFlowerAvailabilityAction(id, available);
      if (res.success) refresh();
      else toast.error(res.error);
    });
  };

  // ── Wraps ───────────────────────────────────────────────────

  const editWrap = (w: WrapDTO) =>
    setWrapDraft({
      id: w.id,
      name: w.name,
      nameAr: w.nameAr ?? '',
      material: w.material,
      priceEgp: minorToEgp(w.priceMinor),
      media: w.imageUrl ? [{ assetKey: w.imageUrl, url: w.imageUrl, alt: w.name, type: 'image' as const }] : [],
      swatchHex: w.swatchHex ?? '',
      available: w.available,
      sortOrder: w.sortOrder,
      status: w.status,
    });

  const saveWrap = () => {
    if (!wrapDraft) return;
    if (!wrapDraft.name.trim()) {
      toast.error('Name is required');
      return;
    }

    const payload = {
      name: wrapDraft.name.trim(),
      nameAr: wrapDraft.nameAr.trim() || undefined,
      material: wrapDraft.material.trim() || 'paper',
      priceMinor: egpToMinor(wrapDraft.priceEgp),
      imageUrl: wrapDraft.media[0]?.url || '',
      swatchHex: wrapDraft.swatchHex || '',
      available: wrapDraft.available,
      sortOrder: wrapDraft.sortOrder,
      status: wrapDraft.status,
    };

    startTransition(async () => {
      const res = wrapDraft.id
        ? await updateWrapAction(wrapDraft.id, payload)
        : await createWrapAction(payload);

      if (res.success) {
        toast.success(wrapDraft.id ? 'Wrapping updated' : 'Wrapping created');
        setWrapDraft(null);
        refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  const removeWrap = (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const res = await deleteWrapAction(id);
      if (res.success) {
        toast.success('Wrapping deleted');
        refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  // ── Settings ────────────────────────────────────────────────

  const saveSettings = () => {
    startTransition(async () => {
      const res = await updateBouquetSettingsAction(settings);
      if (res.success) {
        toast.success('Settings saved');
        refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  // ── Render ──────────────────────────────────────────────────

  const TABS = [
    { id: 'flowers' as const, label: 'Flowers', icon: Flower2 },
    { id: 'wraps' as const, label: 'Wrapping', icon: Package },
    { id: 'settings' as const, label: 'Settings', icon: Settings2 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[20px] font-medium text-white">Bouquet Builder</h1>
          <p className="text-[13px] text-white/40 mt-1">
            Flowers, wrapping, and pricing for the build-your-own bouquet page.
          </p>
        </div>

        <div
          className={`px-3 py-1.5 rounded-lg border text-[12px] ${
            settings.enabled
              ? 'bg-green-500/10 border-green-500/20 text-green-400'
              : 'bg-white/[0.03] border-white/[0.06] text-white/40'
          }`}
        >
          {settings.enabled ? 'Live on storefront' : 'Hidden from storefront'}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/[0.06]">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-[13px] border-b-2 transition-colors ${
              tab === t.id
                ? 'border-white text-white'
                : 'border-transparent text-white/40 hover:text-white/70'
            }`}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Flowers tab ──────────────────────────────────────── */}
      {tab === 'flowers' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setFlowerDraft({ ...EMPTY_FLOWER })}
              className="flex items-center gap-1.5 px-3 py-2 bg-white text-stone-900 rounded-lg text-[13px] font-medium hover:bg-stone-200 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Add flower
            </button>
          </div>

          {initialFlowers.length === 0 && (
            <p className="text-[13px] text-white/30 text-center py-12">
              No flowers yet. Add one to get started.
            </p>
          )}

          <div className="grid gap-3">
            {initialFlowers.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-4 p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl"
              >
                <div className="h-12 w-12 rounded-lg bg-white/[0.04] overflow-hidden flex-shrink-0">
                  {f.imageUrl && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={f.imageUrl} alt={f.name} className="h-full w-full object-cover" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] text-white">{f.name}</span>
                    {f.status !== 'active' && (
                      <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-white/[0.05] text-white/40">
                        {f.status}
                      </span>
                    )}
                    {!f.inSeason && (
                      <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">
                        out of season
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="font-mono text-[12px] text-white/50">
                      EGP {minorToEgp(f.pricePerStemMinor).toLocaleString()} / stem
                    </span>
                    <div className="flex gap-1">
                      {f.colors.map((c) => (
                        <span
                          key={c.key}
                          title={c.label}
                          className={`h-3 w-3 rounded-full border ${
                            c.available ? 'border-white/30' : 'border-white/10 opacity-30'
                          }`}
                          style={{ backgroundColor: c.swatchHex }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <label className="flex items-center gap-2 text-[12px] text-white/50">
                  <input
                    type="checkbox"
                    checked={f.available}
                    onChange={(e) => toggleFlower(f.id, e.target.checked)}
                    disabled={pending}
                  />
                  Available
                </label>

                <button
                  type="button"
                  onClick={() => editFlower(f)}
                  className="px-3 py-1.5 text-[12px] text-white/60 hover:text-white border border-white/[0.06] rounded-lg transition-colors"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => removeFlower(f.id, f.name)}
                  className="p-1.5 text-white/30 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Flower editor */}
          {flowerDraft && (
            <Section title={flowerDraft.id ? 'Edit flower' : 'New flower'}>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <InputLabel>Name</InputLabel>
                  <input
                    className={inputClass}
                    value={flowerDraft.name}
                    onChange={(e) => setFlowerDraft({ ...flowerDraft, name: e.target.value })}
                    placeholder="Rose"
                  />
                </div>
                <div>
                  <InputLabel>Name (Arabic)</InputLabel>
                  <input
                    className={inputClass}
                    value={flowerDraft.nameAr}
                    onChange={(e) => setFlowerDraft({ ...flowerDraft, nameAr: e.target.value })}
                    placeholder="ورد"
                  />
                </div>
                <div>
                  <InputLabel>Price per stem (EGP)</InputLabel>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className={`${inputClass} font-mono`}
                    value={flowerDraft.pricePerStemEgp}
                    onChange={(e) =>
                      setFlowerDraft({ ...flowerDraft, pricePerStemEgp: Number(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <InputLabel>Sort order</InputLabel>
                  <input
                    type="number"
                    min={0}
                    className={`${inputClass} font-mono`}
                    value={flowerDraft.sortOrder}
                    onChange={(e) =>
                      setFlowerDraft({ ...flowerDraft, sortOrder: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="sm:col-span-2">
                  <InputLabel>Image</InputLabel>
                  <MediaGalleryUpload
                    value={flowerDraft.media}
                    onChange={(files) => setFlowerDraft({ ...flowerDraft, media: files })}
                    maxFiles={1}
                  />
                </div>
              </div>

              {/* Seasons */}
              <div>
                <InputLabel>Seasons (none selected = year-round)</InputLabel>
                <div className="flex gap-2 flex-wrap">
                  {BOUQUET_SEASONS.map((s) => {
                    const active = flowerDraft.seasons.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() =>
                          setFlowerDraft({
                            ...flowerDraft,
                            seasons: active
                              ? flowerDraft.seasons.filter((x) => x !== s)
                              : [...flowerDraft.seasons, s],
                          })
                        }
                        className={`px-3 py-1.5 rounded-lg text-[12px] border transition-colors ${
                          active
                            ? 'bg-white text-stone-900 border-white'
                            : 'bg-white/[0.03] text-white/50 border-white/[0.06] hover:text-white'
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Colours */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <InputLabel>Colours</InputLabel>
                  <button
                    type="button"
                    onClick={() =>
                      setFlowerDraft({
                        ...flowerDraft,
                        colors: [
                          ...flowerDraft.colors,
                          { key: '', label: '', swatchHex: '#D0D48D', available: true, sortOrder: flowerDraft.colors.length },
                        ],
                      })
                    }
                    className="text-[11px] text-white/40 hover:text-white transition-colors"
                  >
                    + Add colour
                  </button>
                </div>

                <div className="space-y-2">
                  {flowerDraft.colors.map((c, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        className={`${inputClass} flex-1`}
                        value={c.label}
                        placeholder="Red"
                        onChange={(e) => {
                          const colors = [...flowerDraft.colors];
                          colors[i] = { ...c, label: e.target.value, key: slugify(e.target.value) };
                          setFlowerDraft({ ...flowerDraft, colors });
                        }}
                      />
                      <input
                        type="color"
                        className="h-10 w-12 bg-transparent border border-white/[0.06] rounded-lg cursor-pointer"
                        value={c.swatchHex || '#D0D48D'}
                        onChange={(e) => {
                          const colors = [...flowerDraft.colors];
                          colors[i] = { ...c, swatchHex: e.target.value };
                          setFlowerDraft({ ...flowerDraft, colors });
                        }}
                      />
                      <input
                        className={`${inputClass} flex-1`}
                        value={c.imageUrl ?? ''}
                        placeholder="Image URL (optional)"
                        onChange={(e) => {
                          const colors = [...flowerDraft.colors];
                          colors[i] = { ...c, imageUrl: e.target.value };
                          setFlowerDraft({ ...flowerDraft, colors });
                        }}
                      />
                      <label className="flex items-center gap-1.5 text-[11px] text-white/40 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={c.available}
                          onChange={(e) => {
                            const colors = [...flowerDraft.colors];
                            colors[i] = { ...c, available: e.target.checked };
                            setFlowerDraft({ ...flowerDraft, colors });
                          }}
                        />
                        In stock
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setFlowerDraft({
                            ...flowerDraft,
                            colors: flowerDraft.colors.filter((_, x) => x !== i),
                          })
                        }
                        className="p-1.5 text-white/30 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <InputLabel>Status</InputLabel>
                  <select
                    className={inputClass}
                    value={flowerDraft.status}
                    onChange={(e) =>
                      setFlowerDraft({ ...flowerDraft, status: e.target.value as BouquetStatus })
                    }
                  >
                    {BOUQUET_STATUS.map((s) => (
                      <option key={s} value={s} className="bg-stone-900">
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <label className="flex items-end gap-2 text-[13px] text-white/60 pb-3">
                  <input
                    type="checkbox"
                    checked={flowerDraft.available}
                    onChange={(e) =>
                      setFlowerDraft({ ...flowerDraft, available: e.target.checked })
                    }
                  />
                  Available (متوفرة)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setFlowerDraft(null)}
                  className="px-3 py-2 text-[13px] text-white/40 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveFlower}
                  disabled={pending}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white text-stone-900 rounded-lg text-[13px] font-medium hover:bg-stone-200 transition-colors disabled:opacity-50"
                >
                  {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Save flower
                </button>
              </div>
            </Section>
          )}
        </div>
      )}

      {/* ── Wrapping tab ─────────────────────────────────────── */}
      {tab === 'wraps' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setWrapDraft({ ...EMPTY_WRAP })}
              className="flex items-center gap-1.5 px-3 py-2 bg-white text-stone-900 rounded-lg text-[13px] font-medium hover:bg-stone-200 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Add wrapping
            </button>
          </div>

          {initialWraps.length === 0 && (
            <p className="text-[13px] text-white/30 text-center py-12">
              No wrappings yet. The builder requires at least one.
            </p>
          )}

          <div className="grid gap-3">
            {initialWraps.map((w) => (
              <div
                key={w.id}
                className="flex items-center gap-4 p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl"
              >
                <div
                  className="h-12 w-12 rounded-lg bg-white/[0.04] overflow-hidden flex-shrink-0"
                  style={w.swatchHex ? { backgroundColor: w.swatchHex } : undefined}
                >
                  {w.imageUrl && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={w.imageUrl} alt={w.name} className="h-full w-full object-cover" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] text-white">{w.name}</span>
                    <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-white/[0.05] text-white/40">
                      {w.material}
                    </span>
                    {w.status !== 'active' && (
                      <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-white/[0.05] text-white/40">
                        {w.status}
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-[12px] text-white/50">
                    +EGP {minorToEgp(w.priceMinor).toLocaleString()}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => editWrap(w)}
                  className="px-3 py-1.5 text-[12px] text-white/60 hover:text-white border border-white/[0.06] rounded-lg transition-colors"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => removeWrap(w.id, w.name)}
                  className="p-1.5 text-white/30 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          {wrapDraft && (
            <Section title={wrapDraft.id ? 'Edit wrapping' : 'New wrapping'}>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <InputLabel>Name</InputLabel>
                  <input
                    className={inputClass}
                    value={wrapDraft.name}
                    onChange={(e) => setWrapDraft({ ...wrapDraft, name: e.target.value })}
                    placeholder="Blush silk"
                  />
                </div>
                <div>
                  <InputLabel>Material</InputLabel>
                  <input
                    className={inputClass}
                    value={wrapDraft.material}
                    onChange={(e) => setWrapDraft({ ...wrapDraft, material: e.target.value })}
                    placeholder="paper / silk"
                  />
                </div>
                <div>
                  <InputLabel>Price (EGP)</InputLabel>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className={`${inputClass} font-mono`}
                    value={wrapDraft.priceEgp}
                    onChange={(e) => setWrapDraft({ ...wrapDraft, priceEgp: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <InputLabel>Sort order</InputLabel>
                  <input
                    type="number"
                    min={0}
                    className={`${inputClass} font-mono`}
                    value={wrapDraft.sortOrder}
                    onChange={(e) => setWrapDraft({ ...wrapDraft, sortOrder: Number(e.target.value) })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <InputLabel>Image</InputLabel>
                  <MediaGalleryUpload
                    value={wrapDraft.media}
                    onChange={(files) => setWrapDraft({ ...wrapDraft, media: files })}
                    maxFiles={1}
                  />
                </div>
                <div>
                  <InputLabel>Status</InputLabel>
                  <select
                    className={inputClass}
                    value={wrapDraft.status}
                    onChange={(e) =>
                      setWrapDraft({ ...wrapDraft, status: e.target.value as BouquetStatus })
                    }
                  >
                    {BOUQUET_STATUS.map((s) => (
                      <option key={s} value={s} className="bg-stone-900">
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <label className="flex items-end gap-2 text-[13px] text-white/60 pb-3">
                  <input
                    type="checkbox"
                    checked={wrapDraft.available}
                    onChange={(e) => setWrapDraft({ ...wrapDraft, available: e.target.checked })}
                  />
                  Available
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setWrapDraft(null)}
                  className="px-3 py-2 text-[13px] text-white/40 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveWrap}
                  disabled={pending}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white text-stone-900 rounded-lg text-[13px] font-medium hover:bg-stone-200 transition-colors disabled:opacity-50"
                >
                  {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Save wrapping
                </button>
              </div>
            </Section>
          )}
        </div>
      )}

      {/* ── Settings tab ─────────────────────────────────────── */}
      {tab === 'settings' && (
        <Section title="Builder settings">
          <label className="flex items-center gap-2 text-[13px] text-white/70">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
            />
            Show the bouquet builder on the storefront
          </label>
          <p className="text-[11px] text-white/30 -mt-2">
            Add at least one flower and one wrapping (both set to <em>active</em>) before turning
            this on.
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <InputLabel>Minimum stems</InputLabel>
              <input
                type="number"
                min={1}
                className={`${inputClass} font-mono`}
                value={settings.minStems}
                onChange={(e) => setSettings({ ...settings, minStems: Number(e.target.value) })}
              />
            </div>
            <div>
              <InputLabel>Maximum stems</InputLabel>
              <input
                type="number"
                min={1}
                className={`${inputClass} font-mono`}
                value={settings.maxStems}
                onChange={(e) => setSettings({ ...settings, maxStems: Number(e.target.value) })}
              />
            </div>
            <div>
              <InputLabel>Arrangement fee (EGP)</InputLabel>
              <input
                type="number"
                min={0}
                step="0.01"
                className={`${inputClass} font-mono`}
                value={minorToEgp(settings.basePriceMinor)}
                onChange={(e) =>
                  setSettings({ ...settings, basePriceMinor: egpToMinor(Number(e.target.value)) })
                }
              />
            </div>
          </div>

          <div className="border-t border-white/[0.06] pt-4 space-y-4">
            <label className="flex items-center gap-2 text-[13px] text-white/70">
              <input
                type="checkbox"
                checked={settings.card.enabled}
                onChange={(e) =>
                  setSettings({ ...settings, card: { ...settings.card, enabled: e.target.checked } })
                }
              />
              Offer a handwritten card
            </label>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <InputLabel>Card price (EGP, 0 = free)</InputLabel>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className={`${inputClass} font-mono`}
                  value={minorToEgp(settings.card.priceMinor)}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      card: { ...settings.card, priceMinor: egpToMinor(Number(e.target.value)) },
                    })
                  }
                />
              </div>
              <div>
                <InputLabel>Card message max length</InputLabel>
                <input
                  type="number"
                  min={1}
                  className={`${inputClass} font-mono`}
                  value={settings.card.maxLength}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      card: { ...settings.card, maxLength: Number(e.target.value) },
                    })
                  }
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={saveSettings}
              disabled={pending}
              className="flex items-center gap-1.5 px-4 py-2 bg-white text-stone-900 rounded-lg text-[13px] font-medium hover:bg-stone-200 transition-colors disabled:opacity-50"
            >
              {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save settings
            </button>
          </div>
        </Section>
      )}
    </div>
  );
}
