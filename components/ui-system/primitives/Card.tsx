import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../foundations/cn';

/**
 * Surface container. STATIONARY: cards never lift, tilt or scale. Interactive cards
 * change border/shadow on hover, show the focus ring, and mark selection with an
 * action-tinted fill plus border; there are no coloured edges and no decorative glow.
 */
export const cardVariants = cva('relative rounded-card border bg-surface text-ink', {
  variants: {
    padding: { none: '', sm: 'p-3', md: 'p-4', lg: 'p-5' },
    interactive: {
      true: [
        'focus-ring cursor-pointer text-left transition-[border-color,box-shadow,background-color] duration-[var(--mo-duration-base)] ease-standard',
        'hover:border-line-strong hover:shadow-card-hover',
      ],
      false: 'shadow-card',
    },
    selected: { true: 'border-action bg-action-soft/60', false: 'border-line' },
  },
  defaultVariants: { padding: 'md', interactive: false, selected: false },
});

export interface CardProps extends HTMLAttributes<HTMLDivElement>, Omit<VariantProps<typeof cardVariants>, 'interactive'> {}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card({ className, padding, selected, ...props }, ref) {
  return <div ref={ref} className={cn(cardVariants({ padding, selected, interactive: false }), className)} {...props} />;
});

/** Panel with a heading row: title, optional description, optional actions. */
export function Panel({ title, description, actions, children, className, bodyClassName, headingLevel = 2 }: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  headingLevel?: 2 | 3;
}) {
  const Heading = `h${headingLevel}` as 'h2' | 'h3';
  return (
    <section className={cn('rounded-card border border-line bg-surface shadow-card', className)}>
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-4 pt-4 sm:px-5">
        <div className="min-w-0">
          <Heading className="font-display text-section font-semibold text-ink">{title}</Heading>
          {description && <p className="mt-0.5 font-sans text-body-sm text-ink-muted">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </header>
      <div className={cn('px-4 pb-4 pt-3 sm:px-5 sm:pb-5', bodyClassName)}>{children}</div>
    </section>
  );
}
