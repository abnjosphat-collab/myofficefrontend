// /maintenance/work-orders: work orders (cards, table, tiles, priority and search), the three-step detail (request, artisan report, foreman sign-off),
// raise/edit, bulk delete, History and Comments, and an edit that loses a race. Mock shapes are shared in scripts/lib/maintenance-fixtures.mjs.
import { maintenanceFixtures } from '../lib/maintenance-fixtures.mjs';
const fx = maintenanceFixtures();
const spec = {
  route: '/maintenance/work-orders',
  h1: 'Work orders',
  data: fx.data,
  async ready(page, calls, { check, shot }) {
    const dialog = name => page.getByRole('dialog', { name });
    const cards = page.getByRole('list', { name: 'Work orders' }).getByRole('button', { name: /^Open work order/ });
    check(await cards.count() === 4, 'four work order cards (a legacy record with an unknown status and priority does not crash)', String(await cards.count()));
    check(await page.getByText('Overdue', { exact: true }).first().isVisible(), 'an overdue job says so in words');
    await shot(page, 'cards@1440');

    await page.getByRole('button', { name: /^Overdue\s*\d/ }).click();
    check(await cards.count() === 1, 'the Overdue tile filters the register');
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await page.getByRole('searchbox').fill('crusher');
    check(await cards.count() === 1, 'search finds a machine');
    await page.getByRole('searchbox').fill('');
    await page.getByRole('group', { name: 'Filter by priority' }).getByRole('button', { name: 'High' }).click();
    check(await cards.count() === 1, 'a priority button narrows the register');
    await page.getByRole('button', { name: 'Clear filters' }).click();

    // table + bulk delete: confirm first, report a refused one with the server's reason
    await page.getByRole('button', { name: 'Table view' }).click();
    const table = page.getByRole('table', { name: 'Work orders' });
    check(await table.getByRole('row').count() === 5, 'table view lists the work orders');
    await shot(page, 'table@1440');
    await table.getByRole('checkbox', { name: 'Select all rows on this page' }).check();
    await page.getByRole('button', { name: 'Delete selected' }).click();
    const c0 = page.getByRole('alertdialog');
    await c0.waitFor({ timeout: 5000 });
    await c0.getByRole('button', { name: 'Cancel' }).click();
    check(!calls.some(c => c.method === 'DELETE'), 'cancelling the confirmation deletes nothing');
    await page.getByRole('button', { name: 'Delete selected' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete 4' }).click();
    await page.getByText(/1 could not be deleted: Manager role required/).waitFor({ timeout: 5000 }).catch(() => {});
    check(await page.getByText(/1 could not be deleted: Manager role required/).isVisible() && calls.filter(c => c.method === 'DELETE').length === 4, 'a refused delete shows the server\'s reason while the others go through');
    await page.getByRole('button', { name: 'Card view' }).click();

    // detail: the request, then the artisan's report
    await page.getByRole('button', { name: /^Open work order WO-00002/ }).click();
    const d = dialog('Work order WO-00002');
    await d.waitFor({ timeout: 5000 });
    check(await d.getByRole('tab', { name: 'Artisan report' }).getAttribute('aria-selected') === 'true', 'the detail opens on the artisan report');
    await d.getByRole('tab', { name: 'Work request' }).click();
    check(await d.getByText('Inspect the seal').isVisible() && await d.getByText('Alex').first().isVisible(), 'the request step shows the job and who does it');
    await page.waitForTimeout(450); await shot(page, 'detail@1440');
    await d.getByRole('tab', { name: 'Artisan report' }).click();
    // removing the only spare must really remove it (an emptied list used to be left out of the save)
    await d.getByRole('button', { name: 'Remove Bearing 6204' }).click();
    await d.getByRole('group', { name: 'Classification' }).getByRole('button', { name: 'Not set' }).click();
    fx.f.failSave = true;
    await d.getByRole('button', { name: 'Save artisan report' }).click();
    await d.getByText('Save rejected (fixture)').waitFor({ timeout: 5000 }).catch(() => {});
    check(await d.getByText('Save rejected (fixture)').isVisible(), 'a refused save shows the reason and keeps the dialog');
    fx.f.failSave = false;
    await d.getByRole('button', { name: 'Save artisan report' }).click();
    await page.waitForTimeout(600);
    const put = calls.filter(c => c.method === 'PATCH' && c.pathname === '/api/maintenance/work-orders/2').pop();
    check(Array.isArray(put?.body.spares_used) && put.body.spares_used.length === 0, 'saving with every spare removed sends an empty list, so they really go', JSON.stringify(put?.body?.spares_used));
    check(put?.body.classification === null && put.body.failure_mode === null && put.body.total_time_worked === '', 'a cleared classification is sent as null (and drops the failure mode that only applies to breakdowns)', JSON.stringify(put?.body).slice(0, 160));

    // the history and the comments, and a save that loses the race keeps what was typed
    await d.getByRole('tab', { name: 'History' }).click();
    await d.getByText('lee@mine.example', { exact: false }).first().waitFor({ timeout: 5000 }).catch(() => {});
    check(await d.getByText(/Pending → In progress/).isVisible() && await d.getByText(/^Raised/).first().isVisible(), 'the history shows who changed what');
    await page.waitForTimeout(300); await shot(page, 'history@1440');
    await d.getByRole('tab', { name: 'Comments' }).click();
    await d.getByText('Bearing ordered, due Thursday').waitFor({ timeout: 5000 }).catch(() => {});
    check(await d.getByText('Bearing ordered, due Thursday').isVisible(), 'the comments list shows existing comments');
    await d.getByLabel('Add a comment').fill('Fitted and tested');
    await d.getByRole('button', { name: 'Add comment' }).click();
    await page.waitForTimeout(500);
    check(calls.some(c => c.method === 'POST' && c.pathname === '/api/maintenance/work-orders/2/comments' && c.body?.body === 'Fitted and tested'), 'a comment is posted');
    await page.waitForTimeout(300); await shot(page, 'comments@1440');
    await d.getByRole('tab', { name: 'Artisan report' }).click();
    fx.f.conflictNext = true;
    await d.getByRole('button', { name: 'Save artisan report' }).click();
    await d.getByText('Someone else saved this work order first').waitFor({ timeout: 5000 }).catch(() => {});
    check(await d.getByText('Someone else saved this work order first').isVisible(), 'a save that lost the race says so and keeps the form');
    await page.waitForTimeout(300); await shot(page, 'conflict@1440');
    await d.getByRole('button', { name: 'Keep mine and save' }).click();
    await page.waitForTimeout(600);
    const kept = calls.filter(c => c.method === 'PATCH' && c.pathname === '/api/maintenance/work-orders/2').pop();
    check(kept?.body.version === 5, 'keeping mine saves again against their version', String(kept?.body?.version));

    // foreman sign-off starts from the order as saved, so it cannot write back an older status
    await d.getByRole('button', { name: 'Close', exact: true }).click();
    await page.getByRole('button', { name: /^Open work order WO-00002/ }).click();
    const d2 = dialog('Work order WO-00002');
    await d2.waitFor({ timeout: 5000 });
    await d2.getByRole('tab', { name: 'Foreman sign-off' }).click();
    check(await d2.getByRole('combobox', { name: /Final status/ }).count() === 0 && await d2.getByText('In progress', { exact: true }).first().isVisible(), 'the foreman step shows the current status as text (the buttons move it, the form never does)');
    await d2.getByRole('button', { name: /Foreman signature, not signed/ }).click();
    const pad = page.getByRole('dialog', { name: 'Foreman signature' });
    await pad.waitFor({ timeout: 5000 });
    const box = await pad.locator('canvas').boundingBox();
    await page.mouse.move(box.x + 20, box.y + 20); await page.mouse.down(); await page.mouse.move(box.x + 120, box.y + 50, { steps: 8 }); await page.mouse.up();
    await pad.getByRole('button', { name: 'Confirm signature' }).click();
    await pad.waitFor({ state: 'hidden', timeout: 5000 });
    await d2.getByRole('button', { name: 'Save foreman sign-off' }).click();
    await page.waitForTimeout(500);
    const fp = calls.filter(c => c.method === 'PATCH' && c.pathname === '/api/maintenance/work-orders/2').pop();
    check(/^data:image\/png/.test(fp?.body.foreman_sign || '') && !('status' in fp.body), 'the sign-off saves the signature and never sends a status', JSON.stringify(fp?.body).slice(0, 120));
    await page.keyboard.press('Escape');

    // the status buttons come from the server's list for this person: a signed completion and a held job with a reason
    await page.getByRole('button', { name: /^Open work order WO-00002/ }).click();
    const d3 = dialog('Work order WO-00002');
    await d3.waitFor({ timeout: 5000 });
    await d3.getByRole("button", { name: "Complete job" }).waitFor({ timeout: 5000 }).catch(() => {});
    check(await d3.getByRole('button', { name: 'Complete job' }).isVisible() && await d3.getByRole('button', { name: 'Put on hold' }).isVisible(), 'the buttons for the moves the server allows are shown');
    await d3.getByRole('button', { name: 'Put on hold' }).click();
    const hold = page.getByRole('dialog', { name: 'Put on hold' });
    await hold.waitFor({ timeout: 5000 });
    await hold.getByRole('button', { name: 'Put on hold' }).click();
    check(await hold.getByText('Give a reason.').isVisible(), 'holding a job without a reason is refused in words');
    await hold.getByLabel(/^Reason/).fill('Waiting for the bearing');
    await hold.getByRole('button', { name: 'Put on hold' }).click();
    await hold.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    const held = calls.filter(c => c.method === 'POST' && c.pathname === '/api/maintenance/work-orders/2/transition').pop();
    check(held?.body.to === 'on-hold' && held.body.reason === 'Waiting for the bearing' && held.body.version === 5, 'the move is sent with the reason and the version the page last saw', JSON.stringify(held?.body));
    await page.waitForTimeout(450); await shot(page, 'actions@1440');
    await page.keyboard.press('Escape');

    // edit the request: an emptied due date is cleared, not kept
    await page.getByRole('button', { name: 'Edit work order WO-00001' }).click();
    const ed = dialog('Edit work order WO-00001');
    await ed.waitFor({ timeout: 5000 });
    await ed.getByLabel(/^Due date/).fill('');
    await ed.getByRole('button', { name: 'Save changes' }).click();
    await ed.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    const ep = calls.filter(c => c.method === 'PATCH' && c.pathname === '/api/maintenance/work-orders/1').pop();
    check(ep?.body.due_date === null, 'clearing the due date sends null so it clears');

    // raise two machines, one refused: the refused one stays with its reason
    await page.getByRole('button', { name: 'New work order' }).click();
    const nw = dialog('New work order');
    await nw.waitFor({ timeout: 5000 });
    await nw.getByRole('button', { name: 'Raise work order' }).click();
    check(await nw.getByText('Add at least one machine.').isVisible() && await nw.getByText('Enter who will do the job.').isVisible(), 'missing machine, person and job are explained');
    await nw.getByLabel(/^Or type a machine name/).fill('Pump X');
    await nw.getByRole('button', { name: 'Add', exact: true }).click();
    await nw.getByLabel(/^Or type a machine name/).fill('Pump Y');
    await nw.getByRole('button', { name: 'Add', exact: true }).click();
    // pickers: a person on leave is greyed with the reason and dates and cannot be filled; a tool is picked from the Tools register with its warning
    const who = nw.getByLabel(/^Allocated to/);
    await who.fill('lee');
    const leeRow = nw.getByRole('option', { name: /Lee Jones/ });
    await leeRow.waitFor({ timeout: 5000 });
    check(await leeRow.getAttribute('aria-disabled') === 'true' && /On annual leave, \d+ \w+ to \d+ \w+/.test(await leeRow.innerText()), 'a person on leave is greyed with the reason and dates');
    await page.waitForTimeout(250); await shot(page, 'picker-leave@1440');
    await who.press('Tab');
    check(await who.inputValue() === 'lee', 'Tab does not fill someone who is on leave');
    await who.fill('ale');
    await who.press('Tab');
    check(await who.inputValue() === 'Alex Smith' && await nw.getByText('From the employees register.').first().isVisible(), 'Tab fills the match and says it came from the register');
    await who.fill('Alex');
    const tool = nw.getByRole('combobox', { name: 'Add a tool' });
    await tool.fill('torq');
    await tool.press('Tab');
    const needed = nw.getByRole('list', { name: 'Tools needed' });
    check(await needed.getByText('Torque wrench').isVisible() && await nw.getByText(/Overdue to Alex Smith/).isVisible(), 'a tool from the Tools register is added with a warning that it is overdue');
    await tool.fill('Big hammer');
    await tool.press('Enter');
    check(await needed.getByText('Not on the Tools register').isVisible(), 'a tool that is not on the register is kept as typed and says so');
    await needed.scrollIntoViewIfNeeded();
    await page.waitForTimeout(250); await shot(page, 'picker-tools@1440');
    await nw.getByLabel(/^Job request/).fill('Grease the bearings');
    fx.f.refuseMachine = 'Pump Y';
    await nw.getByRole('button', { name: 'Raise 2 work orders' }).click();
    await nw.getByText(/1 raised, 1 not/).waitFor({ timeout: 8000 }).catch(() => {});
    check(await nw.getByText(/Pump Y: Asset is locked \(fixture\)/).isVisible() && await nw.getByRole('button', { name: 'Raise work order' }).isVisible(), 'a refused machine is named with its reason and only it stays for a retry');
    await shot(page, 'new-error@1440');
    fx.f.refuseMachine = null;
    const toolsSaved = calls.filter(c => c.method === 'PUT' && /\/work-orders\/99\/tools$/.test(c.pathname)).pop();
    check(toolsSaved?.body.tools?.length === 2 && toolsSaved.body.tools[0].tool_register_number === 'PP-UG-0001' && toolsSaved.body.tools[1].tool_register_number === null, 'the raised work order saves its tools with the register number kept for the one from the register', JSON.stringify(toolsSaved?.body));
    await nw.getByRole('button', { name: 'Cancel' }).click();
  },
  create: {
    open: 'New work order', dialog: 'New work order', path: '/api/maintenance/work-orders', submit: 'Raise work order',
    requiredText: 'Add at least one machine.',
    async fill(dialog) { await dialog.getByLabel(/^Or type a machine name/).fill('Pump Z'); await dialog.getByRole('button', { name: 'Add', exact: true }).click(); await dialog.getByLabel(/^Allocated to/).fill('Alex'); await dialog.getByLabel(/^Job request/).fill('Replace the belt'); },
    async kept(dialog) { return (await dialog.getByLabel(/^Allocated to/).inputValue()) === 'Alex' && (await dialog.getByLabel(/^Job request/).inputValue()) === 'Replace the belt'; },
    body: b => b.equipment_info === 'Pump Z' && b.allocated_to === 'Alex' && b.job_request_details === 'Replace the belt' && b.status === 'pending' && b.progress === 0 && /^WO-\d{5}$/.test(b.work_order_number) && !('due_date' in b),
  },
  empty: { data: { '/api/maintenance/work-orders': [] }, text: 'No work orders yet' },
  failing: { paths: ['/api/maintenance/work-orders'], text: 'Work orders could not be loaded', notShown: ['No work orders yet'], async recovered(page, { check }) { check(await page.getByRole('list', { name: 'Work orders' }).getByRole('button').first().isVisible(), 'Try again loads the register'); } },
};
export default spec;
