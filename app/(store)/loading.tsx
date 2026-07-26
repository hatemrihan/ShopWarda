import { Skeleton } from '@/components/ui/skeleton';

export default function HomeLoading() {
  return (
    <div>
      {/* Hero skeleton */}
      <div className="relative min-h-screen flex items-center bg-[#faf6f1]">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 pt-20 md:pt-32 pb-10 md:pb-14 w-full">
          {/* Headline skeleton */}
          <div className="text-center mb-12 md:mb-16 mt-4 md:mt-6">
            <Skeleton className="h-12 w-80 mx-auto bg-[#e8e0d8]/50" />
            <Skeleton className="h-12 w-64 mx-auto mt-2 bg-[#e8e0d8]/50" />
            <Skeleton className="h-4 w-72 mx-auto mt-6 bg-[#e8e0d8]/30" />
          </div>

          {/* Image + side panel skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 lg:gap-16 items-end">
            <Skeleton className="aspect-[4/3] md:aspect-[16/9] max-h-[340px] rounded-sm bg-[#e8e0d8]/60" />
            <div className="flex flex-col justify-end pb-4">
              <Skeleton className="h-4 w-20 mb-2 bg-[#e8e0d8]/30" />
              <Skeleton className="h-5 w-40 mb-4 bg-[#e8e0d8]/40" />
              <Skeleton className="h-3 w-52 bg-[#e8e0d8]/30" />
            </div>
          </div>
        </div>
      </div>

      {/* Categories skeleton */}
      <section className="max-w-[1400px] mx-auto px-6 md:px-10 py-20">
        <div className="flex items-end justify-between mb-10">
          <div>
            <Skeleton className="h-3 w-16 mb-2 bg-[#e8e0d8]/30" />
            <Skeleton className="h-8 w-48 bg-[#e8e0d8]/50" />
          </div>
          <Skeleton className="h-3 w-20 bg-[#e8e0d8]/30" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[4/5] rounded-sm bg-[#e8e0d8]/60" />
          ))}
        </div>
      </section>

      {/* Products skeleton */}
      <section className="max-w-[1400px] mx-auto px-6 md:px-10 pb-24">
        <div className="flex items-end justify-between mb-10">
          <div>
            <Skeleton className="h-3 w-12 mb-2 bg-[#e8e0d8]/30" />
            <Skeleton className="h-8 w-44 bg-[#e8e0d8]/50" />
          </div>
          <Skeleton className="h-3 w-20 bg-[#e8e0d8]/30" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-square w-full rounded-lg bg-[#e8e0d8]/60" />
              <Skeleton className="h-4 w-3/4 bg-[#e8e0d8]/40" />
              <Skeleton className="h-4 w-1/2 bg-[#e8e0d8]/40" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
