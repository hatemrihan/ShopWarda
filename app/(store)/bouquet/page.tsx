import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getActiveCatalog } from '@/features/bouquet/server/bouquet.service';
import { BouquetBuilder } from './bouquet-builder';

export const metadata: Metadata = {
  title: 'Build Your Own Bouquet | Warda',
  description:
    'Compose your own bouquet — choose your flowers stem by stem, pick a wrapping, and add a handwritten card.',
};

export default async function BouquetPage() {
  // A catalogue read failure must not fail the build or the route: this is an
  // optional, flag-gated page, so an unreachable database means "not here".
  const catalog = await getActiveCatalog().catch((error) => {
    console.error('[bouquet] catalogue unavailable', error);
    return null;
  });

  // The builder ships dark. It also needs something to build with.
  if (
    !catalog ||
    !catalog.settings.enabled ||
    catalog.wraps.length === 0 ||
    catalog.flowers.length === 0
  ) {
    notFound();
  }

  return (
    <BouquetBuilder
      flowers={catalog.flowers}
      wraps={catalog.wraps}
      settings={catalog.settings}
    />
  );
}
