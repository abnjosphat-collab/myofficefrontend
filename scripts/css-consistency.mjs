// scripts/css-consistency.mjs — zero-dependency guardrails for the styling rules
// the codebase keeps re-learning: no hex in TSX, no competing utilities in one
// className string, one light appearance, inline SVG (no emoji icons), theme
// utilities instead of -[var(--mo-…)] arbitrary values, type roles instead of
// raw text-[Npx]. Lists violations, exits 1 when any are found. Wired into
// `npm run docs:check` as a ratchet: the tree must stay at zero findings.
// Usage: node scripts/css-consistency.mjs [--json]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(import.meta.dirname, '..');
const SCAN_DIRS = ['app', 'components', 'lib'];
// Scratch, previews and the other session's concept trees are not shipped UI.
const SKIP_DIRS = ['home-preview', 'wireframes', 'test-homepage', 'timesheets - Copy', 'deep-space-preview', 'login-preview'];
const SKIP_FILES = new Set(['app/icon.tsx']); // favicon artwork
// Generated-file/canvas colors must be literal (PDF/canvas/3D APIs take hex, not
// CSS vars), as must PWA themeColor metadata.
const HEX_SKIP_FILES = new Set([
  'lib/exportUtils.ts', 'lib/sops/exportPdf.ts',
  'components/shared/deep-space/SilkCanvas.tsx',
  'components/shared/floor/themes.ts',
  'components/shared/SignaturePad.tsx',
]);
const HEX_SKIP_LINE = /themeColor/;
// Exact brand hexes that must stay byte-identical (Google sign-in "G").
const BRAND_HEX = new Set(['#4285F4', '#34A853', '#FBBC05', '#EA4335']);

const findings = [];
const flag = (file, line, rule, detail) => findings.push({ file, line, rule, detail });

