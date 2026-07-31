/**
 * Order Service — the single order-creation path.
 *
 * This used to be a parallel, unused implementation that disagreed with the
 * live `POST /api/orders` (server-cart source, `config/shipping.ts` fees,
 * counter name 'order'). The live route's logic now lives here and the route
 * delegates, so there is one place where an order is priced and written.
 *
 * Money is integer piasters throughout.
 */

import crypto from 'crypto';
import mongoose, { isValidObjectId, type Types } from 'mongoose';
import connectDB from '@/lib/db/mongoose';
import { Order } from '@/lib/db/models/order.model';
import { Product } from '@/lib/db/models/product.model';
import { Promotion } from '@/lib/db/models/promotion.model';
import { getNextSequence } from '@/lib/db/models/counter.model';
import { getSettings } from '@/lib/db/models/store-settings.model';
import { ValidationError } from '@/lib/errors';
import logger from '@/lib/logger';
import { invalidateProducts } from '@/lib/cache';
import { computeOrderPricing, computePromoDiscount, type PricingResult } from '../pricing';
import { priceBouquet } from '@/features/bouquet/server/bouquet.service';
import type { BouquetConfig } from '@/features/bouquet/schemas';
import type {
  IOrderItem,
  IEgyptAddress,
  PaymentMethod,
  IVariant,
  IOptionDefinition,
  IOptionValue,
  IProductMedia,
} from '@/lib/db/types';

// ─── Input ──────────────────────────────────────────────────────

export interface CatalogItemInput {
  kind?: 'catalog';
  productId: string;
  variantId: string;
  quantity: number;
}

/**
 * A composed bouquet. Carries no prices — the server re-reads every price
 * from the database, so a tampered payload cannot set its own total.
 */
export interface BouquetItemInput {
  kind: 'bouquet';
  config: BouquetConfig;
  quantity: number;
}

export type OrderItemInput = CatalogItemInput | BouquetItemInput;

function isBouquetItem(item: OrderItemInput): item is BouquetItemInput {
  return item.kind === 'bouquet';
}

export interface PlaceOrderInput {
  customer: { name: string; phone: string; email?: string };
  address: {
    governorate: string;
    city: string;
    area?: string;
    street: string;
    building?: string;
    floor?: string;
    apartment?: string;
    landmark?: string;
    lat?: number;
    lng?: number;
  };
  items: OrderItemInput[];
  paymentMethod: PaymentMethod;
  idempotencyKey?: string;
  promoCode?: string;
  deliveryNotes?: string;
  customerNote?: string;
  instaPayAssetKey?: string;
  instaPayMime?: string;
  instaPaySize?: number;
}

export interface PlaceOrderResult {
  duplicate: boolean;
  orderNumber: string;
  orderId: string;
  totalMinor: number;
  itemCount: number;
  /** Everything the email layer needs, so callers don't re-derive it. */
  emailData: OrderEmailPayload;
}

export interface OrderEmailPayload {
  customerEmail?: string;
  customerName: string;
  orderId: string;
  orderItems: {
    name: string;
    quantity: number;
    price: number;
    size?: string;
    color?: string;
    attributes?: Record<string, string>;
  }[];
  subtotal: number;
  shippingCost: number;
  codFee: number;
  discountAmount: number;
  promoCode?: string;
  totalAmount: number;
  paymentMethod: string;
  shippingAddress: {
    governorate: string;
    city: string;
    address: string;
    apartment?: string;
  };
  customerPhone: string;
  deliveryNotes?: string;
}

// ─── Pure pricing ───────────────────────────────────────────────
// Lives in ../pricing.ts so the money maths stays free of database imports
// and can be unit tested. Re-exported here for existing callers.

export {
  computeOrderPricing,
  computePromoDiscount,
  type PricingInput,
  type PricingResult,
  type PromoRules,
} from '../pricing';

// ─── Idempotency ────────────────────────────────────────────────

/**
 * The client sends a UUID per checkout attempt. Without one we fall back to a
 * content hash bucketed by day — a content-only hash meant a returning
 * customer re-ordering identical items was rejected as a duplicate forever.
 */
export function buildIdempotencyHash(input: PlaceOrderInput): string {
  const clientKey = input.idempotencyKey?.trim().slice(0, 200);

  const data = clientKey
    ? `key:${clientKey}`
    : JSON.stringify({
        phone: input.customer.phone,
        items: input.items
          .map((i) =>
            isBouquetItem(i)
              ? `bouquet:${JSON.stringify(i.config)}:${i.quantity}`
              : `${i.productId}:${i.variantId}:${i.quantity}`
          )
          .sort(),
        day: new Date().toISOString().slice(0, 10),
      });

  return crypto.createHash('sha256').update(data).digest('hex');
}

