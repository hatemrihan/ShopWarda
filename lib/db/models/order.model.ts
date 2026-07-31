import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';
import type {
  OrderStatus,
  IOrderItem,
  IEgyptAddress,
  IOrderPricing,
  IOrderPayment,
  IOrderGuest,
  IStatusHistoryEntry,
} from '../types';
import {
  ORDER_STATUS,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
} from '../types';

// ─── Interface ──────────────────────────────────────────────────

export interface IOrder extends Document {
  _id: Types.ObjectId;
  orderNumber: string;
  idempotencyKeyHash: string;
  sourceCartId?: Types.ObjectId;
  guest: IOrderGuest;
  address: IEgyptAddress;
  items: IOrderItem[];
  pricing: IOrderPricing;
  payment: IOrderPayment;
  promotionCode?: string;
  status: OrderStatus;
  statusHistory: IStatusHistoryEntry[];
  estimatedDeliveryAt?: Date;
  requestedDeliveryAt?: Date;
  deliveryNotes?: string;
  customerNote?: string;
  adminNote?: string;
  emailStatus?: { customer?: string; admin?: string };
  createdAt: Date;
  updatedAt: Date;
}

// ─── Embedded Schemas ───────────────────────────────────────────

const orderItemSchema = new Schema<IOrderItem>(
  {
    sourceProductId: { type: Schema.Types.ObjectId },
    sourceVariantId: { type: Schema.Types.ObjectId },
    sku: { type: String, required: true },
    productName: { type: String, required: true },
    productSlug: { type: String, required: true },
    selectedOptions: {
      type: [
        {
          label: { type: String, required: true },
          value: { type: String, required: true },
          _id: false,
        },
      ],
      default: [],
    },
    imageUrl: String,
    quantity: { type: Number, required: true, min: 1 },
    unitPriceMinor: {
      type: Number,
      required: true,
      min: 0,
      validate: { validator: Number.isInteger, message: 'Integer piasters only' },
    },
    lineTotalMinor: {
      type: Number,
      required: true,
      min: 0,
      validate: { validator: Number.isInteger, message: 'Integer piasters only' },
    },
  },
  { _id: false }
);

const egyptAddressSchema = new Schema<IEgyptAddress>(
  {
    governorate: { type: String, required: true },
    city: { type: String, required: true },
    // Optional: the checkout UI does not mark Area as required, and Mongoose
    // rejects '' under `required: true` — which used to 500 the whole order.
    area: { type: String, default: '' },
    street: { type: String, required: true },
    building: { type: String, required: true },
    floor: String,
    apartment: String,
    landmark: String,
    postalCode: String,
    lat: Number,
    lng: Number,
  },
  { _id: false }
);

const pricingSchema = new Schema<IOrderPricing>(
  {
    subtotalMinor: { type: Number, required: true, min: 0 },
    discountMinor: { type: Number, required: true, min: 0, default: 0 },
    shippingMinor: { type: Number, required: true, min: 0 },
    totalMinor: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'EGP', enum: ['EGP'] },
  },
  { _id: false }
);

const paymentSchema = new Schema<IOrderPayment>(
  {
    method: { type: String, enum: PAYMENT_METHOD, required: true },
    status: {
      type: String,
      enum: PAYMENT_STATUS,
      default: 'pending',
      required: true,
    },
    instaPayAssetKey: String,
    instaPayMime: String,
    instaPaySize: Number,
    instaPayUploadedAt: Date,
  },
  { _id: false }
);

const statusHistorySchema = new Schema<IStatusHistoryEntry>(
  {
    status: { type: String, enum: ORDER_STATUS, required: true },
    at: { type: Date, required: true, default: Date.now },
    adminId: { type: Schema.Types.ObjectId, ref: 'Admin' },
    note: String,
  },
  { _id: false }
);

const guestSchema = new Schema<IOrderGuest>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
  },
  { _id: false }
);

// ─── Order Schema ───────────────────────────────────────────────

const orderSchema = new Schema<IOrder>(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
    },

    idempotencyKeyHash: {
      type: String,
      required: true,
      unique: true,
    },

    sourceCartId: { type: Schema.Types.ObjectId },

    guest: { type: guestSchema, required: true },
    address: { type: egyptAddressSchema, required: true },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (v: IOrderItem[]) => v.length > 0,
        message: 'Order must have at least one item',
      },
    },
    pricing: { type: pricingSchema, required: true },
    payment: { type: paymentSchema, required: true },

    promotionCode: { type: String, trim: true, lowercase: true },

    status: {
      type: String,
      enum: ORDER_STATUS,
      default: 'new',
      required: true,
    },

    statusHistory: { type: [statusHistorySchema], default: [] },

    estimatedDeliveryAt: Date,
    requestedDeliveryAt: Date,
    deliveryNotes: { type: String, trim: true },
    customerNote: { type: String, trim: true },
    adminNote: { type: String, trim: true },

    // Outcome of the post-response email dispatch, so failures are visible in
    // the admin panel instead of only in the function logs.
    emailStatus: {
      type: new Schema(
        {
          customer: String,
          admin: String,
        },
        { _id: false },
      ),
      required: false,
    },
  },
  {
    timestamps: true,
    collection: 'orders',
  }
);

// ─── Pre-save: initialize status history ────────────────────────

orderSchema.pre('save', function () {
  if (this.isNew && this.statusHistory.length === 0) {
    this.statusHistory.push({
      status: this.status,
      at: new Date(),
    });
  }
});

// ─── Indexes ────────────────────────────────────────────────────

orderSchema.index(
  { status: 1, createdAt: -1 },
  { name: 'admin_order_queue' }
);

orderSchema.index(
  { 'guest.phone': 1, createdAt: -1 },
  { name: 'phone_search' }
);

// ─── Export ─────────────────────────────────────────────────────

export const Order: Model<IOrder> =
  (mongoose.models.Order as Model<IOrder>) ??
  mongoose.model<IOrder>('Order', orderSchema);
