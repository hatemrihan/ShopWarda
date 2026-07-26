'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal } from 'lucide-react';
import { updateOrderStatusAction } from '@/features/checkout/server/checkout.actions';

const transitions: Record<string, string[]> = {
  new: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

interface Props {
  orderId: string;
  currentStatus: string;
}

export function OrderStatusActions({ orderId, currentStatus }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const nextStatuses = transitions[currentStatus] ?? [];

  if (nextStatuses.length === 0) return null;

  function handleStatusChange(status: string) {
    startTransition(async () => {
      const result = await updateOrderStatusAction(orderId, status);
      if (result.success) {
        toast.success(`Order → ${status}`);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isPending}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {nextStatuses.map((status) => (
          <DropdownMenuItem
            key={status}
            onClick={() => handleStatusChange(status)}
            className={status === 'cancelled' ? 'text-destructive' : ''}
          >
            Move to {status.charAt(0).toUpperCase() + status.slice(1)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
