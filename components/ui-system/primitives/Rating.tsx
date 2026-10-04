import { cn } from '../foundations/cn';
import { Icon } from '../foundations/Icon';

/** Read-only rating (1–5). The star count is paired with an accessible text value; colour is never the only signal. */
export function Rating({ value, max = 5, className }: { value: number; max?: number; className?: string }) {
  const whole = Math.max(0, Math.min(max, Math.round(value)));
  return (
    <span role="img" aria-label={`Rating ${whole} of ${max}`} className={cn('inline-flex items-center gap-0.5', className)}>
      {Array.from({ length: max }, (_, index) => (
        <Icon key={index} name="starred" size="sm" weight={index < whole ? 'emphasis' : 'control'} className={index < whole ? 'text-warning' : 'text-line-control'} />
      ))}
    </span>
  );
}
