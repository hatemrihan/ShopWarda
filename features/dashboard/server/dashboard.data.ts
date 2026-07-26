/**
 * Dashboard data aggregation — server-only.
 * Fetches all stats in parallel for the admin dashboard.
 */

import connectDB from '@/lib/db/mongoose';
import { Product } from '@/lib/db/models/product.model';
import { Category } from '@/lib/db/models/category.model';
import { Order } from '@/lib/db/models/order.model';
import { Subscriber } from '@/lib/db/models/subscriber.model';
import { Contact } from '@/lib/db/models/contact.model';

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
  return d.toLocaleDateString('en-EG', { month: 'short', day: 'numeric' });
}

function monthLabel(date: Date): string {
  return date.toLocaleDateString('en-EG', { month: 'short', year: '2-digit' });
}

// ─── Main Fetch ─────────────────────────────────────────────────

const LOW_STOCK_THRESHOLD = 5;

export async function getDashboardData(): Promise<DashboardData> {
  await connectDB();

  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const lastMonthStart = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const last7 = daysAgo(7);
  const last30 = daysAgo(30);

  // ── Parallel queries ────────────────────────────────────────
  const [
    totalProducts,
    activeProducts,
    totalCategories,
    totalSubscribers,
    activeSubscribers,
    totalContacts,
    totalOrders,
    completedOrders,
    ordersLast7Days,
    ordersLast30Days,
    thisMonthRevenue,
    lastMonthRevenue,
    thisMonthOrders,
    lastMonthOrders,
    statusAgg,
    monthlyRevenueAgg,
    dailyOrdersAgg,
    recentOrdersDocs,
    recentProductDocs,
    lowStockDocs,
  ] = await Promise.all([
    // ── Counts ──
    Product.countDocuments(),
    Product.countDocuments({ status: 'active' }),
    Category.countDocuments({ status: { $ne: 'archived' } }),
    Subscriber.countDocuments(),
    Subscriber.countDocuments({ status: 'active' }),
    Contact.countDocuments(),
    Order.countDocuments(),
    Order.countDocuments({ status: 'delivered' }),
    Order.countDocuments({ createdAt: { $gte: last7 } }),
    Order.countDocuments({ createdAt: { $gte: last30 } }),

    // ── Revenue (this month vs last) ──
    Order.aggregate([
      { $match: { status: { $in: ['delivered', 'shipped', 'processing'] }, createdAt: { $gte: thisMonthStart } } },
      { $group: { _id: null, total: { $sum: '$pricing.totalMinor' } } },
    ]),
    Order.aggregate([
      { $match: { status: { $in: ['delivered', 'shipped', 'processing'] }, createdAt: { $gte: lastMonthStart, $lt: thisMonthStart } } },
      { $group: { _id: null, total: { $sum: '$pricing.totalMinor' } } },
    ]),

    // ── Orders count comparison ──
    Order.countDocuments({ createdAt: { $gte: thisMonthStart } }),
    Order.countDocuments({ createdAt: { $gte: lastMonthStart, $lt: thisMonthStart } }),

    // ── Status breakdown ──
    Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),

    // ── Monthly revenue (last 6 months) ──
    Order.aggregate([
      {
        $match: {
          status: { $in: ['delivered', 'shipped', 'processing'] },
          createdAt: { $gte: daysAgo(180) },
        },
      },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          revenue: { $sum: '$pricing.totalMinor' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),

    // ── Daily orders (last 30 days) ──
    Order.aggregate([
      { $match: { createdAt: { $gte: last30 } } },
      {
        $group: {
          _id: { $dateToString: { format: '%m/%d', date: '$createdAt' } },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    // ── Recent orders ──
    Order.find()
      .sort({ createdAt: -1 })
      .limit(6)
      .select('orderNumber guest pricing status createdAt')
      .lean(),

    // ── Recent products ──
    Product.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name slug pricePiasters media createdAt')
      .lean(),

    // ── Low stock ──
    Product.aggregate([
      { $match: { status: 'active' } },
      { $unwind: '$variants' },
      { $match: { 'variants.stock': { $lte: LOW_STOCK_THRESHOLD }, 'variants.isActive': true } },
      {
        $group: {
          _id: '$_id',
          name: { $first: '$name' },
          stock: { $min: '$variants.stock' },
          image: { $first: { $arrayElemAt: ['$media.url', 0] } },
        },
      },
      { $sort: { stock: 1 } },
      { $limit: 8 },
    ]),
  ]);

  // ── Compute changes ──
  const thisRev = thisMonthRevenue[0]?.total ?? 0;
  const lastRev = lastMonthRevenue[0]?.total ?? 0;
  const revenueChange = lastRev > 0 ? Math.round(((thisRev - lastRev) / lastRev) * 100) : 0;
  const ordersChange = lastMonthOrders > 0 ? Math.round(((thisMonthOrders - lastMonthOrders) / lastMonthOrders) * 100) : 0;

  // ── Format monthly revenue ──
  const revenueChart = monthlyRevenueAgg.map((m: { _id: { year: number; month: number }; revenue: number }) => ({
    name: monthLabel(new Date(m._id.year, m._id.month - 1)),
    revenue: m.revenue,
  }));

  // ── Format daily orders (fill gaps) ──
  const dailyMap = new Map<string, number>();
  dailyOrdersAgg.forEach((d: { _id: string; orders: number }) => dailyMap.set(d._id, d.orders));
  const dailyChart: { date: string; orders: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const date = daysAgo(i);
    const key = `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
    dailyChart.push({ date: key, orders: dailyMap.get(key) ?? 0 });
  }

  // ── Format status breakdown ──
  const statusLabels: Record<string, string> = {
    new: 'New',
    processing: 'Processing',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  };
  const statusChart = statusAgg.map((s: { _id: string; count: number }) => ({
    status: statusLabels[s._id] ?? s._id,
    count: s.count,
  }));

  // ── Format recent orders ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recentOrders = (recentOrdersDocs as any[]).map((o) => ({
    id: o._id.toString(),
    customer: o.guest?.name ?? 'Guest',
    phone: o.guest?.phone ?? '',
    amount: o.pricing?.totalMinor ?? 0,
    status: o.status,
    date: formatShortDate(new Date(o.createdAt)),
  }));

  // ── Format recent products ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recentProducts = (recentProductDocs as any[]).map((p) => ({
    id: p._id.toString(),
    name: p.name,
    price: p.pricePiasters ?? 0,
    date: formatShortDate(new Date(p.createdAt)),
    image: p.media?.[0]?.url ?? null,
  }));

  // ── Format low stock ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lowStockProducts = (lowStockDocs as any[]).map((p) => ({
    id: p._id.toString(),
    name: p.name,
    stock: p.stock,
    image: p.image ?? null,
  }));

  return {
    totalRevenue: thisRev,
    revenueChange,
    totalOrders,
    ordersChange,
    completedOrders,
    ordersLast7Days,
    ordersLast30Days,
    totalProducts,
    activeProducts,
    totalCategories,
    totalSubscribers,
    activeSubscribers,
    totalContacts,
    revenueChart,
    dailyChart,
    statusChart,
    recentOrders,
    recentProducts,
    lowStockThreshold: LOW_STOCK_THRESHOLD,
    lowStockProducts,
  };
}
