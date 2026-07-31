/**
 * Bouquet service — catalogue reads and server-side pricing.
 */

import { getSettings } from '@/lib/db/models/store-settings.model';
import { ValidationError } from '@/lib/errors';
import { bouquetRepository, toFlowerDTO, toWrapDTO, currentSeason } from './bouquet.repository';
import type { BouquetConfig } from '../schemas';
import type {
  BouquetCatalogDTO,
  BouquetSettingsDTO,
  FlowerDTO,
  WrapDTO,
  PricedBouquet,
} from '../types';

const DEFAULT_SETTINGS: BouquetSettingsDTO = {
  enabled: false,
  minStems: 5,
  maxStems: 100,
  basePriceMinor: 0,
  card: { enabled: true, priceMinor: 0, maxLength: 200 },
};

export async function getBouquetSettings(): Promise<BouquetSettingsDTO> {
  const settings = await getSettings();
  const b = settings.bouquetBuilder;
  if (!b) return DEFAULT_SETTINGS;

  return {
    enabled: b.enabled ?? false,
    minStems: b.minStems ?? DEFAULT_SETTINGS.minStems,
    maxStems: b.maxStems ?? DEFAULT_SETTINGS.maxStems,
    basePriceMinor: b.basePriceMinor ?? 0,
    card: {
      enabled: b.card?.enabled ?? true,
      priceMinor: b.card?.priceMinor ?? 0,
      maxLength: b.card?.maxLength ?? DEFAULT_SETTINGS.card.maxLength,
    },
  };
}

/**
 * Everything the storefront builder needs, in one read.
 * Out-of-season flowers are included (dimmed in the UI, not hidden) — that is
 * a merchandising decision, so the DTO carries `selectable` rather than
 * filtering them out.
 */
export async function getActiveCatalog(): Promise<BouquetCatalogDTO> {
  const season = currentSeason();

  const [flowerDocs, wrapDocs, settings] = await Promise.all([
    bouquetRepository.listFlowers(),
    bouquetRepository.listWraps(),
    getBouquetSettings(),
  ]);

  const flowers: FlowerDTO[] = flowerDocs.map((d) => toFlowerDTO(d, season));
  const wraps: WrapDTO[] = wrapDocs.map(toWrapDTO).filter((w) => w.available);

  return { flowers, wraps, settings };
}

/** Admin view — includes drafts and archived records. */
export async function getAdminCatalog(): Promise<BouquetCatalogDTO> {
  const season = currentSeason();

  const [flowerDocs, wrapDocs, settings] = await Promise.all([
    bouquetRepository.listFlowers(true),
    bouquetRepository.listWraps(true),
    getBouquetSettings(),
  ]);

  return {
    flowers: flowerDocs.map((d) => toFlowerDTO(d, season)),
    wraps: wrapDocs.map(toWrapDTO),
    settings,
  };
}

/**
 * Price a guest-submitted bouquet configuration.
 *
 * This is the trust boundary: every price is re-read from the database and
 * every availability rule re-checked. The client's total is display-only.
 *
 * Throws ValidationError with a customer-facing message on any violation.
 */
export async function priceBouquet(config: BouquetConfig): Promise<PricedBouquet> {
  const settings = await getBouquetSettings();

  if (!settings.enabled) {
    throw new ValidationError('The bouquet builder is not currently available', {});
  }

  const season = currentSeason();

  // ── Flowers ─────────────────────────────────────────────────
  const flowerIds = config.flowers.map((f) => f.flowerId);
  const flowerDocs = await bouquetRepository.findFlowersByIds(flowerIds);
  const byId = new Map(flowerDocs.map((d) => [d._id.toString(), d]));

  const pricedFlowers: PricedBouquet['flowers'] = [];
  let stemCount = 0;
  let flowersMinor = 0;

  for (const chosen of config.flowers) {
    const doc = byId.get(chosen.flowerId);
    if (!doc) {
      throw new ValidationError('One of the chosen flowers is no longer available', {});
    }

    const dto = toFlowerDTO(doc, season);
    if (dto.status !== 'active' || !dto.selectable) {
      throw new ValidationError(`${dto.name} is not available right now`, {});
    }

    // Colour is optional, but if the flower defines colours the chosen one
    // must exist and be available.
    let colorKey = '';
    let colorLabel = '';
    if (dto.colors.length > 0) {
      const color = dto.colors.find((c) => c.key === chosen.colorKey);
      if (!color) {
        throw new ValidationError(`Choose a colour for ${dto.name}`, {});
      }
      if (!color.available) {
        throw new ValidationError(`${dto.name} — ${color.label} is out of stock`, {});
      }
      colorKey = color.key;
      colorLabel = color.label;
    }

    // Price comes from the database, never from the client.
    const perStemMinor = doc.pricePerStemMinor;
    const lineMinor = perStemMinor * chosen.qty;

    stemCount += chosen.qty;
    flowersMinor += lineMinor;

    pricedFlowers.push({
      flowerId: dto.id,
      name: dto.name,
      colorKey,
      colorLabel,
      qty: chosen.qty,
      perStemMinor,
      lineMinor,
    });
  }

  if (stemCount < settings.minStems) {
    throw new ValidationError(
      `A bouquet needs at least ${settings.minStems} stems`,
      {},
    );
  }
  if (stemCount > settings.maxStems) {
    throw new ValidationError(
      `A bouquet can hold at most ${settings.maxStems} stems`,
      {},
    );
  }

  // ── Wrapping ────────────────────────────────────────────────
  const wrapDoc = await bouquetRepository.findWrapById(config.wrapId);
  if (!wrapDoc || wrapDoc.status !== 'active' || !wrapDoc.available) {
    throw new ValidationError('The chosen wrapping is no longer available', {});
  }
  const wrapPriceMinor = wrapDoc.priceMinor;

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
  const totalMinor = flowersMinor + wrapPriceMinor + cardPriceMinor + basePriceMinor;

  // Human-readable lines reused by the order snapshot, admin table and emails.
  const summaryLines = [
    ...pricedFlowers.map((f) => ({
      label: f.colorLabel ? `${f.name} — ${f.colorLabel}` : f.name,
      value: `×${f.qty}`,
    })),
    { label: 'Wrap', value: `${wrapDoc.name} (${wrapDoc.material})` },
    ...(cardMessage ? [{ label: 'Card', value: cardMessage }] : []),
  ];

  return {
    flowers: pricedFlowers,
    wrap: {
      wrapId: wrapDoc._id.toString(),
      name: wrapDoc.name,
      material: wrapDoc.material,
      priceMinor: wrapPriceMinor,
    },
    cardMessage,
    cardPriceMinor,
    basePriceMinor,
    stemCount,
    totalMinor,
    summaryLines,
  };
}

export const bouquetService = {
  getBouquetSettings,
  getActiveCatalog,
  getAdminCatalog,
  priceBouquet,
};
