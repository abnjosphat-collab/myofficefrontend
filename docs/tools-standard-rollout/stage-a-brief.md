# Stage A — Implementation brief: Tools standard rollout

Date: 2026-10-02. Stage A input: [stage-a-route-inventory.md](./stage-a-route-inventory.md)
(56 routes verified from `app/**/page.tsx` bodies, not grep alone).
Acceptance checklist: [stage-a-acceptance.md](./stage-a-acceptance.md).

Goal: adopt the proven `/tools` pilot (theme contract, component patterns,
interaction discipline) as the shared MyOffice standard across AppShell
routes — without breaking Tools, Timesheets, or any route's business logic.

## 1. Preserved requirements (non-negotiable)

From `TOOLS_DESIGN_STANDARD.md`, `ENGINEERING_STANDARDS.md`,
`COLOR_HARMONY.md`, `DESIGN_SYSTEM_MIGRATION.md`, and the 2-Oct polish prompt:

1. **Runtime changes stay scoped per stage.** The polish pilot rule
   ("restrict runtime changes to `app/tools`") lifts only stage by stage
   below; no drive-by edits to routes outside the active stage.
2. **Preserve business logic, access rules, auth, Supabase persistence,
   and all existing uncommitted edits.** Never reset, stash, overwrite,
   commit, push, deploy, or migrate as part of rollout work.
3. **Single source of truth:** `@/components/shared/design-system` barrel.
   Extend shared controls; no per-page copies. Icons via `DsIcon` /
   `icons.tsx`, never direct Phosphor imports in migrated routes.
4. **Color layers** (`COLOR_HARMONY.md`): structure neutral, brand for
   interaction only, semantic meaning via `STATUS_TONE` only, charts via
   `chartTheme()` — never derived from a route button color.
5. **Never failure-as-empty.** Load/mutation errors surface via
   `toast.error(...)` or a rendered error state; new API calls go through
   `lib/apiClient.ts` (`api.*`), not raw `authFetch`.
6. **Page wiring:** page-local computation in sibling `calcX.ts`
   (testable, `lib/dates.test.ts` house style); data fetching in sibling
   `useXData.ts`; auth state only via `useAuth()`.
7. **Tools interaction bar** (applies to every migrated route):
   44px coarse-pointer targets, meaning never by color alone, visible
   keyboard focus on every control/dialog, `prefers-reduced-motion` and
   `prefers-contrast` respected, layout/typography choices persist
   (validated before use, safe fallback when corrupt).
8. **Dark appearance:** black/near-black surfaces, achromatic structure;
   color reserved for operational meaning, notifications, visualization.
9. **No new dependencies expected.** Icon work stays on
   `@phosphor-icons/react` (Tabler already evaluated and rejected for nav).
10. **Retired stays retired:** `/portable-tools` is not revived by this rollout.

## 2. Component migration map

Direction is **Tools-local → shared design-system barrel**, one component
at a time, Tools adopting the shared version first (pilot eats its own
cooking) before any other route migrates to it.

| # | Tools-local source | Shared target | Notes |
|---|--------------------|---------------|-------|
| M1 | `tools.module.css` `.surface` tokens | New theme contract under `design-system/` (extend `dallaglio/tokens.ts` or a sibling `tools-theme` module — do not fork a 4th brand) | Must resolve §5 conflicts: `--radius` 7px vs 10px, `--brand` forest vs violet vs dallaglio `#7652c5` |
| M2 | `ToolsIcon.tsx` semantic icon map | `design-system/icons.tsx` + `DsIcon` + `shared/icon-meanings` | Tools route migrates off direct Phosphor to `DsIcon` first |
| M3 | Sidebar item/icon-cell (post-polish reusable impl, 26px cell / 18px regular glyphs, no hover translate) | AppShell sidebar pattern | Geometry + `aria-current` contract moves over verbatim |
| M4 | `AnimatedSelect.tsx` + portal token contract (12 copied vars) | Shared select/portal primitive | Portal must carry the same scoped reset/typography/token contract as its trigger; fix applies to shared primitive once |
| M5 | `ToolsUI.tsx` (search, view toggle, status badge, toolbar, dialogs) | `design-system/components.tsx`: `SearchInput`, `ViewToggle`, `StatusBadge`, `PageHero`, `StatStrip`, `EmptyState`, `CenterModal` | Map by props, not copies; Tools variants that differ get a prop, not a fork |
| M6 | Homepage composition (Overview → stats → attention/moves → shortcuts) | Dashboard-family page template (docs + `PageHero`/`StatStrip`/`GroupSection` composition) | `/`, `/sheq`, `/breakdowns/analytics` are first consumers |
| M7 | Register list (toolbar → filters → results → cards/table) | Register-family page template (`RecordCard` + `GroupSection` + `PageHero` per `DESIGN_SYSTEM_MIGRATION.md`) | 33 register routes, highest leverage, one template |
| M8 | `ToolsCompliance.tsx` 4× native `<details>` disclosures | Shared `Disclosure` (`design-system` already exports one) | Verify Tools disclosure behavior matches shared `Disclosure` before swapping |

