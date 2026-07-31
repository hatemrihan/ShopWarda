/**
 * Ensures all query-driven indexes exist.
 * Call once on app boot or via a migration script.
 *
 * Most indexes are already declared inline in each model schema.
 * This module calls ensureIndexes() on every model as a safety net
 * and documents the complete index plan in one place.
 *
 * INDEX PLAN
 * ──────────────────────────────────────────────────────────────
 * categories   { slug: 1 }                                    unique (schema)
 * categories   { parentId, sortOrder, status }                 nav tree
 * products     { slug: 1 }                                    unique (schema)
 * products     { "variants.sku": 1 }                          unique, sparse
 * products     { status, categoryIds, "priceRange.minMinor" }  shop filters
 * products     { tags: 1 }                                    tag search
 * products     { "bundleItems.productId": 1 }                 sparse bundle refs
 * carts        { tokenHash: 1 }                               unique (schema)
 * carts        { expiresAt: 1 }                               TTL
 * orders       { orderNumber: 1 }                             unique (schema)
 * orders       { idempotencyKeyHash: 1 }                      unique (schema)
 * orders       { status, createdAt: -1 }                      admin queue
 * orders       { "guest.phone", createdAt: -1 }               phone search
 * promotions   { code: 1 }                                    unique (schema)
 * promotions   { status, validFrom, validUntil }               active lookup
 * subscribers  { emailNormalized: 1 }                         unique (schema)
 * contacts     { status, createdAt: -1 }                      inbox workflow
 * analytics    { anonymousSessionId, occurredAt }              funnel
 * analytics    { expiresAt: 1 }                               TTL
 * auditLogs    { adminId, createdAt: -1 }                     admin activity
 * auditLogs    { entityType, entityId, createdAt: -1 }        entity history
 */

import { Category } from './models/category.model';
import { Product } from './models/product.model';
import { Cart } from './models/cart.model';
import { Order } from './models/order.model';
import { Promotion } from './models/promotion.model';
import { Admin } from './models/admin.model';
import { Contact } from './models/contact.model';
import { Subscriber } from './models/subscriber.model';
import { StoreSettings } from './models/store-settings.model';
import { AnalyticsEvent } from './models/analytics-event.model';
import { AuditLog } from './models/audit-log.model';
import { Counter } from './models/counter.model';
import { BouquetFlower, BouquetWrap } from './models/bouquet.model';

const ALL_MODELS = [
  Category,
  Product,
  Cart,
  Order,
  Promotion,
  Admin,
  Contact,
  Subscriber,
  StoreSettings,
  AnalyticsEvent,
  AuditLog,
  Counter,
  BouquetFlower,
  BouquetWrap,
] as const;

/**
 * Ensure all indexes declared in schemas are synced to MongoDB.
 * Safe to call multiple times — Mongoose skips existing indexes.
 */
export async function ensureAllIndexes(): Promise<void> {
  await Promise.all(
    ALL_MODELS.map((model) => model.ensureIndexes())
  );
}
