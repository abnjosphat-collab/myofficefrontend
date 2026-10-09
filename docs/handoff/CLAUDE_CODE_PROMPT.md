# Prompt to paste into Claude Code

Copy everything inside the box below into a new Claude Code session opened in the `myofficefrontend` repo (with `myofficebackend` available as a sibling folder or added to the session).

````text
You are continuing a multi-session project: the Maintenance rebuild in MyOffice (an ERP for a mine). Two repos, both owned by abnjosphat-collab: myofficefrontend (Next.js) and myofficebackend (FastAPI + Supabase).

FIRST, read these in order and do not start building until you have:
1. myofficefrontend: docs/handoff/MAINTENANCE_CONTINUE.md (the current state, open PRs, next steps, gotchas). It is on branch claude/maintenance-slice3-fe, and on main once that is merged. Fetch it with: git fetch origin && git show origin/claude/maintenance-slice3-fe:docs/handoff/MAINTENANCE_CONTINUE.md
2. myofficefrontend: AGENTS.md, docs/CURRENT_HANDOFF.md, components/ui-system/README.md, docs/PAGE_PATTERNS.md.
3. myofficebackend: AGENTS.md, docs/WORK_ORDERS.md.
4. The plans: git show origin/plan/maintenance-workflow:docs/plans/maintenance-modules.md and ...:docs/plans/maintenance-workflow.md (frontend repo).

Then check the live state of the pull requests listed in the handoff (backend #5 merged, #6, #7; frontend #14, #16, #17) with the GitHub tools and tell me, briefly, where things stand and what you propose to do next.

Rules that always apply:
- Never push to or merge into main unless I say so in this conversation; merging deploys to production (Vercel and Render). Work on branches, stage files by path, never blanket-commit.
- Never run database migrations or use Supabase keys. Write migration files and rehearse them on a local throwaway PostgreSQL; I apply them. Order is always: migration, then backend, then frontend.
- UI: use only components/ui-system and the existing page patterns. No new components, colours or animations. No retyping: pick from registers with type-ahead and Tab fill; free text stays allowed. People on leave cannot be assigned. A failed request is never shown as an empty list. Approvals use signatures.
- Done means verified: backend `pytest -q --cov=app --cov-fail-under=90` and `python scripts/check_pyright_baseline.py`; frontend `npx tsc --noEmit`, `npx eslint .`, `npx vitest run`, `npm run docs:check`, route specs and a look at the rendered page. Say plainly what you could not run.
- Update docs/handoff/MAINTENANCE_CONTINUE.md (status, open PRs, next steps, change log) and docs/CURRENT_HANDOFF.md whenever something changes, then commit and push that file.
- Decide small questions yourself (I said "just decide yourself"); ask me only for outward actions (merge, deploy, migration) and genuinely open product choices.

Where I am: I (the owner) still need to apply two migrations in Supabase, in this order: supabase_migration_maintenance_audit.sql then supabase_migration_maintenance_tools.sql (backend repo). I have not yet said to merge backend PR #6 (dependency fix). Do not start slice 4 (lifecycle, sign-off, permits) until I confirm the earlier migrations are applied, unless I say "build slice 4 anyway".

Start now with step 1 of the reading list, then report.
````
