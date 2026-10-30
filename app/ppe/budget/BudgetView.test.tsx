// app/ppe/budget/BudgetView.test.tsx — the Budget tab renders tiles, allocations and the
// manager gate; saving and downloads are covered by budgetApi/downloads tests and the route spec.
import { render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmProvider } from '@/components/ui-system';
import { BudgetView } from './BudgetView';
import type { BudgetSettings } from './budgetCalc';

vi.mock('./budgetApi', () => ({
  fetchBudget: vi.fn(),
  saveBudget: vi.fn(),
}));

import { fetchBudget } from './budgetApi';

const SETTINGS: BudgetSettings = {
  lines: [
    { key: 'dust_masks', item: 'Dust masks', rule: 'per_working_day', qty_per_person: 1, who: { kind: 'everyone', sections: [], text: '' }, unit_price: 2, buffer_pct: 0 },
  ],
  confirmed: { count: 5, start_month: 1, boilermakers: 0 },
  provisional: { count: 5, start_month: 1, boilermakers: 0 },
  starter_kit: [],
  add_gaps_in_january: false,
  show_provisional: true,
};

const CALENDAR = {
  year: 2027,
  months: [20, 20, 21, 22, 20, 22, 22, 20, 21, 21, 22, 22].map((working_days, i) => ({ month: i + 1, working_days, weeks: 4, holidays: [] as { date: string; name: string }[] })),
  total_working_days: 253,
  total_weeks: 52,
};

const PEOPLE = [
  { employee_id: 'C1', employee_name: 'Ann Alpha', position: 'Fitter', department: 'Engineering', section: 'Mechanical' },
  { employee_id: 'C2', employee_name: 'Bob Beta', position: 'Boilermaker', department: 'Engineering', section: 'Mechanical' },
];

const RECORDS = [
  { id: '1', employee_id: 'C1', employee_name: 'Ann Alpha', position: 'Fitter', department: 'Engineering', ppe_type: 'worksuit', item_name: 'Overall', size: 'L', issue_date: '2026-08-10', expiry_date: null, condition: 'good' as const, status: 'active' as const, notes: '', issued_by: '', location: '', mine_section: '' },
];

function mockFetch() {
  vi.mocked(fetchBudget).mockResolvedValue({ year: 2027, settings: SETTINGS, defaults: SETTINGS, calendar: CALENDAR, updated_at: null });
}

function show(ui: React.ReactElement) {
  return render(<ConfirmProvider>{ui}</ConfirmProvider>);
}

describe('BudgetView', () => {
  it('renders tiles, charts, allocations and the month grid', async () => {
    mockFetch();
    show(<BudgetView people={PEOPLE} records={RECORDS} matrix={{ worksuit: 6 }} canManage />);
    await waitFor(() => expect(screen.getByText('Total cost')).toBeInTheDocument());
    const allocations = screen.getByRole('table', { name: 'Allocations' });
    expect(within(allocations).getByText('Dust masks')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Month grid' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Saved' })).toBeInTheDocument();
  });

  it('hides editing from non-managers', async () => {
    mockFetch();
    show(<BudgetView people={PEOPLE} records={RECORDS} matrix={{ worksuit: 6 }} canManage={false} />);
    await waitFor(() => expect(screen.getByText('Total cost')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Saved' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add a line' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download' })).toBeInTheDocument();
  });
});
