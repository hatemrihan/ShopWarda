'use client';

import React, { createContext, useContext, useReducer, useEffect, useState } from 'react';
import type { BouquetConfig } from '@/features/bouquet/schemas';

export interface CartItemVariant {
  name: string;
  color?: string;
}

export interface CartItem {
  id: string;
  variantId?: string;
  name: string;
  nameArabic?: string;
  image: string;
  price: number;
  quantity: number;
  stock?: number;
  variant?: CartItemVariant;
  /** Distinguishes catalog products from composed items (e.g. custom bouquets). */
  kind?: 'catalog' | 'bouquet';
  /**
   * Raw configuration for a composed item, replayed to the server at checkout.
   * It carries no prices — the server re-prices from the database.
   */
  customization?: BouquetConfig;
  /**
   * Human-readable composition for cart/checkout display only. The config
   * above carries the ids the server actually prices from; this is never
   * trusted for anything but rendering.
   */
  compositionSummary?: { label: string; value: string }[];
  /** Set when the buyer attached a handwritten card. */
  hasCard?: boolean;
  /**
   * Stable hash of a composed item's configuration. Part of cart identity, so
   * two differently-configured bouquets occupy two lines rather than merging.
   */
  configHash?: string;
}

/** The fields that decide whether two cart lines are the same line. */
export interface CartItemIdentity {
  id: string;
  variantId?: string;
  configHash?: string;
  variant?: CartItemVariant;
}

export interface CartState {
  items: CartItem[];
  total: number;
  itemCount: number;
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: CartItem }
  | { type: 'REMOVE_ITEM'; payload: CartItemIdentity }
  | { type: 'UPDATE_QUANTITY'; payload: CartItemIdentity & { quantity: number; maxStock?: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'LOAD_CART'; payload: CartItem[] };

export const variantsMatch = (
  a: CartItemVariant | undefined,
  b: CartItemVariant | undefined
): boolean => {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a.name === b.name && a.color === b.color;
};

/**
 * Cart line identity. `variantId` and `configHash` are part of it because
 * comparing only {name, color} merged genuinely distinct configurations — two
 * variants sharing a display name became one line at the wrong price.
 */
export const itemsMatch = (a: CartItemIdentity, b: CartItemIdentity): boolean =>
  a.id === b.id &&
  (a.variantId ?? '') === (b.variantId ?? '') &&
  (a.configHash ?? '') === (b.configHash ?? '') &&
  variantsMatch(a.variant, b.variant);

const CartContext = createContext<{
  state: CartState;
  addItem: (item: Omit<CartItem, 'quantity'>, quantityToAdd?: number, maxStock?: number) => void;
  removeItem: (identity: CartItemIdentity) => void;
  updateQuantity: (identity: CartItemIdentity, quantity: number, maxStock?: number) => void;
  clearCart: () => void;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  totalPrice: number;
  totalItems: number;
  isLoaded: boolean;
} | null>(null);

// Cart reducer
const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingItemIndex = state.items.findIndex(item =>
        itemsMatch(item, action.payload)
      );

      let newItems: CartItem[];
      if (existingItemIndex >= 0) {
        const existingItem = state.items[existingItemIndex];
        const quantityToAdd = action.payload.quantity || 1;
        const newQuantity = existingItem.quantity + quantityToAdd;

        if (action.payload.stock !== undefined && newQuantity > action.payload.stock) {
          console.log(`Cannot add more items. Stock limit: ${action.payload.stock}, Current: ${existingItem.quantity}, Trying to add: ${quantityToAdd}`);
          return state;
        }

        newItems = state.items.map((item, index) =>
          index === existingItemIndex
            ? { ...item, quantity: newQuantity }
            : item
        );
      } else {
        const quantityToAdd = action.payload.quantity || 1;
        if (action.payload.stock !== undefined && quantityToAdd > action.payload.stock) {
          console.log(`Cannot add item. Stock limit: ${action.payload.stock}, Trying to add: ${quantityToAdd}`);
          return state;
        }

        newItems = [...state.items, { ...action.payload, quantity: quantityToAdd }];
      }

      const total = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const itemCount = newItems.reduce((sum, item) => sum + item.quantity, 0);

      return { items: newItems, total, itemCount };
    }

    case 'REMOVE_ITEM': {
      const newItems = state.items.filter(item => !itemsMatch(item, action.payload));
      const total = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const itemCount = newItems.reduce((sum, item) => sum + item.quantity, 0);

      return { items: newItems, total, itemCount };
    }

    case 'UPDATE_QUANTITY': {
      const newItems = state.items.map(item => {
        const isMatch = itemsMatch(item, action.payload);

        if (isMatch) {
          const newQuantity = action.payload.maxStock !== undefined
            ? Math.min(Math.max(0, action.payload.quantity), action.payload.maxStock)
            : Math.max(0, action.payload.quantity);

          return {
            ...item,
            quantity: newQuantity
          };
        }
        return item;
      }).filter(item => item.quantity > 0);

      const total = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const itemCount = newItems.reduce((sum, item) => sum + item.quantity, 0);

      return { items: newItems, total, itemCount };
    }

    case 'CLEAR_CART':
      return { items: [], total: 0, itemCount: 0 };

    case 'LOAD_CART': {
      const items = action.payload;
      const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

      return { items, total, itemCount };
    }

    default:
      return state;
  }
};

