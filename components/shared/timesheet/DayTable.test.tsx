// components/shared/timesheet/DayTable.test.tsx
import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DayTable, DayTableNum } from './DayTable';

const COLUMNS = [
  { header: 'Date' },
  { header: 'Normal', align: 'center' as const },
];

describe('DayTableNum', () => {
  it('dims a zero and emboldens a nonzero bold figure', () => {
    render(<table><tbody><tr><td><DayTableNum value={0} /></td><td><DayTableNum value={8} bold /></td></tr></tbody></table>);
    expect(screen.getByText('0.00').className).toContain('text-ink-subtle');
    expect(screen.getByText('8.00').className).toContain('text-action');
  });
});

describe('DayTable', () => {
  const rows = (detail = true) => [
    { key: '2026-09-14', cells: ['14 Sep 2026', <DayTableNum key="n" value={8} />], highlight: true, detail: detail ? { id: 'qv-2026-09-14', label: '14 Sep 2026', content: <p>Overtime record behind the day</p> } : undefined },
    { key: '2026-09-15', cells: ['15 Sep 2026', <DayTableNum key="n" value={0} />] },
  ];

  it('renders the sticky header, zebra rows and the caller-owned foot', () => {
    render(<DayTable caption="Days" regionLabel="Days (scrollable)" columns={COLUMNS} rows={rows(false)}
      footerLabel="Totals" footerLabelSpan={1} footerCells={[{ content: '8.00' }]} />);
    expect(screen.getByRole('table', { name: 'Days' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Normal' })).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: '14 Sep 2026' })).toBeInTheDocument();
    expect(screen.getByText('Totals')).toBeInTheDocument();
    // No breakdown anywhere: no expander column at all.
    expect(screen.queryByRole('button', { name: /breakdown/ })).not.toBeInTheDocument();
  });

  it('expands and collapses a row breakdown', async () => {
    const user = userEvent.setup();
    render(<DayTable caption="Days" regionLabel="Days (scrollable)" columns={COLUMNS} rows={rows()}
      footerLabel="Totals" footerLabelSpan={1} footerCells={[{ content: '8.00' }]} />);
    expect(screen.queryByText('Overtime record behind the day')).not.toBeInTheDocument();
    const toggle = screen.getByRole('button', { name: 'Show the breakdown for 14 Sep 2026' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(toggle);
    expect(screen.getByText('Overtime record behind the day')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hide the breakdown for 14 Sep 2026' })).toHaveAttribute('aria-expanded', 'true');
    // The day without a breakdown has no expander.
    const plain = screen.getByRole('rowheader', { name: '15 Sep 2026' }).closest('tr')!;
    expect(within(plain).queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows the footnote above the foot', () => {
    render(<DayTable caption="Days" regionLabel="Days (scrollable)" columns={COLUMNS} rows={rows(false)}
      footerLabel="Totals" footerLabelSpan={1} footerCells={[{ content: '8.00' }]} footnote="Pending records are not counted." />);
    expect(screen.getByText('Pending records are not counted.')).toBeInTheDocument();
  });
});
