'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  Settings,
  ChevronRight,
  ChevronDown,
  LogOut,
  Store,
} from 'lucide-react';
import { adminNavGroups } from '@/config/admin-navigation';

// ─── ShopWarda Navigation Config ──────────────────────────────

type NavItem = {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number | string }>;
  badge?: string;
};

// Derived from the shared config so a new admin section shows up here and in
// the mobile nav automatically. Both used to hardcode their own copy, which is
// why Bouquet Builder and Wrapping Paper never appeared in either.
const NAV_ITEMS: NavItem[] = adminNavGroups.flatMap((group) =>
  group.items.map((item) => ({
    title: item.label,
    href: item.href,
    icon: item.icon,
    badge: item.badge,
  }))
);

const SETTINGS_CHILDREN = [
  { title: 'General', href: '/admin/settings' },
  { title: 'Payment Settings', href: '/admin/payment-settings' },
  { title: 'Size Guide', href: '/admin/settings/size-guide' },
  { title: 'Governorate Pricing', href: '/admin/settings/governorate-pricing' },
];

// ─── Sidebar Card Inner ───────────────────────────────────────

function AdminSidebarInner() {
  const pathname = usePathname();
  const isSettingsChildActive = SETTINGS_CHILDREN.some((c) => pathname.startsWith(c.href));
  const [userToggledSettings, setUserToggledSettings] = useState<boolean | null>(null);

  const settingsOpen = userToggledSettings !== null ? userToggledSettings : isSettingsChildActive;

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  return (
    <aside
      className="flex flex-col h-full rounded-2xl shadow-2xl overflow-hidden"
      style={{
        backgroundColor: 'rgba(28, 25, 23, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      {/* ── Header ─────────────────────────────────────── */}
      <div className="px-3 pt-4 pb-3">
        <Link
          href="/admin"
          className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:opacity-80 transition-opacity group"
        >
          <div className="w-6 h-6 flex items-center justify-center shrink-0">
            <Image
              src="/images/logo.png"
              alt="ShopWarda"
              width={20}
              height={20}
              className="object-contain"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <span className="text-[12px] font-semibold text-stone-200 leading-none tracking-wide">
            ShopWarda
          </span>
          <span className="text-[10px] text-stone-500 leading-none ml-auto">
            Admin
          </span>
        </Link>
      </div>

      <div className="h-px bg-white/[0.06] mx-3" />

      {/* ── Scrollable Content ─────────────────────────── */}
      <div className="flex flex-col flex-1 overflow-y-auto">
        <nav className="px-2 py-2">
          <div className="space-y-px">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.title}
                  href={item.href}
                  className={`
                    flex items-center gap-2 px-2.5 py-[6px] rounded-md text-[12px]
                    transition-colors duration-75
                    ${
                      active
                        ? 'text-white font-semibold'
                        : 'text-stone-400 hover:text-stone-200'
                    }
                  `}
                >
                  <item.icon
                    className={`h-3.5 w-3.5 shrink-0 ${active ? 'text-white' : 'text-stone-400'}`}
                    strokeWidth={active ? 2 : 1.5}
                  />
                  <span className="flex-1 truncate">{item.title}</span>
                  {item.badge && !active && (
                    <span className="relative flex items-center">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#D0D48D]/50" />
                      <span className="relative rounded-full bg-[#D0D48D] px-1.5 py-[1px] text-[9px] font-bold tracking-wider text-stone-900">
                        {item.badge}
                      </span>
                    </span>
                  )}
                  {active && <ChevronRight className="h-2.5 w-2.5 text-white/80" />}
                </Link>
              );
            })}
          </div>

          {/* ── Settings (collapsible) ──────────────────── */}
          <div className="mt-px">
            <button
              onClick={() => setUserToggledSettings(!settingsOpen)}
              className={`
                w-full flex items-center gap-2 px-2.5 py-[6px] rounded-md text-[12px]
                transition-colors duration-75 cursor-pointer
                ${
                  settingsOpen
                    ? 'text-white font-semibold'
                    : 'text-stone-400 hover:text-stone-200'
                }
              `}
            >
              <Settings
                className={`h-3.5 w-3.5 shrink-0 ${settingsOpen ? 'text-white' : 'text-stone-400'}`}
                strokeWidth={1.5}
              />
              <span className="flex-1 text-left truncate">Settings</span>
              <ChevronDown
                className={`h-2.5 w-2.5 text-stone-400 transition-transform duration-150 ${
                  settingsOpen ? 'rotate-0' : '-rotate-90'
                }`}
              />
            </button>

            {settingsOpen && (
              <div className="ml-[18px] pl-2.5 border-l border-white/[0.06] mt-px space-y-px">
                {SETTINGS_CHILDREN.map((child) => {
                  const active = pathname === child.href;
                  return (
                    <Link
                      key={child.href}
                      href={child.href}
                      className={`
                        block px-2.5 py-[5px] rounded-md text-[11px] transition-colors duration-75
                        ${
                          active
                            ? 'text-white font-semibold'
                            : 'text-stone-400 hover:text-stone-200'
                        }
                      `}
                    >
                      {child.title}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

        {/* ── Footer ─────────────────────────────────────── */}
        <div className="mt-auto mb-4">
          <div className="h-px bg-white/[0.06] mx-3" />
          <div className="px-2 py-2">
            <Link
              href="/"
              className="flex items-center gap-2 px-2.5 py-[6px] rounded-md text-stone-400 hover:text-stone-200 transition-colors duration-75 group"
            >
              <Store className="h-3.5 w-3.5 shrink-0 group-hover:text-stone-200" strokeWidth={1.5} />
              <span className="text-[11px] font-medium leading-none truncate flex-1">Back to Store</span>
              <LogOut className="h-3 w-3 text-stone-500 group-hover:text-stone-200 shrink-0" strokeWidth={1.5} />
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ─── Exported Component ───────────────────────────────────────

export function AdminSidebar() {
  return (
    <div className="hidden lg:block fixed top-0 left-0 z-40 w-[240px] pt-10 pl-8 pb-8 h-screen">
      <div className="h-full overflow-hidden">
        <AdminSidebarInner />
      </div>
    </div>
  );
}

export function SideBarNav() {
  return <AdminSidebar />;
}
