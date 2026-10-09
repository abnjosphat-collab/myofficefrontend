// /documents: home search + seven categories, a category's folders and top-level files, a folder's files (cards, table, filters,
// star, preview, rename, delete, bulk delete) and upload. Mock shapes mirror the real documents router.
const row = (id, name, over = {}) => ({ id, name, original_name: `${name.toLowerCase().replace(/ /g, '-')}.pdf`, file_type: 'pdf', category_id: '3', category_name: 'Planning', folder_id: 'Risk Management', file_size: 20480, starred: false, description: '', created_at: '2026-09-20T08:00:00Z', updated_at: '2026-09-20T08:00:00Z', file_url: 'about:blank', ...over });
const RISK = [
  row('d1', 'Risk Register', { starred: true, description: 'Reviewed quarterly' }),
  row('d2', 'Site Photo', { file_type: 'image', original_name: 'photo.png', file_size: 5 * 1024 * 1024, description: 'north pit', file_url: '' }),
  row('d3', 'Notes', { file_type: 'document', original_name: 'notes.docx' }),
];
const ROOT = [row('d4', 'Loose Memo', { folder_id: null })];
const AUDITS = [row('d5', 'Audit 2026', { folder_id: 'Site Audits' })];
const FOLDERS = [{ id: 'f1', category_id: '3', category_name: 'Planning', name: 'Site Audits' }, { id: 'f2', category_id: '3', category_name: 'Planning', name: 'Empty Custom' }];
const MANY = Array.from({ length: 100 }, (_, i) => row(`m${i}`, `Match ${i}`));
let failFiles = false;

