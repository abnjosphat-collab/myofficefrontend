// components/app-shell/ShellNotifications.tsx — the bell. One list, one place (the old shell had
// a second copy in the bottom bar). Opening it changes nothing: a row marks itself read when it is
// clicked, and the header offers Mark all read. Backlog sources render grouped with their counts
// ("showing 5 of 12") and a View-all link; the activity tail below stays a plain list, as before.
// A failed source is reported in the panel instead of being shown as "nothing to report".
'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { BellBadge, Button, Glyph, IconButton, MotionList, MotionListItem, Notice, Popover, PopoverContent, PopoverTrigger, Presence, cn, LoadingPulse } from '@/components/ui-system';
import { useNotifications, type BellGroup, type Notification } from './useNotifications';
import { useRiseKey } from './useRiseKey';
import type { SourceResult } from './useDashboardData';

/** Source order, not alphabetical: your own jobs first, then approvals, notices next — the merged feed's own order. */
const GROUP_ORDER: BellGroup[] = ['mywork', 'pw', 'leave', 'overtime', 'sheq', 'workorders', 'signoff', 'tasks', 'feedback', 'notices'];
const GROUP_META: Record<BellGroup, { title: string; viewAll: string }> = {
  pw: { title: 'Password resets', viewAll: '/admin' },
  leave: { title: 'Leave approvals', viewAll: '/leaves?status=pending' },
  overtime: { title: 'Overtime approvals', viewAll: '/overtime?status=pending' },
  sheq: { title: 'SHEQ follow-ups', viewAll: '/sheq_inspection' },
  workorders: { title: 'Overdue work orders', viewAll: '/maintenance' },
  signoff: { title: 'Waiting for sign-off', viewAll: '/maintenance' },
  mywork: { title: 'Assigned to me', viewAll: '/maintenance' },
  tasks: { title: 'Overdue tasks', viewAll: '/tasks-events' },
  feedback: { title: 'Feedback', viewAll: '/usage-analyzer#feedback' },
  notices: { title: 'Notices', viewAll: '/noticeboard' },
};

/** Pure — the bell's grouped sections in source order; empty groups are omitted. Exported for tests. */
export function groupBellItems(items: Notification[]): Array<{ group: BellGroup; items: Notification[] }> {
  const out: Array<{ group: BellGroup; items: Notification[] }> = [];
  for (const group of GROUP_ORDER) {
    const members = items.filter(n => n.group === group);
    if (members.length > 0) out.push({ group, items: members });
  }
  return out;
}

/** Pure — "5" when everything is shown, "showing 5 of 12" when the slice hides backlog. */
export function groupCountText(total: number, shown: number): string {
  return total > shown ? `showing ${shown} of ${total}` : `${total}`;
}

/** Pure — the shell bell is urgent when an unread notification is critical (an unresolved SHEQ inspection, an overdue work order or task). Pending approvals stay dark green. */
export function bellHasUrgentUnread(items: Array<Pick<Notification, 'unread' | 'status'>>): boolean {
  return items.some(n => n.unread && n.status === 'critical');
}

/** Pure — "X could not be loaded", "X and Y could not be loaded", "X, Y and Z could not be loaded". */
export function failedSourcesTitle(failed: SourceResult[]): string {
  const names = failed.map(s => s.label);
  const joined = names.length <= 2 ? names.join(' and ') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  return `${joined} could not be loaded`;
}

