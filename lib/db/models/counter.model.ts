import mongoose, { Schema, type Model } from 'mongoose';

/**
 * Atomic counter for generating sequential identifiers.
 * Used for human-readable order numbers (WRD-0001, WRD-0002, ...).
 */

export interface ICounter {
  _id: string;
  seq: number;
}

const counterSchema = new Schema<ICounter>(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
  },
  {
    collection: 'counters',
    versionKey: false,
  }
);

export const Counter: Model<ICounter> =
  (mongoose.models.Counter as Model<ICounter>) ??
  mongoose.model<ICounter>('Counter', counterSchema);

/**
 * Atomically get the next sequence value.
 * Creates the counter document on first call.
 *
 * @param name - Counter identifier (e.g., 'orderNumber')
 * @param prefix - Optional prefix (e.g., 'WRD')
 * @param padLength - Zero-pad width (default 5)
 * @returns Formatted string like "WRD-00001"
 */
export async function getNextSequence(
  name: string,
  prefix = 'WRD',
  padLength = 5
): Promise<string> {
  const counter = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  return `${prefix}-${String(counter.seq).padStart(padLength, '0')}`;
}
