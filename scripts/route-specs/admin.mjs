// /admin: user directory (roles, deactivate, reset password, invite). The fixture session is an admin.
const SELF = '00000000-0000-4000-8000-000000000009';
const USERS = [
  { id: SELF, email: 'shell-check@example.invalid', full_name: 'Shell Check', avatar_url: null, role: 'admin', is_active: true, created_at: '2026-01-01' },
  { id: 'u-super', email: 'owner@example.invalid', full_name: 'Olga Owner', avatar_url: null, role: 'super_admin', is_active: true, created_at: '2026-01-01' },
  { id: 'u-mgr', email: 'mia@example.invalid', full_name: 'Mia Manager', avatar_url: null, role: 'manager', is_active: true, created_at: '2026-01-02' },
  { id: 'u-view', email: 'vic@example.invalid', full_name: null, avatar_url: null, role: 'viewer', is_active: false, created_at: '2026-01-03' },
];
const spec = {
  route: '/admin',
  h1: 'Admin panel',
  data: {
    '/api/admin/users': USERS,
    'PATCH /api/admin/users/u-mgr': {},
    'PATCH /api/admin/users/u-view/active': {},
    'POST /api/admin/users/u-mgr/reset-password': {},
    'POST /api/admin/users/invite': { ok: true },
  },
  async ready(page, calls, { check, shot }) {
    const table = page.getByRole('table', { name: 'User accounts' });
    check(await table.getByRole('row').count() === 5, 'header plus four users');
    check(await table.getByText('(you)').isVisible(), 'the signed-in user is marked');
    check(await table.getByText('Deactivated').isVisible(), 'a deactivated account is labelled');
    check(await table.getByRole('row').filter({ hasText: 'Olga Owner' }).getByText('View only').isVisible(), 'an admin cannot manage a super admin');
    check(await table.getByRole('row').filter({ hasText: 'Shell Check' }).getByText('View only').isVisible(), 'an admin cannot manage their own account');
    check(await page.getByRole('link', { name: 'Manage shared lists' }).getAttribute('href') === '/admin/lists', 'the shared lists link is present');
    await shot(page, 'table@1440');
    await page.getByRole('button', { name: /^Manager\s*\d/ }).click();
    check(await table.getByRole('row').count() === 2, 'a role tile filters the directory');
    await page.getByRole('button', { name: 'Clear filters' }).click();

    // change a role
    await page.getByRole('button', { name: 'Manage Mia Manager' }).click();
    const dlg = page.getByRole('dialog', { name: 'Manage Mia Manager' });
    await dlg.waitFor({ timeout: 5000 });
    check(await dlg.getByRole('button', { name: 'Super Admin' }).count() === 0, 'an admin is not offered the Super Admin role');
    check(await dlg.getByRole('button', { name: 'Save role' }).isDisabled(), 'Save is disabled until the role changes');
    await dlg.getByRole('button', { name: 'Viewer', exact: true }).click();
    await shot(page, 'manage@1440');
    await dlg.getByRole('button', { name: 'Save role' }).click();
    await page.waitForTimeout(600);
    const patch = calls.filter(c => c.method === 'PATCH').pop();
    check(patch?.pathname === '/api/admin/users/u-mgr' && patch.body.role === 'viewer', 'saving sends the new role', JSON.stringify(patch?.body));
    // reset password needs confirmation
    await dlg.getByRole('button', { name: 'Reset password' }).click();
    const confirm = page.getByRole('alertdialog');
    await confirm.waitFor({ timeout: 5000 });
    await confirm.getByRole('button', { name: 'Cancel' }).click();
    check(!calls.some(c => c.pathname.endsWith('/reset-password')), 'cancelling the confirmation sends no email');
    await dlg.getByRole('button', { name: 'Reset password' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Send email' }).click();
    await page.waitForTimeout(600);
    check(calls.some(c => c.method === 'POST' && c.pathname === '/api/admin/users/u-mgr/reset-password'), 'confirming sends the reset email');
    await dlg.getByRole('button', { name: 'Close', exact: true }).click();

    // reactivate (no confirmation needed); deactivate does need one
    await page.getByRole('button', { name: /^Manage vic/ }).click();
    const dlg2 = page.getByRole('dialog', { name: /^Manage vic/ });
    await dlg2.waitFor({ timeout: 5000 });
    await dlg2.getByRole('button', { name: 'Reactivate' }).click();
    await page.waitForTimeout(600);
    const act = calls.filter(c => c.method === 'PATCH' && c.pathname.endsWith('/active')).pop();
    check(act?.pathname === '/api/admin/users/u-view/active' && act.body.active === true, 'reactivating sends active: true without a confirmation', JSON.stringify(act?.body));
  },
  create: {
    open: 'Invite user', dialog: 'Invite user', path: '/api/admin/users/invite', listPath: '/api/admin/users', submit: 'Send invite',
    requiredText: 'Enter an email address.',
    async fill(dialog) { await dialog.getByLabel(/^Email/).fill('new.person@example.invalid'); },
    async kept(dialog) { return (await dialog.getByLabel(/^Email/).inputValue()) === 'new.person@example.invalid'; },
    body: b => b.email === 'new.person@example.invalid' && b.role === 'user',
  },
  empty: { data: { '/api/admin/users': [] }, text: 'No users found' },
  failing: { paths: ['/api/admin/users'], text: 'User accounts could not be loaded', notShown: ['No users found'], async recovered(page, { check }) { check(await page.getByRole('table', { name: 'User accounts' }).isVisible(), 'Try again loads the directory'); } },
};
export default spec;
