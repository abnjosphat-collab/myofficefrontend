# PPE bulk issue — Muse → Claude handoff (22 Oct 2026)

## What it is
Bulk issue on `/ppe`: one PPE item to many people at once. Commit `edfcab4`
on frontend main (pushed; Vercel deploy triggered). No backend change — it
reuses the existing single-create `POST /api/ppe` once per person, so the
server's register check (422) and same-day duplicate refusal (409) apply to
each row exactly as in single issue.

## Files (all in frontend/)
- `app/ppe/PPEBulkIssueForm.tsx` (new) — the dialog: `PeoplePicker` chips +
  shared item form, sequential per-person `createPPERecord`, saved people
  leave the list, refused people stay with the reason, submit counts people.
- `app/ppe/PPEBulkIssueForm.test.tsx` (new) — 4 tests.
- `app/ppe/page.tsx` (+4) — `Bulk issue` button in the header, dialog render.
- `app/ppe/ppeLogic.ts` (+19) — `countBulkIssueDupes`, warning-only client
  echo of `backend/app/ppe_conflicts.py` (same person + kind + day, closed
  excluded). Never blocks a save; the 409 is the refusal.
- `app/ppe/ppeLogic.test.ts` (+2 tests).
- `scripts/route-specs/ppe.mjs` (+3 checks: empty submit, no archived
  people, one POST per person with own number and no department).
- `docs/migration-verification.json` + `docs/MIGRATION_LEDGER.md` — `/ppe`
  scope appended (test count 9→10).

## Behaviour notes
- Bulk issues are always fresh records; renewing from the order list stays
  in the single-issue form (`renewalTarget` untouched).
- The people picker reads "Optional" because both shared multi-person
  controls hardcode that cue (overtime bulk included) — shared-component
  scope, deliberately left consistent.

## Verification (all observed, 22 Oct)
tsc clean, eslint 0 errors on touched files, `app/ppe` vitest 122/122,
route spec `/ppe` ALL CHECKS PASSED, render probe 13/13 at 1440 + 390 (no
overflow, no console errors, screenshots inspected), `docs:check` green.
Probe: `C:/tmp/ppe-bulk-probe.mjs`, shots `C:/tmp/ppe-bulk-*@*.png`
(scratch; may be gone).

## Earlier today (context)
- `b7948f6` PPE archive/delete facility; backend `e4135c3` Chifamba (C0323)
  + Mafukidze (PM184) removal record; `289f921` Draughtsman catalogue.
- Full run report: `audit/ppe-timesheets-notifications-2026-10-21/muse/`
  (COMPLETION-REPORT, DECISIONS D1–D125, OWNER-ATTENTION with resolutions).
