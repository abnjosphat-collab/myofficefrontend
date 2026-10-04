// components/app-shell/ShellNotifications.tsx — the bell. One list, one place (the old shell had
// a second copy in the bottom bar). Opening it marks items as seen, as before. A failed source is
// reported in the panel instead of being shown as "nothing to report".
'use client';

import { useState } from 'react';
import { CountBadge, Glyph, IconButton, Notice, Popover, PopoverContent, PopoverTrigger, SkeletonRows, cn } from '@/components/ui-system';
import { useNotifications } from './useNotifications';

export function ShellNotifications() {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, loading, failed, markAllRead } = useNotifications();

  const onOpenChange = (next: boolean) => {
    if (next) markAllRead();
    setOpen(next);
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <span className="relative inline-flex">
        <PopoverTrigger asChild>
          <IconButton icon="bell" label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'} variant="shell" size="shell" />
        </PopoverTrigger>
        {unreadCount > 0 && (
          <span className="pointer-events-none absolute -right-0.5 -top-0.5">
            <CountBadge value={unreadCount > 9 ? '9+' : unreadCount} tone="danger" />
          </span>
        )}
      </span>
      <PopoverContent align="end" className="w-[22rem] p-0">
        <div className="flex items-center justify-between border-b border-line-subtle px-3.5 py-2.5">
          <h2 className="font-display text-title font-semibold text-ink">Notifications</h2>
        </div>
        <div className="max-h-[min(24rem,70dvh)] overflow-y-auto">
          {failed && (
            <div className="p-2.5">
              <Notice tone="warning" title="Some notifications could not be loaded">What you see below may be incomplete. Reload the page to try again.</Notice>
            </div>
          )}
          {loading ? (
            <div className="p-2.5"><SkeletonRows rows={3} label="Loading notifications" /></div>
          ) : notifications.length === 0 ? (
            !failed && <p className="px-4 py-8 text-center font-sans text-body-sm text-ink-muted">Nothing new. Approvals, notices and activity will appear here.</p>
          ) : (
            <ul>
              {notifications.map(item => (
                <li key={item.id} className="flex items-start gap-3 border-b border-line-subtle px-3.5 py-3 last:border-b-0">
                  <Glyph as={item.icon} size="md" className={cn('mt-0.5 shrink-0', item.status === 'critical' ? 'text-danger' : 'text-ink-muted')} />
                  <div className="min-w-0 flex-1">
                    <p className="font-sans text-body-sm text-ink">{item.action}</p>
                    <p className="mt-0.5 font-sans text-caption text-ink-muted">
                      {item.module}{item.time ? ` · ${item.time} ago` : ''}{item.user ? ` · ${item.user}` : ''}
                    </p>
                  </div>
                  {item.unread && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-action" aria-label="Unread" />}
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
