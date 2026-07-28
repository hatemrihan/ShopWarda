/**
 * Admin session guard.
 * Must be called in EVERY admin Server Action and route handler.
 */

import { auth } from '@/auth';
import { UnauthorizedError } from '@/lib/errors';
import connectDB from '@/lib/db/mongoose';
import { Admin } from '@/lib/db/models/admin.model';

export interface AdminSession {
  adminId: string;
  email: string;
  role: string;
}

/**
 * Verify the current request has a valid admin session.
 * Throws UnauthorizedError if not authenticated or missing admin metadata.
 */
export async function requireAdmin(): Promise<AdminSession> {
  let session = await auth();

  if (!session?.user?.adminId) {
    await new Promise((r) => setTimeout(r, 300));
    session = await auth();
  }

  if (!session?.user?.adminId) {
    throw new UnauthorizedError('Admin authentication required');
  }

  // Verify admin is still active in DB
  await connectDB();
  const admin = await Admin.findById(session.user.adminId).select('isActive role').lean();
  if (!admin || !admin.isActive) {
    throw new UnauthorizedError('Admin account is inactive or disabled');
  }

  return {
    adminId: session.user.adminId,
    email: session.user.email,
    role: admin.role || session.user.role,
  };
}
