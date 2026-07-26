import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';
import type { PromotionType, PromotionStatus, PromotionScope } from '../types';
import { PROMOTION_TYPE, PROMOTION_STATUS, PROMOTION_SCOPE } from '../types';

// ─── Interface ──────────────────────────────────────────────────

export interface IPromotion extends Document {
  _id: Types.ObjectId;
  code: string;
  name: string;
  type: PromotionType;
  /** Percentage (0-100) for 'percentage', or piasters for 'fixed_amount'. */
  value: number;
  /** Minimum order subtotal in piasters to qualify. */
  minOrderMinor?: number;
  /** Cap on discount in piasters for percentage promos. */
  maxDiscountMinor?: number;
  /** Total redemptions allowed. null = unlimited. */
  usageLimit?: number;
  /** Current redemption count. */
  usageCount: number;
  /** Max uses per phone number. null = unlimited. */
  perPhoneLimit?: number;
  validFrom: Date;
  validUntil: Date;
  /** What this promo applies to. */
  scope: PromotionScope;
  scopeCategoryIds: Types.ObjectId[];
  scopeProductIds: Types.ObjectId[];
  status: PromotionStatus;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ─────────────────────────────────────────────────────

const promotionSchema = new Schema<IPromotion>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },

    name: { type: String, required: true, trim: true },

    type: {
      type: String,
      enum: PROMOTION_TYPE,
      required: true,
    },

    value: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: function (val: number) {
          return val > 0;
        },
        message: 'Value must be positive (percentage 1-100, or piasters)',
      },
    },

    minOrderMinor: {
      type: Number,
      min: 0,
      validate: { validator: Number.isInteger, message: 'Integer piasters' },
    },

    maxDiscountMinor: {
      type: Number,
      min: 0,
      validate: { validator: Number.isInteger, message: 'Integer piasters' },
    },

    usageLimit: { type: Number, min: 1 },
    usageCount: { type: Number, default: 0, min: 0 },
    perPhoneLimit: { type: Number, min: 1 },

    validFrom: { type: Date, required: true },
    validUntil: { type: Date, required: true },

    scope: {
      type: String,
      enum: PROMOTION_SCOPE,
      default: 'all',
      required: true,
    },

    scopeCategoryIds: {
      type: [Schema.Types.ObjectId],
      ref: 'Category',
      default: [],
    },

    scopeProductIds: {
      type: [Schema.Types.ObjectId],
      ref: 'Product',
      default: [],
    },

    status: {
      type: String,
      enum: PROMOTION_STATUS,
      default: 'active',
      required: true,
    },
  },
  {
    timestamps: true,
    collection: 'promotions',
  }
);

// ─── Indexes ────────────────────────────────────────────────────

promotionSchema.index(
  { status: 1, validFrom: 1, validUntil: 1 },
  { name: 'active_promos' }
);

// ─── Export ─────────────────────────────────────────────────────

export const Promotion: Model<IPromotion> =
  (mongoose.models.Promotion as Model<IPromotion>) ??
  mongoose.model<IPromotion>('Promotion', promotionSchema);