export { classSegments, stripComments, TEXT_NON_COLOR };

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && !SKIP_DIRS.includes(entry.name) && !entry.name.startsWith('.')) {
      walk(path.join(dir, entry.name), out);
    } else if (entry.isFile() && /\.(tsx|ts)$/.test(entry.name) && !entry.name.endsWith('.test.tsx') && !entry.name.endsWith('.test.ts')) {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

// text-* utilities that are NOT colors: Tailwind sizes/alignment/wrapping plus the
// app's own type roles (typography.ts) and nav roles — `text-body text-ink` is
// the intended size+color pairing, not a conflict.
const TEXT_NON_COLOR = new Set([
  'xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl', '8xl', '9xl',
  'left', 'center', 'right', 'justify', 'start', 'end',
  'truncate', 'text-ellipsis', 'text-clip', 'wrap', 'nowrap', 'balance', 'pretty',
  'uppercase', 'lowercase', 'capitalize', 'normal-case', 'underline', 'overline',
  'line-through', 'no-underline',
  'display', 'page', 'section', 'title', 'body', 'body-sm', 'label', 'caption', 'metric',
  'nav', 'spotlight', 'tip', 'readout',
]);

/** Split a line into the string pieces whose classes truly coexist: template
 *  static parts plus each quoted branch of an interpolation on its own, so a
 *  ternary's two branches never read as one conflicting string. */
function classSegments(source) {
  const segments = [];
  const pushQuotes = text => {
    for (const match of text.matchAll(/'([^']*)'|"([^"]*)"/g)) segments.push(match[1] ?? match[2] ?? '');
  };
  let rest = source;
  for (const template of source.matchAll(/`([^`]*)`/g)) {
    const body = template[1] ?? '';
    // Static parts outside ${...} (balanced scan so nested braces don't confuse it).
    let depth = 0;
    let current = '';
    for (let i = 0; i < body.length; i++) {
      if (body[i] === '$' && body[i + 1] === '{') {
        if (depth === 0 && current) { segments.push(current); current = ''; }
        depth++;
        i++;
      } else if (body[i] === '{') { depth++; current += body[i]; }
      else if (body[i] === '}') {
        depth--;
        if (depth === 0) { pushQuotes(current); current = ''; }
        else current += body[i];
      } else current += body[i];
    }
    if (current && depth === 0) segments.push(current);
    rest = rest.replace(template[0], ' ');
  }
  pushQuotes(rest);
  return segments;
}

function checkCompetingClasses(file, lineNo, source, emit = flag) {
  // Only single string segments: competing utilities across cn() arguments are
  // usually intentional (conditional overrides); two in ONE string never are.
  const segments = classSegments(source);
  for (const segment of segments) {
    if (!segment.includes('bg-') && !segment.includes('text-') && !segment.includes('border-')) continue;
    const tokens = segment.split(/\s+/).filter(t => t && !/[$`{}]/.test(t));
    const groups = new Map(); // "variant:base" -> tokens, e.g. "md:bg" -> ["md:bg-red-500", ...]
    for (const token of tokens) {
      const bare = token.startsWith('!') ? token.slice(1) : token;
      const parts = bare.split(':');
      const utility = parts[parts.length - 1];
      const variant = parts.slice(0, -1).join(':');
      let base = null;
      if (utility === 'bg-transparent' || utility.startsWith('bg-')) base = 'bg';
      else if (utility.startsWith('border-') && !/^border(-[xytrbl])?(-\d+)?$/.test(utility) && !/^border-(solid|dashed|dotted|double|hidden|none|collapse|separate)$/.test(utility)) base = 'border';
      else if (utility.startsWith('text-')) {
        const rest = utility.slice(5);
        if (!TEXT_NON_COLOR.has(rest) && !rest.startsWith('[')) base = 'text';
      }
      if (base) {
        const key = `${variant}:${base}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(token);
      }
    }
    for (const [key, tokens] of groups) {
      const distinct = [...new Set(tokens)];
      if (distinct.length > 1) {
        emit(file, lineNo, 'competing-classes', `${key} has ${distinct.join(' vs ')} — one silently wins`);
      }
    }
  }
}

// Every --color-* in foundations/theme.css: each one yields bg-*/border-*/text-*
// utilities, so a -[var(--mo-<name>)] arbitrary value for any of these names is
// always replaceable 1:1. Names outside this set are left alone (no utility exists).
const THEME_COLORS = new Set([
  'canvas', 'surface', 'surface-raised', 'surface-subtle', 'soft', 'surface-muted',
  'surface-interactive', 'surface-interactive-hover', 'surface-inverse',
  'ink', 'ink-muted', 'ink-subtle', 'ink-inverse',
  'line', 'line-subtle', 'line-control', 'line-strong',
  'action', 'action-hover', 'action-pressed', 'action-ink', 'action-soft', 'action-soft-hover',
  'focus', 'overlay',
  'success', 'success-soft', 'success-line', 'warning', 'warning-soft', 'warning-line',
  'danger', 'danger-soft', 'danger-line', 'info', 'info-soft', 'info-line',
  'neutral', 'neutral-soft', 'neutral-line',
]);
const VAR_UTIL_RE = /(bg|border|text)-\[var\(--mo-([a-z-]+)\)\]/g;
const VAR_Z_RE = /z-\[var\(--mo-z-(sticky|header|sidebar|overlay|dialog|popover|toast|tooltip)\)\]/g;
const PX_TEXT_RE = /text-\[[\d.]+(?:px|r?em)\]/g;
// Deferred owner visual calls (2026-10-18): glyph icons the owner has not yet
// approved replacing with SVG. Keyed file+glyph (line-independent); delete an
// entry when the site is migrated. The ratchet still fails on any NEW emoji.
const KNOWN_EMOJI_EXCEPTIONS = new Set([
  'app/documents/FileBrowser.tsx:★', // starred marker, role="img" labelled
  'app/services/page.tsx:✓', // Tick done/pending marker, role="img" labelled
]);

const HEX_RE = /#[0-9a-fA-F]{3,8}\b/g;
// A real dark: variant is glued to its utility (dark:bg-x); `dark: boolean` in a
// type annotation and `.dark` in CSS are not. The leading char class keeps those out.
const DARK_RE = /[\s'"]dark:[a-z]/g;
const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

/** Strip comments so doc text (e.g. "(Escape, outside, ✕)") never flags. */
function stripComments(source, state) {
  let out = source;
  if (state.inBlock) {
    const end = out.indexOf('*/');
    if (end < 0) return '';
    out = out.slice(end + 2);
    state.inBlock = false;
  }
  out = out.replace(/\/\*.*?\*\//g, '');
  const start = out.indexOf('/*');
  if (start >= 0) { out = out.slice(0, start); state.inBlock = true; }
  return out.replace(/(?<!:)\/\/.*$/, '');
}

/** Scan one file's text (pure over the findings it returns); the file walk below
 *  is the only impure part. Exported for the test next door. */
export function scanText(rel, text, isTsx) {
  const local = [];
  const localFlag = (line, rule, detail) => local.push({ file: rel, line, rule, detail });
  const commentState = { inBlock: false };
  text.split('\n').forEach((raw, index) => {
    const lineNo = index + 1;
    const source = stripComments(raw, commentState);
    for (const match of source.matchAll(HEX_RE)) {
      if (!BRAND_HEX.has(match[0]) && !HEX_SKIP_FILES.has(rel) && !HEX_SKIP_LINE.test(source)) {
        localFlag(lineNo, 'no-hex-in-tsx', `found ${match[0]} — use a --mo-* token or Tailwind theme color`);
      }
    }
    DARK_RE.lastIndex = 0;
    if (DARK_RE.test(source)) localFlag(lineNo, 'no-dark-variant', 'dark: variant — the app is one light appearance');
    const emoji = source.match(EMOJI_RE);
    if (emoji && !KNOWN_EMOJI_EXCEPTIONS.has(`${rel}:${emoji[0]}`)) {
      localFlag(lineNo, 'no-emoji-icon', `found ${emoji[0]} — use an inline SVG icon`);
    }
    for (const match of source.matchAll(VAR_UTIL_RE)) {
      if (THEME_COLORS.has(match[2])) {
        localFlag(lineNo, 'no-var-utility', `found ${match[0]} — use the ${match[1]}-${match[2]} theme utility (identical value)`);
      }
    }
    for (const match of source.matchAll(VAR_Z_RE)) {
      localFlag(lineNo, 'no-var-z', `found ${match[0]} — use the z-${match[1]} utility (identical value)`);
    }
    for (const match of source.matchAll(PX_TEXT_RE)) {
      localFlag(lineNo, 'no-px-text', `found ${match[0]} — use a type role (text-tip/text-caption/text-readout/…)`);
    }
    if (isTsx) checkCompetingClasses(rel, lineNo, source, (file, line, rule, detail) => local.push({ file, line, rule, detail }));
  });
  return local;
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  for (const dir of SCAN_DIRS) {
    for (const file of walk(path.join(ROOT, dir))) {
      const rel = path.relative(ROOT, file).replaceAll(path.sep, '/');
      if (SKIP_FILES.has(rel)) continue;
      findings.push(...scanText(rel, fs.readFileSync(file, 'utf8'), file.endsWith('.tsx')));
    }
  }

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(findings, null, 2));
  } else if (findings.length === 0) {
    console.log('css-consistency: no violations.');
  } else {
    for (const finding of findings) {
      console.log(`${finding.file}:${finding.line} [${finding.rule}] ${finding.detail}`);
    }
    console.log(`\ncss-consistency: ${findings.length} violation(s).`);
  }
  process.exit(findings.length === 0 ? 0 : 1);
}
