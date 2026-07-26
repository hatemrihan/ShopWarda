/**
 * AWS S3 client initialization.
 */

import { S3Client } from '@aws-sdk/client-s3';

let s3Client: S3Client | null = null;

export function getS3Client(): S3Client {
  if (s3Client) return s3Client;

  const region = process.env.ALKADY_AWS_REGION || process.env.AWS_REGION || 'eu-south-1';
  const accessKeyId = process.env.ALKADY_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.ALKADY_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      'AWS credentials not configured. Set ALKADY_AWS_ACCESS_KEY_ID and ALKADY_AWS_SECRET_ACCESS_KEY'
    );
  }

  s3Client = new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });

  return s3Client;
}

/** Public product media bucket name. */
export function getPublicBucket(): string {
  return process.env.ALKADY_AWS_S3_BUCKET_NAME || process.env.S3_BUCKET_PUBLIC || 'shopwarda-media';
}

/** Private InstaPay proof bucket name (falls back to public media bucket if unconfigured). */
export function getPrivateBucket(): string {
  return process.env.S3_BUCKET_PRIVATE || getPublicBucket();
}

/** CloudFront CDN URL for public media. */
export function getCdnUrl(): string {
  return process.env.CLOUDFRONT_URL || '';
}
