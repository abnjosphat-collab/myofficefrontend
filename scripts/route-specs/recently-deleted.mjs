// /recently-deleted: manager-only trash list with search and restore.
const ROWS = [
  { id: 't1', deleted_at: '2026-10-20T10:00:00Z', table_name: 'leaves', record_id: '3',
    snapshot: { employee_name: 'Ann Moyo', leave_type: 'annual', start_date: '2026-10-20' },
    deleted_by_email: 'amina@example.com', deleted_by_name: 'Amina', restored_at: null, restored_by: null },
  { id: 't2', deleted_at: '2026-10-19T10:00:00Z', table_name: 'work_orders', record_id: '44',
    snapshot: { work_order_number: 'WO-118', job_request_details: 'Fix pump' },
    deleted_by_email: 'edson@example.com', deleted_by_name: 'Edson', restored_at: null, restored_by: null },
];

const spec = {
  route: '/recently-deleted',
  h1: 'Recently deleted',
  data: {
    '/api/recently-deleted': ROWS,
    'POST /api/recently-deleted/t1/restore': { success: true, table_name: 'leaves', record_id: '3' },
  },
  async ready(page, calls, { check, shot }) {
    check(await page.getByRole('table', { name: 'Recently deleted records' }).isVisible(), 'the trash list renders');
    check(await page.getByText('Ann Moyo').first().isVisible(), 'a deleted leave names its person');
    check(await page.getByText('WO-118').isVisible(), 'a deleted work order shows its number');
    await page.getByRole('button', { name: /Restore Ann Moyo/ }).click();
    await page.waitForTimeout(600);
    const post = calls.filter(c => c.method === 'POST' && c.pathname.endsWith('/t1/restore')).pop();
    check(!!post, 'restore posts to the server');
    await shot(page, 'ready@1440');
  },
  empty: { data: { '/api/recently-deleted': [] }, text: 'Nothing deleted' },
  failing: { paths: ['/api/recently-deleted'], text: 'Deleted records could not be loaded', notShown: ['Nothing deleted'] },
};

export default spec;
