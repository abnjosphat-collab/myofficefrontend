// /engineering_report: monthly report; each of five sources fails independently and is never shown as zero.
const ym = new Date().toISOString().slice(0, 7);
const day = n => `${ym}-${String(n).padStart(2, '0')}`;
const BREAKDOWNS = [{ id: 1, equipment_name: 'Fixture Crusher', downtime_hours: 6, breakdown_date: day(2) }, { id: 2, equipment_name: 'Fixture Crusher', downtime_hours: 2, breakdown_date: day(3) }];
const JOB_CARDS = [{ id: 1, status: 'completed', created_at: day(2) }, { id: 2, status: 'open', created_at: day(3) }];
const PRODUCTION = [{ id: 1, prod_date: day(1), tonnes_milled: 2000, recovery_pct: 94, gold_produced_oz: 6 }];
const COMPLIANCE = [{ id: 1, status: 'current' }, { id: 2, status: 'overdue' }];
const LUBE = [{ id: 1, status: 'due_soon' }];

export default {
  route: '/engineering_report',
  h1: 'Engineering report',
  data: {
    '/api/breakdowns': { message: 'Breakdowns Management API', status: 'operational', endpoints: {} }, // what the real root route returns: a page that reads this instead of /get-breakdowns must fail
    '/api/breakdowns/get-breakdowns': { data: BREAKDOWNS, count: BREAKDOWNS.length, success: true }, '/api/job-cards': JOB_CARDS, '/api/production': PRODUCTION, '/api/compliance': COMPLIANCE, '/api/lubrication': LUBE },
  async ready(page, _calls, { check }) {
    const tile = async label => (await page.locator('main').getByText(label, { exact: true }).first().locator('xpath=../..').innerText()).replace(/\s+/g, ' ');
    check(/\b2\b/.test(await tile('Breakdowns')), 'breakdowns = 2', await tile('Breakdowns'));
    check(/4(\.0)? h/.test(await tile('Mean time to repair')), 'mean time to repair = 4.0 h');
    check(/50%/.test(await tile('Work orders completed')), 'work order completion = 50%', await tile('Work orders completed'));
    check(/2,000 t/.test(await tile('Tonnes milled')) && /94\.0%/.test(await tile('Average recovery')), 'production figures come from the records');
    const body = await page.locator('main').innerText();
    check(!/Gold Mine|run SQL migration|PM Compliance/.test(body), 'no hard-coded site name, migration hint or mislabelled PM metric');
    check(await page.getByText(/Targets used:/).isVisible(), 'the targets used are stated on the report');
    check((await page.locator('figcaption').allInnerTexts()).length >= 2, 'charts have text alternatives');
    check(await page.getByText('Repeat failures').isVisible(), 'repeat failures are listed for the period');
    await page.getByRole('combobox', { name: 'Report period' }).click();
    await page.getByRole('option').nth(1).click();
    await page.waitForTimeout(400);
    check(/No data/.test(await tile('Mean time to repair')), 'a past month with no records says "No data", not 0');
  },
  failing: {
    paths: ['/api/production'],
    text: 'Production records could not be loaded',
    notShown: ['0 oz'],
    async recovered(page, { check }) { check(/2,000 t/.test(await page.locator('main').innerText()), 'Try again loads production'); },
  },
};
