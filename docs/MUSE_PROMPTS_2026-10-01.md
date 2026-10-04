> **Superseded 3 Oct 2026.** The current handoff is [CURRENT_HANDOFF.md](./CURRENT_HANDOFF.md). Kept for history; do not follow its instructions where they differ.

# Paste-ready prompts for Muse Code

## Prompt A — full MyOffice takeover

Open Muse Code at `C:\Users\Administrator\Documents\studio\myoffice` and paste:

```text
Continue the MyOffice audit and transformation from the current repository
state. Do not edit immediately.

First read:
- frontend/AGENTS.md and frontend/CLAUDE.md
- frontend/docs/MUSE_HANDOFF_2026-10-01.md
- frontend/docs/DALLAGLIO_AUDIT_2026-09-26.md
- frontend/docs/TOOLS_SYSTEM_SPECIFICATION.md
- frontend/docs/CLASSIC_DESIGN_SYSTEM_ARCHIVE_2026-09-29.md
- docs/PRODUCT.md and docs/ENGINEERING_PRINCIPLES.md
- frontend/docs/ENGINEERING_STANDARDS.md
- frontend/components/shared/design-system/README.md

Then inspect both independent Git repositories, including branch, recent log,
status, remotes and current diffs. The workspace root is not a Git repository.
Expected clean pushed checkpoint: frontend main/origin/main at a992afd and
backend main/origin/main at d2e0e2a. If reality differs, preserve the actual
worktree and reconcile the handoff before editing.

Do not reset, stash, overwrite, broadly reformat, normalize line endings,
commit, push, deploy, rerun a migration or modify live business data unless I
explicitly request it.

First close the remaining read-only visual gate: in a signed-in browser, open
/overtime and verify that New Request and Bulk Entry both show a Cost centre
dropdown defaulting to Engineering with Projects, Mining Technical Services
(MTS), Mining, Stores, Human Resources and Shared Services. Do not submit a
record. Confirm non-Engineering records remain excluded from Engineering Excel
exports through existing tests/source evidence. Update the audit with only
what you actually verify.

After that, inspect the current product backlog and propose a phased plan for
retiring Classic as a runtime design so Dallaglio becomes the sole runtime
system. Preserve the Classic archive and translate its useful accessibility,
interaction and information-hierarchy principles before deleting compatibility
code. Do not begin a broad purge without a file-specific plan and acceptance
criteria.

Maintain a visible queue because I may add requirements while you work. Never
claim completion from patches alone. Distinguish implemented, automated-tested,
browser-verified, live-data-verified and still-open work.
```

## Prompt B — rendered overtime check only

```text
Work only on the remaining read-only overtime verification in
C:\Users\Administrator\Documents\studio\myoffice.

Read frontend/docs/MUSE_HANDOFF_2026-10-01.md and the 1 October overtime section
of frontend/docs/DALLAGLIO_AUDIT_2026-09-26.md. Inspect both Git worktrees before
editing; expected frontend is clean at a992afd and backend is clean at d2e0e2a.

Using an already signed-in local browser, open /overtime. Do not submit or alter
live records. Open New Request and verify Cost centre defaults to Engineering
and offers exactly: Engineering, Projects, Mining Technical Services (MTS),
Mining, Stores, Human Resources, Shared Services. Cancel. Open Bulk Entry and
verify the same dropdown and default, then cancel. Check desktop and phone-width
layout, keyboard opening/selection/Escape, focus visibility and console errors.

Fix only a concrete defect. If source changes are needed, run the focused
overtime tests, TypeScript, focused ESLint, git diff --check and production
build. Record exact evidence in the audit. Do not commit, push or deploy unless
I explicitly ask.
```

## Prompt C — Classic runtime retirement planning

