import { CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface Props {
  params: Promise<{ orderNumber: string }>;
}

export default async function OrderConfirmationPage({ params }: Props) {
  const { orderNumber } = await params;

  return (
    <div className="container mx-auto max-w-lg px-4 py-16 text-center">
      <Card>
        <CardContent className="space-y-4 p-8">
          <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
          <h1 className="text-2xl font-bold">Order Confirmed!</h1>
          <p className="text-muted-foreground">
            Thank you for your order. Your order number is:
          </p>
          <p className="text-3xl font-bold tracking-wider">{orderNumber}</p>
          <p className="text-sm text-muted-foreground">
            We&apos;ll process your order shortly. You can track its status using
            your order number and phone number.
          </p>

          <div className="flex flex-col gap-2 pt-4">
            <Link href="/shop" className={cn(buttonVariants(), 'w-full')}>
              Continue Shopping
            </Link>
            <Link href="/" className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}>
              Back to Home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
