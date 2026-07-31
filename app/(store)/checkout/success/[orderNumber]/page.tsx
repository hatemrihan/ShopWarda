import Link from 'next/link';
import type { Metadata } from 'next';
import connectDB from '@/lib/db/mongoose';
import { Order } from '@/lib/db/models/order.model';
import { piastersToCurrency } from '@/lib/money/egp';

interface ConfirmationPageProps {
  params: Promise<{ orderNumber: string }>;
}

// The order number is guessable, so keep this page out of search indexes.
// Nothing is shown that the buyer did not just submit themselves.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

interface OrderRecap {
  items: {
    productName: string;
    quantity: number;
    lineTotalMinor: number;
    selectedOptions: { label: string; value: string }[];
  }[];
  subtotalMinor: number;
  discountMinor: number;
  shippingMinor: number;
  totalMinor: number;
  paymentMethod: string;
  governorate: string;
  city: string;
}

async function getOrderRecap(orderNumber: string): Promise<OrderRecap | null> {
  try {
    await connectDB();
    const order = await Order.findOne({ orderNumber })
      .select('items pricing payment.method address.governorate address.city')
      .lean();

    if (!order) return null;

    return {
      items: (order.items ?? []).map((i) => ({
        productName: i.productName,
        quantity: i.quantity,
        lineTotalMinor: i.lineTotalMinor,
        selectedOptions: i.selectedOptions ?? [],
      })),
      subtotalMinor: order.pricing.subtotalMinor,
      discountMinor: order.pricing.discountMinor,
      shippingMinor: order.pricing.shippingMinor,
      totalMinor: order.pricing.totalMinor,
      paymentMethod: order.payment.method,
      governorate: order.address?.governorate ?? '',
      city: order.address?.city ?? '',
    };
  } catch (error) {
    // The recap is a nicety — never fail the confirmation page over it.
    console.error('[checkout/success] failed to load order recap', error);
    return null;
  }
}

export default async function ConfirmationPage({ params }: ConfirmationPageProps) {
  const { orderNumber } = await params;
  const order = await getOrderRecap(orderNumber);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full text-center space-y-6">
        {/* Success Icon */}
        <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
          <svg
            className="w-10 h-10 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-neutral-900">
            Order Placed Successfully!
          </h1>
          <p className="text-neutral-600">
            Thank you for your order. We&apos;ll start processing it right away.
          </p>
        </div>

        {/* Order Number */}
        <div className="bg-neutral-50 rounded-xl p-5 space-y-1">
          <p className="text-xs text-neutral-500 uppercase tracking-wide font-medium">
            Order Number
          </p>
          <p className="text-2xl font-bold text-neutral-900 tracking-wide">
            {orderNumber}
          </p>
        </div>

        {/* Recap */}
        {order && (
          <div className="border border-neutral-200 rounded-xl p-5 text-left space-y-4">
            <p className="text-[11px] uppercase tracking-widest font-semibold text-neutral-500">
              Order Summary
            </p>

            <div className="space-y-3">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between gap-4 text-sm">
                  <div className="min-w-0">
                    <p className="text-neutral-900">
                      {item.quantity} × {item.productName}
                    </p>
                    {item.selectedOptions.length > 0 && (
                      <p className="text-xs text-neutral-500 mt-0.5">
                        {item.selectedOptions
                          .map((o) => `${o.label}: ${o.value}`)
                          .join(' · ')}
                      </p>
                    )}
                  </div>
                  <span className="font-mono tabular-nums text-neutral-900 whitespace-nowrap">
                    {piastersToCurrency(item.lineTotalMinor)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-neutral-200 pt-3 space-y-1.5 text-sm">
              <div className="flex justify-between text-neutral-600">
                <span>Subtotal</span>
                <span className="font-mono tabular-nums">
                  {piastersToCurrency(order.subtotalMinor)}
                </span>
              </div>

              {order.discountMinor > 0 && (
                <div className="flex justify-between text-green-700">
                  <span>Discount</span>
                  <span className="font-mono tabular-nums">
                    −{piastersToCurrency(order.discountMinor)}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-neutral-600">
                <span>Delivery</span>
                <span className="font-mono tabular-nums">
                  {order.shippingMinor === 0
                    ? 'Free'
                    : piastersToCurrency(order.shippingMinor)}
                </span>
              </div>

              <div className="flex justify-between pt-2 border-t border-neutral-200 font-semibold text-neutral-900">
                <span>Total</span>
                <span className="font-mono tabular-nums">
                  {piastersToCurrency(order.totalMinor)}
                </span>
              </div>
            </div>

            <div className="border-t border-neutral-200 pt-3 text-xs text-neutral-500 space-y-1">
              <p>
                Payment:{' '}
                <span className="text-neutral-700">
                  {order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'InstaPay'}
                </span>
              </p>
              {(order.city || order.governorate) && (
                <p>
                  Delivering to:{' '}
                  <span className="text-neutral-700">
                    {[order.city, order.governorate].filter(Boolean).join(', ')}
                  </span>
                </p>
              )}
            </div>
          </div>
        )}

        {/* Info */}
        <div className="text-sm text-neutral-600 space-y-2">
          <p>Your order will be delivered within the estimated delivery window.</p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2 underline">
          <Link
            href="/"
            className="flex-1 py-3 px-6 bg-neutral-900 text-white font-medium text-sm
                       hover:bg-neutral-800 transition-colors text-center"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
