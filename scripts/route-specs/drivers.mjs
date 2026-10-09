// /drivers: authorised drivers register (cards grouped by department, table, add/edit/delete).
const iso = offset => { const d = new Date(); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10); };
const DRIVERS = [
  { id: 1, full_name: 'Ann Alpha', phone_numbers: ['082 111 1111', '082 222 2222'], department: 'Mining', license_class: 'Code 10', license_expiry: iso(-5), status: 'active', notes: 'Night shift' },
  { id: 2, full_name: 'Ben Beta', phone_numbers: [], department: 'Mining', license_class: 'PrDP', license_expiry: iso(10), status: 'suspended', notes: '' },
  { id: 3, full_name: 'Cat Gamma', phone_numbers: ['082 333 3333'], department: null, license_class: null, license_expiry: null, status: 'inactive', notes: '' },
];

export default {
  route: '/drivers',
  h1: 'Drivers',
  data: {
    '/api/drivers': request => (request.method() === 'POST' ? { id: 99 } : DRIVERS),
    'PATCH /api/drivers/1': {},
    'DELETE /api/drivers/2': {},
  },
  async ready(page, calls, { check, shot }) {
    const names = await page.getByRole('button', { name: /^Edit (?!favourites)/ }).evaluateAll(els => els.map(e => e.getAttribute('aria-label')));
    check(names.length === 3, 'three driver cards', names.join(' | '));
    check(await page.getByRole('heading', { level: 2, name: /Mining/ }).isVisible() && await page.getByRole('heading', { level: 2, name: /Unassigned/ }).isVisible(), 'cards are grouped by department with Unassigned last');
    check(await page.getByText('Expired', { exact: true }).first().isVisible() && await page.getByText('Expiring soon').first().isVisible(), 'licence problems are labelled, not only coloured');
    check(await page.getByRole('link', { name: '082 111 1111' }).first().getAttribute('href') === 'tel:0821111111', 'phone numbers are tel: links');
    await page.getByRole('button', { name: 'Suspended', exact: true }).click();
    check(await page.getByRole('button', { name: /^Edit (?!favourites)/ }).count() === 1, 'status filter shows the suspended driver');
    await page.getByRole('button', { name: 'All', exact: true }).click();
    await page.getByRole('button', { name: 'Table view' }).click();
    check(await page.getByRole('table', { name: 'Authorised drivers' }).isVisible(), 'table view renders');
    await shot(page, 'table@1440');

    // edit -> PATCH; delete needs confirmation
    await page.getByRole('button', { name: 'Edit Ann Alpha' }).first().click();
    const edit = page.getByRole('dialog', { name: 'Edit driver' });
    await edit.waitFor({ timeout: 5000 });
    check((await edit.getByLabel(/^Full name/).inputValue()) === 'Ann Alpha' && (await edit.getByLabel('Additional phone number 1').inputValue()) === '082 222 2222', 'edit dialog loads the driver and every phone number');
    await edit.getByLabel(/^Full name/).fill('Ann Alpha-Smith');
    await edit.getByRole('button', { name: 'Save changes' }).click();
    await edit.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    const patch = calls.filter(c => c.method === 'PATCH').pop();
    check(patch?.pathname === '/api/drivers/1' && patch.body.full_name === 'Ann Alpha-Smith' && patch.body.phone_numbers.length === 2, 'saving sends a PATCH with the edits', JSON.stringify(patch?.body).slice(0, 120));
    await page.getByRole('button', { name: 'Remove Ben Beta' }).first().click();
    const confirm = page.getByRole('alertdialog');
    await confirm.waitFor({ timeout: 5000 });
    await confirm.getByRole('button', { name: 'Cancel' }).click();
    check(!calls.some(c => c.method === 'DELETE'), 'cancelling the confirmation deletes nothing');
    await page.getByRole('button', { name: 'Remove Ben Beta' }).first().click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Remove' }).click();
    await page.waitForTimeout(600);
    check(calls.some(c => c.method === 'DELETE' && c.pathname === '/api/drivers/2'), 'confirming sends the delete');
  },
  create: {
    open: 'Add driver', dialog: 'Add driver', path: '/api/drivers', submit: 'Add driver',
    requiredText: 'Enter the full name.',
    async fill(dialog) { await dialog.getByLabel(/^Full name/).fill('Dee Delta'); await dialog.getByLabel('Primary phone number').fill('082 999 9999'); },
    async kept(dialog) { return (await dialog.getByLabel(/^Full name/).inputValue()) === 'Dee Delta' && (await dialog.getByLabel('Primary phone number').inputValue()) === '082 999 9999'; },
    body: b => b.full_name === 'Dee Delta' && b.phone_numbers?.[0] === '082 999 9999' && b.status === 'active',
  },
  empty: { data: { '/api/drivers': [] }, text: 'No drivers yet' },
  failing: { paths: ['/api/drivers'], text: 'Drivers could not be loaded', notShown: ['No drivers yet', 'No drivers found'], async recovered(page, { check }) { check(await page.getByRole('button', { name: /^Edit (?!favourites)/ }).first().isVisible(), 'Try again loads the drivers'); } },
};
