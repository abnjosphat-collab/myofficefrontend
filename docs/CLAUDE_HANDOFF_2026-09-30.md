# MyOffice takeover handoff for Claude — 30 September 2026

## Purpose

This is the current source-of-truth handoff for continuing MyOffice after the
ChatGPT/Codex work. It is based on the repository state inspected through 1
October 2026, the dated Dallaglio audit, existing handoffs, Git history, and
the latest rendered verification. Do not rely on older handoffs without
reconciling them against this file and the live worktrees.

MyOffice is an existing mine-engineering ERP/MIS. It centralises maintenance,
work orders, personnel, timesheets, overtime, leave, safety, documents,
portable tools and related operational records. The product quality standard
is precision-grade: technically functional but visibly improvised work is not
finished.

## Start here

Before editing anything:

1. Open `C:\Users\Administrator\Documents\studio\myoffice`.
2. Read `frontend/AGENTS.md` and `frontend/CLAUDE.md`.
3. Read this file and `frontend/docs/CLAUDE_PROMPTS_2026-09-30.md`.
4. Read `frontend/docs/DALLAGLIO_AUDIT_2026-09-26.md`.
5. Read `frontend/docs/TOOLS_SYSTEM_SPECIFICATION.md` for Tools work.
6. Read `frontend/docs/CLASSIC_DESIGN_SYSTEM_ARCHIVE_2026-09-29.md` before
   touching design-language retirement.
7. Read `docs/PRODUCT.md`, `docs/ENGINEERING_PRINCIPLES.md`,
   `frontend/docs/ENGINEERING_STANDARDS.md`, and
   `frontend/components/shared/design-system/README.md`.
8. Inspect both Git repositories and all current diffs before editing.

`frontend/CLAUDE.md` delegates to `frontend/AGENTS.md`. Next.js is 16.3.3 in
the installed workspace; the AGENTS rule requires reading the relevant local
Next.js documentation under `frontend/node_modules/next/dist/docs/` before
changing Next.js APIs or conventions.

## Workspace and repositories

The workspace root is **not** a Git repository. There are two independent
repositories:

| Repository | Path | Branch / inspected HEAD | Remote | State at handoff |
|---|---|---|---|---|
| Frontend | `frontend/` | `main` at `5c26209` | `https://github.com/abnjosphat-collab/myofficefrontend.git` | Dirty, intentional `/tools` and overtime work |
| Backend | `backend/` | `main` at `d2e0e2a` | `https://github.com/abnjosphat-collab/myofficebackend.git` | Clean |

Both inspected HEADs equal `origin/main`. Do not reset, stash, checkout over,
or broadly reformat the frontend worktree. Do not normalize its LF/CRLF
warnings. Do not commit, push, deploy, run migrations, or modify live business
data unless the user explicitly asks.

Useful inspection commands from the workspace root:

```powershell
git -c safe.directory=C:/Users/Administrator/Documents/studio/myoffice/frontend -C frontend status --short --branch
git -c safe.directory=C:/Users/Administrator/Documents/studio/myoffice/backend -C backend status --short --branch
git -c safe.directory=C:/Users/Administrator/Documents/studio/myoffice/frontend -C frontend diff --stat
git -c safe.directory=C:/Users/Administrator/Documents/studio/myoffice/frontend -C frontend diff -- app/tools
```

The explicit `safe.directory` flag is needed in sandboxed agents because the
host and sandbox Windows accounts differ.

### Latest local continuation — 1 October 2026

- Preserve all previously dirty Tools files plus the new local overtime changes in `app/overtime/page.tsx`, `app/overtime/types.ts`, and `app/overtime/calcOvertime.test.ts`; none is committed or pushed.
- Tools now uses a near-white, charcoal-green and pale-sage tonal palette. The shared radius is `7px`; controls use one subtle translucent mineral-green halo; equipment cards change shade and glow without translate/scale. Initial loading uses a progress track, activity bars and register-shaped skeletons. `scripts/verify-tools.mjs` now verifies the single tonal theme, focus/hover computed styles and desktop/mobile captures.
- The complete Tools browser verifier passes with read-only fixtures and blocked writes. The focused screenshot review confirms the Settings halo follows its border, the active card remains stationary, and the mobile workspace has no horizontal overflow.
- Final validation passes TypeScript, TypeDoc contract checking, `git diff --check`, focused ESLint with zero errors, and the Next.js 16.3.3 production build with all 60 routes. Fourteen existing overtime warnings remain; no new lint error was introduced.
- Overtime create and bulk forms now use the canonical `SelectField` for cost centre. Engineering is the default, followed by Projects, Mining Technical Services (MTS), Mining, Stores, Human Resources and Shared Services. A legacy value remains selectable during edits instead of being silently coerced. The Engineering-only export behavior is unchanged.
- The focused overtime suites pass 38/38; focused ESLint has zero errors and TypeScript passes. A rendered protected-modal check is still open because the controllable in-app browser is signed out. The user is signed in in external Edge, but that Edge instance is not exposed to the current browser connector. Do not weaken the auth boundary or request credentials merely to close this check.

