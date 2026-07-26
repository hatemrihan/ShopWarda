import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import { categoryService } from '@/features/catalog/server/category.service';
import { handleError, errorToResponse } from '@/lib/errors';

/**
 * GET /api/admin/categories/[id]
 * Fetch a single category for editing.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const category = await categoryService.getById(id);
    return NextResponse.json(category);
  } catch (error) {
    const appError = handleError(error);
    return NextResponse.json(errorToResponse(appError), {
      status: appError.statusCode,
    });
  }
}
