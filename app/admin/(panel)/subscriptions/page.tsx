import { Mail, UserCheck, UserMinus } from 'lucide-react';
import connectDB from '@/lib/db/mongoose';
import { Subscriber } from '@/lib/db/models/subscriber.model';

interface SubscriberItem {
  id: string;
  email: string;
  status: string;
  source: string;
  date: string;
}

function statusDot(status: string) {
  if (status === 'active') return 'bg-green-400';
  return 'bg-white/20';
}

async function getSubscribers(status?: string): Promise<{ items: SubscriberItem[]; total: number; active: number }> {
  await connectDB();
  const filter: Record<string, unknown> = {};
  if (status && status !== 'all') filter.status = status;

  const [docs, total, active] = await Promise.all([
    Subscriber.find(filter).sort({ createdAt: -1 }).limit(100).lean(),
    Subscriber.countDocuments(filter),
    Subscriber.countDocuments({ status: 'active' }),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items = (docs as any[]).map((d) => ({
    id: d._id.toString(),
    email: d.emailNormalized,
    status: d.status,
    source: d.source,
    date: new Date(d.createdAt).toLocaleDateString('en-EG', { month: 'short', day: 'numeric', year: '2-digit' }),
  }));

  return { items, total, active };
}

interface Props {
  searchParams: Promise<{ status?: string }>;
}

export default async function AdminSubscriptionsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const status = sp.status;
  const { items, total, active } = await getSubscribers(status);

  const tabs = ['all', 'active', 'unsubscribed'];

  return (
    <div className="space-y-6 max-w-[1100px]">
      {/* Header */}
      <div>
        <h1 className="text-[15px] font-semibold text-white leading-none">Subscribers</h1>
        <p className="text-[11px] text-white/25 mt-1.5">{active} active of {total} total</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Mail className="h-4 w-4 text-purple-400" />
            <span className="text-[11px] text-white/40">Total</span>
          </div>
          <span className="text-lg font-semibold text-white">{total}</span>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <UserCheck className="h-4 w-4 text-green-400" />
            <span className="text-[11px] text-white/40">Active</span>
          </div>
          <span className="text-lg font-semibold text-white">{active}</span>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <UserMinus className="h-4 w-4 text-red-400" />
            <span className="text-[11px] text-white/40">Unsubscribed</span>
          </div>
          <span className="text-lg font-semibold text-white">{total - active}</span>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1.5">
        {tabs.map((s) => {
          const isActive = (s === 'all' && !status) || s === status;
          return (
            <a
              key={s}
              href={s === 'all' ? '/admin/subscriptions' : `/admin/subscriptions?status=${s}`}
              className={`rounded-md px-3 py-1.5 text-[11px] font-medium transition-colors ${
                isActive
                  ? 'bg-white/[0.1] text-white'
                  : 'text-white/30 hover:text-white/60 hover:bg-white/[0.04]'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </a>
          );
        })}
      </div>

      {/* Subscribers list */}
      {items.length === 0 ? (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-12 text-center">
          <Mail className="h-8 w-8 text-white/10 mx-auto mb-3" />
          <p className="text-[13px] text-white/30">No subscribers found</p>
          <p className="text-[11px] text-white/15 mt-1">Subscribers will appear here when customers sign up</p>
        </div>
      ) : (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_100px_120px_100px] gap-3 px-5 py-3 border-b border-white/[0.06]">
            <span className="text-[10px] text-white/30 uppercase tracking-wider font-medium">Email</span>
            <span className="text-[10px] text-white/30 uppercase tracking-wider font-medium">Status</span>
            <span className="text-[10px] text-white/30 uppercase tracking-wider font-medium">Source</span>
            <span className="text-[10px] text-white/30 uppercase tracking-wider font-medium">Date</span>
          </div>

          {/* Rows */}
          {items.map((sub) => (
            <div
              key={sub.id}
              className="grid grid-cols-[1fr_100px_120px_100px] gap-3 px-5 py-3 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors items-center"
            >
              <span className="text-[12px] text-white truncate">{sub.email}</span>

              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${statusDot(sub.status)}`} />
                <span className="text-[11px] text-white/40">{sub.status}</span>
              </div>

              <span className="text-[10px] text-white/30 px-2 py-0.5 rounded-full bg-white/[0.04] w-fit">{sub.source}</span>

              <span className="text-[10px] text-white/20">{sub.date}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
