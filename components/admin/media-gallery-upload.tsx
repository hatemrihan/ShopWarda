'use client';

import { useRef, useCallback } from 'react';
import { Upload, X, Loader2, GripVertical } from 'lucide-react';
import { useMediaUpload } from '@/hooks/use-media-upload';
import { cn } from '@/lib/utils';

export interface MediaFile {
  assetKey: string;
  url: string;
  alt: string;
  type: 'image' | 'video';
  width?: number;
  height?: number;
}

interface MediaGalleryUploadProps {
  value: MediaFile[];
  onChange: (files: MediaFile[]) => void;
  maxFiles?: number;
  className?: string;
}

export function MediaGalleryUpload({
  value,
  onChange,
  maxFiles = 20,
  className,
}: MediaGalleryUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { uploadMultiple, isUploading, progress } = useMediaUpload({
    purpose: 'product-media',
  });

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (!files.length) return;

      const remaining = maxFiles - value.length;
      const toUpload = files.slice(0, remaining);

      const results = await uploadMultiple(toUpload);
      const newMedia: MediaFile[] = results.map((r, i) => ({
        assetKey: r.assetKey,
        url: r.publicUrl,
        alt: '',
        type: toUpload[i].type.startsWith('video') ? 'video' as const : 'image' as const,
      }));

      onChange([...value, ...newMedia]);
      if (inputRef.current) inputRef.current.value = '';
    },
    [value, onChange, maxFiles, uploadMultiple]
  );

  const handleRemove = useCallback(
    (index: number) => {
      onChange(value.filter((_, i) => i !== index));
    },
    [value, onChange]
  );

  const handleAltChange = useCallback(
    (index: number, alt: string) => {
      const updated = [...value];
      updated[index] = { ...updated[index], alt };
      onChange(updated);
    },
    [value, onChange]
  );

  const handleMoveUp = useCallback(
    (index: number) => {
      if (index === 0) return;
      const updated = [...value];
      [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
      onChange(updated);
    },
    [value, onChange]
  );

  return (
    <div className={cn('space-y-3', className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Gallery grid */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {value.map((media, index) => (
          <div key={media.assetKey} className="group relative">
            <div className="aspect-square overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.02]">
              {media.type === 'video' ? (
                <div className="flex h-full items-center justify-center text-xs text-white/30">
                  🎬 Video
                </div>
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={media.url}
                  alt={media.alt}
                  className="h-full w-full object-cover"
                />
              )}
            </div>


            {/* Badge: first = primary */}
            {index === 0 && (
              <span className="absolute left-1 top-1 rounded bg-white/[0.15] backdrop-blur-sm px-1.5 py-0.5 text-[10px] font-medium text-white">
                Primary
              </span>
            )}

            {/* Actions overlay */}
            <div className="absolute right-1 top-1 flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
              {index > 0 && (
                <button
                  type="button"
                  onClick={() => handleMoveUp(index)}
                  className="rounded bg-white/[0.1] backdrop-blur-sm p-1 shadow text-white/60 hover:text-white transition-colors"
                >
                  <GripVertical className="h-3 w-3" />
                </button>
              )}
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="rounded bg-red-500/60 backdrop-blur-sm p-1 text-white shadow hover:bg-red-500/80 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>

            {/* Alt text input */}
            <input
              type="text"
              value={media.alt}
              onChange={(e) => handleAltChange(index, e.target.value)}
              placeholder="Alt text"
              className="mt-1 w-full rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-1 text-[11px] text-white placeholder:text-white/20 focus:outline-none focus:border-white/[0.15]"
            />
          </div>
        ))}

        {/* Upload button */}
        {value.length < maxFiles && (
          <button
            type="button"
            disabled={isUploading}
            onClick={() => inputRef.current?.click()}
            className="aspect-square rounded-lg border-2 border-dashed border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15] hover:bg-white/[0.04] transition-colors flex flex-col items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin text-white/40" />
                <span className="text-[11px] text-white/30">{progress}%</span>
              </>
            ) : (
              <>
                <Upload className="h-5 w-5 text-white/25" />
                <span className="text-[11px] text-white/30">Add Media</span>
              </>
            )}
          </button>
        )}
      </div>

      <p className="text-[11px] text-white/25">
        {value.length}/{maxFiles} files. First image is primary. Drag to reorder.
      </p>
    </div>
  );
}
