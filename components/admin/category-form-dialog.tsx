'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ImageUpload } from '@/components/admin/image-upload';
import {
  createCategoryAction,
  updateCategoryAction,
} from '@/features/catalog/server/catalog.actions';
import type { CategoryDTO } from '@/features/catalog/types';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

interface CategoryFormDialogProps {
  category?: CategoryDTO | null;
  parentOptions: { id: string; name: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CategoryFormDialog({
  category,
  parentOptions,
  open,
  onOpenChange,
}: CategoryFormDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEditing = !!category;

  function resetForm() {
    setName('');
    setSlug('');
    setSlugManual(false);
    setDescription('');
    setParentId('');
    setDisplayOrder(0);
    setStatus('active');
    setImageUrl(undefined);
    setImageAssetKey(undefined);
    setSeoTitle('');
    setSeoDescription('');
  }

  // Form state initialized directly from category
  const [name, setName] = useState(category?.name ?? '');
  const [slug, setSlug] = useState(category?.slug ?? '');
  const [slugManual, setSlugManual] = useState(!!category?.slug);
  const [description, setDescription] = useState(category?.description ?? '');
  const [parentId, setParentId] = useState<string>(category?.parentId ?? '');
  const [displayOrder, setDisplayOrder] = useState(category?.displayOrder ?? 0);
  const [status, setStatus] = useState<'active' | 'hidden' | 'archived'>(category?.status ?? 'active');
  const [imageUrl, setImageUrl] = useState<string | undefined>(category?.imageUrl);
  const [imageAssetKey, setImageAssetKey] = useState<string | undefined>(category?.imageAssetKey);
  const [seoTitle, setSeoTitle] = useState(category?.seo?.title ?? '');
  const [seoDescription, setSeoDescription] = useState(category?.seo?.description ?? '');

  // Reset/populate form state when open changes
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      if (category) {
        setName(category.name);
        setSlug(category.slug);
        setSlugManual(true);
        setDescription(category.description ?? '');
        setParentId(category.parentId ?? '');
        setDisplayOrder(category.displayOrder);
        setStatus(category.status);
        setImageUrl(category.imageUrl);
        setImageAssetKey(category.imageAssetKey);
        setSeoTitle(category.seo?.title ?? '');
        setSeoDescription(category.seo?.description ?? '');
      } else {
        setName('');
        setSlug('');
        setSlugManual(false);
        setDescription('');
        setParentId('');
        setDisplayOrder(0);
        setStatus('active');
        setImageUrl(undefined);
        setImageAssetKey(undefined);
        setSeoTitle('');
        setSeoDescription('');
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [open, category]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    startTransition(async () => {
      const input = {
        name,
        slug: slug || undefined,
        description: description || undefined,
        parentId: parentId || undefined,
        imageUrl,
        imageAssetKey,
        displayOrder,
        status,
        seo:
          seoTitle || seoDescription
            ? { title: seoTitle || undefined, description: seoDescription || undefined }
            : undefined,
      };

      const result = isEditing
        ? await updateCategoryAction({ ...input, id: category!.id })
        : await createCategoryAction(input);

      if (result.success) {
        toast.success(isEditing ? 'Category updated' : 'Category created');
        onOpenChange(false);
        resetForm();
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? `Edit: ${category!.name}` : 'New Category'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="cat-name">Name *</Label>
            <Input
              id="cat-name"
              value={name}
              onChange={(e) => {
                const val = e.target.value;
                setName(val);
                if (!slugManual) setSlug(slugify(val));
              }}
              placeholder="e.g. Summer Collection"
              required
            />
          </div>

          {/* Slug */}
          <div className="space-y-2">
            <Label htmlFor="cat-slug">Slug</Label>
            <Input
              id="cat-slug"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugManual(true);
              }}
              placeholder="auto-generated-from-name"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              URL: /categories/{slug || '...'}
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="cat-desc">Description</Label>
            <Textarea
              id="cat-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Optional category description"
            />
          </div>

          {/* Parent */}
          <div className="space-y-2">
            <Label>Parent Category</Label>
            <Select value={parentId} onValueChange={(v) => setParentId(v ?? '')}>
              <SelectTrigger>
                <SelectValue placeholder="None (top-level)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None (top-level)</SelectItem>
                {parentOptions
                  .filter((p) => p.id !== category?.id)
                  .map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Image */}
          <div className="space-y-2">
            <Label>Image</Label>
            <ImageUpload
              value={imageUrl}
              assetKey={imageAssetKey}
              onChange={(url, key) => {
                setImageUrl(url);
                setImageAssetKey(key);
              }}
              purpose="category-image"
            />
          </div>

          {/* Display Order & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cat-order">Display Order</Label>
              <Input
                id="cat-order"
                type="number"
                min={0}
                value={displayOrder}
                onChange={(e) => setDisplayOrder(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as 'active' | 'hidden' | 'archived')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* SEO */}
          <details className="rounded-md border p-3">
            <summary className="cursor-pointer text-sm font-medium">
              SEO Settings
            </summary>
            <div className="mt-3 space-y-3">
              <div className="space-y-1">
                <Label htmlFor="cat-seo-title">SEO Title</Label>
                <Input
                  id="cat-seo-title"
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  maxLength={70}
                  placeholder={name}
                />
                <p className="text-xs text-muted-foreground">
                  {seoTitle.length}/70
                </p>
              </div>
              <div className="space-y-1">
                <Label htmlFor="cat-seo-desc">SEO Description</Label>
                <Textarea
                  id="cat-seo-desc"
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  maxLength={160}
                  rows={2}
                  placeholder={description}
                />
                <p className="text-xs text-muted-foreground">
                  {seoDescription.length}/160
                </p>
              </div>
            </div>
          </details>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !name.trim()}>
              {isPending
                ? 'Saving...'
                : isEditing
                  ? 'Update Category'
                  : 'Create Category'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
