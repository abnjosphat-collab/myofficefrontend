// Data-state and interaction checks for migrated register pages (fixture session + mocked /api).
//   MSYS_NO_PATHCONV=1 node scripts/verify-registers.mjs [--base http://localhost:3000] [--only contractors,competency,compliance] [--out <dir>]
// For each page: rows, empty, and failed-load states, the page's interactions, and a 390px overflow check.
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium, fixtureContext, json } from './lib/fixtures.mjs';

const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > -1 ? process.argv[i + 1] : fallback; };
const BASE = arg('base', 'http://localhost:3000');
const ONLY = arg('only', 'contractors,competency,compliance').split(',');
const OUT = arg('out', path.resolve('node_modules/.cache/mo-audit/shots-registers'));
fs.mkdirSync(OUT, { recursive: true });

let failures = 0;
const check = (ok, label, detail = '') => { if (!ok) failures += 1; console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`); };
const browser = await chromium.launch({ headless: true });

/** Run one scenario in a fresh context with its own mocked API state. */
async function scenario(name, handler, run, viewport) {
  const calls = [];
  const context = await fixtureContext(browser, route => {
    const request = route.request();
    calls.push(`${request.method()} ${new URL(request.url()).pathname}`);
    return handler(route, calls);
  }, viewport);
  const page = await context.newPage();
  const problems = [];
  page.on('pageerror', error => problems.push(`pageerror: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error' && !/Failed to load resource/.test(message.text())) problems.push(`console: ${message.text().slice(0, 160)}`); });
  try { await run(page, calls); } catch (error) { check(false, `${name} ran to completion`, String(error).split('\n').slice(0, 8).join(' | ').slice(0, 900)); }
  check(problems.length === 0, `${name}: no browser errors`, problems[0] ?? '');
  await context.close();
}

