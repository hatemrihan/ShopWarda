'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LogOut,
  Menu,
  X,
} from 'lucide-react';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { adminNavGroups } from '@/config/admin-navigation';

// ─── Navigation Config ────────────────────────────────────────

type NavItem = {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  badge?: string;
};

// Shared with the desktop sidebar — see config/admin-navigation.ts.
const NAV_ITEMS: NavItem[] = adminNavGroups.flatMap((group) =>
  group.items.map((item) => ({
    title: item.label,
    href: item.href,
    icon: item.icon,
    badge: item.badge,
  }))
);

// ─── Component ────────────────────────────────────────────────

export function AdminMobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  return (
    <div className="lg:hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between bg-stone-900 border-b border-white/[0.06] px-4 py-3">
        <Link href="/admin" className="flex items-center gap-2.5">
          <div className="w-7 h-7 flex items-center justify-center shrink-0">
            <Image
              src="/images/logo.png"
              alt="ShopWarda"
              width={22}
              height={22}
              className="object-contain"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <span className="text-[15px] font-semibold text-white tracking-tight">
            ShopWarda
          </span>
        </Link>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            className="text-white/60 hover:text-white hover:bg-white/[0.06] rounded-md h-10 w-10 inline-flex items-center justify-center"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </SheetTrigger>

          <SheetContent
            side="left"
            className="w-72 bg-stone-900 border-white/[0.06] p-0"
          >
            <SheetHeader className="px-5 py-5">
              <SheetTitle className="text-white text-[15px] font-semibold tracking-tight flex items-center gap-2">
                <div className="w-7 h-7 flex items-center justify-center shrink-0">
                  <Image
                    src="/images/logo.png"
                    alt="ShopWarda"
                    width={22}
                    height={22}
                    className="object-contain"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
                ShopWarda
                <span className="text-[10px] text-stone-500 font-medium uppercase tracking-[0.12em]">
                  Admin
                </span>
              </SheetTitle>
            </SheetHeader>

            <Separator className="bg-white/[0.06]" />

            <nav className="flex flex-col gap-0.5 px-3 py-4">
              {NAV_ITEMS.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.title}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`
                      flex items-center gap-2.5 px-3 py-2.5 rounded-md text-[13px]
                      transition-all duration-150
                      ${
                        active
                          ? 'bg-white/[0.08] text-white font-medium'
                          : 'text-white/70 hover:text-white hover:bg-white/[0.06]'
                      }
                    `}
                  >
                    <item.icon
                      className={`h-[15px] w-[15px] shrink-0 ${
                        active ? 'text-white' : 'text-white/60'
                      }`}
                    />
                    <span className="flex-1">{item.title}</span>
                    {item.badge && (
                      <span className="relative flex items-center">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#D0D48D]/50" />
                        <span className="relative rounded-full bg-[#D0D48D] px-2 py-[2px] text-[10px] font-bold tracking-wider text-stone-900">
                          {item.badge}
                        </span>
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            <Separator className="bg-white/[0.06]" />

            <div className="px-3 py-4">
              <Link
                href="/"
                onClick={() => setOpen(false)}
                className="
                  flex items-center gap-2.5 px-3 py-2.5 rounded-md text-[13px]
                  text-white/60 hover:text-red-400 hover:bg-red-500/5
                  transition-all duration-150
                "
              >
                <LogOut className="h-[15px] w-[15px]" />
                <span>Back to Store</span>
              </Link>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
