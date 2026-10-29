// B5 contact sheets: one sheet image per combo (theme-motion@width) from shots-b5.
//   MSYS_NO_PATHCONV=1 node scripts/b5-sheets.mjs [--label b5]
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { chromium } from './lib/fixtures.mjs';

const arg = (n, f) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : f; };
const SHOTS = path.resolve('node_modules/.cache/mo-audit/shots-b5');
const OUT = path.resolve(`node_modules/.cache/mo-audit/sheets-${arg('label', 'b5')}`);
fs.mkdirSync(OUT, { recursive: true });

const comboOf = f => (f.match(/-([a-z]+-[a-z]+@\d+)\.png$/) || [])[1];
const files = fs.readdirSync(SHOTS).filter(f => f.endsWith('.png') && !f.startsWith('sheet-') && comboOf(f));
const combos = [...new Set(files.map(comboOf))].sort();
const browser = await chromium.launch();

for (const combo of combos) {
  const group = files.filter(f => comboOf(f) === combo).sort();
  if (!group.length) continue;
  const wide = combo.includes('@1440');
  const w = wide ? 360 : 180;
  const cols = wide ? 4 : 6;
  const perSheet = wide ? 12 : 18;
  for (let s = 0; s * perSheet < group.length; s++) {
    const cells = group.slice(s * perSheet, (s + 1) * perSheet).map(f => {
      const route = f.slice(0, f.length - `-${combo}.png`.length);
      const src = pathToFileURL(path.join(SHOTS, f)).href;
      return `<figure style="margin:0;width:${w}px"><div style="font:600 12px sans-serif;margin-bottom:4px;word-break:break-all">${route}</div><img src="${src}" style="width:${w}px;border:1px solid #bbb;display:block"/></figure>`;
    }).join('');
    const page = await browser.newPage({ viewport: { width: cols * (w + 16) + 16, height: 800 } });
    const html = path.join(OUT, `_sheet-${combo}-${s + 1}.html`);
    fs.writeFileSync(html, `<body style="margin:8px;background:#fff"><div style="display:flex;flex-wrap:wrap;gap:16px">${cells}</div></body>`);
    await page.goto(pathToFileURL(html).href);
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(OUT, `sheet-${combo}-${s + 1}.png`), fullPage: true });
    await page.close();
    fs.unlinkSync(html);
  }
}
await browser.close();
console.log(fs.readdirSync(OUT).filter(f => f.startsWith('sheet-')).join('\n'));