const open = async (page, route) => {
  await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle', timeout: 90_000 }).catch(() => {});
  await page.waitForSelector('main h1', { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(800); // hydration
};
const noOverflow = page => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

// ───────────────────────── contractors ─────────────────────────
const CONTRACTORS = [
  { id: 1, company_name: 'Alpha Mechanical', trade: 'Mechanical', contact_name: 'Ann Alpha', phone: '011 111', status: 'active', performance_rating: 4, contract_end: '2020-01-01', insurance_expiry: '2099-01-01', jobs: [{ job_title: 'Mill reline', equipment_name: 'SAG mill', start_date: '2026-09-01', status: 'in_progress' }] },
  { id: 2, company_name: 'Bright Electrical', trade: 'Electrical', contact_name: 'Ben Bright', phone: '011 222', status: 'inactive', performance_rating: 2, contract_end: '2099-01-01', insurance_expiry: '', jobs: [] },
  { id: 3, company_name: 'Civil Works Co', trade: 'Civil', contact_name: 'Cat Civil', phone: '011 333', status: 'active', performance_rating: 5, contract_end: '2099-01-01', insurance_expiry: '2099-01-01', jobs: [] },
];

if (ONLY.includes('contractors')) {
  console.log('\n== /contractors ==');
  let postMode = 'fail';
  await scenario('contractors rows', async (route, calls) => {
    const request = route.request();
    if (new URL(request.url()).pathname === '/api/contractors') {
      if (request.method() === 'POST') return postMode === 'fail' ? json(route, { detail: 'Contractor service rejected the request' }, 500) : json(route, { id: 9 });
      return json(route, CONTRACTORS);
    }
    return json(route, []);
  }, async (page, calls) => {
    await open(page, '/contractors');
    check(await page.getByRole('heading', { level: 1, name: 'Contractors' }).isVisible(), 'h1 Contractors');
    const names = await page.getByRole('button', { name: /^Open (?!Next.js)/ }).evaluateAll(els => els.map(e => e.getAttribute('aria-label') || e.textContent));
    check(names.length === 3, 'three contractor cards', names.join(' | '));
    check(await page.getByRole('heading', { level: 2, name: /Mechanical/ }).isVisible(), 'cards grouped under trade headings');
    check(await page.getByText('Expired', { exact: true }).first().isVisible(), 'expired contract is flagged with a label');
    await page.screenshot({ path: path.join(OUT, 'contractors-cards@1440.png') });

    await page.getByRole('button', { name: 'Open Alpha Mechanical' }).click();
    const details = page.getByRole('dialog', { name: 'Alpha Mechanical' });
    await details.waitFor({ timeout: 5000 }).catch(() => {});
    check(await details.isVisible() && await details.getByRole('progressbar').count() === 1, 'card opens details dialog with job progress');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT, 'contractors-details@1440.png') });
    await page.keyboard.press('Escape');
    await details.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});

    await page.getByRole('button', { name: 'Inactive', exact: true }).click();
    check(await page.getByRole('button', { name: /^Open (?!Next.js)/ }).count() === 1, 'status filter Inactive shows one contractor');
    await page.getByRole('button', { name: 'All', exact: true }).click();

    await page.getByRole('button', { name: 'Table view' }).click();
    check(await page.getByRole('table', { name: 'Contractor register' }).isVisible(), 'table view renders');
    await page.getByRole('button', { name: 'Company' }).click();
    check((await page.getByRole('columnheader', { name: /Company/ }).getAttribute('aria-sort')) === 'ascending', 'column sort sets aria-sort');
    await page.screenshot({ path: path.join(OUT, 'contractors-table@1440.png') });
    await page.getByRole('button', { name: 'Card view' }).click();

    // Add flow: validation, failed save keeps input, successful save closes and refetches.
    await page.getByRole('button', { name: 'Add contractor' }).first().click();
    const add = page.getByRole('dialog', { name: 'Add contractor' });
    await add.waitFor({ timeout: 5000 });
    await add.getByRole('button', { name: 'Save contractor' }).click();
    check(await add.getByText('Enter the company name.').isVisible(), 'empty company shows a field error');
    await add.getByLabel(/Company name/).fill('Delta Scaffolding');
    await add.getByRole('button', { name: 'Save contractor' }).click();
    await add.getByRole('alert').first().waitFor({ timeout: 5000 }).catch(() => {});
    check(await add.isVisible() && (await add.getByLabel(/Company name/).inputValue()) === 'Delta Scaffolding', 'failed save keeps the dialog open and the typed values');
    check(await add.getByText(/Contractor service rejected the request/).isVisible(), 'failed save shows the server message');
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT, 'contractors-add-error@1440.png') });
    postMode = 'ok';
    const getsBefore = calls.filter(c => c === 'GET /api/contractors').length;
    await add.getByRole('button', { name: 'Save contractor' }).click();
    await add.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    check(!(await add.isVisible().catch(() => false)), 'successful save closes the dialog');
    await page.waitForTimeout(500);
    check(calls.filter(c => c === 'GET /api/contractors').length > getsBefore, 'successful save reloads the register');
  });

  await scenario('contractors empty', (route) => (new URL(route.request().url()).pathname === '/api/contractors' ? json(route, []) : json(route, [])), async page => {
    await open(page, '/contractors');
    check(await page.getByText('No contractors yet').isVisible(), 'empty register says there are no contractors yet');
  });

  let failing = true;
  await scenario('contractors failed load', (route) => {
    if (new URL(route.request().url()).pathname === '/api/contractors') return failing ? json(route, { detail: 'Database is waking up' }, 500) : json(route, CONTRACTORS);
    return json(route, []);
  }, async page => {
    await open(page, '/contractors');
    check(await page.getByText('Contractors could not be loaded').isVisible(), 'failed load says so');
    check(!(await page.getByText('No contractors yet').isVisible().catch(() => false)), 'failed load is NOT shown as an empty register');
    check(await page.getByText('Database is waking up').isVisible(), 'failed load shows the server message');
    await page.screenshot({ path: path.join(OUT, 'contractors-error@1440.png') });
    failing = false;
    await page.getByRole('button', { name: 'Try again' }).click();
    await page.getByRole('button', { name: /^Open (?!Next.js)/ }).first().waitFor({ timeout: 5000 }).catch(() => {});
    check(await page.getByRole('button', { name: /^Open (?!Next.js)/ }).count() === 3, 'Try again loads the contractors');
  });

  await scenario('contractors @390', (route) => json(route, new URL(route.request().url()).pathname === '/api/contractors' ? CONTRACTORS : []), async page => {
    await open(page, '/contractors');
    check(await noOverflow(page) <= 0, 'no horizontal page scroll at 390px', `${await noOverflow(page)}px`);
    await page.screenshot({ path: path.join(OUT, 'contractors-cards@390.png') });
    await page.getByRole('button', { name: 'Table view' }).click();
    await page.waitForTimeout(300);
    check(await noOverflow(page) <= 0, 'table view: page does not scroll sideways at 390px (table scrolls inside)', `${await noOverflow(page)}px`);
    await page.screenshot({ path: path.join(OUT, 'contractors-table@390.png') });
  }, { width: 390, height: 844 });
}

