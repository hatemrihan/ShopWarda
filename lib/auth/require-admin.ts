/**
 * Admin session guard.
 * Must be called in EVERY admin Server Action and route handler.
 */

import { cache } from 'react';
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
 * Confirms the admin behind a session still exists and is active.
 * Cached per request: a page whose layout, loader and actions all guard
 * themselves costs one lookup, not one per guard.
 */
const loadActiveAdmin = cache(async (adminId: string) => {
  await connectDB();
  return Admin.findById(adminId).select('isActive role').lean();
});

/**
 * Verify the current request has a valid admin session.
 * Throws UnauthorizedError if not authenticated or missing admin metadata.
 */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await auth();

  if (!session?.user?.adminId) {
    throw new UnauthorizedError('Admin authentication required');
  }

  // A valid cookie is not enough — the admin may have been deactivated since
  // it was issued.
  const admin = await loadActiveAdmin(session.user.adminId);
  if (!admin || !admin.isActive) {
    throw new UnauthorizedError('Admin account is inactive or disabled');
  }

  return {
    adminId: session.user.adminId,
    email: session.user.email,
    role: admin.role || session.user.role,
  };
}
