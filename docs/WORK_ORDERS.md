# Work orders — implementation map

Work orders are a **priority workflow** for engineering managers. Do not invent or silently change status semantics without explicit product approval.

## Authoritative status values (current backend)

From backend `app/routers/maintenance.py` stats and filters:

| Status | Notes |
|--------|--------|
| `pending` | Default on create (`WorkOrderCreate.status`) |
| `in-progress` | Hyphenated string in DB |
| `completed` | Used for overdue logic exclusion |
| `on-hold` | Hyphenated string in DB |
| `not-done` | A planned job that was missed (M0 section 2; terminal, never overdue) |
| `cancelled` | Set aside (terminal, never overdue) |
| `postponed` | Deliberately deferred (still open; can be overdue) |

Overdue = a row with a `due_date` in the past whose status is not terminal (terminal = `completed`, `cancelled`, `not-done`).
Any new status must be wired through stats, filters, and UI consistently.

## Closing a job (M2, 26 Oct 2026)

The artisan closes fast; the foreman signs later. Completion and sign-off are separate steps: a job counts as
completed when the artisan closes it, whether or not the foreman has signed.

- **Single close:** `POST /api/maintenance/work-orders/{id}/close` with what was done plus the actual time (start and
  finish times, or plain hours). A breakdown also needs its cause and failure mode. Anything the row already holds
  counts: the check runs on the merged values, so a job reported earlier closes with only what is missing. Sets
  `status: completed`, `progress: 100`, the M1 stamps, and one `closed` audit event. Refuses a terminal job (409) or a
  job with gaps (422 naming each one). The foreman sign-off is untouched.
- **Bulk close:** `POST /api/maintenance/work-orders/bulk-close` with up to 100 ids plus the shared note and time.
  Only open, routine planned jobs close in bulk (no classification yet, or `planned_maintenance`); every other row is
  skipped with its reason. The answer is always 200: `{closed: [ids], skipped: [{id, reason}]}`.
- **Awaiting sign-off** = `status: completed` with a blank `foreman_sign`. It has its own tile, filter, and badge on
  the register; the foreman signs from the work-order detail as before.
- The full artisan report (`ArtisanReportForm`) still closes the old way (PATCH with `status: completed`); the close
  endpoints are additive, so today's frontend keeps working.

## Failure coding (M3, 26 Oct 2026)

A breakdown is closed with three codes — Problem, Cause, Action — picked from
manager-edited lists (or typed new, which remembers the value for next time).
Anything else closes without them: the codes are required only for breakdowns.

| Code | Work-order column | Lookup list |
|------|-------------------|-------------|
| Problem (what failed) | `failure_mode` | `failure_problem` |
| Cause (why it failed) | `cause_of_failure` | `failure_cause` |
| Action (what fixed it) | `corrective_action` (nullable; M3 SQL below) | `failure_action` |

- **Required only for breakdowns:** `POST .../close` refuses a breakdown close
  missing any of the three (422 naming each gap), on the same merged values as
  M2 (what was sent, falling back to the row). Other jobs never need codes,
  and bulk close never carries them (breakdowns cannot join a batch).
- **The lists are seeded starters:** `supabase_m3_failure_codes_20261026.sql`
  (NOT RUN — owner-run, one transaction, backup inside) adds the
  `corrective_action` column and seeds 8 values per list. They are marked
  "starter list, replace with eMaint codes" in the Admin panel; managers edit
  them at Admin panel > Shared lists (add, rename, delete; rename/delete are
  manager-only on the server too). Until the SQL runs, the server neither
  requires nor stores the Action (the column does not exist); Problem and
  Cause work before and after.
- **New values are learned:** a close or artisan report that stores a value
  not on its list adds it (case-insensitive match first, so "Wear" and "wear"
  do not both land on the list). Learning never fails the write.

## One entry for breakdowns (M4, 26 Oct 2026)

A breakdown holds the downtime; its work order holds the job and the cost.
Each breakdown links to at most one work order through
`breakdowns.work_order_id` (nullable; the M4 SQL below). The work order's
breakdown is read back through the same column, so the two directions can
never disagree. Deleting a job unlinks its breakdown (the downtime record
survives); a breakdown with a job cannot be deleted (409 naming the job —
delete the job first).

