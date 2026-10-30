// /ppe Budget tab: tiles, allocations, downloads. Separate from ppe.mjs because that
// file's issue-picker flow predates the type-to-search NameTypeahead change and fails
// before any tab checks run; the budget checks stand alone here instead.
const BUDGET_SETTINGS = {
  lines: [
    { key: 'dust_masks', item: 'Dust masks', rule: 'per_working_day', qty_per_person: 1, who: { kind: 'everyone', sections: [], text: '' }, unit_price: 2, buffer_pct: 0 },
    { key: 'dark_goggles', item: 'Dark goggles', rule: 'per_month', qty_per_person: 1, who: { kind: 'job_title', sections: [], text: 'Boilermaker' }, unit_price: 5, buffer_pct: 0 },
  ],
  confirmed: { count: 5, start_month: 1, boilermakers: 0 },
  provisional: { count: 5, start_month: 1, boilermakers: 0 },
  starter_kit: null,
  add_gaps_in_january: false,
  show_provisional: true,
};
const rec = (id, over = {}) => ({ id: String(id), employee_id: 'C100', employee_name: 'Ann Alpha', position: 'Fitter', department: 'Engineering', ppe_type: 'safety_shoes', item_name: 'Bata Industrial', size: '8', issue_date: '2026-08-10', expiry_date: '2027-02-10', condition: 'good', status: 'active', notes: '', issued_by: 'Store', location: 'Workshop', mine_section: 'Mechanical', ...over });
const RECS = [rec(1), rec(2, { ppe_type: 'helmet', item_name: 'MSA V-Gard', size: '' })];
const EMPLOYEES = [{ id: 101, employee_id: 'C100', first_name: 'Ann', last_name: 'Alpha', designation: 'Fitter', department: 'Engineering', section: 'Mechanical' }];

const spec = {
  route: '/ppe',
  h1: 'PPE',
  data: {
    '/api/ppe': RECS,
    '/api/ppe-order-list': [],
    '/api/ppe/matrix': { safety_shoes: 12, helmet: 24 },
    '/api/employees/': EMPLOYEES,
    '/api/employees': EMPLOYEES,
    '/api/ppe/budget/2027': {
      year: 2027,
      settings: BUDGET_SETTINGS,
      defaults: BUDGET_SETTINGS,
      calendar: { year: 2027, months: [20, 20, 21, 22, 20, 22, 22, 20, 21, 21, 22, 22].map((working_days, i) => ({ month: i + 1, working_days, weeks: 4, holidays: [] })), total_working_days: 253, total_weeks: 52 },
      updated_at: null,
    },
  },
  async ready(page, calls, { check, shot }) {
    await page.getByRole('tab', { name: 'Budget' }).click();
    await page.getByText('Total cost').waitFor({ timeout: 8000 });
    check(await page.getByText('Total cost').isVisible(), 'the budget shows its tiles');
    check(await page.getByRole('table', { name: 'Allocations' }).getByText('Dust masks').isVisible(), 'the budget lists its allocation lines');
    check(await page.getByRole('button', { name: 'Download' }).isVisible(), 'the budget offers its downloads');
    check(await page.getByRole('heading', { name: 'Month grid' }).isVisible(), 'the budget shows the month grid');
    await shot(page, 'budget@1440');
  },
};
export default spec;
