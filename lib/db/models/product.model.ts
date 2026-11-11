import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';
import type {
  IOptionDefinition,
  IOptionValue,
  IVariant,
  IProductMedia,
  IBundleItem,
  IPriceRange,
  ISeoMeta,
  ProductStatus,
  ProductType,
} from '../types';
import {
  PRODUCT_STATUS,
  PRODUCT_TYPE,
  VARIANT_STATUS,
  MEDIA_TYPE,
} from '../types';

// ─── Product Interface ──────────────────────────────────────────

export interface IProduct extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  previousSlugs: string[];
  shortDescription?: string;
  description?: string;
  categoryIds: Types.ObjectId[];
  primaryCategoryId?: Types.ObjectId;
  tags: string[];
  status: ProductStatus;
  type: ProductType;
  options: IOptionDefinition[];
  variants: IVariant[];
  media: IProductMedia[];
  bundleItems: IBundleItem[];
  defaultVariantId?: Types.ObjectId;
  priceRange: IPriceRange;
  seo: ISeoMeta;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Embedded Schemas ───────────────────────────────────────────

const optionValueSchema = new Schema<IOptionValue>(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    swatchHex: String,
    sortOrder: { type: Number, default: 0 },
  },
  { _id: false }
);

const optionDefinitionSchema = new Schema<IOptionDefinition>(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    sortOrder: { type: Number, default: 0 },
    values: { type: [optionValueSchema], default: [] },
  },
  { _id: false }
);

const variantSchema = new Schema<IVariant>(
  {
    sku: { type: String, required: true, trim: true },

    optionValues: {
      type: [
        {
          optionKey: { type: String, required: true },
          valueKey: { type: String, required: true },
          _id: false,
        },
      ],
      default: [],
    },

    priceMinor: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'Price must be an integer (piasters)',
      },
    },

    compareAtPriceMinor: {
      type: Number,
      min: 0,
      validate: {
        validator: function (val: number) {
          return Number.isInteger(val);
        },
        message: 'Compare-at price must be an integer (piasters)',
      },
    },

    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: 'Stock must be a non-negative integer',
      },
    },

    lowStockThreshold: { type: Number, default: 5, min: 0 },

    trackInventory: { type: Boolean, default: true },

    weightGrams: { type: Number, min: 0 },

    mediaKeys: { type: [String], default: [] },

    status: {
      type: String,
      enum: VARIANT_STATUS,
      default: 'active',
      required: true,
    },
  },
  { _id: true }
);

const productMediaSchema = new Schema<IProductMedia>(
  {
    assetKey: { type: String, required: true },
    publicUrl: { type: String, required: true },
    alt: { type: String, default: '' },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    sortOrder: { type: Number, default: 0 },
    type: { type: String, enum: MEDIA_TYPE, default: 'image' },
    duration: Number,
    thumbnailUrl: String,
    optionValueKey: String,
  },
  { _id: false }
);

const bundleItemSchema = new Schema<IBundleItem>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    variantId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    quantity: { type: Number, required: true, min: 1 },
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

const priceRangeSchema = new Schema<IPriceRange>(
  {
    minMinor: { type: Number, default: 0, min: 0 },
    maxMinor: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

// ─── Product Schema ─────────────────────────────────────────────

const productSchema = new Schema<IProduct>(
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

    shortDescription: { type: String, trim: true },
    description: { type: String },

    categoryIds: {
      type: [Schema.Types.ObjectId],
      ref: 'Category',
      default: [],
    },

    primaryCategoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
    },

    tags: { type: [String], default: [] },

    status: {
      type: String,
      enum: PRODUCT_STATUS,
      default: 'draft',
      required: true,
    },

    type: {
      type: String,
      enum: PRODUCT_TYPE,
      default: 'simple',
      required: true,
    },

    options: { type: [optionDefinitionSchema], default: [] },
    variants: { type: [variantSchema], default: [] },
    media: { type: [productMediaSchema], default: [] },
    bundleItems: { type: [bundleItemSchema], default: [] },

    defaultVariantId: { type: Schema.Types.ObjectId },

    priceRange: { type: priceRangeSchema, default: () => ({}) },

    seo: { type: seoSchema, default: () => ({}) },

    publishedAt: Date,
  },
  {
    timestamps: true,
    collection: 'products',
  }
);

// ─── Pre-save: derive priceRange from active variants ───────────

productSchema.pre('save', function () {
  const activeVariants = this.variants.filter(
    (v) => v.status === 'active'
  );

  if (activeVariants.length > 0) {
    const prices = activeVariants.map((v) => v.priceMinor);
    this.priceRange = {
      minMinor: Math.min(...prices),
      maxMinor: Math.max(...prices),
    };
  } else {
    this.priceRange = { minMinor: 0, maxMinor: 0 };
  }

  // Set publishedAt on first activation
  if (this.status === 'active' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
});

// ─── Indexes ────────────────────────────────────────────────────

// Store-wide SKU uniqueness across all products
productSchema.index(
  { 'variants.sku': 1 },
  { unique: true, sparse: true, name: 'variant_sku_unique' }
);

// Shop/category filters
productSchema.index(
  { status: 1, categoryIds: 1, 'priceRange.minMinor': 1 },
  { name: 'shop_category_filter' }
);

// Default storefront listing: active products, newest first. The index above
// cannot serve this sort, so "Shop" and "Latest Arrivals" sorted in memory.
productSchema.index(
  { status: 1, createdAt: -1 },
  { name: 'shop_newest' }
);

// Old URLs → current product (see productRepository.findByPreviousSlug).
productSchema.index(
  { previousSlugs: 1 },
  { sparse: true, name: 'product_previous_slugs' }
);

// Tag-based search
productSchema.index({ tags: 1 }, { name: 'product_tags' });

// Bundle lookups
productSchema.index(
  { 'bundleItems.productId': 1 },
  { sparse: true, name: 'bundle_refs' }
);

// ─── Export ─────────────────────────────────────────────────────

export const Product: Model<IProduct> =
  (mongoose.models.Product as Model<IProduct>) ??
  mongoose.model<IProduct>('Product', productSchema);
