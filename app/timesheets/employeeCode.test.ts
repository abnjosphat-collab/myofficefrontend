import { describe, it, expect } from 'vitest';
import { normalizeTimesheetEmployeeCode, timesheetEmployeeCodesMatch } from './employeeCode';

describe('normalizeTimesheetEmployeeCode', () => {
  it('zero-pads C mine numbers', () => {
    expect(normalizeTimesheetEmployeeCode('c1160')).toBe('C1160');
    expect(normalizeTimesheetEmployeeCode('C1')).toBe('C0001');
  });

  it('matches codes after normalization', () => {
    expect(timesheetEmployeeCodesMatch('C1160', 'c1160')).toBe(true);
    expect(timesheetEmployeeCodesMatch('C1', 'C0001')).toBe(true);
  });
});
