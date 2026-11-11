/**
 * Category Repository — data access layer.
 * Pure database operations, no business logic.
 */

import connectDB from '@/lib/db/mongoose';
import { Category, type ICategory } from '@/lib/db/models/category.model';
import type { CategoryFilter, CategoryListItem, CategoryDTO } from '../types';
import { isValidObjectId, type Types } from 'mongoose';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MongoFilter = Record<string, any>;

// ─── Mappers ────────────────────────────────────────────────────

function toCategoryDTO(doc: ICategory): CategoryDTO {
  return {
    id: doc._id.toString(),
    name: doc.name,
    slug: doc.slug,
    description: doc.description,
    parentId: doc.parentId?.toString(),
    imageUrl: doc.image?.publicUrl,
    imageAssetKey: doc.image?.assetKey,
    displayOrder: doc.sortOrder,
    seo: doc.seo ? {
      title: doc.seo.title,
      description: doc.seo.description,
    } : undefined,
    status: doc.status,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function toListItem(doc: ICategory, productCount = 0): CategoryListItem {
  return {
    id: doc._id.toString(),
    name: doc.name,
    slug: doc.slug,
    imageUrl: doc.image?.publicUrl,
    status: doc.status,
    displayOrder: doc.sortOrder,
    productCount,
  };
}

// ─── Repository ─────────────────────────────────────────────────

export const categoryRepository = {
  async findAll(filter: CategoryFilter = {}): Promise<CategoryListItem[]> {
    await connectDB();
    const query: MongoFilter = {};
    if (filter.status) query.status = filter.status;
    if (filter.parentId !== undefined) {
      query.parentId = filter.parentId === null ? null : filter.parentId;
    }

    const docs = await Category.find(query)
      .sort({ sortOrder: 1, name: 1 })
      .lean<ICategory[]>();

    // Get product counts per category
    const { Product } = await import('@/lib/db/models/product.model');
    const counts = await Product.aggregate([
      { $match: { status: 'active' } },
      { $unwind: '$categoryIds' },
      { $group: { _id: '$categoryIds', count: { $sum: 1 } } },
    ]);

    const countMap = new Map(counts.filter((c) => c._id != null).map((c) => [c._id.toString(), c.count as number]));

    return docs.map((doc) => toListItem(doc as ICategory, countMap.get(doc._id.toString()) ?? 0));
  },

  async findById(id: string): Promise<CategoryDTO | null> {
    if (!isValidObjectId(id)) return null; // malformed id → not found, not a 500
    await connectDB();
    const doc = await Category.findById(id).lean<ICategory>();
    if (!doc) return null;

    // Resolve parent name
    if (doc.parentId) {
      const parent = await Category.findById(doc.parentId).select('name').lean();
      const dto = toCategoryDTO(doc as ICategory);
      dto.parentName = parent?.name;
      return dto;
    }

    return toCategoryDTO(doc as ICategory);
  },

  async findBySlug(slug: string): Promise<CategoryDTO | null> {
    await connectDB();
    const doc = await Category.findOne({ slug, status: 'active' }).lean<ICategory>();
    if (!doc) return null;
    return toCategoryDTO(doc as ICategory);
  },

  async findByPreviousSlug(slug: string): Promise<string | null> {
    await connectDB();
    const doc = await Category.findOne(
      { previousSlugs: slug, status: 'active' },
      { slug: 1 }
    ).lean();
    return doc?.slug ?? null;
  },

  async isSlugTaken(slug: string, excludeId?: string): Promise<boolean> {
    await connectDB();
    const query: MongoFilter = { slug };
    if (excludeId) query._id = { $ne: excludeId };
    const count = await Category.countDocuments(query);
    return count > 0;
  },

  async create(data: Partial<ICategory>): Promise<CategoryDTO> {
    await connectDB();
    const doc = await Category.create(data);
    return toCategoryDTO(doc);
  },

  async update(id: string, data: Partial<ICategory>): Promise<CategoryDTO | null> {
    await connectDB();
    const doc = await Category.findByIdAndUpdate(id, data, { new: true });
    if (!doc) return null;
    return toCategoryDTO(doc);
  },

  async archive(id: string): Promise<boolean> {
    await connectDB();
    const result = await Category.findByIdAndUpdate(id, { status: 'archived' });
    return result !== null;
  },

  async checkCyclicParent(id: string, parentId: string): Promise<boolean> {
    await connectDB();
    let currentId: string | undefined = parentId;
    const visited = new Set<string>();

    while (currentId) {
      if (currentId === id) return true; // Cycle detected
      if (visited.has(currentId)) return true; // Loop in existing data
      visited.add(currentId);

      const parent: { parentId?: Types.ObjectId } | null = await Category.findById(currentId, { parentId: 1 }).lean();
      currentId = parent?.parentId?.toString();
    }

    return false;
  },

  /** How many of these ids are real, non-archived categories. */
  async countUsable(ids: string[]): Promise<number> {
    const valid = [...new Set(ids)].filter((id) => isValidObjectId(id));
    if (valid.length === 0) return 0;
    await connectDB();
    return Category.countDocuments({ _id: { $in: valid }, status: { $ne: 'archived' } });
  },

  async findAllActive(): Promise<CategoryListItem[]> {
    return this.findAll({ status: 'active' });
  },

  /** For select dropdowns in admin forms */
  async findForSelect(): Promise<{ id: string; name: string; parentId?: string }[]> {
    await connectDB();
    const docs = await Category.find({ status: 'active' })
      .select('name parentId')
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    return docs.map((d) => ({
      id: d._id.toString(),
      name: d.name,
      parentId: d.parentId?.toString(),
    }));
  },
};
