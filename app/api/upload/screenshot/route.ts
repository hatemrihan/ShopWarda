import { NextRequest, NextResponse } from 'next/server';
import { generatePresignedUploadUrl, uploadDirectToS3 } from '@/lib/storage/provider';

/**
 * POST /api/upload/screenshot
 * Handles InstaPay proof screenshot uploads to AWS S3.
 * Supports both direct FormData file upload and JSON presigned URL generation.
 */
export async function POST(req: NextRequest) {
  try {
    const contentTypeHeader = req.headers.get('content-type') || '';

    // Handle Direct Multipart File Upload to AWS S3 (Server-side upload — no CORS issues)
    if (contentTypeHeader.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json(
          { success: false, error: 'No file uploaded' },
          { status: 400 },
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const result = await uploadDirectToS3('instapay-proof', buffer, file.type);

      return NextResponse.json({
        success: true,
        assetKey: result.assetKey,
      });
    }

    // Handle Presigned URL request (JSON body)
    const { contentType, size } = await req.json();

    if (!contentType || !size) {
      return NextResponse.json(
        { success: false, error: 'contentType and size are required' },
        { status: 400 },
      );
    }

    const result = await generatePresignedUploadUrl(
      'instapay-proof',
      contentType,
      size,
    );

    return NextResponse.json({
      success: true,
      uploadUrl: result.uploadUrl,
      assetKey: result.assetKey,
    });
  } catch (error: unknown) {
    console.error('[POST /api/upload/screenshot]', error);

    const err = error as { name?: string; message?: string };
    if (err.name === 'ValidationError') {
      return NextResponse.json(
        { success: false, error: err.message ?? 'Validation error' },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { success: false, error: err.message || 'Failed to upload screenshot' },
      { status: 500 },
    );
  }
}
