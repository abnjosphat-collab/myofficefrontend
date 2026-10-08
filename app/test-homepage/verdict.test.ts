// app/test-homepage/verdict.test.ts — locks in the verdict's honesty rules: the
// branches that claim "clear" or "none critical" must be unreachable on partial
// data, and total failure must offer a reload rather than zeros or dead links.
import { describe, it, expect } from 'vitest';
import { opsVerdict, type VerdictInput } from './verdict';

function input(over: Partial<VerdictInput> = {}): VerdictInput {
  return {
    openBreakdowns: 0,
    activeWorkOrders: 0,
    criticalCount: 0,
    pendingCount: 0,
    topItem: null,
    breakdownsHref: '/breakdowns',
    workOrdersHref: '/maintenance',
    failed: false,
    ...over,
  };
}

describe('opsVerdict — total failure', () => {
  it('reports unknown with a reload suggestion and no CTA when nothing loaded', () => {
    const v = opsVerdict(input({ openBreakdowns: null, activeWorkOrders: null, failed: true }));
    expect(v.tone).toBe('unknown');
    expect(v.suggestReload).toBe(true);
    expect(v.cta).toBeNull();
    expect(v.headline).toMatch(/couldn\u2019t be loaded/);
  });

  it('does not claim total failure when at least the counts survived', () => {
    const v = opsVerdict(input({ failed: true }));
    expect(v.suggestReload).toBe(false);
  });
});

describe('opsVerdict — critical and pending items', () => {
  it('goes critical with singular/plural headlines and a CTA into the top module', () => {
    const one = opsVerdict(input({ criticalCount: 1, topItem: { href: '/sheq', module: 'SHEQ' } }));
    expect(one.tone).toBe('critical');
    expect(one.headline).toBe('1 critical item needs a response.');
    expect(one.cta).toEqual({ label: 'Open SHEQ', href: '/sheq' });

    const many = opsVerdict(input({ criticalCount: 3, topItem: { href: '/leaves', module: 'Leaves' } }));
    expect(many.headline).toBe('3 critical items need a response.');
  });

  it('keeps the critical tone but drops the CTA when no module resolves', () => {
    const v = opsVerdict(input({ criticalCount: 2, topItem: null }));
    expect(v.tone).toBe('critical');
    expect(v.cta).toBeNull();
  });

  it('reports pending approvals as attention, never critical', () => {
    const v = opsVerdict(input({ pendingCount: 4, topItem: { href: '/overtime', module: 'Overtime' } }));
    expect(v.tone).toBe('attention');
    expect(v.headline).toBe('4 items are waiting on approval.');
    expect(v.cta).toEqual({ label: 'Open Overtime', href: '/overtime' });
  });

  it('prefers critical over pending when both exist', () => {
    const v = opsVerdict(input({ criticalCount: 1, pendingCount: 9, topItem: { href: '/sheq', module: 'SHEQ' } }));
    expect(v.tone).toBe('critical');
  });

  it('warns the picture may be incomplete instead of staying silent on failure', () => {
    const v = opsVerdict(input({ criticalCount: 1, failed: true, topItem: { href: '/sheq', module: 'SHEQ' } }));
    expect(v.detail).toMatch(/may be incomplete/);
  });
});

describe('opsVerdict — breakdowns without critical flags', () => {
  it('names the count and earns "none critical" only with zero criticals and no failure', () => {
    const v = opsVerdict(input({ openBreakdowns: 2 }));
    expect(v.tone).toBe('attention');
    expect(v.headline).toBe('2 open breakdowns.');
    expect(v.detail).toBe('None are marked critical.');
    expect(v.cta).toEqual({ label: 'Open Breakdowns', href: '/breakdowns' });
  });

  it('withholds "none critical" when a failed source could be hiding one', () => {
    const v = opsVerdict(input({ openBreakdowns: 2, failed: true }));
    expect(v.detail).toMatch(/may be incomplete/);
    expect(v.detail).not.toMatch(/None are marked critical/);
  });

  it('drops the breakdowns CTA when the catalogue link is unresolvable', () => {
    const v = opsVerdict(input({ openBreakdowns: 1, breakdownsHref: null }));
    expect(v.cta).toBeNull();
  });
});

describe('opsVerdict — the all-clear bar', () => {
  it('stays out of "clear" when any source failed, even with zero counts', () => {
    const v = opsVerdict(input({ failed: true }));
    expect(v.tone).toBe('unknown');
    expect(v.headline).toBe('No critical items in view.');
  });

  it('stays out of "clear" when a key figure is unknown, even without failure flags', () => {
    expect(opsVerdict(input({ openBreakdowns: null })).tone).toBe('unknown');
    expect(opsVerdict(input({ activeWorkOrders: null })).tone).toBe('unknown');
  });

  it('clears with the in-progress landscape when everything is known', () => {
    const v = opsVerdict(input({ activeWorkOrders: 12 }));
    expect(v.tone).toBe('clear');
    expect(v.headline).toBe('Everything is clear.');
    expect(v.detail).toBe('12 active work orders in progress. No open breakdowns.');
    expect(v.cta).toEqual({ label: 'View work orders', href: '/maintenance' });
  });

  it('clears quietly when there is genuinely nothing going on', () => {
    const v = opsVerdict(input());
    expect(v.tone).toBe('clear');
    expect(v.detail).toBe('Nothing needs you right now.');
    expect(v.cta).toBeNull();
  });
});
