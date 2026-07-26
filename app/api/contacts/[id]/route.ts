import { NextResponse, type NextRequest } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import { Contact } from '@/lib/db/models/contact.model';
import { requireAdmin } from '@/lib/auth/require-admin';

/**
 * PATCH /api/contacts/:id  (admin – update contact status)
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

    const updated = await Contact.findByIdAndUpdate(
      id,
      { ...(status && { status }), ...(adminNote !== undefined && { adminNote }) },
      { new: true }
    ).lean();

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Contact not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : 'Failed to update contact';
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
