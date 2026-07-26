'use client';

import { useState, useEffect } from 'react';
import {
  EGYPT_GOVERNORATES,
  getCitiesForGovernorate,
} from '@/lib/data/egypt-governorates';
import { LocationDetector } from './LocationDetector';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface GovernoratePrice {
  governorate: string;
  shipping_cost: number;
  cod_fee: number;
  estimated_days: number;
}

interface CustomerInfo {
  name: string;
  phone: string;
  email: string;
  governorate: string;
  city: string;
  area: string;
  street: string;
  building: string;
  floor: string;
  apartment: string;
  landmark: string;
  deliveryNotes: string;
  lat?: number;
  lng?: number;
}

interface CustomerInfoFormProps {
  value: CustomerInfo;
  onChange: (info: CustomerInfo) => void;
  onShippingChange: (shipping: number, codFee: number, estimatedDays: number) => void;
  errors?: Record<string, string>;
}

export function CustomerInfoForm({
  value,
  onChange,
  onShippingChange,
  errors = {},
}: CustomerInfoFormProps) {
  const [governoratePricing, setGovernoratePricing] = useState<GovernoratePrice[]>([]);
  const [pricingLoading, setPricingLoading] = useState(true);

  // Derive city list directly from current governorate selection
  const cities = value.governorate ? getCitiesForGovernorate(value.governorate) : [];

  // Fetch governorate pricing on mount
  useEffect(() => {
    async function fetchPricing() {
      try {
        setPricingLoading(true);
        const res = await fetch('/api/governorate-pricing');
        const data = await res.json();
        if (data.success) {
          setGovernoratePricing(data.pricing);
        }
      } catch (err) {
        console.error('Failed to fetch pricing:', err);
      } finally {
        setPricingLoading(false);
      }
    }
    fetchPricing();
  }, []);

  // Update shipping cost when governorate or pricing changes
  useEffect(() => {
    if (value.governorate && governoratePricing.length > 0) {
      const pricing = governoratePricing.find(
        (p) => p.governorate === value.governorate
      );
      if (pricing) {
        onShippingChange(pricing.shipping_cost, pricing.cod_fee, pricing.estimated_days);
      }
    }
  }, [value.governorate, governoratePricing, onShippingChange]);

  const handleLocationDetected = (detectedGov: string, detectedCity: string, lat?: number, lng?: number) => {
    const cleanGov = detectedGov.replace(/^محافظة\s*/, '').trim();

    let matchedGov = EGYPT_GOVERNORATES.find((g) => {
      const gClean = g.name.replace(/^ال/, '');
      const dClean = cleanGov.replace(/^ال/, '');
      return (
        g.name === cleanGov ||
        g.name.includes(cleanGov) ||
        cleanGov.includes(g.name) ||
        gClean === dClean ||
        g.nameEn.toLowerCase().includes(cleanGov.toLowerCase()) ||
        cleanGov.toLowerCase().includes(g.nameEn.toLowerCase())
      );
    });

    if (!matchedGov && detectedCity) {
      const cleanCity = detectedCity.replace(/^محافظة\s*|^قسم\s*|^مركز\s*|^حي\s*/, '').trim();
      matchedGov = EGYPT_GOVERNORATES.find((g) =>
        g.name.includes(cleanCity) ||
        cleanCity.includes(g.name) ||
        g.cities.some((c) => c.includes(cleanCity) || cleanCity.includes(c))
      );
    }

    if (matchedGov) {
      const cityList = matchedGov.cities;
      const cleanCity = detectedCity.replace(/^قسم\s*|^مركز\s*|^حي\s*/, '').trim();
      const matchedCity = cityList.find(
        (c) => c === cleanCity || c.includes(cleanCity) || cleanCity.includes(c)
      );

      onChange({
        ...value,
        governorate: matchedGov.name,
        city: matchedCity || cleanCity || value.city,
        lat,
        lng,
      });
    } else {
      onChange({
        ...value,
        lat,
        lng,
      });
    }
  };

  const updateField = (field: keyof CustomerInfo, val: string) => {
    if (field === 'governorate') {
      const cityList = getCitiesForGovernorate(val);
      const newCity = cityList.length > 0 && !cityList.includes(value.city) ? '' : value.city;
      onChange({ ...value, governorate: val, city: newCity });
    } else {
      onChange({ ...value, [field]: val });
    }
  };

  const labelClass = 'block text-[11px] font-bold text-neutral-800 uppercase tracking-wider mb-1';

  return (
    <div className="space-y-7">
      {/* Contact Information */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-800 border-b border-neutral-300 pb-2">
          CONTACT INFORMATION
        </h2>

        {/* Name & Phone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className={labelClass}>Full Name *</Label>
            <Input
              type="text"
              value={value.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="First and last name"
              className={`text-xs border-b border-t-0 border-x-0 rounded-none bg-transparent shadow-none px-1 focus-visible:ring-0 focus-visible:border-neutral-900 ${
                errors.name ? 'border-red-500 text-red-900' : 'border-neutral-300'
              }`}
            />
            {errors.name && <p className="mt-1 text-[11px] text-red-500 font-medium">{errors.name}</p>}
          </div>
          <div>
            <Label className={labelClass}>Phone Number *</Label>
            <Input
              type="tel"
              value={value.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              placeholder="01XXXXXXXXX"
              className={`text-xs border-b border-t-0 border-x-0 rounded-none bg-transparent shadow-none px-1 focus-visible:ring-0 focus-visible:border-neutral-900 ${
                errors.phone ? 'border-red-500 text-red-900' : 'border-neutral-300'
              }`}
              dir="ltr"
            />
            {errors.phone && <p className="mt-1 text-[11px] text-red-500 font-medium">{errors.phone}</p>}
          </div>
        </div>

        {/* Email */}
        <div>
          <Label className={labelClass}>E-mail (Optional)</Label>
          <Input
            type="email"
            value={value.email}
            onChange={(e) => updateField('email', e.target.value)}
            placeholder="your@email.com"
            className="text-xs border-b border-t-0 border-x-0 rounded-none bg-transparent shadow-none px-1 focus-visible:ring-0 focus-visible:border-neutral-900 border-neutral-300"
            dir="ltr"
          />
        </div>
      </div>

      {/* Shipping Address */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-300 pb-2">
          <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-800">
            SHIPPING ADDRESS
          </h2>
          <LocationDetector onLocationDetected={handleLocationDetected} />
        </div>

        {pricingLoading ? (
          <div className="space-y-3 py-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <>
            {/* Governorate & City */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className={labelClass}>Governorate *</Label>
                  {value.governorate && (
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-emerald-300 bg-emerald-50 text-emerald-800 font-bold">
                      SELECTED
                    </Badge>
                  )}
                </div>
                <select
                  value={value.governorate}
                  onChange={(e) => updateField('governorate', e.target.value)}
                  className={`w-full py-2.5 px-1 bg-transparent border-b text-xs font-medium outline-none cursor-pointer ${
                    errors.governorate ? 'border-red-500 text-red-900' : 'border-neutral-300 text-neutral-900'
                  }`}
                >
                  <option value="">Select governorate</option>
                  {EGYPT_GOVERNORATES.map((g) => (
                    <option key={g.name} value={g.name}>
                      {g.name} — {g.nameEn}
                    </option>
                  ))}
                </select>
                {errors.governorate && (
                  <p className="mt-1 text-[11px] text-red-500 font-medium">{errors.governorate}</p>
                )}
              </div>

              <div>
                <Label className={labelClass}>City *</Label>
                {cities.length > 0 ? (
                  <select
                    value={value.city}
                    onChange={(e) => updateField('city', e.target.value)}
                    className={`w-full py-2.5 px-1 bg-transparent border-b text-xs font-medium outline-none cursor-pointer ${
                      errors.city ? 'border-red-500 text-red-900' : 'border-neutral-300 text-neutral-900'
                    }`}
                  >
                    <option value="">Select city</option>
                    {cities.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                ) : (
                  <Input
                    type="text"
                    value={value.city}
                    onChange={(e) => updateField('city', e.target.value)}
                    placeholder="City name"
                    className={`text-xs border-b border-t-0 border-x-0 rounded-none bg-transparent shadow-none px-1 focus-visible:ring-0 focus-visible:border-neutral-900 ${
                      errors.city ? 'border-red-500 text-red-900' : 'border-neutral-300'
                    }`}
                  />
                )}
                {errors.city && <p className="mt-1 text-[11px] text-red-500 font-medium">{errors.city}</p>}
              </div>
            </div>

            {/* Area & Street */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className={labelClass}>Area / District</Label>
                <Input
                  type="text"
                  value={value.area}
                  onChange={(e) => updateField('area', e.target.value)}
                  placeholder="e.g. Maadi, Nasr City"
                  className="text-xs border-b border-t-0 border-x-0 rounded-none bg-transparent shadow-none px-1 focus-visible:ring-0 focus-visible:border-neutral-900 border-neutral-300"
                />
              </div>
              <div>
                <Label className={labelClass}>Street Address *</Label>
                <Input
                  type="text"
                  value={value.street}
                  onChange={(e) => updateField('street', e.target.value)}
                  placeholder="Street name & number"
                  className={`text-xs border-b border-t-0 border-x-0 rounded-none bg-transparent shadow-none px-1 focus-visible:ring-0 focus-visible:border-neutral-900 ${
                    errors.street ? 'border-red-500 text-red-900' : 'border-neutral-300'
                  }`}
                />
                {errors.street && <p className="mt-1 text-[11px] text-red-500 font-medium">{errors.street}</p>}
              </div>
            </div>

            {/* Landmark */}
            <div>
              <Label className={labelClass}>Landmark (Optional)</Label>
              <Input
                type="text"
                value={value.landmark}
                onChange={(e) => updateField('landmark', e.target.value)}
                placeholder="Near / Beside..."
                className="text-xs border-b border-t-0 border-x-0 rounded-none bg-transparent shadow-none px-1 focus-visible:ring-0 focus-visible:border-neutral-900 border-neutral-300"
              />
            </div>

            {/* Delivery Notes */}
            <div>
              <Label className={labelClass}>Delivery Instructions</Label>
              <Textarea
                value={value.deliveryNotes}
                onChange={(e) => updateField('deliveryNotes', e.target.value)}
                placeholder="Notes for the courier..."
                rows={2}
                className="text-xs border-b border-t-0 border-x-0 rounded-none bg-transparent shadow-none px-1 focus-visible:ring-0 focus-visible:border-neutral-900 border-neutral-300 resize-none min-h-[50px]"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
