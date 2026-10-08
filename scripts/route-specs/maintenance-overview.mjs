// /maintenance: the overview (tiles that link, notices for overdue work, the lists) and its analytics tab.
import { maintenanceFixtures } from '../lib/maintenance-fixtures.mjs';
const fx = maintenanceFixtures();
const spec = {
  route: '/maintenance',
  h1: 'Maintenance overview',
  data: fx.data,
  async ready(page, calls, { check, shot }) {
    check(await page.getByRole('link', { name: /Open work orders/ }).isVisible(), 'the open work orders tile links to the register');
    check(await page.getByText(/work order is overdue|work orders are overdue/).first().isVisible(), 'overdue work orders are named in a notice');
    await shot(page, 'overview@1440');
    // analytics
    await page.getByRole('tab', { name: 'Analytics' }).click();
    check(await page.getByRole('heading', { name: 'By classification' }).isVisible() && await page.getByRole('heading', { name: 'Failure modes' }).isVisible(), 'analytics shows the classification, status and failure mode breakdowns');
    await page.getByRole('combobox', { name: 'Classification' }).click();
    await page.getByRole('option', { name: 'Breakdown' }).click();
    check(await page.getByText(/Showing 1 of 4 work orders/).isVisible(), 'an analytics filter narrows the numbers and says how many are shown');
    await shot(page, 'analytics@1440');
  },
  empty: { data: { '/api/maintenance/work-orders': [] }, text: 'Nothing is open' },
  failing: { paths: ['/api/maintenance/work-orders'], text: 'could not be loaded' },
};
export default spec;
