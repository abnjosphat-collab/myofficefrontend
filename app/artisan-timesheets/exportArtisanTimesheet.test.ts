// app/artisan-timesheets/exportArtisanTimesheet.test.ts — day comments reach the
// Excel sheet summarised (capped, single-line) while the full text is kept for
// the cell note, so nothing payroll-auditable is lost.
import { describe, it, expect } from 'vitest';
import { summarizeComment } from './exportArtisanTimesheet';

describe('summarizeComment', () => {
  it('passes short comments through untouched', () => {
    expect(summarizeComment('Pump seal replacement')).toBe('Pump seal replacement');
    expect(summarizeComment('')).toBe('');
  });

  it('caps long comments with an ellipsis at 80 characters by default', () => {
    const long = `Pump seal replacement on 12L; callout at midnight for the winder breakdown; standby roster confirmed by foreman`;
    const summary = summarizeComment(long);
    expect(summary).toHaveLength(80);
    expect(summary.endsWith('…')).toBe(true);
    expect(long.startsWith(summary.slice(0, -1).trimEnd())).toBe(true);
  });

  it('collapses whitespace before measuring', () => {
    expect(summarizeComment('  Pump   seal\nreplacement  ')).toBe('Pump seal replacement');
  });

  it('respects a custom cap', () => {
    expect(summarizeComment('Pump seal replacement', 10)).toBe('Pump seal…');
  });
});
