// /services: contractor jobs through the six approvals (cards, table, sheet, filters), the detail with per-stage saving, attachments,
// edit/create, delete, spreadsheet import and scan. Mock shapes mirror the real services router (flat stage fields).
const job = (id, over = {}) => ({
  id, created_at: `2026-09-0${id.slice(1)}T08:00:00Z`, date: `2026-09-0${id.slice(1)}`, description: '', supplier: '', contact_person: '', requisition_number: '', invoice_number: '', order_number: '', amount: '', category: '', general_comments: '',
  planning_signed: false, planning_signed_by: '', planning_signed_date: null, planning_comments: '',
  eng_mgr_signed: false, eng_mgr_signed_by: '', eng_mgr_signed_date: null, eng_mgr_comments: '',
  finance_signed: false, finance_signed_by: '', finance_signed_date: null, finance_comments: '',
  gm_signed: false, gm_signed_by: '', gm_signed_date: null, gm_comments: '',
  stores_signed: false, stores_signed_by: '', stores_signed_date: null, stores_comments: '', stores_grv_number: '',
  payment_done: false, payment_paid_by: '', payment_date: null, payment_reference: '', payment_comments: '', ...over,
});
const SIGNED = { planning_signed: true, planning_signed_by: 'Pat Planner', planning_signed_date: '2026-09-02', eng_mgr_signed: true, eng_mgr_signed_by: 'Eve Eng', eng_mgr_signed_date: '2026-09-03' };
const DONE = { ...SIGNED, finance_signed: true, finance_signed_by: 'F', finance_signed_date: '2026-09-04', gm_signed: true, gm_signed_by: 'G', gm_signed_date: '2026-09-05', stores_signed: true, stores_signed_by: 'S', stores_signed_date: '2026-09-06', stores_grv_number: 'GRV-3', payment_done: true, payment_paid_by: 'P', payment_date: '2026-09-07', payment_reference: 'EFT-3' };
const JOBS = [
  job('s1', { description: 'Pump overhaul', supplier: 'Acme Hydraulics', category: 'Maintenance', requisition_number: 'REQ-1', amount: '$4,500.00', general_comments: 'Urgent', ...SIGNED }),
  job('s2', { description: 'Cabling at the workshop', supplier: 'Zed Electrical', category: 'Electrical' }),
  job('s3', { description: 'Crusher relining', supplier: 'Rock Co', category: 'Maintenance', ...DONE }),
  // A legacy record with no fields at all must render rather than crash.
  { id: 's4', created_at: '2026-09-04T08:00:00Z' },
];
const ATTACHMENTS = [{ id: 'a1', service_id: 's1', created_at: '2026-09-02T08:00:00Z', filename: 'completion-cert.pdf', file_url: 'https://files.example.test/c.pdf', file_size: 52000, mime_type: 'application/pdf' }];
const SIGS = { s1: {}, s2: {} };
let failSave = false; let failAttachments = false; let failImportFor = null;
const putOf = (id, ok) => request => (failSave ? { __status: 422, body: { detail: 'Save rejected (fixture)' } } : { ...JOBS.find(j => j.id === id), ...request.postDataJSON(), id });

