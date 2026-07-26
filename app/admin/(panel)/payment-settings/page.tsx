'use client';

import { useState, useEffect } from 'react';
import { Loader2, CreditCard, Banknote, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

// ── Types ─────────────────────────────────────────────────────

interface PaymentSettings {
  codEnabled: boolean;
  instaPayEnabled: boolean;
}

// ── Page ──────────────────────────────────────────────────────

export default function PaymentSettingsPage() {
  const [settings, setSettings] = useState<PaymentSettings>({
    codEnabled: true,
    instaPayEnabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let ignore = false;
    fetch('/api/admin/payment-settings')
      .then((res) => res.json())
      .then((data) => {
        if (!ignore && data.success) {
          setSettings(data.settings);
        }
      })
      .catch(() => {
        if (!ignore) toast.error('Failed to load payment settings');
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  const saveSettings = async () => {
    setSaving(true);
    const toastId = toast.loading('Saving…');
    try {
      const res = await fetch('/api/admin/payment-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codEnabled: settings.codEnabled,
          instaPayEnabled: settings.instaPayEnabled,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Payment settings saved', { id: toastId, duration: 2000 });
      } else {
        toast.error(data.error || 'Failed to save', { id: toastId });
      }
    } catch {
      toast.error('Failed to save settings', { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  // ── Loading ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-stone-500" />
          <span className="text-[13px] text-stone-500">Loading payment settings…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="text-white max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="text-[13px] text-stone-500 mb-1">Settings</div>
          <h1 className="text-xl font-semibold text-white">Payment Settings</h1>
        </div>
        <Button
          onClick={saveSettings}
          disabled={saving}
          className="bg-white text-stone-900 hover:bg-stone-200 text-[13px] font-medium h-9 gap-1.5 cursor-pointer"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save
        </Button>
      </div>

      {/* Payment Methods */}
      <div className="space-y-4">
        {/* InstaPay */}
        <div className="bg-stone-800/40 border border-stone-800/60 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${settings.instaPayEnabled ? 'bg-blue-500/10' : 'bg-stone-700/50'}`}>
                <CreditCard className={`h-5 w-5 ${settings.instaPayEnabled ? 'text-blue-400' : 'text-stone-500'}`} />
              </div>
              <div>
                <h3 className="text-[14px] font-medium text-white">InstaPay</h3>
                <p className="text-[12px] text-stone-400 mt-0.5">Mobile payment with screenshot verification</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded border ${
                settings.instaPayEnabled
                  ? 'bg-green-500/15 text-green-400 border-green-500/20'
                  : 'bg-red-500/15 text-red-400 border-red-500/20'
              }`}>
                {settings.instaPayEnabled ? 'Enabled' : 'Disabled'}
              </span>
              <Switch
                checked={settings.instaPayEnabled}
                onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, instaPayEnabled: checked }))}
              />
            </div>
          </div>
        </div>

        {/* COD — admin controlled */}
        <div className="bg-stone-800/40 border border-stone-800/60 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${settings.codEnabled ? 'bg-orange-500/10' : 'bg-stone-700/50'}`}>
                <Banknote className={`h-5 w-5 ${settings.codEnabled ? 'text-orange-400' : 'text-stone-500'}`} />
              </div>
              <div>
                <h3 className="text-[14px] font-medium text-white">Cash on Delivery (COD)</h3>
                <p className="text-[12px] text-stone-400 mt-0.5">Pay when the product is delivered</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded border ${
                settings.codEnabled
                  ? 'bg-green-500/15 text-green-400 border-green-500/20'
                  : 'bg-red-500/15 text-red-400 border-red-500/20'
              }`}>
                {settings.codEnabled ? 'Enabled' : 'Disabled'}
              </span>
              <Switch
                checked={settings.codEnabled}
                onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, codEnabled: checked }))}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="mt-6 bg-stone-800/20 border border-stone-800/40 rounded-xl p-5">
        <h4 className="text-[13px] font-medium text-stone-300 mb-2">How it works</h4>
        <ul className="text-[12px] text-stone-500 space-y-1">
          <li>• <strong className="text-stone-400">InstaPay:</strong> Instant bank transfer with screenshot verification</li>
          <li>• <strong className="text-stone-400">Cash on Delivery:</strong> Toggle on/off anytime</li>
          <li>• Changes take effect immediately at checkout</li>
        </ul>
      </div>
    </div>
  );
}
