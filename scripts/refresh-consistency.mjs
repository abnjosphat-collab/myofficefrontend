// scripts/refresh-consistency.mjs — the refresh ratchet. A page never needs a
// refresh button (lists and dashboards re-read themselves on a silent
// background tick), so `icon="refresh"` fails docs:check except:
//   - an error-state retry: a Button labelled "Try again" / "Retry …"
//     (DataRegion, app/error-shared, RecordHistory, every Notice retry);
//   - the named do-more controls below, which re-run, recalculate, reset a
//     flow, load a preview, or re-read bespoke sections — not reload a list.
// Usage: node scripts/refresh-consistency.mjs [--json]
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { join, relative } = path;

// Do-more controls: each does something other than reload a list.
const ALLOWLIST = new Set([
  'app/artisan-timesheets/ArtisanEditor.tsx', // Refresh from the system: merges system data into the editor draft
  'app/compressors/ManagementTab.tsx', // Refresh all data: re-reads every bespoke compressor section at once
  'app/maintenance/import/EmaintImportFlow.tsx', // Import another file: resets the import flow
  'app/overtime/insights/AnalysisGate.tsx', // Run the analysis again: re-runs the server analysis
  'app/ppe/MatrixDialog.tsx', // Recalculate all types: triggers recalculation
  'app/spares/import/page.tsx', // Import another file: resets the import flow
  'app/timesheets/necImport/NecScanImportPanel.tsx', // Preview changes: loads the review preview
]);

const ROOTS = ['app', 'components', 'hooks', 'lib'];

/** The index just past the `>` closing the tag that opens at `start` (reads past `>` inside quotes/braces). */
function tagEnd(text, start) {
  let quote = null;
  let depth = 0;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === '{') {
      depth += 1;
    } else if (ch === '}') {
      depth = Math.max(0, depth - 1);
    } else if (ch === '>' && depth === 0) {
      return i + 1;
    }
  }
  return -1;
}

const lineOf = (text, index) => text.slice(0, index).split('\n').length;

/** The inner label of a <Button …>…</Button> starting at the tag end (labels may wrap one line). */
function buttonLabel(text, end) {
  const close = text.indexOf('</Button>', end);
  if (close === -1 || close - end > 300) return '';
  return text.slice(end, close).replace(/\s+/g, ' ').trim();
}

export function scanText(rel, text) {
  const findings = [];
  if (ALLOWLIST.has(rel)) return findings;
  const openings = [...text.matchAll(/<(Button|IconButton)\b/g)];
  for (const m of openings) {
    const start = m.index ?? 0;
    const lineStart = text.lastIndexOf('\n', start) + 1;
    if (text.slice(lineStart).trimStart().startsWith('//')) continue; // commented out
    const end = tagEnd(text, start);
    if (end === -1) continue;
    const props = text.slice(start, end);
    if (!/\bicon=(["'])refresh\1/.test(props)) continue;
    if (m[1] === 'Button' && /^(Try again|Retry\b)/.test(buttonLabel(text, end))) continue; // error-state retry
    const line = lineOf(text, start);
    const col = start - lineStart + 1;
    findings.push({
      rule: 'refresh-button',
      file: rel,
      line,
      col,
      message: 'icon="refresh" is only for error-state "Try again"/"Retry" and the named do-more controls — lists refresh themselves; delete the button',
    });
  }
  return findings;
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, out);
    } else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry) && !/\.stories\.tsx?$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

const root = path.resolve(import.meta.dirname, '..');
const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  const asJson = process.argv.includes('--json');
  const findings = [];
  for (const dir of ROOTS) {
    for (const file of walk(join(root, dir))) {
      const rel = relative(root, file).replace(/\\/g, '/');
      findings.push(...scanText(rel, readFileSync(file, 'utf8')));
    }
  }

  if (asJson) {
    console.log(JSON.stringify({ findings }, null, 2));
  } else if (findings.length > 0) {
    for (const f of findings) console.log(`${f.file}:${f.line}:${f.col}: ${f.message} (${f.rule})`);
    console.log(`\nrefresh-consistency: ${findings.length} problem(s)`);
  } else {
    console.log('refresh-consistency: clean');
  }
  process.exit(findings.length > 0 ? 1 : 0);
}
