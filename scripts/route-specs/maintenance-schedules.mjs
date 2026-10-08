// /maintenance/schedules: recurring schedules (raise now per machine, a refused pause that reverts, validation).
import { maintenanceFixtures } from '../lib/maintenance-fixtures.mjs';
const fx = maintenanceFixtures();
const spec = {
  route: '/maintenance/schedules',
  h1: 'Maintenance schedules',
  data: fx.data,
  async ready(page, calls, { check, shot }) {
    const dialog = name => page.getByRole('dialog', { name });
    // schedules: raise now makes one work order per machine; a refused pause reverts with the reason
    const sched = page.getByRole('list', { name: 'Schedules' });
    await sched.waitFor({ timeout: 5000 });
    check(await sched.getByText('Active').isVisible() && await sched.getByText('Paused').isVisible() && await sched.getByText('Monthly on the 22nd').isVisible(), 'schedules say how often and whether they are active');
    await shot(page, 'schedules@1440');
    const before = calls.filter(c => c.method === 'POST' && c.pathname === '/api/maintenance/work-orders').length;
    await sched.getByRole('button', { name: 'Raise now' }).first().click();
    await page.waitForTimeout(800);
    check(calls.filter(c => c.method === 'POST' && c.pathname === '/api/maintenance/work-orders').length === before + 2, 'raising now creates one work order for each machine');
    fx.f.failPause = true;
    await sched.getByRole('button', { name: 'Pause' }).first().click();
    await page.getByText(/was not paused: Pause failed/).waitFor({ timeout: 5000 }).catch(() => {});
    check(await page.getByText(/was not paused: Pause failed \(fixture\)/).isVisible() && await sched.getByRole('button', { name: 'Pause' }).first().isVisible(), 'a refused pause says why and puts the schedule back');
    fx.f.failPause = false;
    await page.getByRole('button', { name: 'New schedule' }).click();
    const sf = dialog('New schedule');
    await sf.waitFor({ timeout: 5000 });
    await sf.getByRole('button', { name: 'Specific dates' }).click();
    await sf.getByRole('button', { name: 'Create schedule' }).click();
    check(await sf.getByText('Give the schedule a name.').isVisible() && await sf.getByText('Add at least one date.').isVisible(), 'a schedule without a name or any dates is explained');
    await sf.getByRole('button', { name: 'Cancel' }).click();

  },
  empty: { data: { '/api/schedules': [] }, text: 'No recurring schedules yet' },
  failing: { paths: ['/api/schedules'], text: 'could not be loaded' },
};
export default spec;
