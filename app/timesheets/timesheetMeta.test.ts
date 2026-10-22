import { describe, expect, it } from 'vitest';
import { RETIRED_ROSTER_KEYS, defaultPeriodMonth, fmtDate, getNECPeriod, missingEmploymentType, necRosterIds, shouldShowBulkHint } from './timesheetMeta';

// The page opens on the cycle for defaultPeriodMonth(today): this month's cycle (13th of last month to 12th of this one) up to the 16th,
// next month's from the 17th. So on 17 October it opens on 13 October to 12 November, not on the 13 September to 12 October cycle that ended.
const opensOn = (y: number, m: number, d: number, h = 12) => { const p = getNECPeriod(defaultPeriodMonth(new Date(y, m, d, h))); return `${fmtDate(p.start)} to ${fmtDate(p.end)}`; };

describe('defaultPeriodMonth', () => {
  it('opens on the cycle that is still being finished up to and including the 16th', () => {
    expect(opensOn(2026, 9, 1)).toBe('2026-09-13 to 2026-10-12');
    expect(opensOn(2026, 9, 12)).toBe('2026-09-13 to 2026-10-12');
    expect(opensOn(2026, 9, 13)).toBe('2026-09-13 to 2026-10-12'); // the next cycle has started, but the last one is not finished with yet
    expect(opensOn(2026, 9, 16)).toBe('2026-09-13 to 2026-10-12');
  });
  it('opens on the next cycle after the 16th: 13 October to 12 November', () => {
    expect(opensOn(2026, 9, 17)).toBe('2026-10-13 to 2026-11-12');
    expect(opensOn(2026, 9, 20)).toBe('2026-10-13 to 2026-11-12');
    expect(opensOn(2026, 9, 31)).toBe('2026-10-13 to 2026-11-12');
  });
  it('flips on the date, not the time of day', () => {
    expect(opensOn(2026, 9, 16, 23)).toBe('2026-09-13 to 2026-10-12');
    expect(opensOn(2026, 9, 17, 0)).toBe('2026-10-13 to 2026-11-12');
  });
  it('rolls into the next year in December', () => {
    expect(opensOn(2026, 11, 16)).toBe('2026-11-13 to 2026-12-12');
    expect(opensOn(2026, 11, 17)).toBe('2026-12-13 to 2027-01-12');
    expect(opensOn(2026, 11, 31)).toBe('2026-12-13 to 2027-01-12');
  });
  it('turns over correctly for January and February, and in a leap year', () => {
    expect(opensOn(2027, 0, 10)).toBe('2026-12-13 to 2027-01-12');
    expect(opensOn(2027, 0, 31)).toBe('2027-01-13 to 2027-02-12');
    expect(opensOn(2028, 1, 29)).toBe('2028-02-13 to 2028-03-12');
    expect(opensOn(2028, 1, 16)).toBe('2028-01-13 to 2028-02-12');
  });
  it('is the first of a month, so a short month cannot overflow into the one after it', () => {
    for (const [y, m, d] of [[2026, 0, 31], [2026, 2, 31], [2026, 7, 31], [2028, 1, 29]]) {
      const month = defaultPeriodMonth(new Date(y, m, d));
      expect(month.getDate()).toBe(1);
      expect(month.getMonth()).toBe((m + (d > 16 ? 1 : 0)) % 12);
    }
  });
  it('does not change the cycle itself: the 13th of the previous month to the 12th', () => {
    const p = getNECPeriod(new Date(2026, 10, 1));
    expect(fmtDate(p.start)).toBe('2026-10-13');
    expect(fmtDate(p.end)).toBe('2026-11-12');
  });
});

describe('roster from the register', () => {
  const all = [
    { id: '1', name: 'Ann', employmentType: 'NEC', archived: false },
    { id: '2', name: 'Bob', employmentType: 'NEC', archived: true },
    { id: '3', name: 'Cy', employmentType: 'SALARIED', archived: false },
    { id: '4', name: 'Dee', employmentType: '', archived: false },
    { id: '5', name: 'Eli', employmentType: '', archived: true },
  ] as const;
  it('necRosterIds keeps NEC and unarchived only', () => {
    expect(necRosterIds([...all])).toEqual(['1']);
  });
  it('missingEmploymentType names active unclassified people only', () => {
    expect(missingEmploymentType([...all])).toEqual([{ id: '4', name: 'Dee' }]);
  });
  it('RETIRED_ROSTER_KEYS names the old exception keys for cleanup', () => {
    expect([...RETIRED_ROSTER_KEYS]).toEqual(['ts_nec_extra_ids', 'ts_nec_hidden_ids']);
  });
  it('shouldShowBulkHint fires past half empty, never on a full or empty period', () => {
    expect(shouldShowBulkHint(0, 93)).toBe(true);
    expect(shouldShowBulkHint(46, 93)).toBe(true);
    expect(shouldShowBulkHint(47, 93)).toBe(false);
    expect(shouldShowBulkHint(93, 93)).toBe(false);
    expect(shouldShowBulkHint(0, 0)).toBe(false);
  });
});
