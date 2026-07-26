import { notFound } from 'next/navigation';
import { categoryService } from '@/features/catalog/server/category.service';
import { CategoryDeleteClient } from './category-delete-client';

interface Props {
  params: Promise<{ categoryId: string }>;
}

export default async function AdminCategoryDeletePage({ params }: Props) {
  const { categoryId } = await params;

  let category;
  try {
    category = await categoryService.getById(categoryId);
  } catch {
    notFound();
  }

  if (!category) {
    notFound();
  }

  return (
    <CategoryDeleteClient
      category={{
        id: category.id,
        name: category.name,
        slug: category.slug,
        status: category.status,
        productCount: category.productCount ?? 0,
      }}
    />
  );
}
