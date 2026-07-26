import { productService } from '@/features/catalog/server/product.service';
import { ProductsClient } from './products-client';

export default async function AdminProductsPage() {
  const result = await productService.list({}, { page: 1, pageSize: 100 });

  return <ProductsClient initialProducts={result.items} />;
}
