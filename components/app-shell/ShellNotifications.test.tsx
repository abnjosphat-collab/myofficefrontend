import { cleanup, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToolsNotifications } from '@/app/tools/ToolsNotifications';
import { ShellNotifications, bellHasUrgentUnread, failedSourcesTitle, groupBellItems, groupCountText } from './ShellNotifications';
import { useNotifications, type BellTotals, type Notification } from './useNotifications';

vi.mock('./useNotifications', () => ({ useNotifications: vi.fn() }));
const hook = vi.mocked(useNotifications);

const n = (id: string, group: Notification['group']): Notification => ({
  id, group, action: id, module: 'M', icon: (() => null) as never,
  time: '', timestamp: 1, status: 'normal', href: '/x', unread: true,
});

const emptyTotals = (): BellTotals => ({
  pw: { total: 0, shown: 0 }, leave: { total: 0, shown: 0 }, overtime: { total: 0, shown: 0 },
  sheq: { total: 0, shown: 0 }, workorders: { total: 0, shown: 0 }, signoff: { total: 0, shown: 0 }, mywork: { total: 0, shown: 0 }, tasks: { total: 0, shown: 0 },
  notices: { total: 0, shown: 0 }, feedback: { total: 0, shown: 0 },
});

describe('groupBellItems', () => {
  it('orders groups by source, omits empties, excludes the activity tail', () => {
    const items = [n('wo-1', 'activity'), n('leave-2', 'leave'), n('leave-1', 'leave'), n('notice-1', 'notices')];
    const groups = groupBellItems(items);
    expect(groups.map(g => g.group)).toEqual(['leave', 'notices']);
    expect(groups[0].items.map(i => i.id)).toEqual(['leave-2', 'leave-1']);
  });

  it('returns no groups for activity-only items', () => {
    expect(groupBellItems([n('wo-1', 'activity'), n('bd-2', undefined)])).toEqual([]);
  });

  it('puts your own jobs first, then approvals and sign-off (M8)', () => {
    const items = [n('leave-1', 'leave'), n('mine-1', 'mywork'), n('sign-1', 'signoff'), n('od-1', 'workorders')];
    expect(groupBellItems(items).map(g => g.group)).toEqual(['mywork', 'leave', 'workorders', 'signoff']);
  });
});

describe('groupCountText', () => {
  it('names the backlog only when the slice hides rows', () => {
    expect(groupCountText(12, 5)).toBe('showing 5 of 12');
    expect(groupCountText(5, 5)).toBe('5');
    expect(groupCountText(0, 0)).toBe('0');
  });
});

describe('failedSourcesTitle', () => {
  const src = (label: string) => ({ source: label, label, ok: false });
  it('joins one, two and three names in words', () => {
    expect(failedSourcesTitle([src('Notices')])).toBe('Notices could not be loaded');
    expect(failedSourcesTitle([src('Overtime approvals'), src('Notices')])).toBe('Overtime approvals and Notices could not be loaded');
    expect(failedSourcesTitle([src('Leave approvals'), src('Overtime approvals'), src('Notices')])).toBe(
      'Leave approvals, Overtime approvals and Notices could not be loaded',
    );
  });
});

describe('bellHasUrgentUnread', () => {
  const item = (unread: boolean, status: Notification['status']): Notification => ({ ...n('x', 'sheq'), unread, status });
  it('is true only for an unread critical notification', () => {
    expect(bellHasUrgentUnread([item(true, 'critical')])).toBe(true);
    expect(bellHasUrgentUnread([item(false, 'critical')])).toBe(false);
    expect(bellHasUrgentUnread([item(true, 'pending')])).toBe(false);
    expect(bellHasUrgentUnread([item(true, 'normal')])).toBe(false);
    expect(bellHasUrgentUnread([])).toBe(false);
  });
});

describe('ShellNotifications badge tone', () => {
  beforeEach(() => { hook.mockReset(); });
  const show = (items: Notification[]) => {
    const totals = emptyTotals();
    for (const item of items) {
      if (item.group && item.group in totals) {
        const t = totals[item.group as keyof BellTotals];
        t.total += 1; t.shown += 1;
      }
    }
    hook.mockReturnValue({
      notifications: items, unreadCount: items.filter(i => i.unread).length,
      loading: false, failed: false, markAllRead: () => {}, markRead: () => {},
      totals, failedSources: [], retry: () => {},
    });
    render(<ShellNotifications />);
  };

  it('is red when an unread critical notification is present', () => {
    show([{ ...n('sheq-1', 'sheq'), status: 'critical', unread: true }]);
    expect(screen.getByText('1', { selector: '[aria-hidden="true"]' }).closest('[class*="bg-danger"]')).not.toBeNull();
  });

  it('is dark green when only pending approvals are unread', () => {
    show([{ ...n('leave-1', 'leave'), status: 'pending', unread: true }]);
    expect(screen.getByText('1', { selector: '[aria-hidden="true"]' }).closest('[class*="bg-action"]')).not.toBeNull();
  });

  it('both bells render the same badge for the same counts', () => {
    const toolsBase = { unread: 0, onRetry: () => {}, onViewed: () => {}, onShowOverdue: () => {}, onShowInspection: () => {}, onShowAccounts: () => {}, onShowFeedback: () => {}, onShowToolbox: () => {} };
    const toolsZero = { overdue: 0, attention: 0, inspectionDue: 0, investigationsOverdue: 0, overdueEscalations: 0, passwordRequests: 0, feedback: 0, toolboxDue: 0, toolboxOverdue: 0 };
    // Urgent pair: unread critical here, an overdue return there.
    show([{ ...n('sheq-1', 'sheq'), status: 'critical', unread: true }]);
    const shellUrgent = (screen.getByText('1', { selector: '[aria-hidden="true"]' }).closest('span.inline-flex') as HTMLElement).className;
    cleanup();
    render(<ToolsNotifications {...toolsBase} counts={{ ...toolsZero, overdue: 1 }} unread={1} />);
    expect((screen.getByText('1', { selector: '[aria-hidden="true"]' }).closest('span.inline-flex') as HTMLElement).className).toBe(shellUrgent);
    // Normal pair: a pending approval here, a scheduled check there.
    cleanup();
    show([{ ...n('leave-1', 'leave'), status: 'pending', unread: true }]);
    const shellNormal = (screen.getByText('1', { selector: '[aria-hidden="true"]' }).closest('span.inline-flex') as HTMLElement).className;
    cleanup();
    render(<ToolsNotifications {...toolsBase} counts={{ ...toolsZero, inspectionDue: 1 }} unread={1} />);
    expect((screen.getByText('1', { selector: '[aria-hidden="true"]' }).closest('span.inline-flex') as HTMLElement).className).toBe(shellNormal);
  });
});
