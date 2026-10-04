// Renders the current handoff, PWA and ledger Markdown into one readable PDF snapshot (markdown-it + Chromium).
//   node scripts/docs-pdf.mjs   ->  docs/snapshots/MYOFFICE_REDESIGN_SNAPSHOT.pdf
// The PDF is a dated snapshot, not a source of truth; the Markdown is.
import fs from 'node:fs';
import path from 'node:path';
import MarkdownIt from 'markdown-it';
import { chromium } from './lib/fixtures.mjs';

const docs = path.resolve('docs');
const parts = ['CURRENT_HANDOFF.md', 'PWA_UPDATES.md', 'MIGRATION_LEDGER.md'];
const md = new MarkdownIt({ html: false, linkify: true });
const date = new Date().toISOString().slice(0, 10);
const body = parts.map(f => `<section>${md.render(fs.readFileSync(path.join(docs, f), 'utf8').replace(/```mermaid[\s\S]*?```/g, '_(sequence diagram: see the Markdown source)_'))}</section>`).join('');
const html = `<!doctype html><meta charset="utf-8"><style>
body{font:10.5pt/1.5 system-ui,Segoe UI,sans-serif;color:#1b2923;margin:0}
section{page-break-after:always} h1{font-size:19pt;border-bottom:2px solid #233b31;padding-bottom:4px} h2{font-size:13pt;margin-top:18px}
table{border-collapse:collapse;width:100%;font-size:8.5pt;margin:8px 0} td,th{border:1px solid #c9d3ce;padding:3px 6px;text-align:left;vertical-align:top}
th{background:#e2e9e5} code,pre{font:8.5pt Consolas,monospace;background:#f1f4f2} pre{padding:8px;white-space:pre-wrap} blockquote{border-left:3px solid #4f806a;margin:8px 0;padding:2px 10px;color:#44544c}
.cover{padding:8px 0 14px;border-bottom:1px solid #c9d3ce;margin-bottom:10px;font-size:9.5pt}
</style><div class="cover"><b>MyOffice redesign snapshot, generated ${date}</b> from the repository Markdown (CURRENT_HANDOFF, PWA_UPDATES, MIGRATION_LEDGER).
Verified scope: fixture-session browser checks only (no live data, no real devices). The Markdown is authoritative; regenerate with <code>node scripts/docs-pdf.mjs</code>.</div>${body}`;
fs.mkdirSync(path.join(docs, 'snapshots'), { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setContent(html);
const out = path.join(docs, 'snapshots', 'MYOFFICE_REDESIGN_SNAPSHOT.pdf');
await page.pdf({ path: out, format: 'A4', margin: { top: '16mm', bottom: '16mm', left: '14mm', right: '14mm' }, printBackground: true, displayHeaderFooter: true, footerTemplate: `<div style="font-size:7pt;width:100%;text-align:center;color:#666">MyOffice redesign snapshot ${date} · <span class="pageNumber"></span>/<span class="totalPages"></span></div>`, headerTemplate: '<span></span>' });
await browser.close();
console.log('wrote', out);
