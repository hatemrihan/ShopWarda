/**
 * Bouquet repository — data access only, no business logic.
 */

import connectDB from '@/lib/db/mongoose';
import {
  BouquetFlower,
  BouquetWrap,
  type IBouquetFlower,
  type IBouquetWrap,
} from '@/lib/db/models/bouquet.model';
import type { FlowerDTO, WrapDTO } from '../types';

/** Northern-hemisphere meteorological seasons; the shop is in Egypt. */
export function currentSeason(date = new Date()): 'spring' | 'summer' | 'autumn' | 'winter' {
  const month = date.getMonth(); // 0-indexed
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'autumn';
  return 'winter';
}

export function toFlowerDTO(doc: IBouquetFlower, season = currentSeason()): FlowerDTO {
  // An empty season list means year-round.
  const inSeason = !doc.seasons?.length || doc.seasons.includes(season);
  const colors = (doc.colors ?? [])
    .map((c) => ({
      key: c.key,
      label: c.label,
      swatchHex: c.swatchHex,
      imageUrl: c.imageUrl,
      available: c.available,
      sortOrder: c.sortOrder ?? 0,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const media = (doc.media ?? []).map((m) => ({ publicUrl: m.publicUrl, alt: m.alt }));

  // A flower with no colours defined is still selectable — colour is optional.
  const hasSelectableColor = colors.length === 0 || colors.some((c) => c.available);

  return {
    id: doc._id.toString(),
    name: doc.name,
    nameAr: doc.nameAr,
    slug: doc.slug,
    pricePerStemMinor: doc.pricePerStemMinor,
    colors,
    seasons: doc.seasons ?? [],
    available: doc.available,
    media,
    imageUrl: media[0]?.publicUrl,
    sortOrder: doc.sortOrder ?? 0,
    inSeason,
    selectable: doc.available && inSeason && hasSelectableColor,
  };
}

export function toWrapDTO(doc: IBouquetWrap): WrapDTO {
  return {
    id: doc._id.toString(),
    name: doc.name,
    nameAr: doc.nameAr,
    material: doc.material,
    priceMinor: doc.priceMinor,
    imageUrl: doc.imageUrl,
    swatchHex: doc.swatchHex,
    available: doc.available,
    sortOrder: doc.sortOrder ?? 0,
  };
}

export const bouquetRepository = {
  // ── Flowers ───────────────────────────────────────────────────

  async listFlowers(includeInactive = false): Promise<IBouquetFlower[]> {
    await connectDB();
    return includeInactive
      ? BouquetFlower.find().sort({ sortOrder: 1, name: 1 })
      : BouquetFlower.find({ available: true }).sort({ sortOrder: 1, name: 1 });
  },

  async findFlowerById(id: string): Promise<IBouquetFlower | null> {
    await connectDB();
    return BouquetFlower.findById(id);
  },

  async findFlowersByIds(ids: string[]): Promise<IBouquetFlower[]> {
    await connectDB();
    return BouquetFlower.find({ _id: { $in: ids } });
  },

  async createFlower(data: Partial<IBouquetFlower>): Promise<IBouquetFlower> {
    await connectDB();
    return BouquetFlower.create(data);
  },

  async updateFlower(id: string, data: Partial<IBouquetFlower>): Promise<IBouquetFlower | null> {
    await connectDB();
    return BouquetFlower.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  },

  async deleteFlower(id: string): Promise<void> {
    await connectDB();
    await BouquetFlower.findByIdAndDelete(id);
  },

  // ── Wraps ─────────────────────────────────────────────────────

  async listWraps(includeInactive = false): Promise<IBouquetWrap[]> {
    await connectDB();
    return includeInactive
      ? BouquetWrap.find().sort({ sortOrder: 1, name: 1 })
      : BouquetWrap.find({ available: true }).sort({ sortOrder: 1, name: 1 });
  },

  async findWrapById(id: string): Promise<IBouquetWrap | null> {
    await connectDB();
    return BouquetWrap.findById(id);
  },

  async createWrap(data: Partial<IBouquetWrap>): Promise<IBouquetWrap> {
    await connectDB();
    return BouquetWrap.create(data);
  },

  async updateWrap(id: string, data: Partial<IBouquetWrap>): Promise<IBouquetWrap | null> {
    await connectDB();
    return BouquetWrap.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  },

  async deleteWrap(id: string): Promise<void> {
    await connectDB();
    await BouquetWrap.findByIdAndDelete(id);
  },
};
