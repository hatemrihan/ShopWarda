/**
 * Error reporting facade.
 *
 * Wraps Sentry so call sites don't care whether it is configured. Without a
 * DSN this logs and returns — no throwing, no import cost at request time
 * beyond a dynamic import that resolves to a no-op.
 */

import logger from '@/lib/logger';

function isEnabled(): boolean {
  return Boolean(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN);
}

/**
 * Report an error. Fire-and-forget: reporting must never fail the operation
 * that produced the error.
 */
export function captureException(
  error: unknown,
  context: Record<string, unknown> = {},
): void {
  logger.error('captured exception', {
    ...context,
    error: error instanceof Error ? error.message : String(error),
  });

  if (!isEnabled()) return;

  import('@sentry/nextjs')
    .then((Sentry) => {
      Sentry.captureException(error, { extra: context });
    })
    .catch(() => {
      /* reporting is best effort */
    });
}
