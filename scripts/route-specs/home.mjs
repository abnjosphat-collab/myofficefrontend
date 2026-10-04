// /: home. Real figures only; the live operations figures, the module directory (favourites from each module's menu, list view, search, bulk
// pinning) and tips on demand. No quick actions or category tabs: the sidebar's Favourites and groups already are those. Nothing is invented.
const DATA = {
  '/api/employees': [{ id: 1 }, { id: 2 }, { id: 3 }],
  '/api/maintenance/work-orders/stats/summary': { pending: 2, in_progress: 1 },
  '/api/equipment': [{ status: 'operational' }, { status: 'down' }],
  '/api/breakdowns/dashboard/overview': { metrics: { open_breakdowns: 4 } },
};

export default {
  route: '/',
  h1: 'Home',
  data: DATA,
  async ready(page, _calls, { check, shot }) {
    const tile = async label => (await page.locator('main').getByText(label, { exact: true }).first().locator('xpath=../../..').innerText()).replace(/\s+/g, ' ');
    await page.getByText('Team members', { exact: true }).waitFor({ timeout: 5000 });
    await page.waitForTimeout(800);
    check(/\b3\b/.test(await tile('Team members')), 'team members come from the service', await tile('Team members'));
    check(/\b3\b/.test(await tile('Active work orders')), 'active work orders = pending + in progress');
    check(/50%/.test(await tile('Equipment available')) && /\b4\b/.test(await tile('Open breakdowns')), 'equipment availability and open breakdowns come from the service');
    const body = await page.locator('main').innerText();
    check(!/All systems operational|FY2026|Your business, unified|\b156\b|1\.2k/.test(body), 'no invented status line, fiscal label, slogan or module metrics');
    check(!(await page.getByText('Getting started').isVisible().catch(() => false)), 'there is no standing tips banner');
    check(await page.getByRole('heading', { name: 'Operations today' }).isVisible() && !(await page.getByRole('heading', { name: 'Quick actions' }).isVisible().catch(() => false)) && await page.locator('main').getByRole('heading', { name: 'All modules' }).isVisible(), 'the page has its two sections and no quick actions');
    await shot(page, 'overview@1440');

    // long group names in the sidebar wrap instead of being cut off
    const cut = await page.evaluate(() => [...document.querySelectorAll('nav a span, nav button span')].filter(e => e.className.includes?.('line-clamp-2') && e.scrollHeight > e.clientHeight + 1).map(e => e.textContent));
    check(cut.length === 0, 'no navigation label is cut off', cut.join(', '));
    check(await page.getByText('Operations & Maintenance').first().isVisible(), 'a long group name is shown in full');

    // tips on demand
    await page.getByRole('button', { name: 'Tips' }).click();
    check(await page.getByText('Search from the top bar to jump to any module.').isVisible(), 'tips open on request');
    await page.keyboard.press('Escape');

    // favourites come from the module's own menu
    const equipment = () => page.locator('#modules').getByRole('button', { name: 'More for Equipment', exact: true });
    await equipment().click();
    await page.getByRole('menuitem', { name: 'Add to favourites' }).click();
    check((await page.evaluate(() => localStorage.getItem('oz_favorites') || '')).includes('/equipment'), 'the favourite is saved');
    await page.waitForTimeout(500);
    check(await page.getByRole('navigation').getByRole('link', { name: 'Equipment', exact: true }).first().isVisible(), 'favourites appear in the sidebar');
    await equipment().click();
    check(await page.getByRole('menuitem', { name: 'Remove from favourites' }).isVisible(), 'the menu says it is a favourite now');
    await page.keyboard.press('Escape');

    // view toggle
    await page.getByRole('button', { name: 'List view' }).click();
    check(await page.locator('#modules').getByRole('link', { name: 'Personnel' }).first().isVisible(), 'list view still links to modules');
    await page.getByRole('button', { name: 'Grid view' }).click();

    // search via the top bar scopes the page
    await page.getByRole('combobox', { name: 'Search modules and pages' }).fill('timesheet');
    await page.getByRole('combobox', { name: 'Search modules and pages' }).press('Escape');
    check(await page.getByText(/modules? match/).first().isVisible(), 'searching shows a result count');
    await page.getByRole('button', { name: 'Clear search' }).first().click();
    check(await page.getByRole('heading', { level: 1, name: 'Home' }).isVisible(), 'clearing search restores the page');

    // select several modules and pin them together
    await page.getByRole('button', { name: 'More ways to work with modules' }).click();
    await page.getByRole('menuitem', { name: 'Select several to favourite' }).click();
    await page.getByRole('button', { name: 'Maintenance', exact: true }).first().click();
    await page.getByRole('button', { name: 'Breakdowns', exact: true }).first().click();
    check(await page.getByText('2 modules selected').isVisible(), 'the selection is counted');
    await page.getByRole('button', { name: 'Add to favourites' }).click();
    const favs = await page.evaluate(() => localStorage.getItem('oz_favorites') || '');
    check(favs.includes('/maintenance') && favs.includes('/breakdowns'), 'bulk pinning saves every selected module');
  },
  empty: { data: { '/api/employees': [], '/api/maintenance/work-orders/stats/summary': { pending: 0, in_progress: 0 }, '/api/equipment': [], '/api/breakdowns/dashboard/overview': { metrics: {} } }, text: 'No data' },
};
