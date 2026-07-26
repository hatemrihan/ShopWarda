import { Settings, Store, CreditCard, Truck, BarChart3 } from 'lucide-react';
import connectDB from '@/lib/db/mongoose';
import { getSettings } from '@/lib/db/models/store-settings.model';
import { formatEGP } from '@/lib/money/egp';

async function getStoreSettings() {
  await connectDB();
  const settings = await getSettings();
  return JSON.parse(JSON.stringify(settings));
}

export default async function AdminSettingsPage() {
  const settings = await getStoreSettings();

  return (
    <div className="space-y-6 max-w-[1100px]">
      {/* Header */}
      <div>
        <h1 className="text-[15px] font-semibold text-white leading-none">Settings</h1>
        <p className="text-[11px] text-white/25 mt-1.5">Store configuration</p>
      </div>

      {/* Store Info */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-5">
        <div className="flex items-center gap-2 mb-4">
          <Store className="h-4 w-4 text-white/30" />
          <span className="text-[11px] text-white/40 uppercase tracking-wider font-medium">Store Information</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <SettingField label="Store Name" value={settings.storeName} />
          <SettingField label="Phone" value={settings.contact?.phone || '—'} />
          <SettingField label="Email" value={settings.contact?.email || '—'} />
          <SettingField label="WhatsApp" value={settings.contact?.whatsapp || '—'} />
          <SettingField label="Address" value={settings.contact?.address || '—'} className="col-span-2" />
        </div>
      </div>

      {/* InstaPay */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-5">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="h-4 w-4 text-white/30" />
          <span className="text-[11px] text-white/40 uppercase tracking-wider font-medium">InstaPay Configuration</span>
        </div>
        <div className="grid grid-cols-1 gap-4">
          <SettingField label="Account Link" value={settings.instaPay?.accountLink || '—'} />
          <SettingField label="Instructions" value={settings.instaPay?.instructions || '—'} />
        </div>
      </div>

      {/* Shipping Zones */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-white/30" />
            <span className="text-[11px] text-white/40 uppercase tracking-wider font-medium">Shipping Zones</span>
          </div>
          {settings.freeDeliveryThresholdMinor && (
            <span className="text-[10px] text-green-400/60">
              Free delivery above {formatEGP(settings.freeDeliveryThresholdMinor)}
            </span>
          )}
        </div>

        {(settings.shippingZones ?? []).length > 0 ? (
          <div className="space-y-1">
            {/* Header */}
            <div className="grid grid-cols-[1fr_100px_100px_60px] gap-3 px-3 py-2">
              <span className="text-[9px] text-white/20 uppercase tracking-wider">Governorate</span>
              <span className="text-[9px] text-white/20 uppercase tracking-wider">Fee</span>
              <span className="text-[9px] text-white/20 uppercase tracking-wider">Days</span>
              <span className="text-[9px] text-white/20 uppercase tracking-wider">Active</span>
            </div>
            {settings.shippingZones.map((zone: { governorate: string; feeMinor: number; estimatedDays: number; enabled: boolean }) => (
              <div
                key={zone.governorate}
                className="grid grid-cols-[1fr_100px_100px_60px] gap-3 px-3 py-2 rounded-md hover:bg-white/[0.02] transition-colors items-center"
              >
                <span className="text-[12px] text-white/70">{zone.governorate}</span>
                <span className="text-[12px] text-white/50 font-mono">{formatEGP(zone.feeMinor)}</span>
                <span className="text-[12px] text-white/40">{zone.estimatedDays} days</span>
                <div className={`w-1.5 h-1.5 rounded-full ${zone.enabled ? 'bg-green-400' : 'bg-white/20'}`} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-white/20 py-4 text-center">No shipping zones configured</p>
        )}
      </div>

      {/* Delivery Schedule */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-5">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="h-4 w-4 text-white/30" />
          <span className="text-[11px] text-white/40 uppercase tracking-wider font-medium">Delivery Schedule</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <SettingField label="Cutoff Time" value={settings.deliverySchedule?.cutoffTime || '14:00'} />
          <SettingField
            label="Same-Day Zones"
            value={(settings.deliverySchedule?.sameDayZones ?? []).join(', ') || 'None'}
          />
        </div>
      </div>

      {/* Analytics */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-4 w-4 text-white/30" />
          <span className="text-[11px] text-white/40 uppercase tracking-wider font-medium">Analytics</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <SettingField label="Google Analytics" value={settings.publicAnalyticsIds?.googleAnalytics || 'Not configured'} />
          <SettingField label="Facebook Pixel" value={settings.publicAnalyticsIds?.facebookPixel || 'Not configured'} />
        </div>
      </div>
    </div>
  );
}

function SettingField({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <span className="text-[10px] text-white/25 block mb-1">{label}</span>
      <span className="text-[13px] text-white/70">{value}</span>
    </div>
  );
}
