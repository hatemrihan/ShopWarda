import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import { generatePresignedUploadUrl, type UploadPurpose } from '@/lib/storage/provider';
import { handleError, errorToResponse } from '@/lib/errors';

/**
 * POST /api/media/sign
 * Generate presigned S3 upload URL.
 * Body: { filename, mime, size, purpose }
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { mime, size, purpose = 'product-media' } = body as {
      mime: string;
      size: number;
      purpose?: UploadPurpose;
    };

    if (!mime || !size) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'mime and size are required' } },
        { status: 400 }
      );
    }

    const result = await generatePresignedUploadUrl(purpose, mime, size);

    return NextResponse.json(result);
  } catch (error) {
    const appError = handleError(error);
    return NextResponse.json(errorToResponse(appError), {
      status: appError.statusCode,
    });
  }
}