// Cart provider component
export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, {
    items: [],
    total: 0,
    itemCount: 0
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);

  /**
   * Re-check cart lines against the database: drop archived/out-of-stock
   * items and correct stale prices.
   *
   * This previously fetched `/api/products`, a route that does not exist, so
   * every response was a 404 and validation silently no-opped.
   */
  const validateCartItems = async (items: CartItem[]): Promise<CartItem[]> => {
    interface StockVariant {
      variantId: string;
      stock: number;
      priceMinor: number;
      available: boolean;
    }
    interface StockResponse {
      success: boolean;
      productStatus?: string;
      variants?: StockVariant[];
    }

    try {
      const productIds = [...new Set(items.map((item) => item.id))];
      if (productIds.length === 0) return [];

      const entries = await Promise.all(
        productIds.map(async (id): Promise<[string, StockResponse | null]> => {
          try {
            const res = await fetch(`/api/products/stock?id=${encodeURIComponent(id)}`);
            if (!res.ok) return [id, null];
            return [id, (await res.json()) as StockResponse];
          } catch {
            return [id, null];
          }
        })
      );

      const stockByProduct = new Map(entries);

      // If every lookup failed (offline, API down), leave the cart untouched
      // rather than emptying someone's bag on a transient error.
      if ([...stockByProduct.values()].every((v) => v === null)) return items;

      return items.reduce<CartItem[]>((kept, cartItem) => {
        // Composed items (bouquets) are priced server-side at checkout and
        // have no catalog product to validate against.
        if (cartItem.kind === 'bouquet') {
          kept.push(cartItem);
          return kept;
        }

        const product = stockByProduct.get(cartItem.id);
        if (product === null) {
          kept.push(cartItem); // lookup failed — keep, don't guess
          return kept;
        }
        if (!product?.success) return kept; // 404 / archived — drop
        if (product.productStatus && product.productStatus !== 'active') return kept;

        const variants = product.variants ?? [];
        const variant = cartItem.variantId
          ? variants.find((v) => v.variantId === cartItem.variantId)
          : undefined;

        if (variant) {
          if (!variant.available) return kept;
          const currentPrice = variant.priceMinor / 100;
          kept.push(currentPrice > 0 && currentPrice !== cartItem.price
            ? { ...cartItem, price: currentPrice, stock: variant.stock }
            : { ...cartItem, stock: variant.stock });
          return kept;
        }

        // No resolvable variant — keep only if the product has any stock left.
        if (variants.length > 0 && !variants.some((v) => v.available)) return kept;
        kept.push(cartItem);
        return kept;
      }, []);
    } catch (error) {
      console.error('Error validating cart items:', error);
      return items;
    }
  };

  // Load cart from localStorage on mount and validate every 5 minutes
  useEffect(() => {
    const loadAndValidateCart = async () => {
      try {
        const savedCart = localStorage.getItem('cart');
        if (!savedCart) {
          setIsLoaded(true);
          return;
        }

        const items = JSON.parse(savedCart);

        if (!items || items.length === 0) {
          dispatch({ type: 'LOAD_CART', payload: [] });
          setIsLoaded(true);
          return;
        }

        const lastValidation = localStorage.getItem('cart_last_validation');
        const now = Date.now();
        const VALIDATION_INTERVAL = 300000; // 5 minutes

        if (lastValidation && (now - parseInt(lastValidation)) < VALIDATION_INTERVAL) {
          dispatch({ type: 'LOAD_CART', payload: items });
          setIsLoaded(true);
          return;
        }

        const validItems = await validateCartItems(items);
        dispatch({ type: 'LOAD_CART', payload: validItems });
        setIsLoaded(true);

        if (validItems.length !== items.length) {
          localStorage.setItem('cart', JSON.stringify(validItems));
        }

        localStorage.setItem('cart_last_validation', now.toString());
      } catch (error) {
        console.error('Error loading cart from localStorage:', error);
      }
    };

    loadAndValidateCart();
  }, []);

  // Save cart to localStorage whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem('cart', JSON.stringify(state.items));
    } catch (error) {
      console.error('Error saving cart to localStorage:', error);
    }
  }, [state.items]);

  const addItem = (item: Omit<CartItem, 'quantity'>, quantityToAdd: number = 1, maxStock?: number) => {
    dispatch({ type: 'ADD_ITEM', payload: { ...item, quantity: quantityToAdd, stock: item.stock || maxStock } });
    openCart();
  };

  const removeItem = (identity: CartItemIdentity) => {
    dispatch({ type: 'REMOVE_ITEM', payload: identity });
  };

  const updateQuantity = (identity: CartItemIdentity, quantity: number, maxStock?: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { ...identity, quantity, maxStock } });
  };

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
  };

  return (
    <CartContext.Provider value={{
      state,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      isCartOpen,
      openCart,
      closeCart,
      totalPrice: state.total,
      totalItems: state.itemCount,
      isLoaded,
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
