import { describe, it, expect } from 'vitest';
import {
  rateFor, calcHours, mondayOf, toISODate, addDays, buildWeeklyRows, isExcludedFromWeeklyRoster,
  cleanReasonText, significantTokens, levenshtein, tokensMatch, reasonSimilarity, groupSimilarReasons,
} from './calcOvertime';
import type { OTRecord } from './types';
import type { EmployeeLookup } from '@/hooks/useLookups';

function rec(over: Partial<OTRecord> = {}): OTRecord {
  return {
    id: 1, employee_name: 'Jane Doe', employee_id: 'C1000', position: 'Fitter',
    overtime_type: 'regular', date: '2026-08-10', start_time: '17:00', end_time: '20:00',
    status: 'pending', ...over,
  };
}

describe('rateFor', () => {
  it('pays weekend and holiday at double time', () => {
    expect(rateFor('weekend')).toBe(2.0);
    expect(rateFor('holiday')).toBe(2.0);
  });
  it('pays everything else — including legacy types — at time-and-a-half', () => {
    expect(rateFor('regular')).toBe(1.5);
    expect(rateFor('emergency')).toBe(1.5);
    expect(rateFor('project')).toBe(1.5);
    expect(rateFor('night')).toBe(1.5);
  });
});

describe('calcHours', () => {
  it('computes a same-day duration', () => {
    expect(calcHours('17:00', '20:00')).toBe(3);
  });
  it('handles an overnight shift wrapping past midnight (the reported bug)', () => {
    expect(calcHours('23:00', '00:00')).toBeCloseTo(1);
    expect(calcHours('22:30', '02:30')).toBeCloseTo(4);
  });
  it('returns 0 for missing start or end', () => {
    expect(calcHours(undefined, '20:00')).toBe(0);
    expect(calcHours('17:00', undefined)).toBe(0);
    expect(calcHours()).toBe(0);
  });
});

describe('mondayOf / toISODate / addDays', () => {
  it('finds the Monday of the week for any weekday (Mon..Sun)', () => {
    // 2026-08-10 is a Monday.
    expect(toISODate(mondayOf(new Date('2026-08-10T12:00:00')))).toBe('2026-08-10');
    expect(toISODate(mondayOf(new Date('2026-08-12T12:00:00')))).toBe('2026-08-10'); // Wed
    expect(toISODate(mondayOf(new Date('2026-08-16T12:00:00')))).toBe('2026-08-10'); // Sun
  });
  it('addDays steps forward and backward, crossing month boundaries', () => {
    expect(toISODate(addDays(new Date('2026-08-30T00:00:00'), 3))).toBe('2026-09-02');
    expect(toISODate(addDays(new Date('2026-08-10T00:00:00'), -7))).toBe('2026-08-03');
  });
});

describe('isExcludedFromWeeklyRoster', () => {
  it('excludes by role substring, case-insensitively', () => {
    expect(isExcludedFromWeeklyRoster({ id: 1, designation: 'Senior Manager' } as EmployeeLookup)).toBe(true);
    expect(isExcludedFromWeeklyRoster({ id: 1, position: 'Graduate Trainee' } as EmployeeLookup)).toBe(true);
    expect(isExcludedFromWeeklyRoster({ id: 1, designation: 'HOIST DRIVER' } as EmployeeLookup)).toBe(true);
  });
  it('excludes named individuals by token, regardless of role', () => {
    expect(isExcludedFromWeeklyRoster({ id: 1, full_name: 'Tonderai Mavhondo', designation: 'Fitter' } as EmployeeLookup)).toBe(true);
  });
  it('does not exclude an ordinary roster member', () => {
    expect(isExcludedFromWeeklyRoster({ id: 1, full_name: 'Jane Doe', designation: 'Fitter' } as EmployeeLookup)).toBe(false);
  });
});