- **Breakdown first:** logging a breakdown raises its job (`classification:
  breakdown`, with the machine, artisan, department, date and description
  carried over; critical becomes urgent) unless unticked ("Raise a work
  order", on by default). The job is raised before the breakdown is stored,
  so a failed raise stores nothing.
- **Job first:** raising a breakdown job (or classifying one as a breakdown,
  or closing one) raises a breakdown shell — machine, artisan and date
  carried over, times and metrics NULL until recorded. Only a breakdown job
  can record downtime (422 otherwise).
- **The old rows:** `POST /api/breakdowns/{id}/work-order` raises the job
  for an unlinked breakdown; `POST /api/maintenance/work-orders/{id}/breakdown`
  records the shell for a breakdown job without one. Both are idempotent
  (`already_linked`); `GET .../work-orders/{id}/breakdown` answers the
  linked breakdown or null.
- **Pre-SQL:** until `supabase_m4_breakdown_work_order_20261026.sql` has run
  (NOT RUN — owner-run, one transaction, backup inside), logging still
  raises the job but stores no link; shells are skipped (a shell with no
  link is the double entry M4 removes); the reverse read answers null and
  the explicit shell endpoint refuses (409). The SQL backfills nothing: no
  live breakdown matches a live breakdown job by machine and date.
- A breakdown create answers its job as `work_order: {id, work_order_number}`
  (null when opted out); a breakdown-job create/PATCH answers `breakdown_id`
  (the shell, or null).

## Measures (M5, 26 Oct 2026)

The seven measures are computed on the server (`GET /api/maintenance/measures?days=90&weeks=12`,
clamped to 7-365 days and 4-26 weeks) and read from the same scoped rows as the register, so every
figure reconciles with its drill-down by construction. Each figure carries the ids it counts: the
Analytics tab opens work-order figures as the counted jobs and links breakdown figures to
`/breakdowns?q=<machine>`. An empty denominator reads "No data", never 0%. The misleading
"Completion %" tile (completed divided by every work order ever) is removed.

A job's completion date is its `completed_at` stamp, else its `artisan_date` (a completed job with
neither counts as completed on no known date). A work order's machine is its `equipment_id` when
linked, else its trimmed `equipment_info` (case-insensitive); breakdowns carry `machine_name` only,
so the worst-machines open-job match is by normalized name.
| # | Measure | Numerator | Denominator / set | Period | Statuses |
|---|---|---|---|---|---|
| 1 | PM done on time % | Planned jobs due in the period, completed on or before `due_date` | Planned jobs due in the period, excluding `cancelled` (`not-done`, still-open and completed-without-a-date count as missed) | Trailing 90 days | All but `cancelled` |
| 2 | Backlog by age | Open jobs in each bucket: 0-7, 8-30, 31-90, over 90 days since `date_raised`, plus "Date unknown" | All open jobs (not `completed`/`cancelled`/`not-done`) | Today | Open only |
| 3 | Opened vs completed per week | Per week: opened (by `date_raised`), completed (by completion date); unknowable dates counted once as undated | All jobs | Last 12 Harare weeks (Monday start), incl. the current week | Opened: all; completed: `completed` |
| 4 | Downtime / MTTR / MTBF per machine | Downtime = sum of `downtime_minutes`; MTTR = mean `repair_time_minutes` (null when none recorded); MTBF = mean gap in days between consecutive breakdown starts (null under 2) | Breakdowns with `breakdown_date` in the period, grouped by `machine_name` (case-insensitive) | Trailing 90 days | All breakdowns |
| 5 | Repeat failures | Breakdown jobs sharing a machine and Problem code (`failure_mode`, case-insensitive), 2 or more in the period; "30-day" when the span is 30 days or less, else "90-day" | Breakdown-classified jobs with a code | Trailing 90 days | All |
| 6 | Worst machines | Machines ranked by breakdowns, then downtime (top 10), with open-job counts name-matched (machines with open jobs but no breakdowns do not appear) | Breakdowns in the period + open jobs | Trailing 90 days | Breakdowns: all; jobs: open only |
| 7 | Labour hours and spares cost per machine | Labour = recorded `total_time_worked` only (`7h 30m` or a bare number; estimates never count); spares = quantity x `unit_cost` (work-order spares; breakdown-side spares not included yet) | Jobs raised in the period | Trailing 90 days | All |

## Machine history (M6, 26 Oct 2026)

One page per Equipment register item (`/equipment/history?equipment=<id>`):
its jobs, breakdowns, planned work, spares, hours and its measures, counted
on the server (`GET /api/equipment/{id}/history?days=90`, clamped to 7-365
days). Unknown and out-of-scope machines both answer 404. No SQL in this
batch: the endpoint reads existing columns only.

A job or schedule belongs to the machine by its `equipment_id` link when the
M1 columns exist (before that, links match nothing), else by its
`compressor-routine:NN` marker naming the register id, else by its machine
name normalized (trimmed, case-insensitive). Breakdowns match by normalized
`machine_name` only — they carry no `equipment_id`, and M6 does not add one.
Name matching is case-insensitive on purpose (aggregation, like M5), unlike
M1's case-sensitive link resolution (a write, which must not guess). The
payload says `links_active` so the page can caveat name-matched figures.

