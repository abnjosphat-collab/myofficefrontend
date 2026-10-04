// /pachedu: care observations register (cards, table, detail with status change, add/edit/delete).
const iso = offset => { const d = new Date(); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10); };
const REPORTS = [
  { id: 'c1', location: 'Workshop 1', date: iso(-3), activityObserved: 'Changing a pump seal', whatDidYouSee: 'A worker alone under a raised load.', reasons: 'Short staffed', behaviourType: 'Intentional', impacts: ['Serious injury', 'Increased Cost'], whatDidYouDo: 'Stopped the job and brought a second person.', observerName: 'Ann Alpha', dept: 'Engineering', sdwt: '12', sectionChoice: 'Mechanical', checklist: ['Lockout system', 'Time pressure'], status: 'submitted', created_at: iso(-3) },
  { id: 'c2', location: 'Substation 3', date: iso(-20), activityObserved: 'Walking past an open board', whatDidYouSee: 'A cover left off.', reasons: '', behaviourType: 'Unintentional', impacts: ['Minor injury'], whatDidYouDo: 'Refitted the cover and told the foreman.', observerName: '', dept: 'Mining', sdwt: '', sectionChoice: 'Electrical', checklist: [], status: 'closed', created_at: iso(-20) },
  // A legacy record with an unrecognised section and no lists must render rather than crash.
  { id: 'c3', location: 'Plant', date: iso(-40), activityObserved: 'Legacy activity', whatDidYouSee: 'Legacy', whatDidYouDo: 'Legacy', behaviourType: 'Other', observerName: 'Gus Eta', sectionChoice: 'Plant', status: 'draft', created_at: iso(-40) },
];
const spec = {
  route: '/pachedu',
  h1: 'Pachedu care observations',
  data: {
    '/api/pachedu/': request => (request.method() === 'POST' ? { id: 'new' } : REPORTS),
    'PATCH /api/pachedu/c1': {},
    'DELETE /api/pachedu/c2': {},
    '/api/employees': [{ id: 1, employee_id: 'E1', first_name: 'Ann', last_name: 'Alpha', department: 'Mining' }],
  },
  async ready(page, calls, { check, shot }) {
    const cards = page.getByRole('button', { name: /^View care observation by/ });
    check(await cards.count() === 3, 'three observation cards (a legacy record with an unknown section does not crash the page)');
    check(await page.getByText('High risk').first().isVisible(), 'a serious-impact observation is flagged in words');
    check(await page.getByText('Anonymous').first().isVisible(), 'a record without an observer reads Anonymous');
    check(await page.getByText(/1 mechanical, 1 electrical/).isVisible(), 'the section split is stated');
    await shot(page, 'cards@1440');
    await page.getByRole('button', { name: /^High risk/ }).click();
    check(await cards.count() === 1, 'the High risk filter keeps only serious-impact observations');
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await page.getByRole('button', { name: /^Closed/ }).first().click();
    check(await cards.count() === 1, 'the Closed tile filters the register');
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await page.getByRole('button', { name: 'Table view' }).click();
    const table = page.getByRole('table', { name: 'Pachedu care observations' });
    check(await table.getByRole('row').count() === 4, 'table view lists the three observations');
    await shot(page, 'table@1440');

    await table.getByRole('row').nth(1).click();
    const detail = page.getByRole('dialog', { name: /Pachedu: be your brother/ });
    await detail.waitFor({ timeout: 5000 });
    check(await detail.getByText('A worker alone under a raised load.').isVisible() && await detail.getByText('Lockout system').isVisible() && await detail.getByText('Serious injury').isVisible(), 'detail shows what was seen, impacts and the checklist');
    await page.waitForTimeout(400);
    await shot(page, 'detail@1440');
    await detail.getByRole('combobox', { name: 'Change status' }).click();
    await page.getByRole('option', { name: 'Reviewed' }).click();
    await page.waitForTimeout(500);
    const statusPatch = calls.filter(c => c.method === 'PATCH').pop();
    check(statusPatch?.pathname === '/api/pachedu/c1' && statusPatch.body.status === 'reviewed', 'changing status sends a PATCH with the new status', JSON.stringify(statusPatch?.body));

    await detail.getByRole('button', { name: 'Edit' }).click();
    const edit = page.getByRole('dialog', { name: 'Edit care observation' });
    await edit.waitFor({ timeout: 5000 });
    check(await edit.getByRole('checkbox', { name: 'Serious injury' }).isChecked() && await edit.getByRole('checkbox', { name: 'Lockout system' }).isChecked(), 'impacts and checklist load as checked boxes');
    await edit.getByLabel(/^Location/).fill('');
    await edit.getByRole('button', { name: 'Save changes' }).click();
    check(await edit.getByText('Enter where it happened.').isVisible(), 'a blank required field shows its error');
    await edit.getByLabel(/^Location/).fill('Workshop 2');
    await edit.getByRole('checkbox', { name: 'Fire hazards' }).check();
    await edit.getByRole('button', { name: 'Save changes' }).click();
    await edit.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    const patch = calls.filter(c => c.method === 'PATCH').pop();
    check(patch?.pathname === '/api/pachedu/c1' && patch.body.location === 'Workshop 2' && patch.body.checklist.includes('Fire hazards') && patch.body.updated_at, 'saving sends a PATCH with the edits and checklist', JSON.stringify(patch?.body).slice(0, 120));

    await page.getByRole('button', { name: /^Delete care observation by Anonymous/ }).click();
    const confirm = page.getByRole('alertdialog');
    await confirm.waitFor({ timeout: 5000 });
    await confirm.getByRole('button', { name: 'Cancel' }).click();
    check(!calls.some(c => c.method === 'DELETE'), 'cancelling the confirmation deletes nothing');
    await page.getByRole('button', { name: /^Delete care observation by Anonymous/ }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
    await page.waitForTimeout(700);
    check(calls.some(c => c.method === 'DELETE' && c.pathname === '/api/pachedu/c2'), 'confirming sends the delete');
  },
  create: {
    open: 'New care observation', dialog: 'New care observation', path: '/api/pachedu/', submit: 'Submit care observation',
    requiredText: 'Enter where it happened.',
    async fill(dialog) { await dialog.getByLabel(/^Location/).fill('Crusher plant'); await dialog.getByLabel(/^Activity observed/).fill('Clearing a chute'); await dialog.getByLabel(/^What did you see/).fill('Worker without gloves.'); await dialog.getByLabel(/^What did you do/).fill('Gave him gloves.'); },
    async kept(dialog) { return (await dialog.getByLabel(/^Location/).inputValue()) === 'Crusher plant' && (await dialog.getByLabel(/^What did you do/).inputValue()) === 'Gave him gloves.'; },
    body: b => b.location === 'Crusher plant' && b.whatDidYouDo === 'Gave him gloves.' && b.status === 'submitted' && !!b.submitted_at && b.behaviourType === 'Unintentional',
  },
  empty: { data: { '/api/pachedu/': [] }, text: 'No care observations yet' },
  failing: { paths: ['/api/pachedu/'], text: 'Pachedu reports could not be loaded', notShown: ['No care observations yet'], async recovered(page, { check }) { check(await page.getByRole('button', { name: /^View care observation by/ }).first().isVisible(), 'Try again loads the register'); } },
};
export default spec;
