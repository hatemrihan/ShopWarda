'use client';

import React from 'react';
import Link from 'next/link';

export default function PrivacyContent() {
  return (
    <div className="px-4 py-12 md:py-16">
      <h1 className="font-extrabold pt-4 text-[#1a1a1a] max-w-4xl mx-auto px-4 md:px-10 mb-4 text-lg">
        Privacy & Policy
      </h1>

      <div className="px-4 md:px-10 space-y-6 text-[#1a1a1a] max-w-4xl mx-auto">
        <div className="space-y-4">
          <p className="leading-relaxed text-sm text-left">
            ShopWarda values your privacy and is committed to protecting your personal information. This Privacy Policy explains how we collect, use, and safeguard information when you visit our website or interact with us online.
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="font-normal pt-6 text-[#1a1a1a] underline text-left">
            1. Information We Collect
          </h3>
          <p className="leading-relaxed text-sm text-left">
            We collect information you provide directly to us, such as when you create an account, place an order, subscribe to our newsletter, or contact our customer care team. This may include your name, email address, shipping and billing details, and payment information. We also collect certain technical information automatically, including your IP address, browser type, and usage data, to help us improve our Site&apos;s performance and user experience.
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="font-normal pt-6 text-[#1a1a1a] underline text-left">
            2. How We Use Your Information
          </h3>
          <p className="leading-relaxed text-sm text-left">
            Your information is used to process and fulfill orders, communicate with you about purchases and updates, improve our website and services, send marketing communications (only with your consent), and comply with legal obligations and prevent fraud.
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="font-normal pt-6 text-[#1a1a1a] underline text-left">
            3. Sharing Your Information
          </h3>
          <p className="leading-relaxed text-sm text-left">
            We do not sell your personal data. We only share information with trusted service providers who help us operate our website, process payments, and deliver orders—always under strict confidentiality agreements.
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="font-normal pt-6 text-[#1a1a1a] underline text-left">
            4. International Access
          </h3>
          <p className="leading-relaxed text-sm text-left">
            As ShopWarda serves a global audience, your information may be processed in different countries. Regardless of location, we apply the same level of care and protection to your data.
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="font-normal pt-6 text-[#1a1a1a] underline text-left">
            5. Data Security
          </h3>
          <p className="leading-relaxed text-sm text-left">
            We use industry-standard measures to protect your information from unauthorized access, misuse, or disclosure. However, no system is entirely secure, and you share your information at your own risk.
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="font-normal pt-6 text-[#1a1a1a] underline text-left">
            6. Your Rights
          </h3>
          <p className="leading-relaxed text-sm text-left">
            You have the right to access, correct, or delete your personal data at any time. To make a request or update your preferences, contact us at{' '}
            <a
              href="mailto:thewarda2026@gmail.com"
              className="text-blue-600 hover:text-blue-800 underline font-medium"
            >
              thewarda2026@gmail.com
            </a>
            . You may also unsubscribe from our communications at any time.
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="font-normal pt-6 text-[#1a1a1a] underline text-left">
            7. Changes to this Policy
          </h3>
          <p className="leading-relaxed text-sm text-left">
            We may update this policy periodically. Continued use of our services indicates your acceptance of any changes.
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="font-normal pt-6 text-[#1a1a1a] underline text-left">
            8. Contact Us
          </h3>
          <p className="leading-relaxed text-sm text-left">
            For any questions about this Privacy Policy or how we handle your information, please contact our team at:{' '}
            <a
              href="mailto:thewarda2026@gmail.com"
              className="text-blue-600 hover:text-blue-800 underline font-medium"
            >
              thewarda2026@gmail.com
            </a>
          </p>
        </div>

        <div className="pt-0 border-t border-[#1a1a1a]/10" />
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
