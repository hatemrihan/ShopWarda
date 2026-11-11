import type { Metadata } from 'next';
import { cache } from 'react';
import { notFound, redirect } from 'next/navigation';
import { productService } from '@/features/catalog/server/product.service';
import { ProductView } from '@/components/sections/product-view';
import { getStorefrontSettings } from '@/features/settings/server/settings.service';
import type { ProductDTO } from '@/features/catalog/types';

interface Props {
  params: Promise<{ slug: string }>;
}

type Lookup =
  | { kind: 'found'; product: ProductDTO }
  | { kind: 'moved'; slug: string }
  | { kind: 'missing' };

/**
 * One lookup per request, shared by generateMetadata and the page — each used
 * to resolve the product (and, for an unknown slug, run the redirect query)
 * separately.
 */
const lookupProduct = cache(async (slug: string): Promise<Lookup> => {
  try {
    return { kind: 'found', product: await productService.getBySlug(slug) };
  } catch (error: unknown) {
    const redirectSlug = (error as { redirectSlug?: unknown } | null)?.redirectSlug;
    if (typeof redirectSlug === 'string') return { kind: 'moved', slug: redirectSlug };
    return { kind: 'missing' };
  }
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const result = await lookupProduct(slug);
  if (result.kind !== 'found') return { title: 'Product' };

  const { product } = result;
  const primaryImage =
    product.media.find((m) => m.isPrimary && m.type !== 'video') ??
    product.media.find((m) => m.type !== 'video');
  const description =
    product.seo?.description ?? product.shortDescription ?? product.description?.slice(0, 160);

  return {
    title: product.seo?.title ?? product.name,
    description,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      title: product.seo?.title ?? product.name,
      description,
      images: primaryImage ? [{ url: primaryImage.url }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const result = await lookupProduct(slug);

  if (result.kind === 'moved') redirect(`/product/${result.slug}`);
  if (result.kind === 'missing') notFound();

  const { product } = result;

  // Both cached. These were an uncached product query and an uncached
  // settings read on every single product view.
  const [relatedProducts, settings] = await Promise.all([
    productService.listRelatedCached(product.id, product.categoryIds),
    getStorefrontSettings(),
  ]);

  return (
    <ProductView
      product={product}
      relatedProducts={relatedProducts}
      sizeGuide={settings.sizeGuide}
    />
  );
}
