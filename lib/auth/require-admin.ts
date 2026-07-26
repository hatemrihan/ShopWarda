/**
 * Admin session guard.
 * Must be called in EVERY admin Server Action and route handler.
 */

import { auth } from '@/auth';
import { UnauthorizedError } from '@/lib/errors';

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
  const session = await auth();

  if (!session?.user?.adminId) {
    throw new UnauthorizedError('Admin authentication required');
  }

  return {
    adminId: session.user.adminId,
    email: session.user.email,
    role: session.user.role,
  };
}
