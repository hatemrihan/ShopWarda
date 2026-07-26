/**
 * Order Service — creates immutable commercial snapshots from cart.
 */

import connectDB from '@/lib/db/mongoose';
import { Order } from '@/lib/db/models/order.model';
import { getNextSequence } from '@/lib/db/models/counter.model';
import { cartService } from '@/features/cart/server/cart.service';
import { getShippingFee, getEstimatedDays } from '@/config/shipping';
import { commerce } from '@/config/commerce';
import { placeOrderSchema, type PlaceOrderInput } from '../schemas';
import { ValidationError } from '@/lib/errors';
import { hashIdempotencyKey } from '@/lib/security/idempotency';
import logger from '@/lib/logger';
import { productRepository } from '@/features/catalog/server/product.repository';

// ─── Order Number Generation ────────────────────────────────────

async function generateOrderNumber(): Promise<string> {
  await connectDB();
  return getNextSequence('order', commerce.orderPrefix, 6);
}

// ─── Service ────────────────────────────────────────────────────

export const orderService = {
  async placeOrder(input: PlaceOrderInput): Promise<{ orderNumber: string; orderId: string }> {
    const parsed = placeOrderSchema.safeParse(input);
    if (!parsed.success) {
      const details: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path.join('.');
        details[path] = details[path] ?? [];
        details[path].push(issue.message);
      }
      throw new ValidationError('Invalid checkout data', details);
    }

    const data = parsed.data;
    await connectDB();

    // 1. Get current cart
    const cart = await cartService.getCart();
    if (cart.items.length === 0) {
      throw new ValidationError('Cart is empty', {});
    }

    // 2. Validate all items still in stock
    const outOfStock = cart.items.filter((i) => !i.inStock);
    if (outOfStock.length > 0) {
      throw new ValidationError(
        `Items out of stock: ${outOfStock.map((i) => i.productName).join(', ')}`,
        { items: outOfStock.map((i) => `${i.productName} is unavailable`) }
      );
    }

    // 3. Idempotency check
    const idempotencyKey = `${cart.id}:${data.guest.phone}:${cart.subtotalPiasters}`;
    const idempotencyHash = hashIdempotencyKey(idempotencyKey);

    const existing = await Order.findOne({ idempotencyKeyHash: idempotencyHash });
    if (existing) {
      return { orderNumber: existing.orderNumber, orderId: existing._id.toString() };
    }

    // 4. Calculate shipping
    const shippingFee = getShippingFee(data.address.governorate);
    const estimatedDays = getEstimatedDays(data.address.governorate);

    // 5. Build immutable order items (snapshot)
    const orderItems = cart.items.map((item) => ({
      sourceProductId: item.productId,
      sourceVariantId: item.variantId,
      sku: item.sku,
      productName: item.productName,
      productSlug: item.productSlug,
      selectedOptions: item.selectedOptions,
      imageUrl: item.imageUrl,
      quantity: item.quantity,
      unitPriceMinor: item.unitPricePiasters,
      lineTotalMinor: item.lineTotalPiasters,
    }));

    const subtotal = cart.subtotalPiasters;
    const total = subtotal + shippingFee;

    // 6. Generate order number
    const orderNumber = await generateOrderNumber();

    // 7. Create order
    const order = await Order.create({
      orderNumber,
      idempotencyKeyHash: idempotencyHash,
      sourceCartId: cart.id || undefined,
      guest: data.guest,
      address: data.address,
      items: orderItems,
      pricing: {
        subtotalMinor: subtotal,
        discountMinor: 0,
        shippingMinor: shippingFee,
        totalMinor: total,
        currency: 'EGP',
      },
      payment: {
        method: data.paymentMethod,
        status: 'pending',
      },
      customerNote: data.customerNote,
      estimatedDeliveryAt: new Date(Date.now() + estimatedDays * 24 * 60 * 60 * 1000),
    });

    // 8. Decrement stock for each item
    for (const item of cart.items) {
      await productRepository.decrementStock(item.productId, item.variantId, item.quantity);
    }

    // 9. Mark cart as converted
    if (cart.id) {
      await cartService.convertCart(cart.id);
    }

    logger.info('Order placed', { orderNumber, total, method: data.paymentMethod });

    return { orderNumber, orderId: order._id.toString() };
  },

  /** Admin: list orders with pagination */
  async listOrders(
    filter: { status?: string } = {},
    pagination = { page: 1, pageSize: 20 }
  ) {
    await connectDB();
    const query: Record<string, unknown> = {};
    if (filter.status) query.status = filter.status;

    const [docs, total] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip((pagination.page - 1) * pagination.pageSize)
        .limit(pagination.pageSize)
        .lean(),
      Order.countDocuments(query),
    ]);

    return {
      items: docs.map((d) => ({
        id: d._id.toString(),
        orderNumber: d.orderNumber,
        guestName: d.guest.name,
        guestPhone: d.guest.phone,
        governorate: d.address.governorate,
        totalPiasters: d.pricing.totalMinor,
        itemCount: d.items.length,
        paymentMethod: d.payment.method,
        paymentStatus: d.payment.status,
        status: d.status,
        createdAt: d.createdAt.toISOString(),
      })),
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: Math.ceil(total / pagination.pageSize),
    };
  },

  /** Admin: update order status */
  async updateStatus(
    orderId: string,
    status: string,
    adminId: string,
    note?: string
  ) {
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

  /** Admin: upload InstaPay proof */
  async attachPaymentProof(
    orderId: string,
    assetKey: string,
    mime: string,
    size: number
  ) {
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
