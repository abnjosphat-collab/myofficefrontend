// /documents: the folder tree and smart views, the AMS setup banner, folder browsing, the universal search (words, filters, scope, order),
// in-page preview of every kind (Word, PDF, image, spreadsheet, text, audio, older Office), bulk select and delete with undo, move, edit,
// new folders (and a refused duplicate), upload of mixed kinds, and the trash. Mock shapes mirror the real documents routers.
import fs from 'node:fs';
import path from 'node:path';

const FIXTURES = path.resolve('scripts/fixtures/documents');
const row = (id, name, over = {}) => ({
  id, name, original_name: name, file_type: 'pdf', ext: 'pdf', folder_ref: 'sops', folder_path: 'Asset Management System (AMS) > 4. Support > 4.4 Documented Information > SOPs / SWPs',
  file_size: 20480, starred: false, description: '', tags: [], uploaded_by: 'Edson Mavhondo', created_at: '2026-10-10T08:00:00Z', updated_at: '2026-10-10T08:00:00Z',
  file_url: `/mock-files/${id}`, deleted_at: null, deleted_by: '', found_inside: false, ...over,
});
const FILES = [
  row('f1', 'Pump SOP.docx', { file_type: 'document', ext: 'docx', tags: ['safety', 'pumps'], description: 'Reviewed quarterly', created_at: '2026-10-15T08:00:00Z' }),
  row('f2', 'Lock out procedure.pdf', { created_at: '2026-10-14T08:00:00Z' }),
  row('f3', 'Site photo.png', { file_type: 'image', ext: 'png', created_at: '2026-10-13T08:00:00Z' }),
  row('f4', 'Budget.xlsx', { file_type: 'spreadsheet', ext: 'xlsx', created_at: '2026-10-12T08:00:00Z' }),
  row('f5', 'Toolbox talk.txt', { file_type: 'text', ext: 'txt', created_at: '2026-10-11T08:00:00Z' }),
  row('f6', 'Safety briefing.mp3', { file_type: 'audio', ext: 'mp3', created_at: '2026-10-09T08:00:00Z' }),
  row('f7', 'Old policy.doc', { file_type: 'document', ext: 'doc', created_at: '2026-10-08T08:00:00Z' }),
];
const TRASHED = row('t1', 'Old budget.xlsx', { file_type: 'spreadsheet', ext: 'xlsx', deleted_at: '2026-10-16T08:00:00Z', deleted_by: 'Edson Mavhondo' });

const folder = (id, name, parent, extra = {}) => ({ id, name, parent_id: parent, sort_order: 1000, seed_key: null, description: '', created_by: '', file_count: 0, total_count: 0, ...extra });
const FOLDERS = [
  folder('r', 'Asset Management System (AMS)', null, { seed_key: 'ams', sort_order: 10, total_count: 7 }),
  folder('s3', '3. Planning', 'r', { seed_key: 'ams/3-planning', sort_order: 30 }),
  folder('s4', '4. Support', 'r', { seed_key: 'ams/4-support', sort_order: 40, total_count: 7 }),
  folder('d44', '4.4 Documented Information', 's4', { seed_key: 'ams/4-support/4-4', sort_order: 40, file_count: 1, total_count: 7 }),
  folder('sops', 'SOPs / SWPs', 'd44', { seed_key: 'ams/4-support/4-4/sops', sort_order: 10, file_count: 6, total_count: 6 }),
  folder('c1', 'Contracts', null),
];
const OVERVIEW = {
  folders: FOLDERS, seeded: true, ams_missing: 80,
  counts: { all: 7, unfiled: 0, trashed: 1, starred: 0, unindexed: 3 },
  facets: {
    types: { document: 2, pdf: 1, image: 1, spreadsheet: 1, text: 1, audio: 1 }, exts: [{ ext: 'docx', count: 1 }, { ext: 'pdf', count: 1 }, { ext: 'png', count: 1 }],
    tags: [{ tag: 'safety', count: 1 }, { tag: 'pumps', count: 1 }], uploaders: [{ name: 'Edson Mavhondo', count: 7 }],
  },
};
const uploads = [];

