'use server';

/**
 * Engagement Server Actions — contact forms and newsletter.
 */

import connectDB from '@/lib/db/mongoose';
import { Contact } from '@/lib/db/models/contact.model';
import { Subscriber } from '@/lib/db/models/subscriber.model';
import {
  contactFormSchema,
  subscribeSchema,
  type ContactFormInput,
  type SubscribeInput,
} from '../schemas';
import { handleError } from '@/lib/errors';
import logger from '@/lib/logger';

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function submitContactAction(
  input: ContactFormInput
): Promise<ActionResult> {
  try {
    const parsed = contactFormSchema.parse(input);
    await connectDB();

    await Contact.create({
      name: parsed.name,
      phone: parsed.phone,
      email: parsed.email,
      subject: parsed.subject,
      message: parsed.message,
      status: 'new',
    });

    logger.info('Contact form submitted', { name: parsed.name });
    return { success: true, data: undefined };
  } catch (error) {
    const appError = handleError(error);
    return { success: false, error: appError.message };
  }
}

export async function subscribeAction(
  input: SubscribeInput
): Promise<ActionResult> {
  try {
    const parsed = subscribeSchema.parse(input);
    await connectDB();

    // Upsert — if already subscribed, reactivate
    await Subscriber.findOneAndUpdate(
      { emailNormalized: parsed.email },
      {
        $set: {
          status: 'active',
          source: parsed.source,
          unsubscribedAt: undefined,
        },
        $setOnInsert: {
          emailNormalized: parsed.email,
          consentAt: new Date(),
        },
      },
      { upsert: true }
    );

    logger.info('Newsletter subscribed', { email: parsed.email });
    return { success: true, data: undefined };
  } catch (error) {
    const appError = handleError(error);
    return { success: false, error: appError.message };
  }
}

export async function unsubscribeAction(
  email: string
): Promise<ActionResult> {
  try {
    await connectDB();
    await Subscriber.findOneAndUpdate(
      { emailNormalized: email.toLowerCase().trim() },
      { status: 'unsubscribed', unsubscribedAt: new Date() }
    );
    return { success: true, data: undefined };
  } catch (error) {
    const appError = handleError(error);
    return { success: false, error: appError.message };
  }
}
