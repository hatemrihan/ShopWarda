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
import { placeOrderInputSchema } from '../schemas';
import { resolveShippingZone } from '../shipping';
import { ORDER_STATUS } from '@/lib/db/types';
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
  async placeOrder(rawInput: PlaceOrderInput): Promise<PlaceOrderResult> {
    // Trust boundary: everything below works on the parsed value only.
    const parsed = placeOrderInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      const details: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path.join('.') || 'order';
        (details[path] ??= []).push(issue.message);
      }
      throw new ValidationError(
        parsed.error.issues[0]?.message ?? 'Invalid order details',
        details,
      );
    }
    const input = parsed.data as PlaceOrderInput;

    await connectDB();

    const { customer, address, items, paymentMethod } = input;

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

    // One round-trip for every catalog product in the bag, instead of a
    // findById per line.
    const productIds = [
      ...new Set(items.filter((i) => !isBouquetItem(i)).map((i) => (i as CatalogItemInput).productId)),
    ];
    const productDocs = productIds.length
      ? await Product.find({ _id: { $in: productIds } })
      : [];
    const productsById = new Map(productDocs.map((p) => [p._id.toString(), p]));

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

      const product = productsById.get(item.productId);
      if (!product || product.status !== 'active') {
        throw new ValidationError(
          'An item in your bag is no longer available. Please remove it and try again.',
          {},
        );
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
          variant.stock > 0
            ? `Only ${variant.stock} of ${product.name} left in stock. Please update your bag.`
            : `${product.name} is sold out. Please remove it from your bag.`,
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

    // A payment method the shop has switched off must not be accepted just
    // because a stale page (or a hand-written request) still offers it.
    if (paymentMethod === 'cod' && settings.codEnabled === false) {
      throw new ValidationError('Cash on delivery is not available right now.', {});
    }
    if (paymentMethod === 'instapay' && settings.instaPayEnabled === false) {
      throw new ValidationError('InstaPay is not available right now.', {});
    }

    // Same resolver the checkout page uses, so the fee charged is the fee shown.
    // Previously only the governorate row was consulted: per-city rates set in
    // admin were ignored, and a governorate the shop had switched off was
    // silently delivered to for free.
    const resolution = resolveShippingZone(
      settings.shippingZones,
      address.governorate,
      address.city,
    );
    if (!resolution.ok) {
      throw new ValidationError(
        'Sorry, we do not deliver to this area yet. Please choose another governorate.',
        {},
      );
    }
    const shippingFeeMinor = resolution.shipping?.feeMinor ?? 0;
    const codFeeMinor =
      paymentMethod === 'cod' ? (resolution.shipping?.codFeeMinor ?? 0) : 0;

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

    // Reserve stock *before* the order exists. The old flow checked stock,
    // wrote the order, then decremented — two buyers racing for the last unit
    // both passed the check and both got an order. The guarded decrement makes
    // the second one fail here instead, with nothing to clean up.
    const reserved = await reserveStock(stockDecrements);
    if (!reserved.ok) {
      const name = orderItems.find(
        (i) => i.sourceVariantId && String(i.sourceVariantId) === reserved.failedVariantId,
      )?.productName;
      throw new ValidationError(
        `${name ?? 'An item in your bag'} just sold out. Please update your bag and try again.`,
        {},
      );
    }

    let order;
    let orderNumber: string;
    try {
      orderNumber = await getNextSequence('orderNumber');

      order = await Order.create({
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
        // The checkout form has no building field; the schema requires one.
        building: address.building || 'N/A',
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
    } catch (err) {
      // The order was not written — hand the reserved units back.
      await releaseStock(stockDecrements, 'order-create-failed');
      throw err;
    }

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

    // Stock just changed outside the admin mutation path, so the tag-cached
    // catalog reads must be dropped or the PDP will show stale availability.
    // Only when a variant actually ran out, though: flushing the whole catalog
    // cache on every order made each sale a cold page for the next visitor.
    const soldOut = stockDecrements.some((dec) => {
      const variant = productsById
        .get(String(dec.productId))
        ?.variants.find((v: IVariant) => String(v._id) === String(dec.variantId));
      return !variant || variant.stock - dec.quantity <= (variant.lowStockThreshold ?? 0);
    });
    if (soldOut) {
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
    const nextStatus = ORDER_STATUS.find((s) => s === status);
    if (!nextStatus) {
      throw new ValidationError(`Unknown order status: ${status}`, {});
    }
    if (!isValidObjectId(orderId)) throw new ValidationError('Order not found', {});

    await connectDB();
    const order = await Order.findById(orderId);
    if (!order) throw new ValidationError('Order not found', {});

    const previousStatus = order.status;
    if (previousStatus === nextStatus) return order;

    order.status = nextStatus;
    order.statusHistory.push({
      status: nextStatus,
      at: new Date(),
      adminId: toObjectId(adminId),
      note,
    });

    await order.save();

    // Cancelling frees the units the order was holding; un-cancelling takes
    // them again (best effort — the admin has decided the order stands).
    const moves = stockMovesOf(order.items);
    if (moves.length > 0) {
      if (nextStatus === 'cancelled') {
        await releaseStock(moves, `order-cancelled:${order.orderNumber}`);
      } else if (previousStatus === 'cancelled') {
        const retaken = await reserveStock(moves);
        if (!retaken.ok) {
          logger.warn('Re-opened a cancelled order without enough stock', {
            orderNumber: order.orderNumber,
          });
        }
      }
      if (nextStatus === 'cancelled' || previousStatus === 'cancelled') {
        try {
          invalidateProducts();
        } catch (err) {
          logger.error('Catalog cache invalidation failed', { orderId, err });
        }
      }
    }

    logger.info('Order status updated', { orderId, status: nextStatus, adminId });
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

interface StockMove {
  productId: Types.ObjectId;
  variantId: Types.ObjectId;
  quantity: number;
}

/**
 * Atomically take stock for every line, or take none.
 *
 * Each decrement is guarded (`stock >= quantity`), so concurrent checkouts
 * cannot drive a variant negative. If any line misses, the lines already taken
 * are handed back and the caller is told which variant ran out.
 */
async function reserveStock(
  moves: StockMove[],
): Promise<{ ok: true } | { ok: false; failedVariantId: string }> {
  const taken: StockMove[] = [];

  for (const move of moves) {
    const result = await Product.updateOne(
      {
        _id: move.productId,
        variants: {
          $elemMatch: { _id: move.variantId, stock: { $gte: move.quantity } },
        },
      },
      { $inc: { 'variants.$.stock': -move.quantity } },
    );

    if (result.modifiedCount === 0) {
      await releaseStock(taken, 'reservation-rolled-back');
      return { ok: false, failedVariantId: String(move.variantId) };
    }
    taken.push(move);
  }

  return { ok: true };
}

/** Hand units back (failed order, cancelled order). Never throws. */
async function releaseStock(moves: StockMove[], reason: string): Promise<void> {
  for (const move of moves) {
    try {
      await Product.updateOne(
        { _id: move.productId, 'variants._id': move.variantId },
        { $inc: { 'variants.$.stock': move.quantity } },
      );
    } catch (err) {
      logger.error('Stock release failed', {
        reason,
        productId: String(move.productId),
        variantId: String(move.variantId),
        quantity: move.quantity,
        err,
      });
    }
  }
}

/** The stock a placed order is holding (catalog lines only; bouquets hold none). */
function stockMovesOf(items: IOrderItem[]): StockMove[] {
  return items
    .filter((i) => i.sourceProductId && i.sourceVariantId)
    .map((i) => ({
      productId: i.sourceProductId as Types.ObjectId,
      variantId: i.sourceVariantId as Types.ObjectId,
      quantity: i.quantity,
    }));
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
