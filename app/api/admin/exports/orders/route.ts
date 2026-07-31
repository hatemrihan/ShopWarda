import { NextResponse } from 'next/server';
import { guardAdmin } from '@/lib/auth/api-guard';

export async function GET() {
  const denied = await guardAdmin();
  if (denied) return denied;

  return NextResponse.json({ message: 'Orders export' });
}
