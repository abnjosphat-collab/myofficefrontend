// /admin/lists: shared pick-or-type lists (rename, delete with confirmation, add).
const LOCATIONS = [{ id: 1, value: 'Shaft 1' }, { id: 2, value: 'Mill' }];
const NATURES = [{ id: 7, value: 'Electrical fault' }];

const spec = {
  route: '/admin/lists',
  h1: 'Shared lists',
  data: {
    '/api/lookup-lists/location': request => (request.method() === 'POST' ? { id: 3, value: 'Yard' } : LOCATIONS),
    '/api/lookup-lists/breakdown_nature': NATURES,
    'PATCH /api/lookup-lists/location/1': {},
    'DELETE /api/lookup-lists/location/2': {},
  },
  async ready(page, calls, { check, shot }) {
    check(await page.getByText('Shaft 1').isVisible() && await page.getByText('Mill', { exact: true }).isVisible(), 'the first list shows its values');
    await page.getByRole('tab', { name: 'Nature of breakdown' }).click();
    await page.getByText('Electrical fault').waitFor({ timeout: 5000 }).catch(() => {});
    check(await page.getByText('Electrical fault').isVisible() && !(await page.getByText('Shaft 1').isVisible().catch(() => false)), 'switching tabs shows the other list only');
    await page.getByRole('tab', { name: 'Locations' }).click();
    await page.getByText('Shaft 1').waitFor({ timeout: 5000 });

    await page.getByLabel('New locations value').fill('Yard');
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await page.waitForTimeout(600);
    const post = calls.filter(c => c.method === 'POST' && c.pathname.startsWith('/api/lookup-lists')).pop();
    check(post?.pathname === '/api/lookup-lists/location' && post.body.value === 'Yard', 'adding posts the new value', JSON.stringify(post?.body));

    await page.getByRole('button', { name: 'Rename Shaft 1' }).click();
    const rename = page.getByLabel('Rename Shaft 1');
    await rename.fill('Shaft 1 North');
    await rename.press('Enter');
    await page.waitForTimeout(500);
    const patch = calls.filter(c => c.method === 'PATCH' && c.pathname.startsWith('/api/lookup-lists')).pop();
    check(patch?.pathname === '/api/lookup-lists/location/1' && patch.body.value === 'Shaft 1 North', 'Enter saves a rename with PATCH');
    check(await page.getByText('Shaft 1 North').isVisible(), 'the renamed value shows');

    await page.getByRole('button', { name: 'Delete Mill' }).click();
    const confirm = page.getByRole('alertdialog');
    await confirm.waitFor({ timeout: 5000 });
    await confirm.getByRole('button', { name: 'Cancel' }).click();
    check(!calls.some(c => c.method === 'DELETE'), 'cancelling the confirmation deletes nothing');
    await page.getByRole('button', { name: 'Delete Mill' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
    await page.waitForTimeout(600);
    check(calls.some(c => c.method === 'DELETE' && c.pathname === '/api/lookup-lists/location/2'), 'confirming sends the delete');
    await shot(page, 'after@1440');
  },
  empty: { data: { '/api/lookup-lists/location': [], '/api/lookup-lists/breakdown_nature': [] }, text: 'No entries yet' },
  failing: { paths: ['/api/lookup-lists/location'], text: 'Locations could not be loaded', notShown: ['No entries yet'], async recovered(page, { check }) { check(await page.getByText('Shaft 1').isVisible(), 'Try again loads the list'); } },
};

export default spec;
