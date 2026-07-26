import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

// ─── Interface ──────────────────────────────────────────────────

export interface IAuditLog extends Document {
  _id: Types.ObjectId;
  adminId: Types.ObjectId;
  action: string;
  entityType: string;
  entityId: Types.ObjectId;
  summary: string;
  requestMeta?: {
    ip?: string;
    userAgent?: string;
  };
  createdAt: Date;
}

// ─── Schema ─────────────────────────────────────────────────────

const auditLogSchema = new Schema<IAuditLog>(
  {
    adminId: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },

    action: { type: String, required: true },

    entityType: { type: String, required: true },

    entityId: { type: Schema.Types.ObjectId, required: true },

    summary: { type: String, required: true },

    requestMeta: {
      type: new Schema(
        {
          ip: String,
          userAgent: String,
        },
        { _id: false }
      ),
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'auditLogs',
  }
);

// ─── Indexes ────────────────────────────────────────────────────

auditLogSchema.index(
  { adminId: 1, createdAt: -1 },
  { name: 'admin_activity' }
);

auditLogSchema.index(
  { entityType: 1, entityId: 1, createdAt: -1 },
  { name: 'entity_history' }
);

// ─── Export ─────────────────────────────────────────────────────

export const AuditLog: Model<IAuditLog> =
  (mongoose.models.AuditLog as Model<IAuditLog>) ??
  mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
