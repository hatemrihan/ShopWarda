'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';

const STEPS = [
  { id: 'details', num: '01', title: 'Code Details' },
  { id: 'discount', num: '02', title: 'Discount Info' },
  { id: 'limits', num: '03', title: 'Usage Limits' },
];

function LeftStepper() {
  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };
  return (
    <aside className="hidden lg:block w-56 shrink-0 relative z-0">
      <div className="sticky top-[100px] pt-4">
        <div className="absolute left-[11.5px] top-6 bottom-4 w-px bg-white/[0.06]" />
        <ul className="space-y-6 relative">
          {STEPS.map((step) => (
            <li key={step.id}>
              <a href={`#${step.id}`} onClick={(e) => scrollToSection(e, step.id)} className="group flex items-center gap-4 text-white/40 hover:text-white transition-colors">
                <div className="w-6 h-6 rounded-full bg-white/[0.04] border-2 border-white/[0.12] flex items-center justify-center text-[10px] text-white font-bold font-mono z-10 shrink-0 group-hover:border-white/40">{step.num}</div>
                <span className="text-[13px] font-semibold tracking-wide">{step.title}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-16">
      <h3 className="text-[15px] font-semibold text-white mb-6 tracking-tight border-b border-white/[0.06] pb-4">{title}</h3>
      <div className="space-y-6">{children}</div>
    </div>
  );
}

function InputLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-[13px] font-medium text-white/50 mb-2">{children}</label>;
}

const inputClass = 'w-full p-3 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white text-[13px] focus:border-white/[0.2] focus:outline-none focus:ring-1 focus:ring-white/[0.1] placeholder:text-white/20 transition-colors';

export default function EditPromoCodePage() {
  const router = useRouter();
  const params = useParams();
  const promoId = params.promoId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<'percentage' | 'fixed_amount'>('percentage');
  const [value, setValue] = useState<number>(0);
  const [minOrderEGP, setMinOrderEGP] = useState<number>(0);
  const [maxDiscountEGP, setMaxDiscountEGP] = useState<number>(0);
  const [usageLimit, setUsageLimit] = useState<number>(0);
  const [usageCount, setUsageCount] = useState<number>(0);
  const [perPhoneLimit, setPerPhoneLimit] = useState<number>(0);
  const [status, setStatus] = useState<'active' | 'disabled'>('active');
  const [validUntil, setValidUntil] = useState('');

  useEffect(() => {
    fetch(`/api/admin/promo/${promoId}`)
      .then((r) => r.json())
      .then((data) => {
        setCode(data.code ?? '');
        setName(data.name ?? '');
        setType(data.type ?? 'percentage');
        setValue(data.type === 'fixed_amount' ? (data.value ?? 0) / 100 : data.value ?? 0);
        setMinOrderEGP((data.minOrderMinor ?? 0) / 100);
        setMaxDiscountEGP((data.maxDiscountMinor ?? 0) / 100);
        setUsageLimit(data.usageLimit ?? 0);
        setUsageCount(data.usageCount ?? 0);
        setPerPhoneLimit(data.perPhoneLimit ?? 0);
        setStatus(data.status === 'disabled' ? 'disabled' : 'active');
        setValidUntil(data.validUntil ? data.validUntil.split('T')[0] : '');
      })
      .catch(() => setFormErrors({ submit: 'Failed to load promo code' }))
      .finally(() => setLoading(false));
  }, [promoId]);

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!code.trim()) errors.code = 'Code is required';
    if (!value || value <= 0) errors.value = 'Discount value is required';
    if (type === 'percentage' && value > 100) errors.value = 'Cannot exceed 100%';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSaving(true);
    setFormErrors({});
    try {
      const res = await fetch(`/api/admin/promo/${promoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          name: name || code,
          type,
          value: type === 'percentage' ? value : value * 100,
          minOrderMinor: Math.round(minOrderEGP * 100),
          maxDiscountMinor: maxDiscountEGP ? Math.round(maxDiscountEGP * 100) : undefined,
          usageLimit: usageLimit || undefined,
          perPhoneLimit: perPhoneLimit || undefined,
          validUntil: validUntil ? new Date(validUntil).toISOString() : undefined,
          status,
        }),
      });
      if (res.ok) {
        router.push('/admin/promo-codes');
        router.refresh();
      } else {
        const data = await res.json();
        setFormErrors({ submit: data.error || 'Failed to update' });
      }
    } catch {
      setFormErrors({ submit: 'Error updating promo code' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-6 w-6 animate-spin text-white/20" />
      </div>
    );
  }

  return (
    <div>
      <div className="border-b border-white/[0.06] pb-4 mb-8">
        <button type="button" onClick={() => router.back()} className="text-white/30 hover:text-white transition-colors text-xs flex items-center gap-1.5 font-medium w-fit mb-2">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Promo Codes
        </button>
        <h1 className="text-lg font-bold text-white tracking-tight">Edit Promo Code</h1>
        <span className="text-[10px] font-medium tracking-wider text-white/25 uppercase">Marketing</span>
      </div>

      <div className="flex items-start gap-8">
        <LeftStepper />

        <main className="w-full max-w-3xl shrink min-w-0 space-y-12 pb-32">
          {/* 01 Code Details */}
          <div id="details" className="scroll-mt-32">
            <Section title="01. Code Details">
              <div className="space-y-5">
                <div>
                  <InputLabel>Promo Code *</InputLabel>
                  <input type="text" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className={inputClass} placeholder="SAVE20" />
                  {formErrors.code && <p className="text-red-400 text-[11px] mt-1">{formErrors.code}</p>}
                </div>
                <div>
                  <InputLabel>Name</InputLabel>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Summer Sale 20% Off" />
                </div>
              </div>
            </Section>
          </div>

          {/* 02 Discount Info */}
          <div id="discount" className="scroll-mt-32">
            <Section title="02. Discount Info">
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <InputLabel>Discount Type</InputLabel>
                  <select value={type} onChange={(e) => setType(e.target.value as 'percentage' | 'fixed_amount')} className={inputClass}>
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed_amount">Fixed Amount (EGP)</option>
                  </select>
                </div>
                <div>
                  <InputLabel>Discount Value *</InputLabel>
                  <input type="number" value={value || ''} onChange={(e) => setValue(parseFloat(e.target.value) || 0)} className={inputClass} placeholder={type === 'percentage' ? '20' : '50'} min={0} max={type === 'percentage' ? 100 : undefined} />
                  {formErrors.value && <p className="text-red-400 text-[11px] mt-1">{formErrors.value}</p>}
                </div>
              </div>
              {type === 'percentage' && (
                <div>
                  <InputLabel>Max Discount Cap (EGP)</InputLabel>
                  <input type="number" value={maxDiscountEGP || ''} onChange={(e) => setMaxDiscountEGP(parseFloat(e.target.value) || 0)} className={inputClass} placeholder="No cap" min={0} />
                </div>
              )}
            </Section>
          </div>

          {/* 03 Usage Limits */}
          <div id="limits" className="scroll-mt-32">
            <Section title="03. Usage Limits">
              <div className="flex items-center justify-between p-3 bg-white/[0.02] rounded-lg border border-white/[0.04] mb-6">
                <div>
                  <h4 className="text-[13px] font-medium text-white mb-0.5">Status</h4>
                  <p className="text-[11px] text-white/25">{status === 'active' ? 'Active and usable' : 'Disabled'}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={status === 'active'} onChange={(e) => setStatus(e.target.checked ? 'active' : 'disabled')} />
                  <div className="w-11 h-6 bg-white/[0.08] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white/40 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500/30 peer-checked:after:bg-green-400"></div>
                </label>
              </div>

              {/* Current usage */}
              <div className="p-3 bg-white/[0.02] rounded-lg border border-white/[0.04] mb-4">
                <span className="text-[10px] text-white/25 uppercase tracking-wider block mb-1">Current Usage</span>
                <span className="text-[15px] font-mono font-bold text-white">{usageCount}</span>
                <span className="text-[12px] text-white/25"> times used</span>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <InputLabel>Minimum Order (EGP)</InputLabel>
                  <input type="number" value={minOrderEGP || ''} onChange={(e) => setMinOrderEGP(parseFloat(e.target.value) || 0)} className={inputClass} placeholder="100" min={0} />
                </div>
                <div>
                  <InputLabel>Max Total Uses</InputLabel>
                  <input type="number" value={usageLimit || ''} onChange={(e) => setUsageLimit(parseInt(e.target.value) || 0)} className={inputClass} placeholder="100" min={1} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <InputLabel>Per Phone Limit</InputLabel>
                  <input type="number" value={perPhoneLimit || ''} onChange={(e) => setPerPhoneLimit(parseInt(e.target.value) || 0)} className={inputClass} placeholder="1" min={1} />
                </div>
                <div>
                  <InputLabel>Valid Until</InputLabel>
                  <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className={inputClass} />
                </div>
              </div>
            </Section>
          </div>

          {formErrors.submit && (
            <div className="p-4 bg-red-400/[0.04] border border-red-400/[0.15] rounded-lg">
              <p className="text-red-400 text-[13px] text-center font-medium">{formErrors.submit}</p>
            </div>
          )}

          <div className="pt-8 border-t border-white/[0.06] flex justify-end gap-3">
            <button onClick={() => router.back()} className="px-6 py-2.5 rounded-lg text-[13px] text-white/40 border border-white/[0.06] hover:bg-white/[0.04] transition-colors">Cancel</button>
            <button onClick={handleSubmit} disabled={saving}
              className="bg-white hover:bg-stone-200 text-stone-900 px-8 py-2.5 rounded-lg font-medium text-[13px] transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {saving ? 'Updating...' : 'Update Promo Code'}
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