// ───────────────────────── competency ─────────────────────────
const comp = (id, emp, name, trade, skill, level) => ({ id, employee_id: emp, employee_name: name, trade, equipment_type: skill, skill_area: skill, skill_level: level });
const COMPETENCY = [
  comp(10, 'E7', 'Eve Seven', 'Millwright', 'SAG Mill Ops', 1), comp(11, 'E7', 'Eve Seven', 'Millwright', 'Jaw Crusher', 4),
  comp(20, 'E8', 'Finn Eight', 'Electrician', 'SAG Mill Ops', 3), comp(21, 'E8', 'Finn Eight', 'Electrician', 'Jaw Crusher', 4),
];

if (ONLY.includes('competency')) {
  console.log('\n== /competency ==');
  let writeMode = 'fail';
  const writes = [];
  const server = COMPETENCY.map(r => ({ ...r })); // stateful mock: applies successful writes
  await scenario('competency rows', async route => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (pathname.startsWith('/api/competency')) {
      if (request.method() === 'GET') return json(route, server);
      writes.push({ method: request.method(), pathname, body: request.postDataJSON() });
      if (writeMode === 'fail') return json(route, { detail: 'Competency service rejected the write' }, 500);
      const body = request.postDataJSON();
      if (request.method() === 'PATCH') { const row = server.find(r => `/api/competency/${r.id}` === pathname); if (row) Object.assign(row, body); }
      else server.push({ id: 99 + server.length, ...body });
      return json(route, { id: 99 });
    }
    return json(route, []);
  }, async page => {
    await open(page, '/competency');
    check(await page.getByRole('heading', { level: 1, name: 'Competency' }).isVisible(), 'h1 Competency');
    check(await page.getByRole('table', { name: /Competency matrix/ }).getByRole('row').count() === 3, 'header plus two employee rows');
    const tile = async label => (await page.locator('main').getByText(label, { exact: true }).first().locator('xpath=../..').innerText()).replace(/\s+/g, ' ');
    check(/2/.test(await tile('Total assessed')), 'total assessed is 2', await tile('Total assessed'));
    check(/1/.test(await tile('Fully certified')), 'fully certified is 1');
    check(/1/.test(await tile('Need renewal')), 'need renewal is 1');
    await page.screenshot({ path: path.join(OUT, 'competency@1440.png') });

    // failed save: nothing changes on screen, user is told, popover stays open
    const sag = page.getByRole('button', { name: /Eve Seven, SAG Mill Ops: Awareness/ });
    await sag.click();
    await page.getByRole('button', { name: /^3 · Independent/ }).click();
    await page.getByText(/SAG Mill Ops was not saved/).waitFor({ timeout: 5000 }).catch(() => {});
    check(await page.getByText(/SAG Mill Ops was not saved/).isVisible(), 'failed save tells the user');
    check(await page.getByRole('button', { name: /Eve Seven, SAG Mill Ops: Awareness/ }).count() === 1, 'failed save does not change the cell');
    await page.screenshot({ path: path.join(OUT, 'competency-save-error@1440.png') });
    await page.keyboard.press('Escape');

    // update existing row -> PATCH /api/competency/10
    writeMode = 'ok'; writes.length = 0;
    await page.getByRole('button', { name: /Eve Seven, SAG Mill Ops: Awareness/ }).click();
    await page.getByRole('button', { name: /^3 · Independent/ }).click();
    await page.getByRole('button', { name: /Eve Seven, SAG Mill Ops: Independent/ }).waitFor({ timeout: 5000 }).catch(() => {});
    check(writes.some(w => w.method === 'PATCH' && w.pathname === '/api/competency/10' && w.body.skill_level === 3), 'existing skill is updated with PATCH to its own row', JSON.stringify(writes[0]));
    check(await page.getByRole('button', { name: /Eve Seven, SAG Mill Ops: Independent/ }).count() === 1, 'successful save updates the cell');

    // new skill for an employee -> POST with the REAL employee_id (E7, not a row id)
    await page.getByRole('group', { name: 'Skill level' }).waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {}); // previous popover finished closing
    writes.length = 0;
    await page.getByRole('button', { name: /Eve Seven, Ball Mill Ops: Not assessed/ }).click();
    await page.getByRole('button', { name: /^2 · Assisted/ }).click();
    await page.waitForTimeout(800);
    const post = writes.find(w => w.method === 'POST');
    check(post?.body?.employee_id === 'E7' && post?.body?.skill_area === 'Ball Mill Ops' && post?.body?.skill_level === 2, 'new skill row is created for the real employee_id', JSON.stringify(post?.body));

    await page.getByRole('combobox', { name: 'Filter by trade' }).click();
    await page.getByRole('option', { name: 'Electrician' }).click();
    check(await page.getByRole('table').getByRole('row').count() === 2, 'trade filter narrows to one employee');
  });

  await scenario('competency empty', route => json(route, []), async page => {
    await open(page, '/competency');
    check(await page.getByText('No skill assessments yet').isVisible(), 'empty matrix says there are no assessments yet');
  });

  let compFailing = true;
  await scenario('competency failed load', route => (new URL(route.request().url()).pathname === '/api/competency' ? (compFailing ? json(route, { detail: 'Service unavailable' }, 500) : json(route, COMPETENCY)) : json(route, [])), async page => {
    await open(page, '/competency');
    check(await page.getByText('The competency matrix could not be loaded').isVisible(), 'failed load says so');
    check(!(await page.getByText('No skill assessments yet').isVisible().catch(() => false)), 'failed load is NOT shown as an empty matrix');
    await page.screenshot({ path: path.join(OUT, 'competency-error@1440.png') });
    compFailing = false;
    await page.getByRole('button', { name: 'Try again' }).click();
    await page.getByRole('table').waitFor({ timeout: 5000 }).catch(() => {});
    check(await page.getByRole('table').isVisible(), 'Try again loads the matrix');
  });

  await scenario('competency @390', route => json(route, new URL(route.request().url()).pathname === '/api/competency' ? COMPETENCY : []), async page => {
    await open(page, '/competency');
    check(await noOverflow(page) <= 0, 'no horizontal page scroll at 390px (matrix scrolls inside)', `${await noOverflow(page)}px`);
    await page.screenshot({ path: path.join(OUT, 'competency@390.png') });
  }, { width: 390, height: 844 });
}

