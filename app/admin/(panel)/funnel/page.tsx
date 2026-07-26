'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Loader2,
  RefreshCw,
  TrendingDown,
  ShoppingCart,
  CreditCard,
  Target,
  Activity,
  AlertTriangle,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────

interface FunnelStage {
  stage: string;
  unique_sessions: number;
}

interface AbandonedProduct {
  name: string;
  count: number;
}

interface DailyData {
  date: string;
  pageviews: number;
  views: number;
  carts: number;
  checkouts: number;
  purchases: number;
}

interface FunnelData {
  funnel: FunnelStage[];
  totalEvents: number;
  totalRevenue: number;
  cartAbandonmentRate: number;
  checkoutAbandonmentRate: number;
  conversionRate: number;
  topAbandoned: AbandonedProduct[];
  dailyChart: DailyData[];
  period: string;
}

// ── Helpers ───────────────────────────────────────────────────

const STAGE_LABELS: Record<string, string> = {
  PageView: 'Page Views',
  ViewContent: 'Product Views',
  AddToCart: 'Add to Cart',
  InitiateCheckout: 'Checkout Started',
  Purchase: 'Purchases',
};

const STAGE_COLORS: Record<string, string> = {
  PageView: '#818cf8',
  ViewContent: '#60a5fa',
  AddToCart: '#fbbf24',
  InitiateCheckout: '#fb923c',
  Purchase: '#4ade80',
};

function formatNum(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}

// ── Mini Daily Chart ──────────────────────────────────────────

