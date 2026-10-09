import type { ReactNode } from 'react';
import { cn } from '../foundations/cn';
import { type } from '../foundations/typography';
import { cardVariants } from '../primitives/Card';

export interface RecordCardProps {
  /** Small identifier line above the title (register number, WO number, employee number). */
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Status badge(s) — meaning is carried by label + tone. */
  status?: ReactNode;
  /** Key/value facts rendered as a compact definition list. */
  facts?: ReadonlyArray<{ label: string; value: ReactNode }>;
  /** Footer: assignee, location, due date. */
  meta?: ReactNode;
  /** Primary action for the card (e.g. Issue / Receive). A separate control stacked above the open target. */
  action?: ReactNode;
  selected?: boolean;
  /** Makes the whole card open the record. Implemented as ONE real button (the title) stretched over the card. */
  onOpen?: () => void;
  /** Accessible name for the open button; defaults to the title text. */
  openLabel?: string;
  className?: string;
}

/**
 * The one record card: eyebrow → title/subtitle → status → facts → meta → action.
 *
 * Whole-card activation uses the "stretched button" pattern: the title is a native
 * <button> whose ::after covers the card, so keyboard, touch and screen readers get
 * one correct control, and nested actions stay valid sibling controls (a role=button
 * wrapper around other buttons is invalid ARIA). Stationary: no lift or tilt.
 */
export function RecordCard({ eyebrow, title, subtitle, status, facts, meta, action, selected, onOpen, openLabel, className }: RecordCardProps) {
  const interactive = Boolean(onOpen);
  return (
    <div
      className={cn(
        cardVariants({ padding: 'md', interactive, selected: Boolean(selected) }),
        'flex h-full flex-col gap-3',
        // The stretched button owns focus; show the shared ring on the whole card.
        interactive && 'cursor-pointer has-[[data-open-target]:focus-visible]:shadow-ring',
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1 basis-40">
          {eyebrow && <p className="truncate font-sans text-caption text-ink-muted tabular">{eyebrow}</p>}
          <h3 className={cn(type.recordTitle, '[overflow-wrap:anywhere]')}>
            {onOpen ? (
              <button
                type="button"
                data-open-target=""
                aria-label={openLabel}
                onClick={onOpen}
                className="text-left outline-none after:absolute after:inset-0 after:rounded-card after:content-['']"
              >
                {title}
              </button>
            ) : title}
          </h3>
          {subtitle && <p className="mt-0.5 font-sans text-body-sm text-ink-muted [overflow-wrap:anywhere]">{subtitle}</p>}
        </div>
        {status && <div className="relative z-10 flex max-w-full flex-wrap gap-1.5">{status}</div>}
      </div>
      {facts && facts.length > 0 && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-sans text-body-sm">
          {facts.map(fact => (
            <div key={fact.label} className="contents">
              <dt className="text-ink-muted">{fact.label}</dt>
              <dd className="min-w-0 text-ink [overflow-wrap:anywhere]">{fact.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {(meta || action) && (
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-line-subtle pt-3">
          <div className="min-w-0 font-sans text-caption text-ink-muted">{meta}</div>
          {action && <div className="relative z-10">{action}</div>}
        </div>
      )}
    </div>
  );
}
