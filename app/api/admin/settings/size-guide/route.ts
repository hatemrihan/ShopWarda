import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decode } from 'next-auth/jwt';
import connectDB from '@/lib/db/mongoose';
import { getSettings } from '@/lib/db/models/store-settings.model';

async function requireAdmin() {
  const cookieStore = await cookies();
  const sessionToken =
    cookieStore.get('next-auth.session-token')?.value ||
    cookieStore.get('__Secure-next-auth.session-token')?.value;

  if (!sessionToken) return null;

  try {
    const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || '';
    const token = await decode({ token: sessionToken, secret });
    return (token?.adminId as string) || null;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    await connectDB();
    const settings = await getSettings();
    return NextResponse.json({ sizeGuide: settings.sizeGuide });
  } catch (error) {
    console.error('[SIZE-GUIDE] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch size guide' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const adminId = await requireAdmin();
  if (!adminId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();
    const body = await request.json();
    const settings = await getSettings();

    settings.sizeGuide = {
      enabled: body.enabled ?? true,
      title: body.title ?? 'Arrangement Size Guide',
      description: body.description ?? '',
      columns: body.columns ?? [],
      rows: body.rows ?? [],
      notes: body.notes ?? '',
    };

    await settings.save();
    return NextResponse.json({ sizeGuide: settings.sizeGuide });
  } catch (error) {
    console.error('[SIZE-GUIDE] PUT error:', error);
    return NextResponse.json({ error: 'Failed to update size guide' }, { status: 500 });
  }
}
