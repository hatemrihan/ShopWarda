import connectDB from '@/lib/db/mongoose';
import { Admin } from '@/lib/db/models/admin.model';

/**
 * Helper to get configured admin email addresses.
 * Queries active admins from MongoDB + merges process.env.ADMIN_EMAILS.
 */
export async function getAdminEmails(): Promise<string[]> {
  const envEmails = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  let dbEmails: string[] = [];
  try {
    await connectDB();
    const dbAdmins = await Admin.find({ isActive: true }).select('emailNormalized').lean();
    dbEmails = dbAdmins.map((a) => a.emailNormalized.toLowerCase());
  } catch (err) {
    console.error('Failed to fetch admin emails from DB:', err);
  }

  const defaultAdmins = ['hatemsurf@gmail.com', 'hatemrihan100@gmail.com'];
  const allEmails = Array.from(new Set([...envEmails, ...dbEmails, ...defaultAdmins])).filter(Boolean);
  return allEmails;
}
