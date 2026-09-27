import { describe, expect, it } from 'vitest';
import { countPeriodCompletion } from './completion';

describe('period completion', () => {
  it('uses the same weekday cells in its numerator and denominator', () => {
    const friday = new Date(2026, 7, 14);
    const saturday = new Date(2026, 7, 15);
    const monday = new Date(2026, 7, 17);
    expect(countPeriodCompletion(['1'], [friday, saturday, monday], [
      { employee_id: 1, date: '2026-08-14' },
      { employee_id: 1, date: '2026-08-15' },
      { employee_id: 1, date: '2026-08-17' },
      { employee_id: 1, date: '2026-08-17' },
      { employee_id: 2, date: '2026-08-14' },
    ])).toEqual({ filled: 2, possible: 2 });
  });
});
