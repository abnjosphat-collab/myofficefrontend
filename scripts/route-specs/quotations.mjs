// /quotations: a browser-only generator. Nothing is pre-filled; the draft survives a reload; an incomplete quotation cannot be exported
// and says why; PDF and Word files download; saved quotations can be opened and deleted; a bad logo is refused.
const spec = {
  route: '/quotations',
  h1: 'Quotation generator',
  data: {},
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
    const [word] = await Promise.all([page.waitForEvent('download', { timeout: 20000 }).catch(() => null), page.getByRole('button', { name: 'Word', exact: true }).click()]);
    check(!!word && /^quotation-QT-.*\.docx$/.test(word.suggestedFilename()), 'the Word file downloads', word?.suggestedFilename());
    await word?.saveAs('node_modules/.cache/mo-audit/quotation-export.docx').catch(() => {});

    // saving
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    check(await page.getByRole('tab', { name: 'Saved (1)' }).isVisible(), 'saving adds the quotation to the saved list');
    await page.getByRole('tab', { name: 'Saved (1)' }).click();
    await shot(page, 'saved@1440');
    await page.getByRole('button', { name: 'New', exact: true }).click();
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
    check(await page.getByText('Nothing saved yet').isVisible(), 'deleting the last saved quotation shows the empty state');
    await page.getByRole('tab', { name: 'Edit' }).click();

    // a logo that is not an image is refused
    await page.locator('input[type=file]').setInputFiles({ name: 'logo.txt', mimeType: 'text/plain', buffer: Buffer.from('not an image') });
    check(await page.getByText('Use a PNG or JPEG image.').isVisible(), 'a logo that is not a PNG or JPEG is refused with a reason');
  },
};
export default spec;
