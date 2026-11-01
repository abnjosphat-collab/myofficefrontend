# Testing (frontend repo)

MyOffice has **two independent test suites** (frontend + backend). Both are fast, need no live server, database, or Redis, and mock external services.

## This repo (Vitest)

```bash
npm test          # single run
npm run test:watch
npx tsc --noEmit  # types: run before claiming UI work done
npm run docs:check  # TypeDoc contracts + migration ledger + Markdown links
```

Notable coverage:

- `app/timesheets/calcTotals.test.ts`: NEC Actual / Reg / OT caps and Excel addends.
- `lib/*.test.ts`: `authFetch`, usage analyzer derivations, `reliability.ts`, `engineeringReport.ts`.
- `components/ui-system/patterns/*.test.ts`: `deriveDataStatus` and the table sort/selection/paging logic.
- `app/inventory/inventory.test.ts`, `app/training/useTrainingData.test.tsx`: page-level storage and loading rules.

These are unit/contract tests, not end-to-end against a live DB.

The installed Vitest default reporter can suppress passing-test progress. Use `--reporter=verbose` when inspecting a long
run; a quiet console alone does not establish that workers have stalled. Wait for the exit result before reporting a gate.

The November UI remediation adds `app/overtime/SummariesView.test.tsx` for deferred success/failure/finally races,
date invalidation (including away-and-back), unmount cancellation, result/export period identity, idle/error/retry/empty
states. Shared tests cover overflow observation, valid rich notices, native checkbox behaviour and composed appearance
contrast. `e2e/ui-consistency.spec.ts` uses fixture authentication and mocked APIs to verify actual phone geometry,
keyboard metric scrolling, checkbox edge taps, obsolete summary responses, native date appearance, destructive-dialog
contrast and Tools set-line entry. Run it against the current dev server with
`npx playwright test e2e/ui-consistency.spec.ts --workers=1`. Its captures are review artifacts, not baseline updates.

## Browser verification harness (Playwright, fixture session, no live data)

These scripts render real pages in headless Chromium against a **running dev server** (default `http://localhost:3000`) with
a fake Supabase session (an admin profile) and mocked `/api/**` responses. Nothing is sent to production services; writes are
answered by the mock. They exist because type-checking and builds did not catch real defects (a server-component import
crash, role-gated controls hidden, a failed load shown as an empty list). On Git Bash set `MSYS_NO_PATHCONV=1` or `/`-prefixed
route arguments are rewritten into Windows paths.

```bash
# the shell (top bar, sidebar, settings, drawer, search) at 1440/820/390/320 px
MSYS_NO_PATHCONV=1 node scripts/verify-shell.mjs --routes /contractors,/inventory

# shell vs live /tools: computed styles, icon SVG paths, collapse, drawer, safe areas, orientations, emulated touch (44 px targets)
MSYS_NO_PATHCONV=1 node scripts/verify-shell-parity.mjs

# PWA update path (needs `npm run build`): old build -> newer deployment -> reload prompt; see docs/PWA_UPDATES.md
MSYS_NO_PATHCONV=1 node scripts/verify-pwa-update.mjs

# regenerate the dated PDF snapshot of handoff + PWA + ledger
node scripts/docs-pdf.mjs

# every route spec: ready, empty, failed load + retry, create flow, 390 px, console errors
MSYS_NO_PATHCONV=1 node scripts/verify-routes.mjs                 # all specs
MSYS_NO_PATHCONV=1 node scripts/verify-routes.mjs --only /drivers # one route

# the first three registers (older script)
MSYS_NO_PATHCONV=1 node scripts/verify-registers.mjs
```

| File | Role |
|---|---|
| `scripts/lib/fixtures.mjs` | Fixture session, profile and API routing shared by every script |
| `scripts/route-specs/*.mjs` | One spec per route: `route`, `h1`, `data` (mock responses), `ready`, `empty`, `failing`, `create`, `storage` |
| `scripts/verify-routes.mjs` | Runs the specs; screenshots go to `node_modules/.cache/mo-audit/shots-routes/` (not committed) |

Rules for writing a spec: assert behaviour that matters to a user (what is shown for a failed load, what a failed save keeps),
not markup; do not press keys before hydration; exclude the dev overlay button (`Open Next.js Dev Tools`) and the sidebar's
`Edit favourites` from broad button selectors. **A passing spec is not browser verification until the screenshots have been
looked at and the result is recorded in `docs/migration-verification.json`.**

## Migration ledger

`docs/MIGRATION_LEDGER.md` is generated: `npm run docs:ledger` rewrites it, `docs:check` fails when it is stale or when a
migrated route has no verification record or spec. The verification record is edited by hand, only after rendering.

## Not covered yet

Full motion and screen-reader behaviour, dark OS preference, real-account flows (sign-in, two-factor, sign-out), and visual
regression baselines for the new shell remain open. The scoped November suite exercises selected normal/reduced-motion paths
and feature-enabled Mono dark; it does not certify these broader areas. The Playwright accessibility and visual suites (`npm run test:a11y`,
`npm run test:visual`) predate the redesign and have not been re-run against it.

## Backend repo (pytest)

```bash
cd ../backend   # sibling checkout
./venv/Scripts/python.exe -m pip install -r requirements-dev.txt
./venv/Scripts/python.exe -m pytest -q
```

See backend `docs/TESTING.md` for file-by-file coverage.
