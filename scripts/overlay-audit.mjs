// Overlay audit: opens each migrated route's create dialog and first-record detail dialog at desktop and phone size and
// measures what a person meets: does it fit the screen, are its actions reachable without scrolling the page, does focus
// move inside, does Escape close it, does it have a name and a close control. Screenshots go to docs/overlays/<label>/.
//   MSYS_NO_PATHCONV=1 node scripts/overlay-audit.mjs --label before [--only /a,/b]
// Fixture session and mocked /api only (each route spec's data); structure and behaviour, not content.
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { chromium, fixtureContext, json } from './lib/fixtures.mjs';

const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > -1 ? process.argv[i + 1] : fallback; };
const BASE = arg('base', 'http://localhost:3000');
const LABEL = arg('label', 'before');
const ONLY = arg('only', '').split(',').filter(Boolean);
const OUT = path.resolve('docs/overlays', LABEL);
fs.mkdirSync(OUT, { recursive: true });
const SIZES = [{ name: 'desktop', width: 1440, height: 900 }, { name: 'phone', width: 390, height: 844 }];

const specs = [];
for (const file of fs.readdirSync(path.resolve('scripts/route-specs')).filter(f => f.endsWith('.mjs')).sort()) {
  const mod = await import(pathToFileURL(path.resolve('scripts/route-specs', file)).href);
  specs.push(...(Array.isArray(mod.default) ? mod.default : [mod.default]));
}
const targets = specs.filter(s => !ONLY.length || ONLY.includes(s.route));

const browser = await chromium.launch({ headless: true });
const report = {};
const slug = route => (route === '/' ? 'home' : route.replace(/\W+/g, '-').replace(/^-|-$/g, ''));

async function inspect(page, size) {
  return page.evaluate(({ width, height }) => {
    const all = [...document.querySelectorAll('[role="dialog"], [role="alertdialog"]')];
    const dlg = all[all.length - 1]; // the topmost, when a confirmation sits over a dialog
    if (!dlg) return { found: false };
    const r = dlg.getBoundingClientRect();
    const btns = [...dlg.querySelectorAll('button')].filter(b => b.getBoundingClientRect().width > 0);
    const submit = btns.filter(b => /save|add|create|submit|send|log|issue|record|update|post|register|invite/i.test(b.textContent || '')).pop();
    const sb = submit?.getBoundingClientRect();
    const body = [...dlg.querySelectorAll('*')].find(e => { const s = getComputedStyle(e); return /(auto|scroll)/.test(s.overflowY) && e.scrollHeight > e.clientHeight + 2; });
    const overflowX = [...dlg.querySelectorAll('*')].some(e => e.scrollWidth > e.clientWidth + 2 && /(visible)/.test(getComputedStyle(e).overflowX) && e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().right > r.right + 1);
    return {
      found: true,
      name: dlg.getAttribute('aria-label') || (dlg.getAttribute('aria-labelledby') && document.getElementById(dlg.getAttribute('aria-labelledby'))?.textContent) || null,
      fits: r.left >= -1 && r.right <= width + 1 && r.top >= -1 && r.bottom <= height + 1,
      box: { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top) },
      actionReachable: sb ? sb.bottom <= height + 1 && sb.top >= 0 : null,
      bodyScrolls: !!body,
      focusInside: dlg.contains(document.activeElement),
      hasClose: btns.some(b => /close/i.test(b.getAttribute('aria-label') || b.textContent || '')),
      contentOverflowsX: overflowX,
    };
  }, size);
}


