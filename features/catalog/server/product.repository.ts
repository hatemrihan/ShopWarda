/**
 * Product Repository — data access layer.
 * Pure database operations, no business logic.
 */

import connectDB from '@/lib/db/mongoose';
import { Product, type IProduct } from '@/lib/db/models/product.model';
import { Category } from '@/lib/db/models/category.model';
import { isValidObjectId, type Types } from 'mongoose';
import type {
  ProductFilter,
  PaginationParams,
  PaginatedResult,
  ProductListItem,
  ProductDTO,
} from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MongoFilter = Record<string, any>;

// ─── Mappers ────────────────────────────────────────────────────

function toProductDTO(doc: IProduct, categoryNames: string[] = []): ProductDTO {
  return {
    id: doc._id.toString(),
    name: doc.name,
    slug: doc.slug,
    description: doc.description,
    shortDescription: doc.shortDescription,
    type: doc.type,
    categoryIds: (doc.categoryIds ?? []).map((c) => c.toString()),
    categoryNames,
    // Emit keys alongside labels. `variants[].optionValues` are keys, so a
    // label-only shape here could never be matched against them.
    options: doc.options?.map((o) => ({
      key: o.key,
      label: o.label,
      values: o.values.map((v) => ({
        key: v.key,
        label: v.label,
        swatchHex: v.swatchHex,
      })),
    })),
    variants: (doc.variants ?? []).map((v, index) => ({
      id: (v as { _id?: { toString(): string } })._id?.toString() ?? '',
      sku: v.sku,
      optionValues: (v.optionValues ?? []).map((ov) => ({
        name: ov.optionKey,
        value: ov.valueKey,
      })),
      pricePiasters: v.priceMinor,
      compareAtPricePiasters: v.compareAtPriceMinor,
      stock: v.stock,
      lowStockThreshold: v.lowStockThreshold ?? 5,
      trackInventory: v.trackInventory ?? true,
      weight: v.weightGrams,
      isDefault: doc.defaultVariantId
        ? doc.defaultVariantId.toString() === (v as { _id?: { toString(): string } })._id?.toString()
        : index === 0,
      isActive: v.status === 'active',
    })),
    media: doc.media?.map((m) => ({
      assetKey: m.assetKey,
      url: m.publicUrl,
      alt: m.alt,
      type: m.type ?? 'image',
      isPrimary: m.sortOrder === 0,
      sortOrder: m.sortOrder ?? 0,
      width: m.width,
      height: m.height,
    })) ?? [],
    seo: doc.seo ? {
      title: doc.seo.title,
      description: doc.seo.description,
    } : undefined,
    pricePiasters: doc.priceRange?.minMinor ?? 0,
    maxPricePiasters: doc.priceRange?.maxMinor !== doc.priceRange?.minMinor
      ? doc.priceRange?.maxMinor
      : undefined,
    status: doc.status,
    bundleItems: doc.bundleItems?.map((b) => ({
      productId: b.productId.toString(),
      variantId: b.variantId?.toString(),
      quantity: b.quantity,
    })),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function toListItem(doc: IProduct, categoryNames: string[] = []): ProductListItem {
  const primaryMedia = doc.media?.find((m) => m.sortOrder === 0) ?? doc.media?.[0];
  return {
    id: doc._id.toString(),
    name: doc.name,
    slug: doc.slug,
    primaryImageUrl: primaryMedia?.publicUrl,
    categoryNames,
    pricePiasters: doc.priceRange?.minMinor ?? 0,
    maxPricePiasters: doc.priceRange?.maxMinor !== doc.priceRange?.minMinor
      ? doc.priceRange?.maxMinor
      : undefined,
    totalStock: (doc.variants ?? [])
      .filter((v) => v.status === 'active')
      .reduce((sum, v) => sum + v.stock, 0),
    status: doc.status,
    type: doc.type,
  };
}

// ─── Helpers ────────────────────────────────────────────────────

/** Fields `toListItem` reads. Keep the two in step. */
const LIST_PROJECTION =
  'name slug status type categoryIds priceRange createdAt ' +
  'media.publicUrl media.sortOrder variants.status variants.stock';

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function resolveCategoryNames(categoryIds: Array<string | Types.ObjectId>): Promise<string[]> {
  if (!categoryIds?.length) return [];
  const cats = await Category.find(
    { _id: { $in: categoryIds } },
    { name: 1 }
  ).lean();
  return cats.map((c) => c.name);
}

// ─── Repository ─────────────────────────────────────────────────

export const productRepository = {
  async findAll(
    filter: ProductFilter = {},
    pagination: PaginationParams = { page: 1, pageSize: 12 }
  ): Promise<PaginatedResult<ProductListItem>> {
    await connectDB();

    const query: MongoFilter = {};
    if (filter.status) query.status = filter.status;

    // Several categories are one `$in` query. The shop page used to run a
    // separate query per selected category and merge the results by hand,
    // which also made it impossible to paginate or sort them correctly.
    const categoryIds = [
      ...(filter.categoryIds ?? []),
      ...(filter.categoryId ? [filter.categoryId] : []),
    ].filter((id) => isValidObjectId(id));
    if (filter.categoryId || filter.categoryIds?.length) {
      // An id that is not an ObjectId can match nothing — and would otherwise
      // throw a CastError (a 500) straight from a URL parameter.
      if (categoryIds.length === 0) {
        return { items: [], total: 0, page: pagination.page, pageSize: pagination.pageSize, totalPages: 0 };
      }
      query.categoryIds = categoryIds.length === 1 ? categoryIds[0] : { $in: categoryIds };
    }

    if (filter.search) {
      // Escaped: the raw text used to be handed to MongoDB as a regular
      // expression, so a "(" in the search box was a server error.
      const pattern = escapeRegex(filter.search.trim().slice(0, 100));
      query.$or = [
        { name: { $regex: pattern, $options: 'i' } },
        { 'variants.sku': { $regex: pattern, $options: 'i' } },
      ];
    }

    const sortField = filter.sortBy ?? 'createdAt';
    const sortDir = filter.sortOrder === 'asc' ? 1 : -1;
    // `_id` breaks ties so pages never repeat or skip a product.
    const sortQuery: Record<string, 1 | -1> = {
      [sortField === 'price' ? 'priceRange.minMinor' : sortField]: sortDir,
      _id: sortDir,
    };

    const page = Math.max(1, Math.floor(pagination.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Math.floor(pagination.pageSize) || 12));

    const [docs, total] = await Promise.all([
      Product.find(query)
        // Only what a card needs — descriptions, SEO, options and the full
        // media gallery of every product were being loaded for each grid.
        .select(LIST_PROJECTION)
        .sort(sortQuery)
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean<IProduct[]>(),
      Product.countDocuments(query),
    ]);

    // Batch resolve category names
    const allCatIds = [...new Set(docs.flatMap((d) => (d.categoryIds ?? []).map((c) => c.toString())))];
    const catMap = new Map<string, string>();
    if (allCatIds.length > 0) {
      const cats = await Category.find({ _id: { $in: allCatIds } }, { name: 1 }).lean();
      cats.forEach((c) => catMap.set(c._id.toString(), c.name));
    }

    const items = docs.map((doc) => {
      const names = (doc.categoryIds ?? []).map((c) => catMap.get(c.toString()) ?? '').filter(Boolean);
      return toListItem(doc as IProduct, names);
    });

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  },

  /** Resolve a product id to its current slug (for links that only know the id). */
  async findSlugById(id: string): Promise<string | null> {
    if (!isValidObjectId(id)) return null;
    await connectDB();
    const doc = await Product.findOne({ _id: id, status: 'active' }, { slug: 1 }).lean();
    return doc?.slug ?? null;
  },

  async findById(id: string): Promise<ProductDTO | null> {
    if (!isValidObjectId(id)) return null; // a malformed id is "not found", not a 500
    await connectDB();
    const doc = await Product.findById(id).lean<IProduct>();
    if (!doc) return null;
    const names = await resolveCategoryNames(doc.categoryIds);
    return toProductDTO(doc as IProduct, names);
  },

  async findBySlug(slug: string): Promise<ProductDTO | null> {
    await connectDB();
    const doc = await Product.findOne({ slug, status: { $ne: 'archived' } }).lean<IProduct>();
    if (!doc) return null;
    const names = await resolveCategoryNames(doc.categoryIds);
    return toProductDTO(doc as IProduct, names);
  },

  async findByPreviousSlug(slug: string): Promise<string | null> {
    await connectDB();
    const doc = await Product.findOne(
      { previousSlugs: slug, status: 'active' },
      { slug: 1 }
    ).lean();
    return doc?.slug ?? null;
  },

  async findByCategory(
    categoryId: string,
    pagination: PaginationParams = { page: 1, pageSize: 12 }
  ): Promise<PaginatedResult<ProductListItem>> {
    return this.findAll({ categoryId, status: 'active' }, pagination);
  },

  async isSlugTaken(slug: string, excludeId?: string): Promise<boolean> {
    await connectDB();
    const query: MongoFilter = { slug };
    if (excludeId) query._id = { $ne: excludeId };
    const count = await Product.countDocuments(query);
    return count > 0;
  },

  async create(data: Partial<IProduct>): Promise<ProductDTO> {
    await connectDB();
    const doc = await Product.create(data);
    const names = await resolveCategoryNames(doc.categoryIds);
    return toProductDTO(doc, names);
  },

  async update(id: string, data: Partial<IProduct>): Promise<ProductDTO | null> {
    await connectDB();
    if (!isValidObjectId(id)) return null;
    const doc = await Product.findById(id);
    if (!doc) return null;

    // The service describes a slug change as `$push: { previousSlugs }`.
    // Object.assign copied that onto the document as a stray `$push` property
    // and it was never applied, so the redirect from a product's old URL to
    // its new one never worked. Apply it to the array explicitly.
    const { $push, ...fields } = data as Partial<IProduct> & {
      $push?: { previousSlugs?: string };
    };
    Object.assign(doc, fields);
    if ($push?.previousSlugs && !doc.previousSlugs.includes($push.previousSlugs)) {
      doc.previousSlugs.push($push.previousSlugs);
    }
    // A slug that is live again must stop redirecting elsewhere.
    doc.previousSlugs = doc.previousSlugs.filter((s) => s !== doc.slug);

    await doc.save(); // Triggers pre-save for priceRange derivation

    const names = await resolveCategoryNames(doc.categoryIds);
    return toProductDTO(doc, names);
  },

  async archive(id: string): Promise<boolean> {
    await connectDB();
    const result = await Product.findByIdAndUpdate(id, { status: 'archived' });
    return result !== null;
  },

  async decrementStock(
    productId: string,
    variantId: string,
    quantity: number
  ): Promise<boolean> {
    await connectDB();
    const result = await Product.updateOne(
      {
        _id: productId,
        'variants._id': variantId,
        'variants.stock': { $gte: quantity },
      },
      { $inc: { 'variants.$.stock': -quantity } }
    );
    return result.modifiedCount > 0;
  },

  /** Dashboard stats */
  async getCounts(): Promise<{ total: number; active: number; draft: number; lowStock: number }> {
    await connectDB();
    const [total, active, draft] = await Promise.all([
      Product.countDocuments(),
      Product.countDocuments({ status: 'active' }),
      Product.countDocuments({ status: 'draft' }),
    ]);

    // Low stock: active products with active variants at or below threshold
    const lowStockRes = await Product.aggregate([
      { $match: { status: 'active' } },
      { $unwind: '$variants' },
      {
        $match: {
          'variants.status': 'active',
          $expr: { $lte: ['$variants.stock', '$variants.lowStockThreshold'] },
        },
      },
      { $group: { _id: '$_id' } },
      { $count: 'count' },
    ]);
    const lowStock = lowStockRes[0]?.count ?? 0;

    return { total, active, draft, lowStock };
  },
};
