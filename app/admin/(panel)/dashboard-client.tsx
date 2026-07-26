'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
  DollarSign, ShoppingCart, Package, Users,
  TrendingUp, TrendingDown, ArrowUpRight,
  FolderTree, Mail, MessageSquare,
} from 'lucide-react';
import type { DashboardData } from '@/features/dashboard/server/dashboard.data';
import { formatEGP } from '@/lib/money/egp';

// ── Helpers ───────────────────────────────────────────────────

function statusColor(status: string) {
  const s = status.toLowerCase();
  if (s === 'delivered') return 'text-green-400 bg-green-400/10';
  if (s === 'shipped') return 'text-blue-400 bg-blue-400/10';
  if (s === 'processing') return 'text-amber-400 bg-amber-400/10';
  if (s === 'cancelled') return 'text-red-400 bg-red-400/10';
  if (s === 'new') return 'text-orange-400 bg-orange-400/10';
  return 'text-white/40 bg-white/[0.04]';
}

// ── Mini Bar Chart (pure CSS) ─────────────────────────────────

function MiniBarChart({ data, height = 120 }: { data: { label: string; value: number }[]; height?: number }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-[3px] overflow-visible" style={{ height }}>
      {data.map((d) => (
        <div key={d.label} className="flex-1 flex flex-col items-center gap-1 group relative">
          <div
            className="w-full rounded-t bg-white/[0.15] group-hover:bg-white/30 transition-all duration-200 min-h-[2px]"
            style={{ height: `${(d.value / max) * 100}%` }}
          />
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white text-black text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap pointer-events-none z-10 shadow-lg">
            {d.value}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Status Breakdown ──────────────────────────────────────────

function StatusBreakdown({ data }: { data: { status: string; count: number }[] }) {
  const total = data.reduce((acc, d) => acc + d.count, 0) || 1;
  const colors: Record<string, string> = {
    Delivered: '#4ade80', Shipped: '#60a5fa', Processing: '#fbbf24',
    Cancelled: '#f87171', New: '#fb923c',
  };

  return (
    <div className="space-y-2">
      {data.map(d => {
        const pct = Math.round((d.count / total) * 100);
        const color = colors[d.status] || '#888';
        return (
          <div key={d.status} className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
            <span className="text-[12px] text-white/60 flex-1">{d.status}</span>
            <span className="text-[12px] text-white/50 font-mono">{d.count}</span>
            <div className="w-20 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
            </div>
            <span className="text-[10px] text-white/30 font-mono w-8 text-right">{pct}%</span>
          </div>
        );
      })}
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────

function KPICard({ icon: Icon, label, value, change, sub, color }: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; label: string; value: string; change?: number; sub?: string; color: string;
}) {
  const isPositive = (change ?? 0) >= 0;
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4 group hover:border-white/[0.1] transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}12` }}>
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
        {change !== undefined ? (
          <div className={`flex items-center gap-0.5 text-[10px] font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {isPositive ? '+' : ''}{change}%
          </div>
        ) : (
          <ArrowUpRight className="h-3.5 w-3.5 text-white/10 group-hover:text-white/30 transition-colors" />
        )}
      </div>
      <div className="text-xl font-semibold text-white tracking-tight leading-none">{value}</div>
      <div className="text-[11px] text-white/35 mt-1.5">{label}</div>
      {sub && <div className="text-[10px] text-white/20 mt-0.5">{sub}</div>}
    </div>
  );
}

// ── Metric Pill ───────────────────────────────────────────────

function MetricPill({ icon: Icon, label, value, href }: {
  icon: React.ComponentType<{ className?: string }>; label: string; value: string | number; href?: string;
}) {
  const inner = (
    <div className="bg-white/[0.02] border border-white/[0.05] rounded-lg px-3 py-2.5 flex items-center gap-2.5 hover:border-white/[0.1] transition-colors cursor-pointer group">
      <Icon className="h-3.5 w-3.5 text-white/20 group-hover:text-white/40 transition-colors shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-semibold text-white leading-none">{value}</div>
        <div className="text-[9px] text-white/25 mt-1">{label}</div>
      </div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

// ── Insight Row ───────────────────────────────────────────────

function InsightRow({ type, text }: { type: 'critical' | 'warning' | 'info' | 'good'; text: string }) {
  const colors = {
    critical: 'bg-red-400/10 text-red-400 border-red-400/20',
    warning: 'bg-amber-400/10 text-amber-400 border-amber-400/20',
    info: 'bg-blue-400/10 text-blue-400 border-blue-400/20',
    good: 'bg-green-400/10 text-green-400 border-green-400/20',
  };
  const icons = { critical: '✕', warning: '!', info: 'i', good: '✓' };

  return (
    <div className={`flex items-start gap-2.5 px-3 py-2 rounded-md border ${colors[type]}`}>
      <span className="text-[10px] font-bold mt-px shrink-0">{icons[type]}</span>
      <span className="text-[11px] leading-relaxed opacity-80">{text}</span>
    </div>
  );
}

// ── Main Dashboard Client ─────────────────────────────────────

export function DashboardClient({ data }: { data: DashboardData }) {
  const revenueChart = data.revenueChart ?? [];
  const dailyChart = data.dailyChart ?? [];
  const statusChart = data.statusChart ?? [];
  const recentOrders = data.recentOrders ?? [];
  const recentProducts = data.recentProducts ?? [];

  const showInsights = data.totalProducts < 10;

  return (
    <div className="space-y-6 -mt-2 max-w-[1100px]">

      {/* Header */}
      <div className="pt-[2px]">
        <h1 className="text-[15px] font-semibold text-white leading-none">Dashboard</h1>
        <p className="text-[11px] text-white/25 mt-1.5">Real-time store performance</p>
      </div>

      {/* ── KPI Cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          icon={DollarSign} label="Revenue" value={formatEGP(data.totalRevenue)}
          change={data.revenueChange} sub="from confirmed orders" color="#4ade80"
        />
        <KPICard
          icon={ShoppingCart} label="Orders" value={data.totalOrders.toString()}
          change={data.ordersChange} sub={`${data.completedOrders} delivered`} color="#60a5fa"
        />
        <KPICard
          icon={Package} label="Products" value={data.activeProducts.toString()}
          sub={`${data.totalProducts} total`} color="#fbbf24"
        />
        <KPICard
          icon={Users} label="Subscribers" value={data.activeSubscribers.toString()}
          sub={`${data.totalSubscribers} total`} color="#c084fc"
        />
      </div>

      {/* ── Secondary metrics ────────────────────────────────── */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-2.5">
        <MetricPill icon={FolderTree} label="Categories" value={data.totalCategories} href="/admin/categories" />
        <MetricPill icon={MessageSquare} label="Contacts" value={data.totalContacts} />
        <MetricPill icon={Mail} label="Subscribers" value={data.activeSubscribers} />
        <MetricPill icon={ShoppingCart} label="7-day orders" value={data.ordersLast7Days} />
        <MetricPill icon={ShoppingCart} label="30-day orders" value={data.ordersLast30Days} />
        <MetricPill icon={Package} label="Active" value={data.activeProducts} href="/admin/products" />
      </div>

      {/* ── Low Stock Warning ───────────────────────────────── */}
      {(data.lowStockProducts ?? []).length > 0 && (
        <div className="bg-amber-400/[0.04] border border-amber-400/[0.15] rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-[11px] text-amber-400/80 uppercase tracking-wider font-medium">
                Low Stock Alert
              </span>
            </div>
            <span className="text-[10px] text-amber-400/40">
              threshold: {data.lowStockThreshold} units
            </span>
          </div>
          <div className="space-y-1.5">
            {data.lowStockProducts.map(p => (
              <Link
                key={p.id}
                href={`/admin/products/${p.id}/edit`}
                className="flex items-center gap-3 py-2 px-2.5 rounded-md hover:bg-amber-400/[0.04] transition-colors group"
              >
                <div className="w-8 h-8 bg-white/[0.04] rounded overflow-hidden shrink-0 relative">
                  {p.image ? (
                    <Image src={p.image} alt={p.name} fill sizes="32px" className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/10 text-[8px]">IMG</div>
                  )}
                </div>
                <span className="text-[12px] text-white/70 flex-1 truncate group-hover:text-white transition-colors">
                  {p.name}
                </span>
                <span className={`text-[11px] font-mono font-semibold tabular-nums ${
                  p.stock <= 2 ? 'text-red-400' : 'text-amber-400'
                }`}>
                  {p.stock} left
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Charts Row ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

        {/* Revenue chart */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] text-white/40 uppercase tracking-wider font-medium">Monthly Revenue</span>
            <span className="text-[10px] text-white/20">{revenueChart.length} months</span>
          </div>
          {revenueChart.length > 0 ? (
            <>
              <MiniBarChart
                data={revenueChart.map(d => ({ label: d.name, value: d.revenue }))}
                height={110}
              />
              <div className="flex justify-between mt-2.5">
                {revenueChart.length <= 12 ? revenueChart.map((d) => (
                  <span key={d.name} className="text-[8px] text-white/15 flex-1 text-center">{d.name.split(' ')[0]}</span>
                )) : (
                  <>
                    <span className="text-[8px] text-white/15">{revenueChart[0]?.name}</span>
                    <span className="text-[8px] text-white/15">{revenueChart[revenueChart.length - 1]?.name}</span>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="h-[110px] flex items-center justify-center text-[12px] text-white/15">No revenue data yet</div>
          )}
        </div>

        {/* Daily orders chart */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] text-white/40 uppercase tracking-wider font-medium">Daily Orders (30d)</span>
            <span className="text-[10px] text-white/20">{data.ordersLast30Days} total</span>
          </div>
          <MiniBarChart
            data={dailyChart.map(d => ({ label: d.date, value: d.orders }))}
            height={110}
          />
          <div className="flex justify-between mt-2.5">
            <span className="text-[8px] text-white/15">{dailyChart[0]?.date}</span>
            <span className="text-[8px] text-white/15">{dailyChart[dailyChart.length - 1]?.date}</span>
          </div>
        </div>
      </div>

      {/* ── Order Status + Recent Orders ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

        {/* Order status breakdown */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-5">
          <span className="text-[11px] text-white/40 uppercase tracking-wider font-medium block mb-4">Order Status</span>
          {statusChart.length > 0 ? (
            <StatusBreakdown data={statusChart} />
          ) : (
            <div className="text-[12px] text-white/15 py-8 text-center">No orders yet</div>
          )}
        </div>

        {/* Recent orders */}
        <div className="lg:col-span-2 bg-white/[0.03] border border-white/[0.06] rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] text-white/40 uppercase tracking-wider font-medium">Recent Orders</span>
            <Link href="/admin/orders" className="text-[10px] text-white/25 hover:text-white/50 transition-colors">View all →</Link>
          </div>
          {recentOrders.length > 0 ? (
            <div className="space-y-1.5">
              {recentOrders.map(order => (
                <div key={order.id} className="flex items-center gap-3 py-2 px-2.5 rounded-md hover:bg-white/[0.02] transition-colors">
                  <div className="flex-1 min-w-0">
                    <span className="text-[12px] text-white block truncate">{order.customer}</span>
                    <span className="text-[10px] text-white/20 block truncate">{order.phone}</span>
                  </div>
                  <span className="text-[12px] text-white/60 font-mono shrink-0">{formatEGP(order.amount)}</span>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium shrink-0 ${statusColor(order.status)}`}>
                    {order.status}
                  </span>
                  <span className="text-[9px] text-white/15 shrink-0">{order.date}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[12px] text-white/15 py-10 text-center">No orders yet</div>
          )}
        </div>
      </div>

      {/* ── Recent Products ────────────────────────────────────── */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] text-white/40 uppercase tracking-wider font-medium">Recent Products</span>
          <Link href="/admin/products" className="text-[10px] text-white/25 hover:text-white/50 transition-colors">View all →</Link>
        </div>
        {recentProducts.length > 0 ? (
          <div className="space-y-1.5">
            {recentProducts.map(p => (
              <div key={p.id} className="flex items-center gap-3 py-2 px-1.5 rounded-md hover:bg-white/[0.02] transition-colors">
                <div className="w-9 h-9 bg-white/[0.04] rounded overflow-hidden shrink-0 relative">
                  {p.image ? (
                    <Image src={p.image} alt={p.name} fill sizes="36px" className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/10 text-[8px]">IMG</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[12px] text-white block truncate">{p.name}</span>
                  <span className="text-[9px] text-white/20">{p.date}</span>
                </div>
                <span className="text-[12px] text-white/50 font-mono shrink-0">{formatEGP(p.price)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-[12px] text-white/15 py-8 text-center">No products yet</div>
        )}
      </div>

      {/* ── Store Insights (only when store is new) ──────────── */}
      {showInsights && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-5">
          <span className="text-[11px] text-white/40 uppercase tracking-wider font-medium block mb-4">Store Insights</span>
          <div className="space-y-2">
            <InsightRow
              type={data.totalProducts === 0 ? 'critical' : data.activeProducts < 5 ? 'warning' : 'good'}
              text={data.totalProducts === 0 ? 'No products listed — add products to start selling' : data.activeProducts < 5 ? `Only ${data.activeProducts} active products — add more to increase discoverability` : `${data.activeProducts} active products`}
            />
            <InsightRow
              type={data.totalCategories === 0 ? 'critical' : data.totalCategories < 3 ? 'warning' : 'good'}
              text={data.totalCategories === 0 ? 'No categories — organize products for better SEO' : data.totalCategories < 3 ? `Only ${data.totalCategories} categories — add more for better navigation` : `${data.totalCategories} categories configured`}
            />
            <InsightRow
              type={data.activeSubscribers === 0 ? 'warning' : 'good'}
              text={data.activeSubscribers === 0 ? 'No subscribers — enable the footer signup' : `${data.activeSubscribers} email subscribers`}
            />
            <InsightRow
              type={data.totalOrders > 0 && data.completedOrders / data.totalOrders < 0.5 ? 'warning' : 'good'}
              text={data.totalOrders === 0 ? 'No orders yet — share your store link' : `${Math.round((data.completedOrders / data.totalOrders) * 100)}% delivery rate`}
            />
          </div>
        </div>
      )}
    </div>
  );
}