const spec = {
  route: '/services',
  h1: 'Third party services',
  data: {
    '/api/services': request => (request.method() === 'POST'
      ? (failImportFor && request.postData()?.includes(failImportFor) ? { __status: 422, body: { detail: 'Duplicate requisition (fixture)' } } : { id: 'new' })
      : JOBS),
    '/api/services/s1/signatures': () => SIGS.s1, '/api/services/s2/signatures': () => SIGS.s2,
    'PUT /api/services/s1/signatures/finance': request => { SIGS.s1.finance = request.postDataJSON().image_data; return { ok: true }; },
    'PUT /api/services/s1': putOf('s1'), 'PUT /api/services/s2': putOf('s2'),
    'DELETE /api/services/s2': {},
    'DELETE /api/services/s4': { __status: 403, body: { detail: 'Manager role required (fixture)' } },
    '/api/services/s1/attachments': request => (request.method() === 'POST' ? { id: 'a2' } : failAttachments ? { __status: 404, body: { detail: 'Storage unavailable (fixture)' } } : ATTACHMENTS),
    'POST /api/services/ocr': { description: 'Valve service', supplier: 'Acme', requisition_number: 'R-55', date: null, grv_number: 'G1' },
  },
  async ready(page, calls, { check, shot }) {
    const dialog = name => page.getByRole('dialog', { name });
    const cards = page.getByRole('list', { name: 'Services' }).getByRole('button', { name: /^Open / });
    check(await cards.count() === 4, 'four job cards (a legacy record with no fields does not crash)', String(await cards.count()) + ' ' + (await cards.evaluateAll(els => els.map(e => e.getAttribute('aria-label') || e.textContent.slice(0, 30)))).join('|'));
    check(await page.getByText('Stage 3 of 6').first().isVisible() && await page.getByText('Completed', { exact: true }).first().isVisible() && await page.getByText('Not started', { exact: true }).first().isVisible(), 'progress is stated in words, not only a bar');
    await shot(page, 'cards@1440');

    await page.getByRole('button', { name: /^In progress\s*\d/ }).click();
    check(await cards.count() === 1, 'the In progress tile filters the register');
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await page.getByRole('searchbox').fill('REQ-1');
    check(await cards.count() === 1, 'search matches the reference number');
    await page.getByRole('searchbox').fill('');

    await page.getByRole('button', { name: 'Table view' }).click();
    check(await page.getByRole('table', { name: 'Services register' }).getByRole('row').count() === 5, 'table view lists the jobs');
    await page.getByRole('button', { name: 'Sheet view' }).click();
    const sheet = page.getByRole('table', { name: 'Services sheet' });
    check(await sheet.getByRole('columnheader', { name: 'Eng Mgr' }).isVisible() && await sheet.getByText('GRV-3').isVisible(), 'the sheet shows every approval column and the GRV number');
    await shot(page, 'sheet@1440');
    await page.getByRole('button', { name: 'Card view' }).click();

    // detail: a stage needs a name and date, is saved on its own, and a refusal keeps the dialog and the typing
    await page.getByRole('button', { name: 'Open Pump overhaul' }).click();
    const d = dialog('Pump overhaul');
    await d.waitFor({ timeout: 5000 });
    check(await d.getByText('2 of 6 approvals complete').count() > 0 || await d.getByRole('progressbar').isVisible(), 'the detail shows progress');
    await shot(page, 'detail@1440');
    // completing a stage is a signature: dismissing the pad sends nothing; a refused save keeps the pad (and the signature) open
    const gate = () => page.getByRole('dialog', { name: /^Sign off/ });
    await d.getByRole('button', { name: 'Sign and complete' }).click();
    await gate().waitFor({ timeout: 5000 });
    await gate().getByRole('button', { name: 'Cancel' }).click();
    await gate().waitFor({ state: 'hidden', timeout: 5000 });
    check(!calls.some(c => c.method === 'PUT'), 'dismissing the signature step completes nothing and sends nothing');
    failSave = true;
    await d.getByRole('button', { name: 'Sign and complete' }).click();
    await gate().waitFor({ timeout: 5000 });
    const box = await gate().locator('canvas').boundingBox();
    await page.mouse.move(box.x + 20, box.y + 20); await page.mouse.down(); await page.mouse.move(box.x + 120, box.y + 50, { steps: 8 }); await page.mouse.up();
    await gate().getByRole('button', { name: 'Sign and complete' }).click();
    await gate().getByText('Save rejected (fixture)').waitFor({ timeout: 5000 }).catch(() => {});
    check(await gate().getByText('Save rejected (fixture)').isVisible(), 'a refused save shows the reason and keeps the signature step open');
    failSave = false;
    await gate().getByRole('button', { name: 'Sign and complete' }).click();
    await gate().waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    await d.getByText('Complete', { exact: true }).first().waitFor({ timeout: 5000 }).catch(() => {});
    const sigPut = calls.filter(c => c.method === 'PUT' && c.pathname === '/api/services/s1/signatures/finance').pop();
    check(/^data:image\/png;base64,/.test(sigPut?.body.image_data || ''), 'the drawn signature image is kept for the stage that was signed');
    await d.getByRole('button', { name: /^Finance/ }).click();
    await d.getByRole('img', { name: 'Signature of Shell Check' }).waitFor({ timeout: 5000 }).catch(() => {});
    check(await d.getByRole('img', { name: 'Signature of Shell Check' }).isVisible(), 'the completed stage shows the signature');
    const put = calls.filter(c => c.method === 'PUT' && c.pathname === '/api/services/s1').pop();
    check(put?.body.finance_signed === true && put.body.finance_signed_by === 'Shell Check' && /^\d{4}-\d{2}-\d{2}$/.test(put.body.finance_signed_date) && put.body.planning_signed === true && put.body.planning_signed_by === 'Pat Planner', 'signing a stage sends it with the signer name and the date, keeping the other stages', JSON.stringify(put?.body).slice(0, 200));
    // reopen asks first
    await d.getByRole('button', { name: /^Finance/ }).click();
    await d.getByRole('button', { name: /^Planning/ }).click();
    await d.getByRole('button', { name: 'Reopen stage' }).first().click();
    const c0 = page.getByRole('alertdialog');
    await c0.waitFor({ timeout: 5000 });
    await c0.getByRole('button', { name: 'Cancel' }).click();
    const before = calls.filter(c => c.method === 'PUT').length;
    await d.getByRole('button', { name: 'Reopen stage' }).first().click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Reopen' }).click();
    await page.waitForTimeout(500);
    const reopened = calls.filter(c => c.method === 'PUT' && c.pathname === '/api/services/s1').pop();
    check(calls.filter(c => c.method === 'PUT').length === before + 1 && reopened.body.planning_signed === false, 'reopening a stage asks first, then saves it as not complete');

    // attachments: list, failed load, attach
    await d.getByRole('tab', { name: 'Attachments' }).click();
    await page.waitForTimeout(600); await shot(page, 'attachments@1440');
    check(await d.getByText('completion-cert.pdf').isVisible(), 'attachments are listed');
    await d.getByLabel('File to attach').setInputFiles({ name: 'invoice.pdf', mimeType: 'application/pdf', buffer: Buffer.from('x') });
    await page.waitForTimeout(500);
    check(calls.some(c => c.method === 'POST' && c.pathname === '/api/services/s1/attachments'), 'attaching a file uploads it');
    failAttachments = true;
    await d.getByRole('tab', { name: 'Approvals' }).click();
    await d.getByRole('tab', { name: 'Attachments' }).click();
    await d.getByText(/could not be loaded/).first().waitFor({ timeout: 5000 }).catch(() => {});
    check(await d.getByText(/could not be loaded/).first().isVisible() && !(await d.getByText('No attachments yet').isVisible().catch(() => false)), 'a failed attachment load says so and is not shown as "no attachments"');
    failAttachments = false;
    await page.keyboard.press('Escape');

    // edit details
    await page.getByRole('button', { name: 'Edit Cabling at the workshop' }).click();
    const ed = dialog('Edit service');
    await ed.waitFor({ timeout: 5000 });
    await ed.getByLabel(/^Description of the service/).fill('');
    await ed.getByRole('button', { name: 'Save changes' }).click();
    check(await ed.getByText('Describe what was done.').isVisible(), 'a blank description is explained');
    await ed.getByLabel(/^Description of the service/).fill('Cabling at the new workshop');
    await ed.getByRole('button', { name: 'Save changes' }).click();
    await ed.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    check(calls.some(c => c.method === 'PUT' && c.pathname === '/api/services/s2' && c.body.description === 'Cabling at the new workshop'), 'saving sends the edited description');

    // delete confirms; a refusal shows the server's reason
    await page.getByRole('button', { name: 'Delete job' }).click();
    const c1 = page.getByRole('alertdialog');
    await c1.waitFor({ timeout: 5000 });
    await c1.getByRole('button', { name: 'Cancel' }).click();
    check(!calls.some(c => c.method === 'DELETE'), 'cancelling the confirmation deletes nothing');
    await page.getByRole('button', { name: 'Delete job' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
    await page.getByText(/Manager role required/).waitFor({ timeout: 5000 }).catch(() => {});
    check(await page.getByText(/Manager role required/).isVisible(), 'a refused delete shows the server\'s reason');

    // import: a spreadsheet previews, skips blank rows, lists a refused row with its reason
    await page.getByRole('button', { name: 'More' }).click();
    await page.getByRole('menuitem', { name: 'Import or scan' }).click();
    const im = dialog('Import or scan');
    await im.waitFor({ timeout: 5000 });
    failImportFor = 'Painting';
    await im.getByLabel('File to import or scan', { exact: true }).setInputFiles({ name: 'tracker.csv', mimeType: 'text/csv', buffer: Buffer.from('Task Description,Contractor,PR#,Planning,Colour\nWelding,Bolt,R9,TRUE,red\n,,R11,FALSE,green\nPainting,Hue,R10,FALSE,blue\n') });
    await im.getByText('2 jobs ready to import').waitFor({ timeout: 8000 }).catch(() => {});
    check(await im.getByText(/2 jobs ready to import, 1 skipped/).isVisible() && await im.getByText('Colour').first().isVisible(), 'valid and skipped rows are counted, and an unrecognised column is named');
    await shot(page, 'import@1440');
    await im.getByRole('button', { name: 'Import 2 jobs' }).click();
    await im.getByText(/Duplicate requisition \(fixture\)/).waitFor({ timeout: 8000 }).catch(() => {});
    check(await im.getByText(/Painting: Duplicate requisition \(fixture\)/).isVisible() && await im.getByRole('button', { name: 'Import 1 job' }).isVisible(), 'a refused row is listed with its reason and only it stays for a retry');
    failImportFor = null;
    await im.getByRole('button', { name: 'Cancel' }).click();

    // scan: OCR opens the form pre-filled rather than saving
    await page.getByRole('button', { name: 'Import or scan' }).click();
    await dialog('Import or scan').getByLabel('File to import or scan', { exact: true }).setInputFiles({ name: 'scan.pdf', mimeType: 'application/pdf', buffer: Buffer.from('p') });
    const sc = dialog('New service');
    await sc.waitFor({ timeout: 8000 });
    check((await sc.getByLabel(/^Description of the service/).inputValue()) === 'Valve service' && (await sc.getByLabel(/^Requisition number/).inputValue()) === 'R-55' && (await sc.getByLabel(/^Date of service/).inputValue()) === '', 'a scan pre-fills the form for review and does not invent a date');
    await shot(page, 'scan@1440');
  },
  create: {
    open: 'New service', dialog: 'New service', path: '/api/services', submit: 'Add service',
    requiredText: 'Describe what was done.',
    async fill(dialog) { await dialog.getByLabel(/^Description of the service/).fill('Replace conveyor belt'); await dialog.getByLabel(/^Total amount/).fill('$900'); },
    async kept(dialog) { return (await dialog.getByLabel(/^Description of the service/).inputValue()) === 'Replace conveyor belt' && (await dialog.getByLabel(/^Total amount/).inputValue()) === '$900'; },
    body: b => b.description === 'Replace conveyor belt' && b.amount === '$900' && /^\d{4}-\d{2}-\d{2}$/.test(b.date) && b.planning_signed === false && b.payment_done === false,
  },
  empty: { data: { '/api/services': [] }, text: 'No services recorded yet' },
  failing: { paths: ['/api/services'], text: 'Services could not be loaded', notShown: ['No services recorded yet'], async recovered(page, { check }) { check(await page.getByRole('list', { name: 'Services' }).getByRole('button').first().isVisible(), 'Try again loads the register'); } },
};
export default spec;
