/**
 * Order status vocabulary — pure, safe to import from client components.
 *
 * The database stores `new | processing | shipped | delivered | cancelled`
 * (lib/db/types.ts). The admin orders screen, however, speaks
 * `pending | confirmed | shipped | delivered | cancelled`.
 *
 * Nothing translated between the two, so:
 *   - choosing "confirmed" or "pending" in admin wrote a value the schema does
 *     not allow straight into MongoDB (the update bypassed validation);
 *   - every new order arrived as `new`, which the admin table had no colour or
 *     menu entry for;
 *   - "Add Manual Order" always failed, because it created the order with
 *     status `confirmed` and the create path *does* validate.
 *
 * These two functions are the single translation point.
 */

import { ORDER_STATUS, type OrderStatus } from '@/lib/db/types';

/** What the admin UI shows, in workflow order. */
export const ADMIN_ORDER_STATUSES = [
  'pending',
  'confirmed',
  'shipped',
  'delivered',
  'cancelled',
] as const;
export type AdminOrderStatus = (typeof ADMIN_ORDER_STATUSES)[number];

const DB_TO_ADMIN: Record<OrderStatus, AdminOrderStatus> = {
  new: 'pending',
  processing: 'confirmed',
  shipped: 'shipped',
  delivered: 'delivered',
  cancelled: 'cancelled',
};

const ADMIN_TO_DB: Record<AdminOrderStatus, OrderStatus> = {
  pending: 'new',
  confirmed: 'processing',
  shipped: 'shipped',
  delivered: 'delivered',
  cancelled: 'cancelled',
};

/** Stored status → admin label. Tolerates legacy rows that hold a UI value. */
export function toAdminStatus(stored: string | null | undefined): AdminOrderStatus {
  if (!stored) return 'pending';
  if (stored in DB_TO_ADMIN) return DB_TO_ADMIN[stored as OrderStatus];
  if ((ADMIN_ORDER_STATUSES as readonly string[]).includes(stored)) {
    return stored as AdminOrderStatus;
  }
  return 'pending';
}

/** Admin label (or an already-canonical value) → stored status. */
export function toStoredStatus(value: string | null | undefined): OrderStatus | null {
  if (!value) return null;
  if (value in ADMIN_TO_DB) return ADMIN_TO_DB[value as AdminOrderStatus];
  return ORDER_STATUS.find((s) => s === value) ?? null;
}
