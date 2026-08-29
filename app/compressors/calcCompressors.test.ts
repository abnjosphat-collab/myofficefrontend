import { describe, it, expect } from 'vitest';
import {
  calculateEfficiency, getEfficiencyStatus, autoAdjustLoadedHours, calculateDailyDelta, calculateNextService,
} from './calcCompressors';

describe('calculateEfficiency', () => {
  it('is loaded/running as a percentage, rounded to 1 decimal', () => {
    expect(calculateEfficiency(10, 8)).toBe(80);
    expect(calculateEfficiency(3, 1)).toBeCloseTo(33.3);
  });
  it('is 0 when running is 0 (avoids a divide-by-zero, not NaN)', () => {
    expect(calculateEfficiency(0, 0)).toBe(0);
  });
});

describe('getEfficiencyStatus', () => {
  it('buckets efficiency into the four tiers at their exact boundaries', () => {
    expect(getEfficiencyStatus(80).label).toBe('Excellent');
    expect(getEfficiencyStatus(79.9).label).toBe('Good');
    expect(getEfficiencyStatus(60).label).toBe('Good');
    expect(getEfficiencyStatus(59.9).label).toBe('Fair');
    expect(getEfficiencyStatus(40).label).toBe('Fair');
    expect(getEfficiencyStatus(39.9).label).toBe('Poor');
    expect(getEfficiencyStatus(0).label).toBe('Poor');
  });
});

describe('autoAdjustLoadedHours', () => {
  it('clamps loaded to at most running (cannot be loaded while not running)', () => {
    expect(autoAdjustLoadedHours(10, 15)).toBe(10);
  });
  it('passes a valid loaded value through unchanged', () => {
    expect(autoAdjustLoadedHours(10, 6)).toBe(6);
  });
  it('never goes negative', () => {
    expect(autoAdjustLoadedHours(10, -5)).toBe(0);
  });
});

describe('calculateDailyDelta', () => {
  it('is the difference between two cumulative meter readings', () => {
    expect(calculateDailyDelta(120, 100)).toBe(20);
  });
  it('never goes negative, even if the "current" reading is a downward correction', () => {
    expect(calculateDailyDelta(90, 100)).toBe(0);
  });
  it('treats a missing value as 0', () => {
    expect(calculateDailyDelta(undefined as unknown as number, 10)).toBe(0);
  });
});

describe('calculateNextService', () => {
  it('finds the next unreached interval and hours remaining to it', () => {
    const info = calculateNextService(1500);
    expect(info?.interval).toBe(2000);
    expect(info?.hoursRemaining).toBe(500);
  });

  it('returns null once every known interval has been passed', () => {
    expect(calculateNextService(20000)).toBeNull();
  });

  it('converts hours remaining to days using the operating-hours-per-day rate', () => {
    const info = calculateNextService(1920, 8); // 80h remaining / 8h per day = 10 days
    expect(info?.daysRemaining).toBe(10);
  });

  it('classifies urgency by days remaining: high (<=7d), medium (<=30d), low otherwise', () => {
    // 'critical' (daysRemaining <= 0) is unreachable via normal inputs: the interval is
    // always strictly greater than totalRunningHours (see the SERVICE_INTERVALS filter
    // above), so hoursRemaining is always positive and Math.ceil() of a positive number
    // is never <= 0. Not exercised here — there's no realistic input that reaches it.
    expect(calculateNextService(1944, 8)?.urgency).toBe('high');   // 7 days remaining
    expect(calculateNextService(1840, 8)?.urgency).toBe('medium'); // 20 days remaining
    expect(calculateNextService(1000, 8)?.urgency).toBe('low');    // far off
  });

  it('flags isUrgent using the maintenance buffer, independent of the urgency label', () => {
    const info = calculateNextService(1944, 8, 7); // 7 days remaining, buffer 7
    expect(info?.isUrgent).toBe(true);
    const notUrgent = calculateNextService(1936, 8, 7); // 8 days remaining, buffer 7
    expect(notUrgent?.isUrgent).toBe(false);
  });
});
