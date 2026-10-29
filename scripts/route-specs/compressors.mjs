// /compressors: the floor — pods (a legacy record with no totals included), the today figures, a failed
// history stated, the unit drawer (invalid reading refused, valid one saved for the chosen day), status change.
const pad = n => String(n).padStart(2, '0');
const local = offset => { const d = new Date(); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const TODAY = local(0);
const COMPRESSORS = [
  { id: 1, name: 'Compressor One', model: 'GA37', capacity: '37 kW', location: 'Main Plant', status: 'running', total_running_hours: 990, total_loaded_hours: 700, initial_total_running: 0, initial_total_loaded: 0 },
  { id: 2, name: 'Compressor Two', model: 'GA55', capacity: '55 kW', location: 'Plant B', status: 'standby', total_running_hours: 2500, total_loaded_hours: 1800, initial_total_running: 0, initial_total_loaded: 0 },
  { id: 3, name: 'Compressor Legacy', model: 'Old', capacity: '', location: 'Plant B', status: 'offline', total_running_hours: null, total_loaded_hours: null },
];
const readings = (date, run, load, daily) => ({ success: true, data: [{ date, total_running_hours: run, total_loaded_hours: load, ...(daily ? { daily_running_hours: daily[0], daily_loaded_hours: daily[1] } : {}) }] });
const spec = {
  route: '/compressors',
  h1: 'Compressors',
  data: {
    '/api/compressors/compressors': COMPRESSORS,
    'PATCH /api/compressors/compressors/2/status': {},
    '/api/compressors/readings/1/detailed': readings(local(-1), 980, 695),
    '/api/compressors/readings/2/detailed': readings(TODAY, 2500, 1800, [15, 10]),
    '/api/compressors/readings/3/detailed': { __status: 500, body: { detail: 'History unavailable' } },
    '/api/compressors/stats': { total_compressors: 3, total_running_hours: 3490, avg_efficiency: 72.5, upcoming_services: 1, urgent_alerts: 0, active_compressors: 2 },
    '/api/compressors/service-due': [],
    'POST /api/compressors/daily-entries/cumulative': { data: { total_running_hours: 995, total_loaded_hours: 702 } },
    '/api/lookups/location': [],
  },
  async ready(page, calls, { check, shot }) {
    const pods = page.locator('[role=button][aria-label*="Open to record a reading"]');
    check(await pods.count() === 3, 'three pods (a legacy record with no totals does not crash the floor)');
    check(await page.getByText(/previous reading could not be loaded for one compressor/i).count() === 0, 'a failed history load is not announced across the whole floor');
    check(await page.locator('[role=button][aria-label*="Reading recorded today"]').count() === 1, 'only the unit already recorded today is marked as recorded');
    await shot(page, 'floor@1440');

    await pods.filter({ hasText: 'Compressor Legacy' }).click();
    const legacy = page.getByRole('dialog', { name: 'Compressor Legacy' });
    await legacy.waitFor();
    check(await legacy.getByText(/previous reading could not be loaded/i).isVisible(), 'a failed history load is stated in the panel of that compressor, where it blocks saving');
    await page.keyboard.press('Escape');
    await legacy.waitFor({ state: 'hidden' });

    await pods.filter({ hasText: 'Compressor One' }).click();
    const drawer = page.getByRole('dialog', { name: 'Compressor One' });
    await drawer.waitFor();
    await drawer.getByLabel('Running hours').fill('970');
    await drawer.getByRole('button', { name: /Save reading/ }).click();
    check(await drawer.getByText('Cannot be below the previous total of 980.0 h.').isVisible(), 'a total below the previous one is explained');
    check(!calls.some(c => c.method === 'POST' && c.pathname.includes('daily-entries')), 'an invalid reading is not sent');
    await drawer.getByLabel('Running hours').fill('995');
    await drawer.getByLabel('Loaded hours').fill('702');
    check(await drawer.getByText('+15.0', { exact: true }).isVisible(), 'the day\'s running hours are shown as they are typed');
    await shot(page, 'drawer@1440');
    await drawer.getByRole('button', { name: /Save reading/ }).click();
    await page.waitForTimeout(800);
    const post = calls.filter(c => c.method === 'POST' && c.pathname.includes('daily-entries')).pop();
    check(post?.body.compressor_id === 1 && post.body.date === TODAY && post.body.current_total_running === 995 && post.body.current_total_loaded === 702, 'saving sends the cumulative totals for the chosen day', JSON.stringify(post?.body));
    check(!(await drawer.isVisible()), 'the drawer closes after a save');

    // Pod -> drawer zoom: the drawer grows out of its pod and shrinks back.
    await pods.filter({ hasText: 'Compressor One' }).click();
    const zoomed = page.getByRole('dialog', { name: 'Compressor One' });
    await zoomed.waitFor();
    check(await page.locator('[data-zoom-panel="compressors:unit:1"]').getAttribute('data-zoom-mode') === 'zoom', 'the drawer grows out of its pod');
    await page.keyboard.press('Escape');
    await zoomed.waitFor({ state: 'hidden' });
    check(!(await zoomed.isVisible().catch(() => false)), 'the drawer shrinks back and closes');
    // Closing mid-open reverses smoothly, and the zoom still works after.
    await pods.filter({ hasText: 'Compressor One' }).click();
    await zoomed.waitFor();
    await page.keyboard.press('Escape');
    await zoomed.waitFor({ state: 'hidden' }).catch(() => {});
    check(!(await zoomed.isVisible().catch(() => false)), 'closing mid-open reverses cleanly');
    await pods.filter({ hasText: 'Compressor One' }).click();
    await zoomed.waitFor();
    check(await page.locator('[data-zoom-panel="compressors:unit:1"]').getAttribute('data-zoom-mode') === 'zoom', 'the zoom recovers after a mid-flight reversal');
    await page.keyboard.press('Escape');
    await zoomed.waitFor({ state: 'hidden' });

    // Month view: a day with a reading, a missing day shown as no reading (never zero), totals, and a click opens that day.
    await page.getByRole('button', { name: 'Month', exact: true }).click();
    const month = page.getByRole('table');
    await month.waitFor();
    check(await month.getByRole('button', { name: /^Compressor Two, .*: 15.0 h running, 10.0 h loaded/ }).count() === 1, 'the month shows the day of the saved reading with its hours');
    check(await month.getByRole('button', { name: /^Compressor One, .*no reading/ }).count() > 0, 'a day without a reading reads as no reading, not zero');
    check(await month.getByRole('row', { name: /Compressor Two/ }).getByText('15.0').isVisible(), 'the month total is shown for each unit');
    await shot(page, 'month@1440');
    await page.getByRole('button', { name: 'Floor', exact: true }).click();

    await pods.filter({ hasText: 'Compressor Two' }).click();
    const two = page.getByRole('dialog', { name: 'Compressor Two' });
    await two.getByRole('radio', { name: 'Maintenance' }).click();
    await page.waitForTimeout(500);
    check(calls.some(c => c.method === 'PATCH' && c.pathname === '/api/compressors/compressors/2/status' && c.body?.status === 'maintenance'), 'a status change is sent');

    // One compressor's week and month, opened from its panel; a day in it opens the panel again.
    await two.getByRole('button', { name: 'Week and month' }).click();
    await page.getByRole('button', { name: 'All compressors' }).waitFor();
    check(await page.getByRole('heading', { name: 'Compressor Two' }).isVisible(), 'the unit view names the compressor');
    check(await page.getByRole('group', { name: 'Period' }).getByRole('button', { name: 'Week' }).getAttribute('aria-pressed') === 'true', 'it opens on the week');
    check(await page.getByRole('table').getByText('15.0').first().isVisible(), 'the week shows the day of the saved reading with its hours');
    await shot(page, 'unit-week@1440');
    await page.getByRole('group', { name: 'Period' }).getByRole('button', { name: 'Month' }).click();
    await page.getByRole('button', { name: 'Next month' }).click();
    check(await page.getByText(/Nothing to show for|No reading/).first().isVisible(), 'a month without readings says so rather than showing zeros');
    await page.getByRole('button', { name: 'All compressors' }).click();
    await pods.first().waitFor();
    check(await pods.count() === 3, 'back on the floor with every compressor');
  },
};
export default spec;