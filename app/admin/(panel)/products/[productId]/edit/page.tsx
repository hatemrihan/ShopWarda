import { notFound } from 'next/navigation';
import { ProductForm } from '@/components/admin/product-form';
import { productService } from '@/features/catalog/server/product.service';
import { categoryService } from '@/features/catalog/server/category.service';

interface Props {
  params: Promise<{ productId: string }>;
}

async function fetchProductData(productId: string) {
  try {
    const [product, categories] = await Promise.all([
      productService.getById(productId),
      categoryService.getForSelect(),
    ]);
    return { product, categories };
  } catch {
    notFound();
  }
}

export default async function AdminProductEditPage({ params }: Props) {
  const { productId } = await params;
  const { product, categories } = await fetchProductData(productId);

  return <ProductForm product={product} categories={categories} />;
}
