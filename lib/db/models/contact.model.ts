import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';
import type { ContactStatus } from '../types';
import { CONTACT_STATUS } from '../types';

// ─── Interface ──────────────────────────────────────────────────

export interface IContact extends Document {
  _id: Types.ObjectId;
  name: string;
  phone?: string;
  email?: string;
  subject?: string;
  message: string;
  status: ContactStatus;
  adminNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ─────────────────────────────────────────────────────

const contactSchema = new Schema<IContact>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    subject: { type: String, trim: true },
    message: { type: String, required: true },
    status: {
      type: String,
      enum: CONTACT_STATUS,
      default: 'new',
      required: true,
    },
    adminNote: { type: String, trim: true },
  },
  {
    timestamps: true,
    collection: 'contacts',
  }
);

// ─── Indexes ────────────────────────────────────────────────────

contactSchema.index(
  { status: 1, createdAt: -1 },
  { name: 'inbox_workflow' }
);

// ─── Export ─────────────────────────────────────────────────────

export const Contact: Model<IContact> =
  (mongoose.models.Contact as Model<IContact>) ??
  mongoose.model<IContact>('Contact', contactSchema);
