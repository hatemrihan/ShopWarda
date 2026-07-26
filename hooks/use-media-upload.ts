'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface UploadResult {
  assetKey: string;
  publicUrl: string;
}

interface UseMediaUploadOptions {
  purpose?: 'product-media' | 'category-image' | 'instapay-proof';
  onUploadComplete?: (result: UploadResult) => void;
}

/**
 * Hook for presigned S3 uploads.
 * 1. POST /api/media/sign → { uploadUrl, assetKey, publicUrl }
 * 2. PUT file to uploadUrl
 * 3. Return assetKey + publicUrl
 */
export function useMediaUpload(options: UseMediaUploadOptions = {}) {
  const { purpose = 'product-media', onUploadComplete } = options;
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const upload = useCallback(
    async (file: File): Promise<UploadResult | null> => {
      setIsUploading(true);
      setProgress(0);

      try {
        // Step 1: Get presigned URL
        const signRes = await fetch('/api/media/sign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mime: file.type,
            size: file.size,
            purpose,
          }),
        });

        if (!signRes.ok) {
          const err = await signRes.json();
          throw new Error(err.error?.message ?? 'Failed to get upload URL');
        }

        const { uploadUrl, assetKey, publicUrl } = await signRes.json();
        setProgress(30);

        // Step 2: Upload directly to S3
        const uploadRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        });

        if (!uploadRes.ok) {
          throw new Error('Upload to storage failed');
        }

        setProgress(100);

        const result = { assetKey, publicUrl };
        onUploadComplete?.(result);
        return result;
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Upload failed';
        toast.error(msg);
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [purpose, onUploadComplete]
  );

  const uploadMultiple = useCallback(
    async (files: File[]): Promise<UploadResult[]> => {
      const results: UploadResult[] = [];
      for (let i = 0; i < files.length; i++) {
        setProgress(Math.round((i / files.length) * 100));
        const result = await upload(files[i]);
        if (result) results.push(result);
      }
      setProgress(100);
      return results;
    },
    [upload]
  );

  return { upload, uploadMultiple, isUploading, progress };
}
