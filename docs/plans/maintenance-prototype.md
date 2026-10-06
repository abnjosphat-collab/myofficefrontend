# Maintenance workflow: clickable prototype (Phase 1)

**Status:** Phase 1 built, awaiting the owner's review. Not merged, not deployed, not in the navigation.
**Plan:** `docs/plans/maintenance-workflow.md` (pull request on branch `plan/maintenance-workflow`). Requirement numbers (R1, R2, ...) below refer to it.
**Route:** `/maintenance-prototype` (this branch only). Every machine, person and record on it is invented; nothing is saved.

## How to look at it

```
cp .env.local.example .env.local      # then put placeholder values for the two Supabase variables; no real keys are needed
npm run dev                           # http://localhost:3000/maintenance-prototype
```

The page needs a signed-in session. `scripts/prototype-maintenance-review.mjs` uses the same fixture session as the route specs (a fake token, no live data) and drives the page; its screenshots are in `docs/plans/prototype/`.

At the top of the page, **Prototype controls** force each state: data state (ready, loading, retrying, failed 400, forbidden 403, empty, failed refresh with rows kept), the role (foreman or artisan/requester), a save conflict on the next save, a failing schedule preview, and failing registers. Collapse the panel on a phone.

## What was built, and the plan requirement each serves

| Screen | Component (real, under `app/maintenance/` or `components/shared/`) | Requirements |
|---|---|---|
| Machine, person, section fields that fill from the register on Tab | `RegisterField` (wraps `PredictiveInput`; **one additive extension** to it: `options`, `useHistory`, `onPick`) | R34 |
| Assign someone, with people on leave greyed and the reason shown | `AssignmentPicker` | R7, R8 |
| Work order list: stat strip as filters, saved views, filters, bulk bar, cards or table, paging, every data state | `WorkOrderListView`, `savedViews.ts` | R1, R2, R35 |
| Quick and breakdown work order, four fields, retry-safe | `QuickWorkOrderForm` | R4, R5, R37 |
| Work order record as a **pop-up over the list** (owner's feedback, 6 Oct) with tabs (Basic info, Feedback, Assignments, Permits, Comments, Audit trail), status actions, sign-off, conflict banner | `WorkOrderRecordView` | R3, R6, R9, R10, R11, R13, R14 |
| Request form, request inbox, review with signature, reject with reason | `RequestForm`, `RequestInboxView` | R15 to R20 |
| Schedule with many machines and a preview of the next occurrences | `ScheduleFlowForm` | R21 to R24 |

The in-memory source is `app/maintenance-prototype/fakeServer.ts`. It copies the plan's leave rule (M.5) and transition table (M.4) only so the screens can be judged; in Phase 2 the real rules live on the server and this file is deleted. The screens take their data through props shaped like the real hooks, so Phase 2 changes the source, not the screens.

Not prototyped (as the plan said): the scheduler board and the KPI board (round 2, if you want them), exports, notifications, anything that needs the backend.

## What was checked

- `npx tsc --noEmit`: no errors in the new or changed files. (The repository as a whole shows errors in `app/services/ImportDialog.tsx` and the download button only because the `xlsx` package cannot be installed in this environment: its host returns 403.)
- `npx eslint` on the changed folders: no errors.
- `npx vitest run components/shared`: 50 tests pass, 7 of them new for `RegisterField` and 3 new for `PredictiveInput`'s register mode; the 13 existing `PredictiveInput` tests pass unchanged.
- `scripts/prototype-maintenance-review.mjs`: **24 checks pass** in a real browser (Chromium), with no browser errors:
  - Tab fills the machine from the register and the field says "From register"; typing something else says "Free text".
  - A person on approved leave is listed, `aria-disabled`, with "On annual leave, 05 Oct 2026 to 12 Oct 2026 (approved)"; Tab fills the first **available** match; submitting that person anyway is refused inside the dialog with the reason; an available person is assigned.
  - A flagged permit without a reference is explained and refuses Start in place.
  - A save conflict says who changed it and keeps what was typed.
  - Loading and a slow service (503) never claim "empty"; a 400 shows "could not be loaded" with Try again and the stat tiles say "Unavailable", not 0; 403 shows the access message; empty shows the honest empty state; a failed refresh keeps the rows with "may be out of date".
  - Approving without a signature does not submit; the schedule preview renders rows.
  - At 390 px wide the list and the record do not scroll the page sideways.
- Screenshots were looked at (list, picker, approval, record, schedule preview, error state, phone), not only counted.

## What was NOT checked

- Anything against the real backend, real registers, real leave data, real roles or the real sign-in. The role switcher only hides buttons.
- Tablet width (820), 320 px, 130 per cent text size, keyboard-only walkthrough of every dialog, a screen reader, a real phone, Safari and Firefox.
- The contrast of the amber note under a greyed person (`text-warning` on the surface): the design system's computed contrast table lists status colours with their soft backgrounds, not this pairing. It needs a measurement before Phase 2.
- The signature pad: it works as the existing pad does but its image is discarded; the saved-signature feature calls the real API, which is absent here.
- Performance with thousands of work orders (the list pages 10 rows of 30 in memory).

## What Phase 1 changed in the plan

1. **A real bug was found by rendering:** `PredictiveInput` re-ran its ghost-text effect on every render (its `hints = []` default is a new array each time), and the new register mode stored an object each time, which looped ("Maximum update depth exceeded"). Fixed by keeping the same entry when nothing changed. A unit test run alone would not have shown it.
2. **Slow service is not failure.** The plan's route-spec wording said a 503 should show the failure state. The design system deliberately treats 5xx, 408, 429 and no answer as "still loading, retrying", and shows failure only for other statuses. The plan was corrected (sections T.2 and W.10).
3. **No confirm dialog for a plain Start or Resume.** The first build opened a dialog with only a button; moves that need nothing from the person now run at once and show a refusal in place. Moves needing a reason or a signature still open a dialog.
4. **A freshly seeded record showed "Free text" for a section that was on the register.** The prototype data was fixed; the lesson for Phase 2 is that every register-linked column must come back with its id, or the field wrongly reports free text.
5. **Dynamic route confirmed possible.** The bundled Next.js documentation (v16.3.8) shows `params` is a Promise in dynamic segments. The prototype keeps the record inside one page so it needs no route; `/maintenance/[id]` remains the Phase 2 plan.

## What to decide after looking

1. Is the register-first Tab behaviour right (ghost text only for an available person, unavailable people listed greyed)?
2. Cards or table as the list default on a desktop (the existing page defaults to cards; the plan's wireframe drew a table)?
3. The record is now a pop-up, as you asked. This replaces the plan's full page `/maintenance/[id]`; a phone may still want a full page, so say if the pop-up should become a full-height sheet there.
4. Round 2: prototype the scheduler board and KPI board before building, or build the work order, request and schedule slices first?

## Changes after the first review (6 Oct 2026)

- The work order record opens as a pop-up over the list instead of replacing the page.
- Less noise: the prototype banner is one line and the controls are collapsed by default; the priority chips became one "Any priority" filter beside type and assignee; the card no longer repeats priority (only High and Urgent show a badge); tab counts show only when above zero; the record's header lost its breadcrumb and large title.
