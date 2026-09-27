// Route inventory for the Dallaglio migration. Counts are review leads, not
// automatic defects: semantic status colors and specialist controls may be valid.
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('../app/', import.meta.url).pathname.replace(/^\/(?=[A-Za-z]:)/, '');
const pages = [];
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (entry.name === 'page.tsx') pages.push(path);
  }
}
walk(root);
const count = (text, pattern) => [...text.matchAll(pattern)].length;
const rows = pages.map(path => {
  const source = readFileSync(path, 'utf8');
  const relativePage = relative(root, path).replace(/\\/g, '/');
  return {
    route: relativePage === 'page.tsx' ? '/' : '/' + relativePage.replace(/\/page\.tsx$/, ''),
    localButtons: count(source, /<button\b/g),
    localSelects: count(source, /<select\b/g),
    nonBrandColors: count(source, /(?:bg|text|border)-(?:blue|cyan|indigo|violet|purple|emerald|green|amber|yellow|rose|red|sky)-\d{2,3}/g),
    sharedTabs: count(source, /<(?:PillTabs|UnderlineTabs)\b/g),
    sharedViewToggles: count(source, /<ViewToggle\b/g),
  };
}).sort((a, b) => (b.localButtons + b.localSelects + b.nonBrandColors) - (a.localButtons + a.localSelects + a.nonBrandColors));
console.log(JSON.stringify({ routes: rows.length, totals: rows.reduce((acc, row) => {
  for (const key of ['localButtons', 'localSelects', 'nonBrandColors', 'sharedTabs', 'sharedViewToggles']) acc[key] = (acc[key] || 0) + row[key];
  return acc;
}, {}), rows }, null, 2));