## Latest product decisions

These are the latest user directions and supersede conflicting older notes:

- The end state is one Dallaglio runtime design system. Classic is to be
  retired, with its useful principles preserved in documentation rather than
  retained as runtime styling or compatibility branches.
- `frontend/docs/CLASSIC_DESIGN_SYSTEM_ARCHIVE_2026-09-29.md`, `.docx`, and
  `.pdf` preserve the Classic principles. Do not delete or overwrite them.
- Classic retirement is **not implemented yet**. The current runtime still has
  `classic | dallaglio`, `myoffice_design`, Classic icon/token branches, and
  explicit Classic code across many files. `frontend/app/layout.tsx` still
  forces `/tools` to `classic` at the document-root design attribute while the
  standalone Tools CSS owns the actual workspace appearance. An inspection
  found 33 runtime/test files mentioning Classic/design selection. Do not
  claim retirement is complete.
- `/tools` is the current visual pilot. Its specialist layout remains
  self-contained until the user approves the result for broader adoption.
- For the Tools pilot, the user requested a single balanced neutral appearance,
  no light/dark toggle, no background-preview control, nearly square softened
  corners, no lift animation, and soft shade/glow feedback. Color remains for
  semantic states, notifications, and data visualisation.
- The clarified icon request was to remove icons from **equipment tiles**. Do
  not globally remove semantic navigation, action, status, accessibility, or
  visualisation icons. Detail views may still show a photograph or technical
  placeholder through `ToolSymbol`.
- Supabase is on a free tier. Initial wake-up may take one or two minutes. Do
  not immediately turn a transient delay into a failed or empty state. Keep
  progressive source loading, bounded retries, stale-data preservation, and a
  truthful eventual unavailable/retry state.
- The user expects ultra-high visual quality across typography, iconography,
  visualisation, spacing, motion, loading, errors, empty states and responsive
  behaviour. Source correctness alone is not visual acceptance.
- The user frequently adds requirements while work is underway. Maintain a
  visible queue/plan, do not silently drop earlier requests, and report what is
  implemented versus tested versus rendered.

## Architecture that must be preserved

- Frontend: Next.js App Router, React 19, TypeScript, Tailwind semantic
  variables, Radix primitives, shadcn-style owned components, Framer Motion,
  Recharts/Plotly where already used, and the MyOffice shared design system.
- Backend: FastAPI, Pydantic, Supabase/Postgres, explicit migrations and router
  tests.
- Deployment architecture remains the existing frontend repository/Vercel,
  backend repository/Render, and shared Supabase project. Do not split Tools
  into another database, repository, or deployment.
- Provider/service-role credentials remain backend-only.
- Failed requests must never appear as plausible zeroes or empty registers.
- Business rules belong in tested calculation/domain/router code, not only in
  JSX. Preserve authenticated actors, server timestamps and audit history.
- Do not change NEC timesheet/payroll calculations, work-order statuses,
  overtime/leave authority, or destructive workflows without tracing their
  dedicated documentation and tests.

The maintained UI architecture is documented in
`frontend/docs/UI_ARCHITECTURE.md`. Do not add Material UI, Chakra, Ant Design,
or another competing framework unless the user accepts a formal architecture
decision. The existing Radix + shadcn-style + MyOffice design-system stack is
intentional.

## Major work already completed and pushed

The audit record contains dated evidence and exact limitations. The current
pushed checkpoint includes, among other work:

- System-wide Dallaglio route audits and resilience corrections across active
  personnel, equipment, leave, timesheets, overtime, PPE, training, documents,
  noticeboard, admin/shared lists, breakdowns, safety, maintenance, services,
  compressors, shifts, Pachedu, Spares and Tools routes.
- Shared loading/error/empty/stale patterns and protection against stale or
  out-of-order responses on the audited routes.
- Full-width Dallaglio page corrections where dense operational pages were
  unnecessarily capped.
- Portable Tools persistent Supabase workspace, Admin/Issuer/Viewer roles,
  departmental custody, progressive loading, evidence, source registers,
  analytics, feedback, notification state, durable history and undo/restore.
