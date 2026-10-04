// /availability: equipment availability (overview, detailed analysis, metrics). No demo data on failure.
const EQUIPMENT = [
  { id: 1, name: 'Crusher One', category: 'Machinery', department: 'Production', operational_hours: 400, breakdown_hours: 12, availability: 97, status: 'operational', last_maintenance: '2026-09-01', next_maintenance: '2026-11-01', uptime: 388, downtime: 12, mtbf: 220, mttr: 3 },
  { id: 2, name: 'Pump Two', category: 'Pumps', department: 'Engineering', operational_hours: 300, breakdown_hours: 27, availability: 91, status: 'maintenance', last_maintenance: '2026-08-10', next_maintenance: null, uptime: 273, downtime: 27, mtbf: 80, mttr: 12 },
  // A legacy record missing its numeric fields must render rather than crash.
  { id: 3, name: 'Legacy Fan', category: 'Fans', department: null, status: 'breakdown', last_maintenance: null },
];
const STATS = { totalEquipment: 3, operational: 1, inMaintenance: 1, inBreakdown: 1, overallAvailability: 94.1, avgUptime: 220.5, avgDowntime: 13, totalOperationalHours: 700, totalBreakdownHours: 39, monthAvailability: 94.1, weekAvailability: 98.2 };
const spec = {
  route: '/availability',
  h1: 'Equipment availability',
  data: {
    '/api/availabilities': EQUIPMENT,
    '/api/availabilities/stats': STATS,
  },
  async ready(page, calls, { check, shot }) {
    const table = page.getByRole('table', { name: 'Equipment availability' });
    check(await table.getByRole('row').count() === 4, 'header plus three equipment rows (a legacy record with no numbers does not crash)');
    check(await table.getByText('97.0%').isVisible() && await table.getByText('91.0%').isVisible(), 'availability is shown per unit');
    check(await page.getByText('94.1%').first().isVisible(), 'the summary tile shows the server figure');
    check(!(await page.getByText('CNC Machine 1').isVisible().catch(() => false)), 'no demo equipment is ever shown');
    check(await table.getByRole('row').filter({ hasText: 'Legacy Fan' }).getByText('—').first().isVisible(), 'a missing figure is a dash, not a made-up zero');
    await shot(page, 'overview@1440');

    await page.getByRole('combobox', { name: 'Filter by status' }).click();
    await page.getByRole('option', { name: 'Maintenance' }).click();
    check(await table.getByRole('row').count() === 2, 'the status filter narrows the table');
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await page.getByRole('searchbox').fill('fan');
    check(await table.getByRole('row').count() === 2, 'search narrows the table');
    await page.getByRole('searchbox').fill('');

    check(await page.getByRole('link', { name: 'View breakdowns for Crusher One' }).getAttribute('href') === '/breakdowns?equipment=1', 'a row links to that unit\'s breakdowns');

    await page.getByRole('tab', { name: 'Detailed analysis' }).click();
    const detail = page.getByRole('table', { name: 'Detailed availability analysis' });
    check(await detail.getByRole('row').count() === 4, 'detailed analysis lists the same equipment');
    check(await page.getByText('Not scheduled').first().isVisible(), 'a missing maintenance date reads Not scheduled');
    check(!(await page.getByText(/Cost impact/i).isVisible().catch(() => false)), 'no invented cost figure is shown');
    check(await page.getByText(/default figures/).isVisible(), 'the server\'s default figures are disclosed');
    await shot(page, 'detailed@1440');

    await page.getByRole('tab', { name: 'Metrics' }).click();
    check(await page.getByText('Last 7 days (from breakdown downtime)').isVisible() && await page.getByText('98.2%').first().isVisible(), 'the week figure is labelled with its source');
    check(await page.getByText('Production').isVisible(), 'departments are compared');
    check(!(await page.getByText('Chart integration point').isVisible().catch(() => false)), 'no placeholder chart');
    await shot(page, 'metrics@1440');
  },
  empty: { data: { '/api/availabilities': [] }, text: 'No equipment yet' },
  failing: { paths: ['/api/availabilities'], text: 'Equipment availability could not be loaded', notShown: ['No equipment yet', 'CNC Machine 1', 'Forklift A'], async recovered(page, { check }) { check(await page.getByRole('table', { name: 'Equipment availability' }).isVisible(), 'Try again loads the equipment'); } },
};
export default spec;
