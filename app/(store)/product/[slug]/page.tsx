import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { productService } from '@/features/catalog/server/product.service';
import { ProductView } from '@/components/sections/product-view';
import connectDB from '@/lib/db/mongoose';
import { getSettings } from '@/lib/db/models/store-settings.model';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const product = await productService.getBySlug(slug);
    const primaryImage = product.media.find((m) => m.isPrimary) ?? product.media[0];
    return {
      title: product.seo?.title ?? product.name,
      description: product.seo?.description ?? product.shortDescription ?? product.description?.slice(0, 160),
      openGraph: {
        images: primaryImage ? [{ url: primaryImage.url }] : undefined,
      },
    };
  } catch {
    return { title: 'Product' };
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;

  let product;
  try {
    product = await productService.getBySlug(slug);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'redirectSlug' in error && typeof (error as { redirectSlug?: unknown }).redirectSlug === 'string') {
      redirect(`/product/${(error as { redirectSlug: string }).redirectSlug}`);
    }
    notFound();
  }

  const relatedResult = await productService.list(
    { status: 'active', sortBy: 'createdAt', sortOrder: 'desc' },
    { page: 1, pageSize: 8 }
  );
  const relatedProducts = relatedResult.items.filter((item) => item.id !== product.id).slice(0, 4);

  // Fetch size guide from store settings
  await connectDB();
  const settings = await getSettings();
  const sizeGuide = settings.sizeGuide ? JSON.parse(JSON.stringify(settings.sizeGuide)) : null;

  return <ProductView product={product} relatedProducts={relatedProducts} sizeGuide={sizeGuide} />;
}

