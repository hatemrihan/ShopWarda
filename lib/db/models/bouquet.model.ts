/**
 * Custom bouquet builder — flower and wrapping catalogues.
 *
 * Deliberately separate from the generic product options/variants engine:
 * that engine prices whole variants, whereas a bouquet is priced additively
 * (Σ stems × pricePerStem + wrap + card + arrangement fee).
 *
 * All money is integer piasters.
 */

import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';
import type { IProductMedia } from '../types';
import { BOUQUET_SEASONS, BOUQUET_STATUS, type BouquetSeason, type BouquetStatus } from '@/features/bouquet/constants';

// Enums live in features/bouquet/constants.ts so client components can import
// them without dragging the Mongoose driver into the browser bundle.
export {
  BOUQUET_SEASONS,
  BOUQUET_STATUS,
  type BouquetSeason,
  type BouquetStatus,
} from '@/features/bouquet/constants';

// ─── Flower colour ──────────────────────────────────────────────

export interface IFlowerColor {
  key: string;
  label: string;
  swatchHex: string;
  imageUrl?: string;
  available: boolean;
  sortOrder: number;
}

const flowerColorSchema = new Schema<IFlowerColor>(
  {
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    swatchHex: { type: String, required: true, trim: true, default: '#D0D48D' },
    imageUrl: String,
    available: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { _id: false }
);

// ─── Flower ─────────────────────────────────────────────────────

export interface IBouquetFlower extends Document {
  _id: Types.ObjectId;
  name: string;
  nameAr?: string;
  slug: string;
  pricePerStemMinor: number;
  colors: IFlowerColor[];
  /** Empty means available year-round. */
  seasons: BouquetSeason[];
  /** Master availability toggle, independent of per-colour availability. */
  available: boolean;
  media: IProductMedia[];
  sortOrder: number;
  status: BouquetStatus;
  createdAt: Date;
  updatedAt: Date;
}

const mediaSchema = new Schema<IProductMedia>(
  {
    assetKey: { type: String, required: true },
    publicUrl: { type: String, required: true },
    alt: String,
    type: { type: String, enum: ['image', 'video'], default: 'image' },
    width: Number,
    height: Number,
    sortOrder: { type: Number, default: 0 },
  },
  { _id: false }
);

const bouquetFlowerSchema = new Schema<IBouquetFlower>(
  {
    name: { type: String, required: true, trim: true },
    nameAr: { type: String, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },

    pricePerStemMinor: {
      type: Number,
      required: true,
      min: 0,
      validate: { validator: Number.isInteger, message: 'Integer piasters only' },
    },

    colors: { type: [flowerColorSchema], default: [] },
    seasons: { type: [String], enum: BOUQUET_SEASONS, default: [] },
    available: { type: Boolean, default: true },
    media: { type: [mediaSchema], default: [] },
    sortOrder: { type: Number, default: 0 },
    status: { type: String, enum: BOUQUET_STATUS, default: 'draft', required: true },
  },
  { timestamps: true, collection: 'bouquet-flowers' }
);

bouquetFlowerSchema.index({ status: 1, sortOrder: 1 }, { name: 'active_flowers' });

// ─── Wrapping ───────────────────────────────────────────────────

export interface IBouquetWrap extends Document {
  _id: Types.ObjectId;
  name: string;
  nameAr?: string;
  /** 'paper' | 'silk' | free text — the florist decides the vocabulary. */
  material: string;
  priceMinor: number;
  imageUrl?: string;
  swatchHex?: string;
  available: boolean;
  sortOrder: number;
  status: BouquetStatus;
  createdAt: Date;
  updatedAt: Date;
}

const bouquetWrapSchema = new Schema<IBouquetWrap>(
  {
    name: { type: String, required: true, trim: true },
    nameAr: { type: String, trim: true },
    material: { type: String, required: true, trim: true, default: 'paper' },

    priceMinor: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
      validate: { validator: Number.isInteger, message: 'Integer piasters only' },
    },

    imageUrl: String,
    swatchHex: String,
    available: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    status: { type: String, enum: BOUQUET_STATUS, default: 'draft', required: true },
  },
  { timestamps: true, collection: 'bouquet-wraps' }
);

bouquetWrapSchema.index({ status: 1, sortOrder: 1 }, { name: 'active_wraps' });

// ─── Exports ────────────────────────────────────────────────────

export const BouquetFlower: Model<IBouquetFlower> =
  (mongoose.models.BouquetFlower as Model<IBouquetFlower>) ??
  mongoose.model<IBouquetFlower>('BouquetFlower', bouquetFlowerSchema);

export const BouquetWrap: Model<IBouquetWrap> =
  (mongoose.models.BouquetWrap as Model<IBouquetWrap>) ??
  mongoose.model<IBouquetWrap>('BouquetWrap', bouquetWrapSchema);