- Portable Tools SOP controls: trained/qualified/authorised competency,
  inspection schedules, maintenance/storage details, incident handling,
  repair economics, gate-pass approval chain, credential/PIN-protected
  signatures, PDF output, and eligibility enforcement in frontend and backend.
- Employee grouping by department and per-equipment eligibility. Issue and
  transfer enforce eligibility on both UI and backend.
- Tools issue-form predictive employee selection, portal pointer-event repair,
  keyboard/touch acceptance, contextual autofill and whole-field date pickers.
- Tools progressive-source loading so a slow History/Analytics/Compliance
  request cannot block the equipment register.
- Overtime cost-centre support and export exclusion for overtime charged to a
  non-Engineering department.
- Documentation architecture, frontend TypeDoc checks, backend Sphinx setup,
  and Classic design-system archive in Markdown, Word and PDF.

Relevant pushed commits:

- Frontend `5c26209` — `feat: refine tools access and overtime cost centres`
- Frontend `dd75b27` — `feat: standardize monochrome theme and documentation`
- Frontend `babc00d` — `fix(tools): polish issue form interactions`
- Frontend `ec9c068` — `feat(tools): polish analytics and document system design`
- Frontend `9518a0a` — `fix(tools): improve loading and workspace header`
- Frontend `fe9757c` — `feat: complete dallaglio audit follow-ups`
- Backend `d2e0e2a` — `feat: enforce tools eligibility and overtime cost centres`
- Backend `5d3de2d` — `feat: add portable tools compliance controls`

## Production migrations already applied

Do not reapply these blindly:

- Supabase project ID recorded by the audit: `geomlsxphwaxpaloweky`.
- `backend/supabase_migration_tools_workspace_sop_controls.sql` was validated
  with a rollback, then applied with its real commit on 29 September 2026.
  Read-only verification confirmed 7 tables, RLS on all 7, 3 functions, 3
  account columns, 21 equipment columns and complete storage backfill.
- `backend/supabase_migration_overtime_cost_centre.sql` was applied on 30
  September 2026. Verification confirmed a non-null text `cost_centre` column,
  default `Engineering`, and no null/blank legacy values.
- The project has no `public.schema_migrations` table. Tracking attempts return
  PostgREST `PGRST205`. The schema changes are applied even though the optional
  repository tracking command cannot list them.

Never expose credentials from environment files or browser storage in a
handoff, log, screenshot, or prompt.

## Current uncommitted frontend work

The following changes are intentional and must be preserved:

```text
 M app/tools/AnimatedSelect.tsx
 M app/tools/EquipmentIcon.tsx
 M app/tools/ToolSymbol.tsx
 M app/tools/ToolsAnalytics.tsx
 M app/tools/ToolsCustomize.tsx
 M app/tools/ToolsIcon.tsx
 M app/tools/ToolsRegister.tsx
 M app/tools/ToolsUI.tsx
 M app/tools/interactions.test.tsx
 M app/tools/layout.tsx
 M app/tools/page.tsx
 M app/tools/tools.module.css
 M app/tools/toolsPreferences.test.ts
 M app/tools/toolsPreferences.ts
 M app/tools/toolsSearch.ts
?? app/tools/toolsSession.test.ts
?? app/tools/toolsSession.ts
```

At initial handoff inspection the diff was 99 insertions and 139 deletions
across 14 tracked files, plus the two new session files. The follow-up
department-selector correction also intentionally modifies
`AnimatedSelect.tsx` and `tools.module.css`.

### Intent of the dirty changes

- `toolsSession.ts` introduces a versioned browser-local session envelope,
  migrates the old `myoffice.tools.session.v1` record, clears malformed or
  tokenless records, and keeps tokens out of URL query/hash state.
- `page.tsx` uses the session helper for login, registration, validation,
  signing-PIN updates and logout. Logout now immediately opens the required
  non-dismissible `Sign in or sign up` dialog.
- Sharing a URL does not share the localStorage session. This is normal
  origin/profile isolation. Do not overstate the random browser ID as a
  cryptographic security boundary; backend token validation, browser profile
  isolation, XSS prevention and session expiry remain authoritative.
- Tools appearance switching, appearance search actions and persisted
  appearance preference are removed. The workspace now has one tonal theme.
- Equipment icon-family selection is removed from Settings and preferences.
- Equipment tile icon markup and tile action/location icons are removed. Card
  content is textual and scan-first. Technical placeholders remain available
  outside tiles where a detail view lacks a photograph.
- The Tools appearance analytics ring and theme-related analytics text are
  removed. Operational analytics and colourful data visualisations remain.
- The tile lift interaction is removed. Hover/focus changes shade, border and
  a restrained glow without translate/scale.
