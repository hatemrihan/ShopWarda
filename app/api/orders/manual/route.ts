import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import connectDB from '@/lib/db/mongoose';
import { Order } from '@/lib/db/models/order.model';
import { getNextSequence } from '@/lib/db/models/counter.model';
import { guardAdmin } from '@/lib/auth/api-guard';

interface ManualItemInput {
  name: string;
  price: number;
  quantity: number;
  attributes?: Record<string, string>;
}

export async function POST(req: NextRequest) {
  const denied = await guardAdmin();
  if (denied) return denied;

  try {
    await connectDB();
    const body = await req.json();

    const seq = await getNextSequence('orderNumber');
    const orderNumber = `WRD-${seq.toString().padStart(5, '0')}`;

    const subtotalMinor = Math.round((body.subtotal || 0) * 100);
    const shippingMinor = Math.round((body.shippingCost || 0) * 100);
    const totalMinor = Math.round((body.totalAmount || 0) * 100);

    const orderItems = (body.items || []).map((item: ManualItemInput) => ({
      sourceProductId: undefined,
      sourceVariantId: undefined,
      sku: 'MANUAL',
      productName: item.name,
      productSlug: 'manual',
      selectedOptions: item.attributes ? Object.entries(item.attributes).map(([label, value]) => ({ label, value: String(value) })) : [],
      quantity: item.quantity,
      unitPriceMinor: Math.round((item.price || 0) * 100),
      lineTotalMinor: Math.round((item.price || 0) * item.quantity * 100),
    }));

    const idempotencyKey = `manual-${Date.now()}-${Math.random()}`;
    const idempotencyKeyHash = crypto.createHash('sha256').update(idempotencyKey).digest('hex');

    const newOrder = await Order.create({
      orderNumber,
      idempotencyKeyHash,
      guest: {
        name: body.customerName,
        phone: body.customerPhone,
        email: body.customerEmail || undefined,
      },
      address: {
        governorate: body.governorate || 'Cairo',
        city: body.shippingAddress?.city || 'Cairo',
        area: body.shippingAddress?.city || 'Cairo',
        street: body.shippingAddress?.address || 'Street',
        building: '1',
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
        method: body.paymentMethod === 'cashOnDelivery' ? 'cod' : 'instapay',
        status: body.paymentMethod === 'cashOnDelivery' ? 'pending' : 'confirmed',
      },
      status: body.status || 'confirmed',
      customerNote: body.notes || undefined,
    });

    return NextResponse.json({
      success: true,
      order: { orderId: newOrder.orderNumber },
    });
  } catch (error) {
    console.error('[POST /api/orders/manual]', error);
    return NextResponse.json({ success: false, error: 'Failed to create manual order' }, { status: 500 });
  }
}
