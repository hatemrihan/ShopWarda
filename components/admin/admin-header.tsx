'use client';

import { SidebarTrigger } from '@/components/ui/sidebar';
import { usePathname } from 'next/navigation';

function getBreadcrumbs(pathname: string) {
  const segments = pathname.split('/').filter(Boolean);
  return segments.map((seg, i) => ({
    label: seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' '),
    href: '/' + segments.slice(0, i + 1).join('/'),
    isLast: i === segments.length - 1,
  }));
}

export function AdminHeader() {
  const pathname = usePathname();
  const breadcrumbs = getBreadcrumbs(pathname);

  return (
    <header className="flex h-12 items-center gap-3 border-b border-white/[0.06] px-4">
      <SidebarTrigger className="text-white/40 hover:text-white/70 transition-colors" />
      <div className="w-px h-5 bg-white/[0.06]" />
      <nav className="flex items-center gap-1">
        {breadcrumbs.map((crumb, i) => (
          <span key={crumb.href} className="flex items-center gap-1">
            {i > 0 && <span className="text-[10px] text-white/15 mx-0.5">/</span>}
            {crumb.isLast ? (
              <span className="text-[12px] text-white/60">{crumb.label}</span>
            ) : (
              <a href={crumb.href} className="text-[12px] text-white/30 hover:text-white/50 transition-colors">
                {crumb.label}
              </a>
            )}
          </span>
        ))}
      </nav>
    </header>
  );
}