// ─── Service ────────────────────────────────────────────────────

export const orderService = {
  computeOrderPricing,

  /**
   * Create an order from checkout input.
   * Throws ValidationError for anything the customer can fix.
   */
  async placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
    await connectDB();

    const { customer, address, items, paymentMethod } = input;

    if (!customer?.name || !customer?.phone) {
      throw new ValidationError('Customer name and phone are required', {});
    }
    if (!address?.governorate || !address?.city || !address?.street) {
      throw new ValidationError('Complete address is required', {});
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new ValidationError('Order must have at least one item', {});
    }
    if (!paymentMethod || !['cod', 'instapay'].includes(paymentMethod)) {
      throw new ValidationError('Invalid payment method', {});
    }

    const idempotencyKeyHash = buildIdempotencyHash(input);

    const existingOrder = await Order.findOne({ idempotencyKeyHash });
    if (existingOrder) {
      return {
        duplicate: true,
        orderNumber: existingOrder.orderNumber,
        orderId: existingOrder._id.toString(),
        totalMinor: existingOrder.pricing.totalMinor,
        itemCount: existingOrder.items.length,
        emailData: buildEmailPayload(input, existingOrder.orderNumber, existingOrder.items, {
          subtotalMinor: existingOrder.pricing.subtotalMinor,
          discountMinor: existingOrder.pricing.discountMinor,
          shippingMinor: existingOrder.pricing.shippingMinor,
          codFeeMinor: 0,
          totalMinor: existingOrder.pricing.totalMinor,
        }, existingOrder.promotionCode),
      };
    }

    // ── Resolve products, validate stock, build snapshot items ──
    const orderItems: IOrderItem[] = [];
    const stockDecrements: {
      productId: Types.ObjectId;
      variantId: Types.ObjectId;
      quantity: number;
    }[] = [];
    let subtotalMinor = 0;

    for (const item of items) {
      // ── Custom bouquet: priced entirely server-side ───────────
      if (isBouquetItem(item)) {
        const quantity = Math.max(1, item.quantity ?? 1);
        const priced = await priceBouquet(item.config);

        const lineTotalMinor = priced.totalMinor * quantity;
        subtotalMinor += lineTotalMinor;

        orderItems.push({
          sku: 'CUSTOM-BOUQUET',
          productName: `Custom Bouquet (${priced.stemCount} stems)`,
          productSlug: 'custom-bouquet',
          // Human-readable lines, so the existing admin table, CSV exports and
          // email `attributes` path render the composition with no extra work.
          selectedOptions: priced.summaryLines,
          imageUrl: undefined,
          quantity,
          unitPriceMinor: priced.totalMinor,
          lineTotalMinor,
          customBouquet: {
            flowers: priced.flowers.map((f) => ({
              flowerId: toObjectId(f.flowerId),
              name: f.name,
              colorKey: f.colorKey,
              colorLabel: f.colorLabel,
              qty: f.qty,
              perStemMinor: f.perStemMinor,
              lineMinor: f.lineMinor,
            })),
            wrap: {
              wrapId: toObjectId(priced.wrap.wrapId),
              name: priced.wrap.name,
              material: priced.wrap.material,
              priceMinor: priced.wrap.priceMinor,
            },
            cardMessage: priced.cardMessage,
            cardPriceMinor: priced.cardPriceMinor,
            basePriceMinor: priced.basePriceMinor,
          },
        });

        // Bouquets are made to order — no variant stock to decrement.
        continue;
      }

      const product = await Product.findById(item.productId);
      if (!product || product.status !== 'active') {
        throw new ValidationError(`Product not found: ${item.productId}`, {});
      }

      let variant = product.variants.find(
        (v: IVariant) => v._id?.toString() === item.variantId
      );

      // Fallback: the client may send a product id rather than a variant id.
      if (!variant) {
        variant =
          product.variants.find((v: IVariant) => v.status === 'active') ??
          product.variants[0];
      }

      if (!variant || variant.status !== 'active') {
        throw new ValidationError(
          `Variant not available for product: ${product.name}`,
          {},
        );
      }

      if (variant.trackInventory && variant.stock < item.quantity) {
        throw new ValidationError(
          `Insufficient stock for ${product.name}. Available: ${variant.stock}`,
          {},
        );
      }

      const lineTotalMinor = variant.priceMinor * item.quantity;
      subtotalMinor += lineTotalMinor;

      const selectedOptions = variant.optionValues.map((ov) => {
        const optionDef = product.options.find(
          (o: IOptionDefinition) => o.key === ov.optionKey,
        );
        const valueDef = optionDef?.values.find(
          (v: IOptionValue) => v.key === ov.valueKey,
        );
        return {
          label: optionDef?.label ?? ov.optionKey,
          value: valueDef?.label ?? ov.valueKey,
        };
      });

      const imageUrl =
        product.media.find((m: IProductMedia) => m.type === 'image')?.publicUrl ??
        undefined;

      if (variant.trackInventory && variant._id) {
        stockDecrements.push({
          productId: product._id,
          variantId: variant._id,
          quantity: item.quantity,
        });
      }

      orderItems.push({
        sourceProductId: product._id,
        sourceVariantId: variant._id,
        sku: variant.sku,
        productName: product.name,
        productSlug: product.slug,
        selectedOptions,
        imageUrl,
        quantity: item.quantity,
        unitPriceMinor: variant.priceMinor,
        lineTotalMinor,
      });
    }

    // ── Shipping / COD fee from store settings ──────────────────
    const settings = await getSettings();
    const zone = settings.shippingZones.find(
      (z) => z.governorate === address.governorate && z.enabled,
    );
    const shippingFeeMinor = zone?.feeMinor ?? 0;
    const codFeeMinor =
      paymentMethod === 'cod' && zone?.codFeeMinor ? zone.codFeeMinor : 0;

    // ── Promo ───────────────────────────────────────────────────
    let discountMinor = 0;
    let appliedPromoCode: string | undefined;
    let promoIdToIncrement: Types.ObjectId | null = null;

    if (input.promoCode) {
      const promo = await Promotion.findOne({
        code: input.promoCode.toUpperCase().trim(),
        status: 'active',
      });

      if (promo) {
        discountMinor = computePromoDiscount(promo, subtotalMinor);
        if (discountMinor > 0) {
          appliedPromoCode = promo.code;
          promoIdToIncrement = promo._id;
        }
      }
    }

    const pricing = computeOrderPricing({
      subtotalMinor,
      shippingFeeMinor,
      codFeeMinor,
      discountMinor,
      freeDeliveryThresholdMinor: settings.freeDeliveryThresholdMinor,
    });

    const orderNumber = await getNextSequence('orderNumber');

    const order = await Order.create({
      orderNumber,
      idempotencyKeyHash,
      guest: {
        name: customer.name.trim(),
        phone: customer.phone.trim(),
        email: customer.email?.trim().toLowerCase(),
      },
      address: {
        governorate: address.governorate,
        city: address.city,
        area: address.area ?? '',
        street: address.street,
        building: address.building,
        floor: address.floor,
        apartment: address.apartment,
        landmark: address.landmark,
        lat: address.lat,
        lng: address.lng,
      } as IEgyptAddress,
      items: orderItems,
      pricing: {
        subtotalMinor: pricing.subtotalMinor,
        discountMinor: pricing.discountMinor,
        // Shipping and COD fee are stored together, as the schema has no
        // separate COD column.
        shippingMinor: pricing.shippingMinor + pricing.codFeeMinor,
        totalMinor: pricing.totalMinor,
        currency: 'EGP' as const,
      },
      payment: {
        method: paymentMethod,
        status:
          paymentMethod === 'instapay' && input.instaPayAssetKey
            ? 'proof_uploaded'
            : 'pending',
        ...(paymentMethod === 'instapay' && input.instaPayAssetKey
          ? {
              instaPayAssetKey: input.instaPayAssetKey,
              instaPayMime: input.instaPayMime,
              instaPaySize: input.instaPaySize,
              instaPayUploadedAt: new Date(),
            }
          : {}),
      },
      promotionCode: appliedPromoCode,
      deliveryNotes: input.deliveryNotes?.trim(),
      customerNote: input.customerNote?.trim(),
      status: 'new',
    });

    // ── Post-create side effects (never fatal to a placed order) ─
    if (promoIdToIncrement) {
      try {
        await Promotion.updateOne(
          { _id: promoIdToIncrement },
          { $inc: { usageCount: 1 } },
        );
      } catch (err) {
        logger.error('Promo usage increment failed', { orderNumber, err });
      }
    }

    await decrementStock(stockDecrements, order.orderNumber);

    // Stock just changed outside the admin mutation path, so the tag-cached
    // catalog reads must be dropped or the PDP will show stale availability.
    if (stockDecrements.length > 0) {
      try {
        invalidateProducts();
      } catch (err) {
        logger.error('Catalog cache invalidation failed', { orderNumber: order.orderNumber, err });
      }
    }

    return {
      duplicate: false,
      orderNumber: order.orderNumber,
      orderId: order._id.toString(),
      totalMinor: pricing.totalMinor,
      itemCount: orderItems.length,
      emailData: buildEmailPayload(
        input,
        order.orderNumber,
        orderItems,
        pricing,
        appliedPromoCode,
      ),
    };
  },

  /** Admin: update order status */
  async updateStatus(orderId: string, status: string, adminId: string, note?: string) {
    await connectDB();
    const order = await Order.findById(orderId);
    if (!order) throw new ValidationError('Order not found', {});

    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    order.status = status as any;
    order.statusHistory.push({
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      status: status as any,
      at: new Date(),
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      adminId: adminId as any,
      note,
    });

    await order.save();
    logger.info('Order status updated', { orderId, status, adminId });
    return order;
  },

  /** Admin: attach an InstaPay proof to an existing order */
  async attachPaymentProof(orderId: string, assetKey: string, mime: string, size: number) {
    await connectDB();
    const order = await Order.findById(orderId);
    if (!order) throw new ValidationError('Order not found', {});

    order.payment.instaPayAssetKey = assetKey;
    order.payment.instaPayMime = mime;
    order.payment.instaPaySize = size;
    order.payment.instaPayUploadedAt = new Date();
    order.payment.status = 'proof_uploaded';

    await order.save();
    return order;
  },
};

