'use client';

import Link from 'next/link';
import { useId, useState, type ElementType, type ReactNode } from 'react';
import { cn } from '../foundations/cn';
import { Icon, Glyph, isIconMeaning } from '../foundations/Icon';
import type { IconMeaning } from '../foundations/icon-meanings';
import { CountBadge } from '../primitives/Badge';
import { Tooltip } from '../overlays/Tooltip';

/** A semantic meaning, or a glyph component supplied by data (for example a module list). */
type NavIconSource = IconMeaning | ElementType;

/**
 * Navigation glyph: 18 px, regular weight, in a 26 px box (the Tools sidebar geometry). Weight is the shared
 * "navigation" policy, so a legacy icon wrapper cannot change it.
 */
function NavGlyph({ icon, weight = 'navigation' }: { icon: NavIconSource; weight?: 'navigation' | 'emphasis' }) {
  return isIconMeaning(icon) ? <Icon name={icon} size="md" weight={weight} /> : <Glyph as={icon} size="md" weight={weight} />;
}

export interface NavItemProps {
  label: string;
  icon: NavIconSource;
  href?: string;
  onClick?: () => void;
  /** The current destination: `aria-current="page"` and the selected fill. */
  active?: boolean;
  /** Icon-only rail: the label moves to a tooltip and stays the accessible name. */
  collapsed?: boolean;
  badge?: number;
  /** Extra control at the end of the row (for example a remove button while editing favourites). */
  trailing?: ReactNode;
  onNavigate?: () => void;
  className?: string;
}

/**
 * One navigation destination, matching the Tools sidebar item: 40 px row (44 px on touch), 9 px radius, 12 px label at
 * weight 500, a brand-coloured regular-weight glyph, soft fill and brand text on hover. Renders a link when `href`
 * is given, otherwise a button.
 */
export function NavItem({ label, icon, href, onClick, active, collapsed, badge, trailing, onNavigate, className }: NavItemProps) {
  const row = cn(
    'group/nav focus-ring touch-target relative flex min-h-10 pointer-coarse:min-h-11 w-full items-center gap-2.5 rounded-nav px-[11px] py-1.5 font-sans text-nav text-ink',
    'transition-colors duration-[var(--mo-duration-base)] hover:bg-soft hover:text-action',
    active && 'bg-action-soft text-ink',
    collapsed && 'justify-center px-0',
    className,
  );
  const inner = (
    <>
      <span className="grid size-6.5 shrink-0 place-items-center text-action"><NavGlyph icon={icon} /></span>
      <span className={cn('min-w-0 flex-1 text-left leading-[1.25] [overflow-wrap:anywhere] line-clamp-2', collapsed && 'sr-only')} title={label}>{label}</span>
      {!collapsed && badge !== undefined && badge > 0 && <CountBadge value={badge} />}
    </>
  );
  const control = href
    ? <Link href={href} aria-current={active ? 'page' : undefined} aria-label={collapsed ? label : undefined} onClick={onNavigate} className={row}>{inner}</Link>
    : <button type="button" aria-current={active ? 'page' : undefined} aria-label={collapsed ? label : undefined} onClick={() => { onClick?.(); onNavigate?.(); }} className={row}>{inner}</button>;
  const wrapped = collapsed ? <Tooltip content={label} side="right">{control}</Tooltip> : control;
  return trailing ? <div className="relative flex items-center">{wrapped}<span className="absolute right-1.5">{trailing}</span></div> : wrapped;
}

/**
 * The current destination, promoted to the top of the sidebar as in Tools: a brand-soft pill with a filled glyph in
 * a brand square. Collapsed, only the square remains (label as tooltip and accessible name).
 */
export function NavSpotlight({ label, icon, href, collapsed, onNavigate, current = true }: { label: string; icon: NavIconSource; href: string; collapsed?: boolean; onNavigate?: () => void; current?: boolean }) {
  const link = (
    <Link
      href={href}
      aria-current={current ? 'page' : undefined}
      aria-label={collapsed ? label : undefined}
      onClick={onNavigate}
      className={cn(
        'focus-ring touch-target flex min-h-10 pointer-coarse:min-h-11 min-w-0 items-center gap-2.5 rounded-nav border border-transparent bg-action-soft py-1 pl-1 pr-2.5 text-ink',
        'transition-colors duration-[var(--mo-duration-base)] hover:border-line hover:bg-action-soft/70',
        collapsed && 'shrink-0 p-1 pointer-coarse:min-w-11',
      )}
    >
      <span className="grid size-[30px] shrink-0 place-items-center rounded-nav bg-action text-action-ink"><NavGlyph icon={icon} weight="emphasis" /></span>
      {!collapsed && <strong className="min-w-0 font-sans text-spotlight leading-[1.25] text-ink [overflow-wrap:anywhere] line-clamp-2" title={label}>{label}</strong>}
    </Link>
  );
  return collapsed ? <Tooltip content={label} side="right">{link}</Tooltip> : link;
}

export interface NavGroupProps {
  label: string;
  icon?: NavIconSource;
  count?: number;
  /** Controlled open state; omit for self-managed. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
  /** Extra control beside the heading (for example an "edit" button). */
  action?: ReactNode;
  children: ReactNode;
}

/** Collapsible group. The height animates with a grid-row transition (no JS measuring; instant under reduced motion). */
export function NavGroup({ label, icon, count, open: controlled, onOpenChange, defaultOpen = false, action, children }: NavGroupProps) {
  const [internal, setInternal] = useState(defaultOpen);
  const open = controlled ?? internal;
  const bodyId = useId();
  const toggle = () => { const next = !open; if (controlled === undefined) setInternal(next); onOpenChange?.(next); };
  return (
    <div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={toggle}
          className="group/nav focus-ring touch-target flex min-h-10 pointer-coarse:min-h-11 min-w-0 flex-1 items-center gap-2.5 rounded-nav px-[11px] py-1.5 text-left font-sans text-nav text-ink transition-colors duration-[var(--mo-duration-base)] hover:bg-soft hover:text-action"
        >
          {icon && <span className="grid size-6.5 shrink-0 place-items-center text-action"><NavGlyph icon={icon} /></span>}
          <span className="min-w-0 flex-1 leading-[1.25] [overflow-wrap:anywhere] line-clamp-2" title={label}>{label}</span>
          <Icon name="chevron-down" size="xs" className={cn('shrink-0 transition-transform duration-[var(--mo-duration-base)]', open && 'rotate-180')} />
        </button>
        {action}
      </div>
      <div id={bodyId} className={cn('grid transition-[grid-template-rows] duration-[var(--mo-duration-base)] ease-standard', open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')} {...(open ? {} : { inert: true })}>
        <div className="min-h-0 overflow-hidden"><div className="flex flex-col gap-1 py-1 pl-2">{children}</div></div>
      </div>
    </div>
  );
}

/** Small section label inside the navigation panel ("Favourites", "All modules"). */
export function NavHeading({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-[11px] pb-0.5 pt-3">
      <h2 className="font-sans text-caption font-medium text-ink">{children}</h2>
      {action}
    </div>
  );
}
