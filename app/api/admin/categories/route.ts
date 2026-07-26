import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import { categoryService } from '@/features/catalog/server/category.service';
import { Category } from '@/lib/db/models/category.model';
import connectDB from '@/lib/db/mongoose';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getS3Client, getPublicBucket, getCdnUrl } from '@/lib/storage/aws';
import { nanoid } from 'nanoid';

async function uploadCategoryFile(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const ext = file.name.split('.').pop() || 'jpg';
  const assetKey = `categories/${new Date().toISOString().slice(0, 10)}/${nanoid(12)}.${ext}`;

  try {
    const bucket = getPublicBucket();
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: assetKey,
      ContentType: file.type,
      Body: buffer,
    });
    await getS3Client().send(command);
    const cdnUrl = getCdnUrl();
    return cdnUrl ? `${cdnUrl}/${assetKey}` : `https://${bucket}.s3.amazonaws.com/${assetKey}`;
  } catch {
    return `data:${file.type};base64,${buffer.toString('base64')}`;
  }
}

/**
 * GET /api/admin/categories
 * Returns all categories formatted for the admin categories page
 */
export async function GET() {
  try {
    await requireAdmin();
    await connectDB();
    const docs = await Category.find({})
      .sort({ createdAt: -1 })
      .lean();

    const categories = docs.map((doc) => ({
      id: doc._id.toString(),
      name: doc.name,
      image_url: doc.image?.publicUrl || null,
      created_at: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
      updated_at: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
    }));

    return NextResponse.json({ success: true, categories });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch categories';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
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
    const name = formData.get('name') as string;
    const imageFile = formData.get('image') as File | null;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Category name is required' }, { status: 400 });
    }

    let imageUrl: string | undefined;
    if (imageFile && imageFile.size > 0) {
      imageUrl = await uploadCategoryFile(imageFile);
    }

    const created = await categoryService.create({
      name: name.trim(),
      imageUrl,
      status: 'active',
      displayOrder: 0,
    });

    await connectDB();
    const freshDoc = await Category.findById(created.id).lean();

    return NextResponse.json({
      success: true,
      category: {
        id: created.id,
        name: created.name,
        image_url: created.imageUrl || null,
        created_at: freshDoc?.createdAt ? new Date(freshDoc.createdAt).toISOString() : new Date().toISOString(),
        updated_at: freshDoc?.updatedAt ? new Date(freshDoc.updatedAt).toISOString() : new Date().toISOString(),
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to create category';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
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
    const id = formData.get('id') as string;
    const name = formData.get('name') as string;
    const imageFile = formData.get('image') as File | null;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Category ID is required' }, { status: 400 });
    }

    let imageUrl: string | undefined;
    if (imageFile && imageFile.size > 0) {
      imageUrl = await uploadCategoryFile(imageFile);
    }

    const updated = await categoryService.update({
      id,
      name: name?.trim(),
      imageUrl,
    });

    await connectDB();
    const freshDoc = await Category.findById(updated.id).lean();

    return NextResponse.json({
      success: true,
      category: {
        id: updated.id,
        name: updated.name,
        image_url: updated.imageUrl || null,
        created_at: freshDoc?.createdAt ? new Date(freshDoc.createdAt).toISOString() : new Date().toISOString(),
        updated_at: freshDoc?.updatedAt ? new Date(freshDoc.updatedAt).toISOString() : new Date().toISOString(),
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to update category';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}

/**
 * DELETE /api/admin/categories?id=...
 * Archive or delete category
 */
export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Category ID is required' }, { status: 400 });
    }

    await categoryService.archive(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to delete category';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