// ─── Helpers ────────────────────────────────────────────────────

/** Snapshot ids are stored as ObjectIds; tolerate anything unparseable. */
function toObjectId(id: string): Types.ObjectId | undefined {
  return isValidObjectId(id) ? new mongoose.Types.ObjectId(id) : undefined;
}

/**
 * Guarded stock decrement: only decrements when the variant still holds enough
 * stock, so concurrent orders cannot drive it negative. A miss is logged and
 * tolerated — the order stands, arrangements are made to order.
 */
async function decrementStock(
  decrements: { productId: Types.ObjectId; variantId: Types.ObjectId; quantity: number }[],
  orderNumber: string,
): Promise<void> {
  for (const dec of decrements) {
    try {
      const result = await Product.updateOne(
        {
          _id: dec.productId,
          variants: {
            $elemMatch: { _id: dec.variantId, stock: { $gte: dec.quantity } },
          },
        },
        { $inc: { 'variants.$.stock': -dec.quantity } },
      );

      if (result.modifiedCount === 0) {
        logger.warn('Stock decrement missed', {
          orderNumber,
          productId: String(dec.productId),
          variantId: String(dec.variantId),
          quantity: dec.quantity,
        });
      }
    } catch (err) {
      logger.error('Stock decrement failed', { orderNumber, err });
    }
  }
}

