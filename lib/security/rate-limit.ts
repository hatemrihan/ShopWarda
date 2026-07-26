/**
 * Rate limiting using Upstash Redis.
 * Falls back to a no-op in development if Upstash is not configured.
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

function createRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

const redis = createRedis();

function createLimiter(
  prefix: string,
  requests: number,
  window: `${number} ${'s' | 'm' | 'h' | 'd'}`
): Ratelimit | null {
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window),
    prefix: `rl:${prefix}`,
    analytics: true,
  });
}

// ─── Limiter Instances ──────────────────────────────────────────

/** Admin login: 5 attempts per minute */
export const loginLimiter = createLimiter('login', 5, '1 m');

/** Checkout: 3 per minute per IP */
export const checkoutLimiter = createLimiter('checkout', 3, '1 m');

/** Contact form: 3 per hour */
export const contactLimiter = createLimiter('contact', 3, '1 h');

/** Subscription: 3 per hour */
export const subscriptionLimiter = createLimiter('subscribe', 3, '1 h');

/** Media upload: 20 per minute */
export const uploadLimiter = createLimiter('upload', 20, '1 m');

/** Cart operations: 30 per minute */
export const cartLimiter = createLimiter('cart', 30, '1 m');

// ─── Helper ─────────────────────────────────────────────────────

import { RateLimitError } from '@/lib/errors';

export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<void> {
  if (!limiter) return; // No-op in dev without Upstash
  const result = await limiter.limit(identifier);
  if (!result.success) {
    throw new RateLimitError();
  }
}
