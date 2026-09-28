import { expect, test } from '@playwright/test';

const session = {
  id: 'issuer-1',
  name: 'Audit Issuer',
  username: 'audit-issuer',
  password: '',
  role: 'issuer',
  department: 'Engineering',
  canIssue: true,
  token: 'read-only-browser-fixture',
};

const fixtures = new Map<string, unknown>([
  ['/api/tools-workspace/auth/me', { id: session.id, name: session.name, username: session.username, role: session.role, department: session.department, can_issue: true }],
  ['/api/tools-workspace/employees', [{ id: 'employee-1', employee_number: 'E-001', name: 'Tariro Moyo', department: 'Engineering', job_title: 'Fitter', supervisor_name: 'R. Ncube', active: true }]],
  ['/api/tools-workspace/tools', [{ id: 'tool-1', register_number: 'ENG-001', name: 'Torque wrench', make_model: 'Gedore 40-200 Nm', serial_number: 'TW-001', category: 'Hand tools', equipment_kind: 'torque-wrench', storage_location: 'Main workshop', department: 'Engineering', status: 'available', condition: 'Good', archived: false, custody: null, evidence: [] }]],
  ['/api/tools-workspace/history', []],
  ['/api/tools-workspace/source-registers', []],
  ['/api/tools-workspace/notifications', { alerts: [], unread_count: 0 }],
]);

test('employee selection autofills the Tools movement form', async ({ page }) => {
  await page.addInitScript(value => {
    localStorage.setItem('myoffice.tools.session.v1', JSON.stringify(value));
  }, session);
  await page.route('**/api/**', async route => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (request.method() !== 'GET') {
      await route.abort('blockedbyclient');
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(fixtures.get(pathname) ?? []),
    });
  });

  await page.goto('/tools', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'View Torque wrench' }).click();
  await page.getByRole('button', { name: 'Issue tool' }).click();
  const employee = page.getByRole('combobox', { name: 'Employee' });
  await employee.fill('Tariro');
  await employee.press('Enter');

  await expect(employee).toHaveValue('Tariro Moyo · E-001');
  await expect(page.getByLabel('Selected employee details')).toContainText(
    'Fitter · Engineering · Supervisor: R. Ncube',
  );
});
