import { AdminShell } from '@/components/admin/admin-shell';
import { categoryService } from '@/features/catalog/server/category.service';
import { CategoryForm } from '@/components/admin/category-form';

export default async function AdminCategoryNewPage() {
  const parentOptions = await categoryService.getForSelect();

  return (
    <AdminShell title="New Category" description="Create a new category">
      <CategoryForm parentOptions={parentOptions} />
    </AdminShell>
  );
}
