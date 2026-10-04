import { cn } from '../foundations/cn';

/** Calm loading block. The pulse stops under prefers-reduced-motion (global rule). */
export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn('block animate-pulse rounded-control bg-surface-muted', className)} />;
}

/** Skeleton for a list/table region. Announces loading once, not per row. */
export function SkeletonRows({ rows = 5, label = 'Loading records' }: { rows?: number; label?: string }) {
  return (
    <div role="status" aria-live="polite" aria-label={label} className="flex flex-col gap-2.5">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-3 rounded-card border border-line-subtle bg-surface p-3.5">
          <Skeleton className="size-9 shrink-0 rounded-full" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
          <Skeleton className="hidden h-6 w-20 rounded-full sm:block" />
        </div>
      ))}
      <span className="sr-only">{label}…</span>
    </div>
  );
}
