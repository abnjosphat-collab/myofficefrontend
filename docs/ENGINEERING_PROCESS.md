# How MyOffice is built: the engineering process (adopted 25 Oct 2026)

Written for the owner, Muse Code and Claude. Muse copies it into `frontend/docs/ENGINEERING_PROCESS.md` (and links it from both `AGENTS.md`
files) as the first step of the next run. It replaces habit with five steps every change goes through. Small changes go through them in minutes;
big ones take longer. No step is skipped, and none is turned into paperwork.

## Who does what

| Role | Who | Owns |
|---|---|---|
| Product owner | The owner | What is built and why; decisions; **final approval to release** |
| Analyst and reviewer | Claude | Finding the real problem, the plan, independent checking before and after release |
| Builder | Muse Code | Verifying the plan against the code, building, testing, preparing the release |

## The five steps

### 1. Communication (understand the problem)
- Start from the problem, not the requested solution: who is affected, what happens today, what it costs.
- Every open question goes to the owner as a short multiple-choice question. Nobody guesses a business rule (payroll, approvals, access, safety).
- **Ready to plan when:** the problem, the users, the owner's decisions and the acceptance criteria are written down.

### 2. Planning (decide how, and in what order)
- Small batches, each independently releasable and reversible, ordered by risk and value (live defects first).
- For each batch: what changes, what must not change, the tests that prove it, and the release steps (including any SQL and its order).
- **Ready to build when:** the plan names files and acceptance tests and the owner has seen it.

### 3. Modeling (show it before building it), only when something new is designed
- **New or changed screen:** a quick sketch or annotated screenshot (before and after) that the owner approves.
- **New data or access rule:** a one-page model of the records involved, how they link, and who may see or change them.
- **Not needed for:** wording, small fixes, refactors with no visible change.

### 4. Construction (build it right)
- **Verify, then build.** Re-check each finding against today's code and reproduce it (a failing test or a screenshot) before changing anything.
  Report findings that no longer hold; keep a separate "found while working" list. Never widen the scope silently.
- Tests first for logic (they fail before the fix and pass after), the smallest change that uses existing shared code, and one branch per batch.
- **Self-review before handing over:** read your own diff as a reviewer would; check data rules, permissions, failure states, accessibility, the 390 px layout.
- **Definition of Done:** `tsc`, `eslint`, vitest, `docs:check`, route specs and the rendered page at 1440 and 390 px (frontend); `pytest`, the pyright
  baseline, the integrity and auth tests (backend). Every result reported as it really came out; anything not run is named.

### 5. Deployment (release safely, then check it)
1. **Backend first, and backward-compatible.** A backend change must still work with today's frontend (add before you remove). It is released first.
2. **Preview.** The frontend batch is pushed to its own branch (never `main`), so Vercel builds a preview link. The preview talks to the live backend,
   which is why step 1 comes first. Muse sends the owner the link and a 3-5 line "what to check" list.
3. **Owner approval.** Nothing reaches `main` until the owner says **"release"** for that batch.
4. **Release checklist:** SQL files run in order, each with its backup and guard, only on the owner's "run it"; merge to `main` and push; confirm the live
   commit with `GET https://myofficebackend.onrender.com/api/version` and that the site loads.
5. **Check after release:** within the hour, re-run the read-only checks named in the plan against the live system; watch errors and feedback for 48 hours.
6. **Record the truth:** update `CURRENT_HANDOFF.md` in the same push (merged / pushed / live / SQL run, with dates), add a one-line release note for
   users, and tag the release (`release-YYYY-MM-DD-n`) in both repos.
7. **Rollback plan:** every batch says how to undo it (revert commit; SQL backup tables). A live problem is fixed with a small, separately released fix.

## Never
- Push to `main`, deploy, or run SQL on the live database without the owner's word in that conversation.
- Report something as done, merged, or released that is not.
- Change work-order statuses, NEC payroll calculations, overtime approval rules, leave/overtime authority, or timesheet fill and persistence without an
  explicit owner decision.
