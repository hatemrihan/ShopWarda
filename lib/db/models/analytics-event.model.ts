import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

// ─── Interface ──────────────────────────────────────────────────

export interface IAnalyticsEvent extends Document {
  _id: Types.ObjectId;
  eventId: string;
  anonymousSessionId: string;
  sessionStartedAt?: Date;
  event: string;
  entityType?: string;
  entityId?: Types.ObjectId;
  properties: Record<string, string | number | boolean>;
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
  referrer?: string;
  occurredAt: Date;
  expiresAt: Date;
}

// ─── Schema ─────────────────────────────────────────────────────

const analyticsEventSchema = new Schema<IAnalyticsEvent>(
  {
    eventId: { type: String, required: true },

    anonymousSessionId: { type: String, required: true },

    sessionStartedAt: Date,

    event: { type: String, required: true },

    entityType: String,
    entityId: Schema.Types.ObjectId,

    properties: {
      type: Schema.Types.Mixed,
      default: {},
    },

    utm: {
      type: new Schema(
        {
          source: String,
          medium: String,
          campaign: String,
          term: String,
          content: String,
        },
        { _id: false }
      ),
    },

    referrer: String,

    occurredAt: { type: Date, required: true, default: Date.now },

    expiresAt: {
      type: Date,
      required: true,
      // 90-day retention by default
      default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    },
  },
  {
    timestamps: false,
    collection: 'analyticsEvents',
  }
);

// ─── Indexes ────────────────────────────────────────────────────

analyticsEventSchema.index(
  { anonymousSessionId: 1, occurredAt: 1 },
  { name: 'funnel_reconstruction' }
);

// Every funnel query filters by period first, then groups by event.
analyticsEventSchema.index(
  { occurredAt: -1, event: 1 },
  { name: 'funnel_period' }
);

analyticsEventSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, name: 'analytics_ttl' }
);

// ─── Export ─────────────────────────────────────────────────────

export const AnalyticsEvent: Model<IAnalyticsEvent> =
  (mongoose.models.AnalyticsEvent as Model<IAnalyticsEvent>) ??
  mongoose.model<IAnalyticsEvent>('AnalyticsEvent', analyticsEventSchema);
