// /engineering-dashboard: only real figures (job cards + breakdowns); no demo numbers.
const iso = offset => { const d = new Date(); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10); };
const JOB_CARDS = [
  { id: 1, job_no: 'JC-FIX-1', title: 'Fixture belt splice', priority: 'critical', assigned_to: 'Tee', scheduled_date: iso(-4) },
  { id: 2, job_no: 'JC-FIX-2', title: 'Fixture bearing swap', priority: 'medium', assigned_to: 'Dee', scheduled_date: iso(6) },
];
const today = new Date().toISOString().slice(0, 10);
const BREAKDOWNS = [
  { id: 1, equipment_name: 'Fixture Crusher', downtime_hours: 6, breakdown_date: today },
  { id: 2, equipment_name: 'Fixture Crusher', downtime_hours: 2, breakdown_date: today },
  { id: 3, equipment_name: 'Fixture Pump', downtime_hours: 1, breakdown_date: iso(-70) },
];

const spec = {
  route: '/engineering-dashboard',
  h1: 'Engineering dashboard',
  data: {
    '/api/breakdowns': { message: 'Breakdowns Management API', status: 'operational', endpoints: {} }, // what the real root route returns: a page that reads this instead of /get-breakdowns must fail
    '/api/job-cards': JOB_CARDS, '/api/breakdowns/get-breakdowns': { data: BREAKDOWNS, count: BREAKDOWNS.length, success: true } },
  async ready(page, _calls, { check }) {
    const tile = async label => (await page.locator('main').getByText(label, { exact: true }).first().locator('xpath=../..').innerText()).replace(/\s+/g, ' ');
    check(/2/.test(await tile('Open job cards')), 'open job cards = 2', await tile('Open job cards'));
    check(/1/.test(await tile('Overdue job cards')), 'overdue job cards = 1');
    check(/2/.test(await tile('Breakdowns this month')), 'breakdowns this month = 2');
    check(/4\s*h/.test(await tile('Mean time to repair')), 'mean time to repair = 4 h (mean of 6 and 2)', await tile('Mean time to repair'));
    const body = await page.locator('main').innerText();
    check(!/Gold Mine|June 2024|Fleet Availability|PM Compliance|Lube Compliance|Contractor Jobs|Secondary Crusher|T\. Moyo/.test(body), 'no hard-coded demo figures or names');
    check(await page.getByRole('table', { name: 'Open job cards' }).getByRole('row').count() === 3, 'open job cards table lists both cards');
    check(await page.getByText('4 days ago').isVisible(), 'overdue card says how long ago it was scheduled');
    check((await page.locator('figcaption').allInnerTexts()).length === 2, 'both charts have text alternatives');
    check(await page.getByRole('link', { name: 'View all job cards' }).getAttribute('href') === '/job-cards', 'link to the job cards register');
  },
  empty: { data: { '/api/job-cards': [], '/api/breakdowns/get-breakdowns': { data: [], count: 0, success: true } }, text: 'No open job cards' },
  failing: {
    paths: ['/api/job-cards'],
    text: 'Open job cards could not be loaded',
    notShown: ['No open job cards'],
    async recovered(page, { check }) { check(await page.getByRole('table', { name: 'Open job cards' }).isVisible(), 'Try again loads the job cards'); },
  },
  async extra(page, _calls, { check }) {
    // breakdowns still render when only the job-card service is down (checked on the ready state data above)
    check(await page.getByText('Fixture Crusher').first().isVisible(), 'repeat failures list real equipment');
  },
};

export default spec;
