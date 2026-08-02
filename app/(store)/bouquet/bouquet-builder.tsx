'use client';

/**
 * Build Your Own Bouquet — premium step-by-step storefront experience.
 *
 * Uses shadcn components: Breadcrumb, Tabs (line variant), Sheet (mobile summary drawer),
 * Separator, Badge, Button, Skeleton.
 *
 * Steps: Flowers → Wrapping → Card → Review
 * Every price shown is display-only. The server re-prices at checkout.
 */

import { useMemo, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Image from 'next/image';
import Link from 'next/link';
import {
  Minus,
  Plus,
  Check,
  Flower2,
  Gift,
  PenLine,
  ShoppingBag,
  SlidersHorizontal,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';

// shadcn
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';

import { useCart } from '@/features/cart/context/cart-context';
import { piastersToCurrency } from '@/lib/money/egp';
import type { FlowerDTO, WrapDTO, BouquetSettingsDTO } from '@/features/bouquet/types';

// ── Props & Types ──────────────────────────────────────────────

interface Props {
  flowers: FlowerDTO[];
  wraps: WrapDTO[];
  settings: BouquetSettingsDTO;
}

type Selection = Record<string, { colorKey: string; qty: number }>;

const STEP_KEYS = ['flowers', 'wrapping', 'card', 'review'] as const;
type StepKey = (typeof STEP_KEYS)[number];

const STEP_META: Record<StepKey, { label: string; icon: typeof Flower2 }> = {
  flowers: { label: 'Flowers', icon: Flower2 },
  wrapping: { label: 'Wrapping', icon: Gift },
  card: { label: 'Card', icon: PenLine },
  review: { label: 'Review', icon: ShoppingBag },
};

// ── Helpers ────────────────────────────────────────────────────

function configHashOf(selection: Selection, wrapId: string, cardMessage: string): string {
  const normalized = JSON.stringify({
    flowers: Object.entries(selection)
      .filter(([, v]) => v.qty > 0)
      .map(([id, v]) => [id, v.colorKey, v.qty])
      .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
    wrapId,
    cardMessage: cardMessage.trim(),
  });
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash << 5) - hash + normalized.charCodeAt(i);
    hash |= 0;
  }
  return `bq_${(hash >>> 0).toString(36)}`;
}

const SEASON_LABELS: Record<string, string> = {
  spring: '🌸 Spring',
  summer: '☀️ Summer',
  autumn: '🍂 Autumn',
  winter: '❄️ Winter',
};

// ── Flower Card ────────────────────────────────────────────────

