// /job-cards: register + details dialog with task toggles, save and supervisor sign-off.
const CARDS = [
  { id: '1', job_no: 'JC-001', title: 'Replace conveyor belt', equipment_name: 'Conveyor CV1', type: 'corrective', priority: 'high', status: 'open', description: 'Belt torn at the tail pulley.', section: 'Conveying', assigned_to: 'Ann', supervisor: 'Sup', scheduled_date: '2026-10-01', tasks: [{ id: 't1', description: 'Isolate and lock out', done: false }, { id: 't2', description: 'Fit new belt', done: false }], parts_used: [{ id: 'p1', part_no: 'BLT-9', description: 'Belt 1200mm', qty: 1 }], labour_hours: 2, notes: '' },
  { id: '2', job_no: 'JC-002', title: 'Grease bearings', equipment_name: 'Mill M1', type: 'preventive', priority: 'low', status: 'completed', description: '', section: 'Milling', assigned_to: 'Ben', supervisor: 'Sup', scheduled_date: '2026-09-20', tasks: [{ id: 't3', description: 'Grease', done: true }], parts_used: [], labour_hours: 1, notes: '' },
  { id: '3', job_no: 'JC-003', title: 'Legacy record', equipment_name: 'Old pump', priority: 'urgent-ish', status: 'weird_status', scheduled_date: '' },
];
let patchMode = 'fail';
const patches = [];

export default {
  route: '/job-cards',
  h1: 'Job cards',
  data: {
    '/api/job-cards': () => CARDS,
    'PATCH /api/job-cards/1': (request) => { patches.push(request.postDataJSON()); return patchMode === 'fail' ? { __status: 500, body: { detail: 'Job card service rejected the save' } } : { ...CARDS[0], ...request.postDataJSON() }; },
  },
  async ready(page, calls, { check, shot }) {
    const table = page.getByRole('table', { name: 'Job cards' });
    check(await table.getByRole('row').count() === 4, 'header plus three job cards');
    check(await page.getByRole('button', { name: /New job card/i }).count() === 0, 'no dead "New job card" button');
    check(await table.getByText('weird_status').isVisible() && await table.getByText('urgent-ish').isVisible(), 'a malformed status/priority still renders a labelled badge');
    check(await page.getByRole('button', { name: 'Completed (1)' }).isVisible(), 'filter buttons show counts');
    await page.getByRole('button', { name: 'Completed (1)' }).click();
    check(await table.getByRole('row').count() === 2, 'status filter narrows to the completed card');
    await page.getByRole('button', { name: /^All \(/ }).click();
    await page.getByLabel('Search job number, title or equipment').fill('conveyor');
    check(await table.getByRole('row').count() === 2, 'search matches equipment name');
    await page.getByLabel('Search job number, title or equipment').fill('');

    // Details dialog: tasks drive progress and the sign-off option
    await table.getByRole('row').nth(1).click();
    const dialog = page.getByRole('dialog', { name: 'Replace conveyor belt' });
    await dialog.waitFor({ timeout: 5000 });
    check(await dialog.getByRole('button', { name: /Supervisor sign-off/ }).count() === 0, 'sign-off is not offered until every task is done');
    await dialog.getByRole('checkbox', { name: /Isolate and lock out/ }).check();
    await dialog.getByRole('checkbox', { name: /Fit new belt/ }).check();
    check(await dialog.getByRole('button', { name: /Supervisor sign-off/ }).isVisible(), 'sign-off appears once every task is done');
    await dialog.getByLabel('Labour hours').fill('3.5');
    await page.waitForTimeout(400);
    await shot(page, 'details@1440');

    // failed save: dialog stays open, message shown, input kept
    await dialog.getByRole('button', { name: 'Save changes' }).click();
    await dialog.getByRole('alert').first().waitFor({ timeout: 5000 }).catch(() => {});
    check(await dialog.isVisible() && await dialog.getByText('Job card service rejected the save').isVisible(), 'failed save keeps the dialog open with the server message');
    check((await dialog.getByLabel('Labour hours').inputValue()) === '3.5' && await dialog.getByRole('checkbox', { name: /Fit new belt/ }).isChecked(), 'failed save keeps edits');
    patchMode = 'ok'; patches.length = 0;
    const before = calls.filter(c => c.method === 'GET' && c.pathname === '/api/job-cards').length;
    await dialog.getByRole('button', { name: 'Save changes' }).click();
    await dialog.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    check(!(await dialog.isVisible().catch(() => false)), 'successful save closes the dialog');
    await page.waitForTimeout(600);
    check(patches.length === 1 && patches[0].labour_hours === 3.5 && patches[0].tasks.every(t => t.done), 'the saved record carries the edits', JSON.stringify(patches[0]?.labour_hours));
    check(calls.filter(c => c.method === 'GET' && c.pathname === '/api/job-cards').length > before, 'the register reloads after saving');
  },
  empty: { data: { '/api/job-cards': [] }, text: 'No job cards yet' },
  failing: { paths: ['/api/job-cards'], text: 'Job cards could not be loaded', notShown: ['No job cards yet'], async recovered(page, { check }) { check(await page.getByRole('table', { name: 'Job cards' }).isVisible(), 'Try again loads the job cards'); } },
};
