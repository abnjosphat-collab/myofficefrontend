// /reliability: every figure derives from breakdown records; there is no demo data.
const iso = offset => { const d = new Date(); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10); };
const BREAKDOWNS = [
  { id: 1, equipment_name: 'Fixture Crusher', section: 'Crushing', downtime_hours: 20, breakdown_date: iso(-60) },
  { id: 2, equipment_name: 'Fixture Crusher', section: 'Crushing', downtime_hours: 10, breakdown_date: iso(-20) },
  { id: 3, equipment_name: 'Fixture Pump', section: 'Dewatering', downtime_hours: 1, breakdown_date: iso(-5) },
];

export default {
  route: '/reliability',
  h1: 'MTBF and MTTR analytics',
  data: {
    '/api/breakdowns': { message: 'Breakdowns Management API', status: 'operational', endpoints: {} }, // what the real root route returns: a page that reads this instead of /get-breakdowns must fail
    '/api/breakdowns/get-breakdowns': { data: BREAKDOWNS, count: BREAKDOWNS.length, success: true } },
  async ready(page, _calls, { check, shot }) {
    check(await page.getByText('Based on 3 recorded breakdowns.').isVisible(), 'states how many records the figures come from');
    const table = page.getByRole('table', { name: 'Equipment reliability metrics' });
    check(await table.getByRole('row').count() === 3, 'one row per equipment (2) plus header');
    check(/Fixture Crusher/.test(await table.getByRole('row').nth(1).innerText()), 'default sort puts the highest RPN first');
    check(await table.getByText('High', { exact: true }).count() + await table.getByText('Medium', { exact: true }).count() + await table.getByText('Low', { exact: true }).count() >= 2, 'RPN level is a text badge');
    check(await page.getByText('SAG Mill', { exact: false }).count() === 0 && await page.getByText('Ball Mill', { exact: false }).count() === 0, 'no hard-coded demo equipment is shown');
    const captions = await page.locator('figcaption').allInnerTexts();
    check(captions.length === 2 && captions.every(c => c.length > 20), 'each chart has a text alternative', captions[0]?.slice(0, 80));
    check(/Fixture|Crushing/.test(captions[1] ?? ''), 'the section chart is built from the records');
    await table.getByRole('button', { name: 'Equipment' }).click();
    check((await table.getByRole('columnheader', { name: /Equipment/ }).getAttribute('aria-sort')) === 'ascending', 'column sorting works');
    await shot(page, 'sorted@1440');
  },
  empty: { data: { '/api/breakdowns/get-breakdowns': { data: [], count: 0, success: true } }, text: 'No breakdowns recorded yet' },
  failing: {
    paths: ['/api/breakdowns/get-breakdowns'],
    text: 'Reliability data could not be loaded',
    notShown: ['No breakdowns recorded yet', 'SAG Mill', 'Jaw Crusher'],
    async recovered(page, { check }) { check(await page.getByRole('table', { name: 'Equipment reliability metrics' }).isVisible(), 'Try again loads the analytics'); },
  },
};
