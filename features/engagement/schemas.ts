/**
 * Engagement Zod schemas.
 */

import { z } from 'zod';

export const contactFormSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional(),
  subject: z.string().max(200).optional(),
  message: z.string().min(10).max(2000).trim(),
});

export const subscribeSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  source: z.enum(['checkout', 'popup', 'footer', 'admin']).default('footer'),
});

export type ContactFormInput = z.infer<typeof contactFormSchema>;
export type SubscribeInput = z.infer<typeof subscribeSchema>;
