'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../foundations/cn';
import { Icon, type IconSize } from '../foundations/Icon';
import type { IconMeaning } from '../foundations/icon-meanings';
import { Tooltip } from '../overlays/Tooltip';
import { closeTurn } from '../foundations/gestures';
import { AnimatedIcon } from '../motion/AnimatedIcon';
import { IconSwap } from '../motion/IconSwap';

/** The one button. Hierarchy: primary (one per view) → secondary → ghost; danger only after confirmation. */
export const buttonVariants = cva(
  [
    'focus-ring touch-target inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap',
    'rounded-control border font-sans text-label font-medium',
    'transition-[background-color,border-color,color,box-shadow,transform] duration-[var(--mo-spring-snappy-duration)] ease-spring-snappy active:scale-[0.98] motion-reduce:active:scale-100',
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

/** A state flip on the button's own icon (star/pin, copy → copied): the label follows the caller's state. */
export interface ButtonIconSwap {
  /** The icon after the state flips. */
  to: IconMeaning;
  /** Whether the flipped state is showing. */
  swapped: boolean;
  /** Replace direction: down-up after an input (default), up-up for forward progress. */
  direction?: 'down-up' | 'up-up';
  /** Magic replace for slash pairs (mute, hide): the base glyph stays and the slash draws on or off. */
  slash?: boolean;
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  /** Semantic icon shown before the label. */
  icon?: IconMeaning;
  /** Semantic icon shown after the label. */
  iconAfter?: IconMeaning;
  /** Shows a spinner, blocks repeat activation and announces busy state. */
  pending?: boolean;
  /** Shows the check (swapped up-up from the icon): the action finished. Blocks repeat activation while shown. */
  success?: boolean;
  /** Swaps the leading icon between `icon` and `to` instead of rendering it statically. Ignored without `icon`. */
  iconSwap?: ButtonIconSwap;
  /** Render the child element (e.g. a Next <Link>) with button styling. */
  asChild?: boolean;
  children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, fullWidth, icon, iconAfter, pending = false, success = false, iconSwap, asChild = false, disabled, children, type, onClick, ...rest },
  ref,
) {
  const Comp = asChild ? Slot : 'button';
  const iconSize = ICON_FOR_SIZE[size ?? 'md'];
  // Leading-icon priority: the spinner is instant (it is not an icon to swap);
  // success swaps up-up to the check; a state flip swaps the icon in place.
  const leading = pending ? <Spinner />
    : success ? <IconSwap from={icon ?? 'pending'} to="check" swapped direction="up-up" size={iconSize} />
    : iconSwap && icon ? <IconSwap from={icon} to={iconSwap.to} swapped={iconSwap.swapped} direction={iconSwap.direction} slash={iconSwap.slash} size={iconSize} />
    : icon ? <Icon name={icon} size={iconSize} />
    : null;
  const content = (
    <>
      {leading}
      {children}
      {iconAfter && !pending ? <Icon name={iconAfter} size={iconSize} /> : null}
    </>
  );
  return (
    <Comp
      ref={ref}
      type={asChild ? undefined : (type ?? 'button')}
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      data-variant={variant ?? 'secondary'}
      disabled={asChild ? undefined : disabled || pending}
      aria-disabled={asChild && (disabled || pending) ? true : undefined}
      aria-busy={pending || undefined}
      onClick={pending || success ? undefined : onClick}
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

/** One round action floating at the viewport's bottom-right (Feedback). Above content, below every overlay; safe-area aware. */
export const floatingActionClass = 'fixed bottom-[max(1.25rem,var(--mo-safe-bottom))] right-[max(1.25rem,var(--mo-safe-right))] z-sticky rounded-full shadow-dialog';

export const iconButtonVariants = cva(
  [
    'focus-ring touch-target inline-flex shrink-0 items-center justify-center rounded-control border',
    'transition-[background-color,border-color,color,transform] duration-[var(--mo-spring-snappy-duration)] ease-spring-snappy active:scale-[0.98] motion-reduce:active:scale-100',
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
  /** Bounce the icon when this changes (the bell, when the unread count rises). Omitted = a static icon. */
  bounceTrigger?: unknown;
  /** Shows the check (swapped up-up from the icon): the action finished. Blocks repeat activation while shown. */
  success?: boolean;
  /** Swaps the icon between `icon` and `to` instead of rendering it statically. The `label` follows the caller's state. */
  iconSwap?: ButtonIconSwap;
}

/** Icon-only action. The label is mandatory so the control is never unnamed, and it shows as a tooltip on hover and focus. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, label, tooltip, tooltipSide = 'bottom', badge, variant, size, pending = false, pressed, bounceTrigger, success = false, iconSwap, className, disabled, type, onClick, ...rest },
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
      className={cn(iconButtonVariants({ variant, size }), badge != null && 'relative', icon === 'close' && closeTurn, pressed && 'bg-action-soft text-action', className)}
      onClick={pending || success ? undefined : onClick}
      {...rest}
    >
      {pending ? <Spinner />
        : success ? <IconSwap from={icon} to="check" swapped direction="up-up" size={size === 'lg' ? 'lg' : 'md'} />
        : iconSwap ? <IconSwap from={icon} to={iconSwap.to} swapped={iconSwap.swapped} direction={iconSwap.direction} slash={iconSwap.slash} size={size === 'lg' ? 'lg' : 'md'} />
        : bounceTrigger !== undefined ? <AnimatedIcon name={icon} effect="bounce" trigger={bounceTrigger} size={size === 'lg' ? 'lg' : 'md'} />
        : <Icon name={icon} size={size === 'lg' ? 'lg' : 'md'} />}
      {badge === '' ? (
        <span aria-hidden="true" className="absolute right-1 top-1 size-2 rounded-full bg-action" />
      ) : badge != null && (
        <span aria-hidden="true" className="absolute -right-1 -top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-action px-1 font-sans text-tip font-semibold leading-4 text-action-ink tabular">{badge}</span>
      )}
    </button>
  );
  return tooltip === false ? button : <Tooltip content={tooltip ?? label} side={tooltipSide}>{button}</Tooltip>;
});
