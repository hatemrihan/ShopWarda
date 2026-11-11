/**
 * Dashboard data aggregation — server-only.
 *
 * Eight queries, run in parallel. This used to be twenty: every count was its
 * own round-trip (ten of them against `orders` alone). The order figures now
 * come from two aggregations and the product figures from one.
 */

import connectDB from '@/lib/db/mongoose';
import { Product } from '@/lib/db/models/product.model';
import { Category } from '@/lib/db/models/category.model';
import { Order } from '@/lib/db/models/order.model';
import { Subscriber } from '@/lib/db/models/subscriber.model';
import { Contact } from '@/lib/db/models/contact.model';
import { toAdminStatus } from '@/features/checkout/order-status';

// ─── Types ──────────────────────────────────────────────────────

export interface DashboardData {
  totalRevenue: number;
  revenueChange: number;
  totalOrders: number;
  ordersChange: number;
  completedOrders: number;
  ordersLast7Days: number;
  ordersLast30Days: number;
  totalProducts: number;
  activeProducts: number;
  totalCategories: number;
  totalSubscribers: number;
  activeSubscribers: number;
  totalContacts: number;
  revenueChart: { name: string; revenue: number }[];
  dailyChart: { date: string; orders: number }[];
  statusChart: { status: string; count: number }[];
  recentOrders: {
    id: string;
    customer: string;
    phone: string;
    amount: number;
    status: string;
    date: string;
  }[];
  recentProducts: {
    id: string;
    name: string;
    price: number;
    date: string;
    image: string | null;
  }[];
  lowStockThreshold: number;
  lowStockProducts: {
    id: string;
    name: string;
    stock: number;
    image: string | null;
  }[];
}

// ─── Helpers ────────────────────────────────────────────────────

/** The shop trades in Egypt; day and month boundaries follow Cairo time. */
const TIME_ZONE = 'Africa/Cairo';

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatShortDate(d: Date): string {
  return d.toLocaleDateString('en-EG', { month: 'short', day: 'numeric', timeZone: TIME_ZONE });
}

function monthLabel(date: Date): string {
  return date.toLocaleDateString('en-EG', { month: 'short', year: '2-digit' });
}

/** `MM/DD` in Cairo time — must match the `$dateToString` bucket below. */
function dayKey(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE,
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const month = parts.find((p) => p.type === 'month')?.value ?? '00';
  const day = parts.find((p) => p.type === 'day')?.value ?? '00';
  return `${month}/${day}`;
}

function percentChange(current: number, previous: number): number {
  return previous > 0 ? Math.round(((current - previous) / previous) * 100) : 0;
}

// ─── Main Fetch ─────────────────────────────────────────────────

const LOW_STOCK_THRESHOLD = 5;

/** Orders in these states count as revenue. */
const REVENUE_STATUSES = ['delivered', 'shipped', 'processing'];

interface RecentWindowFacet {
  thisMonthRevenue: { total: number }[];
  lastMonthRevenue: { total: number }[];
  thisMonthOrders: { count: number }[];
  lastMonthOrders: { count: number }[];
  last7: { count: number }[];
  last30: { count: number }[];
  monthly: { _id: { year: number; month: number }; revenue: number }[];
  daily: { _id: string; orders: number }[];
}

interface ProductFacet {
  counts: { _id: string; count: number }[];
  recent: {
    _id: { toString(): string };
    name: string;
    priceRange?: { minMinor?: number };
    media?: { publicUrl?: string; sortOrder?: number }[];
    createdAt: Date;
  }[];
  lowStock: { _id: { toString(): string }; name: string; stock: number; image?: string }[];
}

