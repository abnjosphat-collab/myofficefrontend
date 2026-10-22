import { describe, expect, it } from 'vitest';
import { NO_TYPE_FILTER, TYPE_FILTER_KEY, loadTypeFilter, matchesTypeFilter, normalizePpeType, saveTypeFilter, typeOptions, type TypeFilter } from './ppeTypes';

describe('normalizePpeType', () => {
  it('matches loosely: case and spacing do not matter', () => {
    expect(normalizePpeType(' Safety_Shoes ')).toBe('safety_shoes');
    expect(normalizePpeType('Cap_lamp_belt')).toBe('cap_lamp_belt');
    expect(normalizePpeType(null)).toBe('');
    expect(normalizePpeType(undefined)).toBe('');
  });
});

describe('matchesTypeFilter', () => {
  const include = (types: string[]): TypeFilter => ({ types, mode: 'include' });
  const exclude = (types: string[]): TypeFilter => ({ types, mode: 'exclude' });
  it('shows everything when nothing is chosen, in either mode', () => {
    expect(matchesTypeFilter('helmet', NO_TYPE_FILTER)).toBe(true);
    expect(matchesTypeFilter('helmet', exclude([]))).toBe(true);
  });
  it('includes only the chosen types, matched loosely', () => {
    const f = include(['helmet', ' Safety_Shoes ']);
    expect(matchesTypeFilter('helmet', f)).toBe(true);
    expect(matchesTypeFilter('SAFETY_SHOES', f)).toBe(true);
    expect(matchesTypeFilter('gloves', f)).toBe(false);
  });
  it('excludes the chosen types, matched loosely', () => {
    const f = exclude(['helmet']);
    expect(matchesTypeFilter('helmet', f)).toBe(false);
    expect(matchesTypeFilter(' Helmet ', f)).toBe(false);
    expect(matchesTypeFilter('gloves', f)).toBe(true);
  });
});

describe('loadTypeFilter / saveTypeFilter', () => {
  it('round-trips a lens through storage', () => {
    const store = new Map<string, string>();
    saveTypeFilter((k, v) => store.set(k, v), { types: ['helmet'], mode: 'exclude' });
    expect(store.get(TYPE_FILTER_KEY)).toBe('{"types":["helmet"],"mode":"exclude"}');
    expect(loadTypeFilter(k => store.get(k) ?? null)).toEqual({ types: ['helmet'], mode: 'exclude' });
  });
  it('reads missing, corrupt or misshapen storage as no filter', () => {
    expect(loadTypeFilter(() => null)).toEqual(NO_TYPE_FILTER);
    expect(loadTypeFilter(() => '{nope')).toEqual(NO_TYPE_FILTER);
    expect(loadTypeFilter(() => '{"types":"helmet","mode":"include"}')).toEqual(NO_TYPE_FILTER);
    expect(loadTypeFilter(() => '{"types":["helmet"],"mode":"only"}')).toEqual(NO_TYPE_FILTER);
    expect(loadTypeFilter(() => '["helmet"]')).toEqual(NO_TYPE_FILTER);
  });
  it('a storage failure keeps the lens until the page closes instead of throwing', () => {
    expect(() => saveTypeFilter(() => { throw new Error('denied'); }, { types: ['helmet'], mode: 'include' })).not.toThrow();
  });
});

describe('typeOptions', () => {
  it('counts the given records by loosely-merged type and unions the vocabulary without counts, by label', () => {
    const options = typeOptions([{ ppe_type: 'helmet' }, { ppe_type: ' Helmet ' }, { ppe_type: 'Boots' }]);
    const helmet = options.find(o => o.value === 'helmet');
    expect(helmet).toMatchObject({ label: 'Safety Helmet', count: 2 });
    expect(options.find(o => o.value === 'Boots')).toMatchObject({ label: 'Boots', count: 1 });
    expect(options.find(o => o.value === 'gloves')).toMatchObject({ label: 'Safety Gloves' });
    expect(options.find(o => o.value === 'gloves')?.count).toBeUndefined();
    expect(options.map(o => o.label)).toEqual([...options.map(o => o.label)].sort((a, b) => a.localeCompare(b)));
  });
  it('skips blank codes', () => {
    expect(typeOptions([{ ppe_type: '' }, { ppe_type: '  ' }]).every(o => o.count === undefined)).toBe(true);
  });
});
