/**
 * Admin seed script.
 * Creates the initial owner admin from ADMIN_EMAILS environment variable.
 *
 * Usage: npx tsx scripts/seed-admin.ts
 */

import mongoose from 'mongoose';
import { Admin } from '../lib/db/models/admin.model';

async function seed() {
  const mongoUri = process.env.MONGODB_URI;
  const adminEmails = process.env.ADMIN_EMAILS;

  if (!mongoUri) {
    console.error('❌ MONGODB_URI is required');
    process.exit(1);
  }

  if (!adminEmails) {
    console.error('❌ ADMIN_EMAILS is required');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('📦 Connected to MongoDB');

  const emails = adminEmails.split(',').map((e) => e.trim().toLowerCase());

  for (const email of emails) {
    const existing = await Admin.findOne({ emailNormalized: email });

    if (existing) {
      console.log(`⏭️  Admin already exists: ${email}`);
      continue;
    }

    await Admin.create({
      emailNormalized: email,
      displayName: email.split('@')[0],
      role: 'owner',
      isActive: true,
    });

    console.log(`✅ Created admin: ${email}`);
  }

  await mongoose.disconnect();
  console.log('🏁 Seed complete');
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
