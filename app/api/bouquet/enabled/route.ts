import { NextResponse } from 'next/server';
import { getBouquetSettings } from '@/features/bouquet/server/bouquet.service';

/**
 * GET /api/bouquet/enabled
 * Public: whether the bouquet builder should be advertised on the storefront.
 *
 * Only the flag — the storefront nav needs to know whether to show the link,
 * and nothing else here is public.
 */
export async function GET() {
  try {
    const settings = await getBouquetSettings();
    return NextResponse.json({ enabled: settings.enabled });
  } catch (error) {
    // Failing closed keeps a broken link from appearing.
    console.error('[GET /api/bouquet/enabled]', error);
    return NextResponse.json({ enabled: false });
  }
}
