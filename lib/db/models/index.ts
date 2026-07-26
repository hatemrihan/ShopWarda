/**
 * Barrel export for all database models.
 * Import from '@/lib/db/models' for clean access.
 */

export { Category, type ICategory } from './category.model';
export { Product, type IProduct } from './product.model';
export { Cart, type ICart } from './cart.model';
export { Order, type IOrder } from './order.model';
export { Promotion, type IPromotion } from './promotion.model';
export { Admin, type IAdmin } from './admin.model';
export { Contact, type IContact } from './contact.model';
export { Subscriber, type ISubscriber } from './subscriber.model';
export { StoreSettings, type IStoreSettings, getSettings } from './store-settings.model';
export { AnalyticsEvent, type IAnalyticsEvent } from './analytics-event.model';
export { AuditLog, type IAuditLog } from './audit-log.model';
export { Counter, type ICounter, getNextSequence } from './counter.model';
