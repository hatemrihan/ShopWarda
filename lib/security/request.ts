/**
 * Request metadata helpers for logging and rate limiting.
 */

import { headers } from 'next/headers';
import { nanoid } from 'nanoid';

/**
 * Extract or generate a unique request ID.
 * Checks common headers (Vercel, Cloudflare, custom) before falling back to nanoid.
 */
export async function getRequestId(): Promise<string> {
  const h = await headers();
  return (
    h.get('x-request-id') ??
    h.get('x-vercel-id') ??
    h.get('cf-ray') ??
    nanoid(16)
  );
}

/**
 * Extract client IP from request headers.
 * Priority: Cloudflare > Vercel > X-Forwarded-For > fallback.
 */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get('cf-connecting-ip') ??
    h.get('x-real-ip') ??
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  );
}

/**
 * Extract user agent for audit logging.
 */
export async function getUserAgent(): Promise<string> {
  const h = await headers();
  return h.get('user-agent') ?? 'unknown';
}
