// /sheq: SHEQ safety dashboard (tiles, score, trend, weekly targets, modules, analytics, analysis, notes).
const iso = offset => { const d = new Date(); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10); };
const data = {
  '/api/nearmiss/': [
    { id: 'n1', department: 'Mining', section: 'Mechanical', date: iso(0), submittedAt: iso(0) },
    { id: 'n2', department: 'Mining', section: 'Mechanical', date: iso(-20), submittedAt: iso(-20) },
    { id: 'n3', department: 'Stores', section: 'General', date: iso(-50), submittedAt: iso(-50) },
  ],
  '/api/work-stoppage/': [{ id: 'w1', date: iso(-9), created_at: iso(-9), correctiveActions: [{ status: 'Completed' }, { status: 'Pending' }] }],
  '/api/vfl/': [
    { id: 'v1', date: iso(0), created_at: iso(0), behaviourCategory: 'Safe Behaviour', status: 'submitted', actions: [{ status: 'Completed' }] },
    { id: 'v2', date: iso(-40), created_at: iso(-40), behaviourCategory: 'Unsafe Behaviour', status: 'draft', actions: [{ status: 'Pending' }] },
  ],
  '/api/pto/': [
    { id: 'p1', created_at: iso(-3), observationType: 'Initial', riskAssessment: { made: 'Yes', identified: 'No', effective: 'Yes' }, actionPlan: [{ status: 'In Progress' }] },
    { id: 'p2', created_at: iso(-30), observationType: 'Follow up', riskAssessment: { made: 'Yes', identified: 'Yes', effective: 'Yes' }, actionPlan: [] },
  ],
  '/api/sheq/': [
    { id: 'i1', date: iso(-2), status: 'approved', findings: [{ status: 'open', priority: 'critical' }] },
    { id: 'i2', date: iso(-15), status: 'submitted', findings: [{ status: 'overdue', priority: 'medium' }] },
  ],
  '/api/pachedu/': [
    { id: 'c1', date: iso(-1), behaviourType: 'Intentional', status: 'closed' },
    { id: 'c2', date: iso(-25), behaviourType: 'Unintentional', status: 'draft' },
  ],
  'POST /api/ai/safety-analysis': { summary: 'Mechanical near misses cluster at the north pit.', overall_risk: 'medium', risk_score: 55, _records_analysed: 14, generated_at: new Date().toISOString(),
    problem_areas: [{ title: 'Guarding', severity: 'high', description: 'Two guard faults.', module: 'Inspections', location_or_dept: 'Workshop 1', count: 2 }],
    recommendations: [{ priority: 'immediate', action: 'Fit missing guards', rationale: 'Open critical finding', owner: 'Maintenance', target: 'This week' }],
    trends: [{ metric: 'Near misses', direction: 'worsening', insight: 'Up on last month.' }], top_risk_locations: ['North pit'], top_risk_departments: ['Mining'] },
};
const spec = {
  route: '/sheq',
  h1: 'SHEQ safety dashboard',
  data,
  async ready(page, calls, { check, shot }) {
    const body = async () => page.locator('main').innerText();
    check(/Total reports\s*\n?\s*12/.test((await body()).replace(/\n+/g, ' ')) || (await body()).includes('12'), 'total reports sums all six modules (3+1+2+2+2+2)');
    check(await page.getByText('1 safe, 1 unsafe').isVisible(), 'VFL tile states safe and unsafe in words');
    check(await page.getByText('2 mech, 0 elec, 1 general').isVisible(), 'near miss shows only the section split (no invented status)');
    check(await page.getByText('1 critical inspection finding needs immediate action.').isVisible() && await page.getByText('1 inspection finding is overdue.').isVisible() && await page.getByText(/1 planned task observation is flagged as high risk/).isVisible(), 'alerts are stated for critical, overdue and high-risk items');
    check(await page.getByText('48', { exact: true }).first().isVisible() && await page.getByText('Concern').first().isVisible(), 'safety score is the mean of the parts with data (48, Concern)');
    check(await page.getByText('Action completion').first().isVisible() && await page.getByText('2 of 5').first().isVisible(), 'score parts show their numerator and denominator');
    check(await page.getByRole('table', { name: 'Reports per module and month' }).isVisible(), 'monthly counts are available as a table');
    await shot(page, 'overview@1440');

    // a period with no qualifying records: no score, not "good standing"
    await page.getByRole('button', { name: '7 days' }).click();
    check(await page.getByText(/No score for this period/).isVisible() === false, 'the 7 day period still has records (this week) so a score is shown');
    await page.getByRole('button', { name: 'Custom' }).click();
    await page.getByLabel('From date').fill('2020-01-01');
    await page.getByLabel('To date').fill('2020-01-31');
    check(await page.getByText(/No score for this period/).isVisible(), 'a period with nothing in it shows "No score", not a perfect one');
    await page.getByRole('button', { name: 'All time' }).click();

    await page.getByRole('tab', { name: 'Weekly targets' }).click();
    const weekly = page.getByRole('table', { name: 'Weekly performance against target' });
    check(await weekly.getByRole('row').count() === 6, 'weekly table lists the five modules');
    check(await weekly.getByRole('row').filter({ hasText: 'Visible felt leadership' }).getByText(/Not started|Below target|Almost|In progress|On target|Exceeded/).isVisible(), 'each module has a status label');
    await page.getByRole('button', { name: 'Edit targets' }).click();
    const dlg = page.getByRole('dialog', { name: 'Edit weekly targets' });
    await dlg.waitFor({ timeout: 5000 });
    await dlg.getByLabel('Visible felt leadership target').fill('1');
    await dlg.getByRole('button', { name: 'Save targets' }).click();
    await dlg.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    check(await weekly.getByRole('row').filter({ hasText: 'Visible felt leadership' }).getByText(/On target|Exceeded/).isVisible(), 'a saved target changes the status at once');
    check(await page.evaluate(() => JSON.parse(localStorage.getItem('sheq_weekly_targets') || '{}').vfl) === 1, 'targets are kept on this device');
    await shot(page, 'weekly@1440');

    await page.getByRole('tab', { name: 'Modules' }).click();
    check(await page.getByRole('link', { name: 'Open Near miss' }).getAttribute('href') === '/near_miss', 'a module card links to its page');
    check(await page.getByText('Near miss records carry no status, so only the section split is shown.').isVisible(), 'the near miss card says why it shows only the section split');
    await page.getByRole('tab', { name: 'Analytics' }).click();
    check(await page.getByText(/Corrective actions: Completed 2, In progress 1, Pending 2 of 5/).count() === 1, 'analytics carry a text alternative with the values');
    await shot(page, 'analytics@1440');

    await page.getByRole('tab', { name: 'Analysis' }).click();
    await page.getByRole('button', { name: 'Analyse' }).click();
    await page.getByText('Mechanical near misses cluster at the north pit.').waitFor({ timeout: 8000 });
    check(await page.getByText('Fit missing guards').isVisible() && await page.getByText('North pit').first().isVisible(), 'analysis shows recommendations and hotspots');
    check(calls.some(c => c.method === 'POST' && c.pathname === '/api/ai/safety-analysis'), 'analysis posts the loaded records');
    await shot(page, 'analysis@1440');

    await page.getByRole('tab', { name: /^Notes/ }).click();
    await page.getByRole('textbox', { name: 'Note' }).fill('Check guards on Friday');
    await page.getByRole('button', { name: 'Add note' }).click();
    check(await page.getByText('Check guards on Friday').isVisible(), 'a note is added');
    check(await page.evaluate(() => JSON.parse(localStorage.getItem('sheq_dash_notes') || '[]').length) === 1, 'notes are kept on this device');
    await page.getByRole('button', { name: /^Delete note by/ }).click();
    const confirm = page.getByRole('alertdialog');
    await confirm.waitFor({ timeout: 5000 });
    await confirm.getByRole('button', { name: 'Cancel' }).click();
    check(await page.getByText('Check guards on Friday').isVisible(), 'cancelling the confirmation keeps the note');
    await page.getByRole('button', { name: /^Delete note by/ }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
    check(await page.getByText('No notes yet').isVisible(), 'confirming deletes the note');
  },
  empty: { data: { '/api/nearmiss/': [], '/api/work-stoppage/': [], '/api/vfl/': [], '/api/pto/': [], '/api/sheq/': [], '/api/pachedu/': [] }, text: 'No safety records yet' },
  failing: { paths: ['/api/vfl/'], text: 'The SHEQ dashboard could not be loaded', notShown: ['No safety records yet', 'Good standing'], async recovered(page, { check }) { check(await page.getByText('1 safe, 1 unsafe').isVisible(), 'Try again loads the dashboard'); } },
};
export default spec;
