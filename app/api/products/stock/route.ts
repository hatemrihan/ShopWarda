import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db/mongoose';
import { Product } from '@/lib/db/models/product.model';
import type { IVariant } from '@/lib/db/types';

/**
 * GET /api/products/stock?id=xxx          — one product
 * GET /api/products/stock?ids=a,b,c       — many products in one request
 *
 * Public endpoint — current price and availability per variant. The cart uses
 * it to drop archived items and correct stale prices.
 */

const MAX_IDS = 50;

interface StockVariantDTO {
  variantId: string;
  sku: string;
  /** null when the variant does not track inventory (always available). */
  stock: number | null;
  priceMinor: number;
  available: boolean;
}

interface StockProductDTO {
  success: true;
  productId: string;
  productName: string;
  productSlug?: string;
  productStatus: string;
  variants: StockVariantDTO[];
}

function bouquetStock(productId: string): StockProductDTO {
  return {
    success: true,
    productId,
    productName: 'Custom Bouquet',
    productStatus: 'active',
    variants: [
      { variantId: productId, sku: 'BOUQUET', stock: null, priceMinor: 0, available: true },
    ],
  };
}

function toStockDTO(product: {
  _id: { toString(): string };
  name: string;
  slug?: string;
  status: string;
  variants: IVariant[];
}): StockProductDTO {
  return {
    success: true,
    productId: product._id.toString(),
    productName: product.name,
    productSlug: product.slug,
    productStatus: product.status,
    variants: product.variants.map((v) => {
      // A variant that does not track inventory is never "sold out". This
      // used to test `stock > 0` alone, so made-to-order items with stock 0
      // were removed from customers' bags as unavailable.
      const tracked = v.trackInventory !== false;
      return {
        variantId: v._id.toString(),
        sku: v.sku,
        stock: tracked ? v.stock : null,
        // Included so the cart can correct a stale price it has cached locally.
        priceMinor: v.priceMinor,
        available: v.status === 'active' && (!tracked || v.stock > 0),
      };
    }),
  };
}

const PROJECTION =
  'name slug status variants._id variants.sku variants.stock variants.status variants.priceMinor variants.trackInventory';

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const idsParam = params.get('ids');

  // ── Batch ────────────────────────────────────────────────────
  if (idsParam !== null) {
    const ids = [...new Set(idsParam.split(',').map((s) => s.trim()).filter(Boolean))].slice(0, MAX_IDS);

    const products: Record<string, StockProductDTO | { success: false }> = {};
    const objectIds: string[] = [];

    for (const id of ids) {
      if (id.startsWith('bouquet:')) products[id] = bouquetStock(id);
      else if (mongoose.Types.ObjectId.isValid(id)) objectIds.push(id);
      else products[id] = { success: false };
    }

    try {
      if (objectIds.length > 0) {
        await connectDB();
        const docs = await Product.find({ _id: { $in: objectIds } }).select(PROJECTION).lean();
        for (const doc of docs) products[doc._id.toString()] = toStockDTO(doc);
        // Anything not returned no longer exists.
        for (const id of objectIds) products[id] ??= { success: false };
      }

      return NextResponse.json(
        { success: true, products },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    } catch (error) {
      console.error('[GET /api/products/stock]', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch stock' }, { status: 500 });
    }
  }

  // ── Single ───────────────────────────────────────────────────
  const productId = params.get('id');

  if (!productId) {
    return NextResponse.json({ success: false, error: 'Product ID required' }, { status: 400 });
  }

  if (productId.startsWith('bouquet:')) {
    return NextResponse.json(bouquetStock(productId));
  }

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return NextResponse.json({ success: false, error: 'Invalid product ID' }, { status: 400 });
  }

  try {
    await connectDB();
    const product = await Product.findById(productId).select(PROJECTION).lean();

    if (!product) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(toStockDTO(product), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[GET /api/products/stock]', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch stock' }, { status: 500 });
  }
}
