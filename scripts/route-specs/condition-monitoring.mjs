// /condition-monitoring: readings register with add dialog.
const READINGS = [
  { id: 1, equipment_name: 'Gearbox G1', component: 'Bearing', monitoring_type: 'Vibration', sampled_date: '2026-09-20', value: 4.2, unit: 'mm/s', result: 'caution', technician: 'Ann', notes: 'Trending up' },
  { id: 2, equipment_name: 'Pump P2', component: 'Oil', monitoring_type: 'Oil Analysis', sampled_date: '2026-09-22', value: 0, unit: 'ppm', result: 'normal', technician: 'Ben', notes: '' },
  { id: 3, equipment_name: 'Motor M3', component: 'Winding', monitoring_type: 'Thermography', sampled_date: '2026-09-25', value: 95, unit: 'C', result: 'critical', technician: 'Cat', notes: 'Hot spot' },
];

export default {
  route: '/condition-monitoring',
  h1: 'Condition monitoring',
  data: { '/api/condition-monitoring': READINGS },
  async ready(page, _calls, { check }) {
    const table = page.getByRole('table', { name: 'Condition monitoring records' });
    check(await table.getByRole('row').count() === 4, 'header plus three readings');
    check(await table.getByText('Critical', { exact: true }).isVisible() && await table.getByText('Caution', { exact: true }).isVisible(), 'results are labelled badges');
    check(/0\s*ppm/.test(await table.innerText()), 'a reading of 0 is shown as 0, not as missing');
    await page.getByRole('button', { name: 'Vibration', exact: true }).click();
    check(await table.getByRole('row').count() === 2, 'type filter narrows to the vibration reading');
    await page.getByRole('button', { name: 'All', exact: true }).click();
  },
  create: {
    open: 'Add reading', dialog: 'Add reading', path: '/api/condition-monitoring', submit: 'Save reading',
    requiredText: 'Enter the equipment.',
    async fill(dialog) { await dialog.getByLabel(/^Equipment/).fill('Fan F9'); await dialog.getByLabel(/^Date/).fill('2026-10-01'); await dialog.getByLabel(/^Value/).fill('0'); },
    async kept(dialog) { return (await dialog.getByLabel(/^Equipment/).inputValue()) === 'Fan F9'; },
    body: b => b.equipment_name === 'Fan F9' && b.value === 0 && b.monitoring_type === 'Vibration',
  },
  empty: { data: { '/api/condition-monitoring': [] }, text: 'No readings yet' },
  failing: { paths: ['/api/condition-monitoring'], text: 'Monitoring records could not be loaded', notShown: ['No readings yet'], async recovered(page, { check }) { check(await page.getByRole('table').isVisible(), 'Try again loads the readings'); } },
};
