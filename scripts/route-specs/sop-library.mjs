// /sop-library: list, viewer drawer with revision history, create (failed save keeps the form), archive.
const iso = offset => { const d = new Date(); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10); };
const sections = { purpose: 'Keep people safe around stored energy.', procedure: '1. Isolate.\n2. Lock.\n3. Tag.' };
const sop = (id, code, title, status, extra = {}) => ({ id, code, title, department: 'Operations', summary: `${title} summary`, status, classification: 'Internal', risk_tier: null, owner: 'J. Moyo', approver: null, supersedes: null, version: '1.0', effective_date: null, next_review_date: iso(200), tags: ['safety'], sections, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z', ...extra });
const SOPS = [sop('s1', 'SOP-OPS-001', 'Lockout and tagout', 'effective', { next_review_date: iso(-3) }), sop('s2', 'SOP-OPS-002', 'Hot work permit', 'draft'), sop('s3', 'SOP-OPS-003', 'Confined space entry', 'pilot', { risk_tier: 3 })];
const ARCHIVED = [sop('a1', 'SOP-OLD-001', 'Retired procedure', 'retired')];
const REVISIONS = [{ id: 'r1', sop_id: 's1', revision_number: 2, snapshot: SOPS[0], change_note: 'Added lock steps', author_email: 'ann@example.invalid', created_at: '2026-09-01T10:00:00Z' }];
let postMode = 'fail';

const spec = {
  route: '/sop-library',
  h1: 'SOP library',
  data: {
    '/api/sops': (request) => (request.method() === 'POST' ? (postMode === 'fail' ? { __status: 500, body: { detail: 'SOP service rejected the save' } } : sop('s9', 'SOP-NEW-001', 'New thing', 'draft')) : SOPS),
    '/api/sops/archived': ARCHIVED,
    '/api/sops/s1': { sop: SOPS[0], revisions: REVISIONS },
  },
  async ready(page, calls, { check, shot }) {
    check(await page.getByRole('button', { name: /^Open SOP-OPS-/ }).count() === 3, 'three SOP cards');
    check(await page.getByText('Review overdue').first().isVisible(), 'an overdue review is flagged with a label');
    await page.getByLabel('Search code, title or summary').fill('hot work');
    check(await page.getByRole('button', { name: /^Open SOP-OPS-/ }).count() === 1, 'search narrows to one SOP');
    await page.getByLabel('Search code, title or summary').fill('');

    await page.getByRole('button', { name: 'Open SOP-OPS-001: Lockout and tagout' }).click();
    const viewer = page.getByRole('dialog', { name: /SOP-OPS-001/ });
    await viewer.waitFor({ timeout: 5000 });
    check(await viewer.getByText('Keep people safe around stored energy.').isVisible(), 'the viewer shows documented sections');
    check(await viewer.getByText(/Not yet documented:/).isVisible(), 'undocumented sections are listed, not shown as empty boxes');
    await viewer.getByText('Added lock steps').waitFor({ timeout: 5000 }).catch(() => {});
    check(await viewer.getByText('Added lock steps').isVisible(), 'revision history loads in the viewer');
    await page.waitForTimeout(500);
    await shot(page, 'viewer@1440');
    await page.keyboard.press('Escape');
    await viewer.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});

    await page.getByRole('button', { name: 'Archive', exact: true }).click();
    await page.getByText('Retired procedure').first().waitFor({ timeout: 5000 }).catch(() => {});
    check(await page.getByText('Retired procedure').first().isVisible(), 'the archive scope lists archived SOPs');
    await page.getByRole('button', { name: 'Library', exact: true }).click();
    await page.screenshot({ path: 'node_modules/.cache/mo-audit/shots-routes/sop-after-archive.png' });

    // create: failed save keeps the form and what was typed
    await page.getByRole('button', { name: 'New SOP' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'New SOP' });
    await dialog.waitFor({ timeout: 5000 });
    await dialog.getByRole('button', { name: 'Create SOP' }).click();
    check(await dialog.getByText('Enter the SOP code.').isVisible() && await dialog.getByText('Enter the owner.').isVisible(), 'required fields show errors');
    await dialog.getByLabel(/^SOP code/).fill('SOP-NEW-001');
    await dialog.getByLabel(/^Title/).fill('New thing');
    await dialog.getByLabel(/^Department/).fill('Operations');
    await dialog.getByLabel(/^Owner/).fill('J. Moyo');
    await dialog.getByRole('button', { name: 'Create SOP' }).click();
    await page.waitForTimeout(1200);
    check(await dialog.isVisible() && (await dialog.getByLabel(/^Title/).inputValue()) === 'New thing', 'a failed save keeps the dialog open with the typed values');
    check(await page.getByText('SOP service rejected the save').isVisible(), 'the failure is reported');
    postMode = 'ok';
    await dialog.getByRole('button', { name: 'Create SOP' }).click();
    await dialog.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    check(!(await dialog.isVisible().catch(() => false)), 'a successful save closes the dialog');
  },
  empty: { data: { '/api/sops': [], '/api/sops/archived': [] }, text: 'No SOPs yet' },
  failing: { paths: ['/api/sops'], text: 'SOPs could not be loaded', notShown: ['No SOPs yet'], async recovered(page, { check }) { check(await page.getByRole('button', { name: /^Open SOP-OPS-/ }).first().isVisible(), 'Try again loads the SOPs'); } },
};

export default spec;
