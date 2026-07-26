/**
 * Cart Service — guest carts with cookie-based token.
 * Token is SHA-256 hashed before storage. Cart references live variant prices.
 */

import { cookies } from 'next/headers';
import { createHash, randomBytes } from 'crypto';
import connectDB from '@/lib/db/mongoose';
import { Cart, type ICart } from '@/lib/db/models/cart.model';
import { Product } from '@/lib/db/models/product.model';
import type { CartDTO, CartItemDTO } from '../types';
import type { AddToCartInput, UpdateCartItemInput } from '../schemas';
import { addToCartSchema, updateCartItemSchema } from '../schemas';
import { ValidationError, NotFoundError } from '@/lib/errors';
import { commerce } from '@/config/commerce';

const CART_COOKIE = 'wrd_cart';
const CART_TTL_MS = commerce.cart.expirationDays * 24 * 60 * 60 * 1000;

// ─── Token Management ───────────────────────────────────────────

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

async function getOrCreateCartToken(): Promise<{ token: string; hash: string; isNew: boolean }> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(CART_COOKIE)?.value;

  if (existing) {
    return { token: existing, hash: hashToken(existing), isNew: false };
  }

  const token = randomBytes(32).toString('hex');
  cookieStore.set(CART_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: commerce.cart.expirationDays * 24 * 60 * 60,
    path: '/',
  });

  return { token, hash: hashToken(token), isNew: true };
}

// ─── Resolve Cart Items ─────────────────────────────────────────

async function resolveCartItems(cart: ICart): Promise<CartItemDTO[]> {
  const productIds = [...new Set(cart.items.map((i) => i.productId.toString()))];
  const products = await Product.find({ _id: { $in: productIds } }).lean();
  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  return cart.items.map((item) => {
    const product = productMap.get(item.productId.toString());
    const variant = product?.variants.find(
      (v: { _id?: { toString(): string } }) => v._id?.toString() === item.variantId.toString()
    );

    const livePricePiasters = variant?.priceMinor ?? item.addedPriceMinor;
    const primaryMedia = product?.media?.find((m: { sortOrder?: number }) => m.sortOrder === 0) ?? product?.media?.[0];

    return {
      productId: item.productId.toString(),
      variantId: item.variantId.toString(),
      productName: product?.name ?? 'Unknown product',
      productSlug: product?.slug ?? '',
      sku: variant?.sku ?? '',
      selectedOptions:
        variant?.optionValues?.map((ov: { optionKey: string; valueKey: string }) => ({
          label: ov.optionKey,
          value: ov.valueKey,
        })) ?? [],
      imageUrl: primaryMedia?.publicUrl,
      unitPricePiasters: livePricePiasters,
      quantity: item.quantity,
      lineTotalPiasters: livePricePiasters * item.quantity,
      inStock: variant ? variant.stock >= item.quantity && variant.status === 'active' : false,
    };
  });
}

function toCartDTO(cart: ICart, items: CartItemDTO[]): CartDTO {
  return {
    id: cart._id.toString(),
    items,
    itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
    subtotalPiasters: items.reduce((sum, i) => sum + i.lineTotalPiasters, 0),
  };
}

// ─── Service ────────────────────────────────────────────────────

