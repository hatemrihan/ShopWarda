'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { AlertTriangle, ArrowLeft, Loader2, Percent, DollarSign } from 'lucide-react';

interface PromoData {
  id: string;
  code: string;
  name: string;
  type: 'percentage' | 'fixed_amount';
  value: number;
  usageCount: number;
  usageLimit: number | null;
  status: string;
  validUntil: string;
}

export default function DeletePromoCodePage() {
  const router = useRouter();
  const params = useParams();
  const promoId = params.promoId as string;

  const [promo, setPromo] = useState<PromoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/admin/promo/${promoId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); return; }
        setPromo(data);
      })
      .catch(() => setError('Failed to load promo code'))
      .finally(() => setLoading(false));
  }, [promoId]);

  async function handleDelete() {
    if (!promo || confirmInput !== promo.code) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/promo/${promoId}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/admin/promo-codes');
        router.refresh();
      } else {
        setError('Failed to delete promo code');
      }
    } catch {
      setError('Error deleting promo code');
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-6 w-6 animate-spin text-white/20" />
      </div>
    );
  }

  if (error && !promo) {
    return (
      <div className="max-w-2xl">
        <button onClick={() => router.back()} className="text-white/30 hover:text-white transition-colors text-xs flex items-center gap-1.5 font-medium mb-6">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
        <div className="p-8 bg-white/[0.03] border border-white/[0.06] rounded-lg text-center">
          <p className="text-[13px] text-white/40">Promo code not found</p>
        </div>
      </div>
    );
  }

  if (!promo) return null;
  const isConfirmed = confirmInput === promo.code;

  return (
    <div className="max-w-2xl">
      <button onClick={() => router.back()} className="text-white/30 hover:text-white transition-colors text-xs flex items-center gap-1.5 font-medium mb-6">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Promo Codes
      </button>

      <h1 className="text-lg font-bold text-white mb-1">Delete Promo Code</h1>
      <span className="text-[10px] font-medium tracking-wider text-white/25 uppercase">Marketing</span>

      {/* Warning */}
      <div className="mt-8 p-4 bg-red-400/[0.04] border border-red-400/[0.15] rounded-lg flex gap-3">
        <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
        <div>
          <h2 className="text-[14px] font-semibold text-white mb-1">This action cannot be undone</h2>
          <p className="text-[12px] text-white/40">The promo code will be permanently deleted.</p>
        </div>
      </div>

      {/* Promo preview */}
      <div className="mt-6 p-4 bg-white/[0.03] border border-white/[0.06] rounded-lg">
        <span className="text-[10px] text-white/25 uppercase tracking-wider block mb-4">Promo code to delete</span>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-10 h-10 rounded-lg bg-white/[0.04] flex items-center justify-center">
            {promo.type === 'percentage' ? <Percent className="h-5 w-5 text-green-400" /> : <DollarSign className="h-5 w-5 text-blue-400" />}
          </div>
          <div>
            <span className="font-mono text-[16px] font-bold text-white tracking-wider block">{promo.code}</span>
            <span className="text-[12px] text-white/30">{promo.name}</span>
          </div>
        </div>
        <div className="flex gap-6">
          <div>
            <span className="text-[10px] text-white/25 block">Discount</span>
            <span className="text-[13px] text-white/70 font-mono">
              {promo.type === 'percentage' ? `${promo.value}%` : `${(promo.value / 100).toFixed(0)} EGP`}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-white/25 block">Used</span>
            <span className="text-[13px] text-white/70 font-mono">{promo.usageCount}/{promo.usageLimit ?? '∞'}</span>
          </div>
          <div>
            <span className="text-[10px] text-white/25 block">Status</span>
            <span className="text-[13px] text-white/40">{promo.status}</span>
          </div>
          <div>
            <span className="text-[10px] text-white/25 block">Expires</span>
            <span className="text-[13px] text-white/40">{new Date(promo.validUntil).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Confirmation */}
      <div className="mt-6 p-4 bg-white/[0.02] border border-white/[0.04] rounded-lg">
        <p className="text-[12px] text-white/40 mb-2">
          Type <strong className="text-white/60 font-mono">{promo.code}</strong> to confirm:
        </p>
        <input
          value={confirmInput}
          onChange={(e) => setConfirmInput(e.target.value.toUpperCase())}
          placeholder={`Type "${promo.code}"`}
          className="w-full p-3 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white text-[13px] focus:border-white/[0.2] focus:outline-none placeholder:text-white/15 transition-colors font-mono"
          onKeyDown={(e) => { if (e.key === 'Enter' && isConfirmed) handleDelete(); }}
        />
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-400/[0.04] border border-red-400/[0.15] rounded-lg">
          <p className="text-red-400 text-[12px] text-center">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="mt-8 flex gap-3 justify-end">
        <button onClick={() => router.back()} className="px-6 py-2.5 rounded-lg text-[13px] text-white/40 border border-white/[0.06] hover:bg-white/[0.04] transition-colors">Cancel</button>
        <button onClick={handleDelete} disabled={deleting || !isConfirmed}
          className="bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 px-8 py-2.5 rounded-lg font-medium text-[13px] transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {deleting ? 'Deleting...' : 'Delete Permanently'}
        </button>
      </div>
    </div>
  );
}
