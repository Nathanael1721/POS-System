import { cn } from '@/lib/utils';

/** Shimmer placeholder used while data loads. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-gray-200/70', className)} />;
}

/** Grid of product-card-shaped skeletons for the POS grid. */
export function GridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-gray-200 bg-white p-3 shadow-card">
          <Skeleton className="mb-3 h-24 w-full" />
          <Skeleton className="mb-2 h-4 w-4/5" />
          <Skeleton className="h-4 w-2/5" />
        </div>
      ))}
    </div>
  );
}

/** Row-shaped skeletons for tables. */
export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}
