import { notFound } from 'next/navigation';
import { productService } from '@/features/catalog/server/product.service';
import { ProductDeleteClient } from './product-delete-client';

interface Props {
  params: Promise<{ productId: string }>;
}

export default async function AdminProductDeletePage({ params }: Props) {
  const { productId } = await params;

  let product;
  try {
    product = await productService.getById(productId);
  } catch {
    notFound();
  }

  if (!product) {
    notFound();
  }

  const defaultVariant = product.variants.find((v) => v.isDefault) ?? product.variants[0];

  return (
    <ProductDeleteClient
      product={{
        id: product.id,
        name: product.name,
        slug: product.slug,
        primaryImageUrl: product.media.find((m) => m.isPrimary)?.url ?? product.media[0]?.url,
        pricePiasters: defaultVariant?.pricePiasters ?? 0,
        totalStock: product.variants.reduce((sum, v) => sum + v.stock, 0),
        status: product.status,
      }}
    />
  );
}
