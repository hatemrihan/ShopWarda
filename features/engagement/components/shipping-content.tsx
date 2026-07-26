'use client';

import React from 'react';
import Link from 'next/link';

export default function ShippingContent() {
  return (
    <div className="px-4 py-12 md:py-16">
      <h1 className="font-bold pt-4 text-[#1a1a1a] max-w-4xl mx-auto px-4 md:px-10 mb-4 text-lg">
        Shipping & Delivery
      </h1>

      <div className="px-4 md:px-10 space-y-6 text-[#1a1a1a]/70 max-w-4xl mx-auto">
        <div className="space-y-4">
          <p className="leading-relaxed text-sm text-left">
            All ShopWarda pieces are made to order with meticulous attention to detail. Each garment is individually hand-tailored and carefully prepared before dispatch, ensuring that every piece meets our exacting standards of quality and craftsmanship.
          </p>
          <p className="leading-relaxed text-sm text-left">
            Please allow 10–14 business days for production and processing before shipment. This timeframe ensures that each piece receives the dedicated attention it deserves. Once your order is ready and dispatched, you will receive a confirmation email with detailed tracking information.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="font-normal pt-6 text-[#1a1a1a] underline text-left">
            Domestic Orders (Egypt)
          </h2>
          <p className="leading-relaxed text-sm text-left">
            Orders within Egypt are shipped via our trusted local courier partners, ensuring reliable and efficient delivery. Your items will typically arrive within 1–3 business days after dispatch, depending on your specific location within the country.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="font-normal pt-6 text-[#1a1a1a] underline text-left">
            International Orders
          </h2>
          <p className="leading-relaxed text-sm text-left">
            International shipping is available worldwide through our global logistics network. Estimated delivery time is 5–10 business days, depending on your destination and local customs procedures. We work with reliable international carriers to ensure your order arrives safely.
          </p>
          <p className="leading-relaxed text-sm text-left">
            Please note that international customers are responsible for any duties, taxes, or import fees that may apply upon arrival in their country. These charges are determined by local customs authorities and are separate from your order total.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="font-normal pt-6 text-[#1a1a1a] underline text-left">
            Premium Packaging
          </h2>
          <p className="leading-relaxed text-sm text-left">
            Each piece is wrapped in our signature ShopWarda packaging, thoughtfully designed for both protection during transit and an elevated unboxing experience. Our packaging reflects the same attention to detail and quality that goes into every garment.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="font-normal pt-6 text-[#1a1a1a] underline text-left">
            Made to Order Policy
          </h2>
          <p className="leading-relaxed text-sm text-left">
            Because every garment is created specifically for you using premium materials and craftsmanship, returns are not accepted unless the item is faulty or damaged upon arrival. This ensures that each piece maintains its exclusivity and quality standards.
          </p>
        </div>

        <div className="pt-6 border-t border-[#1a1a1a]/10">
          <p className="leading-relaxed text-sm text-left">
            For any inquiries regarding shipping, orders, or our policies, please don&apos;t hesitate to contact our customer service team at{' '}
            <a
              href="mailto:thewarda2026@gmail.com"
              className="text-blue-600 hover:text-blue-800 underline font-medium"
            >
              thewarda2026@gmail.com
            </a>
          </p>
        </div>
      </div>

      <div className="text-center mt-12">
        <Link
          href="/"
          className="inline-block w-full max-w-xs mx-auto bg-[#222] text-white py-4 px-8 text-xs uppercase tracking-[0.2em] hover:bg-black transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
