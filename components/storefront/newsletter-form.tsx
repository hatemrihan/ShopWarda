'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { subscribeAction } from '@/features/engagement/server/engagement.actions';

interface NewsletterFormProps {
  source?: 'footer' | 'popup';
  className?: string;
}

export function NewsletterForm({ source = 'footer', className }: NewsletterFormProps) {
  const [email, setEmail] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    startTransition(async () => {
      const result = await subscribeAction({ email, source });
      if (result.success) {
        toast.success('Subscribed! Watch your inbox for offers.');
        setEmail('');
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="flex gap-2">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          required
          className="flex-1"
        />
        <Button type="submit" disabled={isPending} size="sm">
          {isPending ? '...' : 'Subscribe'}
        </Button>
      </div>
    </form>
  );
}
