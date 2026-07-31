/**
 * Admin guard for API route handlers.
 *
 * `requireAdmin()` throws, which suits Server Actions. Route handlers need a
 * response instead, so this wraps it and converts a denial into a 401.
 *
 * Usage:
 *   const denied = await guardAdmin();
 *   if (denied) return denied;
 */

import { NextResponse } from 'next/server';
import { requireAdmin } from './require-admin';

export async function guardAdmin(): Promise<NextResponse | null> {
  try {
    await requireAdmin();
    return null;
  } catch {
    // Deliberately opaque: never reveal whether the session was missing,
    // expired, or belongs to a deactivated admin.
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 },
    );
  }
}

/**
 * Best-effort client IP for rate-limit bucketing.
 * Vercel sets x-forwarded-for; the first entry is the originating client.
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip')?.trim() || 'unknown';
}
