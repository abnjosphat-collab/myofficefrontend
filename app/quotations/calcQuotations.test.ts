import { describe, it, expect } from 'vitest';
import { calculateTotals } from './calcQuotations';
import type { QuotationItem } from './types';

function item(over: Partial<QuotationItem> = {}): QuotationItem {
  return { id: 1, description: 'Item', quantity: 1, rate: 100, amount: 100, category: 'General', ...over };
}

describe('calculateTotals', () => {
  it('subtotal is the sum of each item\'s amount', () => {
    const t = calculateTotals([item({ amount: 100 }), item({ amount: 50 })], 0, 0);
    expect(t.subtotal).toBe('150.00');
  });

  it('tax is a percentage of the subtotal', () => {
    const t = calculateTotals([item({ amount: 100 })], 10, 0);
    expect(t.taxAmount).toBe('10.00');
  });

  it('discount is a percentage of the subtotal, subtracted from the total (not from tax)', () => {
    const t = calculateTotals([item({ amount: 100 })], 10, 20);
    expect(t.discountAmount).toBe('20.00');
    // total = subtotal + tax - discount = 100 + 10 - 20
    expect(t.total).toBe('90.00');
  });

  it('is all zeros for an empty item list', () => {
    const t = calculateTotals([], 10, 5);
    expect(t).toEqual({ subtotal: '0.00', taxAmount: '0.00', discountAmount: '0.00', total: '0.00' });
  });

  it('rounds every field to 2 decimal places as a string', () => {
    const t = calculateTotals([item({ amount: 33.333 })], 7.5, 0);
    expect(t.subtotal).toBe('33.33');
    expect(t.taxAmount).toBe('2.50');
  });
});
