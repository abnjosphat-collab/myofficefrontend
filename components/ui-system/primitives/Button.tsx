'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../foundations/cn';
import { Icon, type IconSize } from '../foundations/Icon';
import type { IconMeaning } from '../foundations/icon-meanings';
import { Tooltip } from '../overlays/Tooltip';

/** The one button. Hierarchy: primary (one per view) → secondary → ghost; danger only after confirmation. */
export const buttonVariants = cva(
  [
    'focus-ring touch-target inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap',
    'rounded-control border font-sans text-label font-medium',
    'transition-[background-color,border-color,color,box-shadow] duration-[var(--mo-duration-base)] ease-standard',
    'disabled:pointer-events-none disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45',
  ],
  {
    variants: {
      variant: {
        primary: 'border-action bg-action text-action-ink hover:border-action-hover hover:bg-action-hover active:bg-action-pressed',
        secondary: 'border-line bg-surface-raised text-ink hover:bg-surface-subtle hover:border-action/35 active:bg-surface-muted',
        ghost: 'border-transparent bg-transparent text-ink-muted hover:bg-surface-muted hover:text-ink active:bg-surface-interactive',
        danger: 'border-danger bg-danger text-white hover:brightness-110 active:brightness-95',
        'danger-quiet': 'border-transparent bg-transparent text-danger hover:bg-danger-soft active:bg-danger-soft',
        shell: 'border-line bg-surface-raised text-ink-muted hover:border-action/55 hover:bg-action-soft hover:text-action aria-expanded:border-action/55 aria-expanded:bg-action-soft aria-expanded:text-action',
      },
      size: {
        sm: 'h-8 px-3',
        md: 'h-9 px-3.5',
        lg: 'h-10 px-4',
        shell: 'h-9 px-3',
      },
      fullWidth: { true: 'w-full' },
    },
    defaultVariants: { variant: 'secondary', size: 'md' },
  },
);

export type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>['variant']>;
export type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>['size']>;

const ICON_FOR_SIZE: Record<ButtonSize, IconSize> = { sm: 'sm', md: 'sm', lg: 'md', shell: 'md' };

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  /** Semantic icon shown before the label. */
  icon?: IconMeaning;
  /** Semantic icon shown after the label. */
  iconAfter?: IconMeaning;
  /** Shows a spinner, blocks repeat activation and announces busy state. */
  pending?: boolean;
  /** Render the child element (e.g. a Next <Link>) with button styling. */
  asChild?: boolean;
  children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, fullWidth, icon, iconAfter, pending = false, asChild = false, disabled, children, type, onClick, ...rest },
  ref,
) {
  const Comp = asChild ? Slot : 'button';
  const iconSize = ICON_FOR_SIZE[size ?? 'md'];
  const content = (
    <>
      {pending ? <Spinner /> : icon ? <Icon name={icon} size={iconSize} /> : null}
      {children}
      {iconAfter && !pending ? <Icon name={iconAfter} size={iconSize} /> : null}
    </>
  );
  return (
    <Comp
      ref={ref}
      type={asChild ? undefined : (type ?? 'button')}
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      disabled={asChild ? undefined : disabled || pending}
      aria-disabled={asChild && (disabled || pending) ? true : undefined}
      aria-busy={pending || undefined}
      onClick={pending ? undefined : onClick}
      {...rest}
    >
      {asChild ? children : content}
    </Comp>
  );
});

/** Small indeterminate spinner (reduced-motion safe: the global rule stops the spin). */
export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn('size-4 animate-spin text-current', className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export const iconButtonVariants = cva(
  [
    'focus-ring touch-target inline-flex shrink-0 items-center justify-center rounded-control border',
    'transition-[background-color,border-color,color] duration-[var(--mo-duration-base)] ease-standard',
    'disabled:pointer-events-none disabled:opacity-45',
  ],
  {
    variants: {
      variant: {
        ghost: 'border-transparent text-ink-muted hover:bg-surface-muted hover:text-ink',
        outline: 'border-line bg-surface-raised text-ink-muted hover:bg-surface-subtle hover:border-action/35 hover:text-ink',
        danger: 'border-transparent text-ink-muted hover:bg-danger-soft hover:text-danger',
        // The Tools header control: a light outlined square that turns brand-soft on hover.
        shell: 'border-line bg-surface-raised text-ink-muted hover:border-action/55 hover:bg-action-soft hover:text-action aria-expanded:border-action/55 aria-expanded:bg-action-soft aria-expanded:text-action',
      },
      size: { sm: 'size-8', md: 'size-9', lg: 'size-10', shell: 'size-9' },
    },
    defaultVariants: { variant: 'ghost', size: 'md' },
  },
);

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>, VariantProps<typeof iconButtonVariants> {
  icon: IconMeaning;
  /** Required: an icon-only control must have an accessible name. It is also the tooltip. */
  label: string;
  /** Longer hint than the label, or `false` when the control already sits inside its own tooltip. */
  tooltip?: ReactNode | false;
  tooltipSide?: 'top' | 'right' | 'bottom' | 'left';
  /** A small count over the icon's corner (active filters, unread items); '' shows a dot. Name it in `label` too. */
  badge?: ReactNode;
  pending?: boolean;
  pressed?: boolean;
}

/** Icon-only action. The label is mandatory so the control is never unnamed, and it shows as a tooltip on hover and focus. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, label, tooltip, tooltipSide = 'bottom', badge, variant, size, pending = false, pressed, className, disabled, type, ...rest },
  ref,
) {
  const button = (
    <button
      ref={ref}
      type={type ?? 'button'}
      aria-label={label}
      aria-pressed={pressed}
      aria-busy={pending || undefined}
      disabled={disabled || pending}
      className={cn(iconButtonVariants({ variant, size }), badge != null && 'relative', pressed && 'bg-action-soft text-action', className)}
      {...rest}
    >
      {pending ? <Spinner /> : <Icon name={icon} size={size === 'lg' ? 'lg' : 'md'} />}
      {badge === '' ? (
        <span aria-hidden="true" className="absolute right-1 top-1 size-2 rounded-full bg-action" />
      ) : badge != null && (
        <span aria-hidden="true" className="absolute -right-1 -top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-action px-1 font-sans text-tip font-semibold leading-4 text-action-ink tabular">{badge}</span>
      )}
    </button>
  );
  return tooltip === false ? button : <Tooltip content={tooltip ?? label} side={tooltipSide}>{button}</Tooltip>;
});
