'use client';

/**
 * Build Your Own Bouquet — storefront.
 *
 * Design language matches the PDP: white ground, Playfair headings,
 * uppercase tracking-widest micro-labels, sharp corners, mono money.
 *
 * Every price shown here is a display convenience. The server re-prices the
 * whole bouquet at checkout; nothing computed in this file is trusted.
 */

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Minus, Plus } from 'lucide-react';

import { useCart } from '@/features/cart/context/cart-context';
import { piastersToCurrency } from '@/lib/money/egp';
import type { FlowerDTO, WrapDTO, BouquetSettingsDTO } from '@/features/bouquet/types';

interface Props {
  flowers: FlowerDTO[];
  wraps: WrapDTO[];
  settings: BouquetSettingsDTO;
}

/** Selection state: flowerId -> { colorKey, qty }. */
type Selection = Record<string, { colorKey: string; qty: number }>;

/**
 * Stable hash of the configuration. Part of cart identity so two differently
 * composed bouquets occupy two lines instead of merging.
 */
function configHashOf(selection: Selection, wrapId: string, cardMessage: string): string {
  const normalized = JSON.stringify({
    flowers: Object.entries(selection)
      .filter(([, v]) => v.qty > 0)
      .map(([id, v]) => [id, v.colorKey, v.qty])
      .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
    wrapId,
    cardMessage: cardMessage.trim(),
  });

  // Small, dependency-free string hash — this is an identity key, not a
  // security primitive.
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash << 5) - hash + normalized.charCodeAt(i);
    hash |= 0;
  }
  return `bq_${(hash >>> 0).toString(36)}`;
}

