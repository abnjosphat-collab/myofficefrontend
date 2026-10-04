import fs from 'node:fs'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
import { chromium } from './lib/fixtures.mjs';
const dir = path.resolve('docs/overlays/before');
const names = process.argv.slice(2);
const cells = names.map(n => `<figure style="margin:0"><div style="font:600 12px sans-serif">${n}</div><img src="${pathToFileURL(path.join(dir, n + '.png')).href}" style="height:480px;border:1px solid #bbb"/></figure>`).join('');
const html = path.join(dir, '_s.html'); fs.writeFileSync(html, `<body style="margin:8px"><div style="display:flex;gap:12px;align-items:flex-start">${cells}</div></body>`);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1500, height: 600 } });
await p.goto(pathToFileURL(html).href); await p.waitForTimeout(500);
await p.screenshot({ path: path.join(dir, '_sheet.png'), fullPage: true }); await b.close(); fs.unlinkSync(html);