const descendants = id => { const out = [id]; for (let i = 0; i < out.length; i += 1) for (const f of FOLDERS) if (f.parent_id === out[i]) out.push(f.id); return out; };
function search(request) {
  const q = new URL(request.url()).searchParams;
  const words = (q.get('q') ?? '').toLowerCase().split(/\s+/).filter(Boolean);
  if (q.get('trashed')) return { items: [TRASHED], total: 1, truncated: false, terms: [] };
  let list = FILES;
  const fid = q.get('folder_id');
  if (fid) { const ids = q.get('recursive') === 'true' ? descendants(fid) : [fid]; list = list.filter(f => ids.includes(f.folder_ref)); }
  if (q.get('types')) list = list.filter(f => q.get('types').split(',').includes(f.file_type));
  if (words.includes('isolate')) return { items: [{ ...FILES[0], found_inside: true }], total: 1, truncated: false, terms: words };
  if (words.length) list = list.filter(f => words.every(w => f.name.toLowerCase().includes(w) || f.tags.includes(w)));
  return { items: list, total: list.length, truncated: false, terms: words };
}

const spec = {
  route: '/documents',
  h1: 'Documents',
  data: {
    '/api/documents/overview': OVERVIEW,
    '/api/documents/search': search,
    '/api/documents/f1/activity': [{ id: 'a1', action: 'upload', details: { by: 'Edson Mavhondo', folder: 'A > SOPs / SWPs' }, created_at: '2026-10-15T08:00:00Z' }],
    'POST /api/documents/folders': request => (request.postDataJSON().name === 'Contracts' ? { __status: 409, body: { detail: 'A folder with this name already exists here. (fixture)' } } : { id: 'new1', name: request.postDataJSON().name, parent_id: request.postDataJSON().parent_id }),
    'POST /api/documents/folders/seed-ams': { created: 80, adopted: 0, skipped: 5, total: 85 },
    'POST /api/documents/reindex': { processed: 3, remaining: 0 },
    'POST /api/documents/bulk': request => ({ done: request.postDataJSON().ids, failed: [] }),
    'PUT /api/documents/f1': {},
    'POST /api/documents/upload': request => { uploads.push(request.postData() ?? ''); return row('n1', 'uploaded.png', { file_type: 'image', ext: 'png' }); },
  },
  empty: { text: 'No files yet', data: { '/api/documents/overview': { ...OVERVIEW, folders: [], ams_missing: 0, counts: { all: 0, unfiled: 0, trashed: 0, starred: 0, unindexed: 0 } }, '/api/documents/search': { items: [], total: 0, truncated: false, terms: [] } } },
  failing: { paths: ['/api/documents/search'], text: /could not be loaded/, notShown: ['No files yet', 'No files here'] },

  async ready(page, calls, { check, shot }) {
    const mock = p => page.route(`**/mock-files/${p}`, route => route.fulfill(p === 'f1' ? { contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', body: fs.readFileSync(path.join(FIXTURES, 'sample.docx')) }
      : p === 'f4' ? { contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', body: fs.readFileSync(path.join(FIXTURES, 'sample.xlsx')) }
      : p === 'f5' ? { contentType: 'text/plain', body: 'Toolbox talk: wear gloves and glasses.' }
      : p === 'f3' ? { contentType: 'image/png', body: fs.readFileSync(path.join(FIXTURES, 'sample.png')) }
      : { contentType: 'application/octet-stream', body: Buffer.from('x') }));
    for (const id of ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7']) await mock(id);
    const dialog = name => page.getByRole('dialog', { name });
    const lastSearch = () => calls.filter(c => c.pathname === '/api/documents/search').pop()?.query ?? '';
    // Typing waits for a pause before it asks, so wait for the request that answers it instead of guessing a delay.
    const sent = async re => { for (let i = 0; i < 60 && !re.test(lastSearch()); i += 1) await page.waitForTimeout(100); };
    const tree = page.getByRole('navigation', { name: 'Folders' });

    // the front door: views, tree, the files, and the two set-up jobs
    check(await tree.getByRole('button', { name: /^All files/ }).isVisible() && await tree.getByRole('button', { name: /^Trash/ }).isVisible(), 'the views are listed: all files, recent, starred, unfiled, trash');
    check(await tree.getByRole('button', { name: /^4\. Support/ }).isVisible(), 'the AMS folders show in the tree');
    check(await page.getByRole('button', { name: 'Preview Pump SOP.docx' }).isVisible(), 'files are listed');
    check(await page.getByText('The Asset Management System folders are not all set up').isVisible(), 'managers are told the AMS folders are not all set up');
    await shot(page, 'home@1440');
    await page.getByRole('button', { name: 'Set up the AMS folders' }).click();
    await page.waitForTimeout(500);
    check(calls.some(c => c.method === 'POST' && c.pathname === '/api/documents/folders/seed-ams'), 'one press sets up the AMS folders');
    await page.getByRole('button', { name: 'Read them now' }).click();
    await page.waitForTimeout(500);
    check(calls.some(c => c.method === 'POST' && c.pathname === '/api/documents/reindex'), 'files added earlier can be read for text search');

    // browsing: a folder lists its own files and shows its subfolders as cards
    await tree.getByRole('button', { name: /^4\. Support/ }).click();
    await page.getByRole('button', { name: 'Open folder 4.4 Documented Information' }).waitFor({ timeout: 5000 });
    check(/folder_id=s4/.test(lastSearch()) && /recursive=false/.test(lastSearch()), 'a folder lists only its own files', lastSearch());
    await page.getByRole('button', { name: 'Open folder 4.4 Documented Information' }).click();
    await page.getByRole('button', { name: 'Open folder SOPs / SWPs' }).click();
    await page.getByRole('button', { name: 'Preview Pump SOP.docx' }).waitFor({ timeout: 5000 });
    check(await page.locator('nav[aria-label="Location"]').getByText('4.4 Documented Information').isVisible(), 'the path shows where you are');
    await shot(page, 'folder@1440');

    // the universal search
    const box = page.getByRole('searchbox', { name: 'Search documents' });
    await box.fill('pump');
    await sent(/q=pump/);
    await page.locator('mark').first().waitFor({ timeout: 5000 }).catch(() => {});
    check(/q=pump/.test(lastSearch()) && /recursive=true/.test(lastSearch()) && /folder_id=sops/.test(lastSearch()), 'searching a folder searches it and everything below', lastSearch());
    check(await page.locator('mark').first().isVisible(), 'the matched word is highlighted');
    await page.getByRole('button', { name: 'Everywhere' }).click();
    await sent(/^(?!.*folder_id)/);
    check(!/folder_id=/.test(lastSearch()), '"Everywhere" searches the whole library', lastSearch());
    await box.fill('isolate');
    await page.getByText('Found inside').first().waitFor({ timeout: 5000 });
    check(await page.getByText('Found inside').first().isVisible(), 'a file found only by the words inside it says so');
    await shot(page, 'search@1440');
    await box.fill('');

    // filters and order
    await page.getByRole('button', { name: 'Filters' }).click();
    await page.getByRole('button', { name: /^PDFs/ }).click();
    await page.keyboard.press('Escape');
    await sent(/types=pdf/);
    check(/types=pdf/.test(lastSearch()), 'a kind-of-file filter narrows the list', lastSearch());
    check(await page.getByRole('list', { name: 'Filters in use' }).getByText('PDFs').isVisible(), 'the filter shows as a chip');
    await page.getByRole('button', { name: /Remove PDFs filter/ }).click();
    await sent(/^(?!.*types=)/);
    check(!/types=/.test(lastSearch()), 'removing the chip removes the filter', lastSearch());
    await page.getByRole('combobox', { name: 'Order' }).click();
    await page.getByRole('option', { name: 'Name, A to Z' }).click();
    await sent(/sort=name/);
    check(/sort=name/.test(lastSearch()) && /dir=asc/.test(lastSearch()), 'the order can be chosen', lastSearch());

    // preview, in the page: Word, then next/previous, PDF, image, spreadsheet, text, audio, older Office
    await page.getByRole('combobox', { name: 'Order' }).click();
    await page.getByRole('option', { name: 'Order: newest' }).click();
    await page.getByRole('button', { name: 'Preview Pump SOP.docx' }).click();
    const word = dialog('Pump SOP.docx');
    await word.getByText('Lock out tag out procedure').waitFor({ timeout: 8000 });
    check(await word.getByText('Lock out tag out procedure').isVisible(), 'a Word file is drawn in the page');
    check(await word.getByRole('button', { name: 'Print' }).isEnabled() && await word.getByRole('button', { name: 'Download' }).isEnabled() && await word.getByRole('button', { name: 'Open' }).isEnabled(), 'open, print and download are all there');
    check(await word.getByText('Reviewed quarterly').isVisible() && await word.getByText('Edson Mavhondo').first().isVisible(), 'the details show beside the file');
    await shot(page, 'viewer-docx@1440');
    await page.keyboard.press('ArrowRight');
    await dialog('Lock out procedure.pdf').waitFor({ timeout: 5000 });
    check(await dialog('Lock out procedure.pdf').locator('iframe').isVisible(), 'the arrow key moves to the next file; a PDF is shown in a frame');
    // keyboard focus can sit inside the embedded PDF viewer, which keeps its own arrow keys: the buttons always work
    await dialog('Lock out procedure.pdf').getByRole('button', { name: 'Next file' }).click();
    await dialog('Site photo.png').getByRole('img', { name: 'Site photo.png' }).waitFor({ timeout: 8000 }).catch(() => {});
    check(await dialog('Site photo.png').getByRole('img', { name: 'Site photo.png' }).isVisible(), 'an image is shown, with zoom');
    await dialog('Site photo.png').getByRole('button', { name: 'Zoom in' }).click();
    check(await dialog('Site photo.png').getByText('150%').isVisible(), 'zoom changes');
    await dialog('Site photo.png').getByRole('button', { name: 'Next file' }).click();
    await dialog('Budget.xlsx').getByText('P-101').waitFor({ timeout: 8000 });
    check(await dialog('Budget.xlsx').getByText('Dewatering').isVisible(), 'a spreadsheet is shown as a table');
    await dialog('Budget.xlsx').getByRole('button', { name: 'Next file' }).click();
    await dialog('Toolbox talk.txt').getByText('wear gloves and glasses').waitFor({ timeout: 5000 });
    check(true, 'a text file is shown');
    await dialog('Toolbox talk.txt').getByRole('button', { name: 'Next file' }).click();
    check(await dialog('Safety briefing.mp3').locator('audio').count() === 1, 'audio gets a player');
    await dialog('Safety briefing.mp3').getByRole('button', { name: 'Next file' }).click();
    check(await dialog('Old policy.doc').getByRole('button', { name: /Microsoft Office online/ }).isVisible() && await dialog('Old policy.doc').getByRole('button', { name: 'Print' }).isDisabled(), 'an older Office file offers the online viewer and says it cannot print here');
    check(await dialog('Old policy.doc').getByRole('button', { name: 'Next file' }).isDisabled(), 'there is no next file after the last');
    await page.keyboard.press('Escape');

    // table view, select, delete with undo
    await page.getByRole('button', { name: 'Table view' }).click();
    const table = page.getByRole('table', { name: /^Files in/ });
    await table.getByRole('checkbox', { name: 'Select all rows on this page' }).check();
    check(await page.getByRole('region', { name: 'Actions for the selected files' }).getByText('7 selected').isVisible(), 'ticking all selects every file shown');
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
    await page.waitForTimeout(600);
    const trash = calls.filter(c => c.method === 'POST' && c.pathname === '/api/documents/bulk').pop();
    check(trash?.body.action === 'trash' && trash.body.ids.length === 7, 'delete moves the files to the trash, not away for good', JSON.stringify(trash?.body).slice(0, 120));
    check(await page.getByRole('button', { name: 'Undo' }).isVisible(), 'a delete can be undone');
    await page.getByRole('button', { name: 'Card view' }).click();

    // edit details and move
    await page.getByRole('button', { name: 'More actions for Pump SOP.docx' }).click();
    await page.getByRole('menuitem', { name: 'Edit details' }).click();
    const ed = dialog('Edit details');
    await ed.getByRole('textbox', { name: 'Tags' }).fill('audit');
    await ed.getByRole('textbox', { name: 'Tags' }).press('Enter');
    await ed.getByRole('button', { name: 'Save' }).click();
    await ed.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    const put = calls.filter(c => c.method === 'PUT' && c.pathname === '/api/documents/f1').pop();
    check(put?.body.tags?.includes('audit') && put.body.tags.includes('safety') && put.body.expected_updated_at, 'saving sends the tags and the version it was opened at', JSON.stringify(put?.body));
    await page.getByRole('button', { name: 'More actions for Pump SOP.docx' }).click();
    await page.getByRole('menuitem', { name: 'Move to a folder' }).click();
    const mv = dialog('Move to a folder');
    await mv.getByRole('option', { name: /Contracts/ }).click();
    await mv.getByRole('button', { name: 'Move here' }).click();
    await page.waitForTimeout(500);
    const moved = calls.filter(c => c.method === 'POST' && c.pathname === '/api/documents/bulk').pop();
    check(moved?.body.action === 'move' && moved.body.folder_id === 'c1', 'moving sends the chosen folder', JSON.stringify(moved?.body));

    // new folder: a good one, and a refused duplicate that keeps what was typed
    await page.getByRole('button', { name: 'New folder' }).first().click();
    const nf = dialog('New folder');
    await nf.getByLabel(/^Folder name/).fill('Contracts');
    await nf.getByRole('button', { name: 'Create folder' }).click();
    await nf.getByText('A folder with this name already exists here.').waitFor({ timeout: 5000 });
    check(await nf.getByLabel(/^Folder name/).inputValue() === 'Contracts', 'a refused folder name is explained and kept');
    await nf.getByLabel(/^Folder name/).fill('Training');
    await nf.getByRole('button', { name: 'Create folder' }).click();
    await nf.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    const made = calls.filter(c => c.method === 'POST' && c.pathname === '/api/documents/folders').pop();
    check(made?.body.name === 'Training' && made.body.parent_id === 'sops', 'a folder made while inside a folder goes inside it', JSON.stringify(made?.body));

    // upload: every kind accepted, an unsafe one refused before it is sent
    await page.getByRole('button', { name: 'Upload', exact: true }).first().click();
    const up = dialog('Upload files');
    await up.waitFor({ timeout: 5000 });
    await up.getByLabel('Files to upload', { exact: true }).first().setInputFiles([
      { name: 'photo.png', mimeType: 'image/png', buffer: Buffer.from('a') }, { name: 'voice.m4a', mimeType: 'audio/mp4', buffer: Buffer.from('b') },
      { name: 'drawing.dwg', mimeType: 'application/acad', buffer: Buffer.from('c') }, { name: 'virus.exe', mimeType: 'application/octet-stream', buffer: Buffer.from('d') },
    ]);
    check(await up.getByText('.exe files are not accepted here.').isVisible(), 'an unsafe file is refused before it is sent, with the reason');
    await up.getByRole('button', { name: 'Upload 4 files' }).click();
    await up.getByText(/3 of 3 uploaded|virus\.exe/).first().waitFor({ timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(800);
    check(uploads.length === 3 && uploads.every(u => u.includes('name="folder_id"') && u.includes('new1')), 'the three safe files uploaded into the folder that was open (the one just made)', String(uploads.length));
    await shot(page, 'upload@1440');
    await up.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});

    // trash
    await tree.getByRole('button', { name: /^Trash/ }).click();
    await page.getByRole('button', { name: 'Preview Old budget.xlsx' }).waitFor({ timeout: 5000 });
    check(/trashed=true/.test(lastSearch()), 'the trash lists deleted files', lastSearch());
    await page.getByRole('button', { name: 'More actions for Old budget.xlsx' }).click();
    check(await page.getByRole('menuitem', { name: 'Restore' }).isVisible() && await page.getByRole('menuitem', { name: 'Delete for good' }).isVisible(), 'a trashed file can be restored or deleted for good');
    await page.keyboard.press('Escape');
    await shot(page, 'trash@1440');
  },

  async mobile(page, { check }) {
    check(await page.getByRole('button', { name: 'Browse folders' }).isVisible(), 'on a phone the folder tree opens from a button');
    await page.getByRole('button', { name: 'Browse folders' }).click();
    check(await page.getByRole('dialog', { name: 'Folders' }).getByRole('button', { name: /^4\. Support/ }).isVisible(), 'the tree is in the drawer');
    await page.keyboard.press('Escape');
  },
};
export default spec;
