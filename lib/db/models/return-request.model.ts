import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

// ─── Interface ──────────────────────────────────────────────────

export interface IReturnRequest extends Document {
  _id: Types.ObjectId;
  orderName: string;
  phone: string;
  reason?: string;
  status: 'new' | 'read' | 'replied' | 'archived';
  adminNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ─────────────────────────────────────────────────────

const returnRequestSchema = new Schema<IReturnRequest>(
  {
    orderName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    reason: { type: String, trim: true },
    status: {
      type: String,
      enum: ['new', 'read', 'replied', 'archived'],
      default: 'new',
      required: true,
    },
    adminNote: { type: String, trim: true },
  },
  {
    timestamps: true,
    collection: 'return_requests',
  }
);

// ─── Indexes ────────────────────────────────────────────────────

returnRequestSchema.index(
  { status: 1, createdAt: -1 },
  { name: 'return_inbox_workflow' }
);

// ─── Export ─────────────────────────────────────────────────────

export const ReturnRequest: Model<IReturnRequest> =
  (mongoose.models.ReturnRequest as Model<IReturnRequest>) ??
  mongoose.model<IReturnRequest>('ReturnRequest', returnRequestSchema);