function FlowerCard({
  flower,
  qty,
  colorKey,
  maxReached,
  onSetQty,
  onSetColor,
}: {
  flower: FlowerDTO;
  qty: number;
  colorKey: string;
  maxReached: boolean;
  onSetQty: (qty: number) => void;
  onSetColor: (key: string) => void;
}) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const activeColor = flower.colors.find((c) => c.key === colorKey);
  const imageUrl = activeColor?.imageUrl || flower.imageUrl || flower.media?.[0]?.publicUrl;
  const isSelected = qty > 0;

  return (
    <div
      className={`group relative transition-all duration-300 ${
        flower.selectable ? '' : 'opacity-40 pointer-events-none'
      }`}
    >
      {/* Image */}
      <div className={`relative aspect-[3/4] bg-transparent overflow-hidden mb-3 border transition-colors duration-200 ${isSelected ? 'border-[#1a1a1a]' : 'border-transparent'}`}>
        {imageUrl ? (
          <>
            {!imgLoaded && <Skeleton className="absolute inset-0" />}
            <Image
              src={imageUrl}
              alt={flower.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className={`object-contain transition-all duration-500 group-hover:scale-105 ${
                imgLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={() => setImgLoaded(true)}
            />
          </>
        ) : (
          <div className="flex h-full items-center justify-center">
            <Flower2 className="h-8 w-8 text-neutral-300" />
          </div>
        )}

        {/* Season badges */}
        {flower.seasons.length > 0 && (
          <div className="absolute top-2 left-2 flex flex-wrap gap-1">
            {flower.seasons.map((season) => (
              <Badge key={season} variant="secondary" className="text-[9px] uppercase tracking-wider font-medium bg-white/90 backdrop-blur-sm text-neutral-600 rounded-none px-1.5 py-0.5">
                {season}
              </Badge>
            ))}
          </div>
        )}

        {/* Selected qty badge */}
        {isSelected && (
          <Badge className="absolute top-2 right-2 bg-[#1a1a1a] text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-semibold p-0">
            {qty}
          </Badge>
        )}

        {/* Unavailable overlay */}
        {!flower.selectable && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
            <Badge variant="outline" className="text-[10px] uppercase tracking-widest rounded-none">
              {flower.inSeason ? 'Unavailable' : 'Back Soon'}
            </Badge>
          </div>
        )}
      </div>

      {/* Info */}
      <h3 className="text-sm text-[#1a1a1a] font-normal">{flower.name}</h3>
      <p className="font-mono tabular-nums text-xs text-neutral-500 mt-0.5">
        {piastersToCurrency(flower.pricePerStemMinor)}
        <span className="text-neutral-400"> / stem</span>
      </p>

      {/* Color swatches */}
      {flower.colors.length > 0 && (
        <div className="flex gap-1.5 mt-2.5">
          {flower.colors.map((c) => (
            <button
              key={c.key}
              type="button"
              disabled={!c.available}
              onClick={() => onSetColor(c.key)}
              title={c.available ? c.label : `${c.label} — out of stock`}
              aria-label={c.label}
              className={`w-5 h-5 rounded-full border-2 transition-all ${
                colorKey === c.key
                  ? 'border-[#1a1a1a] scale-110 shadow-sm'
                  : 'border-neutral-200 hover:border-neutral-400'
              } ${c.available ? '' : 'opacity-30 cursor-not-allowed'}`}
              style={{ backgroundColor: c.swatchHex }}
            />
          ))}
        </div>
      )}

      {/* Qty stepper */}
      <div className="flex items-center gap-2 mt-3">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-full bg-transparent border-neutral-200 hover:bg-transparent shadow-none"
          disabled={qty === 0}
          onClick={() => onSetQty(qty - 1)}
          aria-label={`Remove one ${flower.name}`}
        >
          <Minus className="w-3 h-3 text-[#1a1a1a]" />
        </Button>
        <span className="font-mono tabular-nums text-sm w-6 text-center font-medium">
          {qty}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-full bg-transparent border-neutral-200 hover:bg-transparent shadow-none"
          disabled={maxReached}
          onClick={() => onSetQty(qty + 1)}
          aria-label={`Add one ${flower.name}`}
        >
          <Plus className="w-3 h-3 text-[#1a1a1a]" />
        </Button>
      </div>
    </div>
  );
}

// ── Wrap Card ──────────────────────────────────────────────────

function WrapCard({
  wrap,
  selected,
  onSelect,
}: {
  wrap: WrapDTO;
  selected: boolean;
  onSelect: () => void;
}) {
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <button
      type="button"
      onClick={onSelect}
      className="text-left transition-all duration-300 group"
    >
      <div
        className={`relative aspect-[4/3] bg-transparent overflow-hidden mb-3 border transition-colors duration-200 ${selected ? 'border-[#1a1a1a]' : 'border-transparent hover:border-neutral-200'}`}
        style={!wrap.imageUrl && wrap.swatchHex ? { backgroundColor: wrap.swatchHex } : undefined}
      >
        {wrap.imageUrl ? (
          <>
            {!imgLoaded && <Skeleton className="absolute inset-0" />}
            <Image
              src={wrap.imageUrl}
              alt={wrap.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className={`object-contain transition-all duration-500 group-hover:scale-105 ${
                imgLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={() => setImgLoaded(true)}
            />
          </>
        ) : !wrap.swatchHex ? (
          <div className="flex h-full items-center justify-center">
            <Gift className="h-8 w-8 text-neutral-300" />
          </div>
        ) : null}

        {selected && (
          <div className="absolute top-2 right-2 bg-[#1a1a1a] text-white w-5 h-5 rounded-full flex items-center justify-center">
            <Check className="w-3 h-3" strokeWidth={2.5} />
          </div>
        )}
      </div>

      <p className="text-sm text-[#1a1a1a] font-normal group-hover:opacity-80 transition-opacity">
        {wrap.name}
      </p>
      <p className="text-[10px] uppercase tracking-widest text-neutral-400 mt-0.5">
        {wrap.material}
      </p>
      <p className="font-mono tabular-nums text-xs text-neutral-500 mt-1">
        {wrap.priceMinor === 0 ? 'Included' : `+ ${piastersToCurrency(wrap.priceMinor)}`}
      </p>
    </button>
  );
}

// ── Order Summary (shared between drawer and review) ───────────

function OrderSummary({
  lines,
  selectedWrap,
  wrapMinor,
  cardOpen,
  cardMessage,
  cardMinor,
  basePriceMinor,
  totalMinor,
  stemCount,
  settings,
}: {
  lines: { flower: FlowerDTO; colorLabel?: string; qty: number; lineMinor: number }[];
  selectedWrap: WrapDTO | undefined;
  wrapMinor: number;
  cardOpen: boolean;
  cardMessage: string;
  cardMinor: number;
  basePriceMinor: number;
  totalMinor: number;
  stemCount: number;
  settings: BouquetSettingsDTO;
}) {
  return (
    <div className="space-y-4">
      {/* Flowers */}
      {lines.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-semibold">Flowers</p>
          {lines.map((l) => (
            <div key={l.flower.id} className="flex justify-between items-center gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                {l.flower.imageUrl && (
                  <div className="w-8 h-8 bg-transparent overflow-hidden shrink-0 rounded">
                    <Image src={l.flower.imageUrl} alt={l.flower.name} width={32} height={32} className="w-full h-full object-contain" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm text-[#1a1a1a] truncate">
                    {l.flower.name}
                    {l.colorLabel && <span className="text-neutral-400"> — {l.colorLabel}</span>}
                  </p>
                  <p className="text-[11px] text-neutral-400">×{l.qty}</p>
                </div>
              </div>
              <span className="font-mono tabular-nums text-sm text-[#1a1a1a] whitespace-nowrap">
                {piastersToCurrency(l.lineMinor)}
              </span>
            </div>
          ))}
        </div>
      )}

      <Separator />

      {/* Wrapping */}
      <div className="flex justify-between items-center">
        <span className="text-sm text-neutral-500">Wrapping</span>
        <span className="text-sm text-[#1a1a1a]">
          {selectedWrap ? (wrapMinor === 0 ? 'Included' : piastersToCurrency(wrapMinor)) : '—'}
        </span>
      </div>

      {/* Card */}
      {settings.card.enabled && (
        <div className="flex justify-between items-center">
          <span className="text-sm text-neutral-500">Card</span>
          <span className="text-sm text-[#1a1a1a]">
            {cardOpen && cardMessage.trim() ? piastersToCurrency(cardMinor) : '—'}
          </span>
        </div>
      )}

      {/* Arrangement fee */}
      {basePriceMinor > 0 && (
        <div className="flex justify-between items-center">
          <span className="text-sm text-neutral-500">Arrangement fee</span>
          <span className="font-mono tabular-nums text-sm">{piastersToCurrency(basePriceMinor)}</span>
        </div>
      )}

      <Separator />

      {/* Total */}
      <div className="flex justify-between items-baseline">
        <span className="text-[11px] uppercase tracking-widest text-[#1a1a1a] font-semibold">Total</span>
        <span className="font-mono tabular-nums text-xl text-[#1a1a1a] font-medium">
          {piastersToCurrency(totalMinor)}
        </span>
      </div>
      <p className="text-[10px] text-neutral-400">
        {stemCount} {stemCount === 1 ? 'stem' : 'stems'} · Arranged fresh on the day of delivery
      </p>
    </div>
  );
}

// ── Main Builder ───────────────────────────────────────────────

export function BouquetBuilder({ flowers, wraps, settings }: Props) {
  const router = useRouter();
  const { addItem } = useCart();
  const topRef = useRef<HTMLDivElement>(null);

  const [activeStep, setActiveStep] = useState<StepKey>('flowers');
  const [selection, setSelection] = useState<Selection>({});
  const [wrapId, setWrapId] = useState('');
  const [cardOpen, setCardOpen] = useState(false);
  const [cardMessage, setCardMessage] = useState('');
  const [adding, setAdding] = useState(false);

  // Filters
  const [seasonFilter, setSeasonFilter] = useState('all');
  const [colorFilter, setColorFilter] = useState('all');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const selectedWrap = wraps.find((w) => w.id === wrapId);

  // ── Derived ───────────────────────────────────────────

  const allSeasons = useMemo(() => {
    const set = new Set<string>();
    flowers.forEach((f) => f.seasons.forEach((s) => set.add(s)));
    return Array.from(set).sort();
  }, [flowers]);

  const allColors = useMemo(() => {
    const map = new Map<string, { key: string; label: string; swatchHex: string }>();
    flowers.forEach((f) =>
      f.colors.filter((c) => c.available).forEach((c) => {
        if (!map.has(c.key)) map.set(c.key, { key: c.key, label: c.label, swatchHex: c.swatchHex });
      })
    );
    return Array.from(map.values());
  }, [flowers]);

  const filteredFlowers = useMemo(() => {
    return flowers.filter((f) => {
      if (seasonFilter !== 'all') {
        if (f.seasons.length > 0 && !f.seasons.includes(seasonFilter as typeof f.seasons[number])) return false;
      }
      if (colorFilter !== 'all') {
        if (f.colors.length > 0 && !f.colors.some((c) => c.key === colorFilter && c.available)) return false;
      }
      return true;
    });
  }, [flowers, seasonFilter, colorFilter]);

  const lines = useMemo(
    () =>
      flowers
        .map((f) => {
          const sel = selection[f.id];
          if (!sel || sel.qty <= 0) return null;
          const color = f.colors.find((c) => c.key === sel.colorKey);
          return {
            flower: f,
            colorLabel: color?.label,
            qty: sel.qty,
            lineMinor: f.pricePerStemMinor * sel.qty,
          };
        })
        .filter((l): l is NonNullable<typeof l> => l !== null),
    [flowers, selection]
  );

  const stemCount = lines.reduce((sum, l) => sum + l.qty, 0);
  const flowersMinor = lines.reduce((sum, l) => sum + l.lineMinor, 0);
  const wrapMinor = selectedWrap?.priceMinor ?? 0;
  const cardMinor = cardOpen && cardMessage.trim() ? settings.card.priceMinor : 0;
  const totalMinor = flowersMinor + wrapMinor + cardMinor + settings.basePriceMinor;

  const belowMinimum = stemCount < settings.minStems;
  const aboveMaximum = stemCount > settings.maxStems;
  const canSubmit = !belowMinimum && !aboveMaximum && stemCount > 0 && !!wrapId;

  // ── Handlers ──────────────────────────────────────────

  const scrollToTop = useCallback(() => {
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const setQty = useCallback((flower: FlowerDTO, qty: number) => {
    setSelection((prev) => {
      const next = { ...prev };
      if (qty <= 0) {
        delete next[flower.id];
        return next;
      }
      next[flower.id] = {
        colorKey: prev[flower.id]?.colorKey || flower.colors.find((c) => c.available)?.key || '',
        qty,
      };
      return next;
    });
  }, []);

  const setColor = useCallback((flower: FlowerDTO, colorKey: string) => {
    setSelection((prev) => ({
      ...prev,
      [flower.id]: { colorKey, qty: prev[flower.id]?.qty ?? 1 },
    }));
  }, []);

  const handleAddToBag = useCallback(() => {
    if (!canSubmit || adding) return;
    setAdding(true);
    try {
      const config = {
        flowers: lines.map((l) => ({
          flowerId: l.flower.id,
          colorKey: selection[l.flower.id]?.colorKey ?? '',
          qty: l.qty,
        })),
        wrapId,
        cardMessage: cardOpen && cardMessage.trim() ? cardMessage.trim() : undefined,
      };
      const hash = configHashOf(selection, wrapId, cardOpen ? cardMessage : '');
      addItem(
        {
          id: `bouquet:${hash}`,
          name: `Custom Bouquet (${stemCount} stems)`,
          image: selectedWrap?.imageUrl || lines[0]?.flower.imageUrl || '/placeholder-product.png',
          price: totalMinor / 100,
          kind: 'bouquet',
          configHash: hash,
          customization: config,
          compositionSummary: [
            ...lines.map((l) => ({
              label: l.colorLabel ? `${l.flower.name} — ${l.colorLabel}` : l.flower.name,
              value: `×${l.qty}`,
            })),
            ...(selectedWrap ? [{ label: 'Wrap', value: `${selectedWrap.name} (${selectedWrap.material})` }] : []),
          ],
          hasCard: Boolean(cardOpen && cardMessage.trim()),
        },
        1
      );
      toast.success('Bouquet added to your bag');
      router.push('/cart');
    } catch {
      toast.error('Could not add this bouquet. Please try again.');
    } finally {
      setAdding(false);
    }
  }, [canSubmit, adding, lines, selection, wrapId, cardOpen, cardMessage, stemCount, selectedWrap, totalMinor, addItem, router]);

  // ── Render ────────────────────────────────────────────

  return (
    <div className="bg-white min-h-screen pb-24" ref={topRef}>
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-6 lg:py-10">

        {/* ── Breadcrumb ──────────────────────────────── */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/" />}>Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Build Your Bouquet</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* ── Header ──────────────────────────────────── */}
        <header className="text-center mb-8">
          <h1
            className="text-3xl lg:text-4xl font-light text-[#1a1a1a]"
            style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}
          >
            Build Your Own Bouquet
          </h1>
          <p className="text-sm text-neutral-500 mt-3 max-w-md mx-auto leading-relaxed">
            Choose your flowers, pick a wrapping, and add a handwritten card.
          </p>
        </header>

        {/* ── Tabs (underline centered) ────────────────── */}
        <Tabs
          value={activeStep}
          onValueChange={(v) => {
            setActiveStep(v as StepKey);
            setTimeout(() => scrollToTop(), 100);
          }}
          className="w-full"
        >
          <div className="flex justify-center mb-8">
            <TabsList variant="line" className="gap-6 sm:gap-10">
              {STEP_KEYS.map((key) => {
                const meta = STEP_META[key];
                const Icon = meta.icon;
                const stepIdx = STEP_KEYS.indexOf(key);
                const activeIdx = STEP_KEYS.indexOf(activeStep);
                const isDone = stepIdx < activeIdx;

                return (
                  <TabsTrigger
                    key={key}
                    value={key}
                    className="flex items-center gap-2 px-1 pb-2 text-[12px] sm:text-[13px] tracking-[0.08em] uppercase data-active:text-[#1a1a1a] text-neutral-400"
                  >
                    {isDone ? (
                      <Check className="w-3.5 h-3.5 text-green-600" />
                    ) : (
                      <Icon className="w-3.5 h-3.5" />
                    )}
                    <span className="hidden sm:inline">{meta.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          {/* Stem progress */}
          {stemCount > 0 && activeStep === 'flowers' && (
            <div className="mb-6 max-w-md mx-auto">
              <div className="flex items-center justify-between text-[11px] mb-1.5">
                <span className="text-neutral-500">
                  {stemCount} of {settings.minStems} min stems
                </span>
                <span className={`font-medium ${belowMinimum ? 'text-amber-600' : 'text-green-600'}`}>
                  {belowMinimum ? `${settings.minStems - stemCount} more needed` : '✓ Ready'}
                </span>
              </div>
              <div className="w-full h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (stemCount / settings.minStems) * 100)}%`,
                    backgroundColor: belowMinimum ? '#D97706' : '#22C55E',
                  }}
                />
              </div>
            </div>
          )}

          {/* ── TAB: Flowers ───────────────────────────── */}
          <TabsContent value="flowers">
            {/* Filters toggle */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-[11px] uppercase tracking-widest text-neutral-400">
                {stemCount > 0 && `${stemCount} stem${stemCount !== 1 ? 's' : ''} selected`}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFiltersOpen(!filtersOpen)}
                className="text-[11px] uppercase tracking-widest gap-1.5"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Filters
                {(seasonFilter !== 'all' || colorFilter !== 'all') && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1a1a1a] ml-1" />
                )}
              </Button>
            </div>

            {/* Filter bar */}
            {filtersOpen && (
              <div className="space-y-3 mb-8 p-4 border border-neutral-200 rounded-lg animate-in slide-in-from-top-2 duration-200">
                {allSeasons.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] uppercase tracking-widest text-neutral-400 mr-1 w-12">Season</span>
                    {['all', ...allSeasons].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSeasonFilter(s)}
                        className={`text-[11px] px-3 py-1.5 rounded-full transition-all border ${
                          seasonFilter === s
                            ? 'bg-[#1a1a1a] text-white border-[#1a1a1a]'
                            : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'
                        }`}
                      >
                        {s === 'all' ? 'All' : SEASON_LABELS[s] || s}
                      </button>
                    ))}
                  </div>
                )}

                {allColors.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] uppercase tracking-widest text-neutral-400 mr-1 w-12">Color</span>
                    <button
                      type="button"
                      onClick={() => setColorFilter('all')}
                      className={`text-[11px] px-3 py-1.5 rounded-full transition-all border ${
                        colorFilter === 'all'
                          ? 'bg-[#1a1a1a] text-white border-[#1a1a1a]'
                          : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'
                      }`}
                    >
                      All
                    </button>
                    {allColors.map((c) => (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => setColorFilter(c.key)}
                        className={`flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full transition-all border ${
                          colorFilter === c.key
                            ? 'bg-[#1a1a1a] text-white border-[#1a1a1a]'
                            : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'
                        }`}
                      >
                        <span className="w-3 h-3 rounded-full border border-neutral-300 shrink-0" style={{ backgroundColor: c.swatchHex }} />
                        {c.label}
                      </button>
                    ))}
                  </div>
                )}

                {(seasonFilter !== 'all' || colorFilter !== 'all') && (
                  <button
                    type="button"
                    onClick={() => { setSeasonFilter('all'); setColorFilter('all'); }}
                    className="text-[10px] uppercase tracking-widest text-neutral-400 hover:text-neutral-600 underline underline-offset-2"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}

            {/* Flower grid */}
            {filteredFlowers.length === 0 ? (
              <div className="text-center py-20">
                <Flower2 className="w-8 h-8 text-neutral-300 mx-auto mb-3" />
                <p className="text-sm text-neutral-400">No flowers match your filters.</p>
                <Button variant="link" size="sm" onClick={() => { setSeasonFilter('all'); setColorFilter('all'); }} className="mt-2">
                  Clear filters
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-10">
                {filteredFlowers.map((flower) => {
                  const sel = selection[flower.id];
                  return (
                    <FlowerCard
                      key={flower.id}
                      flower={flower}
                      qty={sel?.qty ?? 0}
                      colorKey={sel?.colorKey ?? ''}
                      maxReached={aboveMaximum}
                      onSetQty={(q) => setQty(flower, q)}
                      onSetColor={(k) => setColor(flower, k)}
                    />
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ── TAB: Wrapping ──────────────────────────── */}
          <TabsContent value="wrapping">
            {wraps.length === 0 ? (
              <div className="text-center py-20">
                <Gift className="w-8 h-8 text-neutral-300 mx-auto mb-3" />
                <p className="text-sm text-neutral-400">No wrapping options available.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-8">
                {wraps.map((wrap) => (
                  <WrapCard key={wrap.id} wrap={wrap} selected={wrapId === wrap.id} onSelect={() => setWrapId(wrap.id)} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── TAB: Card ──────────────────────────────── */}
          <TabsContent value="card">
            <div className="max-w-lg mx-auto">
              {settings.card.enabled ? (
                <div className="space-y-6">
                  <label className="flex items-start gap-4 cursor-pointer group">
                    <div className="relative mt-0.5">
                      <input type="checkbox" checked={cardOpen} onChange={(e) => setCardOpen(e.target.checked)} className="sr-only peer" />
                      <div className="w-5 h-5 border-2 border-neutral-300 rounded peer-checked:border-[#1a1a1a] peer-checked:bg-[#1a1a1a] transition-all flex items-center justify-center">
                        {cardOpen && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </div>
                    <div>
                      <span className="text-sm text-[#1a1a1a] font-medium">Add a handwritten card</span>
                      {settings.card.priceMinor > 0 && (
                        <Badge variant="secondary" className="ml-2 text-[10px] font-mono">
                          + {piastersToCurrency(settings.card.priceMinor)}
                        </Badge>
                      )}
                      <p className="text-[11px] text-neutral-400 mt-1">
                        We&apos;ll write your message by hand on a premium card.
                      </p>
                    </div>
                  </label>

                  {cardOpen && (
                    <div className="border border-neutral-200 rounded-lg p-5 space-y-4 animate-in slide-in-from-top-2 duration-200">
                      <textarea
                        value={cardMessage}
                        onChange={(e) => setCardMessage(e.target.value.slice(0, settings.card.maxLength))}
                        maxLength={settings.card.maxLength}
                        rows={4}
                        placeholder="Write your message…"
                        className="w-full border border-neutral-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a1a]/20 focus:border-[#1a1a1a] transition-all resize-none"
                      />
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] uppercase tracking-widest text-neutral-400">Your message, in our handwriting</span>
                        <span className="font-mono tabular-nums text-xs text-neutral-400">{cardMessage.length} / {settings.card.maxLength}</span>
                      </div>
                      {cardMessage.trim() && (
                        <>
                          <Separator />
                          <div>
                            <p className="text-[10px] uppercase tracking-widest text-neutral-400 mb-2">Preview</p>
                            <p className="text-lg text-[#1a1a1a] italic whitespace-pre-wrap leading-relaxed" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
                              &ldquo;{cardMessage}&rdquo;
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {!cardOpen && (
                    <p className="text-[11px] text-neutral-400 italic">You can skip this step — a card is optional.</p>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <PenLine className="w-6 h-6 text-neutral-300 mx-auto mb-3" />
                  <p className="text-sm text-neutral-400">Card messages are not available at the moment.</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── TAB: Review ────────────────────────────── */}
          <TabsContent value="review">
            <div className="max-w-lg mx-auto border border-neutral-200 rounded-lg p-4 sm:p-6">
              <OrderSummary
                lines={lines}
                selectedWrap={selectedWrap}
                wrapMinor={wrapMinor}
                cardOpen={cardOpen}
                cardMessage={cardMessage}
                cardMinor={cardMinor}
                basePriceMinor={settings.basePriceMinor}
                totalMinor={totalMinor}
                stemCount={stemCount}
                settings={settings}
              />

              {/* Add to Bag — large, prominent */}
              <div className="mt-6 pt-4 border-t border-neutral-100">
                <Button
                  size="lg"
                  disabled={!canSubmit || adding}
                  onClick={handleAddToBag}
                  className="w-full text-sm tracking-wide gap-2"
                >
                  <ShoppingBag className="w-4 h-4" />
                  {adding ? 'Adding…' : `Add to Bag · ${piastersToCurrency(totalMinor)}`}
                </Button>
                {!canSubmit && (
                  <p className="text-xs text-amber-600 text-center mt-2">
                    {belowMinimum
                      ? `Add ${settings.minStems - stemCount} more stem${settings.minStems - stemCount === 1 ? '' : 's'} (minimum ${settings.minStems})`
                      : aboveMaximum
                        ? `Too many stems (maximum ${settings.maxStems})`
                        : !wrapId
                          ? 'Please select a wrapping'
                          : 'Select flowers to continue'}
                  </p>
                )}
              </div>

              {/* Edit links */}
              <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-neutral-100">
                {(['flowers', 'wrapping', 'card'] as StepKey[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveStep(key)}
                    className="text-[11px] text-neutral-500 underline underline-offset-2 hover:text-neutral-700 capitalize"
                  >
                    Edit {STEP_META[key].label}
                  </button>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>

      </div>

      {/* ── Floating Bottom Bar ─────────────────────────── */}
      <div className="fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-md border-t border-neutral-200 shadow-[0_-4px_24px_rgba(0,0,0,0.06)]" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="max-w-[1100px] mx-auto px-3 sm:px-4 py-3 flex items-center justify-between gap-2 sm:gap-4">

          {/* Left: summary + mobile drawer */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink">
            {stemCount > 0 && (
              <Sheet>
                <SheetTrigger
                  render={
                    <button type="button" className="flex items-center gap-1.5 sm:gap-2 hover:opacity-70 transition-opacity min-w-0">
                      <span className="text-[10px] sm:text-[11px] uppercase tracking-widest text-neutral-500 whitespace-nowrap">
                        {stemCount} {stemCount === 1 ? 'stem' : 'stems'}
                      </span>
                      <span className="text-neutral-300 hidden sm:inline">·</span>
                      <span className="font-mono tabular-nums text-xs sm:text-sm text-[#1a1a1a] font-medium whitespace-nowrap">
                        {piastersToCurrency(totalMinor)}
                      </span>
                      <ChevronRight className="w-3 h-3 text-neutral-400 lg:hidden shrink-0" />
                    </button>
                  }
                />
                <SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>Your Bouquet</SheetTitle>
                  </SheetHeader>
                  <div className="p-4">
                    <OrderSummary
                      lines={lines}
                      selectedWrap={selectedWrap}
                      wrapMinor={wrapMinor}
                      cardOpen={cardOpen}
                      cardMessage={cardMessage}
                      cardMinor={cardMinor}
                      basePriceMinor={settings.basePriceMinor}
                      totalMinor={totalMinor}
                      stemCount={stemCount}
                      settings={settings}
                    />
                  </div>
                  <SheetFooter>
                    <Button
                      className="w-full"
                      size="lg"
                      disabled={!canSubmit || adding}
                      onClick={handleAddToBag}
                    >
                      <ShoppingBag className="w-4 h-4 mr-2" />
                      {adding ? 'Adding…' : `Add to Bag · ${piastersToCurrency(totalMinor)}`}
                    </Button>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
            )}
          </div>

          {/* Right: nav buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {activeStep !== 'flowers' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const idx = STEP_KEYS.indexOf(activeStep);
                  if (idx > 0) { setActiveStep(STEP_KEYS[idx - 1]); setTimeout(() => scrollToTop(), 100); }
                }}
                className="text-[10px] sm:text-[11px] uppercase tracking-widest gap-1 px-2.5 sm:px-3"
              >
                <ChevronLeft className="w-3 h-3" />
                Back
              </Button>
            )}

            {activeStep !== 'review' ? (
              <Button
                size="sm"
                onClick={() => {
                  const idx = STEP_KEYS.indexOf(activeStep);
                  if (idx < STEP_KEYS.length - 1) { setActiveStep(STEP_KEYS[idx + 1]); setTimeout(() => scrollToTop(), 100); }
                }}
                className="text-[10px] sm:text-[11px] uppercase tracking-widest gap-1 px-3 sm:px-4"
              >
                Next
                <ChevronRight className="w-3 h-3" />
              </Button>
            ) : (
              <Button
                size="sm"
                disabled={!canSubmit || adding}
                onClick={handleAddToBag}
                className="text-[10px] sm:text-[11px] uppercase tracking-widest gap-1.5 px-3 sm:px-4"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                {adding ? 'Adding…' : `Add to Bag · ${piastersToCurrency(totalMinor)}`}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
