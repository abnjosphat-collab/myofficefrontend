# TASK: Tools issue workflow + overtime lieu lifecycle (Muse Code prompt)

## Goal

Make issuing a tool a straight line: unavailable tools grey out with the reason
AND the escape hatch (receive/transfer, record a check, record a repair —
inline where possible), every picker commits on Tab and Enter, every form
scrolls with the mouse, and employees without a mine number get a clean
type-safe "unknown" path. Separately, give lieu overtime a real lifecycle:
"To be taken as leave" wording, a "mark as leave taken" action that
auto-creates the leave record, and transferred leaves that never touch
timesheets.

## Success Criteria

- Blocked tools (with someone, defective, checks due, archived) cannot be
  picked in either issue surface, say why, and offer the resolving action
  inline (receive/transfer shortcut, record-check popup, record-repair
  popup). No dead ends.
- Recording a check or repair from inside the issue flow unblocks the tool
  without leaving the flow; history/audit entries are identical to recording
  from the existing surfaces.
- Tab and Enter commit in every Tools autocomplete; no native datalist
  remains where keyboard commit matters.
- Every Tools form scrolls with the mouse wheel at 1440 and 390.
- An employee can be recorded with "number unknown": no fake data stored,
  displays as missing (never blank/confusing), unique constraint intact,
  number editable later.
- Approved lieu overtime reads "To be taken as leave"; marking it taken
  creates an approved "Leave in Lieu of Overtime" leave linked to the OT
  record; linked leaves never project onto timesheets; manual lieu leaves
  behave exactly as today; OT premium merge untouched.

## READ FIRST

`frontend/AGENTS.md`, `frontend/docs/CURRENT_HANDOFF.md`,
`frontend/docs/TESTING.md`, `frontend/components/ui-system/README.md`,
`frontend/docs/NEC_TIMESHEET_RULES.md` (before touching the merge),
`backend/docs/ENGINEERING_STANDARDS.md`. If a doc disagrees with the code,
trust the code and say so.

## WHAT WE FOUND (verified; re-verify each before changing it)

