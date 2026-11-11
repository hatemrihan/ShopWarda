import { NextResponse, type NextRequest } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import { ReturnRequest } from '@/lib/db/models/return-request.model';
import { requireAdmin } from '@/lib/auth/require-admin';
import { UnauthorizedError } from '@/lib/errors';

/**
 * POST /api/returns  (public – storefront return request form)
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { orderName, phone, reason } = body;

    if (!orderName?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Order name is required' },
        { status: 400 }
      );
    }

    if (!phone?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Phone number is required' },
        { status: 400 }
      );
    }

    const returnReq = await ReturnRequest.create({
      orderName: orderName.trim(),
      phone: phone.trim(),
      reason: reason?.trim() || '',
      status: 'new',
    });

    return NextResponse.json({
      success: true,
      data: {
        id: returnReq._id.toString(),
        orderName: returnReq.orderName,
        phone: returnReq.phone,
      },
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const msg =
      error instanceof Error ? error.message : 'Failed to submit return request';
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}

/**
 * GET /api/returns  (admin – list all return requests)
 */
export async function GET() {
  try {
    await requireAdmin();
    await connectDB();

    const docs = await ReturnRequest.find({})
      .sort({ createdAt: -1 })
      .lean();

    const data = docs.map((doc) => ({
      id: doc._id.toString(),
      orderName: doc.orderName,
      phone: doc.phone || '',
      reason: doc.reason || '',
      status: doc.status,
      createdAt: doc.createdAt
        ? new Date(doc.createdAt).toISOString()
        : new Date().toISOString(),
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const msg =
      error instanceof Error ? error.message : 'Failed to fetch return requests';
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
