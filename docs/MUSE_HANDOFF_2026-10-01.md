# MyOffice handoff for Muse Code — 1 October 2026

## Purpose

This is the current Muse-specific takeover document for MyOffice. It replaces
`MUSE_DALLAGLIO_HANDOFF.md`, which describes an older 25 September Timesheets
checkpoint and contains decisions that have since changed.

MyOffice is an existing mine-engineering ERP/MIS covering maintenance,
personnel, timesheets, overtime, leave, safety, documents, portable tools and
related operational records. The required quality bar is precision-grade:
working code is not complete until behavior, data states, accessibility and the
rendered interface have been verified.

## Read before editing

From `C:\Users\Administrator\Documents\studio\myoffice`, read:

1. `frontend/AGENTS.md` and `frontend/CLAUDE.md`.
2. This file and `frontend/docs/MUSE_PROMPTS_2026-10-01.md`.
3. `frontend/docs/DALLAGLIO_AUDIT_2026-09-26.md`.
4. `frontend/docs/TOOLS_SYSTEM_SPECIFICATION.md`.
5. `frontend/docs/CLASSIC_DESIGN_SYSTEM_ARCHIVE_2026-09-29.md`.
6. `docs/PRODUCT.md`, `docs/ENGINEERING_PRINCIPLES.md`,
   `frontend/docs/ENGINEERING_STANDARDS.md`, and
   `frontend/components/shared/design-system/README.md`.

Inspect both Git repositories before changing anything. The workspace root is
not a Git repository.

## Current Git checkpoint

| Repository | Branch and pushed HEAD | Remote | Expected state |
|---|---|---|---|
| `frontend/` | `main` at `a992afd` | `https://github.com/abnjosphat-collab/myofficefrontend.git` | Clean, equal to `origin/main` |
| `backend/` | `main` at `d2e0e2a` | `https://github.com/abnjosphat-collab/myofficebackend.git` | Clean, equal to `origin/main` |

Use explicit safe-directory flags if Muse runs under a different Windows user:

```powershell
git -c safe.directory=C:/Users/Administrator/Documents/studio/myoffice/frontend -C frontend status --short --branch
git -c safe.directory=C:/Users/Administrator/Documents/studio/myoffice/backend -C backend status --short --branch
```

Do not reset, stash, switch over, broadly reformat or normalize line endings.
Do not commit, push, deploy, run migrations or change live business data unless
the user explicitly requests that action.

## Latest completed and pushed work

Frontend commit `a992afd` contains the complete local checkpoint that was
verified and pushed on 1 October:

- `/tools` uses one self-contained near-white, charcoal-green and pale-sage
  tonal design. It has no light/dark switch or background previews.
- Equipment tiles contain no equipment-family icon, never lift or scale, and
  use a shade change plus restrained mineral-green halo for hover/focus.
- The header, selector, buttons, inputs, dialogs and cards use the shared `7px`
  radius and aligned focus treatment.
- Initial Tools loading uses a slim progress track, activity bars and
  register-shaped skeletons. Loaded records stay visible during refresh.
- Vendor-specific “Supabase may take a moment” loading copy is removed, while
  transient wake-up retries and truthful unavailable/stale states remain.
- The Tools department selector is one compact labelled control, not nested
  bordered fields.
- Tools session handling is browser-local and versioned. Logging out requires
  sign-in/sign-up again; links do not transmit another browser's saved session.
- Tools employee eligibility preserves trained, qualified and authorised as
  separate requirements. Only fully eligible employees can receive a tool.
- Overtime create and bulk forms use the shared accessible cost-centre
  dropdown. New records default to Engineering. Options are Engineering,
  Projects, Mining Technical Services (MTS), Mining, Stores, Human Resources
  and Shared Services. Legacy custom values are preserved during edits.
- Engineering Excel exports continue to exclude overtime allocated to another
  cost centre.
- Audit, documentation map, Muse/Claude takeover documentation and the
  read-only Tools browser verifier were updated.