describe('buildWeeklyRows', () => {
  const roster: EmployeeLookup[] = [
    { id: 1, employee_id: 'C1000', full_name: 'Jane Doe', designation: 'Fitter' },
    { id: 2, employee_id: 'C1001', full_name: 'Senior Manager', designation: 'Manager' }, // excluded
  ];

  it('seeds every non-excluded roster employee with a zero row, even with no OT records', () => {
    const { rows } = buildWeeklyRows([], '2026-08-10', '2026-08-16', roster);
    expect(rows).toHaveLength(1);
    expect(rows[0].employee_id).toBe('C1000');
    expect(rows[0].total).toBe(0);
  });

  it('sums hours into the correct day and splits 1.5x/2.0x by rate', () => {
    const records = [
      rec({ date: '2026-08-11', overtime_type: 'regular', start_time: '17:00', end_time: '20:00' }), // 3h @1.5
      rec({ date: '2026-08-11', overtime_type: 'weekend', start_time: '08:00', end_time: '10:00' }), // 2h @2.0
    ];
    const { rows, days } = buildWeeklyRows(records, '2026-08-10', '2026-08-16', roster);
    expect(days).toHaveLength(7);
    const janeRow = rows.find(r => r.employee_id === 'C1000')!;
    expect(janeRow.byDate.get('2026-08-11')).toBe(5);
    expect(janeRow.total).toBe(5);
    expect(janeRow.total15).toBe(3);
    expect(janeRow.total20).toBe(2);
  });

  it('excludes records outside the [from, to] range', () => {
    const { rows } = buildWeeklyRows([rec({ date: '2026-07-01' })], '2026-08-10', '2026-08-16', roster);
    expect(rows.find(r => r.employee_id === 'C1000')!.total).toBe(0);
  });

  it('adds a row for a record from someone not on the roster (not silently dropped)', () => {
    const { rows } = buildWeeklyRows([rec({ employee_id: 'C9999', employee_name: 'Off-Roster Person', date: '2026-08-11' })], '2026-08-10', '2026-08-16', roster);
    expect(rows.some(r => r.employee_id === 'C9999')).toBe(true);
  });
});

describe('cleanReasonText', () => {
  it('inserts a space between a 3+ letter word and an adjacent digit', () => {
    expect(cleanReasonText('monitoring2.5 ton dc loco')).toBe('monitoring 2.5 ton dc loco');
  });
  it('leaves short alphanumeric codes and compound terms alone', () => {
    expect(cleanReasonText('C1165')).toBe('C1165');
    expect(cleanReasonText('4x4 breakdown')).toBe('4x4 breakdown');
  });
});

describe('significantTokens', () => {
  it('lowercases, strips punctuation, and drops stopwords', () => {
    expect(significantTokens('Purchase of backshift tools')).toEqual(['purchase', 'backshift', 'tools']);
  });
});

describe('levenshtein / tokensMatch', () => {
  it('treats identical tokens as a match', () => {
    expect(tokensMatch('purchase', 'purchase')).toBe(true);
  });
  it('matches a shared 4-char prefix (purchase/purchasing)', () => {
    expect(tokensMatch('purchase', 'purchasing')).toBe(true);
  });
  it('matches within edit-distance tolerance for typos', () => {
    expect(tokensMatch('burnet', 'burnett')).toBe(true); // distance 1
  });
  it('does not match unrelated words', () => {
    expect(tokensMatch('purchase', 'monitoring')).toBe(false);
  });
});

describe('reasonSimilarity', () => {
  it('scores 1.0 when every word in the shorter phrase matches', () => {
    expect(reasonSimilarity(['purchase', 'tools'], ['purchase', 'backshift', 'tools'])).toBe(1);
  });
  it('scores 0 for two disjoint phrases', () => {
    expect(reasonSimilarity(['purchase', 'tools'], ['monitoring', 'loco'])).toBe(0);
  });
});

describe('groupSimilarReasons', () => {
  it('merges near-duplicate free-text reasons into one cluster (the motivating bug)', () => {
    const records = [
      rec({ reason: 'Burnet daily checks', hours: 2 }),
      rec({ reason: 'Burnett daily check', hours: 3, employee_id: 'C1001', employee_name: 'Other Person' }),
      rec({ reason: 'Purchase of backshift tools', hours: 1 }),
    ];
    const groups = groupSimilarReasons(records);
    expect(groups).toHaveLength(2);
    const burnetGroup = groups.find(g => g.label.toLowerCase().includes('burnet'))!;
    expect(burnetGroup.count).toBe(2);
    expect(burnetGroup.hours).toBe(5);
    expect(burnetGroup.peopleCount).toBe(2);
  });

  it('ignores records with no reason text', () => {
    const groups = groupSimilarReasons([rec({ reason: '' }), rec({ reason: undefined })]);
    expect(groups).toHaveLength(0);
  });

  it('sorts groups by total hours, descending', () => {
    const groups = groupSimilarReasons([
      rec({ reason: 'small job', hours: 1 }),
      rec({ reason: 'big job', hours: 10 }),
    ]);
    expect(groups[0].label).toBe('big job');
  });
});
