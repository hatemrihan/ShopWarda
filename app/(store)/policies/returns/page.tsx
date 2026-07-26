import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Return & Refund Policy | Warda',
  description: 'Our return and refund policy for all purchases.',
};

export default function ReturnsPolicyPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold">Return & Refund Policy</h1>

      <div className="prose mt-8 max-w-none">
        <h2>Return Eligibility</h2>
        <p>
          Items may be returned within <strong>14 days</strong> of delivery if
          they meet the following conditions:
        </p>
        <ul>
          <li>Item is unused and in its original packaging</li>
          <li>Tags and labels are still attached</li>
          <li>Item is not from our final-sale or clearance sections</li>
        </ul>

        <h2>How to Request a Return</h2>
        <p>
          Contact us via our <a href="/contact">contact page</a> with your order
          number and reason for return. Our team will guide you through the
          return process.
        </p>

        <h2>Refund Process</h2>
        <p>
          Refunds are processed within <strong>5–7 business days</strong> after
          we receive and inspect the returned item. Refunds will be issued
          through the original payment method.
        </p>
        <ul>
          <li><strong>COD orders:</strong> Refund via InstaPay or bank transfer</li>
          <li><strong>InstaPay orders:</strong> Refund to your InstaPay account</li>
        </ul>

        <h2>Exchange Policy</h2>
        <p>
          We offer free exchanges for different sizes or colors, subject to
          availability. Contact us to arrange an exchange.
        </p>

        <h2>Non-Returnable Items</h2>
        <ul>
          <li>Items marked as &quot;Final Sale&quot;</li>
          <li>Personalized or custom items</li>
          <li>Items that show signs of wear or damage</li>
        </ul>
      </div>
    </div>
  );
}
