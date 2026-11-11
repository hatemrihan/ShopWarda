'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useCart } from '@/features/cart/context/cart-context';
import { useAnalytics } from '@/lib/analytics';
import { EGYPT_PHONE_REGEX } from '@/features/checkout/phone';
import { qualifiesForFreeDelivery, resolveShippingZone } from '@/features/checkout/shipping';
import type { CheckoutConfigDTO } from '@/features/settings/server/settings.service';
import { CustomerInfoForm, type CustomerInfo } from './_components/CustomerInfoForm';
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

type PaymentMethod = 'cod' | 'instapay';

interface CheckoutClientProps {
  config: CheckoutConfigDTO;
}

const EMPTY_CUSTOMER: CustomerInfo = {
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
};

function defaultPaymentMethod(config: CheckoutConfigDTO): PaymentMethod | '' {
  if (config.instaPayEnabled) return 'instapay';
  if (config.codEnabled) return 'cod';
  return '';
}

export function CheckoutClient({ config }: CheckoutClientProps) {
  const router = useRouter();
  const { state, totalPrice, totalItems, clearCart, isLoaded, openCart } = useCart();
  const { track } = useAnalytics();

  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>(EMPTY_CUSTOMER);

  // ── Payment state ───────────────────────────────────────────
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>(() =>
    defaultPaymentMethod(config)
  );
  const [instaPayAssetKey, setInstaPayAssetKey] = useState('');
  const [proofUploading, setProofUploading] = useState(false);

  // ── Promo state ─────────────────────────────────────────────
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

  // Set the instant an order succeeds, so the empty-cart guards above and
  // below stand down while we navigate to the confirmation page. A ref, not
  // state: it must be visible to the effect synchronously.
  const orderPlacedRef = useRef(false);
  // Mirrored into state for the render branch — refs must not be read during render.
  const [orderPlaced, setOrderPlaced] = useState(false);
  const getIdempotencyKey = (): string => {
    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
    return idempotencyKeyRef.current;
  };

  // ── Delivery pricing — derived, never stored ────────────────
  // The same resolver the server charges with (features/checkout/shipping.ts).
  // It used to be copied into state by an effect in the address form, keyed on
  // governorate only: per-city rates were ignored, and choosing a governorate
  // with no rate kept showing the previous one's fee.
  const subtotalMinor = Math.round(totalPrice * 100);

  const delivery = useMemo(() => {
    if (!customerInfo.governorate) {
      return { supported: true, feeMinor: 0, codFeeMinor: 0 };
    }
    const resolution = resolveShippingZone(
      config.shippingZones,
      customerInfo.governorate,
      customerInfo.city
    );
    if (!resolution.ok) return { supported: false, feeMinor: 0, codFeeMinor: 0 };
    return {
      supported: true,
      feeMinor: resolution.shipping?.feeMinor ?? 0,
      codFeeMinor: resolution.shipping?.codFeeMinor ?? 0,
    };
  }, [config.shippingZones, customerInfo.governorate, customerInfo.city]);

  // Free delivery over the shop's threshold — the server already applied it,
  // but the summary did not, so the total shown was higher than the total
  // charged.
  const freeDelivery = qualifiesForFreeDelivery(subtotalMinor, config.freeDeliveryThresholdMinor);
  const shippingMinor = freeDelivery ? 0 : delivery.feeMinor;
  const codFeeMinor = delivery.codFeeMinor;

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
  // Skipped once an order is placed. clearCart() empties the cart, which used
  // to trip this redirect to /cart — and /cart bounces an empty cart to /shop.
  // That client-side navigation beat the slower full-page navigation to the
  // confirmation page, so buyers landed on the shop instead of their receipt.
  useEffect(() => {
    if (isLoaded && totalItems === 0 && !orderPlacedRef.current) {
      router.replace('/shop');
    }
  }, [isLoaded, totalItems, router]);

  // ── Promo code ──────────────────────────────────────────────
  const validatePromo = async (
    code: string,
    forSubtotalMinor: number
  ): Promise<{ success: true; code: string; discountEGP: number } | { success: false; error: string }> => {
    try {
      const res = await fetch('/api/promo/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, subtotalMinor: forSubtotalMinor }),
      });
      const data = await res.json();
      if (data.success) {
        return {
          success: true,
          code: data.discount.code,
          discountEGP: data.discount.discountMinor / 100,
        };
      }
      return { success: false, error: data.error || 'Invalid promo code' };
    } catch {
      return { success: false, error: 'Failed to validate promo code' };
    }
  };

  const handleApplyPromo = async (code: string): Promise<{ success: boolean; error?: string }> => {
    const result = await validatePromo(code, subtotalMinor);
    if (!result.success) return result;
    setDiscount(result.discountEGP);
    setPromoApplied(result.code);
    return { success: true };
  };

  const handleRemovePromo = () => {
    setDiscount(0);
    setPromoApplied('');
  };

  // The bag can still be edited from the drawer while on this page. A
  // discount worked out for the old subtotal would then be wrong (a
  // percentage) or no longer allowed (below the code's minimum order), and
  // the summary would disagree with what the server charges — so re-check it.
  const promoSubtotalRef = useRef(subtotalMinor);
  useEffect(() => {
    if (!promoApplied) {
      promoSubtotalRef.current = subtotalMinor;
      return;
    }
    if (promoSubtotalRef.current === subtotalMinor || subtotalMinor === 0) return;
    promoSubtotalRef.current = subtotalMinor;

    let cancelled = false;
    void validatePromo(promoApplied, subtotalMinor).then((result) => {
      if (cancelled) return;
      if (result.success) {
        setDiscount(result.discountEGP);
      } else {
        setDiscount(0);
        setPromoApplied('');
        toast.info(`Promo code removed: ${result.error}`);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [subtotalMinor, promoApplied]);

  // ── Validate form ───────────────────────────────────────────
  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {};

    if (customerInfo.name.trim().length < 2) errs.name = 'Please enter your full name';
    if (!customerInfo.phone.trim()) errs.phone = 'Phone is required';
    else if (!EGYPT_PHONE_REGEX.test(customerInfo.phone.trim())) {
      errs.phone = 'Enter a valid Egyptian mobile number (01XXXXXXXXX)';
    }
    if (customerInfo.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerInfo.email.trim())) {
      errs.email = 'Enter a valid e-mail address';
    }
    if (!customerInfo.governorate) errs.governorate = 'Select a governorate';
    else if (!delivery.supported) errs.governorate = 'Sorry, we do not deliver to this area yet';
    if (!customerInfo.city.trim()) errs.city = 'City is required';
    if (!customerInfo.street.trim()) errs.street = 'Street is required';

    if (!paymentMethod) errs.payment = 'Select a payment method';
    else if (paymentMethod === 'instapay') {
      // The upload field is marked required, but nothing enforced it: an
      // InstaPay order could be placed with no proof of payment at all.
      if (proofUploading) errs.payment = 'Please wait for your screenshot to finish uploading';
      else if (!instaPayAssetKey) errs.payment = 'Please upload your InstaPay transaction screenshot';
    }

    return errs;
  };

  // ── Submit order ────────────────────────────────────────────
  const handleSubmit = async () => {
    if (isSubmitting) return;

    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast.error(Object.values(errs)[0]);
      // Wait a frame so the error styling is in the DOM before we look for it.
      requestAnimationFrame(() => {
        document
          .querySelector('[data-invalid="true"], [data-checkout-error]')
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
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
              variantId: item.variantId,
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
            building: customerInfo.building || undefined,
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
          instaPayAssetKey:
            paymentMethod === 'instapay' ? instaPayAssetKey || undefined : undefined,
        }),
      });

      const data = await res.json().catch(() => null);

      if (data?.success) {
        // Retire the key so a future order for the same items is not treated
        // as a duplicate of this one.
        idempotencyKeyRef.current = '';

        track('Purchase', {
          value: totalPrice * 100,
          num_items: totalItems,
          content_ids: state.items.map((i) => i.id),
        });

        orderPlacedRef.current = true;
        setOrderPlaced(true);
        clearCart();
        window.location.href = `/checkout/success/${data.order.orderId}`;
        return;
      }

      toast.error(data?.error || 'Failed to place order. Please try again.');
    } catch (err) {
      console.error('Order submission failed:', err);
      toast.error('Something went wrong. Please check your connection and try again.');
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

  // Order placed: the cart is empty but we are navigating to the receipt.
  // Show a hand-off state rather than flashing an empty checkout.
  if (orderPlaced) {
    return (
      <div className="bg-white min-h-[60vh] flex items-center justify-center px-4">
        <p className="text-xs uppercase tracking-widest text-neutral-500">
          Taking you to your confirmation…
        </p>
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
                {/* Opens the bag. This linked to /cart, which only redirects
                    straight back here — the link appeared to do nothing. */}
                <BreadcrumbLink
                  render={<button type="button" onClick={openCart} />}
                  className="hover:text-neutral-900 transition-colors uppercase tracking-wider font-semibold cursor-pointer"
                >
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
              onChange={(next) => {
                setCustomerInfo(next);
                // Clear a field's error as soon as the shopper edits it.
                setErrors((prev) => {
                  const changed = (Object.keys(next) as (keyof CustomerInfo)[]).filter(
                    (key) => next[key] !== customerInfo[key] && prev[key]
                  );
                  if (changed.length === 0) return prev;
                  const rest = { ...prev };
                  for (const key of changed) delete rest[key];
                  return rest;
                });
              }}
              zones={config.shippingZones}
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
              codEnabled={config.codEnabled}
              instaPayEnabled={config.instaPayEnabled}
              codFee={codFeeMinor}
              instaPayConfig={config.instaPay}
              onScreenshotUpload={(assetKey) => {
                setInstaPayAssetKey(assetKey);
                if (assetKey) setErrors((prev) => ({ ...prev, payment: '' }));
              }}
              onUploadingChange={setProofUploading}
            />
            {errors.payment && (
              <p data-checkout-error className="text-xs text-red-500 font-medium -mt-2" role="alert">
                {errors.payment}
              </p>
            )}

            {/* Back to Cart — opens the bag (see the breadcrumb note above). */}
            <div className="pt-4 border-t border-neutral-200">
              <button
                type="button"
                onClick={openCart}
                className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer"
              >
                ← BACK TO CART
              </button>
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
