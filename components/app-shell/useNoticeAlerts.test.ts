import { describe, it, expect } from 'vitest';
import { buildNoticeAlerts } from './useNoticeAlerts';
import type { Notice } from '@/app/noticeboard/types';

function notice(over: Partial<Notice> = {}): Notice {
  return {
    id: '1', title: 'Fire drill', content: 'Details', date: '2026-08-10',
    category: 'Safety', priority: 'Medium', status: 'Active',
    is_pinned: false, requires_acknowledgment: false,
    ...over,
  };
}

describe('buildNoticeAlerts', () => {
  it('excludes an expired notice', () => {
    const { notices } = buildNoticeAlerts(
      [notice({ id: '1', expires_at: '2026-08-01' })],
      false,
      new Date('2026-08-10'),
    );
    expect(notices).toHaveLength(0);
  });

  it('keeps a notice with no expiry, and one expiring in the future', () => {
    const { notices } = buildNoticeAlerts(
      [notice({ id: '1', expires_at: null }), notice({ id: '2', expires_at: '2026-09-01' })],
      false,
      new Date('2026-08-10'),
    );
    expect(notices.map(n => n.id)).toEqual(['1', '2']);
  });

  it('excludes a Management Only notice for a non-manager', () => {
    const { notices } = buildNoticeAlerts(
      [notice({ id: '1', target_audience: 'Management Only' })],
      false,
    );
    expect(notices).toHaveLength(0);
  });

  it('includes a Management Only notice for a manager', () => {
    const { notices } = buildNoticeAlerts(
      [notice({ id: '1', target_audience: 'Management Only' })],
      true,
    );
    expect(notices).toHaveLength(1);
  });

  it('shows a non-Management-Only notice to everyone regardless of role', () => {
    const { notices } = buildNoticeAlerts(
      [notice({ id: '1', target_audience: 'Department Specific' })],
      false,
    );
    expect(notices).toHaveLength(1);
  });

  it('sorts pinned notices ahead of unpinned, regardless of priority', () => {
    const { notices } = buildNoticeAlerts(
      [
        notice({ id: 'unpinned-critical', is_pinned: false, priority: 'Critical' }),
        notice({ id: 'pinned-low', is_pinned: true, priority: 'Low' }),
      ],
      false,
    );
    expect(notices.map(n => n.id)).toEqual(['pinned-low', 'unpinned-critical']);
  });

  it('within the same pinned state, sorts by priority: Critical > High > Medium > Low', () => {
    const { notices } = buildNoticeAlerts(
      [
        notice({ id: 'low', priority: 'Low' }),
        notice({ id: 'critical', priority: 'Critical' }),
        notice({ id: 'medium', priority: 'Medium' }),
        notice({ id: 'high', priority: 'High' }),
      ],
      false,
    );
    expect(notices.map(n => n.id)).toEqual(['critical', 'high', 'medium', 'low']);
  });

  it('within the same pinned state and priority, sorts by date descending', () => {
    const { notices } = buildNoticeAlerts(
      [
        notice({ id: 'older', date: '2026-08-01' }),
        notice({ id: 'newer', date: '2026-08-10' }),
      ],
      false,
    );
    expect(notices.map(n => n.id)).toEqual(['newer', 'older']);
  });

  it('maps each eligible notice to an ActivityItem with a stable notice-<id> id', () => {
    const { alerts } = buildNoticeAlerts([notice({ id: '42', title: 'Payroll update' })], false);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].id).toBe('notice-42');
    expect(alerts[0].action).toBe('Payroll update');
    expect(alerts[0].module).toBe('Noticeboard');
  });

  it('maps Critical priority to "critical" status and Low to "normal"', () => {
    const { alerts } = buildNoticeAlerts(
      [notice({ id: '1', priority: 'Critical' }), notice({ id: '2', priority: 'Low' })],
      false,
    );
    expect(alerts.find(a => a.id === 'notice-1')?.status).toBe('critical');
    expect(alerts.find(a => a.id === 'notice-2')?.status).toBe('normal');
  });

  it('returns empty arrays for empty input', () => {
    expect(buildNoticeAlerts([], false)).toEqual({ notices: [], alerts: [] });
  });
});
