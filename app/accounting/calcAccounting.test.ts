import { describe, it, expect } from 'vitest';
import { calcNetWorth } from './calcAccounting';
import type { FinAsset, FinLiability } from './types';

function asset(value: number): FinAsset {
  return { id: '1', name: 'Asset', category: 'General', acquiredDate: '2026-01-01', value, notes: '' };
}
function liability(amount: number): FinLiability {
  return { id: '1', name: 'Liability', category: 'General', dueDate: '2026-01-01', amount, notes: '' };
}

describe('calcNetWorth', () => {
  it('sums assets and liabilities separately, and nets them into netWorth', () => {
    const r = calcNetWorth([asset(1000), asset(500)], [liability(300)]);
    expect(r.assetsTotal).toBe(1500);
    expect(r.liabilitiesTotal).toBe(300);
    expect(r.netWorth).toBe(1200);
  });

  it('is 0/0/0 with no assets or liabilities', () => {
    expect(calcNetWorth([], [])).toEqual({ assetsTotal: 0, liabilitiesTotal: 0, netWorth: 0 });
  });

  it('netWorth goes negative when liabilities exceed assets', () => {
    const r = calcNetWorth([asset(100)], [liability(500)]);
    expect(r.netWorth).toBe(-400);
  });
});
