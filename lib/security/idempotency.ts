/**
 * Idempotency key utilities.
 * Used to prevent duplicate checkout submissions and other critical operations.
 */

import { nanoid } from 'nanoid';
import { createHash } from 'crypto';

/**
 * Generate a random idempotency key (client-side friendly).
 * Returns a 21-character nanoid string.
 */
export function generateIdempotencyKey(): string {
  return nanoid();
}

/**
 * Hash an idempotency key for safe storage.
 * We never store the raw key — only a SHA-256 hash.
 */
export function hashIdempotencyKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/**
 * Generate a secure random token (e.g., for cart cookies).
 * Returns a 32-byte hex string.
 */
export function generateSecureToken(): string {
  return nanoid(32);
}

/**
 * Hash a token for storage (e.g., cart tokenHash).
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