Backend commit `d2e0e2a` contains the authoritative Tools eligibility and
overtime cost-centre support. The additive production migrations documented in
the audit were already applied. Do not rerun them without a schema preflight
and explicit user instruction.

## Verification already completed

- Focused overtime suites: 38 tests passed.
- Tools read-only Chromium verifier: passed progressive loading, transient
  `503` recovery, truthful initial/quiet failure states, issue autocomplete,
  full-field date picker behavior, department grouping, employee eligibility,
  Compliance, Gate passes, Analytics, desktop interaction styles and 390px
  overflow. It blocked every non-GET application request.
- TypeScript: passed.
- TypeDoc contract check: passed.
- Focused ESLint: zero errors; 14 existing warnings remain in the large
  overtime page/test files.
- `git diff --check`: passed; Windows LF/CRLF notices are expected.
- Next.js 16.3.3 production build: passed and generated all 60 routes.
- WCAG contrast spot checks passed for the final Tools palette.

## Current limitations and next work

### Latest product direction: standalone MuseOffice

The user now wants the current MyOffice `/tools` subsystem extracted into a
standalone application. Muse must create a new sibling folder at
`C:\Users\Administrator\Documents\studio\myoffice\MuseOffice` and build the
standalone system there.

The existing `frontend/app/tools` implementation is the product and design
source, not disposable inspiration. Do not replace it with Muse's preferred
dashboard template or a new visual language. Preserve the near-white,
charcoal-green and pale-sage tonal direction, compact softened corners,
restrained aligned glow, no-lift tiles, high-quality visualization language,
truthful loading/error/empty states and existing workflow behavior. Polish
that direction through better hierarchy, spacing, typography, consistency,
responsive behavior and interaction details.

Treat this as a controlled extraction rather than a rewrite:

- Leave the existing MyOffice `/tools` route intact until the standalone app
  reaches verified parity and the user explicitly approves retirement.
- Reuse the existing Tools domain vocabulary, eligibility rules, data
  contracts, tests and browser-verification expectations.
- Keep the current backend and production data source unless the user
  explicitly authorizes a backend/database split. Standalone means an
  independently runnable frontend/product shell, not duplicated business data.
- Do not copy MyOffice AppShell, unrelated modules, Classic runtime styling or
  MyOffice-wide navigation into MuseOffice.
- Do not carry over hidden coupling accidentally. Inventory every dependency
  first and either copy the required Tools-owned implementation, replace it
  with a small MuseOffice-owned equivalent, or document a deliberate shared
  contract.
- Build requirements, architecture, domain models, function/type signatures,
  schemas and migration needs before implementation. Do not scaffold first and
  reason afterward.
- Verify desktop and mobile, keyboard and pointer interactions, loading,
  failure, empty and populated states before proposing cutover.

1. **Protected rendered overtime verification remains open.** Source and unit
   behavior are verified, but the cost-centre dropdown should still be opened
   in a signed-in browser and checked in both New Request and Bulk Entry. Do
   not submit a record merely to close this check.
2. **Live signed-in Tools pilot verification remains distinct from fixture
   verification.** The deterministic verifier passed, but do not represent a
   read-only fixture as live production acceptance.
3. **Classic runtime retirement is not implemented.** The user wants
   Dallaglio to become the sole runtime design, while preserving the useful
   principles in `CLASSIC_DESIGN_SYSTEM_ARCHIVE_2026-09-29.md`. Plan this as a
   measured migration; do not perform a blind deletion.
4. Training and Inventory still have documented persistence limitations.
5. Notice Board, broad Timesheets interactions, cross-browser certification,
   destructive workflows and supervised operational acceptance retain the
   limitations recorded in the audit.
6. Tools quarterly inspection colours remain provisional pending mine policy.

## Architectural decisions to preserve

- Keep the existing repositories, Vercel frontend, Render backend and shared
  Supabase project. Tools is a focused route, not another deployment.
- Frontend stack: Next.js App Router, React 19, TypeScript, Tailwind semantic
  variables, Radix primitives, owned shadcn-style components, Framer Motion,
  and existing Recharts/Plotly usage.
