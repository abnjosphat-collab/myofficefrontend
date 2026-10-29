// B5 review stills: every route spec × {light, dark} × {motion, reduced} × {1440, 390}.
// Fixture session + mocked /api (no live data). Shots to node_modules/.cache/mo-audit/shots-b5.
//   MSYS_NO_PATHCONV=1 node scripts/b5-shots.mjs [--base http://localhost:3019] [--only /reliability,/ppe]
// Dark = the real mono/dark pair: the fixture profile is overridden with the
// appearance_themes trial flag and myoffice_appearance_v1 is seeded mono/dark.
// Tools routes always render sage/light by design (effectiveAppearance gate),
// so their "dark" stills intentionally match light.
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { chromium, fixtureContext, makeHandler } from './lib/fixtures.mjs';

const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > -1 ? process.argv[i + 1] : fallback; };
const BASE = arg('base', 'http://localhost:3019');
const ONLY = arg('only', '').split(',').filter(Boolean);
const OUT = arg('out', path.resolve('node_modules/.cache/mo-audit/shots-b5'));
fs.mkdirSync(OUT, { recursive: true });

const specDir = path.resolve('scripts/route-specs');
const specs = [];
for (const file of fs.readdirSync(specDir).filter(f => f.endsWith('.mjs')).sort()) {
  const mod = await import(pathToFileURL(path.join(specDir, file)).href);
  specs.push(...(Array.isArray(mod.default) ? mod.default : [mod.default]));
}

