/**
 * Wrapping Paper category seed.
 *
 * Wrapping paper is an ordinary catalogue product — a category plus products.
 * This script only creates the category (idempotently); add the individual
 * papers through the admin panel so their images and prices are yours.
 *
 * Usage: npx tsx scripts/seed-wrapping-paper.ts
 */

import mongoose from 'mongoose';
import { Category } from '../lib/db/models/category.model';

const SLUG = 'wrapping-paper';

async function seed() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    console.error('❌ MONGODB_URI is required');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);

  const existing = await Category.findOne({ slug: SLUG });
  if (existing) {
    console.log(`✓ Category "${existing.name}" already exists (${existing.slug}) — nothing to do.`);
    await mongoose.disconnect();
    return;
  }

  const category = await Category.create({
    name: 'Wrapping Paper',
    slug: SLUG,
    description: 'Papers, silks and ribbons to finish your bouquet.',
    status: 'active',
    sortOrder: 10,
  });

  console.log(`✅ Created category "${category.name}" (${category.slug})`);
  console.log('   Next: Admin → Products → New Product, and assign it to this category.');

  await mongoose.disconnect();
}

seed().catch((error) => {
  console.error('❌ Seed failed', error);
  process.exit(1);
});
