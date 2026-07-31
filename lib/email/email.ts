import { Resend } from 'resend';
import { getAdminEmails } from '@/lib/auth/route';
import { buildOrderEmailHtml, buildAdminOrderEmailHtml } from '@/components/email-template';

// ─── Resend Client (lazy — avoids build-time crash when env is absent) ────

function getResend(): Resend {
  return new Resend(process.env.RESEND_API_KEY);
}

function getFromEmail(): string {
  const rawFromEnv = process.env.RESEND_FROM_EMAIL || '';
  if (!rawFromEnv || rawFromEnv.includes('yourdomain.com')) {
    console.error(
      '⚠️ RESEND_FROM_EMAIL is not configured — falling back to the shared Resend sandbox sender. ' +
        'Delivery to real customers requires a verified domain in the Resend dashboard.',
    );
    return 'Warda <onboarding@resend.dev>';
  }
  return rawFromEnv;
}

/**
 * Test mode is opt-in ONLY. It used to be inferred from a missing
 * RESEND_FROM_EMAIL, which silently rerouted every customer and admin email in
 * production to a single hardcoded inbox.
 */
function isTestMode(): boolean {
  return process.env.RESEND_TEST_MODE === 'true';
}

// ─── Types ────────────────────────────────────────────────────

interface SendNewsletterInput {
  recipients: string[];
  subject: string;
  heading: string;
  message: string;
}

interface SendResult {
  success: boolean;
  message?: string;
  error?: string;
  results?: { sent: number; failed: number };
}

export interface OrderEmailData {
  customerEmail?: string;
  customerName: string;
  orderId: string;
  orderItems: {
    name: string;
    quantity: number;
    price: number;
    size?: string;
    color?: string;
    attributes?: Record<string, string>;
  }[];
  subtotal: number;
  shippingCost: number;
  codFee: number;
  discountAmount: number;
  promoCode?: string;
  deliveryNotes?: string;
  totalAmount: number;
  paymentMethod: string;
  shippingAddress: {
    governorate: string;
    city: string;
    address: string;
    apartment?: string;
  };
  customerPhone: string;
}

// ─── Newsletter Email ─────────────────────────────────────────

export async function sendNewsletterEmail(input: SendNewsletterInput): Promise<SendResult> {
  const { recipients, subject, heading, message } = input;

  let sent = 0;
  let failed = 0;

  // Resend supports batch sending (up to 50 per call).
  const BATCH_SIZE = 50;

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);

    try {
      const res = await getResend().batch.send(
        batch.map((email) => ({
          from: getFromEmail(),
          to: email,
          subject,
          html: buildNewsletterHtml(heading, message),
        }))
      );

      if (res.error) {
        console.error(`❌ Batch send rejected (${i}–${i + batch.length}):`, res.error);
        failed += batch.length;
        continue;
      }

      sent += batch.length;
    } catch (err) {
      console.error(`❌ Batch send failed (${i}–${i + batch.length}):`, err);
      failed += batch.length;
    }
  }

  if (failed === recipients.length) {
    return { success: false, error: 'All emails failed to send', results: { sent, failed } };
  }

  return {
    success: true,
    message: `Newsletter sent to ${sent} recipients${failed > 0 ? ` (${failed} failed)` : ''}`,
    results: { sent, failed },
  };
}

function sanitizeRecipients(recipients: string[]): string[] {
  if (isTestMode()) {
    const verifiedTestEmail = process.env.RESEND_TEST_RECIPIENT;
    if (!verifiedTestEmail) {
      console.warn('⚠️ RESEND_TEST_MODE is on but RESEND_TEST_RECIPIENT is unset — using real recipients.');
      return recipients;
    }
    console.warn(`⚠️ RESEND_TEST_MODE is on — rerouting ${recipients.length} recipient(s) to ${verifiedTestEmail}`);
    return [verifiedTestEmail];
  }
  return recipients;
}

/** Resend v6 resolves `{ data, error }` — it does NOT throw on API errors. */
function describeResendError(error: unknown): string {
  if (!error) return 'Unknown Resend error';
  if (error instanceof Error) return error.message;
  if (typeof error === 'object') {
    const e = error as { name?: string; message?: string };
    return [e.name, e.message].filter(Boolean).join(': ') || JSON.stringify(error);
  }
  return String(error);
}

