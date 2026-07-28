import { SiteHeader } from '@/components/sections/header';
import { SiteFooter } from '@/components/sections/footer';
import { CartDrawer } from '@/components/sections/cart-drawer';

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col bg-white">
      <SiteHeader />
      <CartDrawer />
      <main className="flex-1 pt-24 md:pt-28">{children}</main>
      <SiteFooter />
    </div>
  );
}
