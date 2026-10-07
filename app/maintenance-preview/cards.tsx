// app/maintenance-preview/cards.tsx — the shared pieces every module composes: InfoCard, StatCard, Avatar, StatusDot, Meter, Reveal.
// A module passes data; it never restyles a card. (If the owner approves the preview these move into components/ui-system/patterns.)
'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/components/ui-system';
import type { Priority, Status } from './fixtures';
import { STATUS_LABEL } from './fixtures';

const TONE_DOT: Record<string, string> = { warning: 'bg-warning', info: 'bg-info', brand: 'bg-action', success: 'bg-success', neutral: 'bg-neutral', danger: 'bg-danger' };
export const STATUS_DOT_TONE: Record<Status, string> = { pending: 'warning', 'in-progress': 'info', 'awaiting-signoff': 'brand', completed: 'success', 'on-hold': 'neutral' };

/** Dot and word together, so colour is never the only signal. */
export function StatusDot({ tone, children }: { tone: string; children: ReactNode }) {
  return <span className="inline-flex items-center gap-1.5 font-sans text-caption font-medium text-ink-muted"><span aria-hidden className={cn('size-1.5 rounded-full', TONE_DOT[tone] ?? 'bg-neutral')} />{children}</span>;
}
export const WorkStatus = ({ status, overdue }: { status: Status; overdue?: boolean }) => (
  <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1"><StatusDot tone={STATUS_DOT_TONE[status]}>{STATUS_LABEL[status]}</StatusDot>{overdue && <StatusDot tone="danger"><span className="text-danger">Overdue</span></StatusDot>}</span>
);

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const initials = name.replace(/\./g, '').split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  return <span aria-hidden className={cn('inline-flex shrink-0 items-center justify-center rounded-full bg-surface-muted font-sans font-semibold text-ink-muted', size === 'sm' ? 'size-6 text-[0.6875rem]' : 'size-8 text-caption')}>{initials}</span>;
}
export const Person = ({ name, size }: { name: string; size?: 'sm' | 'md' }) => <span className="inline-flex min-w-0 items-center gap-2"><Avatar name={name} size={size} /><span className="truncate font-sans text-body-sm text-ink">{name}</span></span>;

/** A thin meter; the value is also given in words by the caller. */
export function Meter({ value, label }: { value: number; label: string }) {
  const v = Math.max(0, Math.min(100, value));
  return <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={v} className="mp-bar h-1 w-full overflow-hidden rounded-full bg-surface-muted"><span className="block h-full rounded-full bg-action" style={{ width: `${v}%` }} /></div>;
}

/** Stagger wrapper: children rise in order, 30 ms apart, at most eight. */
export function Reveal({ index = 0, className, children }: { index?: number; className?: string; children: ReactNode }) {
  return <div className={cn('mp-rise', className)} style={{ ['--mp-i' as string]: Math.min(index, 8) }}>{children}</div>;
}

const ACCENT: Partial<Record<Priority, string>> = { high: 'before:bg-warning', urgent: 'before:bg-danger' };

/** The one card anatomy: eyebrow, title, subtitle, facts, optional meter and action. The title is the control (a button or a link). */
export function InfoCard({ eyebrow, aside, title, subtitle, facts, meter, action, priority, selected, leaving, onOpen, href, openLabel, className }: {
  eyebrow: ReactNode; aside?: ReactNode; title: string; subtitle?: string; facts?: ReactNode; meter?: ReactNode; action?: ReactNode;
  priority?: Priority; selected?: boolean; leaving?: boolean; onOpen?: () => void; href?: string; openLabel?: string; className?: string;
}) {
  const titleClass = 'focus-ring block w-full rounded-xs text-left font-display text-title text-ink after:absolute after:inset-0 after:content-[""]';
  const heading = (
    <>
      <span className="block [overflow-wrap:anywhere]">{title}</span>
      {subtitle && <span className="mt-0.5 block font-sans text-body-sm font-normal text-ink-muted [overflow-wrap:anywhere]">{subtitle}</span>}
    </>
  );
  return (
    <article className={cn('mp-card relative flex flex-col gap-3 overflow-hidden rounded-card border border-line-subtle bg-surface p-4 before:absolute before:inset-y-3 before:left-0 before:w-[3px] before:rounded-full', priority && ACCENT[priority], selected && 'lg:bg-action-soft', leaving && 'mp-leave', className)}>
      <div className="flex items-center justify-between gap-3">{eyebrow}{aside && <span className="font-sans text-caption tabular text-ink-muted">{aside}</span>}</div>
      <h3 className="m-0">
        {href ? <Link href={href} aria-label={openLabel} className={titleClass}>{heading}</Link>
          : onOpen ? <button type="button" aria-label={openLabel} onClick={onOpen} className={titleClass}>{heading}</button>
          : <span className="block font-display text-title text-ink">{heading}</span>}
      </h3>
      {facts && <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">{facts}</div>}
      {meter}
      {action && <div className="relative z-10 flex flex-wrap gap-2">{action}</div>}
    </article>
  );
}

/** A figure that answers one question and links to the list behind it. */
export function StatCard({ value, label, context, href, tone, index = 0 }: { value: string | number; label: string; context?: string; href: string; tone?: 'danger'; index?: number }) {
  return (
    <Reveal index={index}>
      <Link href={href} className="mp-card focus-ring relative flex h-full flex-col gap-1 rounded-card border border-line-subtle bg-surface p-4">
        <span className={cn('font-display text-metric tabular', tone === 'danger' && Number(value) > 0 ? 'text-danger' : 'text-ink')}>{value}</span>
        <span className="font-sans text-label font-semibold text-ink">{label}</span>
        {context && <span className="font-sans text-caption text-ink-muted">{context}</span>}
      </Link>
    </Reveal>
  );
}

/** A labelled group of cards. */
export function Section({ title, count, action, children, className }: { title: string; count?: number; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section aria-label={title} className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-baseline justify-between gap-3"><h2 className="font-display text-section text-ink">{title}{count !== undefined && <span className="ml-2 font-sans text-body-sm font-normal text-ink-muted tabular">{count}</span>}</h2>{action}</div>
      {children}
    </section>
  );
}
