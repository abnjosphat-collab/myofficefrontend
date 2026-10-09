# Maintenance rebuild: handoff for the next Claude Code session

Keep this file current. Update the **Status**, **Open pull requests** and **Next steps** sections every time something changes, then commit and push it. The prompt to paste into a new session is in [`CLAUDE_CODE_PROMPT.md`](./CLAUDE_CODE_PROMPT.md).

Last updated: 9 Oct 2026 (slice 4 built; waiting on the owner for migrations and merges).

## 1. What this is

A multi-phase rebuild of the Maintenance workflow in MyOffice (an ERP for a mine): work orders (planned, on-the-fly, breakdown), requests with signed approval, scheduled work, assignments and a planner, plus parts, a KPI board and a task library. Out of scope: purchase orders, taxes, shipping addresses, projects, interactive plans.

Two repositories, both owned by `abnjosphat-collab`:
- `myofficefrontend`: Next.js 16 (App Router, Turbopack), React, Tailwind 4, TypeScript. Deploys to Vercel from `main`.
- `myofficebackend`: FastAPI + Supabase. Deploys to Render from `main`.

The plans (read these before building anything):
- `docs/plans/maintenance-modules.md` (v2.2: requirements R39 to R47, module map, tools bridge, model, delivery plan, "use existing patterns only") and `docs/plans/maintenance-workflow.md` (v1: full requirements R1 to R38, model M.*, functions F.*, state machine M.4, leave rule M.5). Both live on the frontend branch `plan/maintenance-workflow` (PR #14), not on `main`: `git show origin/plan/maintenance-workflow:docs/plans/maintenance-modules.md`.
- `docs/CURRENT_HANDOFF.md` in the frontend repo is the project-wide status file (sections 8b and the slice entries).

## 2. The owner's non-negotiables

1. **No retyping.** Machines, people, sections, tools and parts are picked from the existing registers with type-ahead and Tab autofill; free text stays as a provision.
2. **People on leave cannot be assigned**: refused on the server and shown greyed with reason and dates in the UI.
3. **Use only `components/ui-system`** and the existing page patterns (`docs/PAGE_PATTERNS.md`: R register, D dashboard, G planning grid, W workflow). The owner rejected two custom card/animation designs. Do not invent components, colours or typography. Look at the real Requisitions, SHEQ and Shifts pages as the visual reference.
4. **Honest data states**: loading, failure and empty are different. A failed request is never shown as an empty list. No demo data in production.
5. **Approvals use signatures.**
6. **Reuse existing modules.**
7. Standing rules from the repos' `AGENTS.md`: never commit or push to `main`; stage by path (never blanket-commit); never run migrations or touch live Supabase data; the agent never holds Supabase keys. Merging to `main` deploys to production.
8. The owner approved the prototype in writing ("i aaprove the protype , everything else decide for me") and said "just decide yourself" on open questions, so the author decides small questions. Do not re-ask what is already decided in the plan.
9. The owner still owes: KPI targets (Q10, "I'll give you the targets later"), and written confirmation of the 11 decisions in section 9 of the plan. Until then the KPI board shows figures without target colouring.

## 3. Rollout rule (every slice)

**Migration, then backend, then frontend.** Each slice is one backend PR plus one frontend PR. The owner applies migrations (Supabase SQL editor, or `python scripts/apply_migration.py <file.sql>` from the backend folder with their local token), then records them with `python scripts/track_migration.py --mark-applied <file.sql>`. The agent writes migration files and rehearses them on a local throwaway PostgreSQL (`scripts/test_maintenance_*_sql.sh`) but never applies them to Supabase.

## 4. Status

| Slice | What | State |
|---|---|---|
| 0, 1 (prototype) | Plan v1, plan v2.2, prototype | Done, approved by the owner. Prototype branches are never merged. |
| 1 | Audit trail, row-version check on PATCH (409 `version_conflict`), comments | Backend merged to `main` (PR #5, sha 47fea20). Frontend in PR #16. **Migration `supabase_migration_maintenance_audit.sql` NOT YET APPLIED by the owner.** |
| 2 | One "Operations & Maintenance" sidebar group with separate Overview, Work Orders and Schedules modules, real data | Built, in frontend PR #16. |
| 3 | Registers: `RegisterField` picker, leave greying and refusal, tools bridge, tools on a work order | Built. Backend PR #7, frontend PR #17 (stacked on #16). **Migration `supabase_migration_maintenance_tools.sql` NOT YET APPLIED.** |
| 4 | Lifecycle, sign-off, permits | Built (the owner said "build slice 4 anyway"). Backend PR #8 (stacked on #7), frontend PR #18 (stacked on #17). Uses only the 4 existing statuses; postponed/not-done/cancelled need product approval. **Migration `supabase_migration_maintenance_lifecycle.sql` NOT YET APPLIED.** Status moves go through `POST /transition`; PATCH status edits still work (shadow mode, logged as `shadow_refusal`). |
| 5 to 13 | On-the-fly and breakdown work orders; list and record page; requests and approval; assignments; schedules; planner; parts; overview; task library | Not started. Order in `docs/plans/maintenance-modules.md` section 7. |

## 5. Open pull requests (check live status with the GitHub tools before acting)

| PR | Repo | Branch (head) | Purpose | Notes |
|---|---|---|---|---|
| [#6](https://github.com/abnjosphat-collab/myofficebackend/pull/6) | backend | `claude/deps-audit-fix` (036cc41) | Raises PyJWT 2.15.0, urllib3 2.8.0, multidict 6.9.1 so `pip-audit` passes | CI green. **Not merged**: merging deploys to Render; owner has not said "merge". `main` has failed `pip-audit` on its last pushes with 18 advisories in exactly these three packages. |
| [#7](https://github.com/abnjosphat-collab/myofficebackend/pull/7) | backend | `claude/maintenance-slice3` (4aa87fb) | Slice 3 backend | Only failing check is `pip-audit` (same advisories, from the base). Merge #6 first, then update #7 from `main` so CI re-runs. |
| [#16](https://github.com/abnjosphat-collab/myofficefrontend/pull/16) | frontend | `claude/festive-noether-rrxq4l` (adca43f) | Slices 1 and 2 frontend | Merge only after the owner confirms the audit migration is applied. |
| [#17](https://github.com/abnjosphat-collab/myofficefrontend/pull/17) | frontend | `claude/maintenance-slice3-fe` (88eb90a) | Slice 3 frontend | Base is #16's branch. After #16 merges, retarget to `main`. |
| [#8](https://github.com/abnjosphat-collab/myofficebackend/pull/8) | backend | `claude/maintenance-slice4` (c71f8c0) | Slice 4 backend | Base is #7's branch. Merge #7 first, then retarget to `main`. |
| #18 | frontend | `claude/maintenance-slice4-fe` | Slice 4 frontend | Base is #17's branch. |
| [#14](https://github.com/abnjosphat-collab/myofficefrontend/pull/14) | frontend | `plan/maintenance-workflow` (3716e90) | The plans | Docs only. |
| #15 | frontend | `prototype/maintenance-workflow` | First prototype | Never merge. |
| (no PR) | frontend | `prototype/maintenance-modules` (0ff8d8b) | Clickable preview at `/maintenance-preview` | Never merge. |

## 6. Next steps, in order

1. **Ask the owner for their word on each outward action; do not assume.** Merging anything to `main` deploys to production.
2. When the owner says the **audit migration is applied**: check frontend PR #16 (CI, mergeability), then merge it. Confirm the History and Comments tabs work against the real backend if you can.
3. When the owner says **"merge #6"**: merge backend PR #6, then update #7 from `main` (merge `main` into the branch), wait for CI, and tell the owner.
4. When the owner says the **tools migration is applied**: merge backend #7, then retarget frontend #17 to `main` (after #16 is merged) and merge it.
5. (Slice 4 is built; merge it after slices 1 to 3, with its migration applied.) Next build slice 5. Original note for slice 4: (lifecycle, sign-off, permits) on new branches: backend first (rules module `app/maintenance_rules.py`, `POST /work-orders/{id}/transition`, `signoff`, permits, `supabase_migration_maintenance_lifecycle.sql` with a rehearsal script), then frontend (`StatusActions`, tabs, "Awaiting sign-off"). Follow plan v1 M.4 and R6, R9 to R11. Use shadow mode for new role rules in the first release. Permit reference missing blocks Start (Q6, decided yes, no manager bypass). If the owner says "build slice 4 anyway" before the migrations are applied, build it, but still merge nothing until the earlier migrations are applied.
6. Later slices in the order of `maintenance-modules.md` section 7. Update `docs/CURRENT_HANDOFF.md`, this file and the `docs/MIGRATION_LEDGER.md` (`npm run docs:ledger`) as each slice lands.

## 7. How things work (what the next session must know)

**Backend**
- Venv: create one, e.g. `python -m venv /tmp/venv && pip install -r requirements.txt` (the full install can hang on easyocr/torch; install without `easyocr` if so). Tests: `pytest -q --cov=app --cov-fail-under=90`; types: `python scripts/check_pyright_baseline.py` (count must not rise; limit 215, currently 209).
- Tests use fake Supabase clients (`tests/test_maintenance_work_orders.py` has `_FakeSupabase`, `_RetryTable`; new maintenance tests import from it). The fake supports `select/eq/order/limit/range/insert/update/delete` only.
- `.pyc` files are tracked in the backend repo and become dirty whenever tests run. Restore them by path before committing: `git status --short | awk '{print $2}' | grep '\.pyc$' | xargs -r git checkout --`. Never `git checkout -- .` (it also discards real edits and the harness denies it). Untracking `.pyc` and ignoring `__pycache__` would be a good small PR (not done).
- Key modules: `app/routers/maintenance.py` (work orders; version check on PATCH; audit events; comments; tools; registers endpoints), `app/maintenance_events.py` (`append_event` never raises; the write stands if the audit append fails), `app/maintenance_registers.py` (`people_on_leave`, `refuse_people_on_leave`, `tools_feed`; failed reads are 503, never empty).
- Leave rule fields: `allocated_to`, `responsible_foreman`, `authorising_foreman` only (not the requester, not `artisan_name`/`foreman_name`, which record who did the work).
- Migrations are idempotent, have a rollback block, and are rehearsed with `scripts/test_maintenance_audit_sql.sh` and `scripts/test_maintenance_tools_sql.sh` (needs local PostgreSQL 16 and a `postgres` user when run as root).
- Optimistic concurrency: a DB trigger bumps `work_orders.version`; PATCH accepts `version`; stale gives 409 `{code:"version_conflict", message, current}`; ignored if the column does not exist yet.

**Frontend**
- `npm ci` may fail on the xlsx tarball in the cloud sandbox, which causes a few environmental `tsc` errors (`app/services/ImportDialog.tsx`). Ignore those; there should be no others.
- Done means: `npx tsc --noEmit`, `npx eslint .` (0 errors; ~146 existing warnings), `npx vitest run` (1147 pass), `npm run docs:check` (run `npm run docs:ledger` first if the ledger is stale), route specs `MSYS_NO_PATHCONV=1 node scripts/verify-routes.mjs --only /maintenance/work-orders` (needs `npx next dev -p 3000` running; `.env.local` holds placeholders), and a look at the rendered screenshots in `node_modules/.cache/mo-audit/shots-routes/`.
- Dev server: after switching branches run `rm -rf .next`. Stop it with `pkill -f "[n]ext-server"` (never `pkill -f "next dev"` from inside the same shell).
- Key files in `app/maintenance/`: `RegisterField.tsx` (one picker for all registers: arrows, Tab/Enter fill, free text kept, "from the register" line, blocked options for leave), `registers.ts` (pure logic, unit-tested), `useRegisters.ts`, `ToolsNeeded.tsx`, `PersonField.tsx`, `WorkOrderForm.tsx`, `api.ts`, `types.ts`. Specs: `scripts/route-specs/maintenance*.mjs`, fixtures in `scripts/lib/maintenance-fixtures.mjs` (unknown API paths return `[]`).
- Gotchas learned: icon names must be real (`chat`, `save`, `wrench`, `upload`, `check`, `plus`, `close`, `warning`); Next 16 `params` is a Promise; layout needs `'use client'` where a barrel import calls `createContext`; Escape inside a picker must `stopPropagation` so the dialog does not close; `deriveDataStatus` treats 5xx (except 501/505), 408 and 429 as transient ("Still loading"); the sidebar `exact` flag keeps the Overview from lighting up on sub-routes.

## 8. Decisions already made (do not re-ask)

- Requests and Planner are not in the navigation until their backend tables exist (slices 7 to 10).
- Maintenance records the tools a job needs; custody and issue stay in `/tools`. The Tools register has its own sign-in, hence the read-only bridge endpoint.
- Permit reference missing blocks Start; no manager bypass in v1.
- Display "Preventive" for `planned_maintenance`; no new type column.
- Merged backend PR #5 although CI failed on `pip-audit`, because that failure is identical on `main` and not caused by the PR.

## 9. Change log of this file

- 9 Oct 2026: created at the end of the session that built slices 1 to 3.
- 9 Oct 2026: slice 4 built (backend #8, frontend #18). The owner asked me to apply the migrations myself; I cannot (no Supabase credentials in the cloud session, and the standing rule is that the owner applies them), so they remain the owner's to run.
