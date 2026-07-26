/**
 * Checkout Zod schemas.
 */

import { z } from 'zod';
import { getEnabledGovernorates } from '@/config/shipping';

const governorates = getEnabledGovernorates();

export const egyptAddressSchema = z.object({
  governorate: z.string().refine((v) => governorates.includes(v), {
    message: 'Invalid or unsupported governorate',
  }),
  city: z.string().min(1).max(100).trim(),
  area: z.string().min(1).max(200).trim(),
  street: z.string().min(1).max(200).trim(),
  building: z.string().min(1).max(50).trim(),
  floor: z.string().max(10).optional(),
  apartment: z.string().max(10).optional(),
  landmark: z.string().max(200).optional(),
  postalCode: z.string().max(10).optional(),
});

export const guestInfoSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  phone: z.string().min(10).max(15).regex(/^01[0125]\d{8}$/, 'Invalid Egyptian phone number'),
  email: z.string().email().optional(),
});

export const placeOrderSchema = z.object({
  guest: guestInfoSchema,
  address: egyptAddressSchema,
  paymentMethod: z.enum(['cod', 'instapay']),
  customerNote: z.string().max(500).optional(),
  subscribeNewsletter: z.boolean().default(false),
});

export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;
