'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { CartItem } from '@/features/cart/context/cart-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';

interface OrderSummaryProps {
  items: CartItem[];
  subtotal: number; // EGP (pounds)
  shippingMinor: number; // piasters
  codFeeMinor: number; // piasters
  discount: number; // EGP (pounds)
  onApplyPromo: (code: string) => Promise<{ success: boolean; error?: string }>;
  promoApplied?: string;
  onRemovePromo: () => void;
  isSubmitting: boolean;
  onSubmit: () => void;
  paymentMethod: string;
}

export function OrderSummary({
  items,
  subtotal,
  shippingMinor,
  codFeeMinor,
  discount,
  onApplyPromo,
  promoApplied,
  onRemovePromo,
  isSubmitting,
  onSubmit,
  paymentMethod,
}: OrderSummaryProps) {
  const [promoCode, setPromoCode] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState('');

  const shippingEGP = shippingMinor / 100;
  const codFeeEGP = codFeeMinor / 100;
  const total = subtotal - discount + shippingEGP + codFeeEGP;

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    setPromoError('');

    const result = await onApplyPromo(promoCode.trim());
    if (!result.success) {
      setPromoError(result.error || 'Invalid promo code');
    } else {
      setPromoCode('');
    }
    setPromoLoading(false);
  };

  return (
    <div className="bg-white/80 rounded-2xl p-6 space-y-6 lg:sticky lg:top-28 border border-neutral-200/60 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-300/80 pb-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-800">
          YOUR ORDER
        </h2>
        <Badge variant="secondary" className="text-[10px] font-bold px-2 py-0.5 bg-neutral-200 text-neutral-800">
          {items.reduce((acc, i) => acc + i.quantity, 0)} {items.reduce((acc, i) => acc + i.quantity, 0) === 1 ? 'item' : 'items'}
        </Badge>
      </div>

      {/* Items List */}
      <div className="space-y-4 max-h-[340px] overflow-y-auto pr-1">
        {items.map((item, idx) => (
          <div
            key={`${item.id}-${idx}`}
            className="flex items-center gap-4 border-b border-neutral-200/80 pb-4 last:border-0"
          >
            {/* Thumbnail with Badge Avatar overlay */}
            <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-white border border-neutral-200 flex-shrink-0 shadow-xs">
              <Image
                src={item.image}
                alt={item.name}
                fill
                className="object-cover"
                sizes="64px"
              />
              <Badge className="absolute -top-1.5 -right-1.5 h-5 min-w-5 rounded-full px-1 flex items-center justify-center text-[10px] font-bold bg-neutral-900 text-white border-2 border-white shadow-xs">
                {item.quantity}
              </Badge>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-neutral-900 truncate uppercase tracking-wide">
                {item.name}
              </p>
              {item.variant && (
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  {item.variant.name} {item.variant.color && `· ${item.variant.color}`}
                </p>
              )}

              {/* Custom bouquet composition */}
              {item.compositionSummary && item.compositionSummary.length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {item.compositionSummary.map((line, i) => (
                    <p key={i} className="text-[11px] text-neutral-500">
                      {line.label} <span className="text-neutral-400">{line.value}</span>
                    </p>
                  ))}
                  {item.hasCard && (
                    <p className="text-[11px] text-neutral-500">✉ Card included</p>
                  )}
                </div>
              )}
              <div className="mt-1 flex items-center gap-1.5">
                <Badge variant="outline" className="text-[9px] font-mono font-bold tracking-wider px-1.5 py-0 border-neutral-300 text-neutral-600">
                  QTY: {item.quantity}
                </Badge>
              </div>
            </div>
            <p className="text-xs font-bold text-neutral-900 whitespace-nowrap font-mono">
              EGP {(item.price * item.quantity).toFixed(2)}
            </p>
          </div>
        ))}
      </div>

      <Separator className="bg-neutral-300/80" />

      {/* Promo Code Input */}
      {!promoApplied ? (
        <div className="space-y-2 pt-1">
          <div className="flex gap-2">
            <Input
              type="text"
              value={promoCode}
              onChange={(e) => {
                setPromoCode(e.target.value.toUpperCase());
                setPromoError('');
              }}
              placeholder="DISCOUNT CODE / PROMO"
              className="flex-1 text-xs border-b border-t-0 border-x-0 rounded-none bg-transparent outline-none focus-visible:ring-0 focus-visible:border-neutral-900 uppercase tracking-wider placeholder:text-neutral-400 h-9"
              dir="ltr"
            />
            <Button
              onClick={handleApplyPromo}
              disabled={promoLoading || !promoCode.trim()}
              size="sm"
              className="text-xs font-bold uppercase tracking-wider bg-neutral-900 text-white rounded hover:bg-neutral-800 disabled:opacity-40 transition-colors whitespace-nowrap h-9 px-4"
            >
              {promoLoading ? <Spinner className="w-3.5 h-3.5" /> : 'APPLY'}
            </Button>
          </div>
          {promoError && (
            <p className="text-[11px] text-red-500 font-medium">{promoError}</p>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between bg-emerald-50 px-3 py-2 rounded border border-emerald-200">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-emerald-300 bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
              PROMO APPLIED
            </Badge>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              {promoApplied}
            </span>
          </div>
          <Button
            onClick={onRemovePromo}
            variant="ghost"
            size="sm"
            className="text-[11px] text-red-600 hover:text-red-800 font-bold uppercase tracking-wider h-7 px-2 hover:bg-red-50"
          >
            Remove
          </Button>
        </div>
      )}

      {/* Totals Section */}
      <div className="border-t border-b border-neutral-300/80 py-3 space-y-2 text-xs uppercase tracking-wider font-medium">
        <div className="flex justify-between text-neutral-600">
          <span>Subtotal</span>
          <span className="font-mono text-neutral-900">EGP {subtotal.toFixed(2)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-emerald-700 font-semibold">
            <span>Discount</span>
            <span className="font-mono">-EGP {discount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-neutral-600">
          <span>Shipping</span>
          <span className="font-mono text-neutral-900">
            {shippingEGP > 0 ? `EGP ${shippingEGP.toFixed(2)}` : 'FREE'}
          </span>
        </div>
        {codFeeMinor > 0 && paymentMethod === 'cod' && (
          <div className="flex justify-between text-neutral-600">
            <span>COD Fee</span>
            <span className="font-mono text-neutral-900">EGP {codFeeEGP.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Total Row */}
      <div className="flex justify-between items-center text-sm font-black uppercase tracking-widest text-neutral-900 pt-1">
        <span>TOTAL</span>
        <span className="text-lg font-mono">EGP {total.toFixed(2)}</span>
      </div>

      {/* Submit Button */}
      <Button
        onClick={onSubmit}
        disabled={isSubmitting}
        className="w-full py-6 bg-[#D0D48D] hover:bg-[#C2C67F] text-neutral-900 rounded-lg font-bold text-xs uppercase tracking-widest
                   disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all active:scale-[0.99] border border-neutral-400/30"
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <Spinner className="w-4 h-4 text-neutral-900" />
            PROCESSING ORDER...
          </span>
        ) : (
          `CHECK OUT · EGP ${total.toFixed(0)}`
        )}
      </Button>
    </div>
  );
}
