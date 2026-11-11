'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import type { BouquetConfig } from '@/features/bouquet/schemas';

export interface CartItemVariant {
  name: string;
  color?: string;
}

export interface CartItem {
  id: string;
  variantId?: string;
  /** Product slug, so the bag can link back to the product page. */
  slug?: string;
  name: string;
  nameArabic?: string;
  image: string;
  price: number;
  quantity: number;
  /** Units available. `undefined` means the item is not stock-limited. */
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

/** Why an add-to-bag did not go through. */
export type AddItemResult = { ok: true } | { ok: false; reason: 'stock'; available: number };

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

interface CartContextValue {
  state: CartState;
  /** Returns whether the item was added (it is refused past the stock limit). */
  addItem: (item: Omit<CartItem, 'quantity'>, quantityToAdd?: number, maxStock?: number) => AddItemResult;
  removeItem: (identity: CartItemIdentity) => void;
  updateQuantity: (identity: CartItemIdentity, quantity: number, maxStock?: number) => void;
  clearCart: () => void;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  totalPrice: number;
  totalItems: number;
  isLoaded: boolean;
}

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = 'cart';
const VALIDATION_KEY = 'cart_last_validation';
const VALIDATION_INTERVAL_MS = 5 * 60 * 1000;

const EMPTY_STATE: CartState = { items: [], total: 0, itemCount: 0 };

/** Prices are EGP floats; keep the running total free of binary-float dust. */
function summarize(items: CartItem[]): CartState {
  const total = Math.round(items.reduce((sum, i) => sum + i.price * i.quantity, 0) * 100) / 100;
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  return { items, total, itemCount };
}

/** Keep only entries that look like cart lines; a corrupt entry must not crash the store. */
function sanitizeStoredCart(raw: unknown): CartItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (i): i is CartItem =>
      !!i &&
      typeof i === 'object' &&
      typeof (i as CartItem).id === 'string' &&
      typeof (i as CartItem).name === 'string' &&
      Number.isFinite((i as CartItem).price) &&
      Number.isInteger((i as CartItem).quantity) &&
      (i as CartItem).quantity > 0
  );
}

// ─── Reducer ────────────────────────────────────────────────────

const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'ADD_ITEM': {
      const quantityToAdd = Math.max(1, action.payload.quantity || 1);
      const limit = action.payload.stock;
      const existingIndex = state.items.findIndex((item) => itemsMatch(item, action.payload));

      if (existingIndex >= 0) {
        const existing = state.items[existingIndex];
        const newQuantity = existing.quantity + quantityToAdd;
        if (limit !== undefined && newQuantity > limit) return state;

        return summarize(
          state.items.map((item, index) =>
            index === existingIndex
              ? // Refresh the stored price/stock/slug with what was just shown.
                { ...item, ...action.payload, quantity: newQuantity }
              : item
          )
        );
      }

      if (limit !== undefined && quantityToAdd > limit) return state;
      return summarize([...state.items, { ...action.payload, quantity: quantityToAdd }]);
    }

    case 'REMOVE_ITEM':
      return summarize(state.items.filter((item) => !itemsMatch(item, action.payload)));

    case 'UPDATE_QUANTITY': {
      const { quantity, maxStock } = action.payload;
      const next = state.items
        .map((item) => {
          if (!itemsMatch(item, action.payload)) return item;
          const wanted = Math.max(0, Math.floor(quantity));
          return { ...item, quantity: maxStock !== undefined ? Math.min(wanted, maxStock) : wanted };
        })
        .filter((item) => item.quantity > 0);
      return summarize(next);
    }

    case 'CLEAR_CART':
      return EMPTY_STATE;

    case 'LOAD_CART':
      return summarize(action.payload);

    default:
      return state;
  }
};

// ─── Server validation ──────────────────────────────────────────

interface StockVariant {
  variantId: string;
  stock: number | null;
  priceMinor: number;
  available: boolean;
}
type StockProduct =
  | { success: true; productStatus?: string; productSlug?: string; variants?: StockVariant[] }
  | { success: false };

/**
 * Re-check cart lines against the database: drop archived/sold-out items,
 * correct stale prices and cap quantities at what is in stock.
 *
 * One batched request for the whole bag (it used to be one request per
 * product). On any failure the cart is returned untouched — never empty
 * someone's bag over a transient error.
 */
