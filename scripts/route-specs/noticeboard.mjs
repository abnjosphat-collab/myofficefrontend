// /noticeboard: notices (cards, table, server filters, detail with attachments, pin, bulk actions, upload, add/edit/delete).
const iso = offset => { const d = new Date(); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10); };
const PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=';
const NOTICES = [
  { id: 'n1', title: 'Fire drill on Friday', content: 'Assemble at the north gate at 10:00.', date: iso(-2), category: 'Safety', priority: 'Critical', status: 'Active', is_pinned: true, requires_acknowledgment: true, author: 'Ann Alpha', department: 'Operations', expires_at: iso(30), target_audience: 'All Employees', notification_type: 'Event',
    attachments: [{ name: 'map.png', url: PIXEL, size: '1 KB' }, { name: 'plan.pdf', url: 'https://example.invalid/plan.pdf', size: '88 KB' }], created_at: iso(-2) + 'T08:00:00Z' },
  { id: 'n2', title: 'Old leave policy', content: 'Superseded by the new policy.', date: iso(-60), category: 'HR', priority: 'Low', status: 'Active', is_pinned: false, requires_acknowledgment: false, author: '', department: 'HR', expires_at: iso(-10), target_audience: 'All Employees', notification_type: 'Policy Update', attachments: [] },
  { id: 'n3', title: 'Canteen menu', content: 'New menu from Monday.', date: iso(-5), category: 'General', priority: 'Medium', status: 'Draft', is_pinned: false, requires_acknowledgment: false, author: 'Dee Delta', department: 'General', expires_at: null, target_audience: 'All Employees', notification_type: 'General Announcement', attachments: [] },
];
const spec = {
  route: '/noticeboard',
  h1: 'Noticeboard',
  data: {
    '/api/notices': request => (request.method() === 'POST' ? { id: 'new' } : NOTICES),
    'PATCH /api/notices/n1': {},
    'PATCH /api/notices/n2': {},
    'DELETE /api/notices/n3': {},
    'POST /api/notices/upload-attachment': { name: 'brief.pdf', url: 'https://example.invalid/brief.pdf', size: '12 KB' },
  },
  async ready(page, calls, { check, shot }) {
    const cards = page.getByRole('button', { name: /^View notice/ });
    check(await cards.count() === 3, 'three notice cards');
    check(await page.getByText('2 Active Notices').isVisible(), 'the shell shows the once-per-session active-notices popup');
    await shot(page, 'with-popup@1440');
    await page.getByRole('button', { name: 'Dismiss all' }).click(); // as a user would, so it does not sit over the table actions
    check(!(await page.getByText('2 Active Notices').isVisible().catch(() => false)), 'Dismiss all clears the popup');
    check(await page.getByRole('heading', { level: 2, name: /Pinned notices/ }).isVisible(), 'pinned notices have their own section');
    check(await page.getByText('Expired', { exact: true }).first().isVisible(), 'an expired notice is labelled in words');
    await shot(page, 'cards@1440');

    // filters are sent to the server
    await page.getByRole('combobox', { name: 'Filter by category' }).click();
    await page.getByRole('option', { name: 'Safety' }).click();
    await page.waitForTimeout(600);
    const q1 = calls.filter(c => c.method === 'GET' && c.pathname === '/api/notices').pop();
    check(/category=Safety/.test(q1.query), 'a category filter is sent to the server', q1.query);
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await page.getByRole('searchbox').fill('fire');
    await page.waitForTimeout(900);
    const q2 = calls.filter(c => c.method === 'GET' && c.pathname === '/api/notices').pop();
    check(/search=fire/.test(q2.query), 'the search is sent to the server', q2.query);
    const searchCalls = calls.filter(c => c.method === 'GET' && c.pathname === '/api/notices' && /search=/.test(c.query)).length;
    check(searchCalls === 1, 'typing a word sends one search request, not one per letter', String(searchCalls));
    await page.getByRole('searchbox').fill('');
    await page.waitForTimeout(700);

    // view-only: hide expired
    await page.getByRole('button', { name: /Hide expired notices/ }).click();
    check(await cards.count() === 2, 'Hide expired removes the expired notice from view');
    await page.getByRole('button', { name: /Showing non-expired only/ }).click();
    await page.getByRole('button', { name: 'Table view' }).click();
    const table = page.getByRole('table', { name: 'Notices' });
    check(await table.getByRole('row').count() === 4, 'table view lists the three notices');
    await shot(page, 'table@1440');

    // bulk actions confirm first
    await page.getByRole('button', { name: /^Archive all expired/ }).click();
    const c1 = page.getByRole('alertdialog');
    await c1.waitFor({ timeout: 5000 });
    await c1.getByRole('button', { name: 'Cancel' }).click();
    check(!calls.some(c => c.method === 'PATCH'), 'cancelling the archive confirmation changes nothing');
    await page.getByRole('button', { name: /^Archive all expired/ }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Archive' }).click();
    await page.waitForTimeout(800);
    const arch = calls.filter(c => c.method === 'PATCH').pop();
    check(arch?.pathname === '/api/notices/n2' && arch.body.status === 'Archived', 'archiving sends Archived for the expired notice only', JSON.stringify(arch));

    // detail: attachments, pin
    await table.getByRole('row').nth(1).click();
    const detail = page.getByRole('dialog', { name: 'Fire drill on Friday' });
    await detail.waitFor({ timeout: 5000 });
    check(await detail.getByRole('link', { name: /Download plan\.pdf/ }).getAttribute('href') === 'https://example.invalid/plan.pdf', 'attachments have download links');
    await page.waitForTimeout(400);
    await shot(page, 'detail@1440');
    await detail.getByRole('button', { name: 'Unpin' }).click();
    await page.waitForTimeout(500);
    const pinPatch = calls.filter(c => c.method === 'PATCH').pop();
    check(pinPatch?.pathname === '/api/notices/n1' && pinPatch.body.is_pinned === false, 'unpinning sends is_pinned: false', JSON.stringify(pinPatch?.body));

    // edit with an upload
    await detail.getByRole('button', { name: 'Edit notice' }).click();
    const edit = page.getByRole('dialog', { name: 'Edit notice' });
    await edit.waitFor({ timeout: 5000 });
    check((await edit.getByLabel(/^Title/).inputValue()) === 'Fire drill on Friday', 'edit dialog loads the notice');
    await edit.getByLabel(/^Title/).fill('');
    await edit.getByRole('button', { name: 'Save changes' }).click();
    check(await edit.getByText('Enter a title.').isVisible(), 'a blank title shows its error');
    await edit.getByLabel(/^Title/).fill('Fire drill on Friday (moved)');
    await edit.getByLabel(/^Attachments/).setInputFiles({ name: 'brief.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 test') });
    await edit.getByText('brief.pdf').waitFor({ timeout: 5000 });
    check(calls.some(c => c.method === 'POST' && c.pathname === '/api/notices/upload-attachment'), 'a picked file is uploaded');
    await edit.getByRole('button', { name: 'Save changes' }).click();
    await edit.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    const patch = calls.filter(c => c.method === 'PATCH').pop();
    check(patch?.pathname === '/api/notices/n1' && patch.body.title.includes('moved') && patch.body.attachments.length === 3 && patch.body.attachments.some(a => a.name === 'brief.pdf'), 'saving sends the edit with the new attachment appended', JSON.stringify(patch?.body).slice(0, 120));

    await page.getByRole('button', { name: 'Delete Canteen menu' }).click();
    const c2 = page.getByRole('alertdialog');
    await c2.waitFor({ timeout: 5000 });
    await c2.getByRole('button', { name: 'Cancel' }).click();
    check(!calls.some(c => c.method === 'DELETE'), 'cancelling the delete confirmation deletes nothing');
    await page.getByRole('button', { name: 'Delete Canteen menu' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
    await page.waitForTimeout(700);
    check(calls.some(c => c.method === 'DELETE' && c.pathname === '/api/notices/n3'), 'confirming sends the delete');
  },
  create: {
    // The shell's once-per-session active-notices popup sits over the header actions until it is dismissed.
    async before(page) { const d = page.getByRole('button', { name: 'Dismiss all' }); if (await d.isVisible().catch(() => false)) await d.click(); },
    open: 'Create notice', dialog: 'Create notice', path: '/api/notices', submit: 'Create notice',
    requiredText: 'Enter a title.',
    async fill(dialog) { await dialog.getByLabel(/^Title/).fill('Road closure'); await dialog.getByLabel(/^Content/).fill('The haul road is closed on Sunday.'); },
    async kept(dialog) { return (await dialog.getByLabel(/^Title/).inputValue()) === 'Road closure' && (await dialog.getByLabel(/^Content/).inputValue()) === 'The haul road is closed on Sunday.'; },
    body: b => b.title === 'Road closure' && b.status === 'Draft' && b.priority === 'Medium' && Array.isArray(b.attachments) && b.is_pinned === false,
  },
  empty: { data: { '/api/notices': [] }, text: 'No notices yet' },
  failing: { paths: ['/api/notices'], text: 'Notices could not be loaded', notShown: ['No notices yet'], async recovered(page, { check }) { check(await page.getByRole('button', { name: /^View notice/ }).first().isVisible(), 'Try again loads the notices'); } },
};
export default spec;
