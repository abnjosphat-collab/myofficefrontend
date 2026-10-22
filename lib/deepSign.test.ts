import { describe, expect, it } from 'vitest';
import { deepSignDecision } from './deepSign';

const pending = { status: 'pending' };

describe('deepSignDecision', () => {
  it('opens nothing without sign=approve', () => {
    expect(deepSignDecision('leave request', pending, null, true)).toEqual({ gate: false, notice: null });
    expect(deepSignDecision('leave request', pending, 'view', true)).toEqual({ gate: false, notice: null });
  });

  it('opens the gate for a pending record and a manager', () => {
    expect(deepSignDecision('leave request', pending, 'approve', true)).toEqual({ gate: true, notice: null });
  });

  it('refuses a non-manager with a notice', () => {
    expect(deepSignDecision('overtime request', pending, 'approve', false)).toEqual({
      gate: false, notice: 'Only a manager can approve this overtime request.',
    });
  });

  it('names who decided and when', () => {
    const approved = deepSignDecision('leave request', { status: 'approved', approved_by: 'Miriam', approved_at: '2026-10-19T08:00:00Z' }, 'approve', true);
    expect(approved.gate).toBe(false);
    expect(approved.notice).toContain('Already approved by Miriam on ');
    expect(approved.notice).toContain('2026');
    const rejected = deepSignDecision('leave request', { status: 'rejected', rejected_by: 'Miriam', rejected_at: '2026-10-19T08:00:00Z' }, 'approve', true);
    expect(rejected.notice).toContain('Already rejected by Miriam on ');
  });

  it('falls back cleanly without stamps, and for other statuses', () => {
    expect(deepSignDecision('leave request', { status: 'approved' }, 'approve', true).notice).toBe('Already approved.');
    expect(deepSignDecision('leave request', { status: 'rejected' }, 'approve', true).notice).toBe('Already rejected.');
    expect(deepSignDecision('overtime request', { status: 'cancelled' }, 'approve', true)).toEqual({
      gate: false, notice: 'This overtime request is no longer pending.',
    });
  });
});
