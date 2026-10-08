'use client';

import type { ReactNode } from 'react';
import { cn } from '../foundations/cn';
import { Icon } from '../foundations/Icon';
import type { IconMeaning } from '../foundations/icon-meanings';
import { Button, Spinner } from '../primitives/Button';
import { LoadingPulse } from './LoadingPulse';
import type { DataStatus } from './dataStatus';

export interface EmptyStateProps {
  icon?: IconMeaning;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/** Nothing to show *because there is nothing* (a successful, empty result). Never use for failures. */
export function EmptyState({ icon = 'empty', title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 rounded-card border border-line-subtle bg-surface px-6 py-10 text-center', className)}>
      <span className="inline-flex size-12 items-center justify-center rounded-full bg-surface-muted text-ink-muted"><Icon name={icon} size="xl" /></span>
      <div className="max-w-md">
        <h3 className="font-display text-title font-semibold text-ink">{title}</h3>
        {description && <p className="mt-1 font-sans text-body-sm text-ink-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/** Slim single-line status (retrying, may be out of date). Same honesty as `Notice`, a fraction of the height. */
export function StatusLine({ tone = 'info', children, action }: { tone?: 'info' | 'warning'; children: ReactNode; action?: ReactNode }) {
  const tones = { info: 'text-info', warning: 'text-warning' } as const;
  return (
    <div role="status" className={cn('flex min-h-8 flex-wrap items-center gap-x-2 gap-y-1 font-sans text-body-sm', tones[tone])}>
      {tone === 'info' ? <Spinner className="size-3.5 shrink-0" /> : <Icon name="warning" size="sm" weight="emphasis" className="shrink-0" />}
      <span className="min-w-0 flex-1 text-ink-muted">{children}</span>
      {action}
    </div>
  );
}

/** Inline notice used for stale / retrying / refreshing banners. */
export function Notice({ tone = 'info', icon, title, children, action }: {
  tone?: 'info' | 'warning' | 'danger';
  icon?: IconMeaning;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  const tones = {
    info: 'border-info-line bg-info-soft text-info',
    warning: 'border-warning-line bg-warning-soft text-warning',
    danger: 'border-danger-line bg-danger-soft text-danger',
  } as const;
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cn('flex flex-wrap items-center gap-3 rounded-card border px-3.5 py-2.5', tones[tone])}>
      <Icon name={icon ?? (tone === 'info' ? 'info' : 'warning')} size="lg" weight="emphasis" />
      <div className="min-w-0 flex-1">
        <p className="font-sans text-label font-semibold">{title}</p>
        {children && <p className="mt-0.5 font-sans text-body-sm text-ink">{children}</p>}
      </div>
      {action}
    </div>
  );
}

export interface DataRegionProps {
  status: DataStatus;
  /** What this region holds, in lower case: "work orders". Used in every message. */
  subject: string;
  error?: string | null;
  onRetry?: () => void;
  /** Rendered when status is empty. Usually an <EmptyState>. */
  empty?: ReactNode;
  /** The records. Rendered for ready / refreshing / stale-error. */
  children: ReactNode;
  /** Kept so existing callers still compile; the loading state is now the LoadingPulse animation, not placeholder rows. */
  skeletonRows?: number;
  /** Status lines cycled under the loading label. Say only what is really being fetched. */
  loadingDetail?: string[];
  /** Custom loading content (a themed loader). Defaults to the shared LoadingPulse animation. */
  loadingContent?: ReactNode;
  className?: string;
}

/**
 * One place that decides how a list/table/grid presents loading, refreshing,
 * retrying, empty, unauthorized and failure. Records already on screen stay
 * visible through refreshes and failed refreshes. A failure is never an empty list.
 */
export function DataRegion({ status, subject, error, onRetry, empty, children, loadingDetail, loadingContent, className }: DataRegionProps) {
  const cap = subject.charAt(0).toUpperCase() + subject.slice(1);
  const loading = loadingContent ?? <LoadingPulse label={`Loading ${subject}`} detail={loadingDetail} />;
  const retry = onRetry ? <Button size="sm" icon="refresh" onClick={onRetry}>Try again</Button> : undefined;

  if (status === 'loading') return <div className={className}>{loading}</div>;
  if (status === 'retrying') {
    return (
      <div className={cn('flex flex-col gap-3', className)}>
        <StatusLine tone="info"><strong className="font-medium text-ink">Still loading {subject}.</strong> The service is slow to respond. Retrying automatically.{error ? ` Last answer: ${error}` : ''}</StatusLine>
        {loadingContent ?? <LoadingPulse compact label={`Loading ${subject}`} />}
      </div>
    );
  }
  if (status === 'unauthorized') {
    return <EmptyState icon="lock" title={`You do not have access to ${subject}`} description={error ?? 'Ask an administrator to grant access, or sign in with a different account.'} className={className} />;
  }
  if (status === 'error') {
    return (
      <div className={className}>
        <Notice tone="danger" icon="warning" title={`${cap} could not be loaded`} action={retry}>
          {error ?? 'Something went wrong. Your records are safe; nothing was changed.'}
        </Notice>
      </div>
    );
  }
  if (status === 'empty') return <div className={className}>{empty ?? <EmptyState title={`No ${subject} yet`} />}</div>;
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {status === 'stale-error' && <StatusLine tone="warning" action={retry}><strong className="font-medium text-ink">{cap} may be out of date.</strong> {error ?? 'The latest refresh failed. Showing the last records received.'}</StatusLine>}
      {status === 'refreshing' && (
        <p role="status" className="flex items-center gap-2 font-sans text-caption text-ink-muted"><Spinner className="size-3.5" />Refreshing {subject}…</p>
      )}
      {children}
    </div>
  );
}
