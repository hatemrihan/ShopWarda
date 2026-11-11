import { NextResponse } from 'next/server';
import { z } from 'zod';
import connectDB from '@/lib/db/mongoose';
import { getSettings } from '@/lib/db/models/store-settings.model';
import { guardAdmin } from '@/lib/auth/api-guard';
import { invalidateSettings } from '@/lib/cache';

const sizeGuideSchema = z.object({
  enabled: z.boolean().default(true),
  title: z.string().trim().max(120).default('Arrangement Size Guide'),
  description: z.string().trim().max(500).default(''),
  columns: z
    .array(z.object({ key: z.string().trim().min(1).max(60), label: z.string().trim().min(1).max(80) }))
    .max(12)
    .default([]),
  rows: z
    .array(
      z.object({
        size: z.string().trim().min(1).max(80),
        values: z.record(z.string(), z.string().max(200)).default({}),
      }),
    )
    .max(50)
    .default([]),
  notes: z.string().trim().max(2000).default(''),
});

export async function GET() {
  // This lives under /api/admin and was the one admin read with no guard.
  const denied = await guardAdmin();
  if (denied) return denied;

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
  const denied = await guardAdmin();
  if (denied) return denied;

  try {
    const parsed = sizeGuideSchema.safeParse(await request.json());
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return NextResponse.json(
        { error: issue ? `${issue.path.join('.')}: ${issue.message}` : 'Invalid size guide' },
        { status: 400 },
      );
    }

    await connectDB();
    const settings = await getSettings();
    settings.sizeGuide = parsed.data;
    await settings.save();

    invalidateSettings();

    return NextResponse.json({ sizeGuide: settings.sizeGuide });
  } catch (error) {
    console.error('[SIZE-GUIDE] PUT error:', error);
    return NextResponse.json({ error: 'Failed to update size guide' }, { status: 500 });
  }
}