Explicitly **not** migrated: auth pages (standalone by design), `/standby`
(redirect), `/maintenance` and `/timesheets` local modules (see §6 risk R2 —
they migrate only after their uncommitted work lands).

Rollout order by family (from inventory): register 33 → dashboard 10 →
grid 4 → form 3 → documents 2 → other/auth excluded. Only 3 routes own
local CSS modules, so most routes migrate at the prop level (adopt shared
components), not via CSS rewrites.

## 3. Stages and per-stage exit criteria

### Stage B — Token + primitive extraction (pilot eats its own cooking)

- Scope: M1–M5 implemented in `design-system/`; `/tools` re-pointed at
  the shared versions with **zero visual change** (before/after
  screenshots at desktop + 390px, light + dark, reduced-motion).
- Exit criteria:
  - [x] `npx tsc --noEmit` clean, `npm run build` clean, `git diff --check` clean.
  - [x] Focused tests for changed interaction/data contracts pass;
        `npm run test:coverage` at or above floors (14/10/8/15).
      - [x] `/tools` before/after screenshots show no unintended visual delta;
        console error-free (see acceptance checklist).
  - [x] Token conflict decisions (§5) recorded in the theme contract file header.
  - [x] `docs/DALLAGLIO_AUDIT_2026-09-26.md` + current Muse handoff updated
        with what passed and what remains open.

### Stage C — Family-by-family rollout (register → dashboard → grid → form → documents)

- Scope: M6–M8 templates; migrate one family per batch, largest/lowest-risk
  route in the family first as the canary (register canary: `/spares`;
  dashboard canary: `/reliability`, 112 lines).
- Per-batch exit criteria:
  - [x] Same gates as Stage B (tsc, build, coverage floors, `test:smoke`).
  - [x] `e2e/accessibility.spec.ts` + `tools-autofill.spec.ts`
        (`test:browser-quality`) pass for touched routes.
  - [x] No `STATUS_TONE` violations (grep for stray status hex in touched files).
  - [x] No new direct-Phosphor imports, no new per-page component copies.

### Stage D — Cleanup, baselines, close-out

- Scope: remove superseded Tools-local duplicates only after all consumers
  migrate; commit first Linux visual baselines; remove the CI
  `continue-on-error` on the visual suite.
- Exit criteria:
  - [ ] `e2e/visual.spec.ts-snapshots/*-linux.png` committed from CI; DEFERRED —
        needs a Linux CI run + human commit; Windows cannot seed platform baselines.
  - [ ] `npm run test:visual` green in CI (not annotated-failure). DEFERRED with above;
        `continue-on-error` intentionally left in place until baselines exist.
  - [ ] Coverage floors raised if new tests justify it (deliberate bump, not silent).
  - [ ] `DESIGN_SYSTEM_MIGRATION.md` phase checklist + completion criteria updated.

## 4. Verification commands (every stage)

```bash
cd frontend
npx tsc --noEmit
npx eslint <touched paths>
npm run test:coverage        # CI enforces floors: 14/10/8/15
npm run build
npm run test:smoke          # prod server; one retry allowed for transient first-request flake
npm run test:browser-quality
git diff --check
```

Backend: no code changes expected; if touched, `pytest` per repo skill.
A hung test is an unresolved check, never a pass. Never weaken an
assertion to make a changed design pass.

## 5. Token conflicts to resolve in Stage B (file-confirmed)

| Token | Value 1 | Value 2 | Value 3 | Decision needed |
|-------|---------|---------|---------|-----------------|
| `--brand-500` | `#a855f7` (`app/globals.css` L115) | `#7652c5` (`dallaglio/palette.css` light, critic-verified) | achromatic `#dedee3`/`#f0f0f2` (dallaglio dark, critic-verified) | Which ramp the shared contract owns; Tools forest `#233b31` (`tools.module.css` L5, scoped `.surface`) stays scoped or becomes a theme variant — not a 4th global |
| `--brand-600` | `#9333ea` (globals L116) | `#7652c5` (== `--brand-500` in dallaglio light — suspicious duplicate, critic-flagged) | — | Confirm whether dallaglio 600==500 is intentional |
| `--radius` | `0.625rem` (10px, globals L105) | `7px` (tools `.surface`, L8) | hardcoded 12/16/18px in newer Tools homepage/sidebar rules (polish prompt) | Shared radius scale + documented exception policy (nav pill 18px already a documented exception) |