- Two issue surfaces: single `MovementForm` (`app/tools/ToolsForms.tsx`,
  tool Combobox :177-178 with disabled reasons :89-98, "With X — transfer
  the open loan instead" / "Needs attention — mark it ready first") and
  4-step `BulkIssueForm.tsx` (disabled checkboxes :164-180 saying only
  "cannot be issued", conditions step :204-245, checks-due override
  :90-105/:234-244). Grey-out EXISTS in both; the shortcuts do NOT.
- Condition rows (`app/tools/toolConditions.ts:33-87`) are text-only.
  Statuses are `available|issued|overdue|attention`
  (`prototype.ts:4`); defective/not-working is `workingStatus`
  (`toolConditions.ts:83-85`, currently NON-blocking) and checks-due is
  `inspectionDue[]`. Reusable pieces already exist: `MarkReadyForm`
  (`ToolsForms.tsx`), `recordInspection` incl. `repair` type
  (`InspectionInput`, `backend/app/routers/tools_workspace.py:156-157`),
  the inline pre-use form in `ToolDrawer.tsx:14-28`, and the
  Receive/transfer/extend actions via `w.openAction`.
- Tab/Enter already work in shared `Combobox.tsx:104-130` and
  `ToolsEmployeePicker.tsx:38-43`. The gap is `MultiSuggestField`'s
  native datalist (`ToolsForms.tsx:57-60`): no keyboard commit.
- All Tools dialogs/drawers ride the shared scrolling `Dialog`
  (`ToolsUI.tsx:12-13`, `ToolDrawer.tsx:40-57`,
  `overlays/Dialog.tsx:128`). The scroll failure was NOT pinnable
  statically — reproduce it; suspects: nested scrollers (bulk list
  `max-h-64`, cmdk `max-h-72`) and the zoom viewer's intentional
  wheel hijack (`ToolsUI.tsx:86`).
- Employee number is required free text (`ToolsForms.tsx:465,474`),
  backend `min_length=1` + case-insensitive 409 on duplicates
  (`tools_workspace.py:135-136,360-361`), column
  `text not null unique` (`supabase_migration_tools_workspace.sql:8,22`).
  Separate register (`tools_workspace_employees`), NOT the main roster.
- Lieu today: `payout_method` is a manual flag with "no hard link to a
  specific leave request" (`app/overtime/types.ts:25-28`); the OT merge
  ignores payout and pays lieu hours as ot15/ot20
  (`mergeEffectiveTimesheets.ts:126-138`); approved leaves project paid
  8h days (`:93-107`) with `lieu → 'lieu'` in
  `LEAVE_TYPE_TO_STATUS`; manual "Leave in Lieu of Overtime" exists
  (`leaveTypes.ts:15`). Owner decision (asked 2026-10-17): transferred
  leaves show NOTHING on timesheets; OT premium stays as-is.

## Approach (ordered work units)

**T1 — Actionable blockers (both issue surfaces).** Blocked options and
condition rows keep their grey-out + reason and gain the resolving action:
with-someone → open Receive (return) / transfer for that tool; checks-due
→ record-check popup reusing the inspection input (types due only,
outcome + notes); defective/not-working → record-repair popup reusing
`MarkReadyForm` semantics. After recording, the tool re-evaluates WITHOUT
leaving the issue flow (refetch or invalidate the workspace scope).
Decide from the code whether `not_working` should become a hard blocker
like the other availability states; today it is not. Keep the checks-due
written override exactly as-is. Reuse, don't fork: one record-check
dialog and one record-repair dialog shared by drawer, compliance, and
issue surfaces.

**T2 — Keyboard commit everywhere.** Replace the datalist in
`MultiSuggestField` with shared-Combobox semantics (Tab completes,
Enter commits, custom values allowed where they are today). Add focused
tests driving Tab and Enter per picker. Do not regress the "Tab on empty
must never commit the first row" rule both pickers document.

**T3 — Mouse scroll.** Reproduce on every Tools dialog, drawer, and tab
at 1440 and 390: wheel over each region must scroll the nearest
scrollable ancestor; nothing traps or swallows the wheel except the
photo zoom viewer (intentional). Fix at the container level, not per
form; screenshots before/after of each fixed surface.

**T4 — Unknown employee number (type-safe).** Recommended: real NULL —
migration (`ALTER ... DROP NOT NULL` on
`tools_workspace_employees.employee_number`; first prove on a scratch
table in a dev project that the unique index still admits multiple
NULLs — do not assume it), `EmployeeInput.employee_number`
Optional, form gets "No mine number yet" (disables the field, stores
NULL, displays "Not recorded", number addable later via edit),
null-safety through labels/eligibility/import validation, matching
never treats two NULLs as the same person. REJECTED alternative:
generated TEMP numbers — fake data in a unique register recreates the
collision problem. Tests: create-without-number, duplicate real number
still 409s, label/eligibility with NULL, import validation message.

**O1 — Lieu wording + mark-taken → leave link.** Rename the lieu payout
label family from "Taken as leave (lieu)" to "To be taken as leave"
(badge, forms, detail, exports — one label source). Add "Mark as leave
taken" on approved lieu OT (detail + row action): creates an approved
"Leave in Lieu of Overtime" leave for the taken dates with a hard link
to the overtime record (new nullable `overtime_id` on leaves + backend
accepting it; migration file, NOT run without the word), idempotent
(one OT record → at most one transferred leave; re-clicking explains
instead of duplicating). Manual lieu leaves unchanged.

**O2 — Transferred leaves stay off timesheets.** `mergeEffectiveTimesheets`
skips approved leaves carrying the overtime link (manual lieu leaves
still project exactly as today). OT premium merge UNTOUCHED — do not
distinguish payout there. Tests in `mergeEffectiveTimesheets.test.ts`:
linked leave projects nothing (no day, no hours), manual lieu leave
still projects 8h Lieu, mixed ranges.

## DO NOT CHANGE

Business rules beyond the items above, approval/signature gates,
statuses, calculations, the checks-due override rule, OT merge buckets,
leave projection hours, the Tools atomic-command backend contract
(`tools_workspace.py` RPCs stay durable/atomic/idempotent/auditable),
undo/redo, permissions/roles, API shapes except the specified nullable
number and leave link, export formats, `--mo-*` tokens, type roles,
focus rings, motion timings, control heights, the Tools skin's own look.
One light appearance; no dark mode. No new dependencies.

## BOUNDARIES

Backend `tools_workspace.py` is committed-clean; frontend `app/tools/*`
carries another session's dirty work — run `git status --short`, read
the diffs first, build on top, never revert or reformat their code.
Preserve `app/timesheets - Copy/` and every untracked session file. Do
not stage, commit, push, deploy, run migrations, or touch live data.
Throwaway scripts in `tmp/`, never in `frontend/`. No hex in TSX, no
competing Tailwind classes, `:focus-visible` rings, reduced-motion
respected, inline SVG only.

## Validation Plan (done means it ran)

- Focused tests per unit (Tools interactions + backend router tests for
  T4/O1; merge tests for O2; keyboard tests for T2) — run them.
- `npx tsc --noEmit`, `npx eslint` on touched paths, production build
  (shared components + CSS change).
- Route specs for `/tools`, `/overtime`, `/leaves`, `/timesheets`;
  extend the tools + overtime specs to cover the new flows (blocked
  tool → inline record → issued; mark-taken → leave exists; linked
  leave absent from merged days).
- Render and LOOK at: blocked tool rows with actions, both record
  popups, the unknown-number employee row, mark-taken + created leave,
  a timesheet month with a transferred lieu leave (nothing projected)
  — 1440 and 390, keyboard-only pass (Tab/Enter through each picker),
  wheel-scroll pass per surface, reduced motion, no console errors.
  Fixtures only; never destructive flows on live data.

## REPORT BACK

(1) Root cause of each reported problem as verified in code. (2) Changed
files and why. (3) Shared pieces added/changed and who inherits them.
(4) Before/after evidence per surface. (5) Tests, build, specs, axe,
  renders. (6) The migration files written (not run) and the exact
  deploy order. (7) Remaining gaps and anything deliberately not changed.

## NOT THIS PROMPT (follow-ups, do not build)

- Admin password reset: endpoint (`admin.py:200`) + admin UI already
  exist — a verify-then-close check, not a build.
- Free-tier caching evaluation and easy-2FA design: separate prompts
  with their own research; no product names chosen here.
- App-wide UI elegance pass (typeface pairing, colour harmony, spacing,
  animation consistency): separate design track. Note: COLOR_HARMONY.md
  describes a dark theme that does not exist (pre-paint strips `dark`);
  do not implement dark mode from that doc.
