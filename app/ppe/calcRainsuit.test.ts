import { describe, expect, it } from 'vitest';
import { filterRequirements, normalizeSize, summarizeRequirements, type RainsuitFilters } from './calcRainsuit';
import type { PPERequirement } from './types';

const row = (over: Partial<PPERequirement> = {}): PPERequirement => ({
  id: 'r1', employee_id: 'C1001', source_name: 'David Muronda', employee_name: 'David Muronda',
  department: 'Engineering', mine_section: '', ppe_type: 'rainsuit',
  size_source: 'L', size_canonical: 'L', quantity: 1, status: 'required',
  source_ref: 'raincoat-2026-10', notes: '', fulfilled: false, ...over,
});

const NONE: RainsuitFilters = { search: '', size: 'all', fulfilment: 'all', showUnmatched: true };

describe('normalizeSize', () => {
  it('maps the six canonical sizes and common labels', () => {
    expect(normalizeSize('xxl')).toBe('XXL');
    expect(normalizeSize('Raincoat - XL')).toBe('XL');
    expect(normalizeSize('M')).toBe('M');
  });
  it('never guesses an unknown size', () => {
    expect(normalizeSize('')).toBeNull();
    expect(normalizeSize('Huge')).toBeNull();
  });
});

describe('summarizeRequirements', () => {
  it('counts people and rainsuits separately and keeps unknown visible', () => {
    const summary = summarizeRequirements([
      row({ id: 'a', size_canonical: 'L' }),
      row({ id: 'b', size_canonical: 'XXL', quantity: 1 }),
      row({ id: 'c', size_canonical: null, size_source: '' }),
    ]);
    expect(summary.people).toBe(3);
    expect(summary.total).toBe(3);
    expect(summary.counts).toEqual({ L: 1, XXL: 1 });
    expect(summary.unknown).toBe(1);
    expect(summary.bySize('M')).toBe(0);
  });
});

describe('filterRequirements', () => {
  const rows = [
    row({ id: 'a', employee_id: 'C1001', source_name: 'David Muronda', size_canonical: 'L', fulfilled: true }),
    row({ id: 'b', employee_id: 'C1002', source_name: 'T. Kapenzi', size_canonical: 'S', fulfilled: false }),
    row({ id: 'c', employee_id: null, source_name: 'Togara', size_canonical: 'L', fulfilled: false }),
  ];
  it('searches names and mine numbers', () => {
    expect(filterRequirements(rows, { ...NONE, search: 'kapenzi' }).map(r => r.id)).toEqual(['b']);
    expect(filterRequirements(rows, { ...NONE, search: 'C1001' }).map(r => r.id)).toEqual(['a']);
  });
  it('filters by size and fulfilment', () => {
    expect(filterRequirements(rows, { ...NONE, size: 'L' }).map(r => r.id)).toEqual(['a', 'c']);
    expect(filterRequirements(rows, { ...NONE, fulfilment: 'outstanding' }).map(r => r.id)).toEqual(['b', 'c']);
    expect(filterRequirements(rows, { ...NONE, fulfilment: 'fulfilled' }).map(r => r.id)).toEqual(['a']);
  });
  it('can hide unmatched rows but never drops them silently', () => {
    expect(filterRequirements(rows, { ...NONE, showUnmatched: false }).map(r => r.id)).toEqual(['a', 'b']);
  });
});
