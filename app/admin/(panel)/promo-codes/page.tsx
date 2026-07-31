'use client';

import { useState, useEffect, useMemo } from 'react';
import { Loader2, Percent, Plus, Search, Pencil, Trash2, Tag, DollarSign } from 'lucide-react';
import Link from 'next/link';

interface PromoItem {
  id: string;
  code: string;
  name: string;
  type: 'percentage' | 'fixed_amount';
  value: number;
  usageLimit: number | null;
  usageCount: number;
  status: string;
  validUntil: string;
}

function statusColor(status: string) {
  if (status === 'active') return 'bg-green-400';
  if (status === 'disabled') return 'bg-amber-400';
  return 'bg-red-400';
}

export default function AdminPromoCodesPage() {
  const [promos, setPromos] = useState<PromoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/admin/promo')
      .then((r) => r.json())
      .then((data) => setPromos(data.items ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => promos.filter((p) => p.code.toLowerCase().includes(search.toLowerCase()) || p.name.toLowerCase().includes(search.toLowerCase())),
    [promos, search]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-6 w-6 animate-spin text-white/20" />
      </div>
    );
  }

  return (
    <div className="text-white max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="text-[13px] text-white/25 mb-1">Marketing</div>
          <h1 className="text-xl font-semibold text-white">Promo Codes</h1>
        </div>
        <Link
          href="/admin/promo-codes/new"
          className="flex items-center gap-1.5 bg-white text-stone-900 hover:bg-stone-200 text-[13px] font-medium h-9 px-4 rounded-md transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Promo Code
        </Link>
      </div>

      {/* Empty */}
      {promos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-6">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-5">
            <Tag className="h-7 w-7 text-white/15" />
          </div>
          <h2 className="text-[15px] font-medium text-white/60 mb-1.5">No promo codes yet</h2>
          <p className="text-[13px] text-white/25 text-center max-w-sm mb-6">
            Create your first promo code to offer discounts.
          </p>
          <Link
            href="/admin/promo-codes/new"
            className="flex items-center gap-1.5 bg-white text-stone-900 hover:bg-stone-200 text-[13px] font-medium h-9 px-4 rounded-md transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add First Promo Code
          </Link>
        </div>
      ) : (
        <>
          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25" />
            <input
              placeholder="Search promo codes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 h-10 bg-white/[0.03] border border-white/[0.06] rounded-lg text-[13px] text-white placeholder:text-white/25 focus:outline-none focus:border-white/[0.15] transition-colors"
            />
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((promo) => {
              const isExpired = new Date(promo.validUntil) < new Date();
              return (
                <div
                  key={promo.id}
                  className="group bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden hover:border-white/[0.12] transition-all duration-150 relative"
                >
                  {/* Top bar */}
                  <div className="px-5 pt-5 pb-4">
                    {/* Code badge */}
                    <div className="flex items-center justify-between mb-4">
                      <span className="font-mono text-[16px] font-bold text-white tracking-wider">{promo.code}</span>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${isExpired ? 'bg-red-400' : statusColor(promo.status)}`} />
                        <span className="text-[11px] text-white/30">{isExpired ? 'expired' : promo.status}</span>
                      </div>
                    </div>

                    {/* Discount */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">
                        {promo.type === 'percentage' ? (
                          <Percent className="h-4 w-4 text-green-400" />
                        ) : (
                          <DollarSign className="h-4 w-4 text-blue-400" />
                        )}
                      </div>
                      <div>
                        <span className="text-[18px] font-bold text-white">
                          {promo.type === 'percentage' ? `${promo.value}%` : `${(promo.value / 100).toFixed(0)} EGP`}
                        </span>
                        <span className="text-[11px] text-white/25 block">{promo.type === 'percentage' ? 'Percentage off' : 'Fixed amount off'}</span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex gap-4 mt-3 pt-3 border-t border-white/[0.04]">
                      <div>
                        <span className="text-[10px] text-white/20 block">Used</span>
                        <span className="text-[13px] text-white/60 font-mono">{promo.usageCount}/{promo.usageLimit ?? '∞'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-white/20 block">Expires</span>
                        <span className={`text-[13px] font-mono ${isExpired ? 'text-red-400' : 'text-white/60'}`}>
                          {new Date(promo.validUntil).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Hover actions */}
                  <div className="absolute top-3 right-3 flex gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <Link
                      href={`/admin/promo-codes/${promo.id}/edit`}
                      className="h-7 w-7 rounded-md bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 flex items-center justify-center transition-colors"
                    >
                      <Pencil className="h-3 w-3" />
                    </Link>
                    <Link
                      href={`/admin/promo-codes/${promo.id}/delete`}
                      className="h-7 w-7 rounded-md bg-red-500/10 backdrop-blur-sm text-red-400 hover:bg-red-500/20 flex items-center justify-center transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {filtered.length === 0 && search && (
            <div className="text-center py-12">
              <Search className="h-6 w-6 text-white/15 mx-auto mb-3" />
              <p className="text-[13px] text-white/30">No promo codes match &quot;{search}&quot;</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
