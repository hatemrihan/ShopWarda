import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';
import type { CartStatus, ICartItem } from '../types';
import { CART_STATUS } from '../types';

// ─── Interface ──────────────────────────────────────────────────

export interface ICart extends Document {
  _id: Types.ObjectId;
  tokenHash: string;
  status: CartStatus;
  items: ICartItem[];
  version: number;
  promotionCode?: string;
  lastActivityAt: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Embedded Schemas ───────────────────────────────────────────

const cartItemSchema = new Schema<ICartItem>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    variantId: { type: Schema.Types.ObjectId, required: true },
    quantity: { type: Number, required: true, min: 1 },
    addedPriceMinor: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'Price must be integer piasters',
      },
    },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

// ─── Cart Schema ────────────────────────────────────────────────

const cartSchema = new Schema<ICart>(
  {
    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },

    status: {
      type: String,
      enum: CART_STATUS,
      default: 'active',
      required: true,
    },

    items: { type: [cartItemSchema], default: [] },

    version: { type: Number, default: 0 },

    promotionCode: { type: String, trim: true, lowercase: true },

    lastActivityAt: { type: Date, default: Date.now },

    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  },
  {
    timestamps: true,
    collection: 'carts',
  }
);

// ─── TTL Index ──────────────────────────────────────────────────

cartSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, name: 'cart_ttl' }
);

// ─── Methods ────────────────────────────────────────────────────

cartSchema.methods.itemCount = function (this: ICart): number {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
};

cartSchema.methods.isExpired = function (this: ICart): boolean {
  return this.expiresAt < new Date();
};

// ─── Export ─────────────────────────────────────────────────────

export const Cart: Model<ICart> =
  (mongoose.models.Cart as Model<ICart>) ??
  mongoose.model<ICart>('Cart', cartSchema);
