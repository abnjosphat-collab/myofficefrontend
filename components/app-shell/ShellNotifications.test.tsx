import { describe, expect, it } from 'vitest';
import { failedSourcesTitle, groupBellItems, groupCountText } from './ShellNotifications';
import type { Notification } from './useNotifications';

const n = (id: string, group: Notification['group']): Notification => ({
  id, group, action: id, module: 'M', icon: (() => null) as never,
  time: '', timestamp: 1, status: 'normal', href: '/x', unread: true,
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