function BellRow({ item, onNavigate }: { item: Notification; onNavigate: (id: string) => void }) {
  return (
    <MotionListItem as="li" className="border-b border-line-subtle last:border-b-0">
      <Link
        href={item.href}
        onClick={() => onNavigate(item.id)}
        aria-label={item.actionLabel ? `${item.action}. ${item.actionLabel}` : item.action}
        className="focus-ring flex items-start gap-3 px-3.5 py-3 transition-colors hover:bg-surface-subtle"
      >
        <Glyph as={item.icon} size="md" className={cn('mt-0.5 shrink-0', item.status === 'critical' ? 'text-danger' : 'text-ink-muted')} />
        <div className="min-w-0 flex-1">
          <p className="font-sans text-body-sm text-ink">{item.action}</p>
          <p className="mt-0.5 font-sans text-caption text-ink-muted">
            {item.module}{item.time ? ` · ${item.time} ago` : ''}{item.user ? ` · ${item.user}` : ''}
            {item.actionLabel ? <span className="font-semibold text-action"> · {item.actionLabel}</span> : null}
          </p>
        </div>
        <Presence visible={item.unread} fadeOnly><span className="mt-1.5 block size-2 shrink-0 rounded-full bg-action" aria-label="Unread" /></Presence>
      </Link>
    </MotionListItem>
  );
}

export function ShellNotifications() {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, loading, failedSources, retry, markAllRead, markRead, totals } = useNotifications();
  const bounceKey = useRiseKey(unreadCount);
  const groups = useMemo(() => groupBellItems(notifications), [notifications]);
  // The activity tail renders below the groups as a plain list, exactly as before — no header, no counts.
  const activityTail = useMemo(
    () => notifications.filter(n => n.group === 'activity' || !n.group),
    [notifications],
  );
  const onNavigate = (id: string) => { markRead([id]); setOpen(false); };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <span className="relative inline-flex">
        <PopoverTrigger asChild>
          <IconButton icon="bell" label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'} variant="shell" size="shell" bounceTrigger={bounceKey} />
        </PopoverTrigger>
        {unreadCount > 0 && <BellBadge value={unreadCount} urgent={bellHasUrgentUnread(notifications)} />}
      </span>
      <PopoverContent align="end" className="w-[22rem] p-0">
        <div className="flex items-center justify-between border-b border-line-subtle px-3.5 py-2.5">
          <h2 className="font-display text-title font-semibold text-ink">Notifications</h2>
          {unreadCount > 0 && <Button variant="ghost" size="sm" onClick={() => markAllRead()}>Mark all read</Button>}
        </div>
        <div className="max-h-[min(24rem,70dvh)] overflow-y-auto">
          {failedSources.length > 0 && (
            <div className="p-2.5">
              <Notice
                tone="warning"
                title={failedSourcesTitle(failedSources)}
                action={
                  <div className="flex flex-wrap gap-1.5">
                    {failedSources.map(s => (
                      <Button key={s.source} size="sm" icon="refresh" onClick={() => retry(s.source)}>
                        Retry {s.label}
                      </Button>
                    ))}
                  </div>
                }
              >
                What you see below may be incomplete.
              </Notice>
            </div>
          )}
          {loading ? (
            <div className="p-3"><LoadingPulse compact label="Loading notifications" /></div>
          ) : notifications.length === 0 ? (
            failedSources.length === 0 && <p className="px-4 py-8 text-center font-sans text-body-sm text-ink-muted">Nothing new. Approvals, notices and activity will appear here.</p>
          ) : (
            <div>
              {groups.map(({ group, items }) => (
                <section key={group} aria-labelledby={`bell-group-${group}`} className="border-b border-line-subtle last:border-b-0">
                  <div className="flex items-center justify-between gap-2 px-3.5 pb-1 pt-2.5">
                    <h3 id={`bell-group-${group}`} className="font-sans text-caption font-medium uppercase tracking-wide text-ink-muted">
                      {GROUP_META[group].title} · {groupCountText(totals[group].total, totals[group].shown)}
                    </h3>
                    <Link href={GROUP_META[group].viewAll} onClick={() => setOpen(false)} className="focus-ring shrink-0 rounded font-sans text-body-sm font-medium text-action hover:underline">
                      View all
                    </Link>
                  </div>
                  <MotionList as="ul">
                    {items.map(item => <BellRow key={item.id} item={item} onNavigate={onNavigate} />)}
                  </MotionList>
                </section>
              ))}
              {activityTail.length > 0 && (
                <MotionList as="ul">
                  {activityTail.map(item => <BellRow key={item.id} item={item} onNavigate={onNavigate} />)}
                </MotionList>
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
