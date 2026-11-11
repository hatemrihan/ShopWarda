import { SiteHeader } from '@/components/sections/header';
import { SiteFooter } from '@/components/sections/footer';
import { CartDrawer } from '@/components/sections/cart-drawer';
import { ScrollToTop } from '@/components/shared/scroll-to-top';
import StoreProviders from '../providers';

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StoreProviders>
      <div className="relative flex min-h-screen flex-col bg-white">
        <ScrollToTop />
        <SiteHeader />
        <CartDrawer />
        <main className="flex-1 pt-24 md:pt-28">{children}</main>
        <SiteFooter />
      </div>
    </StoreProviders>
  );
}
