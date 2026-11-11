import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import connectDB from '@/lib/db/mongoose';
import { Order } from '@/lib/db/models/order.model';
import { getNextSequence } from '@/lib/db/models/counter.model';
import { requireAdmin } from '@/lib/auth/require-admin';
import { toStoredStatus } from '@/features/checkout/order-status';

/**
 * POST /api/orders/manual
 * Admin: record an order taken over WhatsApp or the phone.
 *
 * This route never worked: it created the order with status `confirmed`,
 * which is an admin-screen label and not a value the order schema accepts,
 * so every attempt ended in "Failed to create manual order". It also wrapped
 * an already-formatted order number in a second prefix ("WRD-WRD-00007").
 */

const money = z.number().min(0).max(10_000_000);

const manualOrderSchema = z.object({
  customerName: z.string().trim().min(1, 'Customer name is required').max(100),
  customerPhone: z.string().trim().min(1, 'Customer phone is required').max(30),
  customerEmail: z
    .union([z.literal(''), z.string().trim().email('Enter a valid e-mail address').max(200)])
    .optional(),
  shippingAddress: z
    .object({
      address: z.string().trim().max(300).optional(),
      city: z.string().trim().max(100).optional(),
    })
    .optional(),
  governorate: z.string().trim().max(100).optional(),
  items: z
    .array(
      z.object({
        name: z.string().trim().min(1, 'Every item needs a name').max(200),
        price: money,
        quantity: z.number().int().min(1).max(999),
        attributes: z.record(z.string(), z.string()).optional(),
      }),
    )
    .min(1, 'Add at least one item'),
  shippingCost: money.optional(),
  codFee: money.optional(),
  paymentMethod: z.enum(['cashOnDelivery', 'instaPay']),
  notes: z.string().trim().max(1000).optional(),
  status: z.string().optional(),
});

export async function POST(req: NextRequest) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const parsed = manualOrderSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid order' },
        { status: 400 },
      );
    }
    const body = parsed.data;

    await connectDB();

    const isCod = body.paymentMethod === 'cashOnDelivery';

    const orderItems = body.items.map((item) => {
      const unitPriceMinor = Math.round(item.price * 100);
      return {
        sku: 'MANUAL',
        productName: item.name,
        productSlug: 'manual',
        selectedOptions: item.attributes
          ? Object.entries(item.attributes)
              .filter(([label, value]) => label.trim() && value.trim())
              .map(([label, value]) => ({ label: label.trim(), value: value.trim() }))
          : [],
        quantity: item.quantity,
        unitPriceMinor,
        lineTotalMinor: unitPriceMinor * item.quantity,
      };
    });

    // Totals are derived here from the lines rather than trusted from the
    // form, so the stored subtotal, fees and total always add up.
    const subtotalMinor = orderItems.reduce((sum, i) => sum + i.lineTotalMinor, 0);
    const shippingFeeMinor = Math.round((body.shippingCost ?? 0) * 100);
    const codFeeMinor = isCod ? Math.round((body.codFee ?? 0) * 100) : 0;
    const shippingMinor = shippingFeeMinor + codFeeMinor; // stored together, as at checkout
    const totalMinor = subtotalMinor + shippingMinor;

    const status = toStoredStatus(body.status) ?? 'processing';

    // getNextSequence already returns the formatted number (e.g. "WRD-00007").
    const orderNumber = await getNextSequence('orderNumber');
    const idempotencyKeyHash = crypto
      .createHash('sha256')
      .update(`manual:${crypto.randomUUID()}`)
      .digest('hex');

    const city = body.shippingAddress?.city || body.governorate || 'N/A';

    const newOrder = await Order.create({
      orderNumber,
      idempotencyKeyHash,
      guest: {
        name: body.customerName,
        phone: body.customerPhone,
        email: body.customerEmail || undefined,
      },
      address: {
        governorate: body.governorate || 'N/A',
        city,
        area: '',
        street: body.shippingAddress?.address || 'N/A',
        building: 'N/A',
      },
      items: orderItems,
      pricing: {
        subtotalMinor,
        discountMinor: 0,
        shippingMinor,
        totalMinor,
        currency: 'EGP',
      },
      payment: {
        method: isCod ? 'cod' : 'instapay',
        status: isCod ? 'pending' : 'confirmed',
      },
      status,
      statusHistory: [{ status, at: new Date(), adminId: admin.adminId, note: 'Manual order' }],
      customerNote: body.notes || undefined,
    });

    return NextResponse.json({
      success: true,
      order: { orderId: newOrder.orderNumber },
    });
  } catch (error) {
    console.error('[POST /api/orders/manual]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create manual order' },
      { status: 500 },
    );
  }
}
