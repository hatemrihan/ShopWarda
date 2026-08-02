/**
 * Bouquet service — catalogue reads and server-side pricing.
 */

import { getSettings } from '@/lib/db/models/store-settings.model';
import { priceBouquetAgainst } from '../pricing';
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
  minStems: 1,
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

// Pure pricing lives in ../pricing.ts (no database imports) so it can be
// unit tested. Re-exported here for existing callers.
export { priceBouquetAgainst, type PricingCatalog } from '../pricing';

/**
 * Price a guest-submitted bouquet configuration.
 *
 * This is the trust boundary: the catalogue is re-read from the database and
 * every rule re-checked. The client's total is display-only.
 */
export async function priceBouquet(config: BouquetConfig): Promise<PricedBouquet> {
  const season = currentSeason();

  const [flowerDocs, wrapDocs, settings] = await Promise.all([
    bouquetRepository.findFlowersByIds(config.flowers.map((f) => f.flowerId)),
    bouquetRepository.listWraps(),
    getBouquetSettings(),
  ]);

  return priceBouquetAgainst(config, {
    flowers: flowerDocs.map((d) => toFlowerDTO(d, season)),
    wraps: wrapDocs.map(toWrapDTO),
    settings,
  });
}

export const bouquetService = {
  getBouquetSettings,
  getActiveCatalog,
  getAdminCatalog,
  priceBouquet,
  priceBouquetAgainst,
};