export async function getDashboardData(): Promise<DashboardData> {
  await connectDB();

  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const lastMonthStart = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const last7 = daysAgo(7);
  const last30 = daysAgo(30);
  const windowStart = daysAgo(180);

  const revenueOnly = { status: { $in: REVENUE_STATUSES } };

  const [
    statusAgg,
    recentWindowAgg,
    recentOrdersDocs,
    productAgg,
    totalCategories,
    subscriberAgg,
    totalContacts,
  ] = await Promise.all([
    // ── All-time status breakdown (also yields total + delivered) ──
    Order.aggregate<{ _id: string; count: number }>([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),

    // ── Everything about the last 180 days, in one indexed pass ──
    // The leading $match is served by the `orders_by_date` index.
    Order.aggregate<RecentWindowFacet>([
      { $match: { createdAt: { $gte: windowStart } } },
      {
        $facet: {
          thisMonthRevenue: [
            { $match: { ...revenueOnly, createdAt: { $gte: thisMonthStart } } },
            { $group: { _id: null, total: { $sum: '$pricing.totalMinor' } } },
          ],
          lastMonthRevenue: [
            { $match: { ...revenueOnly, createdAt: { $gte: lastMonthStart, $lt: thisMonthStart } } },
            { $group: { _id: null, total: { $sum: '$pricing.totalMinor' } } },
          ],
          thisMonthOrders: [
            { $match: { createdAt: { $gte: thisMonthStart } } },
            { $count: 'count' },
          ],
          lastMonthOrders: [
            { $match: { createdAt: { $gte: lastMonthStart, $lt: thisMonthStart } } },
            { $count: 'count' },
          ],
          last7: [{ $match: { createdAt: { $gte: last7 } } }, { $count: 'count' }],
          last30: [{ $match: { createdAt: { $gte: last30 } } }, { $count: 'count' }],
          monthly: [
            { $match: revenueOnly },
            {
              $group: {
                _id: {
                  year: { $year: { date: '$createdAt', timezone: TIME_ZONE } },
                  month: { $month: { date: '$createdAt', timezone: TIME_ZONE } },
                },
                revenue: { $sum: '$pricing.totalMinor' },
              },
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
          ],
          daily: [
            { $match: { createdAt: { $gte: last30 } } },
            {
              $group: {
                _id: { $dateToString: { format: '%m/%d', date: '$createdAt', timezone: TIME_ZONE } },
                orders: { $sum: 1 },
              },
            },
          ],
        },
      },
    ]),

    // ── Recent orders ──
    Order.find()
      .sort({ createdAt: -1 })
      .limit(6)
      .select('orderNumber guest.name guest.phone pricing.totalMinor status createdAt')
      .lean(),

    // ── Products: counts, newest, low stock ──
    // The three sub-queries below previously read `pricePiasters`,
    // `media.url` and `variants.isActive` — none of which exist on a product
    // (they are `priceRange.minMinor`, `media.publicUrl` and
    // `variants.status`). So recent products showed EGP 0 with no thumbnail
    // and the low-stock panel was permanently empty.
    Product.aggregate<ProductFacet>([
      {
        $facet: {
          counts: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
          recent: [
            { $match: { status: { $ne: 'archived' } } },
            { $sort: { createdAt: -1 } },
            { $limit: 5 },
            { $project: { name: 1, 'priceRange.minMinor': 1, 'media.publicUrl': 1, 'media.sortOrder': 1, createdAt: 1 } },
          ],
          lowStock: [
            { $match: { status: 'active' } },
            { $unwind: '$variants' },
            {
              $match: {
                'variants.status': 'active',
                'variants.trackInventory': { $ne: false },
                'variants.stock': { $lte: LOW_STOCK_THRESHOLD },
              },
            },
            {
              $group: {
                _id: '$_id',
                name: { $first: '$name' },
                stock: { $min: '$variants.stock' },
                image: { $first: { $arrayElemAt: ['$media.publicUrl', 0] } },
              },
            },
            { $sort: { stock: 1, name: 1 } },
            { $limit: 8 },
          ],
        },
      },
    ]),

    Category.countDocuments({ status: { $ne: 'archived' } }),

    Subscriber.aggregate<{ _id: string; count: number }>([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),

    Contact.estimatedDocumentCount(),
  ]);

  const recentWindow = recentWindowAgg[0];
  const products = productAgg[0];

  // ── Orders ──
  const totalOrders = statusAgg.reduce((sum, s) => sum + s.count, 0);
  const completedOrders = statusAgg.find((s) => s._id === 'delivered')?.count ?? 0;

  const thisRev = recentWindow?.thisMonthRevenue[0]?.total ?? 0;
  const lastRev = recentWindow?.lastMonthRevenue[0]?.total ?? 0;
  const thisMonthOrders = recentWindow?.thisMonthOrders[0]?.count ?? 0;
  const lastMonthOrders = recentWindow?.lastMonthOrders[0]?.count ?? 0;

  const revenueChart = (recentWindow?.monthly ?? []).map((m) => ({
    name: monthLabel(new Date(m._id.year, m._id.month - 1)),
    revenue: m.revenue,
  }));

  // Daily orders, with empty days filled in.
  const dailyMap = new Map((recentWindow?.daily ?? []).map((d) => [d._id, d.orders]));
  const dailyChart: { date: string; orders: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const key = dayKey(new Date(now.getTime() - i * 24 * 60 * 60 * 1000));
    dailyChart.push({ date: key, orders: dailyMap.get(key) ?? 0 });
  }

  // Status breakdown, in the vocabulary the orders screen uses. Legacy rows
  // that hold an admin label fold into the same bucket.
  const statusLabels: Record<string, string> = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  };
  const statusCounts = new Map<string, number>();
  for (const s of statusAgg) {
    const label = statusLabels[toAdminStatus(s._id)];
    statusCounts.set(label, (statusCounts.get(label) ?? 0) + s.count);
  }
  const statusChart = Array.from(statusCounts.entries())
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);

  const recentOrders = recentOrdersDocs.map((o) => ({
    id: o._id.toString(),
    customer: o.guest?.name ?? 'Guest',
    phone: o.guest?.phone ?? '',
    amount: o.pricing?.totalMinor ?? 0,
    status: toAdminStatus(o.status),
    date: formatShortDate(new Date(o.createdAt)),
  }));

  // ── Products ──
  const productCounts = new Map((products?.counts ?? []).map((c) => [c._id, c.count]));
  const totalProducts = Array.from(productCounts.values()).reduce((a, b) => a + b, 0);

  const recentProducts = (products?.recent ?? []).map((p) => {
    const primary = p.media?.find((m) => m.sortOrder === 0) ?? p.media?.[0];
    return {
      id: p._id.toString(),
      name: p.name,
      price: p.priceRange?.minMinor ?? 0,
      date: formatShortDate(new Date(p.createdAt)),
      image: primary?.publicUrl ?? null,
    };
  });

  const lowStockProducts = (products?.lowStock ?? []).map((p) => ({
    id: p._id.toString(),
    name: p.name,
    stock: p.stock,
    image: p.image ?? null,
  }));

  // ── Subscribers ──
  const totalSubscribers = subscriberAgg.reduce((sum, s) => sum + s.count, 0);
  const activeSubscribers = subscriberAgg.find((s) => s._id === 'active')?.count ?? 0;

  return {
    totalRevenue: thisRev,
    revenueChange: percentChange(thisRev, lastRev),
    totalOrders,
    ordersChange: percentChange(thisMonthOrders, lastMonthOrders),
    completedOrders,
    ordersLast7Days: recentWindow?.last7[0]?.count ?? 0,
    ordersLast30Days: recentWindow?.last30[0]?.count ?? 0,
    totalProducts,
    activeProducts: productCounts.get('active') ?? 0,
    totalCategories,
    totalSubscribers,
    activeSubscribers,
    totalContacts,
    revenueChart,
    dailyChart,
    statusChart,
    recentOrders,
    recentProducts,
    lowStockProducts,
    lowStockThreshold: LOW_STOCK_THRESHOLD,
  };
}
