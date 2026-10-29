// N5 motion captures: 8 short fixture videos (~5 s each), light + dark, saved
// under audit/motion-search-next-2026-10-27/captures/.
//   node scripts/n5-captures.mjs [--base http://localhost:3100]
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { chromium, fixtureContext, makeHandler } from './lib/fixtures.mjs';

const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > -1 ? process.argv[i + 1] : fallback; };
const BASE = arg('base', 'http://localhost:3100');
const OUT = path.resolve('../audit/motion-search-next-2026-10-27/captures');
fs.mkdirSync(OUT, { recursive: true });

const maintenance = (await import(pathToFileURL(path.resolve('scripts/route-specs/maintenance.mjs')).href)).default;
const compressors = (await import(pathToFileURL(path.resolve('scripts/route-specs/compressors.mjs')).href)).default;

const browser = await chromium.launch({ headless: true });

async function capture(name, route, data, theme, act) {
  const file = path.join(OUT, `${name}.webm`);
  if (fs.existsSync(file)) fs.unlinkSync(file);
  const context = await fixtureContext(browser, makeHandler(data, []), { width: 1280, height: 800 }, {
    ...(theme === 'dark' ? { colorScheme: 'dark' } : {}),
    recordVideo: { dir: OUT, size: { width: 1280, height: 800 } },
  });
  if (theme === 'dark') {
    await context.route('**/rest/v1/user_profiles*', route => {
      const wantsObject = /vnd\.pgrst\.object/.test(route.request().headers()['accept'] ?? '');
      const profile = { id: '00000000-0000-4000-8000-000000000009', email: 'shell-check@example.invalid', full_name: 'Shell Check', avatar_url: null, role: 'admin', is_active: true, permissions: { features: ['appearance_themes'] } };
      return route.fulfill({ status: 200, contentType: wantsObject ? 'application/vnd.pgrst.object+json' : 'application/json', headers: { 'content-range': '0-0/1' }, body: JSON.stringify(wantsObject ? profile : [profile]) });
    });
    await context.addInitScript(() => localStorage.setItem('myoffice_appearance_v1', JSON.stringify({ version: 1, font: 'inter', fontSize: 100, guidance: true, theme: 'mono', darkness: 'dark' })));
  }
  const page = await context.newPage();
  try {
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle', timeout: 90_000 }).catch(() => {});
    await page.waitForSelector('main h1', { timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(1500);
    await act(page);
    await page.waitForTimeout(800);
  } catch (error) {
    console.log(`capture ${name}: FLOW FAILED ${String(error).split('\n')[0].slice(0, 160)}`);
  }
  const video = page.video();
  await context.close();
  if (video) await video.saveAs(file).catch(() => {});
  console.log(`capture ${name}: ${fs.existsSync(file) ? `${(fs.statSync(file).size / 1024).toFixed(0)} KB` : 'MISSING'}`);
}

const pods = page => page.getByRole('button', { name: /Open to record a reading/ });
const cards = page => page.getByRole('button', { name: /^Open work order WO-/ });

// 1-2. Pod grows into the unit drawer and shrinks back, light + dark.
for (const theme of ['light', 'dark']) {
  await capture(`drawer-zoom-${theme}`, '/compressors', compressors.data, theme, async page => {
    await pods(page).first().click();
    await page.getByRole('dialog').first().waitFor({ timeout: 30_000 });
    await page.waitForTimeout(1500);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1200);
  });
}

// 3. Card grows into the work-order detail and back.
await capture('card-zoom-light', '/maintenance', maintenance.data, 'light', async page => {
  await cards(page).first().click();
  await page.getByRole('dialog').first().waitFor({ timeout: 30_000 });
  await page.waitForTimeout(1500);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1200);
});

// 4. Ticking cards raises the bulk bar with rolling counts.
await capture('bulk-bar-light', '/maintenance', maintenance.data, 'light', async page => {
  await page.getByRole('checkbox', { name: 'Select work order WO-00001' }).check();
  await page.waitForTimeout(900);
  await page.getByRole('checkbox', { name: 'Select work order WO-00002' }).check();
  await page.waitForTimeout(1500);
});

// 5-6. The toast stack enters and re-flows, light + dark.
for (const theme of ['light', 'dark']) {
  await capture(`toast-stack-${theme}`, '/dev/motion', {}, theme, async page => {
    await page.getByRole('button', { name: 'Success toast' }).click();
    await page.waitForTimeout(700);
    await page.getByRole('button', { name: 'Info toast' }).click();
    await page.waitForTimeout(1800);
  });
}

// 7. The sidebar rail collapses and expands.
await capture('sidebar-collapse-dark', '/maintenance', maintenance.data, 'dark', async page => {
  await page.getByRole('button', { name: 'Collapse sidebar' }).click();
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: 'Expand sidebar' }).click();
  await page.waitForTimeout(1200);
});

// 8. Metric digits roll to the new value (gallery Numbers section).
await capture('number-roll-light', '/dev/motion', {}, 'light', async page => {
  await page.getByRole('button', { name: '+10' }).click();
  await page.waitForTimeout(900);
  await page.getByRole('button', { name: '+10' }).click();
  await page.waitForTimeout(1200);
});

await browser.close();
console.log(`\ncaptures in ${OUT}`);
