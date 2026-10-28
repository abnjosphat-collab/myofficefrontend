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
