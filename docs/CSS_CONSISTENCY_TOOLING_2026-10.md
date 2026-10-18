# CSS consistency tooling — October 2026

Companion to the other session's `CSS_UPGRADE_PROPOSAL_2026-10.md` (package
health + CSS modernity, already implemented C1). This note covers the other
half of Item 6: tooling that keeps the existing design consistent. No package
was installed, removed, or updated; no lockfile touched.

## Evaluation (independently measured, 2026-10-17)

The upgrade proposal's styling claims re-checked by grep, and they hold:

- Hex in shipped TSX: only the four Google-brand SVG fills (must stay
  byte-identical) plus PWA `themeColor` metadata. Component styling is
  token-driven throughout.
- `dark:` Tailwind variant: zero uses — one light appearance confirmed.
- `!important`: only the reduced-motion guard, print rules, and the
  guidance-off rule. All legitimate.
- The repeat bug the codebase keeps re-learning is competing utilities in
  one `className` string (`bg-*` vs `bg-*`), plus text glyphs used as
  icons. Both are now machine-checked (below) instead of review-checked.

## Shipped: scripts/css-consistency.mjs (zero dependencies)

Usage: `node scripts/css-consistency.mjs` (exit 1 on violations).

| Rule | What it catches |
|---|---|
| `competing-classes` | Two `bg-*` / `text-*` colors / `border-*` colors in one string, same variant. Skips `cn()` args, ternary branches, type roles (`text-body` + `text-ink` is size+color, not a conflict), widths (`border-b-2`), and non-color `text-*`. |
| `no-hex-in-tsx` | Hex outside the brand allowlist, PWA meta, and canvas/PDF/3D helpers (whose APIs take literal colors). |
| `no-dark-variant` | `dark:` utilities (type annotations like `{ dark: boolean }` excluded). |
| `no-emoji-icon` | Glyph icons in markup (comments excluded). |

Tests: `lib/css-consistency.test.ts` (9 tests over crafted inputs, each rule
plus every allowlist). Scratch, preview and concept trees are out of scope
by path (`home-preview`, `wireframes`, `test-homepage`, `timesheets - Copy`,
preview modules).

Current output: **2 findings**, both pre-existing, both left for the owner
(they sit in files this run does not own and swapping them changes look):

- `app/documents/FileBrowser.tsx:74` — ★ starred marker (has `role="img"`).
- `app/services/page.tsx:30` — ✓/– completion tick (has `role="img"`).

## Proposed next steps (STOP — owner word needed)

1. **Wire the check into CI** (e.g. alongside `docs:check`). Not done here:
   `package.json` and the docs-ledger script are dirty with the other
   session's work, and a new red gate must not land mid-flight. Land it on
   a clean tree with the two findings fixed or allowlisted.
2. **Fix or accept the 2 findings.** Each is a 5-minute SVG swap; each
   changes a rendered glyph, so it is the owner's visual call.
3. **Formatter (new package).** No prettier/biome is configured; formatting
   consistency is currently unowned. Proposing `prettier` + a `format`
   script and a lint-staged-style pre-commit hook — needs the owner's
   package approval, so STOP here.
4. **Deeper linting (new packages).** `eslint-plugin-tailwindcss` (class
   order + duplicate detection at edit time) would subsume half of the
   script above once installed; `stylelint` for the 9 stylesheets. Same
   STOP: owner approval first.
5. **Do not duplicate the upgrade proposal.** Package removals (P1),
   updates (P2/P3), and the jspdf overlap investigation (P6) already have
   owners and verdicts there; this note deliberately takes no second
   position on any of them.
