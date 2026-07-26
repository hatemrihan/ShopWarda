'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Save, MapPin, Truck, Banknote, CheckCircle2, AlertCircle, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EGYPT_GOVERNORATES } from '@/lib/data/egypt-governorates';

// ─── Types ────────────────────────────────────────────────────

type GovPricing = {
  id?: string;
  governorate: string;
  shipping_cost: number; // EGP
  cod_fee: number;       // EGP
  is_active: boolean;
};

// ─── Page Component ───────────────────────────────────────────

export default function GovernoratePricingPage() {
  const [pricing, setPricing] = useState<GovPricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedRows, setEditedRows] = useState<Set<string>>(new Set());
  const [expandedGovs, setExpandedGovs] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // ── Pure fetch + transform — no state, safe to call from anywhere ──
  const loadPricingData = useCallback(async (): Promise<GovPricing[]> => {
    const res = await fetch('/api/admin/governorate-pricing');
    const data = await res.json();

    if (data.success && data.pricing) {
      const pricingMap = new Map<string, GovPricing>(
        data.pricing.map((p: { governorate: string; shipping_cost: number; cod_fee: number; is_active: boolean }) => [
          p.governorate,
          {
            governorate: p.governorate,
            shipping_cost: Math.round((p.shipping_cost || 0) / 100),
            cod_fee: Math.round((p.cod_fee || 0) / 100),
            is_active: p.is_active ?? true,
          },
        ])
      );

      const merged: GovPricing[] = [];
      EGYPT_GOVERNORATES.forEach((gov) => {
        const existingParent = pricingMap.get(gov.name);
        merged.push({
          governorate: gov.name,
          shipping_cost: existingParent?.shipping_cost ?? 0,
          cod_fee: existingParent?.cod_fee ?? 0,
          is_active: existingParent?.is_active ?? true,
        });

        if (gov.subCityPricing) {
          gov.cities.forEach((city) => {
            const subKey = `${gov.name} - ${city}`;
            const existingSub = pricingMap.get(subKey);
            merged.push({
              governorate: subKey,
              shipping_cost: existingSub?.shipping_cost ?? existingParent?.shipping_cost ?? 0,
              cod_fee: existingSub?.cod_fee ?? existingParent?.cod_fee ?? 0,
              is_active: existingSub?.is_active ?? existingParent?.is_active ?? true,
            });
          });
        }
      });

      return merged;
    }

    const defaults: GovPricing[] = [];
    EGYPT_GOVERNORATES.forEach((gov) => {
      defaults.push({ governorate: gov.name, shipping_cost: 0, cod_fee: 0, is_active: true });
      if (gov.subCityPricing) {
        gov.cities.forEach((city) => {
          defaults.push({ governorate: `${gov.name} - ${city}`, shipping_cost: 0, cod_fee: 0, is_active: true });
        });
      }
    });
    return defaults;
  }, []);

  // ── Used by the "Try Again" button and post-save refresh ──
  const fetchPricing = useCallback(async () => {
    try {
      const result = await loadPricingData();
      setPricing(result);
      setError('');
    } catch {
      setError('Failed to load governorate pricing. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [loadPricingData]);

  // ── Initial load on mount ──
  useEffect(() => {
    let ignore = false;

    loadPricingData()
      .then((result) => {
        if (!ignore) {
          setPricing(result);
          setError('');
        }
      })
      .catch(() => {
        if (!ignore) {
          setError('Failed to load governorate pricing. Please check your connection and try again.');
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [loadPricingData]);

  // ── Toggle sub-menu expansion ──────────────────────────
  const toggleExpand = (govName: string) => {
    setExpandedGovs((prev) => {
      const next = new Set(prev);
      if (next.has(govName)) {
        next.delete(govName);
      } else {
        next.add(govName);
      }
      return next;
    });
  };

  // ── Update a single row ─────────────────────────────────
  const updateRow = (governorate: string, field: keyof GovPricing, value: number | boolean) => {
    setPricing((prev) =>
      prev.map((p) => (p.governorate === governorate ? { ...p, [field]: value } : p))
    );
    setEditedRows((prev) => new Set(prev).add(governorate));
  };

  // ── Save all changes ────────────────────────────────────
  const saveAll = async () => {
    setSaving(true);
    try {
      // Convert EGP back to piasters (minor) for DB storage
      const entries = pricing.map((p) => ({
        governorate: p.governorate,
        shipping_cost: Math.round(p.shipping_cost * 100),
        cod_fee: Math.round(p.cod_fee * 100),
        is_active: p.is_active,
      }));

      const res = await fetch('/api/admin/governorate-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bulk: true, entries }),
      });

      const data = await res.json();

      if (data.success) {
        showToast('All shipping rates and COD fees saved successfully!', 'success');
        setEditedRows(new Set());
        fetchPricing();
      } else {
        showToast(data.error || 'Failed to save pricing', 'error');
      }
    } catch {
      showToast('Failed to save changes. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Set same price for all ──────────────────────────────
  const setAllShipping = (val: number) => {
    setPricing((prev) => prev.map((p) => ({ ...p, shipping_cost: val })));
    setEditedRows(new Set(pricing.map((p) => p.governorate)));
  };

  const setAllCod = (val: number) => {
    setPricing((prev) => prev.map((p) => ({ ...p, cod_fee: val })));
    setEditedRows(new Set(pricing.map((p) => p.governorate)));
  };

  // ── Counts ──────────────────────────────────────────────
  const activeCount = pricing.filter((p) => p.is_active).length;
  const configuredCount = pricing.filter((p) => p.shipping_cost > 0).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-stone-500" />
          <span className="text-[13px] text-stone-500">Loading governorate pricing…</span>
        </div>
      </div>
    );
  }

  if (error && pricing.length === 0) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-red-400" />
          </div>
          <div>
            <p className="text-[14px] font-medium text-white mb-1">Unable to Load Pricing</p>
            <p className="text-[12px] text-stone-500">{error}</p>
          </div>
          <Button
            onClick={() => {
              setLoading(true);
              fetchPricing();
            }}
            className="bg-stone-800 hover:bg-stone-700 text-white text-[13px] gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="text-white max-w-6xl space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-6 right-6 z-[100] animate-in fade-in slide-in-from-top-4 duration-300 px-4 py-3 rounded-lg text-xs font-semibold shadow-2xl border ${
            toastMessage.type === 'success'
              ? 'bg-green-950 border-green-500/40 text-green-300'
              : 'bg-red-950 border-red-500/40 text-red-300'
          }`}
        >
          {toastMessage.text}
        </div>
      )}

      {/* ── Header ──────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] text-stone-500 uppercase tracking-wider font-semibold">Settings</div>
          <h1 className="text-xl font-semibold text-white mt-1">Shipping & COD Pricing</h1>
          <p className="text-[12px] text-stone-400 mt-0.5">
            Manage shipping costs and cash-on-delivery fees for all 27 Egyptian governorates and sub-cities
          </p>
        </div>
        <div className="flex items-center gap-3">
          {editedRows.size > 0 && (
            <span className="text-[11px] text-amber-400 font-medium px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 rounded-md">
              {editedRows.size} unsaved changes
            </span>
          )}
          <Button
            onClick={saveAll}
            disabled={saving}
            className="bg-white text-stone-900 hover:bg-stone-200 text-[13px] font-semibold h-9 gap-1.5 shadow-sm"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save All Changes
          </Button>
        </div>
      </div>

      {/* ── Stats ───────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-stone-800/40 border border-stone-800/60 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <MapPin className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <p className="text-[18px] font-semibold text-white">{EGYPT_GOVERNORATES.length}</p>
              <p className="text-[11px] text-stone-500">Governorates</p>
            </div>
          </div>
        </div>
        <div className="bg-stone-800/40 border border-stone-800/60 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
            </div>
            <div>
              <p className="text-[18px] font-semibold text-white">{activeCount}</p>
              <p className="text-[11px] text-stone-500">Active Zones</p>
            </div>
          </div>
        </div>
        <div className="bg-stone-800/40 border border-stone-800/60 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Truck className="h-4 w-4 text-purple-400" />
            </div>
            <div>
              <p className="text-[18px] font-semibold text-white">{configuredCount}</p>
              <p className="text-[11px] text-stone-500">Configured Rates</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Quick Set ───────────────────────────────── */}
      <div className="bg-stone-800/30 border border-stone-800/50 rounded-xl p-4">
        <p className="text-[12px] text-stone-400 font-medium mb-3">Quick Set — Apply flat rate to all governorates and cities</p>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Truck className="h-3.5 w-3.5 text-stone-500" />
            <span className="text-[12px] text-stone-400">Shipping:</span>
            {[40, 50, 60, 70, 80].map((val) => (
              <button
                key={val}
                onClick={() => setAllShipping(val)}
                className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded text-[11px] text-stone-300 transition-colors cursor-pointer"
              >
                {val} EGP
              </button>
            ))}
          </div>
          <div className="w-px h-6 bg-stone-800 hidden sm:block" />
          <div className="flex items-center gap-2">
            <Banknote className="h-3.5 w-3.5 text-stone-500" />
            <span className="text-[12px] text-stone-400">COD Fee:</span>
            {[0, 10, 20, 30].map((val) => (
              <button
                key={val}
                onClick={() => setAllCod(val)}
                className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded text-[11px] text-stone-300 transition-colors cursor-pointer"
              >
                {val === 0 ? 'Free' : `${val} EGP`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Table ───────────────────────────────────── */}
      <div className="bg-stone-800/30 border border-stone-800/50 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-stone-800/60 bg-stone-900/40">
                <th className="px-5 py-3 text-[11px] font-semibold text-stone-500 uppercase tracking-wider w-8">#</th>
                <th className="px-5 py-3 text-[11px] font-semibold text-stone-500 uppercase tracking-wider">Governorate / City</th>
                <th className="px-5 py-3 text-[11px] font-semibold text-stone-500 uppercase tracking-wider">Shipping Cost (EGP)</th>
                <th className="px-5 py-3 text-[11px] font-semibold text-stone-500 uppercase tracking-wider">COD Fee (EGP)</th>
                <th className="px-5 py-3 text-[11px] font-semibold text-stone-500 uppercase tracking-wider text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {pricing.map((row, index) => {
                const isSubCity = row.governorate.includes(' - ');
                const [parentName, cityName] = isSubCity ? row.governorate.split(' - ') : [row.governorate, ''];
                const govData = EGYPT_GOVERNORATES.find((g) => g.name === parentName);

                if (isSubCity && !expandedGovs.has(parentName)) {
                  return null;
                }

                const isExpanded = expandedGovs.has(parentName);
                const hasSubPricing = govData?.subCityPricing;
                const isEdited = editedRows.has(row.governorate);

                return (
                  <tr
                    key={row.governorate}
                    className={`border-b border-stone-800/30 transition-colors ${
                      isSubCity
                        ? 'bg-stone-900/20 hover:bg-stone-800/10'
                        : isEdited
                        ? 'bg-amber-500/5'
                        : 'hover:bg-stone-800/20'
                    }`}
                  >
                    {/* Index */}
                    <td className="px-5 py-3">
                      {isSubCity ? (
                        <span className="text-[11px] text-stone-700 font-mono pl-3">↳</span>
                      ) : (
                        <span className="text-[11px] text-stone-600 font-mono">
                          {(index + 1).toString().padStart(2, '0')}
                        </span>
                      )}
                    </td>

                    {/* Name */}
                    <td className="px-5 py-3">
                      <div className={`flex items-center gap-3 ${isSubCity ? 'pl-6' : ''}`}>
                        {!isSubCity && hasSubPricing ? (
                          <button
                            type="button"
                            onClick={() => toggleExpand(row.governorate)}
                            className="w-5 h-5 rounded hover:bg-stone-800 flex items-center justify-center text-stone-400 hover:text-white transition-colors cursor-pointer"
                          >
                            {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                          </button>
                        ) : !isSubCity ? (
                          <div className="w-5" />
                        ) : null}

                        <div className={`w-2 h-2 rounded-full shrink-0 ${row.is_active ? 'bg-green-400' : 'bg-stone-600'}`} />
                        <div>
                          <p className="text-[13px] font-medium text-white">
                            {isSubCity ? cityName : row.governorate}
                            {!isSubCity && hasSubPricing && (
                              <span className="ml-2 text-[10px] text-amber-400 font-medium px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded">
                                Detailed Pricing
                              </span>
                            )}
                          </p>
                          {!isSubCity && <p className="text-[11px] text-stone-500">{govData?.nameEn}</p>}
                        </div>
                      </div>
                    </td>

                    {/* Shipping Cost Input */}
                    <td className="px-5 py-3">
                      <div className="relative w-28">
                        <input
                          type="number"
                          value={row.shipping_cost || ''}
                          onChange={(e) =>
                            updateRow(row.governorate, 'shipping_cost', parseFloat(e.target.value) || 0)
                          }
                          placeholder="0"
                          min="0"
                          className="w-full px-3 py-1.5 bg-stone-800/60 border border-stone-700 rounded-md text-[13px] text-white focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500 placeholder:text-stone-600"
                        />
                      </div>
                    </td>

                    {/* COD Fee Input */}
                    <td className="px-5 py-3">
                      <div className="relative w-28">
                        <input
                          type="number"
                          value={row.cod_fee || ''}
                          onChange={(e) =>
                            updateRow(row.governorate, 'cod_fee', parseFloat(e.target.value) || 0)
                          }
                          placeholder="0"
                          min="0"
                          className="w-full px-3 py-1.5 bg-stone-800/60 border border-stone-700 rounded-md text-[13px] text-white focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500 placeholder:text-stone-600"
                        />
                      </div>
                    </td>

                    {/* Active Toggle */}
                    <td className="px-5 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => updateRow(row.governorate, 'is_active', !row.is_active)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer border ${
                          row.is_active
                            ? 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20'
                            : 'bg-stone-800 text-stone-500 border-stone-700 hover:bg-stone-700'
                        }`}
                      >
                        {row.is_active ? (
                          <>
                            <CheckCircle2 className="h-3 w-3" />
                            Active
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-3 w-3" />
                            Inactive
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Info Box ─────────────────────────────────────── */}
      <div className="bg-stone-800/20 border border-stone-800/40 rounded-xl p-5">
        <h4 className="text-[13px] font-medium text-stone-300 mb-2">How it works</h4>
        <ul className="text-[12px] text-stone-400 space-y-1.5">
          <li>• <strong className="text-stone-300">Shipping Cost:</strong> Base delivery fee charged to customer when choosing this governorate/city at checkout.</li>
          <li>• <strong className="text-stone-300">COD Fee:</strong> Additional fee applied when Cash on Delivery is selected.</li>
          <li>• <strong className="text-stone-300">Order Confirmation & Email Integration:</strong> Automatically synced across order calculations, checkout summary, order confirmation screen, and customer/admin confirmation emails.</li>
        </ul>
      </div>
    </div>
  );
}
