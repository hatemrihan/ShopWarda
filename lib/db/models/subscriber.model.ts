import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';
import type { SubscriberStatus, SubscriberSource } from '../types';
import { SUBSCRIBER_STATUS, SUBSCRIBER_SOURCE } from '../types';

// ─── Interface ──────────────────────────────────────────────────

export interface ISubscriber extends Document {
  _id: Types.ObjectId;
  emailNormalized: string;
  status: SubscriberStatus;
  source: SubscriberSource;
  consentAt: Date;
  unsubscribedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ─────────────────────────────────────────────────────

const subscriberSchema = new Schema<ISubscriber>(
  {
    emailNormalized: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    status: {
      type: String,
      enum: SUBSCRIBER_STATUS,
      default: 'active',
      required: true,
    },

    source: {
      type: String,
      enum: SUBSCRIBER_SOURCE,
      required: true,
    },

    consentAt: { type: Date, required: true, default: Date.now },

    unsubscribedAt: Date,
  },
  {
    timestamps: true,
    collection: 'subscribers',
  }
);

// ─── Export ─────────────────────────────────────────────────────

export const Subscriber: Model<ISubscriber> =
  (mongoose.models.Subscriber as Model<ISubscriber>) ??
  mongoose.model<ISubscriber>('Subscriber', subscriberSchema);
