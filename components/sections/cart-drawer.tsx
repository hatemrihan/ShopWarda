'use client';

import React from 'react';
import { useCart } from '@/features/cart/context/cart-context';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Minus } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function CartDrawer() {
  const { state: cartState, updateQuantity, removeItem, isCartOpen, closeCart } = useCart();
  const router = useRouter();

  const convertPrice = (price: number) => {
    return `${price.toLocaleString('en-US', { minimumFractionDigits: 2 })} EGP`;
  };

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const handleUpdateQuantity = (itemId: string, variant: any, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(itemId, variant);
      return;
    }

    const item = cartState.items.find(item =>
      item.id === itemId &&
      JSON.stringify(item.variant) === JSON.stringify(variant)
    );

    if (item) {
      const maxQuantity = item.stock !== undefined ? item.stock : 999;
      const validQuantity = Math.min(newQuantity, maxQuantity);
      updateQuantity(item.id, item.variant, validQuantity, item.stock);
    }
  };

  const handleCheckout = () => {
    closeCart();
    router.push('/checkout');
  };

  const handleContinueShopping = () => {
    closeCart();
    router.push('/shop');
  };

  const handleViewProduct = (productId: string) => {
    closeCart();
    router.push(`/product/${productId}`);
  };

  const subtotal = cartState.items.reduce((sum, item) => {
    return sum + (item.price * item.quantity);
  }, 0);

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 z-[10000]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCart}
          />

          {/* Desktop Sidebar */}
          <motion.div
            className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-xl z-[10001] hidden lg:flex lg:flex-col"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-medium text-black">Shopping Bag ({cartState.itemCount})</h2>
              <button
                onClick={closeCart}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-black" />
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-6">
              {cartState.items.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 mb-4">Your bag is empty</p>
                  <button
                    onClick={handleContinueShopping}
                    className="text-black underline hover:no-underline"
                  >
                    Continue Shopping
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {cartState.items.map((item) => (
                    <div key={`${item.id}-${JSON.stringify(item.variant)}`} className="flex gap-4">
                      {/* Product Image */}
                      <div
                        className="w-20 h-20 bg-gray-100 overflow-hidden cursor-pointer flex-shrink-0"
                        onClick={() => handleViewProduct(item.id)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-black mb-1 line-clamp-2">
                          {item.name}
                        </h3>

                        {item.variant && (
                          <p className="text-xs text-gray-500 mb-2">
                            {item.variant.name} {item.variant.color ? `| ${item.variant.color}` : ''}
                          </p>
                        )}

                        <div className="flex items-center justify-between">
                          {/* Quantity Controls */}
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleUpdateQuantity(item.id, item.variant, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                              className={`w-6 h-6 border flex items-center justify-center text-xs ${
                                item.quantity <= 1
                                  ? 'border-gray-300 text-gray-400 cursor-not-allowed'
                                  : 'border-black text-black hover:bg-black hover:text-white'
                              }`}
                            >
                              <Minus className="w-3 h-3" />
                            </button>

                            <span className="text-sm font-medium w-6 text-center">
                              {item.quantity}
                            </span>

                            <button
                              onClick={() => handleUpdateQuantity(item.id, item.variant, item.quantity + 1)}
                              disabled={item.stock !== undefined && item.quantity >= item.stock}
                              className={`w-6 h-6 border flex items-center justify-center text-xs ${
                                item.stock !== undefined && item.quantity >= item.stock
                                  ? 'border-gray-300 text-gray-400 cursor-not-allowed'
                                  : 'border-black text-black hover:bg-black hover:text-white'
                              }`}
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Price */}
                          <div className="text-right">
                            <p className="text-sm font-medium text-black">
                              {convertPrice(item.price * item.quantity)}
                            </p>
                          </div>
                        </div>

                        {/* Remove Button */}
                        <button
                          onClick={() => removeItem(item.id, item.variant)}
                          className="text-xs text-gray-400 hover:text-red-500 mt-2"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {cartState.items.length > 0 && (
              <div className="border-t border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-base font-medium text-black">Subtotal</span>
                  <span className="text-base font-medium text-black">
                    {convertPrice(subtotal)}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-4">
                  Shipping and taxes calculated at checkout
                </p>
                <button
                  onClick={handleCheckout}
                  className="w-full bg-black text-white py-3 text-sm font-medium hover:bg-gray-800 transition-colors"
                >
                  Checkout
                </button>
              </div>
            )}
          </motion.div>

          {/* Mobile Sidebar */}
          <motion.div
            className="fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-xl z-[10001] flex flex-col lg:hidden"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-black">Shopping Bag ({cartState.itemCount})</h2>
              <button
                onClick={closeCart}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-black" />
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-4">
              {cartState.items.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-gray-500 mb-4">Your bag is empty</p>
                  <button
                    onClick={handleContinueShopping}
                    className="text-black underline hover:no-underline"
                  >
                    Continue Shopping
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {cartState.items.map((item) => (
                    <div key={`${item.id}-${JSON.stringify(item.variant)}`} className="flex gap-4">
                      {/* Product Image */}
                      <div
                        className="w-24 h-24 bg-gray-100 overflow-hidden cursor-pointer flex-shrink-0"
                        onClick={() => handleViewProduct(item.id)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-medium text-black mb-2 line-clamp-2">
                          {item.name}
                        </h3>

                        {item.variant && (
                          <p className="text-sm text-gray-500 mb-3">
                            {item.variant.name} {item.variant.color ? `| ${item.variant.color}` : ''}
                          </p>
                        )}

                        <div className="flex items-center justify-between mb-3">
                          {/* Quantity Controls */}
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => handleUpdateQuantity(item.id, item.variant, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                              className={`w-8 h-8 border flex items-center justify-center ${
                                item.quantity <= 1
                                  ? 'border-gray-300 text-gray-400 cursor-not-allowed'
                                  : 'border-black text-black hover:bg-black hover:text-white'
                              }`}
                            >
                              <Minus className="w-4 h-4" />
                            </button>

                            <span className="text-base font-medium w-8 text-center">
                              {item.quantity}
                            </span>

                            <button
                              onClick={() => handleUpdateQuantity(item.id, item.variant, item.quantity + 1)}
                              disabled={item.stock !== undefined && item.quantity >= item.stock}
                              className={`w-8 h-8 border flex items-center justify-center ${
                                item.stock !== undefined && item.quantity >= item.stock
                                  ? 'border-gray-300 text-gray-400 cursor-not-allowed'
                                  : 'border-black text-black hover:bg-black hover:text-white'
                              }`}
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Price */}
                          <div className="text-right">
                            <p className="text-base font-medium text-black">
                              {convertPrice(item.price * item.quantity)}
                            </p>
                          </div>
                        </div>

                        {/* Remove Button */}
                        <button
                          onClick={() => removeItem(item.id, item.variant)}
                          className="text-sm text-gray-400 hover:text-red-500"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {cartState.items.length > 0 && (
              <div className="border-t border-gray-200 p-4 pb-8">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg font-medium text-black">Subtotal</span>
                  <span className="text-lg font-medium text-black">
                    {convertPrice(subtotal)}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mb-6">
                  Shipping and taxes calculated at checkout
                </p>
                <button
                  onClick={handleCheckout}
                  className="w-full bg-black text-white py-4 text-base font-medium hover:bg-gray-800 transition-colors"
                >
                  Checkout
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
