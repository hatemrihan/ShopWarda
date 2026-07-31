'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '@/features/cart/context/cart-context';
import { useAnalytics } from '@/lib/analytics';
import { CustomerInfoForm } from './_components/CustomerInfoForm';
import { PaymentMethodSelector } from './_components/PaymentMethodSelector';
import { OrderSummary } from './_components/OrderSummary';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

interface PaymentSettings {
  codEnabled: boolean;
  instaPayEnabled: boolean;
  instaPay: {
    accountLink: string;
    instructions: string;
  };
}

export default function CheckoutPage() {
  const router = useRouter();
  const { state, totalPrice, totalItems, clearCart, isLoaded } = useCart();
  const { track } = useAnalytics();

  // ── Customer info state ─────────────────────────────────────
  const [customerInfo, setCustomerInfo] = useState<{
    name: string;
    phone: string;
    email: string;
    governorate: string;
    city: string;
    area: string;
    street: string;
    building: string;
    floor: string;
    apartment: string;
    landmark: string;
    deliveryNotes: string;
    lat?: number;
    lng?: number;
  }>({
    name: '',
    phone: '',
    email: '',
    governorate: '',
    city: '',
    area: '',
    street: '',
    building: '',
    floor: '',
    apartment: '',
    landmark: '',
    deliveryNotes: '',
  });

  // ── Payment state ───────────────────────────────────────────
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'instapay' | ''>('');
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
    codEnabled: true,
    instaPayEnabled: true,
    instaPay: { accountLink: '', instructions: '' },
  });
  const [instaPayAssetKey, setInstaPayAssetKey] = useState<string>('');

  // ── Shipping & pricing state ────────────────────────────────
  const [shippingMinor, setShippingMinor] = useState(0);
  const [codFeeMinor, setCodFeeMinor] = useState(0);
  const [discount, setDiscount] = useState(0); // EGP (pounds)
  const [promoApplied, setPromoApplied] = useState('');

  // ── Form state ──────────────────────────────────────────────
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Idempotency ─────────────────────────────────────────────
  // One key per checkout attempt. It is deliberately kept across failed
  // retries (so a lost response de-duplicates server-side) and cleared after a
  // successful order, so the same customer can re-order identical items later.
  const idempotencyKeyRef = useRef<string>('');
  const getIdempotencyKey = (): string => {
    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
    return idempotencyKeyRef.current;
  };

  // ── Fetch payment settings on mount ─────────────────────────
  useEffect(() => {
    async function fetchPaymentSettings() {
      try {
        const res = await fetch('/api/payment-settings');
        const data = await res.json();
        if (data.success) {
          setPaymentSettings(data.settings);
          // Auto-select first available method
          if (data.settings.instaPayEnabled) {
            setPaymentMethod('instapay');
          } else if (data.settings.codEnabled) {
            setPaymentMethod('cod');
          }
        }
      } catch (err) {
        console.error('Failed to fetch payment settings:', err);
      }
    }
    fetchPaymentSettings();
  }, []);

  // ── Track checkout initiation ───────────────────────────────
  useEffect(() => {
    if (isLoaded && totalItems > 0) {
      track('InitiateCheckout', {
        value: totalPrice * 100,
        num_items: totalItems,
        content_ids: state.items.map((i) => i.id),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]);

  // ── Redirect if cart is empty ───────────────────────────────
  useEffect(() => {
    if (isLoaded && totalItems === 0) {
      router.replace('/cart');
    }
  }, [isLoaded, totalItems, router]);

  // ── Handle shipping change from CustomerInfoForm ────────────
  const handleShippingChange = (shipping: number, codFee: number) => {
    setShippingMinor(shipping);
    setCodFeeMinor(codFee);
  };

  // ── Apply promo code ────────────────────────────────────────
  const handleApplyPromo = async (code: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const subtotalMinor = Math.round(totalPrice * 100);
      const res = await fetch('/api/promo/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, subtotalMinor }),
      });

      const data = await res.json();
      if (data.success) {
        const discountEGP = data.discount.discountMinor / 100;
        setDiscount(discountEGP);
        setPromoApplied(data.discount.code);
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch {
      return { success: false, error: 'Failed to validate promo code' };
    }
  };

  const handleRemovePromo = () => {
    setDiscount(0);
    setPromoApplied('');
  };

  // ── Validate form ───────────────────────────────────────────
  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!customerInfo.name.trim()) errs.name = 'Name is required';
    if (!customerInfo.phone.trim()) errs.phone = 'Phone is required';
    else if (!/^01[0125]\d{8}$/.test(customerInfo.phone.trim())) {
      errs.phone = 'Enter a valid Egyptian phone number';
    }
    if (!customerInfo.governorate) errs.governorate = 'Select a governorate';
    if (!customerInfo.city.trim()) errs.city = 'City is required';
    if (!customerInfo.street.trim()) errs.street = 'Street is required';

    if (!paymentMethod) errs.payment = 'Select a payment method';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Submit order ────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate()) {
      const firstErrorEl = document.querySelector('[class*="border-red"]');
      firstErrorEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setIsSubmitting(true);

    try {
      // Bouquet lines send their configuration instead of a product/variant
      // pair; the server re-prices them from the database.
      const orderItems = state.items.map((item) =>
        item.kind === 'bouquet' && item.customization
          ? {
              kind: 'bouquet' as const,
              config: item.customization,
              quantity: item.quantity,
            }
          : {
              productId: item.id,
              variantId: item.variantId || item.id,
              quantity: item.quantity,
            }
      );

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: {
            name: customerInfo.name.trim(),
            phone: customerInfo.phone.trim(),
            email: customerInfo.email.trim() || undefined,
          },
          address: {
            governorate: customerInfo.governorate,
            city: customerInfo.city,
            area: customerInfo.area,
            street: customerInfo.street,
            building: customerInfo.building || 'N/A',
            floor: customerInfo.floor || undefined,
            apartment: customerInfo.apartment || undefined,
            landmark: customerInfo.landmark || undefined,
            lat: customerInfo.lat,
            lng: customerInfo.lng,
          },
          items: orderItems,
          paymentMethod,
          idempotencyKey: getIdempotencyKey(),
          promoCode: promoApplied || undefined,
          deliveryNotes: customerInfo.deliveryNotes || undefined,
          instaPayAssetKey: instaPayAssetKey || undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        // Retire the key so a future order for the same items is not treated
        // as a duplicate of this one.
        idempotencyKeyRef.current = '';

        track('Purchase', {
          value: totalPrice * 100,
          num_items: totalItems,
          content_ids: state.items.map((i) => i.id),
        });

        clearCart();
        window.location.href = `/checkout/success/${data.order.orderId}`;
      } else {
        alert(data.error || 'Failed to place order. Please try again.');
      }
    } catch (err) {
      console.error('Order submission failed:', err);
      alert('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="bg-white min-h-screen py-12">
        <div className="container max-w-6xl mx-auto px-4 space-y-8">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-12">
            <div className="space-y-6">
              <Skeleton className="h-64 w-full rounded-xl" />
              <Skeleton className="h-48 w-full rounded-xl" />
            </div>
            <Skeleton className="h-96 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (totalItems === 0) {
    return null;
  }

  return (
    <div className="bg-white min-h-screen py-10 lg:py-16">
      <div className="container max-w-6xl mx-auto px-4">
        {/* Breadcrumbs */}
        <div className="mb-6">
          <Breadcrumb>
            <BreadcrumbList className="text-xs uppercase tracking-wider font-semibold text-neutral-500">
              <BreadcrumbItem>
                <BreadcrumbLink href="/cart" className="hover:text-neutral-900 transition-colors">
                  Shopping Bag
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="text-neutral-900 font-bold">
                  Checkout
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Title */}
        <div className="mb-8">
          <h1 className="text-3xl lg:text-4xl font-serif text-neutral-900 tracking-tight">
            Checkout
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-12 lg:gap-16 items-start">
          {/* Left Column — Forms */}
          <div className="space-y-8">
            {/* Customer & Delivery Form */}
            <CustomerInfoForm
              value={customerInfo}
              onChange={setCustomerInfo}
              onShippingChange={handleShippingChange}
              errors={errors}
            />

            {/* Payment Method Selector */}
            <PaymentMethodSelector
              value={paymentMethod}
              onChange={(method) => {
                setPaymentMethod(method);
                setErrors((prev) => ({ ...prev, payment: '' }));
                track('AddPaymentInfo', {
                  value: totalPrice * 100,
                  content_type: method,
                });
              }}
              codEnabled={paymentSettings.codEnabled}
              instaPayEnabled={paymentSettings.instaPayEnabled}
              codFee={codFeeMinor}
              instaPayConfig={paymentSettings.instaPay}
              onScreenshotUpload={setInstaPayAssetKey}
            />
            {errors.payment && (
              <p className="text-xs text-red-500 font-medium -mt-2">{errors.payment}</p>
            )}

            {/* Back to Cart link */}
            <div className="pt-4 border-t border-neutral-200">
              <Link
                href="/cart"
                className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-neutral-500 hover:text-neutral-900 transition-colors"
              >
                ← BACK TO CART
              </Link>
            </div>
          </div>

          {/* Right Column — Order Summary */}
          <OrderSummary
            items={state.items}
            subtotal={totalPrice}
            shippingMinor={shippingMinor}
            codFeeMinor={paymentMethod === 'cod' ? codFeeMinor : 0}
            discount={discount}
            onApplyPromo={handleApplyPromo}
            promoApplied={promoApplied}
            onRemovePromo={handleRemovePromo}
            isSubmitting={isSubmitting}
            onSubmit={handleSubmit}
            paymentMethod={paymentMethod}
          />
        </div>
      </div>
    </div>
  );
}
