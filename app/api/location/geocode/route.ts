import { NextRequest, NextResponse } from 'next/server';
import { EGYPT_GOVERNORATES, findGovernorateMatch } from '@/lib/data/egypt-governorates';

/**
 * GET /api/location/geocode?lat=xx&lng=yy
 * Reverse geocoding API with multi-provider fallback and Egyptian governorate/city resolution.
 */
export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get('lat');
  const lng = req.nextUrl.searchParams.get('lng');

  if (!lat || !lng) {
    return NextResponse.json(
      { success: false, error: 'lat and lng parameters are required' },
      { status: 400 },
    );
  }

  try {
    let state = '';
    let city = '';
    let locality = '';

    // 1. Primary reverse geocode: BigDataCloud API
    try {
      const bdcRes = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
        { headers: { 'User-Agent': 'ShopWarda/1.0' } }
      );
      if (bdcRes.ok) {
        const bdcData = await bdcRes.json();
        state = bdcData.principalSubdivision || bdcData.localityInfo?.administrative?.[1]?.name || '';
        city = bdcData.city || bdcData.locality || bdcData.localityInfo?.administrative?.[2]?.name || '';
        locality = bdcData.locality || '';
      }
    } catch (err) {
      console.warn('[Geocode API] BigDataCloud failed, falling back to OSM:', err);
    }

    // 2. Secondary fallback: OpenStreetMap Nominatim
    if (!state) {
      try {
        const nomRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=en,ar&addressdetails=1`,
          { headers: { 'User-Agent': 'ShopWarda/1.0 (contact@shopwarda.com)' } }
        );
        if (nomRes.ok) {
          const nomData = await nomRes.json();
          const addr = nomData.address || {};
          state = addr.state || addr.province || addr.region || addr.county || addr.city || '';
          city = addr.city || addr.town || addr.village || addr.suburb || addr.city_district || addr.county || '';
        }
      } catch (err) {
        console.warn('[Geocode API] Nominatim failed:', err);
      }
    }

    // Match governorate
    let matchedGov = findGovernorateMatch(state);
    if (!matchedGov && city) {
      matchedGov = findGovernorateMatch(city);
    }
    if (!matchedGov && locality) {
      matchedGov = findGovernorateMatch(locality);
    }

    // Default to Cairo if lat/lng is within Egypt bounding box
    if (!matchedGov) {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);
      if (latitude >= 21 && latitude <= 32 && longitude >= 24 && longitude <= 37) {
        matchedGov = EGYPT_GOVERNORATES.find((g) => g.name === 'القاهرة');
      }
    }

    const governorateName = matchedGov ? matchedGov.name : '';

    // Match city inside the governorate
    let matchedCity = '';
    if (matchedGov) {
      const searchTexts = [city, locality, state].map((s) => s.toLowerCase()).filter(Boolean);

      for (const c of matchedGov.cities) {
        if (searchTexts.some((st) => st.includes(c.toLowerCase()) || c.toLowerCase().includes(st))) {
          matchedCity = c;
          break;
        }
      }

      // If no exact match, check common English mappings
      if (!matchedCity) {
        const cityLower = (city || locality).toLowerCase();
        if (cityLower.includes('nasr')) matchedCity = 'مدينة نصر';
        else if (cityLower.includes('maadi')) matchedCity = 'المعادي';
        else if (cityLower.includes('heliopolis') || cityLower.includes('masr')) matchedCity = 'مصر الجديدة';
        else if (cityLower.includes('zamalek')) matchedCity = 'الزمالك';
        else if (cityLower.includes('october')) matchedCity = '6 أكتوبر';
        else if (cityLower.includes('zayed')) matchedCity = 'الشيخ زايد';
        else if (cityLower.includes('dokki')) matchedCity = 'الدقي';
        else if (cityLower.includes('mohandessin')) matchedCity = 'المهندسين';
        else if (cityLower.includes('haram')) matchedCity = 'الهرم';
        else if (cityLower.includes('tagamoa') || cityLower.includes('new cairo')) matchedCity = 'القاهرة الجديدة';
        else if (matchedGov.cities.length > 0) matchedCity = matchedGov.cities[0];
      }
    }

    return NextResponse.json({
      success: true,
      governorate: governorateName,
      city: matchedCity,
      raw: { state, city, locality },
    });
  } catch (error) {
    console.error('[GET /api/location/geocode]', error);
    return NextResponse.json(
      { success: false, error: 'Geocoding failed' },
      { status: 500 },
    );
  }
}
