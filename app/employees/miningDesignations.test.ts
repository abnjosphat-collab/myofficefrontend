import { expect, it } from 'vitest';
import { miningDesignationOptions } from '@/lib/employeeCatalog';
import { displaySection, normalizeSection } from '@/lib/sections';

it('offers Mining designations and reuses a custom value saved on a roster record', () => {
  const values = miningDesignationOptions('', ['Lasher', ' lasher ', 'Shift Captain']).map(o => o.value);
  expect(values).toContain('Driller');
  expect(values).toContain('Shift Captain');
  expect(values.filter(value => value === 'Lasher')).toHaveLength(1);
  expect(values).not.toContain('Fitter Class 1');
});

it('formats Mining section names while keeping the original filter value', () => {
  expect(displaySection('MINE PRODUCTION')).toBe('Mine Production');
  expect(normalizeSection('MINE PRODUCTION')).toBe('MINE PRODUCTION');
  expect(displaySection('SHE Mine')).toBe('SHE Mine');
});
