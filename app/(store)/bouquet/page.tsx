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
  const catalog = await getActiveCatalog();

  // The builder ships dark. It also needs something to build with.
  if (!catalog.settings.enabled || catalog.wraps.length === 0 || catalog.flowers.length === 0) {
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
