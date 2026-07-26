'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AlertTriangle, ArrowLeft, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { archiveProductAction } from '@/features/catalog/server/catalog.actions';
import { formatEGP } from '@/lib/money/egp';

interface Props {
  product: {
    id: string;
    name: string;
    slug: string;
    primaryImageUrl?: string;
    pricePiasters: number;
    totalStock: number;
    status: string;
  };
}

export function ProductDeleteClient({ product }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmInput, setConfirmInput] = useState('');
  const isConfirmed = confirmInput === product.name;

  function handleDelete() {
    startTransition(async () => {
      const result = await archiveProductAction(product.id);
      if (result.success) {
        toast.success('Product archived');
        router.push('/admin/products');
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="max-w-2xl">
      {/* Back */}
      <button onClick={() => router.back()} className="text-white/30 hover:text-white transition-colors text-xs flex items-center gap-1.5 font-medium mb-6">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Products
      </button>

      <h1 className="text-lg font-bold text-white mb-1">Delete Product</h1>
      <span className="text-[10px] font-medium tracking-wider text-white/25 uppercase">Catalog Management</span>

      {/* Warning */}
      <div className="mt-8 p-4 bg-red-400/[0.04] border border-red-400/[0.15] rounded-lg flex gap-3">
        <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
        <div>
          <h2 className="text-[14px] font-semibold text-white mb-1">This action cannot be undone</h2>
          <p className="text-[12px] text-white/40">The product will be archived and hidden from your store.</p>
        </div>
      </div>

      {/* Product preview */}
      <div className="mt-6 p-4 bg-white/[0.03] border border-white/[0.06] rounded-lg">
        <span className="text-[10px] text-white/25 uppercase tracking-wider block mb-4">Product to delete</span>
        <div className="flex gap-4">
          <div className="w-20 h-20 rounded-lg bg-white/[0.02] overflow-hidden relative shrink-0">
            {product.primaryImageUrl ? (
              <Image src={product.primaryImageUrl} alt={product.name} fill className="object-cover" sizes="80px" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/10 text-[10px]">No img</div>
            )}
          </div>
          <div className="space-y-2">
            <h3 className="text-[14px] font-medium text-white">{product.name}</h3>
            <div className="flex gap-4">
              <div>
                <span className="text-[10px] text-white/25 block">Price</span>
                <span className="text-[13px] text-white/70 font-mono">{formatEGP(product.pricePiasters)}</span>
              </div>
              <div>
                <span className="text-[10px] text-white/25 block">Stock</span>
                <span className={`text-[13px] font-mono ${product.totalStock > 0 ? 'text-green-400' : 'text-red-400'}`}>{product.totalStock}</span>
              </div>
              <div>
                <span className="text-[10px] text-white/25 block">Status</span>
                <span className="text-[13px] text-white/40">{product.status}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation */}
      <div className="mt-6 p-4 bg-white/[0.02] border border-white/[0.04] rounded-lg">
        <p className="text-[12px] text-white/40 mb-2">
          Type <strong className="text-white/60 font-mono">{product.name}</strong> to confirm:
        </p>
        <input
          value={confirmInput}
          onChange={(e) => setConfirmInput(e.target.value)}
          placeholder={`Type "${product.name}"`}
          className="w-full p-3 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white text-[13px] focus:border-white/[0.2] focus:outline-none placeholder:text-white/15 transition-colors font-mono"
          onKeyDown={(e) => { if (e.key === 'Enter' && isConfirmed) handleDelete(); }}
        />
      </div>

      {/* Actions */}
      <div className="mt-8 flex gap-3 justify-end">
        <button onClick={() => router.back()} className="px-6 py-2.5 rounded-lg text-[13px] text-white/40 border border-white/[0.06] hover:bg-white/[0.04] transition-colors">
          Cancel
        </button>
        <button
          onClick={handleDelete}
          disabled={isPending || !isConfirmed}
          className="bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 px-8 py-2.5 rounded-lg font-medium text-[13px] transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {isPending ? 'Deleting...' : 'Delete Permanently'}
        </button>
      </div>
    </div>
  );
}
