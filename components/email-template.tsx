import * as React from 'react';

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

export const OrderEmailTemplate: React.FC<OrderEmailTemplateProps> = ({
  customerName,
  orderId,
  orderItems,
  subtotal,
  shippingCost,
  codFee,
  discountAmount,
  totalAmount,
  paymentMethod,
  shippingAddress,
  customerPhone,
}) => {
  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', backgroundColor: '#fafaf9', padding: '40px 20px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e7e5e4' }}>
        {/* Header */}
        <div style={{ backgroundColor: '#1c1917', padding: '28px', textAlign: 'center' }}>
          <h1 style={{ color: '#ffffff', margin: 0, fontSize: '22px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' }}>
            WARDA
          </h1>
          <p style={{ color: '#a8a29e', margin: '6px 0 0', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Order Confirmation #{orderId}
          </p>
        </div>

        {/* Body Content */}
        <div style={{ padding: '32px' }}>
          <h2 style={{ color: '#1c1917', fontSize: '18px', margin: '0 0 12px' }}>
            Thank you for your order, {customerName}!
          </h2>
          <p style={{ color: '#57534e', fontSize: '14px', lineHeight: '1.6', margin: '0 0 24px' }}>
            We have received your order and are currently preparing it for delivery. Below are your order details:
          </p>

          {/* Items Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e7e5e4' }}>
                <th style={{ textAlign: 'left', padding: '8px 0', fontSize: '12px', textTransform: 'uppercase', color: '#78716c' }}>Item</th>
                <th style={{ textAlign: 'center', padding: '8px 0', fontSize: '12px', textTransform: 'uppercase', color: '#78716c' }}>Qty</th>
                <th style={{ textAlign: 'right', padding: '8px 0', fontSize: '12px', textTransform: 'uppercase', color: '#78716c' }}>Price</th>
              </tr>
            </thead>
            <tbody>
              {orderItems.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f5f5f4' }}>
                  <td style={{ padding: '12px 0' }}>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: '#1c1917' }}>{item.name}</div>
                    {(item.size || item.color) && (
                      <div style={{ fontSize: '12px', color: '#78716c', marginTop: '2px' }}>
                        {item.size && `Size: ${item.size}`} {item.color && `· Color: ${item.color}`}
                      </div>
                    )}
                  </td>
                  <td style={{ textAlign: 'center', padding: '12px 0', fontSize: '14px', color: '#1c1917' }}>{item.quantity}</td>
                  <td style={{ textAlign: 'right', padding: '12px 0', fontSize: '14px', fontWeight: 600, color: '#1c1917' }}>
                    EGP {(item.price * item.quantity).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pricing Totals */}
          <div style={{ backgroundColor: '#fafaf9', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#57534e', marginBottom: '8px' }}>
              <span>Subtotal</span>
              <span>EGP {subtotal.toLocaleString()}</span>
            </div>
            {discountAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#15803d', marginBottom: '8px' }}>
                <span>Discount</span>
                <span>-EGP {discountAmount.toLocaleString()}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#57534e', marginBottom: '8px' }}>
              <span>Shipping</span>
              <span>{shippingCost > 0 ? `EGP ${shippingCost.toLocaleString()}` : 'FREE'}</span>
            </div>
            {codFee > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#57534e', marginBottom: '8px' }}>
                <span>COD Fee</span>
                <span>EGP {codFee.toLocaleString()}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 700, color: '#1c1917', borderTop: '1px solid #e7e5e4', paddingTop: '10px', marginTop: '6px' }}>
              <span>Total</span>
              <span>EGP {totalAmount.toLocaleString()}</span>
            </div>
          </div>

          {/* Delivery & Payment Info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '13px' }}>
            <div style={{ border: '1px solid #e7e5e4', padding: '14px', borderRadius: '8px' }}>
              <div style={{ fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', color: '#78716c', marginBottom: '6px' }}>Delivery Address</div>
              <div style={{ color: '#1c1917', lineHeight: '1.4' }}>
                {shippingAddress.address}<br />
                {shippingAddress.city}, {shippingAddress.governorate}<br />
                Phone: {customerPhone}
              </div>
            </div>
            <div style={{ border: '1px solid #e7e5e4', padding: '14px', borderRadius: '8px' }}>
              <div style={{ fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', color: '#78716c', marginBottom: '6px' }}>Payment Method</div>
              <div style={{ color: '#1c1917', fontWeight: 600, textTransform: 'uppercase' }}>
                {paymentMethod}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ backgroundColor: '#f5f5f4', padding: '20px', textAlign: 'center', borderTop: '1px solid #e7e5e4', fontSize: '12px', color: '#a8a29e' }}>
          Thank you for shopping with Warda!
        </div>
      </div>
    </div>
  );
};

export const AdminOrderEmailTemplate: React.FC<OrderEmailTemplateProps> = ({
  customerName,
  customerEmail,
  orderId,
  orderItems,
  subtotal,
  shippingCost,
  codFee,
  discountAmount,
  totalAmount,
  paymentMethod,
  shippingAddress,
  customerPhone,
}) => {
  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', backgroundColor: '#f4f4f5', padding: '30px 15px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e4e4e7' }}>
        {/* Header */}
        <div style={{ backgroundColor: '#09090b', padding: '24px', textAlign: 'center' }}>
          <h1 style={{ color: '#ffffff', margin: 0, fontSize: '20px', fontWeight: 700 }}>
            🛒 New Order Alert #{orderId}
          </h1>
          <p style={{ color: '#a1a1aa', margin: '4px 0 0', fontSize: '13px' }}>
            Amount: L.E {totalAmount.toLocaleString()}
          </p>
        </div>

        <div style={{ padding: '28px' }}>
          {/* Customer Summary */}
          <div style={{ backgroundColor: '#f4f4f5', padding: '16px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>
            <div style={{ fontWeight: 700, color: '#09090b', marginBottom: '4px' }}>Customer Info</div>
            <div style={{ color: '#3f3f46' }}><strong>Name:</strong> {customerName}</div>
            <div style={{ color: '#3f3f46' }}><strong>Phone:</strong> {customerPhone}</div>
            {customerEmail && <div style={{ color: '#3f3f46' }}><strong>Email:</strong> {customerEmail}</div>}
            <div style={{ color: '#3f3f46', marginTop: '6px' }}>
              <strong>Address:</strong> {shippingAddress.address}, {shippingAddress.city}, {shippingAddress.governorate}
            </div>
            <div style={{ color: '#3f3f46', marginTop: '4px' }}>
              <strong>Payment:</strong> <span style={{ textTransform: 'uppercase', fontWeight: 600 }}>{paymentMethod}</span>
            </div>
          </div>

          {/* Items */}
          <h3 style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', color: '#71717a', margin: '0 0 10px' }}>Order Items</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
            <tbody>
              {orderItems.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f4f4f5' }}>
                  <td style={{ padding: '10px 0', fontSize: '13px', color: '#09090b', fontWeight: 600 }}>
                    {item.name} x {item.quantity}
                  </td>
                  <td style={{ padding: '10px 0', fontSize: '13px', color: '#09090b', textAlign: 'right', fontWeight: 600 }}>
                    EGP {(item.price * item.quantity).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pricing */}
          <div style={{ borderTop: '2px solid #e4e4e7', paddingTop: '12px', fontSize: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#52525b', marginBottom: '4px' }}>
              <span>Subtotal</span><span>EGP {subtotal.toLocaleString()}</span>
            </div>
            {discountAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', marginBottom: '4px' }}>
                <span>Discount</span><span>-EGP {discountAmount.toLocaleString()}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#52525b', marginBottom: '4px' }}>
              <span>Shipping</span><span>EGP {shippingCost.toLocaleString()}</span>
            </div>
            {codFee > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#52525b', marginBottom: '4px' }}>
                <span>COD Fee</span><span>EGP {codFee.toLocaleString()}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 800, color: '#09090b', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e4e4e7' }}>
              <span>Total Amount</span><span>EGP {totalAmount.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export function buildOrderEmailHtml(data: OrderEmailTemplateProps): string {
  const itemsHtml = data.orderItems.map((item) => `
    <tr style="border-bottom:1px solid #f5f5f4">
      <td style="padding:12px 0">
        <div style="font-weight:600;font-size:14px;color:#1c1917">${item.name}</div>
        ${(item.size || item.color) ? `<div style="font-size:12px;color:#78716c;margin-top:2px">${item.size ? `Size: ${item.size}` : ''} ${item.color ? `· Color: ${item.color}` : ''}</div>` : ''}
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
        ${data.discountAmount > 0 ? `<div style="display:flex;justify-content:space-between;font-size:13px;color:#15803d;margin-bottom:8px"><span>Discount</span><span>-EGP ${data.discountAmount.toLocaleString()}</span></div>` : ''}
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
      <td style="padding:10px 0;font-size:13px;color:#09090b;font-weight:600">${item.name} x ${item.quantity}</td>
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
        ${data.discountAmount > 0 ? `<div style="display:flex;justify-content:space-between;color:#16a34a;margin-bottom:4px"><span>Discount</span><span>-EGP ${data.discountAmount.toLocaleString()}</span></div>` : ''}
        <div style="display:flex;justify-content:space-between;color:#52525b;margin-bottom:4px"><span>Shipping</span><span>EGP ${data.shippingCost.toLocaleString()}</span></div>
        ${data.codFee > 0 ? `<div style="display:flex;justify-content:space-between;color:#52525b;margin-bottom:4px"><span>COD Fee</span><span>EGP ${data.codFee.toLocaleString()}</span></div>` : ''}
        <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:800;color:#09090b;margin-top:8px;padding-top:8px;border-top:1px solid #e4e4e7"><span>Total Amount</span><span>EGP ${data.totalAmount.toLocaleString()}</span></div>
      </div>
    </div>
  </div>
</body>
</html>`;
}
