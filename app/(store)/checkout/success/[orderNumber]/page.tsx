import Link from 'next/link';

interface ConfirmationPageProps {
  params: Promise<{ orderNumber: string }>;
}

export default async function ConfirmationPage({ params }: ConfirmationPageProps) {
  const { orderNumber } = await params;

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Success Icon */}
        <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
          <svg
            className="w-10 h-10 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
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

        {/* Info */}
        <div className="text-sm text-neutral-600 space-y-2">
          <p>
            Your order will be delivered within the estimated delivery window.
          </p>
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
