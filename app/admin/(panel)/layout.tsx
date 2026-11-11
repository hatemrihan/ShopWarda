import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/require-admin';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { AdminMobileNav } from '@/components/admin/admin-mobile-nav';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
};

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Same guard the actions and API routes use: a signed, unexpired session
  // cookie *and* an admin record that is still active. The layout used to
  // accept any decodable cookie (so a deactivated admin kept the panel) and
  // wrote the decoded token to the server logs on every navigation.
  try {
    await requireAdmin();
  } catch {
    redirect('/admin/login');
  }

  return (
    <div dir="ltr" className="min-h-screen bg-stone-900 text-white">
      <AdminSidebar />
      <AdminMobileNav />
      <main className="lg:ml-[240px] min-h-screen p-8 pt-10">
        {children}
      </main>
    </div>
  );
}
