'use client';

import { useRef, useCallback } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { useMediaUpload } from '@/hooks/use-media-upload';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
  value?: string; // current publicUrl
  assetKey?: string;
  onChange: (url: string | undefined, assetKey: string | undefined) => void;
  purpose?: 'product-media' | 'category-image';
  className?: string;
  label?: string;
}

export function ImageUpload({
  value,
  onChange,
  purpose = 'category-image',
  className,
  label = 'Upload Image',
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { upload, isUploading, progress } = useMediaUpload({ purpose });

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const result = await upload(file);
      if (result) {
        onChange(result.publicUrl, result.assetKey);
      }

      // Reset input
      if (inputRef.current) inputRef.current.value = '';
    },
    [upload, onChange]
  );

  const handleRemove = useCallback(() => {
    onChange(undefined, undefined);
  }, [onChange]);

  return (
    <div className={cn('space-y-2', className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      {value ? (
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Uploaded"
            className="h-32 w-32 rounded-lg border border-white/[0.08] object-cover"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -right-2 -top-2 rounded-full bg-red-500/80 p-1 text-white shadow-lg hover:bg-red-500 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
          className="h-32 w-32 rounded-lg border-2 border-dashed border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15] hover:bg-white/[0.04] transition-colors flex flex-col items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin text-white/40" />
              <span className="text-[11px] text-white/30">{progress}%</span>
            </>
          ) : (
            <>
              <Upload className="h-5 w-5 text-white/25" />
              <span className="text-[11px] text-white/30">{label}</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