```text
Plan, but do not yet broadly implement, the MyOffice Classic runtime retirement.

Read frontend/docs/MUSE_HANDOFF_2026-10-01.md,
frontend/docs/CLASSIC_DESIGN_SYSTEM_ARCHIVE_2026-09-29.md,
frontend/docs/UI_ARCHITECTURE.md and the current audit. Inspect the current
frontend tree and identify every Classic/Dallaglio selector, pre-paint branch,
storage key, provider path, token/icon mapping, AppShell preference, route-level
branch, test and browser script.

Produce a phased file-specific migration plan with acceptance criteria,
verification commands and rollback points. Preserve useful Classic principles
through the Dallaglio system before deleting Classic runtime code. Keep business
logic, accessibility, responsive behavior, reduced motion and semantic states
unchanged. Do not edit until the plan has been reviewed.
```

## Prompt D — extract `/tools` into standalone MuseOffice

Use this prompt for the user's latest direction:

```text
Build the existing MyOffice Tools & Equipment subsystem as a standalone
application inside a new folder that you create at:

C:\Users\Administrator\Documents\studio\myoffice\MuseOffice

The current implementation lives at `/tools` inside the MyOffice frontend. It
is the source product and must remain intact while the standalone application
is being built. Do not delete, retire, rewrite over or destabilize the existing
`frontend/app/tools` route. The standalone app must reach verified functional
and visual parity before any cutover is discussed.

Before editing or scaffolding anything, read:
- frontend/AGENTS.md and frontend/CLAUDE.md
- frontend/docs/MUSE_HANDOFF_2026-10-01.md
- frontend/docs/DALLAGLIO_AUDIT_2026-09-26.md
- frontend/docs/TOOLS_SYSTEM_SPECIFICATION.md
- frontend/docs/UI_ARCHITECTURE.md
- frontend/docs/ENGINEERING_STANDARDS.md
- frontend/components/shared/design-system/README.md
- backend/docs/TOOLS_WORKSPACE.md

Then inspect both existing Git repositories and the complete Tools dependency
surface, including:
- frontend/app/tools
- frontend/scripts/verify-tools.mjs
- every shared component, hook, utility, icon, font, token and package imported
  by the Tools subsystem
- frontend API proxy/routes used by Tools
- backend/app/routers/tools_workspace.py and its models/tests
- authentication/session behavior
- environment variables and deployment assumptions
- applied Tools migrations and the shared Supabase schema

The workspace root is not currently a Git repository. The expected starting
checkpoint is frontend main/origin/main at a992afd and backend
main/origin/main at d2e0e2a, plus the newer uncommitted Muse documentation
files. Preserve the actual state you find. Do not reset, stash, overwrite,
broadly reformat, normalize line endings, commit, push, deploy, rerun a
migration or modify live business data unless I explicitly request it.

PHASE 1 — REQUIREMENTS AND EXTRACTION DESIGN

Before generating the new app, write a concise implementation plan covering:
1. Functional inventory: register, search/filter/view modes, equipment detail,
   issue/return/transfer/extend, employees, trained-qualified-authorised
   eligibility, compliance, inspections, maintenance, incidents, gate passes,
   source registers, history, account access, notifications, feedback,
   analytics, exports/imports and attachments.
2. Roles and authorization: administrator, issuer and viewer boundaries;
   department scoping; backend-authoritative eligibility and write checks.
3. Domain and data contracts: types, schemas, API functions, session storage,
   error shapes, loading/stale states and audit fields.
4. Dependency map: what is Tools-owned, what currently comes from MyOffice,
   what must be copied into MuseOffice, and what should remain a deliberate API
   contract rather than shared frontend source.
5. Standalone architecture: routing, providers, authentication boundary,
   API client/proxy, state ownership, component structure, testing and build.
6. Migration/cutover strategy that leaves `/tools` working until MuseOffice is
   accepted.

If a decision can be derived safely from the repository, make it. Ask me only
for genuinely blocking product or deployment decisions. Do not scaffold first
and explain the architecture afterward.

PHASE 2 — CREATE MUSEOFFICE

After the plan is explicit, create the `MuseOffice` folder and build an
independently runnable production-quality application there. Keep the existing
technology direction unless inspection proves a change is necessary: Next.js,
React, TypeScript and owned accessible components. Minimize dependencies.

Standalone means:
- MuseOffice starts, builds and tests independently from `frontend/`.
- It has its own package manifest, configuration, environment example,
  documentation, lint/type/test commands and deployment instructions.
- It does not import source files through fragile relative paths from the
  MyOffice frontend.
- It uses the existing Tools backend and shared business data unless I
  explicitly approve a backend or database split.
- It contains only Tools & Equipment product navigation and shell—not MyOffice
  modules, AppShell, Classic design controls or unrelated homepage features.

DESIGN DIRECTION — POLISH, DO NOT REPLACE

Do not use your own default design, a generic AI dashboard, a new brand, a
purple SaaS theme, glassmorphism or a component-library demo appearance.

The design being developed in the existing `/tools` route is the required
starting point:
- near-white canvas
- charcoal-green primary structure
- pale sage interactive surfaces
- restrained mineral-green focus and hover glow aligned to borders
- one balanced tonal theme rather than light/dark switching
- nearly square softened corners around 7px
- no tile lift, translate or scale on hover
- equipment tiles without decorative equipment-family icons
- thin, purposeful iconography for navigation and actions only
- colour reserved for semantic states, notifications and polished data
  visualizations
- compact, professional industrial information density
- truthful progressive loading, stale, unavailable, retry, empty and populated
  states

Polish this exact direction. Improve proportion, hierarchy, spacing,
typography, alignment, focus treatment, micro-interactions, loading animation,
responsive behavior and consistency. Reuse the product's existing tokens and
interaction principles where they are sound. If you change a token or visual
rule, explain why it improves the same direction rather than introducing a new
one.

QUALITY AND SAFETY

- Preserve WCAG AA contrast, visible keyboard focus, semantic controls,
  reduced-motion support and at least 44px coarse-pointer targets where needed.
- Never show a failed request as a real zero or empty register.
- Supabase may wake slowly; use bounded retries, progressive independent source
  loading, stale-data preservation and an eventual truthful retry state.
- Do not weaken trained/qualified/authorised rules to make employee choices
  appear populated.
- Never put privileged provider or service-role credentials in the frontend.
- Do not use or mutate live business data for testing. Use deterministic
  fixtures or read-only verification.
- Preserve audit actors, server timestamps and backend authorization.

IMPLEMENTATION ORDER

Implement incrementally in logical units:
1. standalone shell, tokens, fonts and accessible primitives
2. typed API/session layer and truthful source-state model
3. equipment register and detail
4. movement workflows and eligibility
5. employee/compliance/inspection/maintenance controls
6. gate passes, history, sources, notifications and account access
7. analytics, imports/exports, feedback and attachments
8. responsive/accessibility polish and complete verification

At each unit, run the smallest relevant tests and inspect the rendered result.
Do not claim completion from source changes alone.

DEFINITION OF DONE

MuseOffice is done only when:
- it installs, lints, type-checks, tests and production-builds independently
- all required Tools workflows and role boundaries are present
- deterministic browser verification covers desktop and approximately 390px
- loading, stale, unavailable, retry, empty and populated states are proven
- keyboard, pointer and reduced-motion behavior are checked
- no horizontal overflow or obvious console/runtime error remains
- the visual result is recognizably the polished evolution of the existing
  `/tools` design, not a replacement design
- architecture, environment setup, testing, deployment and cutover are
  documented
- the existing MyOffice `/tools` route still works and has not been retired
  without my explicit approval

Maintain a visible work queue throughout. Clearly separate implemented,
automated-tested, browser-verified and still-open items. When the standalone
app is fully verified, stop and present the result and cutover options. Do not
commit, push, deploy or change live data unless I explicitly request it.
```
