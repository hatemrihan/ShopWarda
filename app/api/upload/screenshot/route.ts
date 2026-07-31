import { NextRequest, NextResponse } from 'next/server';
import { generatePresignedUploadUrl, uploadDirectToS3 } from '@/lib/storage/provider';
import { checkRateLimit, uploadLimiter } from '@/lib/security/rate-limit';
import { getClientIp } from '@/lib/auth/api-guard';
import { RateLimitError } from '@/lib/errors';

/**
 * Pre-read guard. `validateUpload()` in the storage provider remains the source
 * of truth for what is accepted, but it only runs once the whole file has been
 * buffered into memory — so an oversized upload is absorbed before it is
 * rejected. These mirror the proof limits to reject early.
 */
const ALLOWED_PROOF_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_PROOF_SIZE = 10 * 1024 * 1024; // 10MB — keep in sync with lib/storage/provider.ts

/**
 * POST /api/upload/screenshot
 * Handles InstaPay proof screenshot uploads to AWS S3.
 * Supports both direct FormData file upload and JSON presigned URL generation.
 */
export async function POST(req: NextRequest) {
  try {
    // Public route (guest checkout uploads a payment proof) — rate limit per IP.
    await checkRateLimit(uploadLimiter, `screenshot:${getClientIp(req)}`);

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

      // Reject before buffering the file into memory.
      if (!ALLOWED_PROOF_MIMES.includes(file.type)) {
        return NextResponse.json(
          { success: false, error: `Unsupported file type: ${file.type || 'unknown'}` },
          { status: 400 },
        );
      }

      if (file.size > MAX_PROOF_SIZE) {
        return NextResponse.json(
          { success: false, error: `File too large (max ${MAX_PROOF_SIZE / 1024 / 1024}MB)` },
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
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { success: false, error: 'Too many uploads. Please wait a moment.' },
        { status: 429 },
      );
    }

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