// ─── Order Confirmation Email (to customer — only if email exists) ────

export async function sendOrderConfirmationEmail(data: OrderEmailData): Promise<{ success: boolean; error?: string }> {
  if (!data.customerEmail) {
    return { success: true }; // No customer email — skip silently
  }

  try {
    const html = buildOrderEmailHtml({
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      orderId: data.orderId,
      orderItems: data.orderItems,
      subtotal: data.subtotal,
      shippingCost: data.shippingCost,
      codFee: data.codFee,
      discountAmount: data.discountAmount,
      promoCode: data.promoCode,
      deliveryNotes: data.deliveryNotes,
      totalAmount: data.totalAmount,
      paymentMethod: data.paymentMethod,
      shippingAddress: data.shippingAddress,
      customerPhone: data.customerPhone,
    });

    const res = await getResend().emails.send({
      from: getFromEmail(),
      to: sanitizeRecipients([data.customerEmail]),
      subject: `Order Confirmed — #${data.orderId}`,
      html,
    });

    if (res.error) {
      const message = describeResendError(res.error);
      console.error(`❌ Customer email rejected by Resend for order #${data.orderId}:`, res.error);
      return { success: false, error: message };
    }

    console.log(`✅ Customer email sent for order #${data.orderId}:`, res.data?.id);
    return { success: true };
  } catch (err) {
    console.error('❌ Customer email failed:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to send email' };
  }
}

// ─── Admin Order Notification (ALWAYS fires — regardless of customer email) ──

export async function sendAdminOrderNotification(data: OrderEmailData): Promise<{ success: boolean; error?: string }> {
  const adminEmails = await getAdminEmails();

  if (adminEmails.length === 0) {
    console.warn('⚠️ No admin emails configured — skipping admin notification');
    return { success: false, error: 'No admin emails' };
  }

  try {
    const html = buildAdminOrderEmailHtml({
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      orderId: data.orderId,
      orderItems: data.orderItems,
      subtotal: data.subtotal,
      shippingCost: data.shippingCost,
      codFee: data.codFee,
      discountAmount: data.discountAmount,
      promoCode: data.promoCode,
      deliveryNotes: data.deliveryNotes,
      totalAmount: data.totalAmount,
      paymentMethod: data.paymentMethod,
      shippingAddress: data.shippingAddress,
      customerPhone: data.customerPhone,
    });

    const targetRecipients = sanitizeRecipients(adminEmails);
    console.log(`📧 Sending admin notification for order #${data.orderId} from "${getFromEmail()}" to:`, targetRecipients);

    const res = await getResend().emails.send({
      from: getFromEmail(),
      to: targetRecipients,
      subject: `New Order #${data.orderId} — ${data.customerName} — L.E ${data.totalAmount.toLocaleString()}`,
      html,
    });

    if (res.error) {
      const message = describeResendError(res.error);
      console.error(`❌ Admin notification rejected by Resend for order #${data.orderId}:`, res.error);
      return { success: false, error: message };
    }

    console.log(`✅ Admin notification sent for order #${data.orderId}:`, res.data?.id);
    return { success: true };
  } catch (err) {
    console.error('❌ Admin notification email failed:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to send admin email' };
  }
}

// ─── HTML Templates ───────────────────────────────────────────

function buildNewsletterHtml(heading: string, message: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
    <tr>
      <td style="background:#1c1917;padding:32px 40px;text-align:center">
        <h1 style="color:#fff;margin:0;font-size:24px;font-weight:700;letter-spacing:-0.5px">Warda</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:40px">
        <h2 style="color:#1c1917;margin:0 0 16px;font-size:20px;font-weight:600">${heading}</h2>
        <div style="color:#44403c;font-size:15px;line-height:1.7">${message.replace(/\n/g, '<br>')}</div>
      </td>
    </tr>
    <tr>
      <td style="padding:24px 40px;background:#fafaf9;text-align:center;border-top:1px solid #e7e5e4">
        <p style="color:#a8a29e;font-size:12px;margin:0">You received this because you subscribed to Warda updates.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
