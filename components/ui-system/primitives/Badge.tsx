import type { ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../foundations/cn';
import { Icon } from '../foundations/Icon';
import type { IconMeaning } from '../foundations/icon-meanings';

export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'brand';

const badgeVariants = cva(
  'inline-flex max-w-full items-center gap-1.5 rounded-full border px-2 py-0.5 font-sans text-caption font-medium leading-5',
  {
    variants: {
      tone: {
        success: 'border-success-line bg-success-soft text-success',
        warning: 'border-warning-line bg-warning-soft text-warning',
        danger: 'border-danger-line bg-danger-soft text-danger',
        info: 'border-info-line bg-info-soft text-info',
        neutral: 'border-neutral-line bg-neutral-soft text-neutral',
        brand: 'border-transparent bg-action-soft text-action',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export interface StatusBadgeProps extends VariantProps<typeof badgeVariants> {
  /** Always provide a text label: colour is never the only signal. */
  children: ReactNode;
  /** Replace the default dot with a semantic icon. */
  icon?: IconMeaning;
  className?: string;
}

/** A record state: dot (or icon) + label, tone-coloured. For statuses only, never decoration. */
export function StatusBadge({ tone = 'neutral', icon, children, className }: StatusBadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone }), className)}>
      {icon ? <Icon name={icon} size="xs" weight="emphasis" /> : <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-current" />}
      <span className="truncate">{children}</span>
    </span>
  );
}

/**
 * A neutral category / metadata chip (not a status). With `onRemove` it is a picked value
 * (a person, a machine, a tag) and carries its own remove button named "Remove {removeLabel}".
 */
export function Tag({ children, className, onRemove, removeLabel, disabled }: {
  children: ReactNode;
  className?: string;
  onRemove?: () => void;
  /** What the remove button names, when `children` is not plain text. */
  removeLabel?: string;
  disabled?: boolean;
}) {
  const name = removeLabel ?? (typeof children === 'string' || typeof children === 'number' ? String(children) : 'item');
  return (
    <span className={cn(
      'inline-flex max-w-full items-center rounded-control border border-line-subtle bg-surface-subtle py-0.5 font-sans text-caption',
      onRemove ? 'gap-1.5 pl-2 pr-1 text-ink' : 'px-1.5 text-ink-muted',
      className,
    )}>
      <span className="truncate">{children}</span>
      {onRemove && (
        <button
          type="button"
          aria-label={`Remove ${name}`}
          disabled={disabled}
          onClick={onRemove}
          className="focus-ring inline-flex size-5 shrink-0 items-center justify-center rounded-xs text-ink-muted hover:bg-surface-muted hover:text-ink disabled:pointer-events-none disabled:opacity-45"
        >
          <Icon name="close" size="xs" />
        </button>
      )}
    </span>
  );
}

/** Count bubble used on tabs and nav items. */
export function CountBadge({ value, tone = 'neutral', className }: { value: number | string; tone?: 'neutral' | 'brand' | 'warning' | 'danger'; className?: string }) {
  const tones = {
    neutral: 'bg-surface-muted text-ink-muted',
    brand: 'bg-action text-action-ink',
    warning: 'bg-warning text-white',
    danger: 'bg-danger text-white',
  } as const;
  return <span className={cn('inline-flex min-w-5 items-center justify-center rounded-full px-1.5 font-sans text-caption font-semibold leading-5 tabular', tones[tone], className)}>{value}</span>;
}
