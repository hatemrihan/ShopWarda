'use client';

import { useState } from 'react';

type LocationDetectorProps = {
  onLocationDetected: (governorate: string, city: string, lat?: number, lng?: number) => void;
};

/**
 * Location detector — uses browser geolocation + reverse geocoding
 * to auto-fill the user's governorate and city in the checkout form.
 */
export function LocationDetector({ onLocationDetected }: LocationDetectorProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [detected, setDetected] = useState(false);

  const handleDetectLocation = async () => {
    setLoading(true);
    setError('');

    if (!navigator.geolocation) {
      setError('المتصفح لا يدعم تحديد الموقع');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;

          // OpenStreetMap reverse geocoding in Arabic
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=ar&addressdetails=1`,
            { headers: { 'User-Agent': 'ShopWarda/1.0' } }
          );
          const data = await res.json();

          if (data?.address) {
            const { state, state_district, city, town, village, county, suburb, city_district } = data.address;
            const detectedGovernorate = state || state_district || county || city || '';
            const detectedCity = suburb || city_district || city || town || village || county || '';

            onLocationDetected(detectedGovernorate, detectedCity, latitude, longitude);
            setDetected(true);
          } else {
            setError('تعذر تحديد عنوانك. يرجى ملء البيانات يدوياً.');
          }
        } catch {
          setError('فشل في تحديد الموقع. يرجى ملء البيانات يدوياً.');
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setError('تم رفض إذن الموقع. يرجى ملء البيانات يدوياً.');
        } else {
          setError('تعذر تحديد الموقع. يرجى ملء البيانات يدوياً.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleDetectLocation}
        disabled={loading || detected}
        type="button"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-[11px] transition-all duration-200 cursor-pointer ${
          detected
            ? 'border-green-200 bg-green-50/50 text-green-700'
            : 'border-neutral-200 hover:border-neutral-300 text-neutral-600 bg-white'
        }`}
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-neutral-900" />
            <span>جاري التحديد...</span>
          </>
        ) : detected ? (
          <>
            <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>تم تحديد موقعك</span>
          </>
        ) : (
          <>
            <svg className="w-3.5 h-3.5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>تحديد موقعي تلقائياً</span>
          </>
        )}
      </button>

      {error && (
        <span className="text-[11px] text-amber-600">{error}</span>
      )}
    </div>
  );
}