function DailyChart({ data, height = 100 }: { data: DailyData[]; height?: number }) {
  const max = Math.max(...data.map((d) => d.pageviews + d.views + d.carts + d.purchases), 1);
  return (
    <div className="flex items-end gap-[2px] overflow-visible" style={{ height }}>
      {data.map((d) => {
        const total = d.pageviews + d.views + d.carts + d.purchases;
        return (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-0 group relative">
            <div
              className="w-full rounded-t bg-white/[0.12] group-hover:bg-white/25 transition-all duration-200 min-h-[2px]"
              style={{ height: `${(total / max) * 100}%` }}
            />
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white text-black text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap pointer-events-none z-10 shadow-lg">
              {d.date.slice(5)}: {total} events
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Funnel Bar ────────────────────────────────────────────────

function FunnelBar({ stages }: { stages: FunnelStage[] }) {
  const max = Math.max(...stages.map((s) => s.unique_sessions), 1);

  return (
    <div className="space-y-2.5">
      {stages.map((stage, i) => {
        const pct = Math.round((stage.unique_sessions / max) * 100);
        const color = STAGE_COLORS[stage.stage] || '#888';
        const label = STAGE_LABELS[stage.stage] || stage.stage;

        const prev = i > 0 ? stages[i - 1].unique_sessions : 0;
        const dropOff =
          i > 0 && prev > 0
            ? Math.round(((prev - stage.unique_sessions) / prev) * 100)
            : null;

        return (
          <div key={stage.stage} className="group">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className="text-[12px] text-white/70">{label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[13px] text-white font-mono font-medium tabular-nums">
                  {formatNum(stage.unique_sessions)}
                </span>
                {dropOff !== null && dropOff > 0 && (
                  <span className="text-[9px] text-red-400/70 font-mono">-{dropOff}%</span>
                )}
              </div>
            </div>
            <div className="w-full h-2 bg-white/[0.04] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────

export default function FunnelPage() {
  const [data, setData] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [period, setPeriod] = useState('30d');

  const fetchFunnel = useCallback(async (p: string) => {
    try {
      setLoading(true);
      setError(false);
      const res = await fetch(`/api/admin/funnel?period=${p}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    fetch(`/api/admin/funnel?period=${period}`)
      .then((res) => res.json())
      .then((json) => {
        if (!ignore) {
          if (json.success) {
            setData(json.data);
            setError(false);
          } else {
            setError(true);
          }
        }
      })
      .catch(() => {
        if (!ignore) {
          setError(true);
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [period]);

  const handlePeriod = (p: string) => {
    setPeriod(p);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-5 w-5 animate-spin text-white/20" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
        <p className="text-[13px] text-white/30">Failed to load funnel data</p>
        <button
          onClick={() => fetchFunnel(period)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.06] border border-white/[0.08] rounded text-[12px] text-white/60 hover:text-white hover:bg-white/[0.1] transition-colors cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      </div>
    );
  }

  const hasData = data.funnel.some((s) => s.unique_sessions > 0);

  return (
    <div className="space-y-6 -mt-2 max-w-[1100px]">
      {/* Header */}
      <div className="flex items-center justify-between pt-[2px]">
        <div>
          <h1 className="text-[15px] font-semibold text-white leading-none">Conversion Funnel</h1>
          <p className="text-[11px] text-white/25 mt-1.5">Track how visitors move through your purchase flow</p>
        </div>

        {/* Period selector */}
        <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.06] rounded-md p-0.5">
          {['7d', '30d', '90d'].map((p) => (
            <button
              key={p}
              onClick={() => handlePeriod(p)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all cursor-pointer ${
                period === p ? 'bg-white/[0.1] text-white' : 'text-white/40 hover:text-white/60'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {!hasData && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-12 text-center">
          <Activity className="h-8 w-8 text-white/10 mx-auto mb-4" />
          <p className="text-[13px] text-white/30 mb-2">No tracking data yet</p>
          <p className="text-[11px] text-white/15 max-w-md mx-auto">
            Events will appear here as visitors browse your store, add items to cart, and make purchases.
            Data usually appears within a few minutes of the first visit.
          </p>
        </div>
      )}

      {hasData && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KPICard
              icon={Activity}
              label="Total Events"
              value={formatNum(data.totalEvents)}
              sub={`in last ${data.period}`}
              color="#818cf8"
            />
            <KPICard
              icon={ShoppingCart}
              label="Cart Abandonment"
              value={`${data.cartAbandonmentRate}%`}
              sub="added but didn't buy"
              color="#fbbf24"
              warning={data.cartAbandonmentRate > 70}
            />
            <KPICard
              icon={CreditCard}
              label="Checkout Abandonment"
              value={`${data.checkoutAbandonmentRate}%`}
              sub="started but didn't complete"
              color="#fb923c"
              warning={data.checkoutAbandonmentRate > 50}
            />
            <KPICard
              icon={Target}
              label="Conversion Rate"
              value={`${data.conversionRate}%`}
              sub="visitors → purchases"
              color="#4ade80"
            />
          </div>

          {/* Funnel + Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Funnel visualization */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-5">
              <span className="text-[11px] text-white/40 uppercase tracking-wider font-medium block mb-5">
                Purchase Funnel
              </span>
              <FunnelBar stages={data.funnel} />
            </div>

            {/* Daily activity chart */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] text-white/40 uppercase tracking-wider font-medium">
                  Daily Activity
                </span>
                <span className="text-[10px] text-white/20">{data.dailyChart.length} days</span>
              </div>
              {data.dailyChart.length > 0 ? (
                <>
                  <DailyChart data={data.dailyChart} height={120} />
                  <div className="flex justify-between mt-2.5">
                    <span className="text-[8px] text-white/15">{data.dailyChart[0]?.date.slice(5)}</span>
                    <span className="text-[8px] text-white/15">
                      {data.dailyChart[data.dailyChart.length - 1]?.date.slice(5)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="h-[120px] flex items-center justify-center text-[12px] text-white/15">
                  No data for this period
                </div>
              )}
            </div>
          </div>

          {/* Abandoned Products */}
          {data.topAbandoned.length > 0 && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-5">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400/60" />
                <span className="text-[11px] text-white/40 uppercase tracking-wider font-medium">
                  Most Abandoned Products
                </span>
                <span className="text-[10px] text-white/15 ml-auto">
                  added to cart but not purchased
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {data.topAbandoned.map((p) => {
                  const maxCount = data.topAbandoned[0]?.count || 1;
                  const pct = Math.round((p.count / maxCount) * 100);
                  return (
                    <div
                      key={p.name}
                      className="flex items-center gap-3 py-2 px-2.5 rounded-md hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="text-[12px] text-white/70 block truncate">{p.name}</span>
                        <div className="w-full h-1 bg-white/[0.04] rounded-full mt-1.5 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-amber-400/40 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-[11px] text-amber-400/70 font-mono font-medium shrink-0 tabular-nums">
                        {p.count}×
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Revenue from events */}
          {data.totalRevenue > 0 && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-5">
              <span className="text-[11px] text-white/40 uppercase tracking-wider font-medium block mb-3">
                Tracked Revenue
              </span>
              <div className="text-2xl font-semibold text-white tracking-tight">
                {data.totalRevenue.toLocaleString('en-EG')} EGP
              </div>
              <p className="text-[10px] text-white/20 mt-1">
                From{' '}
                {data.funnel.find((f) => f.stage === 'Purchase')?.unique_sessions || 0} purchase events in the last{' '}
                {data.period}
              </p>
            </div>
          )}
        </>
      )}

      {/* Tracking Integrations Status */}
      <TrackingStatus />
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────

function KPICard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  warning,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color: string;
  warning?: boolean;
}) {
  return (
    <div
      className={`bg-white/[0.03] border rounded-lg p-4 group hover:border-white/[0.1] transition-colors ${
        warning ? 'border-amber-400/20' : 'border-white/[0.06]'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}12` }}
        >
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
        {warning && <TrendingDown className="h-3.5 w-3.5 text-amber-400/60" />}
      </div>
      <div className="text-xl font-semibold text-white tracking-tight leading-none">{value}</div>
      <div className="text-[11px] text-white/35 mt-1.5">{label}</div>
      {sub && <div className="text-[10px] text-white/20 mt-0.5">{sub}</div>}
    </div>
  );
}

// ── Tracking Integrations Status ──────────────────────────────

function TrackingStatus() {
  const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID || '';
  const ga4Id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID || 'G-YQS5MLH354';

  const integrations = [
    {
      name: 'Meta Pixel (Facebook & Instagram)',
      id: metaPixelId,
      active: !!metaPixelId,
      color: '#1877F2',
      icon: (
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
      link: metaPixelId
        ? `https://business.facebook.com/events_manager2/list/pixel/${metaPixelId}/overview`
        : null,
    },
    {
      name: 'Google Analytics 4',
      id: ga4Id,
      active: !!ga4Id,
      color: '#E37400',
      icon: (
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
          <path d="M22.84 2.9982v17.004c-.2.6-.6 1.1-1.2 1.4-.2.1-.4.1-.6.2h-2c-.2 0-.3-.1-.5-.1-.8-.3-1.3-1-1.3-1.9V4.3982c.1-1.1.9-1.9 1.9-2 1.1-.1 2.1.6 2.3 1.7.1.2 0 .5 0 .9zm-9.4 7.006v9c-.2.6-.6 1.1-1.2 1.4-.2.1-.4.1-.6.2h-2c-.2 0-.3-.1-.5-.1-.8-.3-1.3-1-1.3-1.9v-8.2c0-1.1.8-2 1.9-2.1 1.1-.1 2.1.6 2.3 1.7.1-.1.1.1.1.5zm-9.4 7.004c0 1.1-.8 2-1.9 2.1-1.1.1-2.1-.6-2.3-1.7 0-.2 0-.4 0-.6 0-.6.2-1.1.6-1.5.5-.5 1.1-.7 1.8-.6 1 .1 1.8 1 1.8 2v.3z" />
        </svg>
      ),
      link: ga4Id
        ? `https://analytics.google.com/analytics/web/#/realtime/overview?params=_u..nav%3Dmaui`
        : null,
    },
    {
      name: 'Internal Analytics (MongoDB)',
      id: 'analyticsEvents',
      active: true,
      color: '#3ECF8E',
      icon: (
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
          <path d="M21 14.9c0 2.1-.4 3.3-1 3.8-.6.5-1.6.3-2.2-.5l-5.2-7.5V21c0 1.3-.5 2-1.3 2-.6 0-1.2-.3-1.6-.8L3.3 12.6c-.6-.7-.8-1.4-.8-1.8 0-.4.2-.6.6-.6h.3c.3 0 .6.2.9.5l5.2 7.5V7c0-1.3.5-2 1.3-2 .6 0 1.2.3 1.6.8l6.5 9.6c.3.4.6.5.8.5.3 0 .3-.5.3-2V3c0-1.7 1.3-3 3-3s3 1.3 3 3v11.9z" />
        </svg>
      ),
      link: null,
    },
  ];

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-5">
      <span className="text-[11px] text-white/40 uppercase tracking-wider font-medium block mb-4">
        Tracking Integrations
      </span>
      <div className="space-y-3">
        {integrations.map((int) => (
          <div
            key={int.name}
            className="flex items-center justify-between py-2.5 px-3 rounded-md bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <div
                  className={`w-2 h-2 rounded-full ${int.active ? 'animate-pulse' : ''}`}
                  style={{ backgroundColor: int.active ? '#4ade80' : '#ef4444' }}
                />
              </div>

              <div
                className="w-7 h-7 rounded-md flex items-center justify-center"
                style={{ backgroundColor: `${int.color}18`, color: int.color }}
              >
                {int.icon}
              </div>

              <div>
                <div className="text-[12px] text-white/80 font-medium">{int.name}</div>
                <div className="text-[10px] text-white/25 font-mono mt-0.5">
                  {int.active ? `ID: ${int.id}` : 'Not configured'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                  int.active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                }`}
              >
                {int.active ? 'Active' : 'Inactive'}
              </span>
              {int.link && (
                <a
                  href={int.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-white/30 hover:text-white/60 transition-colors underline"
                >
                  Open →
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-white/15 mt-3">
        All events fire simultaneously to each active integration with deduplication via event_id.
      </p>
    </div>
  );
}
