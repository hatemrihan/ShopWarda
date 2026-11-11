import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import { categoryService } from '@/features/catalog/server/category.service';
import { Category } from '@/lib/db/models/category.model';
import connectDB from '@/lib/db/mongoose';
import { uploadDirectToS3 } from '@/lib/storage/provider';
import { AppError, UnauthorizedError, handleError } from '@/lib/errors';

/**
 * Store a category image and return its public URL.
 *
 * Goes through the shared storage provider, which enforces the allowed image
 * types and the 10 MB limit. The previous inline upload accepted any file of
 * any size, took the extension from the client's filename, and — if S3 was
 * unreachable — silently saved the whole image *into the database* as a
 * base64 data URL, where it then rode along in every category query.
 */
async function uploadCategoryFile(file: File): Promise<{ url: string; assetKey: string }> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const { publicUrl, assetKey } = await uploadDirectToS3('category-image', buffer, file.type);
  return { url: publicUrl, assetKey };
}

function serialize(doc: {
  _id: { toString(): string };
  name: string;
  image?: { publicUrl?: string } | null;
  createdAt?: Date;
  updatedAt?: Date;
}) {
  return {
    id: doc._id.toString(),
    name: doc.name,
    image_url: doc.image?.publicUrl || null,
    created_at: (doc.createdAt ?? new Date()).toISOString(),
    updated_at: (doc.updatedAt ?? new Date()).toISOString(),
  };
}

/** Maps a thrown error to the right status (401 / 400 / 404 / 500). */
function errorResponse(error: unknown, fallback: string) {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  const appError = handleError(error);
  if (appError instanceof AppError && appError.isOperational) {
    return NextResponse.json(
      { success: false, error: appError.message },
      { status: appError.statusCode },
    );
  }
  console.error('[api/admin/categories]', error);
  return NextResponse.json({ success: false, error: fallback }, { status: 500 });
}

/**
 * GET /api/admin/categories
 * Categories shown on the admin categories page.
 */
export async function GET() {
  try {
    await requireAdmin();
    await connectDB();

    // Archived ("deleted") categories are left out. They used to be listed
    // alongside live ones, so a deleted category never disappeared from the
    // admin screen after a reload.
    const docs = await Category.find({ status: { $ne: 'archived' } })
      .select('name image.publicUrl createdAt updatedAt')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, categories: docs.map(serialize) });
  } catch (error) {
    return errorResponse(error, 'Failed to fetch categories');
  }
}

/**
 * POST /api/admin/categories
 * Create a new category
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const formData = await request.formData();
    const name = formData.get('name');
    const imageFile = formData.get('image');

    if (typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Category name is required' }, { status: 400 });
    }

    const image =
      imageFile instanceof File && imageFile.size > 0 ? await uploadCategoryFile(imageFile) : undefined;

    const created = await categoryService.create({
      name: name.trim(),
      imageUrl: image?.url,
      imageAssetKey: image?.assetKey,
      status: 'active',
      displayOrder: 0,
    });

    return NextResponse.json({
      success: true,
      category: {
        id: created.id,
        name: created.name,
        image_url: created.imageUrl || null,
        created_at: created.createdAt,
        updated_at: created.updatedAt,
      },
    });
  } catch (error) {
    return errorResponse(error, 'Failed to create category');
  }
}

/**
 * PATCH /api/admin/categories
 * Update category
 */
export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();
    const formData = await request.formData();
    const id = formData.get('id');
    const name = formData.get('name');
    const imageFile = formData.get('image');

    if (typeof id !== 'string' || !id) {
      return NextResponse.json({ success: false, error: 'Category ID is required' }, { status: 400 });
    }

    const image =
      imageFile instanceof File && imageFile.size > 0 ? await uploadCategoryFile(imageFile) : undefined;

    const updated = await categoryService.update({
      id,
      name: typeof name === 'string' && name.trim() ? name.trim() : undefined,
      imageUrl: image?.url,
      imageAssetKey: image?.assetKey,
    });

    return NextResponse.json({
      success: true,
      category: {
        id: updated.id,
        name: updated.name,
        image_url: updated.imageUrl || null,
        created_at: updated.createdAt,
        updated_at: updated.updatedAt,
      },
    });
  } catch (error) {
    return errorResponse(error, 'Failed to update category');
  }
}

/**
 * DELETE /api/admin/categories?id=...
 * Archive category
 */
export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin();
    const id = new URL(request.url).searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Category ID is required' }, { status: 400 });
    }

    await categoryService.archive(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error, 'Failed to delete category');
  }
}
