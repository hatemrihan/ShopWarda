import { NextRequest, NextResponse } from 'next/server';
import { sendOrderConfirmationEmail, sendAdminOrderNotification } from '@/lib/email/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, orderData } = body;

    if (!type || !orderData) {
      return NextResponse.json(
        { success: false, error: 'Missing type or orderData' },
        { status: 400 }
      );
    }

    // Normalize the payload to match our updated interface
    const emailPayload = {
      customerEmail: orderData.customerEmail || undefined,
      customerName: orderData.customerName,
      orderId: orderData.orderId,
      orderItems: orderData.orderItems || [],
      subtotal: orderData.subtotal || 0,
      shippingCost: orderData.shippingCost || 0,
      codFee: orderData.codFee || 0,
      discountAmount: orderData.discountAmount || 0,
      promoCode: orderData.promoCode || undefined,
      totalAmount: orderData.totalAmount,
      paymentMethod: orderData.paymentMethod,
      shippingAddress: orderData.shippingAddress || { governorate: '', city: '', address: '' },
      customerPhone: orderData.customerPhone,
    };

    if (type === 'customer') {
      const result = await sendOrderConfirmationEmail(emailPayload);
      if (result.success) {
        return NextResponse.json({ success: true });
      } else {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 500 }
        );
      }
    }

    if (type === 'admin') {
      const result = await sendAdminOrderNotification(emailPayload);
      if (result.success) {
        return NextResponse.json({ success: true });
      } else {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { success: false, error: `Unknown email type: ${type}` },
      { status: 400 }
    );
  } catch (error) {
    console.error('❌ Send email error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to send email' },
      { status: 500 }
    );
  }
}
