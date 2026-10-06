// /pto: planned task observation register (cards, table, detail with status change, add/edit/delete).
const iso = offset => { const d = new Date(); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10); };
const FULL = {
  timeOnJob: { months: '4', years: '2' }, notification: { toldInAdvance: 'Yes' },
  reasons: { monthly: true, newEmployee: false, safetyAwareness: true, incidentFollowUp: false, trainingFollowUp: false, infrequentTask: false },
  procedures: { hasProcedure: 'Yes', familiarWithProcedure: 'No' },
  suggestedRemedies: { newProcedure: 'No', reviseExisting: 'Yes', differentEquipment: 'No', engineeringControls: 'No', retraining: 'Yes', improvedPPE: 'No', placementOfWorker: 'No' },
};
const REPORTS = [
  { id: 'p1', date: iso(-4), observerName: 'Ann Alpha', section: 'Mechanical', deptSectionContractor: 'Mining', workerName: 'Ben Beta', occupation: 'Fitter', jobTaskObserved: 'Changing a conveyor idler', sheqRefNo: 'S-1', observationType: 'Initial', ...FULL,
    riskAssessment: { made: 'Yes', identified: 'No', effective: 'Yes' }, observationScope: 'All', followUpNeeded: 'Yes', status: 'submitted', created_at: iso(-4),
    actionPlan: [
      { id: 'a1', no: 1, action: 'Write a task procedure', byWhom: 'Cat Gamma', byWhen: iso(-1), status: 'Pending' },
      { id: 'a2', no: 2, action: 'Retrain fitter', byWhom: 'Dee Delta', byWhen: iso(10), status: 'Completed', completedDate: iso(-2), remarks: 'Signed off' },
    ] },
  { id: 'p2', date: iso(-20), observerName: 'Eve Epsilon', section: 'Electrical', deptSectionContractor: '', workerName: 'Fay Zeta', occupation: '', jobTaskObserved: 'Isolating a board', sheqRefNo: '', observationType: 'Follow up', ...FULL,
    riskAssessment: { made: 'Yes', identified: 'Yes', effective: 'Yes' }, observationScope: 'Partial', followUpNeeded: 'No', status: 'closed', created_at: iso(-20), actionPlan: [] },
  // A legacy record missing every nested group must render rather than crash.
  { id: 'p3', date: iso(-40), observerName: '', section: 'Plant', workerName: 'Gus Eta', jobTaskObserved: 'Legacy observation', observationType: 'Initial', observationScope: 'All', followUpNeeded: 'No', status: 'draft', created_at: iso(-40) },
];
const spec = {
  route: '/pto',
  h1: 'Planned task observation',
  data: {
    '/api/pto/': request => (request.method() === 'POST' ? { id: 'new' } : REPORTS),
    'PATCH /api/pto/p1/': {},
    'DELETE /api/pto/p2/': {},
  },
  async ready(page, calls, { check, shot }) {
    const cards = page.getByRole('button', { name: /^View PTO report/ });
    check(await cards.count() === 3, 'three report cards (a legacy record with missing groups and an unknown section does not crash the page)');
    check(await page.getByText('Risk identified').first().isVisible(), 'a high-risk observation is flagged in words');
    check(await page.getByText('1 of 2 completed, 1 overdue').isVisible(), 'action progress and overdue count are stated in words');
    await shot(page, 'cards@1440');
    await page.getByRole('button', { name: /^Filters/ }).click();
    await page.getByRole('button', { name: /^High risk/ }).click();
    await page.keyboard.press('Escape');
    check(await cards.count() === 1, 'the High risk filter keeps only the observation with a "No" answer (a record with no assessment is not flagged)');
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await page.getByRole('button', { name: /^Closed/ }).first().click();
    check(await cards.count() === 1, 'the Closed tile filters the register');
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await page.getByRole('button', { name: 'Table view' }).click();
    const table = page.getByRole('table', { name: 'PTO reports' });
    check(await table.getByRole('row').count() === 4, 'table view lists the three reports');
    await shot(page, 'table@1440');

    await table.getByRole('row').nth(1).click();
    const detail = page.getByRole('dialog', { name: 'Planned task observation report' });
    await detail.waitFor({ timeout: 5000 });
    check(await detail.getByText('Write a task procedure').isVisible() && await detail.getByText(/Signed off/).isVisible() && await detail.getByText('Retraining').isVisible() && await detail.getByText('Monthly observation').isVisible(), 'detail lists reasons, remedies and each action with status and remarks');
    await page.waitForTimeout(400);
    await shot(page, 'detail@1440');
    await detail.getByRole('combobox', { name: 'Change status' }).click();
    await page.getByRole('option', { name: 'Reviewed' }).click();
    await page.waitForTimeout(500);
    const statusPatch = calls.filter(c => c.method === 'PATCH').pop();
    check(statusPatch?.pathname === '/api/pto/p1/' && statusPatch.body.status === 'reviewed', 'changing status sends a PATCH with the new status', JSON.stringify(statusPatch?.body));

    await detail.getByRole('button', { name: 'Edit' }).click();
    const edit = page.getByRole('dialog', { name: 'Edit PTO report' });
    await edit.waitFor({ timeout: 5000 });
    check((await edit.getByLabel(/^Required action \(action 1\)/).inputValue()) === 'Write a task procedure', 'edit dialog loads the actions');
    check(await edit.getByRole('checkbox', { name: 'Safety awareness' }).isChecked() && await edit.getByRole('checkbox', { name: 'Retraining' }).isChecked(), 'reasons and remedies load as checked boxes');
    await edit.getByLabel(/^Required action \(action 2\)/).fill('');
    await edit.getByRole('button', { name: 'Save changes' }).click();
    check(await edit.getByText('Describe the required action.').isVisible(), 'a blank action field shows its error');
    await edit.getByLabel(/^Required action \(action 2\)/).fill('Retrain fitter');
    await edit.getByRole('checkbox', { name: 'New procedure' }).check();
    await edit.getByLabel(/^Job or task observed/).fill('Changing a conveyor idler (revised)');
    await edit.getByRole('button', { name: 'Save changes' }).click();
    await edit.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    const patch = calls.filter(c => c.method === 'PATCH').pop();
    check(patch?.pathname === '/api/pto/p1/' && patch.body.jobTaskObserved.includes('revised') && patch.body.actionPlan.length === 2 && patch.body.suggestedRemedies.newProcedure === 'Yes' && patch.body.updated_at, 'saving sends a PATCH with the edits, remedies and both actions', JSON.stringify(patch?.body).slice(0, 120));

    await page.getByRole('button', { name: /^Delete PTO report Isolating/ }).click();
    const confirm = page.getByRole('alertdialog');
    await confirm.waitFor({ timeout: 5000 });
    await confirm.getByRole('button', { name: 'Cancel' }).click();
    check(!calls.some(c => c.method === 'DELETE'), 'cancelling the confirmation deletes nothing');
    await page.getByRole('button', { name: /^Delete PTO report Isolating/ }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
    await page.waitForTimeout(700);
    check(calls.some(c => c.method === 'DELETE' && c.pathname === '/api/pto/p2/'), 'confirming sends the delete');

    // opening the legacy record in the editor must not crash and must offer sensible defaults
    await table.getByRole('row').filter({ hasText: 'Gus Eta' }).click();
    await page.getByRole('dialog', { name: 'Planned task observation report' }).getByRole('button', { name: 'Edit' }).click();
    const legacy = page.getByRole('dialog', { name: 'Edit PTO report' });
    await legacy.waitFor({ timeout: 5000 });
    check(await legacy.getByLabel(/^Worker name/).inputValue() === 'Gus Eta', 'a legacy record opens in the editor');
  },
  create: {
    open: 'New PTO', dialog: 'New planned task observation', path: '/api/pto/', submit: 'Submit PTO',
    requiredText: 'Enter the observer’s name.',
    async fill(dialog) { await dialog.getByLabel(/^Observer name/).fill('Hal Theta'); await dialog.getByLabel(/^Worker name/).fill('Ivy Iota'); await dialog.getByLabel(/^Job or task observed/).fill('Welding a bracket'); },
    async kept(dialog) { return (await dialog.getByLabel(/^Worker name/).inputValue()) === 'Ivy Iota' && (await dialog.getByLabel(/^Job or task observed/).inputValue()) === 'Welding a bracket'; },
    body: b => b.observerName === 'Hal Theta' && b.jobTaskObserved === 'Welding a bracket' && b.status === 'submitted' && !!b.submitted_at && b.riskAssessment.made === 'No' && Array.isArray(b.actionPlan),
  },
  empty: { data: { '/api/pto/': [] }, text: 'No PTO reports yet' },
  failing: { paths: ['/api/pto/'], text: 'PTO reports could not be loaded', notShown: ['No PTO reports yet'], async recovered(page, { check }) { check(await page.getByRole('button', { name: /^View PTO report/ }).first().isVisible(), 'Try again loads the register'); } },
};
export default spec;
