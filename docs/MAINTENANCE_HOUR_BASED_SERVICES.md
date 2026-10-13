# Draft: compressor services run from the Maintenance module

Status: **draft for the owner's decision**, written 10 Oct 2026. Update 13 Oct 2026: the owner chose a narrower slice instead — milestones 400/800/1000/2000/4000/8000 h (backend constant + frontend ladder + row migration, built) and a weekly routine work order per compressor (auto-ensured schedules, built). The equipment_id-link proposal below is still undecided.

## The idea

Today the compressors page has its own "Mark as done" button. The owner's view (agreed): service work belongs to the
Maintenance module, where maintenance schedules and work orders already live. The compressors page should **read** a
unit's service state from there, not record it.

In one line: **Maintenance decides and records the work; Compressors keeps the hour meter and shows the result.**

## What exists today (measured 10 Oct 2026)

| Piece | State |
|---|---|
| Compressor services | Computed in the browser from a fixed ladder of running hours (`calcCompressors.ts`, now 400 / 800 / 1,000 / 2,000 / 4,000 / 8,000 h per the owner). Nothing is stored until someone presses "Mark as done". |
| "Mark as done" | Writes a `service_records` row at the compressor's actual meter (fixed 13 Oct 2026 — it used to overwrite the meter with the interval, which corrupted history). `service_records` has 0 rows. |
| `maintenance_schedules` (5 rows) | Calendar rules only: daily, weekly, monthly, specific dates. They name equipment as free text (`equipment_info`). No hour-based rule exists. A server job turns due schedules into work orders. |
| `work_orders` (136: 134 pending, 2 completed) | Name equipment as free text (`equipment_info`, `equipment`). No link to the Equipment register. They carry artisan and foreman sign-offs and a finish time. |
| Equipment register | 12 compressors (CMP 01 to 12). The compressors list now reads from it (backend change of 10 Oct 2026). |

Two gaps stop the idea working today: a schedule cannot say "every 2,000 running hours", and a work order does not know
*which register item* it is for.

## Proposal

### 1. Link maintenance to the Equipment register
- Add a nullable `equipment_id` (integer, references `equipment.id`) to `maintenance_schedules` and to `work_orders`.
- The schedule and work-order forms get an Equipment register picker beside the free-text field, which stays for
  equipment that is not in the register.
- Backfill existing rows by exact name match only, and list what could not be matched for a person to resolve. Nothing is
  guessed.

### 2. Hour-based schedules
- A new recurrence type, **running hours**, on a schedule that is linked to a unit with a meter. It takes either
  - milestones (`400, 800, 1000, 2000, 4000, 8000`: the compressors' present ladder since 13 Oct 2026), or
  - an interval (`every N hours`).
- A schedule also has an **advance** in hours ("raise the work order 50 h before it is due"), like the existing
  `advance_days`.
- When a compressor reading is saved, the backend checks the unit's schedules. If a milestone is within the advance, it
  **raises one work order** for it. Raising is idempotent: a unique key on (schedule, milestone) means a repeated check or
  a second reading never makes a second work order. The nightly generation job runs the same check, so a unit that nobody
  records readings for is still caught.

### 3. Completion flows back
- When the work order is completed (artisan and foreman sign-offs present, status completed), the backend writes the
  `service_records` row: unit, the milestone, the date, and **the hours at that time taken from the latest reading on or
  before the completion date**.
- The meter is **never overwritten**. The next milestone simply becomes the next one on the ladder.

### 4. What the compressors page shows
Per unit, read-only: `Due in 40 h`, `Work order WO-0123 open (pending)`, or `Done at 2,012 h on 5 Oct`. Each opens the
work order in Maintenance. The "Mark as done" button, the `completeService` call and the compressors "service-records"
write endpoint go. The runway and the Services tab keep their downloads.

## What changes for people
- **Maintenance planners** gain an "every N running hours" option and a register picker. Their existing schedules are
  unchanged.
- **Artisans and foremen** do the same sign-offs they do now; completing the work order is what records the service.
- **Compressor operators** only record readings. They no longer press anything to mark a service.

## Build steps (each can be shipped on its own)
1. Migration: the two `equipment_id` columns, the schedule's hour fields, the unique (schedule, milestone) key. All
   additive, so nothing existing changes.
2. Backend: hour-based schedule model, the check on reading save and in the nightly job, the completion hook, with tests
   that use the real database library signatures (a loose test double hid a bug in this module once).
3. Maintenance pages: the register picker and the hour-based option.
4. Compressors page: read service state from schedules and work orders; remove "Mark as done".
5. Backfill the links on existing rows, with a report of what did not match.

## Risks and how they are handled
- **A reading is saved late.** The hours at completion come from the latest reading on or before the completion date, and
  the service shows that reading's date, so the figure is honest about its source.
- **A unit has no readings yet.** It cannot raise hour-based work orders; the page says "no readings yet", not "nothing
  due".
- **Equipment outside the register.** Free-text schedules keep working as they do today.
- **Duplicates.** The unique key plus idempotent checks, covered by tests.

## Decisions (answered by the owner, 10 Oct 2026)
1. **Milestones:** the same for every compressor: 1,000 / 2,000 / 4,000 / 8,000 / 16,000 running hours.
2. **When the work order is raised:** one day before the milestone. The "day" is turned into hours with the unit's own
   recent running rate (its average daily running hours over its last 14 days of readings, and the 8 h a day the page
   already assumes when there is no history). In practice: raise it once the milestone is projected to fall within one
   day.
3. **Who receives it:** the **Engineering** department.
4. **Mechanical and electrical:** each service raises **two** work orders, one for the mechanical trade (fitters) and one
   for the electrical trade, both to Engineering. The service is recorded as done only when **both** are completed; until
   then the compressors page shows which one is still open.
5. **Overdue:** a milestone that has been passed raises its work orders' priority one level automatically (and it is shown
   as overdue, not just due).

These change step 3 of the proposal: the completion hook waits for both work orders of a milestone, then writes the single
service record. The unique key becomes (schedule, milestone, trade), so a repeated check still never makes a duplicate.

Still to confirm before building: how many priority steps "raise" means if a milestone stays overdue for a long time
(my default: one level at the moment it is passed, and no further automatic changes).
