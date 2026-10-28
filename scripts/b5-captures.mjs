// B5 motion captures: short fixture videos of the zoom, bulk bar, export
// IconSwap and number roll. Saved under audit/motion-and-fixes-2026-10-27/captures/.
//   MSYS_NO_PATHCONV=1 node scripts/b5-captures.mjs [--base http://localhost:3019]
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { chromium, fixtureContext, makeHandler } from './lib/fixtures.mjs';

const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > -1 ? process.argv[i + 1] : fallback; };
const BASE = arg('base', 'http://localhost:3019');
const OUT = arg('out', path.resolve('../audit/motion-and-fixes-2026-10-27/captures'));
fs.mkdirSync(OUT, { recursive: true });

const maintenance = (await import(pathToFileURL(path.resolve('scripts/route-specs/maintenance.mjs')).href)).default;
const browser = await chromium.launch({ headless: true });

async function capture(name, route, data, storage, act) {
  const file = path.join(OUT, `${name}.webm`);
  if (fs.existsSync(file)) fs.unlinkSync(file);
  const context = await fixtureContext(browser, makeHandler(data, []), { width: 1280, height: 800 }, { recordVideo: { dir: OUT, size: { width: 1280, height: 800 } } });
  if (storage) await context.addInitScript(entries => { for (const [k, v] of Object.entries(entries)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); }, storage);
  const page = await context.newPage();
  await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle', timeout: 90_000 }).catch(() => {});
  await page.waitForSelector('main h1', { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await act(page);
  await page.waitForTimeout(800);
  const video = page.video();
  await context.close();
  if (video) await video.saveAs(file);
  console.log(`capture ${name}: ${fs.existsSync(file) ? `${(fs.statSync(file).size / 1024).toFixed(0)} KB` : 'MISSING'}`);
}

// Card grows into its detail and shrinks back on close.
await capture('zoom', '/maintenance', maintenance.data, maintenance.storage, async page => {
  const cards = page.getByRole('list', { name: 'Work orders' }).getByRole('button', { name: /^Open work order/ });
  await cards.first().click();
  await page.getByRole('dialog').waitFor({ timeout: 5000 });
  await page.waitForTimeout(1500);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1200);
});

// Ticking cards raises the bulk bar with rolling counts.
await capture('bulk-bar', '/maintenance', maintenance.data, maintenance.storage, async page => {
  await page.getByRole('checkbox', { name: 'Select work order WO-00001' }).check();
  await page.waitForTimeout(900);
  await page.getByRole('checkbox', { name: 'Select work order WO-00002' }).check();
  await page.waitForTimeout(1500);
});

// Export trigger: download -> spinner -> check.
await capture('export-swap', '/maintenance', maintenance.data, maintenance.storage, async page => {
  await page.getByRole('button', { name: /^Export/ }).first().click();
  await page.getByRole('menuitem', { name: /Excel/ }).click().catch(() => {});
  await page.waitForTimeout(2500);
});

// Metric digits roll to the new value (gallery Numbers section).
await capture('number-roll', '/dev/motion', {}, undefined, async page => {
  const panel = page.getByRole('region', { name: 'Numbers' }).or(page.locator('text=Digits roll to the new value').locator('..'));
  await panel.scrollIntoViewIfNeeded().catch(() => {});
  await page.getByRole('button', { name: '+10' }).click();
  await page.waitForTimeout(900);
  await page.getByRole('button', { name: '+10' }).click();
  await page.waitForTimeout(1200);
});

await browser.close();
console.log(`\ncaptures in ${OUT}`);
