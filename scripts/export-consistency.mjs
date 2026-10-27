// scripts/export-consistency.mjs — export-trigger guardrails: DownloadButton and
// ExportButton are always labelled except in dense table row actions, so an
// `iconOnly` prop on either fails unless it sits in a rowActions /
// renderExpanded context. Lists violations, exits 1 when any are found. Wired
// into `npm run docs:check` as a ratchet: the tree must stay at zero findings.
// Usage: node scripts/export-consistency.mjs [--json]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stripComments } from './css-consistency.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const SCAN_DIRS = ['app', 'components', 'lib'];
// Scratch, previews and the other session's concept trees are not shipped UI.
const SKIP_DIRS = ['home-preview', 'wireframes', 'test-homepage', 'timesheets - Copy', 'deep-space-preview', 'login-preview'];
// DownloadButton defines the row-action escape hatch and passes it through;
// the check targets usages, not the definition.
const SKIP_FILES = new Set(['components/shared/DownloadButton.tsx']);

const findings = [];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && !SKIP_DIRS.includes(entry.name) && !entry.name.startsWith('.')) {
      walk(path.join(dir, entry.name), out);
    } else if (entry.isFile() && entry.name.endsWith('.tsx') && !entry.name.endsWith('.test.tsx')) {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

const TRIGGER_RE = /<(DownloadButton|ExportButton)\b/g;
const ROW_CONTEXT_RE = /\b(rowActions|renderExpanded)\b/;
// An explicit iconOnly={false} keeps the labelled trigger, so only a bare or
// truthy iconOnly is an icon-only trigger.
const ICON_ONLY_RE = /\biconOnly\b(?!\s*=\s*\{\s*false\s*\})/;

/** The JSX opening tag starting at `start` (the `<`), balanced over braces
 *  and strings so `>` inside props (e.g. `as Record<string, …>`) never ends
 *  it early. Returns the tag text plus the 1-based line it ends on. */
function openingTag(lines, startLine, startCol) {
  let text = '';
  let depth = 0;
  let quote = null;
  for (let ln = startLine; ln < lines.length; ln++) {
    const line = lines[ln];
    const from = ln === startLine ? startCol : 0;
    for (let i = from; i < line.length; i++) {
      const ch = line[i];
      text += ch;
      if (quote) {
        if (ch === quote && line[i - 1] !== '\\') quote = null;
      } else if (ch === '"' || ch === "'" || ch === '`') {
        quote = ch;
      } else if (ch === '{') {
        depth++;
      } else if (ch === '}') {
        depth--;
      } else if (ch === '>' && depth === 0) {
        return { text, endLine: ln + 1 };
      }
    }
    text += '\n';
  }
  return { text, endLine: lines.length };
}

/** Scan one file's text (pure over the findings it returns); the file walk
 *  below is the only impure part. Exported for the test next door. */
export function scanText(rel, text) {
  const local = [];
  const rawLines = text.split('\n');
  const commentState = { inBlock: false };
  const lines = rawLines.map(line => stripComments(line, commentState));
  lines.forEach((line, index) => {
    for (const match of line.matchAll(TRIGGER_RE)) {
      const { text: tag, endLine } = openingTag(lines, index, match.index);
      if (!ICON_ONLY_RE.test(tag)) continue;
      const context = lines.slice(Math.max(0, index - 40), index).join('\n') + '\n' + line.slice(0, match.index);
      if (!ROW_CONTEXT_RE.test(context)) {
        local.push({ file: rel, line: index + 1, rule: 'export-icon-only', detail: `${match[1]} iconOnly outside a table row action — page and section exports stay labelled` });
      }
    }
  });
  return local;
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  for (const dir of SCAN_DIRS) {
    for (const file of walk(path.join(ROOT, dir))) {
      const rel = path.relative(ROOT, file).replaceAll(path.sep, '/');
      if (SKIP_FILES.has(rel)) continue;
      findings.push(...scanText(rel, fs.readFileSync(file, 'utf8')));
    }
  }

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(findings, null, 2));
  } else if (findings.length === 0) {
    console.log('export-consistency: no violations.');
  } else {
    for (const finding of findings) {
      console.log(`${finding.file}:${finding.line} [${finding.rule}] ${finding.detail}`);
    }
    console.log(`\nexport-consistency: ${findings.length} violation(s).`);
  }
  process.exit(findings.length === 0 ? 0 : 1);
}