// Ledger routes with no route-spec file: the register-script trio (same fixture
// rows as verify-registers.mjs), the signed-out/own-chrome pages, and the four
// redirects (the shot lands on the redirect target, which is what a visit renders).
const ymd = offset => { const d = new Date(); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const EXTRA_SPECS = [
  { route: '/contractors', data: { '/api/contractors': [
    { id: 1, company_name: 'Alpha Mechanical', trade: 'Mechanical', contact_name: 'Ann Alpha', phone: '011 111', status: 'active', performance_rating: 4, contract_end: '2020-01-01', insurance_expiry: '2099-01-01', jobs: [{ job_title: 'Mill reline', equipment_name: 'SAG mill', start_date: '2026-09-01', status: 'in_progress' }] },
    { id: 2, company_name: 'Bright Electrical', trade: 'Electrical', contact_name: 'Ben Bright', phone: '011 222', status: 'inactive', performance_rating: 2, contract_end: '2099-01-01', insurance_expiry: '', jobs: [] },
    { id: 3, company_name: 'Civil Works Co', trade: 'Civil', contact_name: 'Cat Civil', phone: '011 333', status: 'active', performance_rating: 5, contract_end: '2099-01-01', insurance_expiry: '2099-01-01', jobs: [] },
  ] } },
  { route: '/competency', data: { '/api/competency': [
    { id: 10, employee_id: 'E7', employee_name: 'Eve Seven', trade: 'Millwright', equipment_type: 'SAG Mill Ops', skill_area: 'SAG Mill Ops', skill_level: 1 },
    { id: 11, employee_id: 'E7', employee_name: 'Eve Seven', trade: 'Millwright', equipment_type: 'Jaw Crusher', skill_area: 'Jaw Crusher', skill_level: 4 },
    { id: 20, employee_id: 'E8', employee_name: 'Finn Eight', trade: 'Electrician', equipment_type: 'SAG Mill Ops', skill_area: 'SAG Mill Ops', skill_level: 3 },
    { id: 21, employee_id: 'E8', employee_name: 'Finn Eight', trade: 'Electrician', equipment_type: 'Jaw Crusher', skill_area: 'Jaw Crusher', skill_level: 4 },
  ] } },
  { route: '/compliance-register', data: { '/api/compliance': [
    { id: 1, equipment_name: 'Boiler B1', inspection_type: 'Pressure test', regulatory_body: 'DMRE', certificate_no: 'C-001', expiry_date: ymd(200), status: 'current', responsible: 'Rita Ray', notes: '' },
    { id: 2, equipment_name: 'Crane C2', inspection_type: 'Load test', regulatory_body: 'SANS', certificate_no: 'C-002', expiry_date: ymd(10), status: 'due_soon', responsible: 'Sam Soo', notes: '' },
    { id: 3, equipment_name: 'Hoist H3', inspection_type: 'Rope inspection', regulatory_body: 'DMRE', certificate_no: 'C-003', expiry_date: ymd(-5), status: 'overdue', responsible: 'Tina Tee', notes: '' },
  ] } },
  { route: '/login', data: {} },
  { route: '/login-preview', data: {} },
  { route: '/auth/set-password', data: {} },
  { route: '/auth/callback', data: {} },
  { route: '/av', data: {} },
  { route: '/employees-preview', data: {} },
  { route: '/leave-management', data: {} },
  { route: '/ppe/allocate', data: {} },
];
specs.push(...EXTRA_SPECS);

const DARK_APPEARANCE = { version: 1, font: 'inter', fontSize: 100, guidance: true, theme: 'mono', darkness: 'dark' };
const browser = await chromium.launch({ headless: true });
const slug = route => (route === '/' ? 'home' : route.replace(/\W+/g, '-').replace(/^-|-$/g, ''));
let done = 0;

for (const spec of specs) {
  if (ONLY.length && !ONLY.includes(spec.route)) continue;
  for (const theme of ['light', 'dark']) {
    for (const motion of ['motion', 'reduced']) {
      for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
        const label = `${theme}-${motion}@${viewport.width}`;
        const context = await fixtureContext(browser, makeHandler(spec.data ?? {}, []), viewport, {
          colorScheme: theme === 'dark' ? 'dark' : 'light',
          reducedMotion: motion === 'reduced' ? 'reduce' : 'no-preference',
        });
        // Dark: flag the profile (trial gate) + seed the stored choice. Playwright
        // matches routes in reverse registration order, so this wins over the
        // fixture's default profile answer for user_profiles only.
        if (theme === 'dark') {
          await context.route('**/rest/v1/user_profiles*', route => {
            const wantsObject = /vnd\.pgrst\.object/.test(route.request().headers()['accept'] ?? '');
            const profile = { id: '00000000-0000-4000-8000-000000000009', email: 'shell-check@example.invalid', full_name: 'Shell Check', avatar_url: null, role: 'admin', is_active: true, permissions: { features: ['appearance_themes'] } };
            return route.fulfill({ status: 200, contentType: wantsObject ? 'application/vnd.pgrst.object+json' : 'application/json', headers: { 'content-range': '0-0/1' }, body: JSON.stringify(wantsObject ? profile : [profile]) });
          });
        }
        const storage = { ...(spec.storage ?? {}), ...(theme === 'dark' ? { myoffice_appearance_v1: DARK_APPEARANCE } : {}) };
        await context.addInitScript(entries => { for (const [k, v] of Object.entries(entries)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); }, storage);
        const page = await context.newPage();
        try {
          await page.goto(`${BASE}${spec.route}`, { waitUntil: 'networkidle', timeout: 90_000 }).catch(() => {});
          await page.waitForSelector('main h1', { timeout: 30_000 }).catch(() => {});
          await page.waitForTimeout(motion === 'reduced' ? 1200 : 2000); // settle enter motion
          const file = `${slug(spec.route)}-${label}.png`;
          await page.screenshot({ path: path.join(OUT, file) });
          done += 1;
        } catch (error) {
          console.log(`FAIL  ${spec.route} ${label}  ${String(error).split('\n')[0].slice(0, 200)}`);
        }
        await context.close();
      }
    }
  }
  console.log(`shot ${spec.route} (8)`);
}

await browser.close();
console.log(`\n${done} stills in ${OUT}`);
