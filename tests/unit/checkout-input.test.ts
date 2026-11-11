import { describe, it, expect } from 'vitest';
import { placeOrderInputSchema } from '@/features/checkout/schemas';
import { toAdminStatus, toStoredStatus } from '@/features/checkout/order-status';
import { pageHref, parsePage, parseSort } from '@/features/catalog/listing';

const PRODUCT_ID = '64b7f0c2a1b2c3d4e5f60718';

function validOrder(overrides: Record<string, unknown> = {}) {
  return {
    customer: { name: 'Mona Ali', phone: '01012345678', email: 'Mona@Example.com' },
    address: { governorate: 'Cairo', city: 'Maadi', street: '9 Road 9' },
    items: [{ productId: PRODUCT_ID, variantId: PRODUCT_ID, quantity: 2 }],
    paymentMethod: 'cod',
    ...overrides,
  };
}

describe('placeOrderInputSchema', () => {
  it('accepts a well-formed order and normalises it', () => {
    const parsed = placeOrderInputSchema.parse(validOrder());
    expect(parsed.customer.email).toBe('mona@example.com');
    expect(parsed.address.area).toBeUndefined();
  });

  it('treats an empty e-mail as "not provided"', () => {
    const parsed = placeOrderInputSchema.parse(
      validOrder({ customer: { name: 'Mona Ali', phone: '01012345678', email: '' } }),
    );
    expect(parsed.customer.email).toBeUndefined();
  });

  // The regression that mattered: a negative line lowered the order total.
  it.each([-3, 0, 1.5, 1000])('rejects quantity %s', (quantity) => {
    const result = placeOrderInputSchema.safeParse(
      validOrder({ items: [{ productId: PRODUCT_ID, quantity }] }),
    );
    expect(result.success).toBe(false);
  });

  it('rejects an empty bag', () => {
    expect(placeOrderInputSchema.safeParse(validOrder({ items: [] })).success).toBe(false);
  });

  it('rejects a product id that is not an ObjectId', () => {
    const result = placeOrderInputSchema.safeParse(
      validOrder({ items: [{ productId: 'not-an-id', quantity: 1 }] }),
    );
    expect(result.success).toBe(false);
  });

  it.each(['0101234567', '02012345678', '+201012345678', 'abc'])(
    'rejects phone %s',
    (phone) => {
      const result = placeOrderInputSchema.safeParse(
        validOrder({ customer: { name: 'Mona Ali', phone } }),
      );
      expect(result.success).toBe(false);
    },
  );

  it('rejects an unknown payment method', () => {
    expect(placeOrderInputSchema.safeParse(validOrder({ paymentMethod: 'card' })).success).toBe(false);
  });

  it('accepts a proof key minted by the upload route', () => {
    const result = placeOrderInputSchema.safeParse(
      validOrder({ paymentMethod: 'instapay', instaPayAssetKey: 'proofs/2026-11-11/AbC_123-xyz.jpg' }),
    );
    expect(result.success).toBe(true);
  });

  it.each([
    'https://evil.example/x.jpg',
    'javascript:alert(1)',
    'products/2026-11-11/abc.jpg',
    'proofs/../secrets.jpg',
  ])('rejects proof key %s', (instaPayAssetKey) => {
    const result = placeOrderInputSchema.safeParse(
      validOrder({ paymentMethod: 'instapay', instaPayAssetKey }),
    );
    expect(result.success).toBe(false);
  });

  it('accepts a bouquet line', () => {
    const result = placeOrderInputSchema.safeParse(
      validOrder({
        items: [
          {
            kind: 'bouquet',
            quantity: 1,
            config: { flowers: [{ flowerId: PRODUCT_ID, colorKey: 'red', qty: 7 }], wrapId: PRODUCT_ID },
          },
        ],
      }),
    );
    expect(result.success).toBe(true);
  });
});

describe('order status translation', () => {
  it('maps stored statuses to the admin labels', () => {
    expect(toAdminStatus('new')).toBe('pending');
    expect(toAdminStatus('processing')).toBe('confirmed');
    expect(toAdminStatus('shipped')).toBe('shipped');
    expect(toAdminStatus('delivered')).toBe('delivered');
    expect(toAdminStatus('cancelled')).toBe('cancelled');
  });

  it('tolerates legacy rows and missing values', () => {
    expect(toAdminStatus('confirmed')).toBe('confirmed');
    expect(toAdminStatus(undefined)).toBe('pending');
    expect(toAdminStatus('nonsense')).toBe('pending');
  });

  it('maps admin labels back to stored statuses', () => {
    expect(toStoredStatus('pending')).toBe('new');
    expect(toStoredStatus('confirmed')).toBe('processing');
    expect(toStoredStatus('processing')).toBe('processing');
    expect(toStoredStatus('delivered')).toBe('delivered');
  });

  it('refuses anything that is not a status', () => {
    expect(toStoredStatus('refunded')).toBeNull();
    expect(toStoredStatus('')).toBeNull();
    expect(toStoredStatus(null)).toBeNull();
  });

  it('round-trips every stored status', () => {
    for (const status of ['new', 'processing', 'shipped', 'delivered', 'cancelled']) {
      expect(toStoredStatus(toAdminStatus(status))).toBe(status);
    }
  });
});

describe('listing URL helpers', () => {
  it('defaults to newest-first, page 1', () => {
    expect(parseSort({})).toEqual({ sortBy: 'createdAt', sortOrder: 'desc' });
    expect(parsePage({})).toBe(1);
  });

  it('ignores an unknown sort and a bad page', () => {
    expect(parseSort({ sort: 'drop-table' })).toEqual({ sortBy: 'createdAt', sortOrder: 'desc' });
    expect(parsePage({ page: '-4' })).toBe(1);
    expect(parsePage({ page: 'abc' })).toBe(1);
    expect(parsePage({ page: '3' })).toBe(3);
  });

  it('keeps filters when moving between pages', () => {
    const params = { sort: 'price-asc', cat: ['a', 'b'], page: '2' };
    expect(pageHref('/shop', params, 3)).toBe('/shop?sort=price-asc&cat=a&cat=b&page=3');
  });

  it('gives page 1 its bare URL', () => {
    expect(pageHref('/shop', { page: '2' }, 1)).toBe('/shop');
    expect(pageHref('/shop', { sort: 'name-asc', page: '2' }, 1)).toBe('/shop?sort=name-asc');
  });
});
