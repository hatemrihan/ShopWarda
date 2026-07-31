import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';
import type {
  IShippingZone,
  IDeliverySchedule,
  IStoreContact,
  IInstaPayConfig,
  ISizeGuide,
} from '../types';

// ─── Interface ──────────────────────────────────────────────────

export interface IStoreSettings extends Document {
  _id: Types.ObjectId;
  key: string;
  storeName: string;
  contact: IStoreContact;
  instaPay: IInstaPayConfig;
  shippingZones: IShippingZone[];
  codEnabled: boolean;
  instaPayEnabled: boolean;
  freeDeliveryThresholdMinor?: number;
  deliverySchedule: IDeliverySchedule;
  publicAnalyticsIds: {
    googleAnalytics?: string;
    facebookPixel?: string;
  };
  sizeGuide: ISizeGuide;
  bouquetBuilder: IBouquetBuilderSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface IBouquetBuilderSettings {
  /** Feature flag — the builder ships dark and is flipped on when seeded. */
  enabled: boolean;
  minStems: number;
  maxStems: number;
  /** Arrangement fee added to every bouquet. */
  basePriceMinor: number;
  card: {
    enabled: boolean;
    priceMinor: number;
    maxLength: number;
  };
}

// ─── Embedded Schemas ───────────────────────────────────────────

const shippingZoneSchema = new Schema<IShippingZone>(
  {
    governorate: { type: String, required: true },
    feeMinor: {
      type: Number,
      required: true,
      min: 0,
      validate: { validator: Number.isInteger, message: 'Integer piasters' },
    },
    codFeeMinor: {
      type: Number,
      default: 0,
      min: 0,
      validate: { validator: Number.isInteger, message: 'Integer piasters' },
    },
    estimatedDays: { type: Number, required: true, min: 0 },
    enabled: { type: Boolean, default: true },
  },
  { _id: false }
);

const deliveryScheduleSchema = new Schema<IDeliverySchedule>(
  {
    cutoffTime: { type: String, default: '14:00' },
    sameDayZones: { type: [String], default: [] },
    blackoutDates: { type: [Date], default: [] },
  },
  { _id: false }
);

const storeContactSchema = new Schema<IStoreContact>(
  {
    phone: String,
    email: { type: String, lowercase: true },
    whatsapp: String,
    address: String,
  },
  { _id: false }
);

const instaPayConfigSchema = new Schema<IInstaPayConfig>(
  {
    accountLink: { type: String, default: '' },
    instructions: { type: String, default: '' },
  },
  { _id: false }
);

const sizeGuideColumnSchema = new Schema(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
  },
  { _id: false }
);

const sizeGuideRowSchema = new Schema(
  {
    size: { type: String, required: true },
    values: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const sizeGuideSchema = new Schema(
  {
    enabled: { type: Boolean, default: true },
    title: { type: String, default: 'Arrangement Size Guide' },
    description: { type: String, default: 'Choose the perfect bouquet size for any occasion.' },
    columns: { type: [sizeGuideColumnSchema], default: () => [
      { key: 'stems', label: 'Stem Count' },
      { key: 'dimensions', label: 'Dimensions' },
      { key: 'bestFor', label: 'Best For' },
    ] },
    rows: { type: [sizeGuideRowSchema], default: () => [
      { size: 'Petite', values: { stems: '5 – 12', dimensions: '25 × 20 cm', bestFor: 'Desks, intimate gifts' } },
      { size: 'Standard', values: { stems: '12 – 25', dimensions: '35 × 30 cm', bestFor: 'Birthdays, anniversaries' } },
      { size: 'Premium', values: { stems: '25 – 50', dimensions: '45 × 40 cm', bestFor: 'Grand gestures, events' } },
      { size: 'Grand', values: { stems: '50+', dimensions: '55 × 50 cm', bestFor: 'Weddings, luxury displays' } },
    ] },
    notes: { type: String, default: 'Dimensions are approximate and vary by bloom type. Larger blooms like peonies and hydrangeas create more volume with fewer stems.' },
  },
  { _id: false }
);

// ─── Schema ─────────────────────────────────────────────────────

const bouquetBuilderSchema = new Schema<IBouquetBuilderSettings>(
  {
    enabled: { type: Boolean, default: false },
    minStems: { type: Number, default: 5, min: 1 },
    maxStems: { type: Number, default: 100, min: 1 },
    basePriceMinor: {
      type: Number,
      default: 0,
      min: 0,
      validate: { validator: Number.isInteger, message: 'Integer piasters' },
    },
    card: {
      type: new Schema(
        {
          enabled: { type: Boolean, default: true },
          priceMinor: {
            type: Number,
            default: 0,
            min: 0,
            validate: { validator: Number.isInteger, message: 'Integer piasters' },
          },
          maxLength: { type: Number, default: 200, min: 1 },
        },
        { _id: false }
      ),
      default: () => ({}),
    },
  },
  { _id: false }
);

const storeSettingsSchema = new Schema<IStoreSettings>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: 'main',
    },

    storeName: { type: String, required: true, default: 'Warda' },

    contact: { type: storeContactSchema, default: () => ({}) },

    instaPay: {
      type: instaPayConfigSchema,
      default: () => ({
        accountLink: '',
        instructions: '',
      }),
    },

    shippingZones: { type: [shippingZoneSchema], default: [] },

    codEnabled: { type: Boolean, default: true },
    instaPayEnabled: { type: Boolean, default: true },

    freeDeliveryThresholdMinor: {
      type: Number,
      min: 0,
      validate: { validator: Number.isInteger, message: 'Integer piasters' },
    },

    deliverySchedule: {
      type: deliveryScheduleSchema,
      default: () => ({
        cutoffTime: '14:00',
        sameDayZones: [],
        blackoutDates: [],
      }),
    },

    publicAnalyticsIds: {
      type: new Schema(
        {
          googleAnalytics: String,
          facebookPixel: String,
        },
        { _id: false }
      ),
      default: () => ({}),
    },

    sizeGuide: {
      type: sizeGuideSchema,
      default: () => ({}),
    },

    bouquetBuilder: {
      type: bouquetBuilderSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
    collection: 'storeSettings',
  }
);

// ─── Export ─────────────────────────────────────────────────────

export const StoreSettings: Model<IStoreSettings> =
  (mongoose.models.StoreSettings as Model<IStoreSettings>) ??
  mongoose.model<IStoreSettings>('StoreSettings', storeSettingsSchema);

/**
 * Get or create the singleton settings document.
 */
export async function getSettings(): Promise<IStoreSettings> {
  let settings = await StoreSettings.findOne({ key: 'main' });
  if (!settings) {
    settings = await StoreSettings.create({ key: 'main' });
  }
  return settings;
}