export const cartService = {
  async getCart(): Promise<CartDTO> {
    await connectDB();
    const { hash, isNew } = await getOrCreateCartToken();

    if (isNew) {
      return { id: '', items: [], itemCount: 0, subtotalPiasters: 0 };
    }

    const cart = await Cart.findOne({ tokenHash: hash, status: 'active' });
    if (!cart) {
      return { id: '', items: [], itemCount: 0, subtotalPiasters: 0 };
    }

    const items = await resolveCartItems(cart);
    return toCartDTO(cart, items);
  },

  async addItem(input: AddToCartInput): Promise<CartDTO> {
    const parsed = addToCartSchema.safeParse(input);
    if (!parsed.success) throw new ValidationError('Invalid cart input', {});

    await connectDB();
    const { hash } = await getOrCreateCartToken();

    // Validate product & variant exist and have stock
    const product = await Product.findById(parsed.data.productId);
    if (!product) throw new NotFoundError('Product', parsed.data.productId);

    const variant = product.variants.find(
      (v: { _id?: { toString(): string } }) => v._id?.toString() === parsed.data.variantId
    );
    if (!variant) throw new NotFoundError('Variant', parsed.data.variantId);
    if (variant.status !== 'active') {
      throw new ValidationError('Variant is not available', {});
    }
    if (variant.stock < parsed.data.quantity) {
      throw new ValidationError(`Only ${variant.stock} items in stock`, {});
    }

    // Find or create cart
    let cart = await Cart.findOne({ tokenHash: hash, status: 'active' });
    if (!cart) {
      cart = new Cart({
        tokenHash: hash,
        expiresAt: new Date(Date.now() + CART_TTL_MS),
      });
    }

    // Check if item already exists
    const existingIndex = cart.items.findIndex(
      (i) =>
        i.productId.toString() === parsed.data.productId &&
        i.variantId.toString() === parsed.data.variantId
    );

    if (existingIndex >= 0) {
      const newQty = cart.items[existingIndex].quantity + parsed.data.quantity;
      if (newQty > commerce.cart.maxQuantityPerItem) {
        throw new ValidationError(`Maximum ${commerce.cart.maxQuantityPerItem} per item`, {});
      }
      if (newQty > variant.stock) {
        throw new ValidationError(`Only ${variant.stock} items in stock`, {});
      }
      cart.items[existingIndex].quantity = newQty;
    } else {
      cart.items.push({
        productId: product._id,
        variantId: variant._id as unknown as import('mongoose').Types.ObjectId,
        quantity: parsed.data.quantity,
        addedPriceMinor: variant.priceMinor,
        addedAt: new Date(),
      });
    }

    cart.lastActivityAt = new Date();
    cart.version += 1;
    await cart.save();

    const items = await resolveCartItems(cart);
    return toCartDTO(cart, items);
  },

  async updateItem(input: UpdateCartItemInput): Promise<CartDTO> {
    const parsed = updateCartItemSchema.safeParse(input);
    if (!parsed.success) throw new ValidationError('Invalid input', {});

    await connectDB();
    const { hash } = await getOrCreateCartToken();
    const cart = await Cart.findOne({ tokenHash: hash, status: 'active' });
    if (!cart) throw new NotFoundError('Cart', '');

    const itemIndex = cart.items.findIndex(
      (i) =>
        i.productId.toString() === parsed.data.productId &&
        i.variantId.toString() === parsed.data.variantId
    );

    if (itemIndex < 0) throw new NotFoundError('Cart item', '');

    if (parsed.data.quantity === 0) {
      // Remove
      cart.items.splice(itemIndex, 1);
    } else {
      // Validate stock
      const product = await Product.findById(parsed.data.productId);
      const variant = product?.variants.find(
        (v: { _id?: { toString(): string } }) => v._id?.toString() === parsed.data.variantId
      );
      if (variant && parsed.data.quantity > variant.stock) {
        throw new ValidationError(`Only ${variant.stock} items in stock`, {});
      }
      cart.items[itemIndex].quantity = parsed.data.quantity;
    }

    cart.lastActivityAt = new Date();
    cart.version += 1;
    await cart.save();

    const items = await resolveCartItems(cart);
    return toCartDTO(cart, items);
  },

  async clearCart(): Promise<void> {
    await connectDB();
    const { hash } = await getOrCreateCartToken();
    await Cart.findOneAndUpdate(
      { tokenHash: hash, status: 'active' },
      { items: [], version: 0 }
    );
  },

  /** Mark cart as converted after order placement */
  async convertCart(cartId: string): Promise<void> {
    await connectDB();
    await Cart.findByIdAndUpdate(cartId, { status: 'converted' });
  },
};
