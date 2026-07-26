import { notFound } from 'next/navigation';
import { categoryService } from '@/features/catalog/server/category.service';
import { CategoryForm } from '@/components/admin/category-form';

interface Props {
  params: Promise<{ categoryId: string }>;
}

export default async function AdminCategoryEditPage({ params }: Props) {
  const { categoryId } = await params;

  let category;
  let parentOptions;

  try {
    [category, parentOptions] = await Promise.all([
      categoryService.getById(categoryId),
      categoryService.getForSelect(),
    ]);
  } catch {
    notFound();
  }

  if (!category) {
    notFound();
  }

  return <CategoryForm category={category} parentOptions={parentOptions} />;
}
