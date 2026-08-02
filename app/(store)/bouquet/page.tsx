import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getActiveCatalog } from '@/features/bouquet/server/bouquet.service';
import { BouquetBuilder } from './bouquet-builder';
import { EmptyState } from '@/components/shared/empty-state';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Build Your Own Bouquet | Warda',
  description:
    'Compose your own bouquet — choose your flowers stem by stem, pick a wrapping, and add a handwritten card.',
};

export default async function BouquetPage() {
  const catalog = await getActiveCatalog().catch((error) => {
    console.error('[bouquet] catalogue unavailable', error);
    return null;
  });

  // If the builder is disabled entirely, 404
  if (!catalog || !catalog.settings.enabled) {
    notFound();
  }

  // If enabled but no flowers/wraps yet, show a friendly empty state
  if (catalog.flowers.length === 0 && catalog.wraps.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6">
        <EmptyState
          title="Bouquet builder is coming soon"
          description="We're preparing our flower and wrap selection. Check back shortly!"
          action={
            <Link
              href="/shop"
              className="inline-flex items-center justify-center rounded-md bg-[#1a1a1a] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#1a1a1a]/90 transition-colors"
            >
              Browse Shop
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <BouquetBuilder
      flowers={catalog.flowers}
      wraps={catalog.wraps}
      settings={catalog.settings}
    />
  );
}
