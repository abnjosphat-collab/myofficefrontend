// Finds source files that no page can reach: BFS over import specifiers from every Next entry file (pages, layouts, route handlers).
// Report only; it deletes nothing. Run: node scripts/find-orphans.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..').split(path.sep).join('/');
const DIRS = ['app', 'components', 'lib', 'hooks'];
const EXT = ['.ts', '.tsx'];
const files = [];
const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (EXT.includes(path.extname(e.name))) files.push(p.replace(/\\/g, '/')); } };
DIRS.forEach(d => walk(path.join(ROOT, d)));
const isTest = f => /\.test\.|\.spec\./.test(f);
const src = files.filter(f => !isTest(f));
const resolve = (from, spec) => {
  let base;
  if (spec.startsWith('@/')) base = path.join(ROOT, spec.slice(2));
  else if (spec.startsWith('.')) base = path.join(path.dirname(from), spec);
  else return null;
  base = base.replace(/\\/g, '/');
  for (const c of [base, ...EXT.map(e => base + e), ...EXT.map(e => base + '/index' + e)]) if (files.includes(c) && fs.statSync(c).isFile()) return c;
  return null;
};
const importsOf = f => {
  const t = fs.readFileSync(f, 'utf8');
  const out = [];
  for (const m of t.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)) { const r = resolve(f, m[1]); if (r) out.push(r); }
  return out;
};
const entries = src.filter(f => /\/app\/.*\/(page|layout|route|loading|error|not-found|global-error|template)\.tsx?$/.test(f) || /\/app\/(page|layout|route|loading|error|not-found|global-error)\.tsx?$/.test(f) || /\/app\/(manifest|sitemap|robots|icon|apple-icon|opengraph-image)\.tsx?$/.test(f));
const seen = new Set(entries);
const q = [...entries];
while (q.length) { const f = q.pop(); for (const r of importsOf(f)) if (!seen.has(r)) { seen.add(r); q.push(r); } }
// also anything a test file imports counts as "tested" but not reachable; report separately
const orphans = src.filter(f => !seen.has(f));
const rel = f => f.replace(ROOT + '/', '');
console.log('entries', entries.length, 'reachable', seen.size, 'source files', src.length, 'orphans', orphans.length);
for (const f of orphans.sort()) console.log(rel(f));
