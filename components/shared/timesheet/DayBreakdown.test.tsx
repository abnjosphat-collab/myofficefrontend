// components/shared/timesheet/DayBreakdown.test.tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DayBreakdown } from './DayBreakdown';

describe('DayBreakdown', () => {
  it('says what the day holds: records, warnings, leave, holiday and standby', () => {
    render(<DayBreakdown dateLabel="14 Sep 2026"
      records={[{ key: 'r1', tag: 'Weekend', time: '08:00–12:00 (4.00h)', note: 'Mill breakdown' }]}
      pendingRecords={[{ key: 'p1', tag: 'Regular', time: '18:00–20:00 (2.00h)' }]}
      warnings={['There is no overtime on leave — these records are not counted.']}
      leaveLine="Leave: annual 2026-09-14 → 2026-09-16"
      holidayLine="Public holiday: Heroes Day."
      standbyLine="Standby on (set by hand)."
      emptyText="Nothing behind this day." />);
    expect(screen.getByText('What makes up 14 Sep 2026')).toBeInTheDocument();
    expect(screen.getByText('Weekend')).toBeInTheDocument();
    expect(screen.getByText('08:00–12:00 (4.00h)')).toBeInTheDocument();
    expect(screen.getByText('Mill breakdown')).toBeInTheDocument();
    expect(screen.getByText('There is no overtime on leave — these records are not counted.')).toBeInTheDocument();
    expect(screen.getByText('Leave: annual 2026-09-14 → 2026-09-16')).toBeInTheDocument();
    expect(screen.getByText('Awaiting approval — not counted in the hours above.')).toBeInTheDocument();
    expect(screen.getByText('Regular')).toBeInTheDocument();
    expect(screen.getByText('Public holiday: Heroes Day.')).toBeInTheDocument();
    expect(screen.getByText('Standby on (set by hand).')).toBeInTheDocument();
    expect(screen.queryByText('Nothing behind this day.')).not.toBeInTheDocument();
  });

  it('names the empty day honestly', () => {
    render(<DayBreakdown dateLabel="15 Sep 2026" records={[]} pendingRecords={[]} warnings={[]} emptyText="Nothing behind this day." />);
    expect(screen.getByText('Nothing behind this day.')).toBeInTheDocument();
  });
});
