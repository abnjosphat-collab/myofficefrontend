import { describe, expect, it } from 'vitest';
import { confidenceTone, extractRows, parsePrice, toBulkItem } from './extract';

describe('parsePrice', () => {
  it('reads plain, symbol-prefixed and thousands-separated prices', () => {
    expect(parsePrice('12.5')).toBe(12.5);
    expect(parsePrice('$1,234.50')).toBe(1234.5);
    expect(parsePrice(' £ 8 ')).toBe(8);
    expect(parsePrice(7)).toBe(7);
  });
  it('reads a decimal comma as a decimal, not as thousands', () => {
    expect(parsePrice('12,50')).toBe(12.5);
    expect(parsePrice('1,234')).toBe(1234);
  });
  it('returns null (never 0) for empty or non-numeric cells and negatives', () => {
    for (const v of [null, undefined, '', '   ', 'n/a', '-5', -1, NaN, 'abc']) expect(parsePrice(v)).toBeNull();
    expect(parsePrice(0)).toBe(0); // an explicit zero is a price
    expect(parsePrice('0')).toBe(0);
  });
});

describe('extractRows', () => {
  const map = { stock_code: 'Code', description: 'Desc', unit_price: 'Price' };
  it('flags rows missing a code or description and keeps categories', () => {
    const rows = extractRows([{ Code: ' A1 ', Desc: 'Bearing', Price: '9', _category: 'Bearings' }, { Code: '', Desc: 'x', Price: '1' }, { Code: 'B', Desc: '' }], map);
    expect(rows.map(r => r.valid)).toEqual([true, false, false]);
    expect(rows[0]).toMatchObject({ stock_code: 'A1', unit_price: 9, category: 'Bearings' });
  });
  it('treats an unmapped price column as no price', () => {
    expect(extractRows([{ Code: 'A', Desc: 'd', Price: '5' }], { ...map, unit_price: '' })[0].unit_price).toBeNull();
  });
});

describe('toBulkItem', () => {
  it('sends only what the file says, so an update cannot reset stock or supplier', () => {
    const item = toBulkItem({ stock_code: 'A1', description: 'Bearing', unit_price: 9, category: 'Bearings', valid: true });
    expect(Object.keys(item).sort()).toEqual(['categories', 'category', 'description', 'stock_code', 'unit_price']);
    for (const k of ['current_quantity', 'min_quantity', 'max_quantity', 'priority', 'safety_stock', 'lead_time_days']) expect(item).not.toHaveProperty(k);
  });
  it('omits the price and category when the file has none', () => {
    expect(toBulkItem({ stock_code: 'A', description: 'd', unit_price: null, category: '', valid: true })).toEqual({ stock_code: 'A', description: 'd' });
  });
});

describe('confidenceTone', () => {
  it('bands at 0.7 and 0.4', () => {
    expect([0.7, 0.69, 0.4, 0.39].map(c => confidenceTone(c).label)).toEqual(['High', 'Medium', 'Medium', 'Low']);
  });
});