async function validateCartItems(items: CartItem[]): Promise<CartItem[]> {
  const productIds = [
    ...new Set(items.filter((i) => i.kind !== 'bouquet').map((i) => i.id)),
  ];
  if (productIds.length === 0) return items;

  let products: Record<string, StockProduct>;
  try {
    const res = await fetch(`/api/products/stock?ids=${productIds.map(encodeURIComponent).join(',')}`);
    if (!res.ok) return items;
    const data = (await res.json()) as { success: boolean; products?: Record<string, StockProduct> };
    if (!data.success || !data.products) return items;
    products = data.products;
  } catch {
    return items;
  }

  return items.reduce<CartItem[]>((kept, cartItem) => {
    // Composed items (bouquets) are priced server-side at checkout and have no
    // catalog product to validate against.
    if (cartItem.kind === 'bouquet') {
      kept.push(cartItem);
      return kept;
    }

    const product = products[cartItem.id];
    if (!product) {
      kept.push(cartItem); // not in the response — keep, don't guess
      return kept;
    }
    if (!product.success) return kept; // deleted
    if (product.productStatus && product.productStatus !== 'active') return kept; // archived / draft

    const variants = product.variants ?? [];
    const variant =
      (cartItem.variantId && variants.find((v) => v.variantId === cartItem.variantId)) ||
      // Carts saved before variant ids were stored: a single-variant product
      // is unambiguous.
      (variants.length === 1 ? variants[0] : undefined);

    if (!variant) {
      if (variants.length > 0 && !variants.some((v) => v.available)) return kept;
      kept.push({ ...cartItem, slug: cartItem.slug ?? product.productSlug });
      return kept;
    }

    if (!variant.available) return kept;

    const stock = variant.stock ?? undefined;
    const price = variant.priceMinor > 0 ? variant.priceMinor / 100 : cartItem.price;
    kept.push({
      ...cartItem,
      variantId: cartItem.variantId ?? variant.variantId,
      slug: cartItem.slug ?? product.productSlug,
      price,
      stock,
      quantity: stock !== undefined ? Math.min(cartItem.quantity, stock) : cartItem.quantity,
    });
    return kept;
  }, []);
}

// ─── Provider ───────────────────────────────────────────────────

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, EMPTY_STATE);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Mirror of the latest state for callbacks that must stay referentially
  // stable (addItem needs current quantities to answer synchronously).
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);

  // ── Load from localStorage once, then validate in the background ──
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      let stored: CartItem[] = [];
      try {
        stored = sanitizeStoredCart(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'));
      } catch {
        stored = []; // unreadable storage — start with an empty bag
      }

      // Show the bag immediately; validation must not delay first paint.
      // `isLoaded` is set on every path: a parse error used to leave it false
      // forever, stranding /cart and /checkout on their loading state.
      dispatch({ type: 'LOAD_CART', payload: stored });
      setIsLoaded(true);

      if (stored.length === 0) return;

      let lastValidation = 0;
      try {
        lastValidation = Number(localStorage.getItem(VALIDATION_KEY)) || 0;
      } catch {
        /* storage unavailable */
      }
      if (Date.now() - lastValidation < VALIDATION_INTERVAL_MS) return;

      const validated = await validateCartItems(stored);
      if (cancelled) return;

      // Only apply if the shopper has not changed the bag in the meantime.
      if (stateRef.current.items === stored || sameLines(stateRef.current.items, stored)) {
        dispatch({ type: 'LOAD_CART', payload: validated });
      }
      try {
        localStorage.setItem(VALIDATION_KEY, String(Date.now()));
      } catch {
        /* storage unavailable */
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Persist — only after the stored cart has been read ──
  // This effect used to run on mount as well, writing the still-empty initial
  // state over the saved bag before it had been loaded. Closing the tab during
  // validation lost the cart, and in development (where React runs effects
  // twice) the bag was wiped on every single page load.
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
    } catch {
      /* quota exceeded or storage disabled — the in-memory cart still works */
    }
  }, [state.items, isLoaded]);

  // ── Keep several open tabs in step ──
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      try {
        const incoming = sanitizeStoredCart(JSON.parse(event.newValue ?? '[]'));
        if (JSON.stringify(incoming) !== JSON.stringify(stateRef.current.items)) {
          dispatch({ type: 'LOAD_CART', payload: incoming });
        }
      } catch {
        /* ignore malformed cross-tab payloads */
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const addItem = useCallback<CartContextValue['addItem']>(
    (item, quantityToAdd = 1, maxStock) => {
      const stock = item.stock ?? maxStock;
      const payload: CartItem = { ...item, stock, quantity: Math.max(1, quantityToAdd) };

      // Answer synchronously so callers can tell the shopper the truth. The
      // reducer silently ignored an over-limit add while the page still
      // toasted "Added to shopping bag".
      if (stock !== undefined) {
        const inBag =
          stateRef.current.items.find((existing) => itemsMatch(existing, payload))?.quantity ?? 0;
        if (inBag + payload.quantity > stock) {
          return { ok: false, reason: 'stock', available: Math.max(0, stock - inBag) };
        }
      }

      dispatch({ type: 'ADD_ITEM', payload });
      setIsCartOpen(true);
      return { ok: true };
    },
    []
  );

  const removeItem = useCallback((identity: CartItemIdentity) => {
    dispatch({ type: 'REMOVE_ITEM', payload: identity });
  }, []);

  const updateQuantity = useCallback(
    (identity: CartItemIdentity, quantity: number, maxStock?: number) => {
      dispatch({ type: 'UPDATE_QUANTITY', payload: { ...identity, quantity, maxStock } });
    },
    []
  );

  const clearCart = useCallback(() => {
    dispatch({ type: 'CLEAR_CART' });
  }, []);

  // Memoized so consumers re-render when the cart changes — not every time
  // this provider happens to render.
  const value = useMemo<CartContextValue>(
    () => ({
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
    }),
    [state, addItem, removeItem, updateQuantity, clearCart, isCartOpen, openCart, closeCart, isLoaded]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

/** Same lines in the same quantities — i.e. the shopper has not edited the bag. */
function sameLines(a: CartItem[], b: CartItem[]): boolean {
  return (
    a.length === b.length &&
    a.every((item, i) => itemsMatch(item, b[i]) && item.quantity === b[i].quantity)
  );
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
