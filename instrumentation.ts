/**
 * Next.js instrumentation — runs once on server startup.
 */

export async function register() {
  // Warm up MongoDB connection on startup.
  // A failed warm-up must never throw: an error escaping `register()` poisons
  // every route in the lambda, not just the ones that touch the database.
  if (process.env.MONGODB_URI) {
    try {
      const { default: connectDB } = await import('@/lib/db/mongoose');
      await connectDB();
    } catch (error) {
      console.error(
        '[instrumentation] MongoDB warm-up failed — continuing without a pooled connection.',
        error,
      );
    }
  }
}
