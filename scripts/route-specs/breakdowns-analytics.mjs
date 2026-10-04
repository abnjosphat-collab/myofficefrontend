// /breakdowns/analytics: the full analytics page. Filters are applied explicitly, a failed load says so with a retry, and an empty
// selection is not shown as a chart of zeros.
const HEAT = Array.from({ length: 24 }, () => Array(7).fill(0)); HEAT[8][1] = 3;
const INSIGHTS = {
  success: true,
  summary: { total_breakdowns: 3, unique_machines: 1, unique_artisans: 1, unique_spares: 0, unique_departments: 1, unique_types: 1, total_downtime_minutes: 90, total_repair_time_minutes: 60, total_spare_cost: 0 },
  heatmap: { hour_day: HEAT, labels: { hours: [], days: [] } }, hourly_distribution: [], daily_distribution: [], top_problem_machines: [], top_artisans: [], artisan_performance: [], top_spare_parts: [],
  breakdown_type_distribution: [{ type: 'mechanical', count: 3 }], priority_distribution: [], status_distribution: [], department_comparison: [], monthly_trends: [{ month: '2026-09', count: 3 }], weekly_trends: [], location_distribution: [],
};
const EMPTY = { ...INSIGHTS, summary: { ...INSIGHTS.summary, total_breakdowns: 0 } };

const spec = {
  route: '/breakdowns/analytics',
  h1: 'Breakdown analytics',
  data: { '/api/breakdowns/analytics/heatmap': INSIGHTS },
  async ready(page, calls, { check, shot }) {
    await page.getByRole('heading', { name: 'By month' }).waitFor({ timeout: 8000 }).catch(() => {});
    check(await page.getByRole('heading', { name: 'By month' }).isVisible(), 'the overview loads');
    await shot(page, 'overview@1440');
    await page.getByRole('textbox', { name: 'Department' }).fill('Engineering');
    await page.getByRole('textbox', { name: 'From' }).fill('2026-09-01');
    await page.getByRole('button', { name: 'Apply' }).click();
    await page.waitForTimeout(600);
    const q = calls.filter(c => c.pathname === '/api/breakdowns/analytics/heatmap').pop();
    check(q?.query?.includes('department=Engineering') && q.query.includes('date_from=2026-09-01'), 'Apply sends the department and the start date', q?.query);
    await page.getByLabel('To', { exact: true }).fill('2026-08-01');
    check(await page.getByText('The end is before the start.').isVisible() && await page.getByRole('button', { name: 'Apply' }).isDisabled(), 'an end before the start is explained and cannot be applied');
    await page.getByRole('button', { name: 'Clear filters' }).click();
    check(!(await page.getByText('The end is before the start.').isVisible().catch(() => false)), 'clearing removes the filters');
  },
  empty: { data: { '/api/breakdowns/analytics/heatmap': EMPTY }, text: 'No breakdowns in this selection' },
  failing: { paths: ['/api/breakdowns/analytics/heatmap'], text: 'breakdown analytics could not be loaded', notShown: ['No breakdowns in this selection'], async recovered(page, { check }) { await page.getByRole('heading', { name: 'By month' }).waitFor({ timeout: 8000 }).catch(() => {}); check(await page.getByRole('heading', { name: 'By month' }).isVisible(), 'Try again loads the analytics'); } },
};
export default spec;
