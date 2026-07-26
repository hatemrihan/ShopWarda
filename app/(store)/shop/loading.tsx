import { Skeleton } from '@/components/ui/skeleton';

export default function ShopLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Skeleton className="mb-8 h-9 w-32 bg-[#e8e0d8]/60" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-square w-full rounded-lg bg-[#e8e0d8]/60" />
            <Skeleton className="h-4 w-3/4 bg-[#e8e0d8]/40" />
            <Skeleton className="h-4 w-1/2 bg-[#e8e0d8]/40" />
          </div>
        ))}
      </div>
    </div>
  );
}
