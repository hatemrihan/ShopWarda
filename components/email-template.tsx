export interface OrderEmailTemplateProps {
  customerName: string;
  customerEmail?: string;
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

/**
 * Item sub-line: size/colour for catalog items, and the full attribute map,
 * which is how a custom bouquet's composition arrives here.
 */
function itemDetailsHtml(item: OrderEmailTemplateProps['orderItems'][number]): string {
  const attrs = item.attributes ? Object.entries(item.attributes) : [];

  if (attrs.length > 0) {
    const lines = attrs
      .map(([label, value]) => `<div>${escapeHtml(label)}: ${escapeHtml(String(value))}</div>`)
      .join('');
    return `<div style="font-size:12px;color:#78716c;margin-top:4px;line-height:1.6">${lines}</div>`;
  }

  if (item.size || item.color) {
    return `<div style="font-size:12px;color:#78716c;margin-top:2px">${item.size ? `Size: ${escapeHtml(item.size)}` : ''} ${item.color ? `\u00b7 Color: ${escapeHtml(item.color)}` : ''}</div>`;
  }

  return '';
}

/** Order data is customer-supplied; never interpolate it raw into HTML. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * The florist handwrites the card, so the message must be impossible to miss
 * in the admin email. It arrives as a "Card" attribute on a bouquet item.
 */
function cardMessagesOf(data: OrderEmailTemplateProps): string[] {
  return data.orderItems
    .map((i) => i.attributes?.['Card'])
    .filter((m): m is string => Boolean(m && m.trim()));
}

export function buildOrderEmailHtml(data: OrderEmailTemplateProps): string {
  const itemsHtml = data.orderItems.map((item) => `
    <tr style="border-bottom:1px solid #f5f5f4">
      <td style="padding:12px 0">
        <div style="font-weight:600;font-size:14px;color:#1c1917">${item.name}</div>
        ${itemDetailsHtml(item)}
      </td>
      <td style="text-align:center;padding:12px 0;font-size:14px;color:#1c1917">${item.quantity}</td>
      <td style="text-align:right;padding:12px 0;font-size:14px;font-weight:600;color:#1c1917">EGP ${(item.price * item.quantity).toLocaleString()}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:40px 20px;background:#fafaf9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e7e5e4">
    <div style="background:#1c1917;padding:28px;text-align:center">
      <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;letter-spacing:2px;text-transform:uppercase">WARDA</h1>
      <p style="color:#a8a29e;margin:6px 0 0;font-size:13px;text-transform:uppercase;letter-spacing:1px">Order Confirmation #${data.orderId}</p>
    </div>
    <div style="padding:32px">
      <h2 style="color:#1c1917;font-size:18px;margin:0 0 12px">Thank you for your order, ${data.customerName}!</h2>
      <p style="color:#57534e;font-size:14px;line-height:1.6;margin:0 0 24px">We have received your order and are currently preparing it for delivery. Below are your order details:</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
        <thead>
          <tr style="border-bottom:2px solid #e7e5e4">
            <th style="text-align:left;padding:8px 0;font-size:12px;text-transform:uppercase;color:#78716c">Item</th>
            <th style="text-align:center;padding:8px 0;font-size:12px;text-transform:uppercase;color:#78716c">Qty</th>
            <th style="text-align:right;padding:8px 0;font-size:12px;text-transform:uppercase;color:#78716c">Price</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>
      <div style="background:#fafaf9;padding:16px;border-radius:8px;margin-bottom:24px">
        <div style="display:flex;justify-content:space-between;font-size:13px;color:#57534e;margin-bottom:8px"><span>Subtotal</span><span>EGP ${data.subtotal.toLocaleString()}</span></div>
        ${data.discountAmount > 0 ? `<div style="display:flex;justify-content:space-between;font-size:13px;color:#15803d;margin-bottom:8px"><span>Discount${data.promoCode ? ` (${escapeHtml(data.promoCode)})` : ''}</span><span>-EGP ${data.discountAmount.toLocaleString()}</span></div>` : ''}
        <div style="display:flex;justify-content:space-between;font-size:13px;color:#57534e;margin-bottom:8px"><span>Shipping</span><span>${data.shippingCost > 0 ? `EGP ${data.shippingCost.toLocaleString()}` : 'FREE'}</span></div>
        ${data.codFee > 0 ? `<div style="display:flex;justify-content:space-between;font-size:13px;color:#57534e;margin-bottom:8px"><span>COD Fee</span><span>EGP ${data.codFee.toLocaleString()}</span></div>` : ''}
        <div style="display:flex;justify-content:space-between;font-size:15px;font-weight:700;color:#1c1917;border-top:1px solid #e7e5e4;padding-top:10px;margin-top:6px"><span>Total</span><span>EGP ${data.totalAmount.toLocaleString()}</span></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;font-size:13px">
        <div style="border:1px solid #e7e5e4;padding:14px;border-radius:8px">
          <div style="font-weight:700;font-size:11px;text-transform:uppercase;color:#78716c;margin-bottom:6px">Delivery Address</div>
          <div style="color:#1c1917;line-height:1.4">${data.shippingAddress.address}<br />${data.shippingAddress.city}, ${data.shippingAddress.governorate}<br />Phone: ${data.customerPhone}</div>
        </div>
        <div style="border:1px solid #e7e5e4;padding:14px;border-radius:8px">
          <div style="font-weight:700;font-size:11px;text-transform:uppercase;color:#78716c;margin-bottom:6px">Payment Method</div>
          <div style="color:#1c1917;font-weight:600;text-transform:uppercase">${data.paymentMethod}</div>
        </div>
      </div>
    </div>
    <div style="background:#f5f5f4;padding:20px;text-align:center;border-top:1px solid #e7e5e4;font-size:12px;color:#a8a29e">Thank you for shopping with Warda!</div>
  </div>
</body>
</html>`;
}

export function buildAdminOrderEmailHtml(data: OrderEmailTemplateProps): string {
  const itemsHtml = data.orderItems.map((item) => `
    <tr style="border-bottom:1px solid #f4f4f5">
      <td style="padding:10px 0;font-size:13px;color:#09090b;font-weight:600">${item.name} x ${item.quantity}${itemDetailsHtml(item)}</td>
      <td style="padding:10px 0;font-size:13px;color:#09090b;text-align:right;font-weight:600">EGP ${(item.price * item.quantity).toLocaleString()}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:30px 15px;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7">
    <div style="background:#09090b;padding:24px;text-align:center">
      <h1 style="color:#ffffff;margin:0;font-size:20px;font-weight:700">🛒 New Order Alert #${data.orderId}</h1>
      <p style="color:#a1a1aa;margin:4px 0 0;font-size:13px">Amount: L.E ${data.totalAmount.toLocaleString()}</p>
    </div>
    <div style="padding:28px">
      <div style="background:#f4f4f5;padding:16px;border-radius:8px;margin-bottom:20px;font-size:14px">
        <div style="font-weight:700;color:#09090b;margin-bottom:4px">Customer Info</div>
        <div style="color:#3f3f46"><strong>Name:</strong> ${data.customerName}</div>
        <div style="color:#3f3f46"><strong>Phone:</strong> ${data.customerPhone}</div>
        ${data.customerEmail ? `<div style="color:#3f3f46"><strong>Email:</strong> ${data.customerEmail}</div>` : ''}
        <div style="color:#3f3f46;margin-top:6px"><strong>Address:</strong> ${data.shippingAddress.address}, ${data.shippingAddress.city}, ${data.shippingAddress.governorate}</div>
        <div style="color:#3f3f46;margin-top:4px"><strong>Payment:</strong> <span style="text-transform:uppercase;font-weight:600">${data.paymentMethod}</span></div>
      </div>
      <h3 style="font-size:14px;font-weight:700;text-transform:uppercase;color:#71717a;margin:0 0 10px">Order Items</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
        <tbody>${itemsHtml}</tbody>
      </table>
      <div style="border-top:2px solid #e4e4e7;padding-top:12px;font-size:14px">
        <div style="display:flex;justify-content:space-between;color:#52525b;margin-bottom:4px"><span>Subtotal</span><span>EGP ${data.subtotal.toLocaleString()}</span></div>
        ${data.discountAmount > 0 ? `<div style="display:flex;justify-content:space-between;color:#16a34a;margin-bottom:4px"><span>Discount${data.promoCode ? ` (${escapeHtml(data.promoCode)})` : ''}</span><span>-EGP ${data.discountAmount.toLocaleString()}</span></div>` : ''}
        <div style="display:flex;justify-content:space-between;color:#52525b;margin-bottom:4px"><span>Shipping</span><span>EGP ${data.shippingCost.toLocaleString()}</span></div>
        ${data.codFee > 0 ? `<div style="display:flex;justify-content:space-between;color:#52525b;margin-bottom:4px"><span>COD Fee</span><span>EGP ${data.codFee.toLocaleString()}</span></div>` : ''}
        <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:800;color:#09090b;margin-top:8px;padding-top:8px;border-top:1px solid #e4e4e7"><span>Total Amount</span><span>EGP ${data.totalAmount.toLocaleString()}</span></div>
      </div>

      ${cardMessagesOf(data).map((msg) => `
        <div style="margin-top:16px;padding:16px;background:#fffbeb;border:2px solid #f59e0b;border-radius:8px">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#b45309;font-weight:700;margin-bottom:8px">\u270D Handwritten card \u2014 write this out</div>
          <div style="font-size:15px;color:#1c1917;line-height:1.6;white-space:pre-wrap">${escapeHtml(msg)}</div>
        </div>
      `).join('')}

      ${data.deliveryNotes ? `
        <div style="margin-top:16px;padding:12px;background:#f4f4f5;border-radius:8px">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#71717a;font-weight:700;margin-bottom:6px">Delivery notes</div>
          <div style="font-size:13px;color:#3f3f46;line-height:1.6;white-space:pre-wrap">${escapeHtml(data.deliveryNotes)}</div>
        </div>
      ` : ''}
    </div>
  </div>
</body>
</html>`;
}
