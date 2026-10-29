import { cn } from '../foundations/cn';
import { NumberTransition } from '../motion/NumberTransition';
import { ProgressFill } from '../motion/ProgressFill';

/** Determinate progress bar with a rolling percentage. The fill moves by transform (scaleX), never by width; the percentage rolls digit by digit. */
export function Progress({ value, label, className }: { value: number; label: string; className?: string }) {
  const percent = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-muted">
        <ProgressFill fraction={percent / 100} className="h-full rounded-full bg-action" />
      </div>
      <span className="w-9 shrink-0 text-right font-sans text-caption text-ink-muted tabular"><NumberTransition value={percent} suffix="%" /></span>
    </div>
  );
}
