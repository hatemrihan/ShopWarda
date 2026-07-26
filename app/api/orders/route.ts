import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import connectDB from '@/lib/db/mongoose';
import { Order } from '@/lib/db/models/order.model';
import { Product } from '@/lib/db/models/product.model';
import { Promotion } from '@/lib/db/models/promotion.model';
import { getNextSequence } from '@/lib/db/models/counter.model';
import { getSettings } from '@/lib/db/models/store-settings.model';
import { sendOrderConfirmationEmail, sendAdminOrderNotification } from '@/lib/email/email';
import type {
  IOrderItem,
  IEgyptAddress,
  PaymentMethod,
  IVariant,
  IOptionDefinition,
  IOptionValue,
  IProductMedia,
} from '@/lib/db/types';

interface OrderItemInput {
  productId: string;
  variantId: string;
  quantity: number;
}

/**
 * POST /api/orders
 * Create a new order from checkout.
 *
 * Body: {
 *   customer: { name, phone, email? },
 *   address: { governorate, city, area, street, building, floor?, apartment?, landmark? },
 *   items: [{ productId, variantId, quantity }],
 *   paymentMethod: 'cod' | 'instapay',
 *   promoCode?: string,
 *   deliveryNotes?: string,
 *   customerNote?: string,
 *   instaPayAssetKey?: string,
 *   instaPayMime?: string,
 *   instaPaySize?: number,
 * }
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();

    // ── Validate required fields ──────────────────────────────
    const { customer, address, items, paymentMethod } = body;

    if (!customer?.name || !customer?.phone) {
      return NextResponse.json(
        { success: false, error: 'Customer name and phone are required' },
        { status: 400 },
      );
    }

    if (!address?.governorate || !address?.city || !address?.street) {
      return NextResponse.json(
        { success: false, error: 'Complete address is required' },
        { status: 400 },
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Order must have at least one item' },
        { status: 400 },
      );
    }

    if (!paymentMethod || !['cod', 'instapay'].includes(paymentMethod)) {
      return NextResponse.json(
        { success: false, error: 'Invalid payment method' },
        { status: 400 },
      );
    }

    // ── Generate idempotency key ──────────────────────────────
    const orderInputs = items as OrderItemInput[];
    const idempotencyData = JSON.stringify({
      phone: customer.phone,
      items: orderInputs.map((i) => `${i.productId}:${i.variantId}:${i.quantity}`).sort(),
    });
    const idempotencyKeyHash = crypto
      .createHash('sha256')
      .update(idempotencyData)
      .digest('hex');

    // Check for duplicate order
    const existingOrder = await Order.findOne({ idempotencyKeyHash });
    if (existingOrder) {
      return NextResponse.json({
        success: true,
        order: { orderId: existingOrder.orderNumber },
        duplicate: true,
      });
    }

    // ── Validate stock and build order items ──────────────────
    const orderItems: IOrderItem[] = [];
    let subtotalMinor = 0;

    for (const item of orderInputs) {
      const product = await Product.findById(item.productId);
      if (!product || product.status !== 'active') {
        return NextResponse.json(
          { success: false, error: `Product not found: ${item.productId}` },
          { status: 400 },
        );
      }

      let variant = product.variants.find(
        (v: IVariant) => v._id?.toString() === item.variantId
      );

      // Fallback: if variantId is product.id or doesn't match sub-variant _id, pick first active variant
      if (!variant) {
        variant = product.variants.find((v: IVariant) => v.status === 'active')
               || product.variants[0];
      }

      if (!variant || variant.status !== 'active') {
        return NextResponse.json(
          { success: false, error: `Variant not available for product: ${product.name}` },
          { status: 400 },
        );
      }

      if (variant.trackInventory && variant.stock < item.quantity) {
        return NextResponse.json(
          {
            success: false,
            error: `Insufficient stock for ${product.name}. Available: ${variant.stock}`,
          },
          { status: 400 },
        );
      }

      const lineTotalMinor = variant.priceMinor * item.quantity;
      subtotalMinor += lineTotalMinor;

      // Build selected options label
      const selectedOptions = variant.optionValues.map((ov) => {
        const optionDef = product.options.find((o: IOptionDefinition) => o.key === ov.optionKey);
        const valueDef = optionDef?.values.find((v: IOptionValue) => v.key === ov.valueKey);
        return {
          label: optionDef?.label ?? ov.optionKey,
          value: valueDef?.label ?? ov.valueKey,
        };
      });

      // Get first image
      const imageUrl =
        product.media.find((m: IProductMedia) => m.type === 'image')?.publicUrl ?? undefined;

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

    // ── Calculate shipping ────────────────────────────────────
    const settings = await getSettings();
    const zone = settings.shippingZones.find(
      (z) => z.governorate === address.governorate && z.enabled
    );
    const shippingMinor = zone?.feeMinor ?? 0;

    // ── Free delivery check ───────────────────────────────────
    const freeThreshold = settings.freeDeliveryThresholdMinor;
    const finalShippingMinor =
      freeThreshold && subtotalMinor >= freeThreshold ? 0 : shippingMinor;

    // ── COD fee ───────────────────────────────────────────────
    let codFeeMinor = 0;
    if (paymentMethod === 'cod' && zone?.codFeeMinor) {
      codFeeMinor = zone.codFeeMinor;
    }

    // ── Apply promo code ──────────────────────────────────────
    let discountMinor = 0;
    let appliedPromoCode: string | undefined;

    if (body.promoCode) {
      const promo = await Promotion.findOne({
        code: body.promoCode.toUpperCase().trim(),
        status: 'active',
      });

      if (promo) {
        const now = new Date();
        if (
          now >= promo.validFrom &&
          now <= promo.validUntil &&
          (!promo.usageLimit || promo.usageCount < promo.usageLimit)
        ) {
          if (!promo.minOrderMinor || subtotalMinor >= promo.minOrderMinor) {
            if (promo.type === 'percentage') {
              discountMinor = Math.round(subtotalMinor * (promo.value / 100));
              if (promo.maxDiscountMinor) {
                discountMinor = Math.min(discountMinor, promo.maxDiscountMinor);
              }
            } else {
              discountMinor = Math.min(promo.value, subtotalMinor);
            }

            appliedPromoCode = promo.code;

            // Increment usage count
            await Promotion.updateOne(
              { _id: promo._id },
              { $inc: { usageCount: 1 } },
            );
          }
        }
      }
    }

    // ── Calculate total ───────────────────────────────────────
    const totalMinor = subtotalMinor - discountMinor + finalShippingMinor + codFeeMinor;

    // ── Generate order number ─────────────────────────────────
    const orderNumber = await getNextSequence('orderNumber');

    // ── Create order ──────────────────────────────────────────
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
        subtotalMinor,
        discountMinor,
        shippingMinor: finalShippingMinor + codFeeMinor,
        totalMinor,
        currency: 'EGP' as const,
      },
      payment: {
        method: paymentMethod as PaymentMethod,
        status: paymentMethod === 'instapay' && body.instaPayAssetKey
          ? 'proof_uploaded'
          : 'pending',
        ...(paymentMethod === 'instapay' && body.instaPayAssetKey
          ? {
            instaPayAssetKey: body.instaPayAssetKey,
            instaPayMime: body.instaPayMime,
            instaPaySize: body.instaPaySize,
            instaPayUploadedAt: new Date(),
          }
          : {}),
      },
      promotionCode: appliedPromoCode,
      deliveryNotes: body.deliveryNotes?.trim(),
      customerNote: body.customerNote?.trim(),
      status: 'new',
    });

    // ── Decrement stock ───────────────────────────────────────
    for (const item of items) {
      await Product.updateOne(
        { _id: item.productId, 'variants._id': item.variantId },
        { $inc: { 'variants.$.stock': -item.quantity } },
      );
    }

    // ── Send Order Emails (Customer & Admin) ─────────────────
    const emailData = {
      customerEmail: customer.email?.trim() || undefined,
      customerName: customer.name.trim(),
      orderId: order.orderNumber,
      orderItems: orderItems.map((i) => ({
        name: i.productName,
        quantity: i.quantity,
        price: i.unitPriceMinor / 100,
        size: i.selectedOptions.find((o) => o.label.toLowerCase() === 'size')?.value,
        color: i.selectedOptions.find((o) => o.label.toLowerCase() === 'color')?.value,
      })),
      subtotal: subtotalMinor / 100,
      shippingCost: finalShippingMinor / 100,
      codFee: codFeeMinor / 100,
      discountAmount: discountMinor / 100,
      promoCode: appliedPromoCode,
      totalAmount: totalMinor / 100,
      paymentMethod,
      shippingAddress: {
        governorate: address.governorate,
        city: address.city,
        address: `${address.street}${address.building ? `, Bldg ${address.building}` : ''}`,
        apartment: address.apartment,
      },
      customerPhone: customer.phone.trim(),
    };

    // Await email dispatch so Resend errors and confirmations are captured
    const emailResults = await Promise.allSettled([
      sendOrderConfirmationEmail(emailData),
      sendAdminOrderNotification(emailData),
    ]);
    console.log('📧 Order Email Dispatch Results:', JSON.stringify(emailResults, null, 2));

    return NextResponse.json({
      success: true,
      order: {
        orderId: order.orderNumber,
        totalMinor,
        itemCount: orderItems.length,
      },
    });
  } catch (error: unknown) {
    console.error('[POST /api/orders]', error);

    // Handle duplicate key (idempotency)
    const errObj = error as { code?: number; keyValue?: { idempotencyKeyHash?: string }; keyPattern?: { idempotencyKeyHash?: number } };
    if (errObj.code === 11000 && errObj.keyPattern?.idempotencyKeyHash && errObj.keyValue?.idempotencyKeyHash) {
      const existing = await Order.findOne({
        idempotencyKeyHash: errObj.keyValue.idempotencyKeyHash,
      });
      if (existing) {
        return NextResponse.json({
          success: true,
          order: { orderId: existing.orderNumber },
          duplicate: true,
        });
      }
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create order' },
      { status: 500 },
    );
  }
}

interface OrderOption {
  label: string;
  value: string;
}

interface OrderItemRaw {
  sourceProductId?: { toString(): string };
  productName: string;
  unitPriceMinor?: number;
  quantity: number;
  selectedOptions?: OrderOption[];
  imageUrl?: string;
}

interface OrderRaw {
  _id: { toString(): string };
  orderNumber: string;
  guest?: { name?: string; phone?: string; email?: string };
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  customer?: { name?: string; phone?: string; email?: string };
  items?: OrderItemRaw[];
  pricing?: { subtotalMinor?: number; shippingMinor?: number; codFeePiasters?: number; totalMinor?: number };
  subtotalPiasters?: number;
  shippingFeePiasters?: number;
  codFeePiasters?: number;
  totalPiasters?: number;
  status?: string;
  payment?: { method?: string; status?: string; instaPayAssetKey?: string; instaPayMime?: string };
  paymentMethod?: string;
  paymentStatus?: string;
  address?: { street?: string; building?: string; city?: string; governorate?: string; lat?: number; lng?: number };
  shippingAddress?: { street?: string; building?: string; city?: string; governorate?: string; lat?: number; lng?: number };
  governorate?: string;
  customerNote?: string;
  customerNotes?: string;
  deliveryNotes?: string;
  createdAt: string | Date;
}

/**
 * GET /api/orders
 * Returns all orders formatted for admin panel with all fields.
 */
