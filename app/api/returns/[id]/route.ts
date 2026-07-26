import { NextResponse, type NextRequest } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import { ReturnRequest } from '@/lib/db/models/return-request.model';
import { requireAdmin } from '@/lib/auth/require-admin';

/**
 * PATCH /api/returns/:id  (admin – update return request status)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    await connectDB();

    const { id } = await params;
    const body = await request.json();
    const { status, adminNote } = body;

    const updated = await ReturnRequest.findByIdAndUpdate(
      id,
      { ...(status && { status }), ...(adminNote !== undefined && { adminNote }) },
      { new: true }
    ).lean();

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Return request not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : 'Failed to update return request';
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
