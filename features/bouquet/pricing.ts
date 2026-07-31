/**
 * Bouquet pricing — pure, no I/O and no database imports.
 *
 * Kept free of server dependencies so every rule (availability, season,
 * colour stock, min/max stems, card length) is unit-testable without a
 * MongoDB connection. All money is integer piasters.
 */

import { ValidationError } from '@/lib/errors';
import type { BouquetConfig } from './schemas';
import type { BouquetSettingsDTO, FlowerDTO, WrapDTO, PricedBouquet } from './types';

/** The catalogue snapshot pricing is computed against. */
export interface PricingCatalog {
  flowers: FlowerDTO[];
  wraps: WrapDTO[];
  settings: BouquetSettingsDTO;
}

/**
 * Price a bouquet configuration against a catalogue snapshot.
 *
 * Pure — no I/O — so every rule (availability, season, colour stock,
 * min/max stems, card length) is unit-testable. `priceBouquet` below is the
 * thin wrapper that reads the catalogue from the database first.
 *
 * Throws ValidationError with a customer-facing message on any violation.
 */
export function priceBouquetAgainst(
  config: BouquetConfig,
  catalog: PricingCatalog,
): PricedBouquet {
  const { settings } = catalog;

  if (!settings.enabled) {
    throw new ValidationError('The bouquet builder is not currently available', {});
  }

  const byId = new Map(catalog.flowers.map((f) => [f.id, f]));

  const pricedFlowers: PricedBouquet['flowers'] = [];
  let stemCount = 0;
  let flowersMinor = 0;

  for (const chosen of config.flowers) {
    const flower = byId.get(chosen.flowerId);
    if (!flower) {
      throw new ValidationError('One of the chosen flowers is no longer available', {});
    }
    if (flower.status !== 'active' || !flower.selectable) {
      throw new ValidationError(`${flower.name} is not available right now`, {});
    }

    // Colour is optional, but if the flower defines colours the chosen one
    // must exist and be available.
    let colorKey = '';
    let colorLabel = '';
    if (flower.colors.length > 0) {
      const color = flower.colors.find((c) => c.key === chosen.colorKey);
      if (!color) {
        throw new ValidationError(`Choose a colour for ${flower.name}`, {});
      }
      if (!color.available) {
        throw new ValidationError(`${flower.name} — ${color.label} is out of stock`, {});
      }
      colorKey = color.key;
      colorLabel = color.label;
    }

    // Price comes from the catalogue, never from the client.
    const perStemMinor = flower.pricePerStemMinor;
    const lineMinor = perStemMinor * chosen.qty;

    stemCount += chosen.qty;
    flowersMinor += lineMinor;

    pricedFlowers.push({
      flowerId: flower.id,
      name: flower.name,
      colorKey,
      colorLabel,
      qty: chosen.qty,
      perStemMinor,
      lineMinor,
    });
  }

  if (stemCount < settings.minStems) {
    throw new ValidationError(`A bouquet needs at least ${settings.minStems} stems`, {});
  }
  if (stemCount > settings.maxStems) {
    throw new ValidationError(`A bouquet can hold at most ${settings.maxStems} stems`, {});
  }

  // ── Wrapping ────────────────────────────────────────────────
  const wrap = catalog.wraps.find((w) => w.id === config.wrapId);
  if (!wrap || wrap.status !== 'active' || !wrap.available) {
    throw new ValidationError('The chosen wrapping is no longer available', {});
  }

  // ── Card ────────────────────────────────────────────────────
  let cardMessage: string | undefined;
  let cardPriceMinor = 0;

  const trimmedMessage = config.cardMessage?.trim();
  if (trimmedMessage) {
    if (!settings.card.enabled) {
      throw new ValidationError('Gift cards are not available right now', {});
    }
    if (trimmedMessage.length > settings.card.maxLength) {
      throw new ValidationError(
        `Card message must be ${settings.card.maxLength} characters or fewer`,
        {},
      );
    }
    cardMessage = trimmedMessage;
    cardPriceMinor = settings.card.priceMinor;
  }

  const basePriceMinor = settings.basePriceMinor;
  const totalMinor = flowersMinor + wrap.priceMinor + cardPriceMinor + basePriceMinor;

  // Human-readable lines reused by the order snapshot, admin table and emails.
  const summaryLines = [
    ...pricedFlowers.map((f) => ({
      label: f.colorLabel ? `${f.name} — ${f.colorLabel}` : f.name,
      value: `×${f.qty}`,
    })),
    { label: 'Wrap', value: `${wrap.name} (${wrap.material})` },
    ...(cardMessage ? [{ label: 'Card', value: cardMessage }] : []),
  ];

  return {
    flowers: pricedFlowers,
    wrap: {
      wrapId: wrap.id,
      name: wrap.name,
      material: wrap.material,
      priceMinor: wrap.priceMinor,
    },
    cardMessage,
    cardPriceMinor,
    basePriceMinor,
    stemCount,
    totalMinor,
    summaryLines,
  };
}