- The failed black-heavy pilot was replaced with a **soft monochrome tonal
  hierarchy**: near-white canvas, white raised/header surfaces, warm-light-gray
  equipment surfaces, darker neutral hover/focus boundaries, dark ink, and
  charcoal reserved for strong actions.
- Current main tokens in `tools.module.css`:
  - canvas `#f5f5f2`
  - paper `#fefefd`
  - raised surface `#fafaf8`
  - equipment surface `#ecece8`
  - interactive surface `#e5e5e0`
  - hover surface `#dcdcd6`
  - ink `#1d1f20`
  - shared radius `7px`
- The department selector is now one compact labelled workspace-scope control
  (`Department` + current department), not a bordered field containing a
  second bordered field. Its trigger is 190 x 36px on desktop and 142 x 34px
  at 390px. The portaled menu now inherits the shared radius token and remains
  inside the viewport without causing horizontal overflow.
- `/tools` metadata theme colour changed from dark to light neutral.

## Validation of the current dirty work

Run on 30 September 2026:

- Focused ESLint on `page.tsx`, `toolsSession.ts` and its test: passed.
- `npx tsc --noEmit`: passed.
- `toolsSession.test.ts`: 2 passed.
- `toolsSearch.test.ts`: 5 passed.
- `EquipmentIcon.test.tsx`: 2 passed.
- `git diff --check`: passed; only expected LF-to-CRLF notices were printed.
- Search for stale `surface-strong-hover`, `surface-strong-ink`,
  `surface-strong-muted`, `dark:`, `hover:-translate` and `hover:scale` under
  `app/tools`: no matches.
- Final `next build`: passed with Next.js 16.3.3, TypeScript passed, and all 60
  static routes generated. A second earlier build also passed.
- Desktop signed-out browser verification: default `Sign in or sign up` dialog
  visible after session validation; it is non-dismissible while unauthenticated.
- Mobile signed-out browser verification at 390 x 844: dialog is usable without
  visible clipping.
- Rendered computed values: top bar and department control use the light raised
  surface; the department trigger and portaled menu both compute to `7px`.
- Follow-up selector verification: its existing keyboard/portal interaction
  test passed; TypeScript passed; Playwright rendered the open selector at
  1440 x 900 and 390 x 844 with no document-level horizontal overflow.

### Validation limitation and runner issue

- The final soft-tonal header and equipment cards were **not rendered with live
  signed-in records** because the automation session would have had to submit
  the browser's saved credentials. Do not call this signed-in visual acceptance.
- `toolsPreferences.test.ts` hangs before executing any test, even alone with a
  single worker. It prints the Vite native-config warning but no assertion
  failure. A broader focused Vitest batch also stayed alive after seven tests
  had passed. Earlier checkpoints already recorded monolithic Vitest runner
  hangs. Diagnose the runner/config lifecycle separately; do not misreport a
  timeout as a failed assertion or a pass.

## Exact next work

### Immediate checkpoint: finish the dirty Tools pilot

1. Reinspect both worktrees, this handoff, the audit and the full `/tools` diff.
2. Start or reuse the local frontend and backend without changing live data.
3. With explicit user permission to submit saved credentials, sign into the
   local `/tools` page. Allow the free-tier backend time to wake up.
4. Verify populated equipment cards, header, labelled department dropdown,
   search/filter/actions, grid/list modes and Settings at desktop width.
5. Verify the same at approximately 390px. Check document/main overflow.
6. Confirm cards never lift or scale, the active card changes shade and gets a
   soft focus/hover glow, tiles contain no equipment icons, and status colours
   remain semantic.
7. Open the account profile, log out, and verify the auth dialog appears
   immediately and cannot be dismissed. Do not expose credentials or tokens.
8. Inspect console errors. Distinguish an unrelated global stale Supabase token
   warning from Tools-specific errors.
9. Fix only defects actually found, rerun focused checks and the production
   build, then append truthful evidence to
   `frontend/docs/DALLAGLIO_AUDIT_2026-09-26.md`.
10. Ask before committing or pushing unless the user explicitly included that
    instruction in the current request.

### After the Tools checkpoint

Plan Classic retirement as a separate, measured migration. The archive defines
what to preserve and what to remove. Do not combine a broad Classic purge with
the dirty Tools checkpoint. First inventory design selection, pre-paint logic,
providers, tokens, icon maps, app-shell controls, route branches, CSS bases,
tests and verification scripts. Translate retained behaviour to Dallaglio,
remove runtime compatibility incrementally, and prove each phase with focused
tests plus rendered route checks.

Other audit limitations that remain relevant:

