/**
 * Next.js instrumentation — runs once on server startup.
 */

export async function register() {
  // Warm up MongoDB connection on startup
  if (process.env.MONGODB_URI) {
    const { default: connectDB } = await import('@/lib/db/mongoose');
    await connectDB();
  }
}