- Backend stack: FastAPI, Pydantic and Supabase/Postgres with explicit
  migrations and router tests.
- Do not add Material UI, Chakra UI, Ant Design or another competing component
  framework without an architecture decision.
- Provider and service-role credentials stay backend-only.
- Failed reads must never appear as plausible zeroes or empty registers.
- Preserve NEC payroll rules, work-order statuses, approval authority,
  server-side access control, audit actors and server timestamps.
- Supabase is on a free tier. Allow reasonable wake-up time while retaining an
  eventual truthful retry/unavailable state.
- Maintain a visible queue when the user adds requirements; never silently
  drop earlier work.

## Files most likely to matter next

| Purpose | Path |
|---|---|
| Current audit evidence | `frontend/docs/DALLAGLIO_AUDIT_2026-09-26.md` |
| Tools requirements and architecture | `frontend/docs/TOOLS_SYSTEM_SPECIFICATION.md` |
| Classic preservation map | `frontend/docs/CLASSIC_DESIGN_SYSTEM_ARCHIVE_2026-09-29.md` |
| UI architecture | `frontend/docs/UI_ARCHITECTURE.md` |
| Engineering standards | `frontend/docs/ENGINEERING_STANDARDS.md` |
| Tools page | `frontend/app/tools/page.tsx` |
| Tools visual contract | `frontend/app/tools/tools.module.css` |
| Tools browser verifier | `frontend/scripts/verify-tools.mjs` |
| Overtime page and domain vocabulary | `frontend/app/overtime/page.tsx`, `frontend/app/overtime/types.ts` |
| Overtime calculations/export filtering | `frontend/app/overtime/calcOvertime.ts` |
| Tools backend router | `backend/app/routers/tools_workspace.py` |

## What Muse must not undo

- Do not restore the rejected black-heavy Tools cards/header.
- Do not restore Tools light/dark switching, background previews, equipment
  icon-family settings or equipment icons inside register tiles.
- Do not restore lift/translate/scale hover motion.
- Do not weaken trained/qualified/authorised eligibility to populate a list.
- Do not replace the overtime dropdown with unrestricted free text.
- Do not include non-Engineering overtime in Engineering Excel exports.
- Do not remove progressive loading, stale-response protection or truthful
  unavailable/retry states.
- Do not delete the Classic archive while retiring Classic runtime code.
- Do not claim rendered, live-data or cross-browser verification that was not
  actually performed.

## Recommended first action

Inspect both worktrees and confirm the checkpoint above. Then follow Prompt D
in `MUSE_PROMPTS_2026-10-01.md`: analyze the existing `/tools` subsystem,
produce the standalone extraction plan, and create `MuseOffice` only after the
plan and dependency boundary are explicit. Preserve the existing route while
building and verifying the new application.

## Addendum — Tools precision polish, 2 October 2026 (uncommitted)

The MuseOffice merge back into `/tools` is done (frontend HEAD `97c93bb`).
Since this handoff, the `/tools` pilot received a visual-polish pass that is
currently **uncommitted local work** on top of the pending authentication
changes (`ToolsAuth.tsx`, `toolsApi.ts`, `toolsApi.test.ts`, `page.tsx` login
surfacing — all preserved):

- Sidebar: shared 26px icon cell, green duotone nav icons, spotlight with pale
  selected background plus solid chip, no hover movement, explicit mobile
  label hiding, `aria-current` preserved.
- Dropdowns: content-sized portal menus (340px cap) with ellipsis, distinct
  hover/selected fills, and an explicit portal focus contract.
- Homepage renamed to Overview with scope-only header, operations-first order,
  labelled Workspace shortcuts, and a new attention-failed guard.
- Green accents consolidated on `--accent` aliases of the existing
  `--brand` tokens; department trigger glow flattened.

Details and verification evidence: the `Tools precision polish — 2 October
2026` entry in `DALLAGLIO_AUDIT_2026-09-26.md` and
`docs/tools-polish-2026-10-02/before/` plus `after/`. Do not commit, push,
deploy, or migrate without an explicit user request.
