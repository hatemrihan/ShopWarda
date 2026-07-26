import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import { Product } from '@/lib/db/models/product.model';

/**
 * GET /api/search?q=keyword
 *
 * Public product search endpoint.
 * Returns up to 10 matching active products.
 */
export async function GET(req: NextRequest) {
  try {
    const query = req.nextUrl.searchParams.get('q')?.trim() || '';

    if (query.length < 1) {
      return NextResponse.json({ success: true, products: [] });
    }

    await connectDB();

    // Safe regex pattern matching
    const safePattern = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(safePattern, 'i');

    const products = await Product.find({
      status: 'active',
      $or: [
        { name: regex },
        { slug: regex },
        { tags: regex },
        { shortDescription: regex },
      ],
    })
      .limit(10)
      .lean();

    const formattedProducts = products.map((p) => {
      const activeVariant = p.variants?.find((v) => v.status === 'active') || p.variants?.[0];
      const mainImage = p.media?.find((m) => m.type === 'image')?.publicUrl || '';
      const price = (p.priceRange?.minMinor ?? activeVariant?.priceMinor ?? 0) / 100;
      const originalPrice = activeVariant?.compareAtPriceMinor
        ? activeVariant.compareAtPriceMinor / 100
        : null;

      return {
        id: p._id.toString(),
        slug: p.slug,
        name: p.name,
        price,
        original_price: originalPrice,
        main_image: mainImage,
      };
    });

    return NextResponse.json({ success: true, products: formattedProducts });
  } catch (error) {
    console.error('[GET /api/search]', error);
    return NextResponse.json(
      { success: false, error: 'Search failed' },
      { status: 500 },
    );
  }
}
