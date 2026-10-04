// Tools shell parity gate: renders /tools and a MyOffice page side by side and compares what makes the shell feel
// the same: sidebar geometry, navigation item type and spacing, spotlight pill, header controls, the Settings glyph,
// the collapsed-rail tooltip, and the strip below 821 px. Module labels and destinations are expected to differ;
// everything measured here is chrome that must not.
//
//   MSYS_NO_PATHCONV=1 node scripts/verify-shell-parity.mjs [--base http://localhost:3000] [--page /contractors] [--out <dir>]
//
// Needs a running dev server. Uses fictional fixtures and mocked APIs only. Screenshots are written for a human to
// inspect; passing measurements are necessary, not sufficient (see docs/TESTING.md).
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium, fixtureContext, json } from './lib/fixtures.mjs';
import { installToolsFixtures } from './lib/tools-fixtures.mjs';

const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > -1 ? process.argv[i + 1] : fallback; };
const BASE = arg('base', 'http://localhost:3000');
const PAGE_ROUTE = arg('page', '/contractors');
const OUT = arg('out', path.resolve('node_modules/.cache/mo-audit/shots-parity'));
fs.mkdirSync(OUT, { recursive: true });

let failures = 0;
const check = (ok, label, detail = '') => { if (!ok) failures += 1; console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`); };
const close = (a, b, tolerance = 1) => Math.abs(parseFloat(a) - parseFloat(b)) <= tolerance;
const compare = (label, tools, mine, tolerance = 1) => check(close(tools, mine, tolerance), label, `Tools ${tools}, MyOffice ${mine}`);
const same = (label, tools, mine) => check(String(tools) === String(mine), label, `Tools ${tools}, MyOffice ${mine}`);

const browser = await chromium.launch();

/** Computed facts about the first element matching `selector`, or null. */
const facts = (page, selector, pseudo) => page.evaluate(([sel, ps]) => {
  const el = document.querySelector(sel);
  if (!el) return null;
  const s = getComputedStyle(el, ps || null);
  const svg = el.querySelector('svg');
  const box = el.getBoundingClientRect();
  return {
    width: box.width, height: box.height, minHeight: s.minHeight, paddingTop: s.paddingTop, paddingLeft: s.paddingLeft, paddingBottom: s.paddingBottom,
    radius: s.borderTopLeftRadius, fontSize: s.fontSize, fontWeight: s.fontWeight, letterSpacing: s.letterSpacing, gap: s.columnGap, color: s.color,
    background: s.backgroundColor, borderColor: s.borderTopColor, borderWidth: s.borderTopWidth, position: s.position,
    svgSize: svg ? svg.getBoundingClientRect().width : null, svgPath: svg ? [...svg.querySelectorAll('path')].map(p => p.getAttribute('d')).join('|') : null,
  };
}, [selector, pseudo]);

async function openTools(width, height) {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  await installToolsFixtures(page, { blocked: [] });
  await page.goto(`${BASE}/tools`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.getByRole('heading', { name: 'Overview' }).first().waitFor({ timeout: 90_000 }).catch(() => {});
  await page.waitForTimeout(1200);
  return { context, page };
}
async function openMine(width, height) {
  const context = await fixtureContext(browser, route => json(route, []), { width, height });
  const page = await context.newPage();
  await page.goto(`${BASE}${PAGE_ROUTE}`, { waitUntil: 'networkidle', timeout: 90_000 }).catch(() => {});
  await page.waitForSelector('main h1', { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(1000);
  return { context, page };
}

// ── Desktop, expanded ────────────────────────────────────────────────────────────────────────────
console.log('\n== 1440 px, expanded ==');
{
  const t = await openTools(1440, 900);
  const m = await openMine(1440, 900);
  await t.page.screenshot({ path: path.join(OUT, 'tools@1440.png') });
  await m.page.screenshot({ path: path.join(OUT, 'myoffice@1440.png') });

  const T = {
    aside: await facts(t.page, 'aside'), brand: await facts(t.page, 'aside button[aria-current=page]'), brandLabel: await facts(t.page, 'aside button[aria-current=page] strong'), nav: await facts(t.page, 'aside nav'),
    item: await facts(t.page, 'aside nav button'), collapse: await facts(t.page, 'aside button[aria-label$="sidebar"]'),
    settings: await facts(t.page, 'button[aria-label="Open settings"]'),
  };
  const M = {
    aside: await facts(m.page, 'aside'), brand: await facts(m.page, 'aside [aria-current=page]'), brandLabel: await facts(m.page, 'aside [aria-current=page] strong'), nav: await facts(m.page, 'aside nav'),
    item: await facts(m.page, 'aside nav a:not([aria-current])'), collapse: await facts(m.page, 'aside button[aria-label$="sidebar"]'),
    settings: await facts(m.page, 'header button[aria-label="Settings"]'),
  };
  check(Object.values(T).every(Boolean) && Object.values(M).every(Boolean), 'all compared elements exist on both pages', `missing Tools: ${Object.entries(T).filter(([, v]) => !v).map(([k]) => k)}; MyOffice: ${Object.entries(M).filter(([, v]) => !v).map(([k]) => k)}`);

  if (Object.values(T).every(Boolean) && Object.values(M).every(Boolean)) {
    compare('sidebar width', T.aside.width, M.aside.width);
    compare('sidebar vertical padding', T.aside.paddingTop, M.aside.paddingTop);
    compare('sidebar horizontal padding', T.aside.paddingLeft, M.aside.paddingLeft);
    same('sidebar is sticky', T.aside.position, M.aside.position);
    same('sidebar background', T.aside.background, M.aside.background);
    same('sidebar border colour', T.aside.borderColor, M.aside.borderColor);
    compare('spotlight height', T.brand.height, M.brand.height, 4);
    same('spotlight background', T.brand.background, M.brand.background);
    compare('spotlight radius', T.brand.radius, M.brand.radius);
    compare('spotlight label size', T.brandLabel.fontSize, M.brandLabel.fontSize);
    same('spotlight label weight', T.brandLabel.fontWeight, M.brandLabel.fontWeight);
    same('spotlight label letter spacing', T.brandLabel.letterSpacing, M.brandLabel.letterSpacing);
    compare('navigation panel radius', T.nav.radius, M.nav.radius);
    same('navigation panel border colour', T.nav.borderColor, M.nav.borderColor);
    compare('collapse button size', T.collapse.width, M.collapse.width);
    compare('nav item height', T.item.height, M.item.height);
    compare('nav item radius', T.item.radius, M.item.radius);
    compare('nav item label size', T.item.fontSize, M.item.fontSize);
    same('nav item label weight', T.item.fontWeight, M.item.fontWeight);
    compare('nav item gap', T.item.gap, M.item.gap);
    compare('nav item icon size', T.item.svgSize, M.item.svgSize);
    same('nav item label colour', T.item.color, M.item.color);
    compare('header control size', T.settings.width, M.settings.width);
    compare('header control radius', T.settings.radius, M.settings.radius);
    same('header control border colour', T.settings.borderColor, M.settings.borderColor);
    same('header control background', T.settings.background, M.settings.background);
    check(T.settings.svgPath && T.settings.svgPath === M.settings.svgPath, 'Settings uses the same spanner glyph as Tools', T.settings.svgPath === M.settings.svgPath ? 'identical path data' : 'path data differs');
  }

  // hover state of a nav item
  const toolsItem = t.page.locator('aside nav button').first();
  const myItem = m.page.locator('aside nav a:not([aria-current])').first();
  await toolsItem.hover(); await myItem.hover(); await t.page.waitForTimeout(300);
  const hover = async (page, sel) => page.evaluate(s => { const c = getComputedStyle(document.querySelector(s)); return { bg: c.backgroundColor, color: c.color }; }, sel);
  const th = await hover(t.page, 'aside nav button'); const mh = await hover(m.page, 'aside nav a:not([aria-current])');
  same('nav item hover text colour', th.color, mh.color);
  check(th.bg !== 'rgba(0, 0, 0, 0)' && mh.bg !== 'rgba(0, 0, 0, 0)', 'nav item hover shows a soft fill on both', `Tools ${th.bg}, MyOffice ${mh.bg}`);

  await t.context.close(); await m.context.close();
}

// ── Collapsed rail and its tooltip ──────────────────────────────────────────────────────────────
console.log('\n== 1440 px, collapsed rail ==');
{
  const t = await openTools(1440, 900);
  const m = await openMine(1440, 900);
  await t.page.getByRole('button', { name: 'Collapse sidebar' }).click();
  await m.page.getByRole('button', { name: 'Collapse sidebar' }).click();
  await t.page.waitForTimeout(600); await m.page.waitForTimeout(600);
  const tw = (await facts(t.page, 'aside')).width, mw = (await facts(m.page, 'aside')).width;
  compare('rail width', tw, mw);
  await t.page.locator('aside nav button').first().hover();
  await m.page.locator('aside nav a').first().hover();
  await t.page.waitForTimeout(500); await m.page.waitForTimeout(700);
  await t.page.screenshot({ path: path.join(OUT, 'tools-rail@1440.png') });
  await m.page.screenshot({ path: path.join(OUT, 'myoffice-rail@1440.png') });
  const tip = await t.page.evaluate(() => { const el = document.querySelector('aside nav button'); const s = getComputedStyle(el, '::after'); return { fs: s.fontSize, fw: s.fontWeight, radius: s.borderTopLeftRadius, bg: s.backgroundColor, border: s.borderTopColor, color: s.color }; });
  const mine = await facts(m.page, '[role="tooltip"], [data-radix-popper-content-wrapper] > div');
  check(!!mine, 'a tooltip appears on hover/focus of a rail item');
  if (mine) {
    compare('tooltip radius', tip.radius, mine.radius);
    same('tooltip background', tip.bg, mine.background);
    same('tooltip border colour', tip.border, mine.borderColor);
    same('tooltip text colour', tip.color, mine.color);
    check(Math.abs(parseFloat(tip.fs) - parseFloat(mine.fontSize)) <= 2, 'tooltip text size within 2 px', `Tools ${tip.fs}, MyOffice ${mine.fontSize}`);
  }
  // keyboard: Tab reaches rail items and a focused item shows its tooltip
  await m.page.mouse.move(0, 0); await m.page.keyboard.press('Tab'); await m.page.keyboard.press('Tab');
  const focusedLabel = await m.page.evaluate(() => document.activeElement?.getAttribute('aria-label') || document.activeElement?.textContent?.trim());
  check(!!focusedLabel, 'rail items are reachable with the keyboard and named', String(focusedLabel));
  await t.context.close(); await m.context.close();
}

// ── Narrow widths: strip and drawer ─────────────────────────────────────────────────────────────
for (const [width, height] of [[820, 1100], [390, 844], [320, 700]]) {
  console.log(`\n== ${width} px ==`);
  const t = await openTools(width, height);
  const m = await openMine(width, height);
  await t.page.screenshot({ path: path.join(OUT, `tools@${width}.png`) });
  await m.page.screenshot({ path: path.join(OUT, `myoffice@${width}.png`) });
  const strip = await facts(m.page, '[data-nav-strip]');
  const toolsAside = await facts(t.page, 'aside');
  check(!!strip && strip.position === 'sticky', 'navigation strip is present and sticky', strip ? `height ${strip.height}` : 'missing');
  check(!!strip && Math.abs(strip.width - width) <= 1, 'the strip spans the full width (content stacks beneath it, not beside it)', strip ? `strip ${strip.width}px of ${width}px` : 'missing');
  if (strip && toolsAside) check(Math.abs(strip.height - toolsAside.height) <= 1, 'strip height matches the Tools strip', `Tools ${toolsAside.height}, MyOffice ${strip.height}`);
  const overflow = await m.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(overflow <= 0, 'no horizontal page scroll', `${overflow}px`);
  const scrollTop = await m.page.evaluate(() => { window.scrollTo(0, 300); return window.scrollY; });
  await m.page.waitForTimeout(300);
  const stripTop = await m.page.evaluate(() => document.querySelector('[data-nav-strip]').getBoundingClientRect().top);
  const headerTop = await m.page.evaluate(() => document.querySelector('header').getBoundingClientRect().top);
  check(scrollTop > 0 ? Math.abs(stripTop) <= 1 : true, 'the strip stays at the top while scrolling', `top ${stripTop}`);
  check(scrollTop > 0 ? headerTop >= 52 && headerTop <= 62 : true, 'the top bar sticks beneath the strip', `top ${headerTop}`);
  await m.page.evaluate(() => window.scrollTo(0, 0));
  // drawer: opens, traps focus, closes with Escape and returns focus
  await m.page.getByRole('button', { name: 'Open navigation' }).click();
  const drawer = m.page.getByRole('dialog', { name: 'Main navigation' });
  await drawer.waitFor({ timeout: 5000 }).catch(() => {});
  await m.page.waitForTimeout(600);
  check(await drawer.isVisible(), 'the navigation drawer opens from the strip');
  await m.page.screenshot({ path: path.join(OUT, `myoffice-drawer@${width}.png`) });
  const inside = await m.page.evaluate(() => !!document.activeElement?.closest('[role=dialog]'));
  check(inside, 'focus moves into the drawer');
  await m.page.keyboard.press('Escape');
  await drawer.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
  check(!(await drawer.isVisible().catch(() => false)), 'Escape closes the drawer');
  const back = await m.page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
  check(back === 'Open navigation', 'focus returns to the menu button', String(back));
  await t.context.close(); await m.context.close();
}

// ── Safe areas, landscape phone and tablet orientations ─────────────────────────────────────────
// Headless Chromium has no notch, so the device insets are simulated by setting the same CSS variables
// (--mo-safe-*) that env(safe-area-inset-*) fills on a real device. This proves the shell consumes them; it does
// not prove a specific device renders them (see docs/TESTING.md, device limits).
console.log('\n== safe areas and orientations ==');
{
  const overflowOf = page => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  const withInsets = (page, insets) => page.evaluate(v => { for (const [k, x] of Object.entries(v)) document.documentElement.style.setProperty(`--mo-safe-${k}`, x); }, insets);

  let m = await openMine(390, 844);
  const before = await facts(m.page, '[data-nav-strip]');
  await withInsets(m.page, { top: '47px', bottom: '34px', left: '0px', right: '0px' });
  await m.page.waitForTimeout(300);
  const after = await facts(m.page, '[data-nav-strip]');
  check(after.height - before.height >= 46, 'portrait: the strip grows by the top safe area', `${before.height} -> ${after.height}`);
  const headerTop = await m.page.evaluate(() => document.querySelector('header').getBoundingClientRect().top);
  check(Math.abs(headerTop - after.height) <= 1, 'portrait: the top bar sits directly beneath the taller strip', `top ${headerTop}`);
  const bottomPad = await m.page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('main > div')).paddingBottom));
  check(bottomPad >= 34, 'portrait: page content clears the home indicator', `${bottomPad}px`);
  await m.page.screenshot({ path: path.join(OUT, 'myoffice-notch-portrait@390.png') });
  await m.context.close();

  m = await openMine(844, 390);
  await withInsets(m.page, { top: '0px', bottom: '21px', left: '47px', right: '47px' });
  await m.page.waitForTimeout(300);
  const padLeft = await m.page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('header > div')).paddingLeft));
  const mainLeft = await m.page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('main > div')).paddingLeft));
  check(padLeft >= 47 && mainLeft >= 47, 'landscape phone: top bar and content clear the side notch', `bar ${padLeft}px, content ${mainLeft}px`);
  check(await overflowOf(m.page) <= 0, 'landscape phone: no horizontal page scroll', `${await overflowOf(m.page)}px`);
  const sidebarPad = await m.page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('aside')).paddingLeft));
  check(sidebarPad >= 47 + 12, 'landscape phone (wider than 820 px, so the sidebar layout): the sidebar clears the side notch', `${sidebarPad}px`);
  check(await m.page.getByRole('navigation', { name: 'Main navigation' }).isVisible(), 'landscape phone: navigation is reachable');
  await m.page.screenshot({ path: path.join(OUT, 'myoffice-landscape@844x390.png') });
  await m.context.close();

  for (const [w, h, label, expectSidebar] of [[820, 1100, 'tablet portrait', false], [1180, 820, 'tablet landscape', true]]) {
    m = await openMine(w, h);
    const hasAside = await m.page.evaluate(() => !!document.querySelector('aside'));
    check(hasAside === expectSidebar, `${label}: ${expectSidebar ? 'the persistent sidebar is shown' : 'the strip and drawer are used'}`);
    check(await overflowOf(m.page) <= 0, `${label}: no horizontal page scroll`, `${await overflowOf(m.page)}px`);
    await m.page.screenshot({ path: path.join(OUT, `myoffice-${label.replace(' ', '-')}@${w}x${h}.png`) });
    await m.context.close();
  }
}

// ── Touch: tap behaviour and target size under a coarse pointer ─────────────────────────────────
console.log('\n== touch (emulated phone, coarse pointer) ==');
{
  const context = await fixtureContext(browser, route => json(route, []), { width: 390, height: 844 }, { hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await page.goto(`${BASE}${PAGE_ROUTE}`, { waitUntil: 'networkidle', timeout: 90_000 }).catch(() => {});
  await page.waitForSelector('main h1', { timeout: 30_000 });
  await page.waitForTimeout(800);
  check(await page.evaluate(() => matchMedia('(pointer: coarse)').matches), 'the emulated device reports a coarse pointer');
  const sizes = await page.evaluate(() => [...document.querySelectorAll('[data-nav-strip] a, [data-nav-strip] button, header button')].map(el => { const r = el.getBoundingClientRect(); return { name: el.getAttribute('aria-label') || el.textContent?.trim(), w: Math.round(r.width), h: Math.round(r.height) }; }));
  const small = sizes.filter(s => s.w < 44 || s.h < 44);
  check(small.length === 0, 'strip and top-bar controls are at least 44 x 44 px for touch', small.map(s => `${s.name} ${s.w}x${s.h}`).join('; '));
  await page.getByRole('button', { name: 'Open navigation' }).tap();
  const drawer = page.getByRole('dialog', { name: 'Main navigation' });
  await drawer.waitFor({ timeout: 5000 }).catch(() => {});
  check(await drawer.isVisible(), 'tapping the menu button opens the drawer');
  const rowHeights = await page.evaluate(() => [...document.querySelectorAll('[role=dialog] nav a')].slice(0, 6).map(a => Math.round(a.getBoundingClientRect().height)));
  check(rowHeights.length > 0 && rowHeights.every(h => h >= 44), 'drawer destinations are at least 44 px tall', rowHeights.join(', '));
  await page.getByRole('link', { name: 'Home' }).first().tap();
  await page.waitForURL(`${BASE}/`, { timeout: 20_000 }).catch(() => {});
  check(new URL(page.url()).pathname === '/', 'tapping a destination navigates to it');
  await page.waitForTimeout(600);
  check(!(await page.getByRole('dialog', { name: 'Main navigation' }).isVisible().catch(() => false)), 'the drawer closes after navigating');
  await page.getByRole('button', { name: 'Open navigation' }).tap();
  await page.getByRole('dialog', { name: 'Main navigation' }).waitFor({ timeout: 5000 }).catch(() => {});
  await page.mouse.click(380, 400); // the overlay to the right of the drawer
  await page.getByRole('dialog', { name: 'Main navigation' }).waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
  check(!(await page.getByRole('dialog', { name: 'Main navigation' }).isVisible().catch(() => false)), 'tapping outside the drawer closes it');
  await page.screenshot({ path: path.join(OUT, 'myoffice-touch@390.png') });
  await context.close();
}

await browser.close();
console.log(failures === 0 ? '\nALL PARITY CHECKS PASSED' : `\n${failures} PARITY CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
