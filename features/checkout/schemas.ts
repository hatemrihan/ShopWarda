/**
 * Checkout Zod schemas.
 *
 * `placeOrderInputSchema` is the trust boundary for POST /api/orders. The
 * order service used to read the raw JSON body directly, so a hand-crafted
 * request could send `quantity: -3` (a negative line that lowered the total),
 * fractional quantities, or megabytes of text in any field.
 */

import { z } from 'zod';
import { bouquetConfigSchema } from '@/features/bouquet/schemas';

import { EGYPT_PHONE_REGEX } from './phone';

export { EGYPT_PHONE_REGEX };

/** Most units of a single line a guest can order in one checkout. */
export const MAX_LINE_QUANTITY = 99;
/** Most distinct lines in one order. */
export const MAX_ORDER_LINES = 50;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

const quantitySchema = z
  .number({ message: 'Quantity must be a number' })
  .int('Quantity must be a whole number')
  .min(1, 'Quantity must be at least 1')
  .max(MAX_LINE_QUANTITY, `You can order at most ${MAX_LINE_QUANTITY} of one item`);

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

const catalogItemSchema = z.object({
  kind: z.literal('catalog').optional(),
  productId: objectIdSchema,
  // Older carts stored no variant id; the service falls back to the product's
  // default variant when this does not match one.
  variantId: z.string().max(64).optional(),
  quantity: quantitySchema,
});

const bouquetItemSchema = z.object({
  kind: z.literal('bouquet'),
  config: bouquetConfigSchema,
  quantity: quantitySchema,
});

export const placeOrderInputSchema = z.object({
  customer: z.object({
    name: z.string().trim().min(2, 'Please enter your full name').max(100),
    phone: z
      .string()
      .trim()
      .regex(EGYPT_PHONE_REGEX, 'Enter a valid Egyptian mobile number (01XXXXXXXXX)'),
    email: z
      .union([z.literal(''), z.string().trim().email('Enter a valid e-mail address').max(200)])
      .optional()
      .transform((v) => (v ? v.toLowerCase() : undefined)),
  }),
  address: z.object({
    governorate: z.string().trim().min(1, 'Select a governorate').max(100),
    city: z.string().trim().min(1, 'City is required').max(100),
    area: optionalText(200),
    street: z.string().trim().min(1, 'Street address is required').max(300),
    building: optionalText(50),
    floor: optionalText(20),
    apartment: optionalText(20),
    landmark: optionalText(200),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
  }),
  items: z
    .array(z.union([bouquetItemSchema, catalogItemSchema]))
    .min(1, 'Your bag is empty')
    .max(MAX_ORDER_LINES, 'Too many items in one order'),
  paymentMethod: z.enum(['cod', 'instapay'], { message: 'Select a payment method' }),
  idempotencyKey: z.string().max(200).optional(),
  promoCode: optionalText(50),
  deliveryNotes: optionalText(500),
  customerNote: optionalText(500),
  // Only keys minted by /api/upload/screenshot are accepted. This used to be
  // stored verbatim and later rendered as a link in the admin order table, so
  // a guest could plant an arbitrary URL there.
  instaPayAssetKey: z
    .string()
    .regex(/^proofs\/\d{4}-\d{2}-\d{2}\/[\w-]+\.(jpg|png|webp|pdf)$/, 'Invalid payment proof')
    .optional(),
  instaPayMime: z.string().max(100).optional(),
  instaPaySize: z.number().int().min(0).optional(),
});

export type ValidatedPlaceOrderInput = z.infer<typeof placeOrderInputSchema>;
