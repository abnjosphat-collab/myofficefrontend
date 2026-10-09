// components/shared/timesheet/DayCards.test.tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DayCard, DayCardsShell, DayHoursList } from './DayCards';

describe('DayCardsShell', () => {
  it('leads with the totals and grids the cards', () => {
    render(<DayCardsShell totals={<p>Month totals</p>}>
      <DayCard titleId="day-a" title="Mon, 14 Sep 2026"><p>body</p></DayCard>
    </DayCardsShell>);
    expect(screen.getByText('Month totals')).toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Mon, 14 Sep 2026' })).toBeInTheDocument();
  });
});

describe('DayCard', () => {
  it('marks a system-filled day and shows its headline and badges', () => {
    render(<DayCard titleId="day-a" title="Mon, 14 Sep 2026" auto={{ title: 'Filled from the system', srLabel: 'Filled from the system' }}
      headline="2.50h OT" badges={<span>On leave</span>}><p>body</p></DayCard>);
    const card = screen.getByRole('article', { name: /Mon, 14 Sep 2026/ });
    expect(card).toHaveTextContent('Filled from the system');
    expect(card).toHaveTextContent('2.50h OT');
    expect(card).toHaveTextContent('On leave');
  });
});

describe('DayHoursList', () => {
  it('lists the hour lines, or the empty line when the day holds none', () => {
    const { rerender } = render(<DayHoursList lines={[{ label: 'Normal', value: '8.00h' }]} emptyText="No hours recorded." />);
    expect(screen.getByText('Normal')).toBeInTheDocument();
    expect(screen.getByText('8.00h')).toBeInTheDocument();
    rerender(<DayHoursList lines={[]} emptyText="No hours recorded." />);
    expect(screen.getByText('No hours recorded.')).toBeInTheDocument();
  });
});
