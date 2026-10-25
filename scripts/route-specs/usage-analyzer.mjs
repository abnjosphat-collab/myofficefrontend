// /usage-analyzer: local usage log, module filter, clear with confirmation, and the manager-only "All users" source.
const now = Date.now();
const mins = n => now - n * 60_000;
const EVENTS = [
  { type: 'module_open', ts: mins(5), href: '/maintenance', title: 'Maintenance' },
  { type: 'module_open', ts: mins(9), href: '/maintenance', title: 'Maintenance' },
  { type: 'module_open', ts: mins(30), href: '/employees', title: 'Personnel' },
  { type: 'page_view', ts: mins(4), path: '/maintenance', dwellMs: 120000 },
  { type: 'search', ts: mins(20), query: 'pump', results: 3 },
  { type: 'feedback', ts: mins(15), page: '/maintenance', rating: 4, text: 'Fixture feedback text' },
];
let remoteFails = true;
const REMOTE_FEEDBACK = [
  { type: 'feedback', ts: new Date(mins(50)).toISOString(), session_id: 's1', user_id: 'u1', user_email: 'ana@example.com', path: '/ppe', rating: 5, feedback_text: 'Remote feedback from Ana' },
  { type: 'feedback', ts: new Date(mins(51)).toISOString(), session_id: 's2', user_id: 'u2', user_email: 'bob@example.com', path: '/overtime', rating: 0, feedback_text: 'Remote feedback from Bob' },
];

const spec = {
  route: '/usage-analyzer',
  h1: 'Usage analyzer',
  storage: { oz_usageEvents: EVENTS },
  data: { '/api/usage/events': () => (remoteFails ? { __status: 404, body: { detail: 'down' } } : REMOTE_FEEDBACK) },
  async ready(page, _calls, { check, shot }) {
    const tile = async label => (await page.locator('main').getByText(label, { exact: true }).first().locator('xpath=../..').innerText()).replace(/\s+/g, ' ');
    check(/3/.test(await tile('Module opens')), 'module opens = 3', await tile('Module opens'));
    check(/1/.test(await tile('Searches')), 'searches = 1');
    check(await page.getByText('Feedback from every account could not be loaded.').isVisible(), 'a failed feedback load is reported in the panel');
    check(await page.getByText('Send feedback from the top bar').count() === 0 && !/bottom bar/.test(await page.locator('main').innerText()), 'no outdated "bottom bar" copy');
    check((await page.locator('figcaption').allInnerTexts()).filter(t => t.length > 15).length >= 4, 'charts and heatmaps have text alternatives');
    await shot(page, 'overview@1440');

    await page.getByRole('button', { name: 'Filter by Maintenance' }).click();
    check(await page.getByText(/Showing Maintenance only/).isVisible(), 'selecting a module scopes the charts and says so');
    await page.getByRole('button', { name: /Showing Maintenance only/ }).click();

    // manager-only second source: a failure is reported, never shown as "No usage recorded yet"
    await page.getByRole('button', { name: 'All users' }).click();
    await page.getByText('Activity across all users could not be loaded').waitFor({ timeout: 5000 }).catch(() => {});
    check(await page.getByText('Activity across all users could not be loaded').isVisible(), 'a failed cross-user load is reported');
    check(!(await page.getByText('No usage recorded yet').isVisible().catch(() => false)), 'a failed cross-user load is not shown as "no usage"');
    await shot(page, 'all-users-error@1440');
    await page.getByRole('button', { name: 'This device' }).click();

    // C1: a manager reviews every account's feedback whatever the toggle says
    remoteFails = false;
    await page.locator('#feedback').getByRole('button', { name: 'Try again' }).click();
    await page.getByText('Remote feedback from Ana').waitFor({ timeout: 5000 });
    check(await page.getByText('Remote feedback from Ana').isVisible(), 'server feedback from the first account is listed');
    check(await page.getByText('Remote feedback from Bob').isVisible(), 'server feedback from the second account is listed');
    check(await page.locator('#feedback').getByText('Fixture feedback text').count() === 0, 'the panel shows the server copy, not this device');
    check(await page.locator('#feedback').getByText('Every account').isVisible(), 'the panel names its scope');
    await shot(page, 'feedback-remote@1440');

    // clear needs confirmation
    await page.getByRole('button', { name: 'Clear', exact: true }).click();
    const confirm = page.getByRole('alertdialog');
    await confirm.waitFor({ timeout: 5000 });
    await confirm.getByRole('button', { name: 'Cancel' }).click();
    check((await page.evaluate(() => JSON.parse(localStorage.getItem('oz_usageEvents') || '[]'))).length >= 6, 'cancelling keeps the data');
    await page.getByRole('button', { name: 'Clear', exact: true }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Clear' }).click();
    await page.getByText('No usage recorded yet').waitFor({ timeout: 5000 }).catch(() => {});
    check(await page.getByText('No usage recorded yet').isVisible(), 'after clearing, the empty state is shown');
  },
};

export default spec;
