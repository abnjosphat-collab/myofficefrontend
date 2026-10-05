// Checks that every relative Markdown link in the frontend documentation points at a file that exists.
// External URLs and in-page anchors are ignored. Run by `npm run docs:check`.
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const roots = ['docs', 'components/ui-system', 'README.md', 'AGENTS.md', 'CLAUDE.md'];
const skip = new Set(['_generated', 'node_modules', '.next']);

function markdownFiles(target) {
  const full = path.join(root, target);
  if (!fs.existsSync(full)) return [];
  if (fs.statSync(full).isFile()) return full.endsWith('.md') ? [full] : [];
  return fs.readdirSync(full, { withFileTypes: true }).flatMap(entry => (skip.has(entry.name) ? [] : markdownFiles(path.join(target, entry.name))));
}

const broken = [];
for (const file of roots.flatMap(markdownFiles)) {
  const text = fs.readFileSync(file, 'utf8').replace(/```[\s\S]*?```/g, ''); // links inside code fences are examples
  for (const match of text.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
    const target = match[1];
    if (/^(https?:|mailto:|#)/.test(target)) continue;
    const resolved = path.resolve(path.dirname(file), decodeURIComponent(target.split('#')[0]));
    // A link that leaves this repository (to the sibling backend or the workspace README) cannot be checked in a single-repo checkout.
    if (path.relative(root, resolved).startsWith('..')) continue;
    if (!fs.existsSync(resolved)) broken.push(`${path.relative(root, file)}: ${target}`);
  }
}
if (broken.length) { console.error(`Broken documentation links (${broken.length}):\n${broken.slice(0, 40).map(b => `  ${b}`).join('\n')}`); process.exit(1); }
console.log('Documentation links OK.');
