// scripts/motion-consistency.mjs — the motion ratchet. All framer-motion use
// goes through components/ui-system/motion/, every duration and bounce lives
// in its presets.ts, and no logic waits on an animation. Fails docs:check on:
//   - a framer-motion import outside motion/ + the named exceptions below
//   - onAnimationComplete outside motion/ (logic must never wait on animation)
//   - a framer layout/layoutId prop outside motion/ + the named movers
//     (layout goes only on the element that moves; Recharts layout="vertical"
//     is not framer and is excluded by value)
//   - a raw transition param (duration/visualDuration/stiffness/damping/
//     bounce/mass/delay) outside motion/ + the migration allowlist
//   - a literal duration-[<n>ms] class anywhere (use a token)
//   - ease: 'linear' outside motion/ (linear lives only in SPIN)
// Usage: node scripts/motion-consistency.mjs [--json]
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stripComments } from './css-consistency.mjs';

const { join, relative } = path;

// framer-motion importers. B4 migrates the compressor/floor/popup files onto
// the presets; the loading loops, the typewriter guide and the test-homepage
// study stay by decision (see ASSUMPTIONS.md).
const FRAMER_ALLOW = new Set([
  // B4s1: ActiveNoticesPopup migrated to Presence (was: framer exception).
  // B4s4: compressors + floor/motion migrated onto the presets.
  'components/ui-system/patterns/LoadingPulse.tsx',
  'components/home/useTypewriterPlaceholder.ts',
]);
const FRAMER_ALLOW_DIRS = ['app/test-homepage/', 'components/ui-system/motion/'];

// Raw transition params: same files (they migrate in B4 with their imports).
const TRANSITION_ALLOW = FRAMER_ALLOW;
const TRANSITION_ALLOW_DIRS = FRAMER_ALLOW_DIRS;

// Named moving elements allowed a layout/layoutId until B4 migrates them.
const LAYOUT_ALLOW = new Set([
  // B4s4: the compressor view-pill moved to the sliding indicator (was: layoutId exception).
  // B4s1: ActiveNoticesPopup migrated to Presence (was: card layout exception).
]);
const LAYOUT_ALLOW_DIRS = ['app/test-homepage/', 'components/ui-system/motion/'];

const MOTION_DIR = 'components/ui-system/motion/';

const ROOTS = ['app', 'components', 'hooks', 'lib'];

const inDirs = (rel, dirs) => dirs.some(d => rel.startsWith(d));
const lineOf = (text, index) => text.slice(0, index).split('\n').length;

/** Strip comments line-wise (doc text must never flag), keeping line breaks. */
function codeOnly(text) {
  const state = { inBlock: false };
  return text.split('\n').map(line => stripComments(line, state)).join('\n');
}

/**
 * N1 inventory coverage: every non-test ts/tsx under the four inventoried
 * dirs must appear in MOTION_INVENTORY.md (one row per element, nothing
 * unlisted). The inventory lives beside the frontend checkout
 * (../audit/motion-search-next-2026-10-27/); when it is absent (CI without
 * the audit folder) the coverage part skips with a warning, while the
 * ratchet above still enforces.
 */
const INVENTORY_DIRS = ['components/ui-system', 'components/shared', 'components/app-shell', 'components/home'];

