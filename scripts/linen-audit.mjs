// Finish audit ("fine linen"): captures reference pages at desktop, tablet and phone and measures what the eye
// judges, so the shared system can be refined from evidence rather than taste.
//   MSYS_NO_PATHCONV=1 node scripts/linen-audit.mjs --label before   (screenshots + metrics to docs/linen/<label>/)
// Measures per page and size: the type sizes and weights actually in use, icon sizes and their vertical alignment with
// the adjacent label, text contrast against the real background, and what breaks under the WCAG 1.4.12 text-spacing
// overrides (clipped text, page-level horizontal scroll). Fixture session and mocked API only; no live data.
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { chromium, fixtureContext, json } from './lib/fixtures.mjs';

const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > -1 ? process.argv[i + 1] : fallback; };
const BASE = arg('base', 'http://localhost:3000');
const LABEL = arg('label', 'current');
const OUT = path.resolve('docs/linen', LABEL);
fs.mkdirSync(OUT, { recursive: true });

const PAGES = ['/tools', '/', '/drivers', '/training', '/sheq', '/near_miss', '/requisitions', '/admin', '/noticeboard'];
const SIZES = [{ name: 'desktop', width: 1440, height: 900 }, { name: 'tablet', width: 820, height: 1100 }, { name: 'phone', width: 390, height: 844 }];

const specs = new Map();
for (const file of fs.readdirSync(path.resolve('scripts/route-specs')).filter(f => f.endsWith('.mjs'))) {
  const mod = await import(pathToFileURL(path.resolve('scripts/route-specs', file)).href);
  for (const s of (Array.isArray(mod.default) ? mod.default : [mod.default])) specs.set(s.route, s);
}

const browser = await chromium.launch({ headless: true });
const report = {};

for (const route of PAGES) {
  const spec = specs.get(route);
  const handler = async r => {
    const req = r.request();
    const p = new URL(req.url()).pathname;
    const entry = spec?.data?.[`${req.method()} ${p}`] ?? spec?.data?.[p];
    const v = typeof entry === 'function' ? entry(req) : entry;
    return json(r, v === undefined ? [] : v);
  };
  report[route] = {};
  for (const size of SIZES) {
    const context = await fixtureContext(browser, handler, { width: size.width, height: size.height });
    const page = await context.newPage();
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle', timeout: 90_000 }).catch(() => {});
    await page.waitForSelector('main h1, h1', { timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(1500);
    // The once-per-session notices popup would cover the page being judged.
    const dismiss = page.getByRole('button', { name: 'Dismiss all' });
    if (await dismiss.isVisible().catch(() => false)) await dismiss.click();
    const slug = route === '/' ? 'home' : route.replace(/\W+/g, '-').replace(/^-/, '');
    await page.screenshot({ path: path.join(OUT, `${slug}-${size.name}.png`), fullPage: size.name !== 'desktop' ? false : false });

    report[route][size.name] = await page.evaluate(() => {
      const visible = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && s.opacity !== '0'; };
      const lum = ([r, g, b]) => { const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
      const parse = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { rgb: p.slice(0, 3), a: p.length > 3 ? p[3] : 1 }; };
      const bgOf = el => { for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0.95) return c.rgb; } return [255, 255, 255]; };
      const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

      const sizes = {}; const lowContrast = []; const lines = {};
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const text = n.textContent.trim(); const el = n.parentElement;
        if (!text || !el || !visible(el) || el.closest('script,style,noscript,[aria-hidden="true"]')) continue;
        const s = getComputedStyle(el);
        const px = Math.round(parseFloat(s.fontSize) * 10) / 10; const w = s.fontWeight;
        const key = `${px}px/${w}`; sizes[key] = (sizes[key] || 0) + 1;
        const lh = s.lineHeight === 'normal' ? 1.2 : Math.round((parseFloat(s.lineHeight) / parseFloat(s.fontSize)) * 100) / 100;
        lines[lh] = (lines[lh] || 0) + 1;
        const fg = parse(s.color); if (!fg) continue;
        const bg = bgOf(el);
        const blend = fg.rgb.map((c, i) => Math.round(c * fg.a + bg[i] * (1 - fg.a)));
        const r = ratio(blend, bg);
        const large = px >= 24 || (px >= 18.66 && Number(w) >= 700);
        if (r < (large ? 3 : 4.5)) lowContrast.push({ text: text.slice(0, 40), ratio: Math.round(r * 100) / 100, size: px, color: s.color });
      }

      // Icons: size distribution and vertical alignment with the neighbouring label.
      const iconSizes = {}; const misaligned = [];
      for (const svg of document.querySelectorAll('svg')) {
        if (!visible(svg) || svg.closest('.recharts-wrapper')) continue;
        const r = svg.getBoundingClientRect();
        const k = `${Math.round(r.width)}`; iconSizes[k] = (iconSizes[k] || 0) + 1;
        const label = svg.nextElementSibling || svg.previousElementSibling;
        const host = svg.parentElement;
        if (host && label === null && host.childNodes.length > 1) {
          const range = document.createRange(); range.selectNodeContents(host);
          const t = [...host.childNodes].find(c => c.nodeType === 3 && c.textContent.trim());
          if (t) { const tr = document.createRange(); tr.selectNodeContents(t); const b = tr.getBoundingClientRect(); const d = Math.abs((b.top + b.height / 2) - (r.top + r.height / 2)); if (d > 1.5) misaligned.push({ text: t.textContent.trim().slice(0, 24), offset: Math.round(d * 10) / 10 }); }
        }
      }

      // WCAG 1.4.12 text spacing: apply the minimum overrides and look for clipping.
      const style = document.createElement('style');
      style.textContent = '* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }';
      document.head.appendChild(style);
      const clipped = [];
      for (const el of document.querySelectorAll('body *')) {
        if (!visible(el)) continue;
        const s = getComputedStyle(el);
        if (!el.textContent?.trim() || el.children.length > 3) continue;
        const hides = s.overflow === 'hidden' || s.overflowY === 'hidden';
        if (hides && s.textOverflow !== 'ellipsis' && el.scrollHeight > el.clientHeight + 2 && el.clientHeight > 2 && el.clientWidth > 2) clipped.push({ text: el.textContent.trim().slice(0, 40), by: el.scrollHeight - el.clientHeight });
      }
      const pageOverflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
      style.remove();

      return { sizes, lineHeights: lines, lowContrast: lowContrast.slice(0, 12), lowContrastCount: lowContrast.length, iconSizes, misaligned: misaligned.slice(0, 8), spacing: { clipped: clipped.slice(0, 8), clippedCount: clipped.length, pageOverflow } };
    });
    await context.close();
  }
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'metrics.json'), JSON.stringify(report, null, 2));

// A short human-readable digest.
const lines = [];
for (const [route, bySize] of Object.entries(report)) {
  for (const [size, m] of Object.entries(bySize)) {
    lines.push(`${route} ${size}: ${Object.keys(m.sizes).length} type styles, ${Object.keys(m.iconSizes).length} icon sizes (${Object.keys(m.iconSizes).join('/')}), ${m.lowContrastCount} low-contrast, ${m.misaligned.length} misaligned icons, ${m.spacing.clippedCount} clipped under text spacing, page overflow ${m.spacing.pageOverflow}px`);
  }
}
fs.writeFileSync(path.join(OUT, 'summary.txt'), `${lines.join('\n')}\n`);
console.log(lines.join('\n'));
