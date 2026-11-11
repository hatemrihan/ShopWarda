'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { track } from '@/lib/analytics';

/**
 * Records a page view on every storefront navigation.
 * Renders nothing. Mounted once, in the storefront providers.
 */
export function AnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    track('PageView');
  }, [pathname]);

  return null;
}
