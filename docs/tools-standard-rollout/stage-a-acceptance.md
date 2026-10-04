# Stage A — Acceptance checklist

Date: 2026-10-02. Companion to [stage-a-brief.md](./stage-a-brief.md).

> Provenance: the original Stage A prompt's §5 text was not found as a
> file in the workspace, so this checklist is **reconstructed** from the
> sources cited per item (route inventory, `TOOLS_DESIGN_STANDARD.md`
> review checklist, the 2-Oct polish-prompt verification section,
> `ENGINEERING_STANDARDS.md`, and `frontend/.github/workflows/ci.yml`).
> Owner to confirm it matches the real §5 before Stage B starts (brief U1).

## A. Inventory completeness (source: `stage-a-route-inventory.md`)

- [ ] All 56 `app/**/page.tsx` routes listed with line counts — verified
      per file body (zero `page.ts`, no `pages/` dir).
- [ ] AppShell status verified per file: 51 yes / 5 no
      (`/auth/callback`, `/auth/set-password`, `/login`, `/standby`, `/tools`).
- [ ] Family assigned per route: register 33, dashboard 10, grid 4,
      form 3, auth 3, documents 2, other 1.
- [ ] Local CSS modules identified: only `maintenance`, `timesheets`,
      `tools` — incl. `/maintenance` importing `../tools/tools.module.css`.
- [ ] Git state recorded for both repos (frontend HEAD `1c699f8`,
      26 modified + untracked; backend HEAD `d2e0e2a`, 1 doc-only change).

## B. Tools reference freeze (source: `docs/tools-polish-2026-10-02/` + polish prompt)

- [ ] Final references named: `organize/overview.png`,
      `organize/compliance.png`, `organize/disclosure-open.png`,
      `organize/*-mobile.png`, `sidebar-regular-nofill.png`
      (regular-weight nav, no secondary infills).
- [ ] Superseded references marked not-for-implementation:
      `sidebar-green-confirmed.png` (duotone era),
      `trial-tabler-sidebar.png` (Tabler rejected),
      `trial-phosphor-sidebar.png` + `pack-compare.png` (comparison only),
      `before/*` (pre-polish), `green-explore/*` (intermediate).
- [ ] Frozen tokens recorded: canvas `#f4f6f5`, paper `#fbfcfb`,
      ink `#1b2923`, brand `#233b31`, brand-soft `#e0ebe5`,
      focus `#4f806a`, radius 7px (verified in `tools.module.css` L3–8).

## C. Standards compliance per migrated route (source: `TOOLS_DESIGN_STANDARD.md` §Review)

- [ ] Clear operational purpose; no duplicate control.
- [ ] Happy path, empty state, error state, permission state, and
      recovery path are all understandable — and failure never renders
      as "no records" (toast or explicit error state).
- [ ] Keyboard, touch, small-screen (390px), dark-mode, high-contrast,
      and reduced-motion behavior usable; every control/dialog
      reachable, operable, dismissible by keyboard with visible focus.
- [ ] Terms, icons, colors, control placement match existing patterns
      (`DsIcon`, `STATUS_TONE`, `chartTheme()`; no direct Phosphor).
- [ ] New calculations/ranking logic have focused tests
      (`calcX.ts` + `*.test.*`, house style); the affected journey is
      exercised in the browser.
- [ ] Records persist via backend where promised; personal
      layout/typography choices persist locally, validated, with safe
      fallback when corrupt.

## D. Verification gates (source: polish prompt + `ci.yml` + `ENGINEERING_STANDARDS.md`)

- [ ] `npx tsc --noEmit` clean.
- [ ] Focused ESLint on touched paths clean.
- [ ] `npm run test:coverage` at or above floors
      (statements 14, branches 10, functions 8, lines 15).
- [ ] `npm run build` clean; `git diff --check` clean.
- [ ] `npm run test:smoke` passes against `next start`
      (one retry allowed for the documented transient flake).
- [ ] `npm run test:browser-quality` passes for touched routes.
- [ ] Rendered desktop + 390px verification on representative data
      (no business-record writes); before/after screenshots saved;
      console error-free. A hung test is unresolved, never a pass;
      no assertion weakened to fit a changed design.

## E. Docs and handoff

- [ ] `docs/DALLAGLIO_AUDIT_2026-09-26.md` updated with what passed /
      what remains open.
- [ ] Current Muse handoff updated; report lists changed files, chosen
      tokens, visual evidence, check results, remaining defects.
- [ ] No claim of "polished"/"done" from source/build alone —
      rendered verification required.

## F. Non-regression guards (rollout-specific)

- [ ] No edits outside the active stage's scope; no reset/stash/commit/
      push/deploy/migration performed by rollout work.
- [ ] `/maintenance` screenshots verified whenever `tools.module.css`
      tokens change (cross-route import).
- [ ] Auth routes, `/standby`, backend code, and `/portable-tools`
      untouched.
- [ ] No new dependencies added.
