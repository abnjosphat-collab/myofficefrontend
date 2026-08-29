// components/shared/utils.test.ts — these are shared across many modules (lineTotal
// alone is used ~18 times across WorkOrderDetailModal/maintenance/breakdowns/spares/
// issues/quotations), higher leverage than any single page's own calc file, and had
// no test coverage at all before this.
import { describe, it, expect } from 'vitest';
import {
  calcDays, clsx, equipmentDisplayName, equipmentMatches, formatCurrency, formatCurrencyShort,
  fmtDate, fmtDateTime, initials, lineTotal, nowLocal,
} from './utils';
import type { EquipmentBase } from '@/app/equipment/types';

describe('lineTotal', () => {
  it('is quantity times unit price', () => {
    expect(lineTotal(3, 12.5)).toBeCloseTo(37.5);
  });
  it('treats a missing/falsy quantity or price as 0, not NaN', () => {
    expect(lineTotal(0, 10)).toBe(0);
    expect(lineTotal(5, 0)).toBe(0);
    expect(lineTotal(undefined as unknown as number, 10)).toBe(0);
  });
});

describe('calcDays', () => {
  it('is inclusive of both endpoints (a same-day range is 1 day, not 0)', () => {
    expect(calcDays('2026-08-10', '2026-08-10')).toBe(1);
  });
  it('counts a range spanning multiple days inclusively', () => {
    expect(calcDays('2026-08-10', '2026-08-14')).toBe(5);
  });
  it('is 0 when either date is missing', () => {
    expect(calcDays(undefined, '2026-08-14')).toBe(0);
    expect(calcDays('2026-08-10', null)).toBe(0);
  });
  it('is 0 for an unparseable date rather than NaN', () => {
    expect(calcDays('not-a-date', '2026-08-14')).toBe(0);
  });
});

describe('formatCurrency', () => {
  it('formats with the currency symbol and 2 decimal places', () => {
    expect(formatCurrency(1234.5)).toBe('$1,234.50');
  });
  it('treats a missing amount as 0', () => {
    expect(formatCurrency(undefined as unknown as number)).toBe('$0.00');
  });
});

describe('formatCurrencyShort', () => {
  it('abbreviates millions and thousands', () => {
    expect(formatCurrencyShort(2_500_000)).toBe('$2.5M');
    expect(formatCurrencyShort(15_000)).toBe('$15.0K');
  });
  it('shows a plain dollar amount under 1000', () => {
    expect(formatCurrencyShort(450)).toBe('$450');
  });
});

describe('initials', () => {
  it('takes the first letter of the first two words, uppercased', () => {
    expect(initials('Jane Doe')).toBe('JD');
  });
  it('handles a single-word name', () => {
    expect(initials('Cher')).toBe('C');
  });
  it('ignores extra whitespace between words', () => {
    expect(initials('  Jane   Doe  ')).toBe('JD');
  });
});

describe('fmtDate / fmtDateTime', () => {
  it('returns an em-dash for a missing or unparseable date', () => {
    expect(fmtDate(undefined)).toBe('—');
    expect(fmtDate('not-a-date')).toBe('—');
    expect(fmtDateTime(null)).toBe('—');
  });
  it('formats a real date without throwing', () => {
    expect(fmtDate('2026-08-10')).not.toBe('—');
    expect(fmtDateTime('2026-08-10T14:30:00')).not.toBe('—');
  });
});

describe('equipmentDisplayName', () => {
  it('prefixes the equipment_id when present', () => {
    const eq = { name: 'Main Compressor', equipment_id: 'EQ-042' } as EquipmentBase;
    expect(equipmentDisplayName(eq)).toBe('EQ-042 — Main Compressor');
  });
  it('falls back to just the name when there is no equipment_id', () => {
    const eq = { name: 'Main Compressor' } as EquipmentBase;
    expect(equipmentDisplayName(eq)).toBe('Main Compressor');
  });
});

describe('equipmentMatches', () => {
  const eq = { name: 'Main Compressor', equipment_id: 'EQ-042', model: 'XR500', manufacturer: 'Atlas' } as EquipmentBase;
  it('matches against name, id, model, or manufacturer, case-insensitively', () => {
    expect(equipmentMatches(eq, 'compressor')).toBe(true);
    expect(equipmentMatches(eq, 'EQ-042')).toBe(true);
    expect(equipmentMatches(eq, 'xr500')).toBe(true);
    expect(equipmentMatches(eq, 'atlas')).toBe(true);
  });
  it('does not match an unrelated query', () => {
    expect(equipmentMatches(eq, 'generator')).toBe(false);
  });
});

describe('clsx', () => {
  it('joins truthy class names with a space', () => {
    expect(clsx('a', 'b', 'c')).toBe('a b c');
  });
  it('drops falsy values (undefined/null/false) without leaving extra spaces', () => {
    expect(clsx('a', undefined, false, null, 'b')).toBe('a b');
  });
});

describe('nowLocal', () => {
  it('returns an ISO-shaped local datetime string (YYYY-MM-DDTHH:MM)', () => {
    expect(nowLocal()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });
});
