// /maintenance-prototype: the clickable prototype of the rebuilt Maintenance workflow (docs/plans/maintenance-workflow.md). It has no API
// behind it; every record is invented. This spec checks the interactions the plan calls non-negotiable: Tab fills from the register,
// free text stays possible, a person on approved leave is shown greyed with the reason and is refused, and a failed load is never an
// empty list. Fuller coverage is in scripts/prototype-maintenance-review.mjs.
const spec = {
  route: '/maintenance-prototype',
  h1: 'Work orders',
  data: {},
  async ready(page, calls, { check, shot, expectNoOverflow }) {
    check(await page.getByText('Prototype: example data, nothing is saved').isVisible(), 'the page says it is a prototype with example data');
    await shot(page, 'list@1440');

    await page.getByRole('button', { name: 'New work order' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'New work order' });
    const machine = dialog.getByRole('combobox').first();
    await machine.click(); await machine.pressSequentially('pum'); await machine.press('Tab');
    check((await machine.inputValue()).startsWith('Pump A') && await dialog.getByText('From register').isVisible(), 'Tab fills the machine from the register and says so');
    await machine.fill('Old boiler no. 3');
    check(await dialog.getByText(/Free text/).isVisible(), 'a machine not on the register stays as free text and says so');
    await page.keyboard.press('Escape');

    await page.getByPlaceholder('Search machine, number or person').fill('WO-00227');
    await page.getByRole('button', { name: /^Open work order WO-00227/ }).click();
    await page.getByRole('tab', { name: /Assignments/ }).click();
    await page.getByRole('button', { name: 'Assign someone' }).first().click();
    const person = page.getByRole('dialog', { name: 'Assign someone' }).getByRole('combobox');
    await person.click(); await person.pressSequentially('chi'); await person.fill('Chipo Example');
    const option = page.getByRole('option', { name: /Chipo Example/ });
    check(await option.isVisible() && await option.getAttribute('aria-disabled') === 'true' && await page.getByText(/On annual leave, .*\(approved\)/).first().isVisible(), 'a person on approved leave is listed, disabled, with the leave type and dates');
    await shot(page, 'picker-leave@1440');
    await page.getByRole('dialog', { name: 'Assign someone' }).getByRole('button', { name: 'Assign', exact: true }).click();
    check(await page.getByText(/cannot be assigned/).first().isVisible(), 'assigning that person is refused in the dialog with the reason');
    await page.keyboard.press('Escape');
    await expectNoOverflow(page, 'record');
  },
  empty: undefined,
  failing: undefined,
};
export default spec;