function loadInventorySpans(invPath) {
  const text = readFileSync(invPath, 'utf8');
  const spans = new Set();
  for (const m of text.matchAll(/`([^`]+)`/g)) {
    const s = m[1].trim().replace(/:\d+.*$/, '');
    if (/^[A-Za-z0-9@_.*/-]+\.(tsx?|css|mjs)$/i.test(s) || s.endsWith('/*') || /\/\*\.(tsx?|css)$/.test(s)) spans.add(s);
  }
  return spans;
}

function inventoryCovers(spans, rel) {
  const stripped = rel.replace(/^components\//, '');
  const candidates = [rel, stripped];
  for (const span of spans) {
    const prefix = span.endsWith('/*') ? span.slice(0, -1) : /\/\*\.(tsx?|css)$/.test(span) ? span.slice(0, span.indexOf('/*') + 1) : null;
    if (prefix) {
      if (candidates.some(c => c.startsWith(prefix))) return true;
      continue;
    }
    if (candidates.some(c => c === span || c.endsWith('/' + span))) return true;
  }
  return false;
}

export function scanText(rel, text) {
  const findings = [];
  const flag = (index, rule, message) => {
    const lineStart = text.lastIndexOf('\n', index) + 1;
    findings.push({ rule, file: rel, line: lineOf(text, index), col: index - lineStart + 1, message });
  };
  const code = codeOnly(text);
  const inMotion = rel.startsWith(MOTION_DIR);
  const framerAllowed = inMotion || FRAMER_ALLOW.has(rel) || inDirs(rel, FRAMER_ALLOW_DIRS);
  const importsFramer = /from\s+['"]framer-motion['"]|import\s*\(\s*['"]framer-motion['"]\)/.test(code);

  if (!framerAllowed && importsFramer) {
    flag(code.search(/from\s+['"]framer-motion['"]|import\s*\(\s*['"]framer-motion['"]\)/), 'framer-import',
      'framer-motion outside ui-system/motion — import the motion piece from @/components/ui-system instead');
  }
  if (!inMotion) {
    const complete = code.search(/\bonAnimationComplete\b/);
    if (complete >= 0) flag(complete, 'animation-complete', 'logic must never wait on an animation (no onAnimationComplete outside ui-system/motion)');
    const linear = code.search(/\bease\s*:\s*['"]linear['"]/);
    if (linear >= 0) flag(linear, 'linear-ease', "linear easing lives only in SPIN (presets.ts) — never for movement, never for fades");
  }
  const layoutAllowed = inMotion || LAYOUT_ALLOW.has(rel) || inDirs(rel, LAYOUT_ALLOW_DIRS);
  if (!layoutAllowed && importsFramer) {
    const layoutId = code.search(/\blayoutId\s*=/);
    if (layoutId >= 0) flag(layoutId, 'layout-scope', 'framer layoutId goes only on a named moving element');
    const bare = code.search(/[\s{]layout[\s>{}/}]/);
    if (bare >= 0) flag(bare + 1, 'layout-scope', 'framer layout goes only on the element that moves, never on a generic wrapper');
  }
  const transitionAllowed = inMotion || TRANSITION_ALLOW.has(rel) || inDirs(rel, TRANSITION_ALLOW_DIRS);
  if (!transitionAllowed) {
    for (const m of code.matchAll(/transition\s*=\s*\{\{/g)) {
      const window = code.slice(m.index, m.index + 400);
      if (/\b(duration|visualDuration|stiffness|damping|bounce|mass|delay)\s*:/.test(window)) {
        flag(m.index, 'raw-transition', 'durations and spring params live only in motion/presets.ts — use a preset');
        break;
      }
    }
  }
  const literalMs = code.search(/duration-\[\d/);
  if (literalMs >= 0) flag(literalMs, 'literal-ms', 'literal duration-[<n>ms] — use a --mo-* duration token');
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

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
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

  const invPath = path.resolve(root, '..', 'audit', 'motion-search-next-2026-10-27', 'MOTION_INVENTORY.md');
  let uncovered = [];
  try {
    const spans = loadInventorySpans(invPath);
    for (const dir of INVENTORY_DIRS) {
      for (const file of walk(join(root, dir))) {
        const rel = relative(root, file).replace(/\\/g, '/');
        if (!inventoryCovers(spans, rel)) uncovered.push(rel);
      }
    }
  } catch {
    if (!asJson) console.log('motion-consistency: inventory not found, coverage skipped');
  }
  for (const rel of uncovered) {
    findings.push({ rule: 'inventory-coverage', file: rel, line: 1, col: 1, message: 'component file missing from MOTION_INVENTORY.md' });
  }
  if (asJson) {
    console.log(JSON.stringify({ findings }, null, 2));
  } else if (findings.length > 0) {
    for (const f of findings) console.log(`${f.file}:${f.line}:${f.col}: ${f.message} (${f.rule})`);
    console.log(`\nmotion-consistency: ${findings.length} problem(s)`);
  } else {
    console.log('motion-consistency: clean');
  }
  process.exit(findings.length > 0 ? 1 : 0);
}