- Timesheets still need deeper light/touch/keyboard/drag-fill/payroll-export
  browser interaction evidence.
- Notice Board retains a duplicate initial request, no stale-response guard and
  a nested modal scroll concern.
- Training and Inventory still use in-memory sample data that does not survive
  a backend restart.
- Admin destructive/permission workflows require controlled test users and
  must not be exercised against live accounts casually.
- Tools quarterly inspection colours are provisional pending mine policy.
- Gate-pass cancellation/closure and a distinct incident-investigating flow
  remain policy/product decisions in the Tools specification.
- Cross-browser certification, destructive writes and supervised operational
  acceptance are not proven by the read-only audit.

## Important files

| Purpose | File |
|---|---|
| Product quality bar | `docs/PRODUCT.md` |
| Engineering process | `docs/ENGINEERING_PRINCIPLES.md` |
| Frontend standards | `frontend/docs/ENGINEERING_STANDARDS.md` |
| Frontend documentation map | `frontend/docs/README.md` |
| UI architecture | `frontend/docs/UI_ARCHITECTURE.md` |
| Shared design system | `frontend/components/shared/design-system/README.md` |
| Current audit evidence | `frontend/docs/DALLAGLIO_AUDIT_2026-09-26.md` |
| Tools formal baseline | `frontend/docs/TOOLS_SYSTEM_SPECIFICATION.md` |
| Tools backend contract | `backend/docs/TOOLS_WORKSPACE.md` |
| Classic preservation/retirement map | `frontend/docs/CLASSIC_DESIGN_SYSTEM_ARCHIVE_2026-09-29.md` |
| Previous historical handoff | `docs/CHAT_HANDOFF_DALLAGLIO_2026-09-27.md` |
| Tools browser verifier | `frontend/scripts/verify-tools.mjs` |
| Tools API | `backend/app/routers/tools_workspace.py` |
| Tools page | `frontend/app/tools/page.tsx` |
| Tools visual contract | `frontend/app/tools/tools.module.css` |

`docs/PRODUCT.md` currently mentions nonexistent
`frontend/docs/PORTABLE_TOOLS.md` and `backend/docs/PORTABLE_TOOLS.md`. The real
maintained sources are `frontend/docs/TOOLS_SYSTEM_SPECIFICATION.md` and
`backend/docs/TOOLS_WORKSPACE.md`. Correct that stale cross-reference in a
small documentation-only change when appropriate; do not create duplicate
authoritative documents.

## Verification commands

From `frontend/`:

```powershell
.\node_modules\.bin\eslint.cmd app/tools/page.tsx app/tools/toolsSession.ts app/tools/toolsSession.test.ts
.\node_modules\.bin\tsc.cmd --noEmit
.\node_modules\.bin\vitest.cmd run app/tools/toolsSession.test.ts --maxWorkers=1 --no-file-parallelism --reporter=verbose
.\node_modules\.bin\vitest.cmd run app/tools/toolsSearch.test.ts app/tools/EquipmentIcon.test.tsx --maxWorkers=1 --no-file-parallelism --reporter=verbose
.\node_modules\.bin\next.cmd build
git diff --check
```

For backend Tools changes, from `backend/`:

```powershell
.venv\Scripts\python.exe -m pytest tests/test_tools_workspace_router.py -q
```

Do not start with the entire frontend Vitest suite; use the smallest relevant
tests first because the current Windows/Vitest process can stay alive without
reporting assertions.

## What must not be undone

- Do not discard or overwrite the dirty `/tools` work listed above.
- Do not restore the black-heavy card/header experiment.
- Do not restore background previews, duplicate header text-size controls,
  appearance switching or equipment icon-family settings in `/tools`.
- Do not put equipment icons back into register tiles.
- Do not weaken trained/qualified/authorised eligibility to make employee
  dropdowns appear populated.
- Do not remove progressive source loading, stale-response protection or
  truthful unavailable/retry states.
- Do not rerun applied production migrations without a schema preflight and
  explicit user instruction.
- Do not mutate live business data for visual verification.
- Do not remove the Classic archive. Retire runtime code only after translating
  and verifying retained principles.
- Do not claim the whole application, Classic retirement, or signed-in Tools
  pilot is complete without the missing evidence.

## Communication style expected by the user

- Take ownership of design decisions when the user says a UI is poor.
- Research and plan before implementation, then verify the rendered result.
- Explain failures honestly and distinguish implementation, automated tests,
  browser checks and unverified flows.
- Keep a queue when the user adds requests; do not silently ignore earlier
  requirements.
- Be concise in routine updates but comprehensive in handoffs and audit
  evidence.
