import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import { AnalyticsEvent } from '@/lib/db/models/analytics-event.model';
import { Order } from '@/lib/db/models/order.model';
import { guardAdmin } from '@/lib/auth/api-guard';

// ─── GET /api/admin/funnel ────────────────────────────────────
//
// Everything is computed inside MongoDB. The previous version pulled every
// event of the period into the function's memory four separate times (and
// every order, to sum revenue), which grows without bound with traffic.

const STAGE_MAPPINGS: Record<string, string[]> = {
  PageView: ['page_view', 'PageView'],
  ViewContent: ['product_view', 'ViewContent'],
  AddToCart: ['add_to_cart', 'AddToCart'],
  InitiateCheckout: ['checkout_start', 'InitiateCheckout'],
  Purchase: ['order_placed', 'Purchase'],
};

const FUNNEL_STAGES = ['PageView', 'ViewContent', 'AddToCart', 'InitiateCheckout', 'Purchase'] as const;
type Stage = (typeof FUNNEL_STAGES)[number];

/** Raw event name → canonical stage name. */
const STAGE_OF: Record<string, Stage> = Object.fromEntries(
  FUNNEL_STAGES.flatMap((stage) => STAGE_MAPPINGS[stage].map((alias) => [alias, stage])),
);

const ALL_ALIASES = Object.keys(STAGE_OF);

/** `$switch` branches that fold event aliases into their stage. */
const stageExpr = {
  $switch: {
    branches: FUNNEL_STAGES.map((stage) => ({
      case: { $in: ['$event', STAGE_MAPPINGS[stage]] },
      then: stage,
    })),
    default: '$event',
  },
};

function parsePeriod(period: string | null): number {
  switch (period) {
    case '7d':
      return 7;
    case '90d':
      return 90;
    default:
      return 30;
  }
}

export async function GET(req: NextRequest) {
  const denied = await guardAdmin();
  if (denied) return denied;

  try {
    await connectDB();

    const days = parsePeriod(req.nextUrl.searchParams.get('period'));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const purchaseAliases = STAGE_MAPPINGS.Purchase;
    const cartAliases = STAGE_MAPPINGS.AddToCart;

    const [stageSessions, totalEvents, dailyAgg, abandonedAgg, revenueAgg] = await Promise.all([
      // 1. Unique sessions per stage.
      AnalyticsEvent.aggregate<{ _id: Stage; unique_sessions: number }>([
        { $match: { occurredAt: { $gte: since }, event: { $in: ALL_ALIASES } } },
        { $group: { _id: { stage: stageExpr, session: '$anonymousSessionId' } } },
        { $group: { _id: '$_id.stage', unique_sessions: { $sum: 1 } } },
      ]),

      // 2. Total events.
      AnalyticsEvent.countDocuments({ occurredAt: { $gte: since } }),

      // 3. Events per day per stage.
      AnalyticsEvent.aggregate<{ _id: { date: string; stage: string }; count: number }>([
        { $match: { occurredAt: { $gte: since } } },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$occurredAt' } },
              stage: stageExpr,
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.date': 1 } },
      ]),

      // 4. Products added to a cart in sessions that never purchased.
      AnalyticsEvent.aggregate<{ _id: string; name: string; count: number }>([
        {
          $match: {
            occurredAt: { $gte: since },
            event: { $in: [...cartAliases, ...purchaseAliases] },
          },
        },
        {
          $group: {
            _id: '$anonymousSessionId',
            purchased: { $max: { $cond: [{ $in: ['$event', purchaseAliases] }, 1, 0] } },
            carts: {
              $push: {
                $cond: [
                  { $in: ['$event', cartAliases] },
                  {
                    key: { $ifNull: ['$properties.productId', '$properties.content_name'] },
                    name: {
                      $ifNull: [
                        '$properties.content_name',
                        { $ifNull: ['$properties.productName', '$properties.name'] },
                      ],
                    },
                  },
                  '$$REMOVE',
                ],
              },
            },
          },
        },
        { $match: { purchased: 0 } },
        { $unwind: '$carts' },
        {
          $group: {
            _id: { $ifNull: ['$carts.key', 'unknown'] },
            name: { $first: { $ifNull: ['$carts.name', 'Unknown Product'] } },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),

      // 5. Revenue — from the orders themselves, the source of truth.
      Order.aggregate<{ _id: null; total: number }>([
        { $match: { createdAt: { $gte: since }, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$pricing.totalMinor' } } },
      ]),
    ]);

    const sessionsByStage = new Map(stageSessions.map((s) => [s._id, s.unique_sessions]));
    const funnel = FUNNEL_STAGES.map((stage) => ({
      stage,
      unique_sessions: sessionsByStage.get(stage) ?? 0,
    }));

    const dailyMap = new Map<string, Record<string, number>>();
    for (const row of dailyAgg) {
      const day = dailyMap.get(row._id.date) ?? {};
      day[row._id.stage] = (day[row._id.stage] ?? 0) + row.count;
      dailyMap.set(row._id.date, day);
    }
    const dailyChart = Array.from(dailyMap.entries()).map(([date, events]) => ({
      date,
      pageviews: events.PageView ?? 0,
      views: events.ViewContent ?? 0,
      carts: events.AddToCart ?? 0,
      checkouts: events.InitiateCheckout ?? 0,
      purchases: events.Purchase ?? 0,
    }));

    const pageViews = sessionsByStage.get('PageView') ?? 0;
    const addToCarts = sessionsByStage.get('AddToCart') ?? 0;
    const checkouts = sessionsByStage.get('InitiateCheckout') ?? 0;
    const purchases = sessionsByStage.get('Purchase') ?? 0;

    // Clamped at 0: a purchase can be recorded for a session whose earlier
    // events fell outside the period, which used to produce negative rates.
    const rate = (lost: number, base: number) =>
      base > 0 ? Math.max(0, Math.round((lost / base) * 10000) / 100) : 0;

    return NextResponse.json({
      success: true,
      data: {
        funnel,
        totalEvents,
        totalRevenue: (revenueAgg[0]?.total ?? 0) / 100,
        cartAbandonmentRate: rate(addToCarts - purchases, addToCarts),
        checkoutAbandonmentRate: rate(checkouts - purchases, checkouts),
        conversionRate: rate(purchases, pageViews),
        topAbandoned: abandonedAgg.map((p) => ({ name: p.name, count: p.count })),
        dailyChart,
        period: `${days}d`,
      },
    });
  } catch (err) {
    console.error('[Funnel API Error]', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch funnel data' }, { status: 500 });
  }
}
