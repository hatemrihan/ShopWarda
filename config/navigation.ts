/**
 * Storefront navigation configuration.
 */

export interface NavItem {
  label: string;
  href: string;
  children?: NavItem[];
}

export const storeNavigation: NavItem[] = [
  { label: 'Shop', href: '/shop' },
  { label: 'Categories', href: '/categories' },
  { label: 'Contact', href: '/contact' },
];

export const footerNavigation = {
  shop: [
    { label: 'All Products', href: '/shop' },
    { label: 'Categories', href: '/categories' },
  ],
  info: [
    { label: 'Shipping', href: '/shipping' },
    { label: 'Returns', href: '/returns' },
    { label: 'Privacy', href: '/privacy' },
  ],
  contact: [
    { label: 'Contact Us', href: '/contact' },
  ],
};