export async function GET() {
  try {
    await connectDB();
    const orders = (await Order.find().sort({ createdAt: -1 }).lean()) as unknown as OrderRaw[];

    const formatted = orders.map((o: OrderRaw) => ({
      id: o._id.toString(),
      order_number: o.orderNumber,
      customer_name: o.guest?.name || o.guestName || o.customer?.name || 'Guest',
      customer_email: o.guest?.email || o.guestEmail || o.customer?.email || null,
      customer_phone: o.guest?.phone || o.guestPhone || o.customer?.phone || null,
      items: (o.items || []).map((i: OrderItemRaw) => ({
        productId: i.sourceProductId?.toString() || '',
        name: i.productName,
        price: (i.unitPriceMinor || 0) / 100,
        quantity: i.quantity,
        size: i.selectedOptions?.find((opt: OrderOption) => opt.label?.toLowerCase() === 'size')?.value,
        color: i.selectedOptions?.find((opt: OrderOption) => opt.label?.toLowerCase() === 'color')?.value,
        attributes: i.selectedOptions && i.selectedOptions.length > 0
          ? Object.fromEntries(i.selectedOptions.map((opt: OrderOption) => [opt.label, opt.value]))
          : undefined,
        image: i.imageUrl,
      })),
      subtotal: ((o.pricing?.subtotalMinor ?? o.subtotalPiasters) || 0) / 100,
      shipping_cost: ((o.pricing?.shippingMinor ?? o.shippingFeePiasters) || 0) / 100,
      cod_fee: ((o.pricing?.codFeePiasters ?? o.codFeePiasters) || 0) / 100,
      total: ((o.pricing?.totalMinor ?? o.totalPiasters) || 0) / 100,
      currency: 'EGP',
      status: o.status || 'pending',
      payment_method: (o.payment?.method || o.paymentMethod) === 'cod' ? 'cashOnDelivery' : (o.payment?.method || o.paymentMethod),
      payment_status: o.payment?.status || o.paymentStatus || 'pending',
      payment_screenshot: o.payment?.instaPayAssetKey
        ? (o.payment.instaPayAssetKey.startsWith('http')
            ? o.payment.instaPayAssetKey
            : `https://alkady.s3.us-east-1.amazonaws.com/${o.payment.instaPayAssetKey}`)
        : null,
      shipping_address: {
        address: (o.address?.street || o.shippingAddress?.street) ? `${o.address?.street || o.shippingAddress?.street}${ (o.address?.building || o.shippingAddress?.building) ? `, Bldg ${o.address?.building || o.shippingAddress?.building}` : ''}` : '',
        city: o.address?.city || o.shippingAddress?.city || '',
        lat: o.address?.lat || o.shippingAddress?.lat,
        lng: o.address?.lng || o.shippingAddress?.lng,
      },
      governorate: o.address?.governorate || o.governorate || o.shippingAddress?.governorate || '',
      notes: o.customerNote || o.customerNotes || o.deliveryNotes || '',
      created_at: o.createdAt,
    }));

    return NextResponse.json({ success: true, orders: formatted });
  } catch (error) {
    console.error('[GET /api/orders]', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch orders' }, { status: 500 });
  }
}

/**
 * PATCH /api/orders
 * Update order status.
 */
export async function PATCH(req: NextRequest) {
  try {
    await connectDB();
    const { id, status } = await req.json();
    if (!id || !status) {
      return NextResponse.json({ success: false, error: 'Order ID and status required' }, { status: 400 });
    }
    await Order.findByIdAndUpdate(id, { status });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[PATCH /api/orders]', error);
    return NextResponse.json({ success: false, error: 'Failed to update order status' }, { status: 500 });
  }
}

/**
 * DELETE /api/orders
 * Permanently delete order.
 */
export async function DELETE(req: NextRequest) {
  try {
    await connectDB();
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ success: false, error: 'Order ID required' }, { status: 400 });
    }
    await Order.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/orders]', error);
    return NextResponse.json({ success: false, error: 'Failed to delete order' }, { status: 500 });
  }
}
