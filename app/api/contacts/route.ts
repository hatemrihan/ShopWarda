import { NextResponse, type NextRequest } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import { Contact } from '@/lib/db/models/contact.model';
import { requireAdmin } from '@/lib/auth/require-admin';
import { checkRateLimit, contactLimiter } from '@/lib/security/rate-limit';
import { getClientIp } from '@/lib/auth/api-guard';
import { RateLimitError, UnauthorizedError } from '@/lib/errors';

/**
 * POST /api/contacts  (public – storefront contact form)
 */
export async function POST(request: NextRequest) {
  try {
    // Public form — rate limited per IP. No-ops without Upstash.
    await checkRateLimit(contactLimiter, `contact:${getClientIp(request)}`);

    await connectDB();
    const body = await request.json();
    const { name, phone, message } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }

    if (!phone?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Phone number is required' },
        { status: 400 }
      );
    }

    if (!message?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Message is required' },
        { status: 400 }
      );
    }

    const contact = await Contact.create({
      name: name.trim(),
      phone: phone.trim(),
      message: message.trim(),
      status: 'new',
    });

    return NextResponse.json({
      success: true,
      data: {
        id: contact._id.toString(),
        name: contact.name,
        phone: contact.phone,
      },
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { success: false, error: 'Too many submissions. Please try again later.' },
        { status: 429 },
      );
    }

    const msg =
      error instanceof Error ? error.message : 'Failed to submit contact';
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}

/**
 * GET /api/contacts  (admin – list all contacts)
 */
export async function GET() {
  try {
    await requireAdmin();
    await connectDB();

    const docs = await Contact.find({})
      .sort({ createdAt: -1 })
      .lean();

    const data = docs.map((doc) => ({
      id: doc._id.toString(),
      name: doc.name,
      email: doc.email || '',
      phone: doc.phone || '',
      subject: doc.subject || '',
      message: doc.message,
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
      error instanceof Error ? error.message : 'Failed to fetch contacts';
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
