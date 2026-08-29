import { describe, it, expect } from 'vitest';
import { itemTotal } from './calcRequisitions';
import type { RequisitionItem } from './types';

function item(over: Partial<RequisitionItem> = {}): RequisitionItem {
  return { description: 'Item', costPerUnit: 10, quantity: 1, reason: '', ...over };
}

describe('itemTotal', () => {
  it('sums cost-per-unit times quantity across every item', () => {
    const total = itemTotal([item({ costPerUnit: 10, quantity: 2 }), item({ costPerUnit: 5, quantity: 3 })]);
    expect(total).toBe(35); // (10*2) + (5*3)
  });

  it('is 0 for an empty item list', () => {
    expect(itemTotal([])).toBe(0);
  });

  it('handles a single item', () => {
    expect(itemTotal([item({ costPerUnit: 12.5, quantity: 4 })])).toBe(50);
  });
});
