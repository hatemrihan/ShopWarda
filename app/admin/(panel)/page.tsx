import { Suspense } from 'react';
import { getDashboardData } from '@/features/dashboard/server/dashboard.data';
import { DashboardClient } from './dashboard-client';
import { Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

async function DashboardContent() {
  const data = await getDashboardData();
  return <DashboardClient data={data} />;
}

export default function AdminDashboard() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-5 w-5 animate-spin text-white/20" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
