import { piastersToCurrency } from '@/lib/money/egp';
import { cn } from '@/lib/utils';

interface MoneyProps {
  piasters: number;
  className?: string;
}

/**
 * Format and display a price in EGP.
 * <Money piasters={2550} /> → "25.50 EGP"
 */
export function Money({ piasters, className }: MoneyProps) {
  return (
    <span className={cn(className)}>
      {piastersToCurrency(piasters)}
    </span>
  );
}
