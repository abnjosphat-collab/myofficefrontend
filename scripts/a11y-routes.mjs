// WCAG 2.1 AA check of every signed-in route, on the same fixture session and mocked data as the route specs
// (no live data). Reports serious and critical axe violations per route and exits 1 when there are any.
//   MSYS_NO_PATHCONV=1 node scripts/a11y-routes.mjs [--base http://localhost:3000] [--only /leaves,/ppe]
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { chromium, fixtureContext, makeHandler } from './lib/fixtures.mjs';

const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > -1 ? process.argv[i + 1] : fallback; };
const BASE = arg('base', 'http://localhost:3000');
const ONLY = arg('only', '').split(',').filter(Boolean);
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

const specDir = path.resolve('scripts/route-specs');
const specs = [];
for (const file of fs.readdirSync(specDir).filter(f => f.endsWith('.mjs')).sort()) {
  const mod = await import(pathToFileURL(path.join(specDir, file)).href);
  specs.push(...(Array.isArray(mod.default) ? mod.default : [mod.default]));
}

const browser = await chromium.launch({ headless: true });
let failing = 0;
const summary = {};
for (const spec of specs) {
  if (ONLY.length && !ONLY.includes(spec.route)) continue;
  const context = await fixtureContext(browser, makeHandler(spec.data ?? {}, []));
  if (spec.storage) await context.addInitScript(entries => { for (const [k, v] of Object.entries(entries)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); }, spec.storage);
  const page = await context.newPage();
  try {
    await page.goto(`${BASE}${spec.route}`, { waitUntil: 'networkidle', timeout: 90_000 }).catch(() => {});
    await page.waitForSelector('main h1', { timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(800);
    const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    const blocking = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
    if (!blocking.length) { console.log(`PASS  ${spec.route}`); continue; }
    failing += 1;
    console.log(`FAIL  ${spec.route}`);
    for (const v of blocking) {
      summary[v.id] = (summary[v.id] ?? 0) + v.nodes.length;
      console.log(`      ${v.impact} ${v.id}: ${v.help} (${v.nodes.length})`);
      for (const n of v.nodes.slice(0, 4)) console.log(`        ${n.target.join(' ')}  ${(n.any[0]?.message ?? n.failureSummary ?? '').split('\n')[0].slice(0, 160)}`);
    }
  } finally { await context.close(); }
}
await browser.close();
console.log(`\n${failing} route(s) with serious or critical violations.`, JSON.stringify(summary));
process.exit(failing ? 1 : 0);
