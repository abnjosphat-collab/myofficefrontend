// Builds labelled contact sheets from docs/wireframes/<label>/ so a whole route group can be reviewed at a glance.
//   MSYS_NO_PATHCONV=1 node scripts/contact-sheets.mjs --label before
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { chromium } from './lib/fixtures.mjs';
const arg = (n, f) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : f; };
const LABEL = arg('label', 'before');
const dir = path.resolve('docs/wireframes', LABEL);
const structure = JSON.parse(fs.readFileSync(path.join(dir, 'structure.json'), 'utf8'));
const routes = Object.keys(structure);
const browser = await chromium.launch();
for (const [size, perSheet, cols, w] of [['desktop', 8, 4, 350], ['phone', 15, 5, 270]]) {
  for (let s = 0; s * perSheet < routes.length; s++) {
    const group = routes.slice(s * perSheet, (s + 1) * perSheet);
    const cells = group.map(r => {
      const slug = r === '/' ? 'home' : r.replace(/\W+/g, '-').replace(/^-|-$/g, '');
      const src = pathToFileURL(path.join(dir, `${slug}-${size}.png`)).href;
      return `<figure style="margin:0;width:${w}px"><div style="font:600 13px sans-serif;margin-bottom:4px">${r} <span style="font-weight:400;color:#666">${structure[r].code}</span></div><img src="${src}" style="width:${w}px;border:1px solid #bbb;display:block"/></figure>`;
    }).join('');
    const page = await browser.newPage({ viewport: { width: cols * (w + 16) + 16, height: 800 } });
    const html = path.join(dir, `_sheet-${size}-${s + 1}.html`); // images load from file:// only when the page is a file too
    fs.writeFileSync(html, `<body style="margin:8px;background:#fff"><div style="display:flex;flex-wrap:wrap;gap:16px">${cells}</div></body>`);
    await page.goto(pathToFileURL(html).href);
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(dir, `sheet-${size}-${s + 1}.png`), fullPage: true });
    await page.close();
    fs.unlinkSync(html);
  }
}
await browser.close();
console.log(fs.readdirSync(dir).filter(f => f.startsWith('sheet-')).join('\n'));
