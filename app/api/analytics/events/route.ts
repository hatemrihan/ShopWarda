import { NextRequest, NextResponse, after } from 'next/server';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import connectDB from '@/lib/db/mongoose';
import { AnalyticsEvent } from '@/lib/db/models/analytics-event.model';

/**
 * POST /api/analytics/events
 * Public: first-party storefront events for the admin Funnel page.
 *
 * This route was a stub that returned `{ success: true }` and stored nothing,
 * which is why the Funnel page never had any data to show.
 *
 * It stores no personal data: an anonymous per-tab id, the event name, the
 * page path and a few scalar properties. Rows expire after 90 days (TTL
 * index on the model).
 */

const EVENTS = [
  'PageView',
  'ViewContent',
  'AddToCart',
  'InitiateCheckout',
  'AddPaymentInfo',
  'Purchase',
] as const;

const scalar = z.union([z.string().max(200), z.number().finite(), z.boolean()]);

const eventSchema = z.object({
  event: z.enum(EVENTS),
  sessionId: z.string().min(1).max(64),
  path: z.string().max(300).optional(),
  referrer: z.string().max(500).optional(),
  properties: z.record(z.string().max(40), scalar).optional(),
});

/** Crawlers and uptime checks would otherwise dominate the funnel's top row. */
const BOT_PATTERN = /bot|crawl|spider|slurp|preview|monitor|headless|lighthouse|pingdom|vercel-/i;

const MAX_PROPERTIES = 20;

export async function POST(req: NextRequest) {
  // Always 204: analytics must never surface an error to a shopper, and a
  // caller learns nothing about what was accepted.
  const accepted = new NextResponse(null, { status: 204 });

  if (BOT_PATTERN.test(req.headers.get('user-agent') ?? '')) return accepted;

  let payload: unknown;
  try {
    // sendBeacon may deliver the JSON as a blob; read it as text either way.
    const text = await req.text();
    if (text.length > 4000) return accepted;
    payload = JSON.parse(text);
  } catch {
    return accepted;
  }

  const parsed = eventSchema.safeParse(payload);
  if (!parsed.success) return accepted;

  const { event, sessionId, path, referrer, properties } = parsed.data;

  const props = Object.fromEntries(Object.entries(properties ?? {}).slice(0, MAX_PROPERTIES));
  if (path) props.path = path;

  // Write after the response is sent — the shopper's request is not held
  // open for a database round-trip.
  after(async () => {
    try {
      await connectDB();
      await AnalyticsEvent.create({
        eventId: nanoid(16),
        anonymousSessionId: sessionId,
        event,
        properties: props,
        referrer,
        occurredAt: new Date(),
      });
    } catch (error) {
      console.error('[POST /api/analytics/events]', error);
    }
  });

  return accepted;
}
