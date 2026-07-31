'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Plus, Pencil, Trash2, Loader2, Tag, ImageIcon, X } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// ── Types ─────────────────────────────────────────────────────────────────────

type Category = {
    id: string;
    name: string;
    image_url?: string | null;
    created_at: string;
    updated_at: string;
};

// ── Main Component ────────────────────────────────────────────────────────────

export default function CategoriesPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(false);

    // Dialog state
    const [showAdd, setShowAdd] = useState(false);
    const [editCat, setEditCat] = useState<Category | null>(null);
    const [deleteCat, setDeleteCat] = useState<Category | null>(null);

    // Form state
    const [formName, setFormName] = useState('');
    const [formImage, setFormImage] = useState<File | null>(null);
    const [formImagePreview, setFormImagePreview] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    // ── Fetch categories ──────────────────────────────────────────────────────

    const loadCategoriesData = useCallback(async (): Promise<Category[]> => {
        const res = await fetch('/api/admin/categories');
        const data = await res.json();
        if (data.success && data.categories) {
            return data.categories;
        }
        throw new Error(data.error || 'Failed to fetch categories');
    }, []);

    const fetchCategories = useCallback(async () => {
        setFetchError(false);
        try {
            const data = await loadCategoriesData();
            setCategories(data);
        } catch {
            setFetchError(true);
            toast.error('Failed to load categories');
        } finally {
            setLoading(false);
        }
    }, [loadCategoriesData]);

    useEffect(() => {
        let ignore = false;

        loadCategoriesData()
            .then((data) => {
                if (!ignore) {
                    setCategories(data);
                    setFetchError(false);
                }
            })
            .catch(() => {
                if (!ignore) {
                    setFetchError(true);
                    toast.error('Failed to load categories');
                }
            })
            .finally(() => {
                if (!ignore) setLoading(false);
            });

        return () => {
            ignore = true;
        };
    }, [loadCategoriesData]);

    // ── Handle image selection ────────────────────────────────────────────────

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image must be under 5MB');
            return;
        }

        if (formImagePreview?.startsWith('blob:')) {
            URL.revokeObjectURL(formImagePreview);
        }

        setFormImage(file);
        setFormImagePreview(URL.createObjectURL(file));
    };

    const clearImage = () => {
        if (formImagePreview?.startsWith('blob:')) {
            URL.revokeObjectURL(formImagePreview);
        }
        setFormImage(null);
        setFormImagePreview(null);
        if (fileRef.current) fileRef.current.value = '';
    };

    // ── Open Add dialog ───────────────────────────────────────────────────────

    const openAdd = () => {
        setFormName('');
        clearImage();
        setShowAdd(true);
    };

    // ── Open Edit dialog ──────────────────────────────────────────────────────

    const openEdit = (cat: Category) => {
        setFormName(cat.name);
        setFormImage(null);
        setFormImagePreview(cat.image_url || null);
        setEditCat(cat);
    };

    // ── Submit (Add / Edit) ───────────────────────────────────────────────────

    const handleSubmit = async () => {
        const trimmed = formName.trim();
        if (!trimmed) {
            toast.error('Category name is required');
            return;
        }

        setSubmitting(true);
        const toastId = toast.loading(editCat ? 'Updating…' : 'Creating…');

        try {
            const isEditing = !!editCat;
            const method = isEditing ? 'PATCH' : 'POST';

            const formData = new FormData();
            formData.append('name', trimmed);
            if (isEditing) formData.append('id', editCat!.id);
            if (formImage) formData.append('image', formImage);

            const res = await fetch('/api/admin/categories', {
                method,
                body: formData,
            });

            const data = await res.json();
            if (!data.success) throw new Error(data.error);

            toast.success(isEditing ? 'Category updated' : 'Category created', { id: toastId, duration: 2000 });

            if (isEditing) {
                setCategories(prev => prev.map(c => c.id === data.category.id ? data.category : c));
                setEditCat(null);
            } else {
                setCategories(prev => [...prev, data.category]);
                setShowAdd(false);
                setFormName('');
                clearImage();
            }
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Something went wrong', { id: toastId });
        } finally {
            setSubmitting(false);
        }
    };

    // ── Delete ────────────────────────────────────────────────────────────────

    const handleDelete = async () => {
        if (!deleteCat) return;
        setDeleting(true);
        const toastId = toast.loading('Deleting…');

        try {
            const res = await fetch(`/api/admin/categories?id=${deleteCat.id}`, { method: 'DELETE' });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);

            toast.success('Category deleted', { id: toastId, duration: 2000 });
            setCategories(prev => prev.filter(c => c.id !== deleteCat.id));
            setDeleteCat(null);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to delete', { id: toastId });
        } finally {
            setDeleting(false);
        }
    };

    // ── Loading State ─────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-stone-500" />
                    <span className="text-[13px] text-stone-500">Loading categories…</span>
                </div>
            </div>
        );
    }

    if (fetchError) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="flex flex-col items-center gap-4 text-center">
                    <span className="text-[14px] font-medium text-stone-300">Could not load categories.</span>
                    <Button onClick={fetchCategories} variant="outline" className="border-stone-700 bg-stone-800 text-stone-300 hover:bg-stone-700 hover:text-white">
                        Try Again
                    </Button>
                </div>
            </div>
        );
    }

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div dir="ltr" className="text-white max-w-6xl mt-6">
            {/* ── Page Header ──────────────────────────────────────────────── */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <div className="text-[13px] text-stone-500 mb-1">Catalog</div>
                    <h1 className="text-xl font-semibold text-white">Categories</h1>
                </div>
                <Button
                    onClick={openAdd}
                    className="bg-white text-stone-900 hover:bg-stone-200 text-[13px] font-medium h-9 gap-1.5"
                >
                    <Plus className="h-3.5 w-3.5" />
                    Add Category
                </Button>
            </div>

            {/* ── Empty State ──────────────────────────────────────────────── */}
            {categories.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 px-6">
                    <div className="w-16 h-16 rounded-2xl bg-stone-800/60 border border-stone-800/60 flex items-center justify-center mb-5">
                        <Tag className="h-7 w-7 text-stone-600" />
                    </div>
                    <h2 className="text-[15px] font-medium text-stone-300 mb-1.5">No categories yet</h2>
                    <p className="text-[13px] text-stone-500 text-center max-w-sm mb-6">
                        Categories help organize your products. Create your first category to get started.
                    </p>
                    <Button
                        onClick={openAdd}
                        className="bg-white text-stone-900 hover:bg-stone-200 text-[13px] font-medium h-9 gap-1.5"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Create First Category
                    </Button>
                </div>

            ) : (
                /* ── Cards Grid ────────────────────────────────────────────── */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {categories.map((cat) => (
                        <div
                            key={cat.id}
                            className="group bg-stone-800/40 border border-stone-800/60 rounded-xl overflow-hidden hover:border-stone-700/60 transition-all duration-150"
                        >
                            {/* Image */}
                            <div className="relative h-28 w-full p-2 flex items-center justify-center">
                                {cat.image_url ? (
                                    <Image
                                        src={cat.image_url}
                                        alt={cat.name}
                                        fill
                                        sizes="(max-width: 640px) 50vw, 200px"
                                        className="object-contain p-2"
                                    />
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <ImageIcon className="h-8 w-8 text-stone-700" />
                                    </div>
                                )}

                                {/* Hover overlay with actions */}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-150 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => openEdit(cat)}
                                        className="h-8 w-8 rounded-lg bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 hover:text-white"
                                    >
                                        <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => setDeleteCat(cat)}
                                        className="h-8 w-8 rounded-lg bg-red-500/10 backdrop-blur-sm text-red-400 hover:bg-red-500/20 hover:text-red-300"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>

                            {/* Info */}
                            <div className="px-4 py-3.5">
                                <h3 className="text-[14px] font-medium text-stone-200 truncate">
                                    {cat.name}
                                </h3>
                                <p className="text-[11px] text-stone-500 mt-0.5">
                                    Created {new Date(cat.created_at).toLocaleDateString('en-US', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric'
                                    })}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Add / Edit Dialog ────────────────────────────────────────── */}
            <Dialog
                open={showAdd || !!editCat}
                onOpenChange={(open) => {
                    if (!open) {
                        setShowAdd(false);
                        setEditCat(null);
                    }
                }}
            >
                <DialogContent dir="ltr" className="bg-stone-900 border-stone-800 text-white sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-white">
                            {editCat ? 'Edit Category' : 'Add Category'}
                        </DialogTitle>
                        <DialogDescription className="text-stone-400">
                            {editCat
                                ? 'Update the category name and image.'
                                : 'Enter a name and optionally upload an image for this category.'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {/* Name */}
                        <div className="space-y-2">
                            <Label htmlFor="cat-name" className="text-stone-300 text-[13px]">
                                Category Name
                            </Label>
                            <Input
                                id="cat-name"
                                placeholder="e.g. Organic, Beverages, Snacks…"
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                                className="bg-stone-800/60 border-stone-700 text-white placeholder:text-stone-500 focus-visible:ring-stone-600 h-10"
                                maxLength={60}
                                autoFocus
                            />
                        </div>

                        {/* Image Upload */}
                        <div className="space-y-2">
                            <Label className="text-stone-300 text-[13px]">
                                Category Image
                            </Label>
                            {formImagePreview ? (
                                <div className="relative rounded-lg overflow-hidden border border-stone-700 bg-stone-900/50">
                                    <div className="relative h-32 w-full p-2">
                                        <Image
                                            src={formImagePreview}
                                            alt="Preview"
                                            unoptimized
                                            fill
                                            sizes="(max-width: 640px) 100vw, 400px"
                                            className="object-contain"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={clearImage}
                                        className="absolute top-2 right-2 w-7 h-7 rounded-md bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/80 transition-colors cursor-pointer"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => fileRef.current?.click()}
                                    className="w-full aspect-[16/10] rounded-lg border-2 border-dashed border-stone-700 hover:border-stone-600 bg-stone-800/30 flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer"
                                >
                                    <ImageIcon className="h-6 w-6 text-stone-600" />
                                    <span className="text-[12px] text-stone-500">Click to upload image</span>
                                    <span className="text-[10px] text-stone-600">PNG, JPG up to 5MB</span>
                                </button>
                            )}
                            <input
                                ref={fileRef}
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                className="hidden"
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0 !bg-transparent border-t-stone-800">
                        <Button
                            variant="ghost"
                            onClick={() => { setShowAdd(false); setEditCat(null); }}
                            disabled={submitting}
                            className="text-stone-100 hover:text-white hover:bg-stone-800"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={submitting || !formName.trim()}
                            className="bg-white !text-black cursor-pointer font-medium disabled:!opacity-100 disabled:bg-stone-800 disabled:!text-stone-500 hover:bg-stone-200"
                        >
                            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                            {editCat ? 'Update' : 'Create'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Delete Confirmation ──────────────────────────────────────── */}
            <AlertDialog
                open={!!deleteCat}
                onOpenChange={(open) => { if (!open) setDeleteCat(null); }}
            >
                <AlertDialogContent dir="ltr" className="bg-stone-900 border-stone-800">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">Delete Category</AlertDialogTitle>
                        <AlertDialogDescription className="text-stone-400">
                            Are you sure you want to delete <strong className="text-stone-300">{deleteCat?.name}</strong>?
                            This action cannot be undone and may affect products linked to this category.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="!bg-transparent border-t-stone-800">
                        <AlertDialogCancel
                            disabled={deleting}
                            className="bg-transparent text-stone-400 border-stone-700 hover:bg-stone-800 hover:text-white"
                        >
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={deleting}
                            className="bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25"
                        >
                            {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
