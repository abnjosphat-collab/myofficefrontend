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
| API | backend repo `app/routers/maintenance.py` — CRUD, stats, dashboard aggregates; `app/routers/schedules.py` — schedules and generation |
| UI module | `app/maintenance/` — `page.tsx`, `types.ts`, `api.ts`, `helpers.ts`, `WorkOrderForm.tsx`, `WorkOrderDetail.tsx`, `QuickCloseDialog.tsx`, `SchedulesView.tsx`, `ScheduleForm.tsx`, `AnalyticsView.tsx`, `ArtisanReportForm.tsx`, `ForemanSignoff.tsx`, `MachinePicker.tsx`, `PhraseField.tsx`, `phrases.ts`, `SignOffField.tsx`, `meta.ts`, `useMaintenanceData.ts` |
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