Additional prior-verified context: `/tools` is currently forced to
classic (layout script + `ThemeProvider`), while the app default is
dallaglio; app identity in `layout.tsx` is already
"Dallaglio Portable Tools and Equipment E-System". The rollout must
decide whether Tools stays classic-forced or converges on dallaglio —
that decision belongs to Stage B, not Stage A.

## 6. Risks

- **R1 — Uncommitted Tools/Timesheets overlap (largest risk).**
  Verified 2026-10-02: frontend HEAD `1c699f8`, 37 uncommitted paths
  (26 modified + 11 untracked incl. this rollout dir).
  Tools: 12 modified (`page.tsx`, `ToolsAuth`, `ToolsCompliance(.test)`,
  `ToolsFeedbackInbox`, `ToolsGatePasses`, `ToolsHomepage`,
  `ToolsPeople(.test)`, `ToolsSourceRegisters`, `ToolsUI`,
  `tools.module.css`, `scripts/verify-tools.mjs`) + 2 untracked doc dirs.
  Timesheets: 10 modified + 7 untracked (`moduleApproval(.test)`,
  `ModuleApprovalIndicator(.test)`, `nightRosterOvertime`,
  `retryTimesheetRead(.test)`).
  Mitigation: rollout branches from current HEAD with worktree-friendly
  batches; re-inspect `git status`/diffs before every edit; touch
  `app/tools/*` and `app/timesheets/*` only inside their owning stage;
  coordinate landing order with whoever owns the uncommitted work —
  the rollout must never reset/stash/commit it.
- **R2 — Cross-route CSS coupling.** `/maintenance/page.tsx` imports
  shared `../tools/tools.module.css`. Any M1 token rename/restructure
  changes `/maintenance` rendering. Mitigation: M1 keeps alias vars
  until `/maintenance` migrates; verify `/maintenance` screenshots in Stage B.
- **R3 — No visual baselines.** `e2e/` has no `*-snapshots` dir; CI visual
  suite is `continue-on-error: true` ("TEMPORARY"). Visual regressions
  cannot gate until Stage D seeds Linux baselines. Mitigation: manual
  before/after screenshots are mandatory evidence in Stages B–C.
- **R4 — Classic/dallaglio split.** Tools forced classic vs dallaglio
  default; dallaglio dark is achromatic while Tools ships a forest theme.
  A wrong convergence decision re-tints 51 AppShell routes. Mitigation:
  decide in Stage B on the canary only; no global flips before Stage C.
- **R5 — Coverage floors are low but binding.** 14/10/8/15 will fail the
  build if shared-component extraction deletes tested lines without
  replacement tests. Mitigation: move tests with the code (M2–M5 each
  carry their `*.test.*`); run `test:coverage`, not just `test`.
- **R6 — Backend drift is doc-only today** (1 modified:
  `docs/NEC_TIMESHEET_RULES.md` +12/−2; HEAD `d2e0e2a`). No backend code
  risk now, but `NEC_TIMESHEET_RULES.md` is edited in **both** repos —
  confirm which copy is canonical before relying on either.

## 7. Unresolved items and omitted scope (preserved from Stage A inputs)

Unresolved (carried, not dropped):

- **U1 — Original Stage A prompt §5 text** was not found as a file in the
  workspace; [stage-a-acceptance.md](./stage-a-acceptance.md) is
  reconstructed from the sources it cites. Owner to confirm it matches
  the real §5 before Stage B starts.
- **U2 — Dallaglio `--brand-600 == --brand-500`** (`#7652c5`): critic-flagged
  as needing an intentional-vs-bug ruling. Stage B decision item.
- **U3 — Truncated prior-result tails** (not re-verified, not relied upon):
  tests-ci `prodBuild`/smoke detail tail, standards-docs principles tail,
  tools-reference `green-explore` tail. Pointers preserved in the
  workflow record; re-inspect if Stage B needs them.
- **U4 — Tools classic-forced vs dallaglio convergence**: no ruling yet (see §5).

Omitted scope (intentional, stays out):

- `/login`, `/auth/callback`, `/auth/set-password` (standalone auth, no AppShell by design).
- `/standby` (bare redirect, no UI).
- Backend code (no changes required by this rollout).
- `/portable-tools` (retired; stays retired).
- New dependencies (none expected).
- Backfilling render tests for untouched routes (opportunistic only, per standards).
