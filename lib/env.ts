import { z } from 'zod';

/**
 * Environment variable validation.
 * Fails fast at startup if required vars are missing.
 *
 * For optional/external services (Sentry, GA, Turnstile, Upstash),
 * vars are optional so the app can run in dev without all services configured.
 */

const envSchema = z.object({
  // ─── MongoDB ─────────────────────────────────
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),

  // ─── Auth.js (Google) ────────────────────────
  AUTH_SECRET: z.string().min(1).optional(),
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),
  ADMIN_EMAILS: z.string().optional(), // comma-separated

  // ─── AWS S3 ──────────────────────────────────
  AWS_REGION: z.string().default('eu-south-1'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  S3_BUCKET_PUBLIC: z.string().default('shopwarda-media'),
  S3_BUCKET_PRIVATE: z.string().default('shopwarda-proofs'),
  CLOUDFRONT_URL: z.string().optional(),

  // ─── Resend ──────────────────────────────────
  RESEND_API_KEY: z.string().optional(),
  RESEND_WEBHOOK_SECRET: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().default('ShopWarda <orders@shopwarda.com>'),
  ADMIN_NOTIFICATION_EMAIL: z.string().optional(),

  // ─── Sentry ──────────────────────────────────
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),

  // ─── Google Analytics ────────────────────────
  NEXT_PUBLIC_GA_MEASUREMENT_ID: z.string().optional(),
  GOOGLE_ANALYTICS_PROPERTY_ID: z.string().optional(),
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().optional(),
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: z.string().optional(),

  // ─── Cloudflare Turnstile ────────────────────
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),
  TURNSTILE_SECRET_KEY: z.string().optional(),

  // ─── Upstash Redis ───────────────────────────
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // ─── App ─────────────────────────────────────
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_VERCEL_URL: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('❌ Invalid environment variables:');
    for (const issue of parsed.error.issues) {
      console.error(`  ${issue.path.join('.')}: ${issue.message}`);
    }
    throw new Error('Missing or invalid environment variables');
  }

  return parsed.data;
}

export const env = validateEnv();

/**
 * Get the base URL for the application.
 */
export function getBaseUrl(): string {
  if (env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${env.NEXT_PUBLIC_VERCEL_URL}`;
  }
  return 'http://localhost:3000';
}

/**
 * Get admin emails as an array.
 */
export function getAdminEmails(): string[] {
  if (!env.ADMIN_EMAILS) return [];
  return env.ADMIN_EMAILS.split(',').map((e) => e.trim().toLowerCase());
}