export function BouquetBuilder({ flowers, wraps, settings }: Props) {
  const router = useRouter();
  const { addItem } = useCart();

  const [selection, setSelection] = useState<Selection>({});
  const [wrapId, setWrapId] = useState<string>('');
  const [cardOpen, setCardOpen] = useState(false);
  const [cardMessage, setCardMessage] = useState('');
  const [adding, setAdding] = useState(false);

  const selectedWrap = wraps.find((w) => w.id === wrapId);

  // ── Derived totals (display only) ───────────────────────────
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

  const blockReason = belowMinimum
    ? `${stemCount} OF ${settings.minStems} STEMS MINIMUM`
    : aboveMaximum
      ? `MAXIMUM ${settings.maxStems} STEMS`
      : !wrapId
        ? 'CHOOSE YOUR WRAPPING'
        : null;

  // ── Interaction ─────────────────────────────────────────────

  const setQty = (flower: FlowerDTO, qty: number) => {
    setSelection((prev) => {
      const next = { ...prev };
      if (qty <= 0) {
        delete next[flower.id];
        return next;
      }
      next[flower.id] = {
        // Default to the first available colour when the flower has colours.
        colorKey:
          prev[flower.id]?.colorKey ||
          flower.colors.find((c) => c.available)?.key ||
          '',
        qty,
      };
      return next;
    });
  };

  const setColor = (flower: FlowerDTO, colorKey: string) => {
    setSelection((prev) => ({
      ...prev,
      [flower.id]: { colorKey, qty: prev[flower.id]?.qty ?? 1 },
    }));
  };

  const handleAddToBag = () => {
    if (blockReason || adding) return;

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
          image:
            selectedWrap?.imageUrl ||
            lines[0]?.flower.imageUrl ||
            '/placeholder-product.png',
          // Cart context works in EGP pounds; the server re-prices in piasters.
          price: totalMinor / 100,
          kind: 'bouquet',
          configHash: hash,
          customization: config,
          compositionSummary: [
            ...lines.map((l) => ({
              label: l.colorLabel ? `${l.flower.name} — ${l.colorLabel}` : l.flower.name,
              value: `×${l.qty}`,
            })),
            ...(selectedWrap
              ? [{ label: 'Wrap', value: `${selectedWrap.name} (${selectedWrap.material})` }]
              : []),
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
  };

  // ── Render ──────────────────────────────────────────────────

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-[1100px] mx-auto px-4 py-12 lg:py-20">
        {/* Header */}
        <header className="mb-14 max-w-xl">
          <p className="text-[11px] uppercase tracking-widest text-neutral-500 mb-4">
            Made to order
          </p>
          <h1 className="text-3xl lg:text-5xl font-light text-[#292827] font-[family-name:var(--font-playfair)]">
            Build Your Own Bouquet
          </h1>
          <p className="text-sm text-neutral-600 mt-5 leading-relaxed">
            Choose your flowers stem by stem, pick a wrapping, and add a handwritten
            card. We arrange it fresh on the day of delivery.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-12 lg:gap-16 items-start">
          {/* ── Left column ──────────────────────────────────── */}
          <div className="space-y-16">
            {/* 01 — Flowers */}
            <section>
              <div className="flex items-baseline gap-3 mb-6">
                <span className="text-[11px] uppercase tracking-widest text-neutral-400">01</span>
                <h2 className="text-[11px] uppercase tracking-widest text-neutral-900 font-semibold">
                  Choose your flowers
                </h2>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-8">
                {flowers.map((flower) => {
                  const sel = selection[flower.id];
                  const qty = sel?.qty ?? 0;
                  const activeColor = flower.colors.find((c) => c.key === sel?.colorKey);
                  const image = activeColor?.imageUrl || flower.imageUrl;

                  return (
                    <div
                      key={flower.id}
                      className={flower.selectable ? '' : 'opacity-50 pointer-events-none'}
                    >
                      <div className="relative aspect-[3/4] bg-neutral-100 overflow-hidden mb-3">
                        {image && (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={image}
                            alt={flower.name}
                            className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                          />
                        )}

                        {!flower.selectable && (
                          <div className="absolute inset-x-0 bottom-0 bg-white/95 py-2 text-center">
                            <span className="text-[10px] uppercase tracking-widest text-neutral-600">
                              {flower.inSeason ? 'Currently unavailable' : 'Back in season soon'}
                            </span>
                          </div>
                        )}
                      </div>

                      <h3 className="text-sm text-[#292827]">{flower.name}</h3>
                      <p className="font-mono tabular-nums text-xs text-neutral-500 mt-0.5">
                        {piastersToCurrency(flower.pricePerStemMinor)} / stem
                      </p>

                      {/* Colours */}
                      {flower.colors.length > 0 && (
                        <div className="flex gap-1.5 mt-3">
                          {flower.colors.map((c) => (
                            <button
                              key={c.key}
                              type="button"
                              disabled={!c.available}
                              onClick={() => setColor(flower, c.key)}
                              title={c.available ? c.label : `${c.label} — out of stock`}
                              aria-label={c.label}
                              className={`w-4 h-4 border transition-all ${
                                sel?.colorKey === c.key
                                  ? 'border-black border-2'
                                  : 'border-neutral-300 hover:border-black'
                              } ${c.available ? '' : 'opacity-30 cursor-not-allowed'}`}
                              style={{ backgroundColor: c.swatchHex }}
                            />
                          ))}
                        </div>
                      )}

                      {/* Stepper */}
                      <div className="flex items-center gap-3 mt-4">
                        <button
                          type="button"
                          onClick={() => setQty(flower, qty - 1)}
                          disabled={qty === 0}
                          className="w-7 h-7 border border-neutral-300 flex items-center justify-center hover:border-black disabled:opacity-30 disabled:hover:border-neutral-300 transition-colors"
                          aria-label={`Remove one ${flower.name}`}
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-mono tabular-nums text-sm w-6 text-center">
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQty(flower, qty + 1)}
                          disabled={stemCount >= settings.maxStems}
                          className="w-7 h-7 border border-neutral-300 flex items-center justify-center hover:border-black disabled:opacity-30 transition-colors"
                          aria-label={`Add one ${flower.name}`}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 02 — Wrapping */}
            <section>
              <div className="flex items-baseline gap-3 mb-6">
                <span className="text-[11px] uppercase tracking-widest text-neutral-400">02</span>
                <h2 className="text-[11px] uppercase tracking-widest text-neutral-900 font-semibold">
                  Choose your wrapping
                </h2>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {wraps.map((wrap) => (
                  <button
                    key={wrap.id}
                    type="button"
                    onClick={() => setWrapId(wrap.id)}
                    className={`text-left border p-3 transition-colors ${
                      wrapId === wrap.id
                        ? 'border-black'
                        : 'border-neutral-200 hover:border-neutral-400'
                    }`}
                  >
                    <div
                      className="aspect-[4/3] bg-neutral-100 mb-3 overflow-hidden"
                      style={wrap.swatchHex ? { backgroundColor: wrap.swatchHex } : undefined}
                    >
                      {wrap.imageUrl && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={wrap.imageUrl}
                          alt={wrap.name}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <p className="text-sm text-[#292827]">{wrap.name}</p>
                    <p className="text-[10px] uppercase tracking-widest text-neutral-500 mt-1">
                      {wrap.material}
                    </p>
                    <p className="font-mono tabular-nums text-xs text-neutral-500 mt-1">
                      {wrap.priceMinor === 0 ? 'Included' : `+${piastersToCurrency(wrap.priceMinor)}`}
                    </p>
                  </button>
                ))}
              </div>
            </section>

            {/* 03 — Card */}
            {settings.card.enabled && (
              <section>
                <div className="flex items-baseline gap-3 mb-6">
                  <span className="text-[11px] uppercase tracking-widest text-neutral-400">03</span>
                  <h2 className="text-[11px] uppercase tracking-widest text-neutral-900 font-semibold">
                    Add a card
                  </h2>
                </div>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cardOpen}
                    onChange={(e) => setCardOpen(e.target.checked)}
                    className="accent-black"
                  />
                  <span className="text-[11px] uppercase tracking-widest text-neutral-900">
                    Add a handwritten card
                    {settings.card.priceMinor > 0 && (
                      <span className="font-mono tabular-nums text-neutral-500 ml-2 normal-case tracking-normal">
                        +{piastersToCurrency(settings.card.priceMinor)}
                      </span>
                    )}
                  </span>
                </label>

                {cardOpen && (
                  <div className="mt-5 border border-neutral-200 p-5 space-y-4">
                    <textarea
                      value={cardMessage}
                      onChange={(e) => setCardMessage(e.target.value.slice(0, settings.card.maxLength))}
                      maxLength={settings.card.maxLength}
                      rows={4}
                      placeholder="Write your message…"
                      className="w-full border border-neutral-200 p-3 text-sm focus:outline-none focus:border-black transition-colors resize-none"
                    />

                    <div className="flex justify-between items-center">
                      <span className="text-[10px] uppercase tracking-widest text-neutral-400">
                        Your message, in our handwriting
                      </span>
                      <span className="font-mono tabular-nums text-xs text-neutral-400">
                        {cardMessage.length} / {settings.card.maxLength}
                      </span>
                    </div>

                    {cardMessage.trim() && (
                      <p className="font-[family-name:var(--font-playfair)] text-lg text-[#292827] italic border-t border-neutral-100 pt-4 whitespace-pre-wrap">
                        {cardMessage}
                      </p>
                    )}
                  </div>
                )}
              </section>
            )}
          </div>

          {/* ── Summary rail ─────────────────────────────────── */}
          <aside className="lg:sticky lg:top-24">
            <div className="border border-neutral-200 p-6 space-y-5">
              <h2 className="text-[11px] uppercase tracking-widest text-neutral-900 font-semibold">
                Your bouquet
              </h2>

              {lines.length === 0 ? (
                <p className="text-sm text-neutral-400">
                  No flowers chosen yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {lines.map((l) => (
                    <div key={l.flower.id} className="flex justify-between gap-3 text-sm">
                      <span className="text-neutral-700 min-w-0">
                        {l.qty} × {l.flower.name}
                        {l.colorLabel && (
                          <span className="text-neutral-400"> — {l.colorLabel}</span>
                        )}
                      </span>
                      <span className="font-mono tabular-nums text-neutral-900 whitespace-nowrap">
                        {piastersToCurrency(l.lineMinor)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-neutral-200 pt-4 space-y-2 text-sm">
                {selectedWrap && (
                  <div className="flex justify-between gap-3">
                    <span className="text-neutral-700">Wrap — {selectedWrap.name}</span>
                    <span className="font-mono tabular-nums">
                      {wrapMinor === 0 ? '—' : piastersToCurrency(wrapMinor)}
                    </span>
                  </div>
                )}

                {cardMinor > 0 && (
                  <div className="flex justify-between gap-3">
                    <span className="text-neutral-700">Handwritten card</span>
                    <span className="font-mono tabular-nums">
                      {piastersToCurrency(cardMinor)}
                    </span>
                  </div>
                )}

                {settings.basePriceMinor > 0 && (
                  <div className="flex justify-between gap-3">
                    <span className="text-neutral-700">Arrangement</span>
                    <span className="font-mono tabular-nums">
                      {piastersToCurrency(settings.basePriceMinor)}
                    </span>
                  </div>
                )}
              </div>

              <div className="border-t border-neutral-200 pt-4 flex justify-between items-baseline">
                <span className="text-[11px] uppercase tracking-widest text-neutral-900 font-semibold">
                  Total
                </span>
                <span className="font-mono tabular-nums text-lg text-[#292827]">
                  {piastersToCurrency(totalMinor)}
                </span>
              </div>

              <button
                type="button"
                onClick={handleAddToBag}
                disabled={!!blockReason || adding}
                className="w-full py-4 text-[11px] uppercase tracking-widest font-semibold transition-colors disabled:cursor-not-allowed"
                style={{
                  backgroundColor: blockReason ? '#E5E5E5' : '#D0D48D',
                  color: blockReason ? '#8A8A8A' : '#292827',
                }}
              >
                {blockReason ?? `Add to bag · ${piastersToCurrency(totalMinor)}`}
              </button>

              <p className="text-[10px] uppercase tracking-widest text-neutral-400 text-center">
                {stemCount} {stemCount === 1 ? 'stem' : 'stems'}
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
