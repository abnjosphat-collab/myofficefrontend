// Wireframe audit: renders every ledger route at desktop, tablet and phone with a fixture session and reads the
// page's real structure from the DOM, so page patterns are derived from evidence rather than memory.
//   MSYS_NO_PATHCONV=1 node scripts/wireframe-audit.mjs --label before [--only /a,/b]
// Output: docs/wireframes/<label>/<slug>-<size>.png and structure.json (one record per route; sizes recorded for desktop).
// Fixture session and mocked /api only (a route's spec data when it has one, otherwise empty lists): structure, not content.
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { chromium, fixtureContext, json } from './lib/fixtures.mjs';

const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > -1 ? process.argv[i + 1] : fallback; };
const BASE = arg('base', 'http://localhost:3000');
const LABEL = arg('label', 'before');
const ONLY = arg('only', '').split(',').filter(Boolean);
const OUT = path.resolve('docs/wireframes', LABEL);
fs.mkdirSync(OUT, { recursive: true });

const ledger = fs.readFileSync('docs/MIGRATION_LEDGER.md', 'utf8');
const rows = [...ledger.matchAll(/^\| `([^`]+)` \| ([^|]+) \|/gm)].map(m => ({ route: m[1], code: m[2].trim() }));
const routes = rows.filter(r => r.code !== 'Redirect' && !r.route.startsWith('/auth/') && (!ONLY.length || ONLY.includes(r.route)));
const SIZES = [{ name: 'desktop', width: 1440, height: 900 }, { name: 'tablet', width: 820, height: 1100 }, { name: 'phone', width: 390, height: 844 }];

const specs = new Map();
for (const file of fs.readdirSync(path.resolve('scripts/route-specs')).filter(f => f.endsWith('.mjs'))) {
  const mod = await import(pathToFileURL(path.resolve('scripts/route-specs', file)).href);
  for (const s of (Array.isArray(mod.default) ? mod.default : [mod.default])) specs.set(s.route, s);
}

const browser = await chromium.launch({ headless: true });
const structure = {};
for (const { route, code } of routes) {
  const spec = specs.get(route);
  const handler = async r => {
    const req = r.request();
    const p = new URL(req.url()).pathname;
    const entry = spec?.data?.[`${req.method()} ${p}`] ?? spec?.data?.[p];
    const v = typeof entry === 'function' ? entry(req) : entry;
    if (v && typeof v === 'object' && '__status' in v) return r.fulfill({ status: v.__status, contentType: 'application/json', body: JSON.stringify(v.body ?? {}) });
    return json(r, v === undefined ? [] : v);
  };
  const slug = route === '/' ? 'home' : route.replace(/\W+/g, '-').replace(/^-|-$/g, '');
  for (const size of SIZES) {
    const context = await fixtureContext(browser, handler, { width: size.width, height: size.height });
    const page = await context.newPage();
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle', timeout: 60_000 }).catch(() => {});
    await page.waitForSelector('main h1, h1', { timeout: 15_000 }).catch(() => {});
    await page.waitForTimeout(900);
    const dismiss = page.getByRole('button', { name: 'Dismiss all' });
    if (await dismiss.isVisible().catch(() => false)) await dismiss.click();
    await page.screenshot({ path: path.join(OUT, `${slug}-${size.name}.png`) });
    if (size.name === 'desktop') {
      structure[route] = { code, ...(await page.evaluate(() => {
        const vis = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
        const main = document.querySelector('main') ?? document.body;
        const txt = el => (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40);
        const all = sel => [...main.querySelectorAll(sel)].filter(vis);
        const h1 = all('h1')[0];
        const headerBox = h1?.getBoundingClientRect();
        return {
          title: h1 ? txt(h1) : null,
          h2: all('h2').slice(0, 8).map(txt),
          tabs: all('[role=tab]').map(txt),
          tables: all('table').length, cards: all('article, [class*=rounded-card]').length,
          inputs: all('input:not([type=hidden]):not([type=checkbox]):not([type=file])').length,
          selects: all('select, [role=combobox]').length,
          buttons: all('button').slice(0, 14).map(txt).filter(Boolean),
          links: all('a[href]').length,
          charts: all('.recharts-wrapper, canvas, svg[role=img]').length,
          forms: all('form').length,
          h1Top: headerBox ? Math.round(headerBox.top) : null,
          pageHeight: Math.round(document.documentElement.scrollHeight),
          usesUiSystem: !!document.querySelector('[data-ui-system], .font-display'),
          error: /Something went wrong|Application error/i.test(document.body.innerText),
        };
      })) };
    }
    await context.close();
  }
  console.log(`${route} (${code}): ${structure[route].title ?? 'no h1'} | tabs ${structure[route].tabs.length} tables ${structure[route].tables} cards ${structure[route].cards}`);
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'structure.json'), JSON.stringify(structure, null, 2));
