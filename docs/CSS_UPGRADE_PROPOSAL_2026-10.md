# CSS + package upgrade proposal — October 2026

Review of the frontend's CSS modernity and dependency health, run after the
shared-component quality scan. Method: measure everything by grep/count/direct
read (no impressions), propose in a table with verdicts, STOP before any new
or removed package, implement only safe shared-level items.

## Baseline (measured 2026-10-16)

Toolchain: Next 16.3.8 (Turbopack) · React 19.2 · Tailwind v4.1.17 CSS-first
(no config file; `@theme inline`, `@utility`, `@custom-variant` in CSS) ·
TypeScript 5.9 · 61 deps + 23 devDeps · no browserslist (Next default).

CSS volume: 9 stylesheets, 44 KB source → 113 KB emitted (5 files, main
90 KB). JS: 104 route chunks, 9.1 MB total (largest single chunk 1.4 MB).

Modern CSS already in use: `color-mix` ×19 · `@layer` · `clamp()` ·
`:is()`/`:where()` · `text-wrap` ×2 · `@keyframes` ×9 · capability-only
`@media` ×10 (reduced-motion 4, print 3, contrast, forced-colors,
coarse-pointer — zero viewport-width layout queries; responsive lives in
Tailwind classes and `hideBelow` ×140 / `max-md:` ×28). Motion is
token-driven (120/180/260 ms + easings) with a structural reduced-motion
guard; Dialog animates via tw-animate-css fades.

Deliberately absent (audited, no use case found): container queries,
`:has()` in CSS, `light-dark()`, `@property`, `@scope`, nesting,
`interpolate-size`, `field-sizing`, `aspect-ratio` in CSS, `@supports`,
relative color syntax, View Transitions.

Smell counts: hex in TSX 11 — all PWA meta, favicon, Google-brand SVG,
WebGL/canvas defaults (zero in component styling); `style={{}}` 53 —
every shared-level one is dynamic (sizes, safe-area, CSS-var sets), 24
sit in compressors (other session's new module); `dark:` classes 0 —
the app is one light appearance (pre-paint strips `dark`);
`!important` 5 — all inside the reduced-motion guard.

Packages: 62 outdated (list: `tmp/outdated-2026-10.txt`), almost all
minor/patch inside their ranges; majors pending: tanstack-table 8→9,
vitest 4→5, TS 5→7, eslint 9→10, framer-motion 12→14 (v14 is the
"motion" rename), plus day-picker/tesseract majors on unused packages.
Audit: 8 vulns (5 high / 3 moderate), all transitive — a dev-only
eslint-config-next chain and a mammoth chain with no clean fix offered.
11 installed deps have zero imports anywhere (src, tests, scripts,
configs) — see P1. xlsx (CDN tarball, 2 import files) and exceljs
(3 files) are complementary, not duplicates: xlsx reads (imports),
exceljs writes (styled exports).

Doc drift found (not touched): `docs/COLOR_HARMONY.md` specifies a
light/dark two-theme world, but the tree is one Sage appearance with
zero dark classes — the doc is stale or belongs to another track.

## Proposal table

| # | Item | Verdict | Why |
|---|---|---|---|
| C1 | Remove dead `@custom-variant dark` (`globals.css`) | SAFE NOW | Zero `dark:` uses; pre-paint removes the class. One line. |
| C2 | Rework `select option` hardcoded hex | REJECT | Native elements; one light appearance makes the explicit pair correct. |
| C3 | `text-wrap: balance` on dialog/page titles | REJECT | No wrapping title found; unobservable = churn. |
| C4 | Container queries for cards/tables | REJECT | Viewport approach passes all no-scroll specs at 4 widths. No need. |
| C5 | `@property` for animated vars | REJECT | No transition-on-variable found (ripple swaps, canvas draws). |
| C6 | `field-sizing: content` auto-grow textareas | REJECT | Manual `resize-y` exists; app-wide auto-grow is unasked behavior change. |
| C7 | `light-dark()` dual theme | REJECT | One appearance is the constraint. |
| C8 | View Transitions / new motion system | REJECT | Token motion + tw-animate already own this; no second system. |
| C9 | Nesting / logical-props refactor of the 9 files | REJECT | Zero-behavior churn (and no RTL support to serve). |
| C10 | `interpolate-size`, `@scope`, relative colors | REJECT | No use case found for any of them. |
| P1 | Remove 11 unused deps (react-hot-toast, tesseract.js, date-fns, react-day-picker, react-resizable-panels, zod, pdf-lib, html2canvas, radix-ui meta, react-hook-form, @hookform/resolvers) | PROPOSE — owner approval + clean tree | Zero imports each (verified across src/tests/scripts/configs). Blocked now: package.json + lock are dirty with another session's work. Saves install size/audit surface, not bundle bytes (unimported code doesn't ship). |
| P2 | Minor/patch batch (`npm update` in range: next 16.4, react 19.3, tailwind 4.3, radix minors, etc.) | PROPOSE — same conditions | Low risk, but touches the dirty lockfile. Full gates after. |
| P3 | Major bumps, each separately (tanstack 8→9, vitest 4→5, TS 5→7, eslint 9→10, framer 12→14 rename) | PROPOSE — owner decides each | Migration review per package; framer v14 is a rename to `motion`. |
| P4 | mammoth moderate vuln (docx import) | MONITOR | No clean fix offered (audit suggests a nonsense downgrade); local-file parsing is low exploitability. Revisit on next audit. |
| P5 | eslint-config-next high vulns (dev-only) | FOLD INTO P2 | Fast-glob/braces chain, dev tooling only. |
| P6 | jspdf (11 files) vs @react-pdf (1 file, SOPs) | PROPOSE as investigation | Real overlap, but different approaches (imperative vs components); needs per-file analysis + owner call. NOT consolidation-on-sight. |
| P7 | xlsx CDN tarball supply chain | NOTE, no action | SheetJS's sanctioned install path off-npm; lockfile pins integrity. |
| P8 | Any NEW package (virtualisation, motion, fonts, date-picker) | STOP — explicit approval required | No demonstrated need found for any of them. |

## Implemented (this run)

- C1: removed the dead `@custom-variant dark` line. Verified: production
  build green (proves the CSS still compiles), full route specs ALL
  CHECKS PASSED, axe 0 violations.

## STOP point

No package was installed, removed, or updated; no lockfile touched. P1–P3
and P6 wait on the owner (and a clean tree for anything touching
package.json). The `tmp/outdated-2026-10.txt` list and this table are the
handoff.