const spec = {
  route: '/documents',
  h1: 'Documents',
  data: {
    '/api/documents': request => {
      const q = new URL(request.url()).searchParams;
      const folder = q.get('folder_id');
      if (q.get('category_id') !== '3') return [];
      if (folder === 'Change Management' && failFiles) return { __status: 404, body: { detail: 'Files unavailable (fixture)' } };
      return folder === 'Risk Management' ? RISK : folder === 'Site Audits' ? AUDITS : folder ? [] : ROOT;
    },
    '/api/documents/folders': request => (request.method() === 'POST' ? { id: 'f9', name: 'Training Records' } : FOLDERS),
    '/api/documents/search': request => {
      const q = new URL(request.url()).searchParams.get('q');
      return q === 'boom' ? { __status: 404, body: { detail: 'Search is down (fixture)' } } : q === 'many' ? MANY : q === 'plan' ? [RISK[0], ROOT[0]] : [];
    },
    'PUT /api/documents/d1': {}, 'PUT /api/documents/d2': {}, 'PUT /api/documents/d3': {},
    'DELETE /api/documents/d1': {}, 'DELETE /api/documents/d3': {},
    'DELETE /api/documents/d2': { __status: 403, body: { detail: 'Manager role required (fixture)' } },
    'DELETE /api/documents/folders/f2': {},
    'POST /api/documents/upload': request => (request.postData()?.includes('refuse-me') ? { __status: 422, body: { detail: 'File type not allowed (fixture)' } } : row('d9', 'ok')),
  },
  async ready(page, calls, { check, shot }) {
    const dialog = name => page.getByRole('dialog', { name });
    // home: seven clauses, search across everything, the server cap, a failed search, locate a result
    const cats = page.getByRole('list', { name: 'Document categories' }).getByRole('listitem');
    check(await cats.count() === 7, 'the home page lists the seven ISO 55001 categories');
    await shot(page, 'home@1440');
    await page.getByRole('searchbox').fill('plan');
    const results = page.getByRole('table', { name: 'Search results' });
    await results.waitFor({ timeout: 5000 });
    check(await results.getByRole('row').count() === 3 && await results.getByText('Planning / Risk Management').isVisible(), 'search lists matches with where each one is filed');
    await shot(page, 'search@1440');
    await page.getByRole('searchbox').fill('many');
    await page.getByText('Showing the first 100 matches').waitFor({ timeout: 5000 }).catch(() => {});
    check(await page.getByText('Showing the first 100 matches').isVisible(), 'a search that reaches the server cap says the list may be incomplete');
    await page.getByRole('searchbox').fill('boom');
    await page.getByText(/could not be loaded/).first().waitFor({ timeout: 5000 }).catch(() => {});
    check(await page.getByText(/could not be loaded/).first().isVisible() && !(await page.getByText('No documents match').isVisible().catch(() => false)), 'a failed search says so and is not shown as "no matches"');
    await page.getByRole('searchbox').fill('plan');
    await results.waitFor({ timeout: 5000 });
    await results.getByText('Risk Register').click();
    await dialog('Risk Register').waitFor({ timeout: 5000 });
    check(await page.locator('nav[aria-label="Location"]').getByText('Risk Management').isVisible(), 'opening a result goes to its folder and previews it');
    await page.keyboard.press('Escape');

    // category: built-in + custom folders, top-level files, folder create / duplicate / delete rules
    await page.getByRole('navigation', { name: 'Location' }).getByRole('button', { name: 'Planning' }).click();
    const folders = page.getByRole('list', { name: 'Folders in Planning' }).getByRole('listitem');
    await folders.first().waitFor({ timeout: 5000 });
    check(await folders.count() === 7, 'a category shows its 5 built-in folders and the 2 custom ones');
    check(await page.getByRole('button', { name: 'Preview Loose Memo' }).isVisible(), 'files saved at the category top level are listed (they would be invisible otherwise)');
    await shot(page, 'category@1440');
    await page.getByRole('button', { name: 'New folder' }).click();
    const nf = dialog('New folder');
    await nf.waitFor({ timeout: 5000 });
    await nf.getByLabel(/^Folder name/).fill('site audits');
    await nf.getByRole('button', { name: 'Create folder' }).click();
    check(await nf.getByText('A folder with this name already exists here.').isVisible(), 'a duplicate folder name is refused with the reason, ignoring case');
    await nf.getByLabel(/^Folder name/).fill('Training Records');
    await nf.getByRole('button', { name: 'Create folder' }).click();
    await nf.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    const made = calls.filter(c => c.method === 'POST' && c.pathname === '/api/documents/folders').pop();
    check(made?.body.category_id === '3' && made.body.name === 'Training Records', 'creating a folder sends the category and name');
    await page.getByRole('button', { name: 'Actions for folder Site Audits' }).click();
    await page.getByRole('menuitem', { name: 'Delete folder' }).click();
    await page.getByText(/still holds 1 file/).waitFor({ timeout: 5000 }).catch(() => {});
    check(await page.getByText(/still holds 1 file/).isVisible() && !calls.some(c => c.method === 'DELETE' && c.pathname.includes('/folders/f1')), 'a folder with files is not deleted, and the message says why');
    await page.getByRole('button', { name: 'Actions for folder Empty Custom' }).click();
    await page.getByRole('menuitem', { name: 'Delete folder' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete folder' }).click();
    await page.waitForTimeout(500);
    check(calls.some(c => c.method === 'DELETE' && c.pathname === '/api/documents/folders/f2'), 'an empty custom folder can be deleted after confirming');

    // a folder: cards, star, filters
    await page.getByRole('button', { name: 'Open folder Risk Management' }).click();
    const cards = page.getByRole('button', { name: /^Preview / });
    await cards.first().waitFor({ timeout: 5000 });
    check(await cards.count() === 3, 'the folder lists its three files');
    await shot(page, 'folder@1440');
    await page.getByRole('button', { name: 'Star Notes' }).click();
    await page.waitForTimeout(300);
    const starred = calls.filter(c => c.method === 'PUT' && c.pathname === '/api/documents/d3').pop();
    check(starred?.body.starred === true, 'starring saves immediately');
    await page.getByRole('combobox', { name: 'File type' }).click();
    await page.getByRole('option', { name: 'Image' }).click();
    check(await cards.count() === 1, 'the type filter narrows the folder to images');
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await page.getByRole('searchbox').fill('quarterly');
    check(await cards.count() === 1, 'search matches the comment as well as the name');
    await page.getByRole('searchbox').fill('');

    // preview, edit details
    await page.getByRole('button', { name: 'Preview Site Photo' }).click();
    const pv = dialog('Site Photo');
    await pv.waitFor({ timeout: 5000 });
    check(await pv.getByText('north pit').isVisible() && await pv.getByText(/no stored link/).isVisible(), 'a file with no stored link says so instead of offering a dead download');
    check(await pv.getByRole('button', { name: 'Download' }).isDisabled(), 'Download is disabled when there is no link');
    await page.waitForTimeout(450); await shot(page, 'preview@1440');
    await pv.getByRole('button', { name: 'Rename' }).click();
    const ed = dialog('Edit file details');
    await ed.waitFor({ timeout: 5000 });
    await ed.getByLabel(/^Display name/).fill('Pit photo');
    await ed.getByRole('button', { name: 'Save' }).click();
    await ed.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    const put = calls.filter(c => c.method === 'PUT' && c.pathname === '/api/documents/d2').pop();
    check(put?.body.name === 'Pit photo' && put.body.description === 'north pit', 'saving sends the new name and keeps the comment', JSON.stringify(put?.body));

    // table + bulk delete: confirm first, report partial failure with the server's reason
    await page.getByRole('button', { name: 'Table view' }).click();
    const table = page.getByRole('table', { name: /^Files in Planning/ });
    check(await table.getByRole('row').count() === 4, 'table view lists the files');
    await table.getByRole('checkbox', { name: 'Select all rows on this page' }).check();
    await page.getByRole('button', { name: 'Delete selected' }).click();
    const c1 = page.getByRole('alertdialog');
    await c1.waitFor({ timeout: 5000 });
    await c1.getByRole('button', { name: 'Cancel' }).click();
    check(!calls.some(c => c.method === 'DELETE' && /\/documents\/d\d$/.test(c.pathname)), 'cancelling the confirmation deletes nothing (bulk delete used to run unconfirmed)');
    await page.getByRole('button', { name: 'Delete selected' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete 3' }).click();
    await page.getByText(/1 could not be deleted: Manager role required/).waitFor({ timeout: 5000 }).catch(() => {});
    check(await page.getByText(/1 could not be deleted: Manager role required/).isVisible(), 'a refused delete shows the server\'s reason and the others still go through');
    await page.getByRole('button', { name: 'Card view' }).click();

    // upload: one accepted, one refused; the accepted one leaves the list so a retry cannot duplicate it
    await page.getByRole('button', { name: 'Upload', exact: true }).first().click();
    const up = dialog('Upload files');
    await up.waitFor({ timeout: 5000 });
    await up.getByLabel('Files to upload', { exact: true }).first().setInputFiles([
      { name: 'ok.pdf', mimeType: 'application/pdf', buffer: Buffer.from('a') }, { name: 'refuse-me.pdf', mimeType: 'application/pdf', buffer: Buffer.from('b') },
    ]);
    await up.getByRole('button', { name: 'Upload 2 files' }).click();
    await up.getByText(/1 of 2 uploaded/).waitFor({ timeout: 8000 }).catch(() => {});
    check(await up.getByText(/1 of 2 uploaded/).isVisible() && await up.getByText('File type not allowed (fixture)').isVisible(), 'a refused file keeps its reason in the dialog and the accepted one is reported');
    check(await up.getByRole('list', { name: 'Files to upload' }).getByRole('listitem').count() === 1, 'only the refused file stays in the list');
    await shot(page, 'upload-error@1440');
    await up.getByRole('button', { name: 'Cancel' }).click();

    // a folder that fails to load is an error with a retry, never an empty folder
    failFiles = true;
    await page.getByRole('navigation', { name: 'Location' }).getByRole('button', { name: 'Planning' }).click();
    await page.getByRole('button', { name: 'Open folder Change Management' }).click();
    await page.getByText(/could not be loaded/).first().waitFor({ timeout: 8000 }).catch(() => {});
    check(await page.getByText(/could not be loaded/).first().isVisible() && !(await page.getByText('No files here yet').isVisible().catch(() => false)), 'a failed folder load says so and is not shown as an empty folder');
    failFiles = false;
    await page.getByRole('button', { name: 'Try again' }).first().click();
    await page.getByText('No files here yet').waitFor({ timeout: 5000 }).catch(() => {});
    check(await page.getByText('No files here yet').isVisible(), 'Try again loads the folder');
  },
};
export default spec;
