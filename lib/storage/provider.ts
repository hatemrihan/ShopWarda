/**
 * Storage provider — presigned URLs for uploads and reads.
 */

import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getS3Client, getPublicBucket, getPrivateBucket, getCdnUrl } from './aws';
import { ValidationError } from '@/lib/errors';
import { nanoid } from 'nanoid';

// ─── MIME validation ────────────────────────────────────────────

const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_VIDEO_MIMES = ['video/mp4', 'video/quicktime'];
const ALLOWED_PROOF_MIMES = [...ALLOWED_IMAGE_MIMES, 'application/pdf'];

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_PROOF_SIZE = 10 * 1024 * 1024; // 10MB

export type UploadPurpose = 'product-media' | 'category-image' | 'instapay-proof';

function validateUpload(mime: string, size: number, purpose: UploadPurpose) {
  let allowedMimes: string[];
  let maxSize: number;

  switch (purpose) {
    case 'product-media':
      allowedMimes = [...ALLOWED_IMAGE_MIMES, ...ALLOWED_VIDEO_MIMES];
      maxSize = ALLOWED_VIDEO_MIMES.includes(mime) ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
      break;
    case 'category-image':
      allowedMimes = ALLOWED_IMAGE_MIMES;
      maxSize = MAX_IMAGE_SIZE;
      break;
    case 'instapay-proof':
      allowedMimes = ALLOWED_PROOF_MIMES;
      maxSize = MAX_PROOF_SIZE;
      break;
  }

  if (!allowedMimes.includes(mime)) {
    throw new ValidationError(`Unsupported file type: ${mime}`, {
      mime: [`Allowed: ${allowedMimes.join(', ')}`],
    });
  }

  if (size > maxSize) {
    const maxMB = Math.round(maxSize / 1024 / 1024);
    throw new ValidationError(`File too large (max ${maxMB}MB)`, {
      size: [`Maximum size: ${maxMB}MB`],
    });
  }
}

// ─── Key generation ─────────────────────────────────────────────

function generateKey(purpose: UploadPurpose, extension: string): string {
  const id = nanoid(12);
  const date = new Date().toISOString().slice(0, 10);

  switch (purpose) {
    case 'product-media':
      return `products/${date}/${id}.${extension}`;
    case 'category-image':
      return `categories/${date}/${id}.${extension}`;
    case 'instapay-proof':
      return `proofs/${date}/${id}.${extension}`;
  }
}

function mimeToExtension(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    'application/pdf': 'pdf',
  };
  return map[mime] || 'bin';
}

// ─── Public API ─────────────────────────────────────────────────

export interface PresignedUpload {
  uploadUrl: string;
  assetKey: string;
  publicUrl: string;
}

/**
 * Generate a presigned PUT URL for direct browser upload.
 */
export async function generatePresignedUploadUrl(
  purpose: UploadPurpose,
  mime: string,
  size: number
): Promise<PresignedUpload> {
  validateUpload(mime, size, purpose);

  const ext = mimeToExtension(mime);
  const assetKey = generateKey(purpose, ext);
  const bucket =
    purpose === 'instapay-proof' ? getPrivateBucket() : getPublicBucket();

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: assetKey,
    ContentType: mime,
    ContentLength: size,
  });

  const uploadUrl = await getSignedUrl(getS3Client(), command, {
    expiresIn: 300, // 5 minutes
  });

  const cdnUrl = getCdnUrl();
  const publicUrl =
    purpose === 'instapay-proof'
      ? '' // No public URL for private proofs
      : cdnUrl
        ? `${cdnUrl}/${assetKey}`
        : uploadUrl.split('?')[0];

  return { uploadUrl, assetKey, publicUrl };
}

/**
 * Upload a file buffer directly to S3 from the server.
 * Avoids browser CORS restrictions on presigned PUT URLs.
 */
export async function uploadDirectToS3(
  purpose: UploadPurpose,
  fileBuffer: Buffer,
  mime: string,
): Promise<{ assetKey: string; publicUrl: string }> {
  validateUpload(mime, fileBuffer.length, purpose);

  const ext = mimeToExtension(mime);
  const assetKey = generateKey(purpose, ext);
  const bucket = purpose === 'instapay-proof' ? getPrivateBucket() : getPublicBucket();

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: assetKey,
    ContentType: mime,
    Body: fileBuffer,
  });

  await getS3Client().send(command);

  const cdnUrl = getCdnUrl();
  const publicUrl =
    purpose === 'instapay-proof'
      ? ''
      : cdnUrl
        ? `${cdnUrl}/${assetKey}`
        : `https://${bucket}.s3.amazonaws.com/${assetKey}`;

  return { assetKey, publicUrl };
}

/**
 * Generate a presigned GET URL for private assets.
 */
export async function generatePresignedReadUrl(
  assetKey: string,
  expiresIn = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: getPrivateBucket(),
    Key: assetKey,
  });

  return getSignedUrl(getS3Client(), command, { expiresIn });
}

/**
 * Delete an object from S3.
 */
export async function deleteObject(
  assetKey: string,
  isPrivate = false
): Promise<void> {
  const bucket = isPrivate ? getPrivateBucket() : getPublicBucket();
  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: assetKey,
  });

  await getS3Client().send(command);
}
