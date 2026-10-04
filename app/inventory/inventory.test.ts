import { describe, expect, it } from 'vitest';
import { parseInventory, stockStatus } from './useInventoryData';

describe('inventory storage helpers', () => {
  it('parses nothing (not sample data) from an empty or corrupt value', () => {
    expect(parseInventory('')).toEqual([]);
    expect(parseInventory('not json')).toEqual([]);
    expect(parseInventory('{"a":1}')).toEqual([]);
  });
  it('keeps only well-formed items', () => {
    expect(parseInventory(JSON.stringify([{ id: 'a' }, null, 5, { name: 'no id' }]))).toEqual([{ id: 'a' }]);
  });
  it('derives stock status from level and minimum', () => {
    expect(stockStatus({ currentStock: 0, minStock: 5 })).toBe('out-of-stock');
    expect(stockStatus({ currentStock: 5, minStock: 5 })).toBe('low-stock');
    expect(stockStatus({ currentStock: 6, minStock: 5 })).toBe('in-stock');
  });
});
