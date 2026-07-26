import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';
import type { AdminRole } from '../types';
import { ADMIN_ROLE } from '../types';

// ─── Interface ──────────────────────────────────────────────────

export interface IAdmin extends Document {
  _id: Types.ObjectId;
  emailNormalized: string;
  googleId?: string;
  displayName: string;
  image?: string;
  role: AdminRole;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ─────────────────────────────────────────────────────

const adminSchema = new Schema<IAdmin>(
  {
    emailNormalized: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    googleId: { type: String, sparse: true },

    image: { type: String },

    displayName: { type: String, required: true, trim: true },

    role: {
      type: String,
      enum: ADMIN_ROLE,
      default: 'owner',
      required: true,
    },

    isActive: { type: Boolean, default: true },

    lastLoginAt: Date,
  },
  {
    timestamps: true,
    collection: 'admins',
  }
);

// ─── Export ─────────────────────────────────────────────────────

export const Admin: Model<IAdmin> =
  (mongoose.models.Admin as Model<IAdmin>) ??
  mongoose.model<IAdmin>('Admin', adminSchema);
