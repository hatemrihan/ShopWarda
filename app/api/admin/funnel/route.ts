import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import connectDB from '@/lib/db/mongoose';
import { AnalyticsEvent } from '@/lib/db/models/analytics-event.model';
import { Order } from '@/lib/db/models/order.model';

// ─── GET /api/admin/funnel ────────────────────────────────────

const STAGE_MAPPINGS: Record<string, string[]> = {
  PageView: ['page_view', 'PageView'],
  ViewContent: ['product_view', 'ViewContent'],
  AddToCart: ['add_to_cart', 'AddToCart'],
  InitiateCheckout: ['checkout_start', 'InitiateCheckout'],
  Purchase: ['order_placed', 'Purchase'],
};

const FUNNEL_STAGES = ['PageView', 'ViewContent', 'AddToCart', 'InitiateCheckout', 'Purchase'] as const;

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
  const session = await getServerSession(authOptions);
  if (!session?.user?.adminId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();

    const period = req.nextUrl.searchParams.get('period');
    const days = parsePeriod(period);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // 1. Funnel counts — unique sessions per stage
    const funnelPromises = FUNNEL_STAGES.map(async (stage) => {
      const aliases = STAGE_MAPPINGS[stage] || [stage];
      const sessions = await AnalyticsEvent.distinct('anonymousSessionId', {
        event: { $in: aliases },
        occurredAt: { $gte: since },
        anonymousSessionId: { $ne: null },
      });
      return { stage, unique_sessions: sessions.length };
    });

    const funnel = await Promise.all(funnelPromises);

    // 2. Total events count
    const totalEvents = await AnalyticsEvent.countDocuments({
      occurredAt: { $gte: since },
    });

    // 3. Revenue from Purchase events or completed Orders
    const purchaseAliases = STAGE_MAPPINGS['Purchase'];
    const purchaseEvents = await AnalyticsEvent.find({
      event: { $in: purchaseAliases },
      occurredAt: { $gte: since },
    }).lean();

    let totalRevenue = purchaseEvents.reduce((sum, e) => {
      const val = Number(e.properties?.value ?? e.properties?.total ?? 0);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);

    if (totalRevenue === 0) {
      const orders = await Order.find({ createdAt: { $gte: since } }).lean();
      totalRevenue = orders.reduce(
        (sum, o) => sum + (o.pricing?.totalMinor ? o.pricing.totalMinor / 100 : 0),
        0
      );
    }

    // 4. Top abandoned products (AddToCart but no Purchase in same session)
    const cartAliases = STAGE_MAPPINGS['AddToCart'];
    const cartEvents = await AnalyticsEvent.find({
      event: { $in: cartAliases },
      occurredAt: { $gte: since },
    }).lean();

    const purchaseSessions = await AnalyticsEvent.distinct('anonymousSessionId', {
      event: { $in: purchaseAliases },
      occurredAt: { $gte: since },
    });

    const purchaseSessionSet = new Set(purchaseSessions);
    const abandonedProducts: Record<string, { name: string; count: number }> = {};

    cartEvents.forEach((event) => {
      if (!event.anonymousSessionId || purchaseSessionSet.has(event.anonymousSessionId)) return;
      const props = event.properties || {};
      const name =
        (props.content_name as string) ||
        (props.productName as string) ||
        (props.name as string) ||
        'Unknown Product';
      const key = (props.productId as string) || name;
      if (!abandonedProducts[key]) {
        abandonedProducts[key] = { name, count: 0 };
      }
      abandonedProducts[key].count++;
    });

    const topAbandoned = Object.values(abandonedProducts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // 5. Daily event breakdown
    const dailyEvents = await AnalyticsEvent.find({
      occurredAt: { $gte: since },
    })
      .select('event occurredAt')
      .sort({ occurredAt: 1 })
      .lean();

    const dailyMap: Record<string, Record<string, number>> = {};
    dailyEvents.forEach((e) => {
      const date = new Date(e.occurredAt).toISOString().split('T')[0];
      if (!dailyMap[date]) dailyMap[date] = {};
      const stageName =
        Object.keys(STAGE_MAPPINGS).find((key) => STAGE_MAPPINGS[key].includes(e.event)) ||
        e.event;
      dailyMap[date][stageName] = (dailyMap[date][stageName] || 0) + 1;
    });

    const dailyChart = Object.entries(dailyMap).map(([date, events]) => ({
      date,
      pageviews: events['PageView'] || 0,
      views: events['ViewContent'] || 0,
      carts: events['AddToCart'] || 0,
      checkouts: events['InitiateCheckout'] || 0,
      purchases: events['Purchase'] || 0,
    }));

    // 6. Calculate rates
    const pageViews = funnel.find((f) => f.stage === 'PageView')?.unique_sessions || 0;
    const addToCarts = funnel.find((f) => f.stage === 'AddToCart')?.unique_sessions || 0;
    const checkouts = funnel.find((f) => f.stage === 'InitiateCheckout')?.unique_sessions || 0;
    const purchases = funnel.find((f) => f.stage === 'Purchase')?.unique_sessions || 0;

    const cartAbandonmentRate =
      addToCarts > 0
        ? Math.round(((addToCarts - purchases) / addToCarts) * 10000) / 100
        : 0;
    const checkoutAbandonmentRate =
      checkouts > 0
        ? Math.round(((checkouts - purchases) / checkouts) * 10000) / 100
        : 0;
    const conversionRate =
      pageViews > 0 ? Math.round((purchases / pageViews) * 10000) / 100 : 0;

    return NextResponse.json({
      success: true,
      data: {
        funnel,
        totalEvents,
        totalRevenue,
        cartAbandonmentRate,
        checkoutAbandonmentRate,
        conversionRate,
        topAbandoned,
        dailyChart,
        period: `${days}d`,
      },
    });
  } catch (err) {
    console.error('[Funnel API Error]', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch funnel data' }, { status: 500 });
  }
}