function buildEmailPayload(
  input: PlaceOrderInput,
  orderNumber: string,
  orderItems: IOrderItem[],
  pricing: PricingResult,
  promoCode?: string,
): OrderEmailPayload {
  const { customer, address } = input;

  return {
    customerEmail: customer.email?.trim() || undefined,
    customerName: customer.name.trim(),
    orderId: orderNumber,
    orderItems: orderItems.map((i) => ({
      name: i.productName,
      quantity: i.quantity,
      price: i.unitPriceMinor / 100,
      size: i.selectedOptions.find((o) => o.label.toLowerCase() === 'size')?.value,
      color: i.selectedOptions.find((o) => o.label.toLowerCase() === 'color')?.value,
      attributes:
        i.selectedOptions.length > 0
          ? Object.fromEntries(i.selectedOptions.map((o) => [o.label, o.value]))
          : undefined,
    })),
    subtotal: pricing.subtotalMinor / 100,
    shippingCost: pricing.shippingMinor / 100,
    codFee: pricing.codFeeMinor / 100,
    discountAmount: pricing.discountMinor / 100,
    promoCode,
    totalAmount: pricing.totalMinor / 100,
    paymentMethod: input.paymentMethod,
    shippingAddress: {
      governorate: address.governorate,
      city: address.city,
      address: `${address.street}${address.building ? `, Bldg ${address.building}` : ''}`,
      apartment: address.apartment,
    },
    customerPhone: customer.phone.trim(),
    deliveryNotes: input.deliveryNotes?.trim(),
  };
}
