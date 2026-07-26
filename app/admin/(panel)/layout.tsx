import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { decode } from 'next-auth/jwt';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { AdminMobileNav } from '@/components/admin/admin-mobile-nav';

export const dynamic = 'force-dynamic';

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Read JWT cookie directly — bypasses getServerSession entirely
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('next-auth.session-token')?.value
    || cookieStore.get('__Secure-next-auth.session-token')?.value;

  console.log('[PANEL] Cookie found:', !!sessionToken);

  if (!sessionToken) {
    console.log('[PANEL] No session cookie → redirect to login');
    redirect('/admin/login');
  }

  let adminId: string | null = null;

  try {
    const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || '';
    const token = await decode({ token: sessionToken, secret });
    console.log('[PANEL] Decoded token:', JSON.stringify(token));
    adminId = (token?.adminId as string) || null;
  } catch (err) {
    console.error('[PANEL] JWT decode error:', err);
  }

  if (!adminId) {
    console.log('[PANEL] No adminId in token → redirect to login');
    redirect('/admin/login');
  }

  console.log('[PANEL] ✅ Authenticated, adminId:', adminId);

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
