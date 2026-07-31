/**
 * Next.js instrumentation — runs once on server startup.
 */

export async function register() {
  // ── Error reporting ───────────────────────────────────────────
  // Initialised first so failures in the warm-up below are captured.
  // No DSN configured means Sentry stays inert; nothing else changes.
  const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (dsn) {
    try {
      const Sentry = await import('@sentry/nextjs');
      Sentry.init({
        dsn,
        environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
        tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
      });
    } catch (error) {
      console.error('[instrumentation] Sentry init failed', error);
    }
  }

  // Warm up MongoDB connection on startup.
  // A failed warm-up must never throw: an error escaping `register()` poisons
  // every route in the lambda, not just the ones that touch the database.
  //
  // The NEXT_RUNTIME guard is load-bearing, not defensive: instrumentation
  // runs in the Edge runtime too (proxy.ts), and an unguarded mongoose import
  // makes Turbopack trace it into the Edge bundle, where Node built-ins like
  // async_hooks and dns do not resolve and the build fails.
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.MONGODB_URI) {
    try {
      const { default: connectDB } = await import('@/lib/db/mongoose');
      await connectDB();

      // Sync schema-declared indexes (unique orderNumber / idempotencyKeyHash /
      // SKU) now that we have a connection. Fire-and-forget: index builds must
      // never block or fail startup.
      const { ensureAllIndexes } = await import('@/lib/db/indexes');
      ensureAllIndexes().catch((error) => {
        console.error('[instrumentation] index sync failed', error);
      });
    } catch (error) {
      console.error(
        '[instrumentation] MongoDB warm-up failed — continuing without a pooled connection.',
        error,
      );
      const { captureException } = await import('@/lib/observability');
      captureException(error, { scope: 'instrumentation.mongodb-warmup' });
    }
  }
}

/**
 * Called by Next.js for uncaught server errors (nested React Server Components
 * included), which `captureException` in a catch block cannot see.
 */
export async function onRequestError(
  ...args: Parameters<
    NonNullable<Awaited<typeof import('@sentry/nextjs')>['captureRequestError']>
  >
) {
  const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  try {
    const Sentry = await import('@sentry/nextjs');
    Sentry.captureRequestError(...args);
  } catch {
    /* reporting must never break the request */
  }
}
