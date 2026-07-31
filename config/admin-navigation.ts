/**
 * Admin sidebar navigation configuration.
 */

import {
  LayoutDashboard,
  Package,
  FolderTree,
  Flower2,
  Gift,
  ShoppingCart,
  Tag,
  MessageSquare,
  Mail,
  BarChart3,
  Sparkles,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export interface AdminNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}

export interface AdminNavGroup {
  title: string;
  items: AdminNavItem[];
}

export const adminNavGroups: AdminNavGroup[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Catalog',
    items: [
      { label: 'Products', href: '/admin/products', icon: Package },
      { label: 'Categories', href: '/admin/categories', icon: FolderTree },
      { label: 'Bouquet Builder', href: '/admin/bouquet', icon: Flower2 },
      { label: 'Wrapping Paper', href: '/admin/wrapping-paper', icon: Gift },
    ],
  },
  {
    title: 'Sales',
    items: [
      { label: 'Orders', href: '/admin/orders', icon: ShoppingCart },
      { label: 'Promo Codes', href: '/admin/promo-codes', icon: Tag },
    ],
  },
  {
    title: 'Engagement',
    items: [
      { label: 'Contacts', href: '/admin/contacts', icon: MessageSquare },
      { label: 'Subscribers', href: '/admin/subscriptions', icon: Mail },
      { label: 'Funnel', href: '/admin/funnel', icon: BarChart3 },
      { label: "What's New", href: '/admin/whats-new', icon: Sparkles },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Settings', href: '/admin/settings', icon: Settings },
    ],
  },
];
