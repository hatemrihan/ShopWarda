import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import { Product } from '@/lib/db/models/product.model';
import type { IVariant } from '@/lib/db/types';

/**
 * GET /api/products/stock?id=xxx
 * Public endpoint — returns stock for a product and all its variants.
 */
export async function GET(req: NextRequest) {
  const productId = req.nextUrl.searchParams.get('id');

  if (!productId) {
    return NextResponse.json(
      { success: false, error: 'Product ID required' },
      { status: 400 },
    );
  }

  try {
    await connectDB();
    const product = await Product.findById(productId)
      .select('name status variants._id variants.sku variants.stock variants.status variants.priceMinor')
      .lean();

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 },
      );
    }

    const variants = product.variants.map((v: IVariant) => ({
      variantId: v._id.toString(),
      sku: v.sku,
      stock: v.stock,
      // Included so the cart can correct a stale price it has cached locally.
      priceMinor: v.priceMinor,
      available: v.status === 'active' && v.stock > 0,
    }));

    return NextResponse.json({
      success: true,
      productId,
      productName: product.name,
      productStatus: product.status,
      variants,
    });
  } catch (error) {
    console.error('[GET /api/products/stock]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stock' },
      { status: 500 },
    );
  }
}