// ───────────────────────── compliance register ─────────────────────────
const ymd = offset => { const d = new Date(); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const COMPLIANCE = [
  { id: 1, equipment_name: 'Boiler B1', inspection_type: 'Pressure test', regulatory_body: 'DMRE', certificate_no: 'C-001', expiry_date: ymd(200), status: 'current', responsible: 'Rita Ray', notes: '' },
  { id: 2, equipment_name: 'Crane C2', inspection_type: 'Load test', regulatory_body: 'SANS', certificate_no: 'C-002', expiry_date: ymd(10), status: 'due_soon', responsible: 'Sam Soo', notes: '' },
  { id: 3, equipment_name: 'Hoist H3', inspection_type: 'Rope inspection', regulatory_body: 'DMRE', certificate_no: 'C-003', expiry_date: ymd(-5), status: 'overdue', responsible: 'Tina Tee', notes: '' },
];

if (ONLY.includes('compliance')) {
  console.log('\n== /compliance-register ==');
  let postMode = 'fail';
  const server = COMPLIANCE.map(r => ({ ...r }));
  await scenario('compliance rows', async route => {
    const request = route.request();
    if (new URL(request.url()).pathname === '/api/compliance') {
      if (request.method() === 'POST') {
        if (postMode === 'fail') return route.fulfill({ status: 500, contentType: 'text/plain', body: 'Compliance service rejected the request' });
        const created = { id: 50, status: 'current', notes: '', ...request.postDataJSON() };
        server.push(created);
        return json(route, created);
      }
      return json(route, server);
    }
    return json(route, []);
  }, async (page, calls) => {
    await page.addInitScript(() => localStorage.setItem('prd_hist_compliance_inspection_type', JSON.stringify([{ value: 'Pressure test', count: 3, lastUsed: 1 }])));
    await open(page, '/compliance-register');
    check(await page.getByRole('heading', { level: 1, name: 'Compliance register' }).isVisible(), 'h1 present');
    check(await page.getByRole('table', { name: 'Statutory compliance items' }).getByRole('row').count() === 4, 'header plus three rows');
    check(await page.getByText(/5 days overdue/).isVisible() && await page.getByText(/10 days left/).isVisible(), 'time left is stated in words');
    check(await page.getByRole('table').getByText('Overdue', { exact: true }).isVisible(), 'status is a labelled badge');
    await page.screenshot({ path: path.join(OUT, 'compliance@1440.png') });

    await page.getByRole('button', { name: /Overdue/ }).first().click();
    check(await page.getByRole('table').getByRole('row').count() === 2, 'selecting the Overdue tile filters to one row');
    await page.getByRole('button', { name: 'All', exact: true }).click();
    await page.getByRole('button', { name: 'Expiry' }).click();
    check((await page.getByRole('columnheader', { name: /Expiry/ }).getAttribute('aria-sort')) === 'ascending', 'sorting by Expiry sets aria-sort');
    const first = await page.getByRole('table').getByRole('row').nth(1).innerText();
    check(/Hoist H3/.test(first), 'ascending expiry puts the overdue hoist first');

    await page.getByRole('button', { name: 'Add item' }).first().click();
    const add = page.getByRole('dialog', { name: 'Add compliance item' });
    await add.waitFor({ timeout: 5000 });
    await add.getByRole('button', { name: 'Add to register' }).click();
    check(await add.getByText('Enter the equipment name.').isVisible() && await add.getByText('Choose the expiry date.').isVisible(), 'required fields show errors');
    await add.getByLabel(/Equipment name/).fill('Pump P9');
    await add.getByLabel(/Expiry date/).fill(ymd(100));

    // legacy PredictiveInput hosted in the new dialog: choosing a suggestion must not close the dialog
    const inspection = add.getByLabel('Inspection type');
    await inspection.click();
    await inspection.fill('Pre');
    const suggestion = page.getByText('Pressure test', { exact: true }).last();
    await suggestion.waitFor({ timeout: 3000 }).catch(() => {});
    await page.screenshot({ path: path.join(OUT, 'compliance-suggest@1440.png') });
    await suggestion.click().catch(() => {});
    await page.waitForTimeout(300);
    check(await add.isVisible(), 'choosing a suggestion keeps the dialog open');
    check((await inspection.inputValue()) === 'Pressure test', 'the chosen suggestion fills the field', await inspection.inputValue());

    await add.getByRole('button', { name: 'Add to register' }).click();
    await add.getByRole('alert').first().waitFor({ timeout: 5000 }).catch(() => {});
    check(await add.isVisible() && (await add.getByLabel(/Equipment name/).inputValue()) === 'Pump P9', 'failed save keeps the dialog and typed values');
    check(await add.getByText(/Compliance service rejected the request/).isVisible(), 'failed save shows the server message');
    postMode = 'ok';
    const getsBefore = calls.filter(c => c === 'GET /api/compliance').length;
    await add.getByRole('button', { name: 'Add to register' }).click();
    await add.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    check(!(await add.isVisible().catch(() => false)), 'successful save closes the dialog');
    await page.waitForTimeout(500);
    check(await page.getByText('Pump P9').first().isVisible(), 'the new item appears in the register');
    check(calls.filter(c => c === 'GET /api/compliance').length > getsBefore, 'the register is reloaded after saving');
  });

  await scenario('compliance empty', route => json(route, []), async page => {
    await open(page, '/compliance-register');
    check(await page.getByText('Nothing registered yet').isVisible(), 'empty register says nothing is registered yet');
  });

  let compFail = true;
  await scenario('compliance failed load', route => (new URL(route.request().url()).pathname === '/api/compliance' ? (compFail ? route.fulfill({ status: 503, contentType: 'text/plain', body: 'Supabase is waking up' }) : json(route, COMPLIANCE)) : json(route, [])), async page => {
    await open(page, '/compliance-register');
    check(await page.getByText('Compliance items could not be loaded').isVisible() || await page.getByText(/Still loading compliance items/).isVisible(), 'failed load says so (or reports retrying)');
    check(!(await page.getByText('Nothing registered yet').isVisible().catch(() => false)), 'failed load is NOT shown as an empty register');
    await page.screenshot({ path: path.join(OUT, 'compliance-error@1440.png') });
    compFail = false;
    const retry = page.getByRole('button', { name: 'Try again' });
    if (await retry.count()) await retry.click();
    await page.getByRole('table').waitFor({ timeout: 8000 }).catch(() => {});
    check(await page.getByRole('table').isVisible(), 'the register loads once the service recovers');
  });

  await scenario('compliance forbidden', route => (new URL(route.request().url()).pathname === '/api/compliance' ? route.fulfill({ status: 403, contentType: 'text/plain', body: 'Managers only' }) : json(route, [])), async page => {
    await open(page, '/compliance-register');
    check(await page.getByText(/do not have access to compliance items/).isVisible(), '403 is reported as no access, not as an empty list');
  });

  await scenario('compliance @390', route => json(route, new URL(route.request().url()).pathname === '/api/compliance' ? COMPLIANCE : []), async page => {
    await open(page, '/compliance-register');
    check(await noOverflow(page) <= 0, 'no horizontal page scroll at 390px', `${await noOverflow(page)}px`);
    await page.screenshot({ path: path.join(OUT, 'compliance@390.png') });
  }, { width: 390, height: 844 });
}

await browser.close();
console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
