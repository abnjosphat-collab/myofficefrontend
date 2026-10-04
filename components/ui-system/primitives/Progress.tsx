import { cn } from '../foundations/cn';

/** Determinate progress bar with a visible percentage. */
export function Progress({ value, label, className }: { value: number; label: string; className?: string }) {
  const percent = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-muted">
        <div className="h-full rounded-full bg-action transition-[width] duration-[var(--mo-duration-slow)] ease-standard" style={{ width: `${percent}%` }} />
      </div>
      <span className="w-9 shrink-0 text-right font-sans text-caption text-ink-muted tabular">{percent}%</span>
    </div>
  );
}
