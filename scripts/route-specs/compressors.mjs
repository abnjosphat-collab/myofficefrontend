// /compressors: daily cumulative readings, services (record a service), analytics section failures, add compressor, status change.
const pad = n => String(n).padStart(2, '0');
const local = offset => { const d = new Date(); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const TODAY = local(0);
const COMPRESSORS = [
  { id: 1, name: 'Compressor One', model: 'GA37', capacity: '37 kW', location: 'Main Plant', status: 'running', total_running_hours: 990, total_loaded_hours: 700, initial_total_running: 0, initial_total_loaded: 0 },
  { id: 2, name: 'Compressor Two', model: 'GA55', capacity: '55 kW', location: 'Plant B', status: 'standby', total_running_hours: 2500, total_loaded_hours: 1800, initial_total_running: 0, initial_total_loaded: 0 },
  // A legacy record with no totals must render rather than crash; its history is made to fail below.
  { id: 3, name: 'Compressor Legacy', model: 'Old', capacity: '', location: 'Plant B', status: 'offline', total_running_hours: null, total_loaded_hours: null },
];
const readings = (run, load) => ({ success: true, data: [{ date: local(-1), total_running_hours: run, total_loaded_hours: load }] });
const spec = {
  route: '/compressors',
  h1: 'Compressors',
  data: {
    '/api/compressors/compressors': request => (request.method() === 'POST' ? { id: 9 } : COMPRESSORS),
    'PATCH /api/compressors/compressors/2/status': {},
    '/api/compressors/readings/1/detailed': readings(980, 695),
    '/api/compressors/readings/2/detailed': readings(2490, 1790),
    '/api/compressors/readings/3/detailed': { __status: 500, body: { detail: 'History unavailable' } },
    '/api/compressors/stats': { total_compressors: 3, total_running_hours: 3490, avg_efficiency: 72.5, upcoming_services: 1, urgent_alerts: 0, active_compressors: 2 },
    '/api/compressors/service-due': [{ compressor_id: 1, compressor_name: 'Compressor One', current_hours: 990, next_service_hours: 1000, hours_remaining: 10, days_remaining: 2, urgency: 'high', service_interval: 1000 }],
    '/api/compressors/analytics/performance-metrics': [{ compressor_id: 1, compressor_name: 'Compressor One', avg_efficiency: 71, avg_daily_running_hours: 8, avg_daily_loaded_hours: 5.7, total_running_hours: 240, total_loaded_hours: 170, downtime_percentage: 12, service_count: 2 }],
    '/api/compressors/analytics/trends': { __status: 500, body: { detail: 'Trends are down' } },
    '/api/compressors/analytics/comparison': { success: true, data: [{ compressor_id: 1, compressor_name: 'Compressor One', location: 'Main Plant', value: 71, rating: 'Good' }], message: '', count: 1 },
    '/api/compressors/management/summary': { status_distribution: { running: 1, standby: 1, offline: 1 }, location_distribution: { 'Main Plant': 1, 'Plant B': 2 }, age_distribution: { less_than_year: 1, '1_3_years': 2 }, total_compressors: 3, unread_alerts: 1, recent_alerts: [{ id: 1, title: 'High temperature', message: 'Compressor One ran hot.', severity: 'critical', is_read: false, created_at: '2026-09-01T08:00:00Z' }], recent_services: [] },
    'POST /api/compressors/daily-entries/cumulative': { data: { total_running_hours: 995, total_loaded_hours: 702 } },
    'POST /api/compressors/service-records': {},
    '/api/lookups/location': [],
  },
  async ready(page, calls, { check, shot }) {
    const cards = page.getByRole('article', { name: / reading$/ });
    check(await cards.count() === 3, 'three reading cards (a legacy record with no totals does not crash the page)');
    check(await page.getByText('Some previous readings could not be loaded').isVisible(), 'a failed history load is stated, not hidden');
    const legacy = cards.filter({ hasText: 'Compressor Legacy' });
    check(await legacy.getByText('Previous reading unavailable').isVisible(), 'the affected card says its previous reading is unavailable');
    await shot(page, 'cards@1440');

    const one = cards.filter({ hasText: 'Compressor One' });
    check(await one.getByText('980.0 h').first().isVisible(), 'the previous reading is shown');
    await one.getByLabel(/^Total running/).fill('970');
    check(await one.getByText('Cannot be below the previous total of 980.0 h.').isVisible(), 'a total below the previous one is explained on the field');
    await one.getByRole('button', { name: /^Save reading/ }).click();
    check(!calls.some(c => c.method === 'POST' && c.pathname.includes('daily-entries')), 'an invalid reading is not sent');
    await one.getByLabel(/^Total running/).fill('995');
    await one.getByLabel(/^Total loaded/).fill('702');
    check(await one.getByText('15.0 h').first().isVisible() && await one.getByText('7.0 h').first().isVisible(), 'the daily hours are worked out from the previous totals');
    await one.getByRole('button', { name: /^Save reading/ }).click();
    await page.waitForTimeout(700);
    const post = calls.filter(c => c.method === 'POST' && c.pathname.includes('daily-entries')).pop();
    check(post?.body.compressor_id === 1 && post.body.date === TODAY && post.body.current_total_running === 995 && post.body.current_total_loaded === 702, 'saving sends the cumulative totals for the chosen day', JSON.stringify(post?.body));

    // changing the day reloads the previous reading
    const before = calls.filter(c => c.pathname === '/api/compressors/readings/1/detailed').length;
    await page.getByRole('button', { name: 'Previous day' }).click();
    await page.waitForTimeout(700);
    check(calls.filter(c => c.pathname === '/api/compressors/readings/1/detailed').length > before, 'moving to another day reloads the previous readings');
    await page.getByRole('button', { name: 'Today' }).click();
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: /^Change status of Compressor Two/ }).click();
    const dlg = page.getByRole('dialog', { name: 'Change status' });
    await dlg.waitFor({ timeout: 5000 });
    await dlg.getByRole('button', { name: 'Update status' }).click();
    check(await dlg.getByText('Choose a different status first.').isVisible(), 'saving an unchanged status explains itself');
    await dlg.getByRole('button', { name: 'Maintenance' }).click();
    await dlg.getByRole('button', { name: 'Update status' }).click();
    await page.waitForTimeout(600);
    const patch = calls.filter(c => c.method === 'PATCH').pop();
    check(patch?.pathname === '/api/compressors/compressors/2/status' && patch.body.status === 'maintenance', 'the status change is sent', JSON.stringify(patch?.body));

    await page.getByRole('button', { name: 'Table view' }).click();
    const table = page.getByRole('table', { name: 'Compressors' });
    check(await table.getByRole('row').count() === 4, 'table view lists the three compressors');
    await shot(page, 'table@1440');
    await page.getByRole('button', { name: 'Card view' }).click();

    // services: recording a service confirms first and records two steps
    await page.getByRole('tab', { name: 'Services' }).click();
    await page.getByRole('button', { name: /^Mark 1000 hour service done/ }).click();
    const c1 = page.getByRole('alertdialog');
    await c1.waitFor({ timeout: 5000 });
    await c1.getByRole('button', { name: 'Cancel' }).click();
    check(!calls.some(c => c.pathname === '/api/compressors/service-records'), 'cancelling the confirmation records nothing');
    await page.getByRole('button', { name: /^Mark 1000 hour service done/ }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Record service' }).click();
    await page.waitForTimeout(800);
    const rec = calls.find(c => c.pathname === '/api/compressors/service-records');
    check(rec?.body.compressor_id === 1 && rec.body.service_type === '1000 Hour Service' && rec.body.is_completed === true, 'the service record is sent', JSON.stringify(rec?.body));
    const hoursPost = calls.filter(c => c.pathname.includes('daily-entries')).pop();
    check(hoursPost?.body.current_total_running === 1000, 'the running hours are then set to the interval', JSON.stringify(hoursPost?.body));
    await shot(page, 'services@1440');

    // analytics: one failing section is an error with the reason, while the others still show
    await page.getByRole('tab', { name: 'Analytics' }).click();
    check(await page.getByText('Trend analysis could not be loaded').isVisible() && await page.getByText('Trends are down').isVisible(), 'a failed trend request is shown as a failure with its reason');
    check(!(await page.getByText('No trend yet').isVisible().catch(() => false)), 'a failed trend request is not shown as empty');
    check(await page.getByRole('table', { name: 'Performance metrics' }).isVisible(), 'the other analytics sections still load');
    await shot(page, 'analytics@1440');

    await page.getByRole('tab', { name: 'Management' }).click();
    check(await page.getByText('High temperature').isVisible(), 'recent alerts are listed');
    await shot(page, 'management@1440');
  },
  create: {
    open: 'Add compressor', dialog: 'Add compressor', path: '/api/compressors/compressors', submit: 'Add compressor',
    requiredText: 'Enter a name.',
    async fill(dialog) { await dialog.getByLabel(/^Compressor name/).fill('Compressor Four'); await dialog.getByLabel(/^Model/).fill('GA75'); await dialog.getByLabel(/^Capacity/).fill('75 kW'); },
    async kept(dialog) { return (await dialog.getByLabel(/^Compressor name/).inputValue()) === 'Compressor Four' && (await dialog.getByLabel(/^Capacity/).inputValue()) === '75 kW'; },
    body: b => b.name === 'Compressor Four' && b.model === 'GA75' && b.location === 'Main Plant' && b.status === 'standby',
  },
  empty: { data: { '/api/compressors/compressors': [] }, text: 'No compressors registered' },
  failing: { paths: ['/api/compressors/compressors'], text: 'Compressors could not be loaded', notShown: ['No compressors registered'], async recovered(page, { check }) { check(await page.getByRole('article', { name: / reading$/ }).first().isVisible(), 'Try again loads the register'); } },
};
export default spec;
