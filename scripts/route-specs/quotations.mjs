// /quotations: a generator whose PDF and Word files are built in the browser. Nothing is pre-filled; the draft survives a reload; an
// incomplete quotation cannot be exported and says why; saved quotations are kept on the server (shared), can be opened and deleted, a
// refused save says why, and a list a browser saved before sharing is moved up once; a bad logo is refused.
const STORE = new Map();
const shape = (id, draft, savedAt) => ({ id, savedAt, savedBy: 'fixture@x.com', draft });
let failSave = false;
const spec = {
  route: '/quotations',
  h1: 'Quotations',
  data: {
    '/api/quotations': () => [...STORE.values()],
    'PUT /api/quotations/QT-TEST-1': request => { if (failSave) return { __status: 422, body: { detail: 'Save rejected (fixture)' } }; const b = request.postDataJSON(); const row = shape('QT-TEST-1', b.draft, b.saved_at); STORE.set('QT-TEST-1', row); return row; },
    'DELETE /api/quotations/QT-TEST-1': () => { STORE.delete('QT-TEST-1'); return { ok: true }; },
  },
  async ready(page, calls, { check, shot }) {
    check((await page.getByLabel('Client name').inputValue()) === '' && (await page.getByLabel('Company name').inputValue()) === '', 'nothing is pre-filled (no invented company or client)');
    check(!(await page.getByText(/Elite Solutions|Tech Innovations|Premium/).first().isVisible().catch(() => false)), 'no demo company, client or template appears');

    // an empty quotation cannot be exported, and says why
    await page.getByRole('button', { name: 'PDF', exact: true }).click();
    check(await page.getByText('Fix these before exporting').isVisible() && await page.getByText('Add at least one line item.').isVisible(), 'exporting an empty quotation lists what is missing');
    await shot(page, 'blocked@1440');

    await page.getByLabel('Company name').fill('Fixture Engineering');
    await page.getByLabel('Client name').fill('Acme Mining');
    await page.getByLabel('Line 1 description').fill('Pump seal kit');
    await page.getByLabel('Line 1 quantity').fill('2');
    await page.getByLabel('Line 1 rate').fill('12.5');
    check(await page.getByLabel('Line 1 amount').textContent() === '$25.00', 'a line amount is quantity times rate');
    await page.getByLabel('Tax (%)').fill('10');
    check(await page.getByText('$27.50').first().isVisible(), 'the total includes the tax');
    await page.getByRole('button', { name: 'Add a line' }).click();
    check(await page.getByLabel('Line 2 description').isVisible(), 'a line can be added');
    await page.getByRole('button', { name: 'Remove line 2' }).click();
    check(!(await page.getByLabel('Line 2 description').isVisible().catch(() => false)), 'and removed');
    await shot(page, 'edit@1440');

    // the draft survives a reload
    await page.reload();
    await page.getByLabel('Client name').waitFor({ timeout: 8000 });
    check((await page.getByLabel('Client name').inputValue()) === 'Acme Mining' && (await page.getByLabel('Company name').inputValue()) === 'Fixture Engineering' && (await page.getByLabel('Line 1 description').inputValue()) === 'Pump seal kit', 'the draft and the company details are still there after a reload');

    // preview
    await page.getByRole('tab', { name: 'Preview' }).click();
    const doc = page.getByRole('article', { name: 'Quotation preview' });
    check(await doc.getByText('Pump seal kit').isVisible() && await doc.getByText('Fixture Engineering').isVisible() && await doc.getByText('$27.50').isVisible(), 'the preview shows the lines and the total');
    await shot(page, 'preview@1440');
    await page.getByRole('tab', { name: 'Edit' }).click();

    // exports
    const [pdf] = await Promise.all([page.waitForEvent('download', { timeout: 20000 }).catch(() => null), page.getByRole('button', { name: 'PDF', exact: true }).click()]);
    check(!!pdf && /^quotation-QT-.*\.pdf$/.test(pdf.suggestedFilename()), 'the PDF downloads', pdf?.suggestedFilename());
    await pdf?.saveAs('node_modules/.cache/mo-audit/quotation-export.pdf').catch(() => {});
    const [word] = await Promise.all([page.waitForEvent('download', { timeout: 20000 }).catch(() => null), (async () => { await page.getByRole('button', { name: 'More' }).click(); await page.getByRole('menuitem', { name: 'Word', exact: true }).click(); })()]);
    check(!!word && /^quotation-QT-.*\.docx$/.test(word.suggestedFilename()), 'the Word file downloads', word?.suggestedFilename());
    await word?.saveAs('node_modules/.cache/mo-audit/quotation-export.docx').catch(() => {});

    // saving: a refusal says why and keeps nothing; then it is saved on the server
    await page.getByLabel('Quotation number').fill('QT-TEST-1');
    failSave = true;
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.getByText(/QT-TEST-1 was not saved: Save rejected \(fixture\)/).waitFor({ timeout: 5000 }).catch(() => {});
    check(await page.getByText(/was not saved: Save rejected \(fixture\)/).isVisible() && STORE.size === 0, 'a refused save says why and nothing is kept');
    failSave = false;
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.getByRole('tab', { name: 'Saved (1)' }).waitFor({ timeout: 5000 }).catch(() => {});
    check(await page.getByRole('tab', { name: 'Saved (1)' }).isVisible() && STORE.has('QT-TEST-1'), 'saving keeps the quotation on the server and adds it to the saved list');
    check(calls.some(c => c.method === 'PUT' && c.pathname === '/api/quotations/QT-TEST-1' && c.body?.draft?.client?.name === 'Acme Mining'), 'the whole quotation is sent');
    await page.getByRole('tab', { name: 'Saved (1)' }).click();
    await shot(page, 'saved@1440');
    await page.getByRole('button', { name: 'More' }).click();
    await page.getByRole('menuitem', { name: 'New', exact: true }).click();
    const c1 = page.getByRole('alertdialog'); await c1.waitFor({ timeout: 5000 });
    await c1.getByRole('button', { name: 'Start new' }).click();
    await c1.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    await page.getByLabel('Client name').waitFor({ timeout: 5000 });
    check((await page.getByLabel('Client name').inputValue()) === '' && (await page.getByLabel('Company name').inputValue()) === 'Fixture Engineering', 'a new quotation is blank but keeps the company details');
    check(await page.getByRole('button', { name: 'Acme Mining' }).isVisible(), 'the client is offered again from the saved quotations');
    await page.getByRole('tab', { name: 'Saved (1)' }).click();
    await page.getByRole('button', { name: 'Open', exact: true }).click();
    check((await page.getByLabel('Client name').inputValue()) === 'Acme Mining', 'a saved quotation opens again');
    await page.getByRole('tab', { name: 'Saved (1)' }).click();
    await page.getByRole('button', { name: /^Delete QT-/ }).click();
    const c2 = page.getByRole('alertdialog'); await c2.waitFor({ timeout: 5000 });
    await c2.getByRole('button', { name: 'Delete' }).click();
    await c2.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    check(await page.getByText('Nothing saved yet').isVisible() && STORE.size === 0, 'deleting the last saved quotation removes it from the server and shows the empty state');
    await page.getByRole('tab', { name: 'Edit' }).click();

    // a logo that is not an image is refused
    await page.locator('input[type=file]').setInputFiles({ name: 'logo.txt', mimeType: 'text/plain', buffer: Buffer.from('not an image') });
    check(await page.getByText('Use a PNG or JPEG image.').isVisible(), 'a logo that is not a PNG or JPEG is refused with a reason');
  },
};
export default spec;
