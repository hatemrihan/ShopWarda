import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';
import type { CategoryStatus, ISeoMeta, IAssetRef } from '../types';
import { CATEGORY_STATUS } from '../types';

// ─── Interface ──────────────────────────────────────────────────

export interface ICategory extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  previousSlugs: string[];
  description?: string;
  image?: IAssetRef;
  parentId?: Types.ObjectId;
  sortOrder: number;
  status: CategoryStatus;
  seo: ISeoMeta;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ─────────────────────────────────────────────────────

const assetRefSchema = new Schema(
  {
    assetKey: { type: String, required: true },
    publicUrl: { type: String, required: true },
    alt: { type: String, default: '' },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
  },
  { _id: false }
);

const seoSchema = new Schema(
  {
    title: String,
    description: String,
    ogImage: String,
    canonical: String,
  },
  { _id: false }
);

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    previousSlugs: { type: [String], default: [] },

    description: { type: String, trim: true },

    image: { type: assetRefSchema },

    parentId: { type: Schema.Types.ObjectId, ref: 'Category', default: null },

    sortOrder: { type: Number, default: 0 },

    status: {
      type: String,
      enum: CATEGORY_STATUS,
      default: 'active',
      required: true,
    },

    seo: { type: seoSchema, default: () => ({}) },
  },
  {
    timestamps: true,
    collection: 'categories',
  }
);

// ─── Indexes ────────────────────────────────────────────────────

categorySchema.index(
  { parentId: 1, sortOrder: 1, status: 1 },
  { name: 'category_nav' }
);

// ─── Virtuals ───────────────────────────────────────────────────

categorySchema.virtual('isNested').get(function (this: ICategory) {
  return this.parentId != null;
});

// ─── Export ─────────────────────────────────────────────────────

export const Category: Model<ICategory> =
  (mongoose.models.Category as Model<ICategory>) ??
  mongoose.model<ICategory>('Category', categorySchema);
