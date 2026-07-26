/**
 * Lightweight server-side analytics event tracking.
 * Writes to MongoDB AnalyticsEvent collection.
 */

import connectDB from '@/lib/db/mongoose';
import { AnalyticsEvent } from '@/lib/db/models/analytics-event.model';
import logger from '@/lib/logger';
import { nanoid } from 'nanoid';

export type EventType =
  | 'page_view'
  | 'product_view'
  | 'add_to_cart'
  | 'checkout_start'
  | 'order_placed'
  | 'search'
  | 'contact_form'
  | 'newsletter_subscribe';

interface TrackOptions {
  event: EventType;
  sessionId?: string;
  properties?: Record<string, string | number | boolean>;
  entityType?: string;
  entityId?: string;
  referrer?: string;
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
  };
}

/**
 * Track an analytics event. Fire-and-forget — never blocks the response.
 */
export function trackEvent(options: TrackOptions): void {
  // Don't await — write asynchronously
  void (async () => {
    try {
      await connectDB();
      await AnalyticsEvent.create({
        eventId: nanoid(16),
        anonymousSessionId: options.sessionId ?? nanoid(12),
        event: options.event,
        properties: options.properties ?? {},
        entityType: options.entityType,
        entityId: options.entityId,
        referrer: options.referrer,
        utm: options.utm,
        occurredAt: new Date(),
      });
    } catch (error) {
      // Never throw from analytics — just log
      logger.error('Analytics tracking failed', { error, event: options.event });
    }
  })();
}
