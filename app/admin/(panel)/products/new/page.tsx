import { AdminShell } from '@/components/admin/admin-shell';
import { ProductForm } from '@/components/admin/product-form';
import { categoryService } from '@/features/catalog/server/category.service';

export default async function AdminProductNewPage() {
  const categories = await categoryService.getForSelect();

  return (
    <AdminShell title="New Product" description="Create a new product">
      <ProductForm categories={categories} />
    </AdminShell>
  );
}
