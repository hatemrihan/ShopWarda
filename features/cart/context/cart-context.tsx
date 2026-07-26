'use client';

import React, { createContext, useContext, useReducer, useEffect, useState } from 'react';

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
}

export interface CartState {
  items: CartItem[];
  total: number;
  itemCount: number;
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: CartItem }
  | { type: 'REMOVE_ITEM'; payload: { id: string; variant?: CartItemVariant } }
  | { type: 'UPDATE_QUANTITY'; payload: { id: string; variant?: CartItemVariant; quantity: number; maxStock?: number } }
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

const CartContext = createContext<{
  state: CartState;
  addItem: (item: Omit<CartItem, 'quantity'>, quantityToAdd?: number, maxStock?: number) => void;
  removeItem: (id: string, variant?: CartItemVariant) => void;
  updateQuantity: (id: string, variant: CartItemVariant | undefined, quantity: number, maxStock?: number) => void;
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
        item.id === action.payload.id &&
        variantsMatch(item.variant, action.payload.variant)
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
      const newItems = state.items.filter(item =>
        !(item.id === action.payload.id &&
          variantsMatch(item.variant, action.payload.variant))
      );
      const total = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const itemCount = newItems.reduce((sum, item) => sum + item.quantity, 0);

      return { items: newItems, total, itemCount };
    }

    case 'UPDATE_QUANTITY': {
      const newItems = state.items.map(item => {
        const isMatch = item.id === action.payload.id &&
                       variantsMatch(item.variant, action.payload.variant);

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

  // Validate cart items against database
  const validateCartItems = async (items: CartItem[]): Promise<CartItem[]> => {
    try {
      const productIds = [...new Set(items.map(item => item.id))];
      if (productIds.length === 0) return [];

      const response = await fetch('/api/products');
      if (!response.ok) {
        return items;
      }

      const allProducts = await response.json();
      const productList = allProducts.products || allProducts.items || [];

      interface CartProductVariant {
        name?: string;
        pricePiasters?: number;
        price?: number;
        stock?: number;
      }

      interface CartProduct {
        _id?: string;
        id?: string;
        isActive?: boolean;
        status?: string;
        pricePiasters?: number;
        price?: number;
        stock?: number;
        stockQuantity?: number;
        variants?: CartProductVariant[];
      }

      const validItems = items.filter(cartItem => {
        const product = productList.find((p: CartProduct) => (p._id || p.id) === cartItem.id);
        if (!product) return false;
        if (product.isActive === false || product.status === 'archived') return false;

        if (cartItem.variant) {
          const variant = product.variants?.find((v: CartProductVariant) => v.name === cartItem.variant?.name);
          if (variant && variant.stock === 0) return false;

          const currentPrice = (variant?.pricePiasters ? variant.pricePiasters / 100 : undefined) ||
                               (variant?.price ? variant.price : undefined) ||
                               (product.pricePiasters ? product.pricePiasters / 100 : product.price) || 0;

          if (currentPrice > 0 && cartItem.price !== currentPrice) {
            cartItem.price = currentPrice;
          }
        } else {
          if (product.stock === 0 || product.stockQuantity === 0) return false;

          const currentPrice = (product.pricePiasters ? product.pricePiasters / 100 : product.price) || 0;
          if (currentPrice > 0 && cartItem.price !== currentPrice) {
            cartItem.price = currentPrice;
          }
        }

        return true;
      });

      return validItems;
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

  const removeItem = (id: string, variant?: CartItemVariant) => {
    dispatch({ type: 'REMOVE_ITEM', payload: { id, variant } });
  };

  const updateQuantity = (id: string, variant: CartItemVariant | undefined, quantity: number, maxStock?: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { id, variant, quantity, maxStock } });
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
