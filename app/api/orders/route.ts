import { NextRequest, NextResponse, after } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import { Order } from '@/lib/db/models/order.model';
import { sendOrderConfirmationEmail, sendAdminOrderNotification } from '@/lib/email/email';
import { guardAdmin, getClientIp } from '@/lib/auth/api-guard';
import { checkRateLimit, checkoutLimiter } from '@/lib/security/rate-limit';
import { RateLimitError, ValidationError } from '@/lib/errors';
import { ORDER_STATUS } from '@/lib/db/types';
import { orderService, type PlaceOrderInput } from '@/features/checkout/server/order.service';
import { captureException } from '@/lib/observability';

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
    // Public route (guest checkout) — rate limited per IP. No-ops without Upstash.
    await checkRateLimit(checkoutLimiter, `orders:${getClientIp(req)}`);

    const body = (await req.json()) as PlaceOrderInput;

    const result = await orderService.placeOrder(body);

    if (result.duplicate) {
      return NextResponse.json({
        success: true,
        order: { orderId: result.orderNumber },
        duplicate: true,
      });
    }

    // Dispatch emails *after* the response — a slow Resend call must not add
    // seconds to checkout or risk a function timeout once the order exists.
    // The outcome is persisted on the order so failures surface in admin.
    after(async () => {
      const { emailData } = result;

      const [customerResult, adminResult] = await Promise.allSettled([
        sendOrderConfirmationEmail(emailData),
        sendAdminOrderNotification(emailData),
      ]);

      const describe = (r: PromiseSettledResult<{ success: boolean; error?: string }>): string => {
        if (r.status === 'rejected') return `failed: ${String(r.reason)}`;
        return r.value.success ? 'sent' : `failed: ${r.value.error ?? 'unknown error'}`;
      };

      const emailStatus = {
        customer: emailData.customerEmail ? describe(customerResult) : 'skipped: no customer email',
        admin: describe(adminResult),
      };

      console.log(`\u{1F4E7} Order #${result.orderNumber} email dispatch:`, emailStatus);

      try {
        await Order.updateOne({ _id: result.orderId }, { $set: { emailStatus } });
      } catch (err) {
        console.error(`[POST /api/orders] failed to persist emailStatus for ${result.orderNumber}`, err);
      }
    });

    return NextResponse.json({
      success: true,
      order: {
        orderId: result.orderNumber,
        totalMinor: result.totalMinor,
        itemCount: result.itemCount,
      },
    });
  } catch (error: unknown) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { success: false, error: 'Too many checkout attempts. Please wait a moment and try again.' },
        { status: 429 },
      );
    }

    if (error instanceof ValidationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    console.error('[POST /api/orders]', error);
    captureException(error, { route: 'POST /api/orders' });

    // Recover from a duplicate-key race on the unique idempotency index.
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
 * Build a URL for an InstaPay proof from the *configured* storage, rather than
 * the hardcoded bucket of an unrelated project that used to be here.
 *
 * Note: proofs live in the private bucket, so this URL is not publicly
 * readable — rendering it in admin needs a presigned read
 * (`generatePresignedReadUrl`). Deferred until this route is behind
 * `requireAdmin()`, so we don't hand out working proof links on a public
 * endpoint in the meantime.
 */
function buildProofUrl(assetKey: string): string {
  const cdnUrl = process.env.CLOUDFRONT_URL;
  if (cdnUrl) return `${cdnUrl.replace(/\/$/, '')}/${assetKey}`;

  const bucket =
    process.env.S3_BUCKET_PRIVATE || process.env.S3_BUCKET_PUBLIC || 'shopwarda-media';
  const region = process.env.AWS_REGION || 'us-east-1';
  return `https://${bucket}.s3.${region}.amazonaws.com/${assetKey}`;
}

/**
 * GET /api/orders
 * Returns all orders formatted for admin panel with all fields.
 */
export async function GET(req: NextRequest) {
  const denied = await guardAdmin();
  if (denied) return denied;

  try {
    await connectDB();

    // Paginated: this used to return every order ever placed on each load.
    const params = req.nextUrl.searchParams;
    const page = Math.max(1, Number(params.get('page')) || 1);
    const pageSize = Math.min(200, Math.max(1, Number(params.get('pageSize')) || 50));
    // Only accept a real status; anything else is treated as "no filter".
    const statusParam = params.get('status');
    const statusFilter = ORDER_STATUS.find((s) => s === statusParam);

    const query: Record<string, unknown> = statusFilter ? { status: statusFilter } : {};

    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean() as unknown as Promise<OrderRaw[]>,
      Order.countDocuments(query),
    ]);

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
            : buildProofUrl(o.payment.instaPayAssetKey))
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

    return NextResponse.json({
      success: true,
      orders: formatted,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
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
  const denied = await guardAdmin();
  if (denied) return denied;

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
  const denied = await guardAdmin();
  if (denied) return denied;

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
