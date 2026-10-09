// /availability: equipment availability (overview, detailed analysis, metrics). No demo data on failure.
const EQUIPMENT = [
  { id: 1, name: 'Crusher One', category: 'Machinery', department: 'Production', operational_hours: 400, breakdown_hours: 12, availability: 97, status: 'operational', last_maintenance: '2026-09-01', next_maintenance: '2026-11-01', uptime: 388, downtime: 12, mtbf: 220, mttr: 3 },
  { id: 2, name: 'Pump Two', category: 'Pumps', department: 'Engineering', operational_hours: 300, breakdown_hours: 27, availability: 91, status: 'maintenance', last_maintenance: '2026-08-10', next_maintenance: null, uptime: 273, downtime: 27, mtbf: 80, mttr: 12 },
  // A legacy record missing its numeric fields must render rather than crash.
  { id: 3, name: 'Legacy Fan', category: 'Fans', department: null, status: 'breakdown', last_maintenance: null },
  // Equipment with no availability record: the server sends null (not 100 % / MTBF 100 h / MTTR 4 h).
  { id: 4, name: 'New Loader', category: 'Machinery', department: 'Production', operational_hours: 0, breakdown_hours: 0, availability: null, status: 'operational', last_maintenance: null, next_maintenance: null, uptime: 0, downtime: 0, mtbf: null, mttr: null },
];
const STATS = { totalEquipment: 4, operational: 1, inMaintenance: 1, inBreakdown: 1, overallAvailability: 94.1, avgUptime: 220.5, avgDowntime: 13, totalOperationalHours: 700, totalBreakdownHours: 39, monthAvailability: 94.1, weekAvailability: 98.2 };
const spec = {
  route: '/availability',
  h1: 'Availability overview',
  data: {
    '/api/availabilities': EQUIPMENT,
    '/api/availabilities/stats': STATS,
  },
  async ready(page, calls, { check, shot }) {
    const table = page.getByRole('table', { name: 'Equipment availability' });
    check(await table.getByRole('row').count() === 5, 'header plus four equipment rows (a legacy record with no numbers does not crash)');
    check(await table.getByText('97.0%').isVisible() && await table.getByText('91.0%').isVisible(), 'availability is shown per unit');
    check(await page.getByText('94.1%').first().isVisible(), 'the summary tile shows the server figure');
    check(!(await page.getByText('CNC Machine 1').isVisible().catch(() => false)), 'no demo equipment is ever shown');
    check(await table.getByRole('row').filter({ hasText: 'Legacy Fan' }).getByText('—').first().isVisible(), 'a missing figure is a dash, not a made-up zero');
    const loader = table.getByRole('row').filter({ hasText: 'New Loader' });
    check(await loader.getByText('No data').isVisible(), 'equipment with no availability record reads No data');
    check(!(await loader.getByText('100.0%').isVisible().catch(() => false)), 'no default 100% is shown as if measured');
    check(await loader.getByRole('progressbar').count() === 0, 'no progress bar is drawn for an unmeasured unit');
    await shot(page, 'overview@1440');

    await page.getByRole('combobox', { name: 'Filter by status' }).click();
    await page.getByRole('option', { name: 'Maintenance' }).click();
    check(await table.getByRole('row').count() === 2, 'the status filter narrows the table');
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await page.getByRole('searchbox').fill('fan');
    check(await table.getByRole('row').count() === 2, 'search narrows the table');
    await page.getByRole('searchbox').fill('');

    check(await page.getByRole('link', { name: 'View breakdowns for Crusher One' }).getAttribute('href') === '/breakdowns?q=Crusher%20One', 'a row links to that unit\'s breakdowns');

    await page.getByRole('tab', { name: 'Detailed analysis' }).click();
    const detail = page.getByRole('table', { name: 'Detailed availability analysis' });
    check(await detail.getByRole('row').count() === 5, 'detailed analysis lists the same equipment');
    const loaderDetail = detail.getByRole('row').filter({ hasText: 'New Loader' });
    check(await loaderDetail.getByText('No data').count() === 2, 'MTBF and MTTR read No data, not 100 h and 4 h');
    check(!(await loaderDetail.getByText('100.0 h').isVisible().catch(() => false)) && !(await loaderDetail.getByText('4.0 h').isVisible().catch(() => false)), 'the old default MTBF and MTTR are not shown');
    check(await page.getByText('Not scheduled').first().isVisible(), 'a missing maintenance date reads Not scheduled');
    check(!(await page.getByText(/Cost impact/i).isVisible().catch(() => false)), 'no invented cost figure is shown');
    check(await page.getByText(/shows No data for availability, MTBF and MTTR/).isVisible(), 'the note says unmeasured equipment shows No data');
    check(!(await page.getByText(/default figures/).isVisible().catch(() => false)), 'the page no longer claims the server sends default figures');
    await shot(page, 'detailed@1440');

    await page.getByRole('tab', { name: 'Metrics' }).click();
    check(await page.getByText('Last 7 days (from breakdown downtime)').isVisible() && await page.getByText('98.2%').first().isVisible(), 'the week figure is labelled with its source');
    check(await page.getByText('Production').isVisible(), 'departments are compared');
    check(await page.getByText('1 of 2 measured').isVisible(), 'a department average counts only measured equipment and says so');
    check(!(await page.getByText('Chart integration point').isVisible().catch(() => false)), 'no placeholder chart');
    await shot(page, 'metrics@1440');
  },
  empty: { data: { '/api/availabilities': [] }, text: 'No equipment yet' },
  failing: { paths: ['/api/availabilities'], text: 'Equipment availability could not be loaded', notShown: ['No equipment yet', 'CNC Machine 1', 'Forklift A'], async recovered(page, { check }) { check(await page.getByRole('table', { name: 'Equipment availability' }).isVisible(), 'Try again loads the equipment'); } },
};
export default spec;