Lists (jobs newest first, breakdowns newest first, schedules active first
then next due, spares by cost) and totals cover everything ever recorded, so
each total reconciles with the list beside it:

| Total | Definition |
|---|---|
| Open jobs | Jobs whose status is not `completed`/`cancelled`/`not-done` |
| Labour hours | Recorded `total_time_worked` only (`7h 30m` or a bare number; estimates never count) |
| Spares cost | Work-order lines (`quantity` x `unit_cost`) plus breakdown lines (`total_cost`, else `quantity` x `unit_price`), by part name; a line with no name is counted nowhere |
| Downtime hours | Sum of `downtime_minutes` over the machine's breakdowns, divided by 60 |

The measures reuse the M5 definitions over the trailing window: PM done on
time % over the machine's planned jobs; downtime/MTTR/MTBF over its
breakdowns in the window (a single row — every matched breakdown shares the
machine's normalized name); repeat failures by Problem code alone (every job
here is this machine's already, however it matched). Empty denominators read
"No data", never 0.

The register links in: every card, table row and the detail dialog carry a
History link to the machine's page. Jobs link out to `/maintenance?open=` and
breakdowns to `/breakdowns?open=`.

## Links and lifecycle timestamps (M1, 26 Oct 2026)

Equipment is the register's `equipment.id`, not a typed name. Free text (`equipment_info`) stays for machines not on the register.

| Field | Meaning | Set by |
|--------|--------|--------|
| `equipment_id` | The register machine this record is for (nullable; `ON DELETE SET NULL`) | Picker, or the server on an exact trimmed-name match / `compressor-routine:NN` marker; a schedule's link is inherited by the jobs it raises |
| `schedule_id` (work orders) | The schedule that raised this job | Generation (`_generate_one`); backfilled from `maintenance_schedule_runs` |
| `started_at` | When work first started | Server, on the first move to `in-progress` (a direct close fills it too) |
| `completed_at` | When the artisan closed the job | Server, on the move to `completed` |
| `signed_off_at` | When the foreman sign first appeared | Server, when `foreman_sign` goes from blank to non-blank |

Stamps are written once and never cleared or overwritten (reopening keeps history); the browser never sends them. Generated jobs carry `classification: planned_maintenance` plus their schedule's `discipline` and `trade`. Until `supabase_m1_maintenance_links_20261026.sql` has run, the columns do not exist: the API drops the link keys, stamps nothing, and answers link-filtered reads with `[]`.

## Code locations

| Layer | Path |
|--------|------|
| API | backend repo `app/routers/maintenance.py` — CRUD, stats, dashboard aggregates; `app/routers/schedules.py` — schedules and generation; `app/routers/equipment.py` — the register plus `GET /{id}/history` (M6); `app/machine_history.py` — the pure history computation |
| UI module | `app/maintenance/` — `page.tsx`, `types.ts`, `api.ts`, `helpers.ts`, `WorkOrderForm.tsx`, `WorkOrderDetail.tsx`, `QuickCloseDialog.tsx`, `SchedulesView.tsx`, `ScheduleForm.tsx`, `AnalyticsView.tsx`, `ArtisanReportForm.tsx`, `ForemanSignoff.tsx`, `MachinePicker.tsx`, `PhraseField.tsx`, `phrases.ts`, `SignOffField.tsx`, `meta.ts`, `useMaintenanceData.ts` |
| Machine history (M6) | `app/equipment/history/page.tsx`, `app/equipment/history/MachineHistoryView.tsx`, `app/equipment/historyTypes.ts`, `app/equipment/api.ts` (`fetchMachineHistory`); History links on `app/equipment/page.tsx` (cards, table, detail) |
| Related ops | Breakdowns, requisitions, spares, equipment pages may link or reference maintenance context — grep before assuming isolation |

## Journey checklist (when touching WOs)

- [ ] Create / edit / assign / schedule fields persist correctly (`exclude_unset` on PATCH — no null-clear regressions).
- [ ] List filters, sort, and search preserve context when opening and returning from detail.
- [ ] Status and priority visible at a glance; overdue distinguishable from on-track.
- [ ] Completion vs formal closure: preserve any business distinction already in UI copy and fields — do not merge without approval.
- [ ] Documents, notes, spares, and history reachable from the record where the app already supports them.
- [ ] Errors surface to the user; empty list ≠ failed load.
- [ ] Stats on homepage/maintenance dashboard reconcile with filtered lists.

## Metrics

If adding reporting (closure rate, backlog age, on-time completion), document numerator/denominator/period/status set in the PR or doc **before** implementing. Reuse `get_work_order_stats()` patterns or extend them — do not duplicate conflicting counts.
