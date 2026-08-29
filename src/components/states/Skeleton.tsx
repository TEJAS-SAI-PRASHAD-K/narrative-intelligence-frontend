import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton-shimmer rounded-md', className)} aria-hidden="true" />;
}

/** Screen-reader announcement for any skeleton block. */
function Loading({ label }: { label: string }) {
  return (
    <span className="sr-only" role="status" aria-live="polite">
      {label}
    </span>
  );
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cn('h-3', i === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  );
}

export function SkeletonKpiStrip({ count = 5 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      <Loading label="Loading key metrics" />
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-lg border border-border bg-card p-3">
          <Skeleton className="h-2.5 w-20" />
          <Skeleton className="mt-2.5 h-6 w-24" />
          <Skeleton className="mt-2 h-2.5 w-16" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-lg border border-border bg-card p-3', className)}>
      <Loading label="Loading" />
      <Skeleton className="h-3.5 w-3/4" />
      <SkeletonText lines={2} className="mt-2.5" />
      <div className="mt-3 flex gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-4 w-16" />
        ))}
      </div>
    </div>
  );
}

/** Rows sized to the real table so the layout does not jump when data lands. */
export function SkeletonTableRows({ rows = 8, columns = 6 }: { rows?: number; columns?: number }) {
  return (
    <>
      <Loading label="Loading table rows" />
      {Array.from({ length: rows }, (_, r) => (
        <tr key={r} className="border-b border-border">
          {Array.from({ length: columns }, (_, c) => (
            <td key={c} className="px-2.5 py-2">
              <Skeleton className={cn('h-3', c === 0 ? 'w-32' : 'w-16')} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function SkeletonChart({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-lg border border-border bg-card p-3', className)}>
      <Loading label="Loading chart" />
      <Skeleton className="h-3 w-40" />
      <div className="mt-4 flex h-40 items-end gap-1.5">
        {Array.from({ length: 24 }, (_, i) => (
          <Skeleton
            key={i}
            className="flex-1"
            /* Deterministic pseudo-random heights: a skeleton that reflows on every
               render reads as a glitch. */
            {...{ style: { height: `${30 + ((i * 37) % 60)}%` } }}
          />
        ))}
      </div>
    </div>
  );
}