// Overlays that are not a "create" dialog or a first-record detail: manage/edit dialogs, confirmations, menus, popovers.
// Each opener leaves the overlay open; the audit inspects it, screenshots it, then checks Escape closes it.
const click = (page, role, name, opts = {}) => page.getByRole(role, { name, ...opts }).first().click();
const EXTRA = {
  '/admin': [
    { name: 'manage', open: p => click(p, 'button', 'Manage Mia Manager') },
    { name: 'confirm-reset', open: async p => { await click(p, 'button', 'Manage Mia Manager'); await p.waitForTimeout(400); await click(p, 'button', 'Reset password'); } },
  ],
  '/availabilities': [
    { name: 'edit', open: async p => { await click(p, 'tab', 'Records'); await click(p, 'button', /^Edit the record for/); } },
    { name: 'confirm-delete', open: async p => { await click(p, 'tab', 'Records'); await click(p, 'button', /^Delete the record for/); } },
  ],
  '/compressors': [
    { name: 'status', open: p => click(p, 'button', /^Change status of/) },
    { name: 'reading', open: async p => { await click(p, 'button', 'Table view'); await p.locator('table tbody tr').first().click({ position: { x: 20, y: 10 } }); } },
    { name: 'confirm-service', open: async p => { await click(p, 'tab', 'Services'); await click(p, 'button', /^Mark \d+ hour service done/); } },
  ],
  '/documents': [
    { name: 'new-folder', open: async p => { await click(p, 'button', 'Planning', { exact: true }); await click(p, 'button', 'New folder'); } },
    { name: 'upload', open: async p => { await click(p, 'button', 'Planning', { exact: true }); await click(p, 'button', 'Upload', { exact: true }); } },
    { name: 'preview', open: async p => { await click(p, 'button', 'Planning', { exact: true }); await click(p, 'button', /^Preview /); } },
  ],
  '/services': [{ name: 'import', open: p => click(p, 'button', 'Import or scan') }],
  '/spares': [{ name: 'requisition', open: p => click(p, 'button', /^Requisition/) }],
  '/overtime': [{ name: 'bulk', open: p => click(p, 'button', 'Bulk entry') }],
  '/employees': [{ name: 'normalise', open: p => click(p, 'button', /^Normalise/) }],
  '/ppe': [
    { name: 'matrix', open: p => click(p, 'button', 'Replacement matrix') },
    { name: 'employee', open: p => click(p, 'button', /^Open the PPE held by/) },
  ],
  '/breakdowns': [{ name: 'confirm-delete', open: async p => { await click(p, 'button', /^More actions for /); await p.getByRole('menuitem', { name: 'Delete' }).click(); } }],
  '/timesheets': [
    { name: 'entry', open: p => click(p, 'button', /: no entry\. Add one$/) },
    { name: 'bulk', open: p => click(p, 'button', 'Bulk entry') },
    { name: 'add-employees', open: p => click(p, 'button', 'Add employees') },
    { name: 'download', open: p => click(p, 'button', 'Download') },
    { name: 'import-scans', open: p => click(p, 'button', 'Import scans') },
  ],
  '/artisan-timesheets': [
    { name: 'signature', open: async p => { await p.getByRole('combobox', { name: 'Artisan' }).click(); await p.getByRole('option').first().click(); await p.getByRole('tab', { name: 'Day cards' }).waitFor(); await click(p, 'tab', 'Day cards'); await click(p, 'button', /^Sign in, .*not signed/); } },
    { name: 'comment', open: async p => { await p.getByRole('combobox', { name: 'Artisan' }).click(); await p.getByRole('option').first().click(); await p.getByRole('tab', { name: 'Day cards' }).waitFor(); await click(p, 'tab', 'Day cards'); await click(p, 'button', /^Comments for/); } },
  ],
  '/standby': [
    { name: 'rotation', open: async p => { await click(p, 'tab', 'Rotations'); await click(p, 'button', 'New rotation'); } },
    { name: 'duty', open: async p => { await click(p, 'tab', 'Duty officials'); await click(p, 'button', 'Name official'); } },
  ],
  '/quotations': [{ name: 'confirm-new', open: async p => { await p.getByLabel('Client name').fill('Acme'); await click(p, 'button', 'New'); } }],
  '/inventory': [{ name: 'add', open: p => click(p, 'button', 'Add item') }],
  '/sop-library': [{ name: 'new', open: p => click(p, 'button', 'New SOP') }],
  '/': [
    { name: 'customise', open: p => click(p, 'button', 'Customise') },
    { name: 'quick-view', open: async p => { await p.getByRole('button', { name: /Quick view|Details|More about/i }).first().click(); } },
  ],
  '/admin/lists': [{ name: 'confirm-delete', open: p => click(p, 'button', /^Delete/) }],
  '/tasks-events': [{ name: 'confirm-delete', open: p => click(p, 'button', /^Delete "/) }],
  '/noticeboard': [{ name: 'confirm-archive', open: p => click(p, 'button', /^Archive all expired|Unpin all/) }],
};
const MENU_OPENER = /^Download/;

async function inspectMenu(page, size) {
  return page.evaluate(({ width, height }) => {
    const m = document.querySelector('[role="menu"]');
    if (!m) return { found: false };
    const r = m.getBoundingClientRect();
    return { found: true, fits: r.left >= -1 && r.right <= width + 1 && r.top >= -1 && r.bottom <= height + 1, items: m.querySelectorAll('[role^="menuitem"]').length, box: { w: Math.round(r.width), h: Math.round(r.height) } };
  }, size);
}

async function closeAndCheck(page) {
  const before = await page.locator('[role="dialog"], [role="alertdialog"]').count();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(350);
  const after = await page.locator('[role="dialog"], [role="alertdialog"]').count();
  if (after >= before && before > 0) return false; // Escape must close the topmost overlay
  if (after > 0) await page.keyboard.press('Escape');
  return true;
}

for (const spec of targets) {
  const handler = async r => {
    const req = r.request();
    const p = new URL(req.url()).pathname;
    const entry = spec.data?.[`${req.method()} ${p}`] ?? spec.data?.[p];
    const v = typeof entry === 'function' ? entry(req) : entry;
    if (v && typeof v === 'object' && '__status' in v) return r.fulfill({ status: v.__status, contentType: 'application/json', body: JSON.stringify(v.body ?? {}) });
    return json(r, v === undefined ? [] : v);
  };
  report[spec.route] = {};
  for (const size of SIZES) {
    const context = await fixtureContext(browser, handler, { width: size.width, height: size.height });
    const page = await context.newPage();
    const result = {};
    try {
      await page.goto(`${BASE}${spec.route}`, { waitUntil: 'networkidle', timeout: 60_000 }).catch(() => {});
      await page.waitForSelector('main h1', { timeout: 20_000 }).catch(() => {});
      await page.waitForTimeout(900);
      const dismiss = page.getByRole('button', { name: 'Dismiss all' });
      if (await dismiss.isVisible().catch(() => false)) await dismiss.click();
      if (spec.create) {
        await spec.create.before?.(page);
        const opener = page.getByRole('button', { name: spec.create.open }).first();
        if (await opener.isVisible().catch(() => false)) {
          await opener.click();
          await page.waitForTimeout(450);
          result.create = await inspect(page, size);
          await page.screenshot({ path: path.join(OUT, `${slug(spec.route)}-create-${size.name}.png`) });
          result.create.escapeCloses = await closeAndCheck(page);
        } else result.create = { found: false, note: 'opener not visible' };
      }
      // First record's detail: a card's open button, else the first table row.
      const card = page.locator('[data-open-target]').first();
      const row = page.locator('table tbody tr').first();
      if (await card.isVisible().catch(() => false)) await card.click().catch(() => {});
      else if (await row.isVisible().catch(() => false)) await row.click({ position: { x: 20, y: 10 } }).catch(() => {});
      await page.waitForTimeout(500);
      const detail = await inspect(page, size);
      if (detail.found) {
        result.detail = detail;
        await page.screenshot({ path: path.join(OUT, `${slug(spec.route)}-detail-${size.name}.png`) });
        result.detail.escapeCloses = await closeAndCheck(page);
      }
      // Extra overlays for this route.
      result.extra = {};
      for (const ex of EXTRA[spec.route] ?? []) {
        try {
          await page.goto(`${BASE}${spec.route}`, { waitUntil: 'networkidle', timeout: 60_000 }).catch(() => {});
          await page.waitForSelector('main h1', { timeout: 20_000 }).catch(() => {});
          await page.waitForTimeout(700);
          const d2 = page.getByRole('button', { name: 'Dismiss all' }); if (await d2.isVisible().catch(() => false)) await d2.click();
          await ex.open(page);
          await page.waitForTimeout(500);
          const info = await inspect(page, size);
          if (info.found) { await page.screenshot({ path: path.join(OUT, `${slug(spec.route)}-${ex.name}-${size.name}.png`) }); info.escapeCloses = await closeAndCheck(page); }
          result.extra[ex.name] = info;
        } catch (e) { result.extra[ex.name] = { found: false, error: String(e).slice(0, 120) }; }
      }
      // The Download menu (every register has one) and any other menu.
      try {
        await page.goto(`${BASE}${spec.route}`, { waitUntil: 'networkidle', timeout: 60_000 }).catch(() => {});
        await page.waitForSelector('main h1', { timeout: 20_000 }).catch(() => {});
        await page.waitForTimeout(700);
        const d3 = page.getByRole('button', { name: 'Dismiss all' }); if (await d3.isVisible().catch(() => false)) await d3.click();
        const dl = page.getByRole('button', { name: MENU_OPENER }).first();
        if (await dl.isVisible().catch(() => false)) {
          await dl.click(); await page.waitForTimeout(350);
          result.menu = await inspectMenu(page, size);
          if (result.menu.found) await page.screenshot({ path: path.join(OUT, `${slug(spec.route)}-menu-${size.name}.png`) });
        }
      } catch (e) { result.menu = { found: false, error: String(e).slice(0, 120) }; }
    } catch (e) { result.error = String(e).slice(0, 160); }
    report[spec.route][size.name] = result;
    await context.close();
  }
  const d = report[spec.route].desktop; const p = report[spec.route].phone;
  const flag = o => (!o ? '-' : !o.found ? 'none' : `${o.fits ? 'fits' : 'NO-FIT'}${o.actionReachable === false ? ' ACTION-OFFSCREEN' : ''}${o.escapeCloses === false ? ' ESC-FAILS' : ''}${o.focusInside ? '' : ' NO-FOCUS'}${o.name ? '' : ' NO-NAME'}`);
  const ex = o => Object.entries(o.extra ?? {}).map(([k, v]) => `${k}:${flag(v)}`).join(' ');
  console.log(`${spec.route}: extras desktop [${ex(d)}] phone [${ex(p)}] | menu ${d.menu ? (d.menu.found ? (d.menu.fits ? 'fits' : 'NO-FIT') : 'none') : '-'}/${p.menu ? (p.menu.found ? (p.menu.fits ? 'fits' : 'NO-FIT') : 'none') : '-'}
   desktop create ${flag(d.create)} | detail ${flag(d.detail)} || phone create ${flag(p.create)} | detail ${flag(p.detail)}`);
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'overlays.json'), JSON.stringify(report, null, 2));
