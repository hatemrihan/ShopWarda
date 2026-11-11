// Type-only: this module is also imported by client components for its status
// constants, and a value import would drag mongoose into the browser bundle.
import type { Types } from 'mongoose';

// ─── Status Enums ───────────────────────────────────────────────

export const PRODUCT_STATUS = ['draft', 'active', 'archived'] as const;
export type ProductStatus = (typeof PRODUCT_STATUS)[number];

export const PRODUCT_TYPE = ['simple', 'bundle'] as const;
export type ProductType = (typeof PRODUCT_TYPE)[number];

export const CATEGORY_STATUS = ['active', 'hidden', 'archived'] as const;
export type CategoryStatus = (typeof CATEGORY_STATUS)[number];

export const VARIANT_STATUS = ['active', 'disabled'] as const;
export type VariantStatus = (typeof VARIANT_STATUS)[number];

export const CART_STATUS = ['active', 'converted', 'expired'] as const;
export type CartStatus = (typeof CART_STATUS)[number];

export const ORDER_STATUS = [
  'new',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
] as const;
export type OrderStatus = (typeof ORDER_STATUS)[number];

export const PAYMENT_METHOD = ['cod', 'instapay'] as const;
export type PaymentMethod = (typeof PAYMENT_METHOD)[number];

export const PAYMENT_STATUS = [
  'pending',
  'collected',
  'proof_uploaded',
  'confirmed',
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUS)[number];

export const CONTACT_STATUS = ['new', 'read', 'replied', 'archived'] as const;
export type ContactStatus = (typeof CONTACT_STATUS)[number];

export const SUBSCRIBER_STATUS = ['active', 'unsubscribed'] as const;
export type SubscriberStatus = (typeof SUBSCRIBER_STATUS)[number];

export const SUBSCRIBER_SOURCE = [
  'checkout',
  'popup',
  'footer',
  'admin',
] as const;
export type SubscriberSource = (typeof SUBSCRIBER_SOURCE)[number];

export const ADMIN_ROLE = ['owner'] as const;
export type AdminRole = (typeof ADMIN_ROLE)[number];

export const MEDIA_TYPE = ['image', 'video'] as const;
export type MediaType = (typeof MEDIA_TYPE)[number];

export const PROMOTION_TYPE = ['percentage', 'fixed_amount'] as const;
export type PromotionType = (typeof PROMOTION_TYPE)[number];

export const PROMOTION_STATUS = ['active', 'disabled', 'expired'] as const;
export type PromotionStatus = (typeof PROMOTION_STATUS)[number];

export const PROMOTION_SCOPE = ['all', 'categories', 'products'] as const;
export type PromotionScope = (typeof PROMOTION_SCOPE)[number];

// ─── Embedded Subdocument Interfaces ────────────────────────────

export interface IOptionValue {
  key: string;
  label: string;
  swatchHex?: string;
  sortOrder: number;
}

export interface IOptionDefinition {
  key: string;
  label: string;
  sortOrder: number;
  values: IOptionValue[];
}

export interface IVariant {
  _id: Types.ObjectId;
  sku: string;
  optionValues: { optionKey: string; valueKey: string }[];
  priceMinor: number;
  compareAtPriceMinor?: number;
  stock: number;
  lowStockThreshold: number;
  trackInventory: boolean;
  weightGrams?: number;
  mediaKeys: string[];
  status: VariantStatus;
}

export interface IProductMedia {
  assetKey: string;
  publicUrl: string;
  alt: string;
  width: number;
  height: number;
  sortOrder: number;
  type: MediaType;
  duration?: number;
  thumbnailUrl?: string;
  optionValueKey?: string;
}

export interface IBundleItem {
  productId: Types.ObjectId;
  variantId: Types.ObjectId;
  quantity: number;
}

export interface IPriceRange {
  minMinor: number;
  maxMinor: number;
}

export interface ISeoMeta {
  title?: string;
  description?: string;
  ogImage?: string;
  canonical?: string;
}

export interface IAssetRef {
  assetKey: string;
  publicUrl: string;
  alt: string;
  width: number;
  height: number;
}

// ─── Order Embedded Types ───────────────────────────────────────

/**
 * Immutable snapshot of a composed bouquet, captured at order time.
 * Never reference live flower/wrap documents from an order — prices and
 * availability change, the order must not.
 */
export interface ICustomBouquetSnapshot {
  flowers: {
    flowerId?: Types.ObjectId;
    name: string;
    colorKey: string;
    colorLabel: string;
    qty: number;
    perStemMinor: number;
    lineMinor: number;
  }[];
  wrap: {
    wrapId?: Types.ObjectId;
    name: string;
    material: string;
    priceMinor: number;
  };
  cardMessage?: string;
  cardPriceMinor: number;
  basePriceMinor: number;
}

export interface IOrderItem {
  sourceProductId?: Types.ObjectId;
  sourceVariantId?: Types.ObjectId;
  sku: string;
  productName: string;
  productSlug: string;
  selectedOptions: { label: string; value: string }[];
  imageUrl?: string;
  quantity: number;
  unitPriceMinor: number;
  lineTotalMinor: number;
  /** Present only on custom-bouquet lines. */
  customBouquet?: ICustomBouquetSnapshot;
}

export interface IEgyptAddress {
  governorate: string;
  city: string;
  area?: string;
  street: string;
  building: string;
  floor?: string;
  apartment?: string;
  landmark?: string;
  postalCode?: string;
  lat?: number;
  lng?: number;
}

export interface IOrderPricing {
  subtotalMinor: number;
  discountMinor: number;
  shippingMinor: number;
  totalMinor: number;
  currency: 'EGP';
}

export interface IOrderPayment {
  method: PaymentMethod;
  status: PaymentStatus;
  instaPayAssetKey?: string;
  instaPayMime?: string;
  instaPaySize?: number;
  instaPayUploadedAt?: Date;
}

export interface IOrderGuest {
  name: string;
  phone: string;
  email?: string;
}

export interface IStatusHistoryEntry {
  status: OrderStatus;
  at: Date;
  adminId?: Types.ObjectId;
  note?: string;
}

// ─── Cart Embedded Types ────────────────────────────────────────

export interface ICartItem {
  productId: Types.ObjectId;
  variantId: Types.ObjectId;
  quantity: number;
  addedPriceMinor: number;
  addedAt: Date;
}

// ─── Store Settings Types ───────────────────────────────────────

export interface IShippingZone {
  governorate: string;
  feeMinor: number;
  codFeeMinor: number;
  estimatedDays: number;
  enabled: boolean;
}

export interface IDeliverySchedule {
  cutoffTime: string;
  sameDayZones: string[];
  blackoutDates: Date[];
}

export interface IStoreContact {
  phone?: string;
  email?: string;
  whatsapp?: string;
  address?: string;
}

export interface IInstaPayConfig {
  accountLink: string;
  instructions: string;
}

export interface ISizeGuideColumn {
  key: string;
  label: string;
}

export interface ISizeGuideRow {
  size: string;
  values: Record<string, string>;
}

export interface ISizeGuide {
  enabled: boolean;
  title: string;
  description: string;
  columns: ISizeGuideColumn[];
  rows: ISizeGuideRow[];
  notes: string;
}
