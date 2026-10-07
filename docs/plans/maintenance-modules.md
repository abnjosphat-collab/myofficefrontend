# Maintenance as its own category: modules, registers, clean UI (plan v2)

**Status:** requirements, plan, model and wireframes for owner review. Nothing in this document is built. It revises [the v1 plan](./maintenance-workflow.md) after the owner's 7 Oct 2026 direction, and the v1 plan stays authoritative for everything this document does not change (rules R1 to R38, tables in M.2, state diagrams in M.4, the leave rule in M.5).
**Audience:** the owner, for approval of the wireframes; then the developers and agents who build each slice.

## 0. What the owner asked for, and what changes

1. Maintenance becomes **its own category in the left sidebar**, not one page inside "Operations & Maintenance".
2. The functions are **separate modules that belong together** (work orders, requests, schedules, planner, overview), each with one job.
3. Every module **picks from the employees, equipment and tools registers** so nothing is retyped.
4. The UI is **as clean as the top navigation bar**: quiet, one row of controls, nothing competing.
5. Order of work: requirements, plan, model, wireframes (this document), then implementation, slowly and well.

**What stays from v1:** the work order lifecycle and signatures, requests with signed approval, scheduled work, leave blocking, audit trail and row version (slice 1, already built, migration waiting for the owner), the honest data states, shadow-mode rules, the release gate.

**What changes:** the page structure (one page with five tabs becomes five modules under one category), the look (section 6), the list of registers every form reads (adds the Tools register, section 3), and the slice order (section 7).

**Decisions taken by the author on the owner's instruction ("decide for me")** are marked **[D]** and listed together in section 9. Each stays open to change at review.

## 1. Requirements (new or changed; R-numbers continue from v1's R38)

| # | Requirement | Acceptance check |
|---|---|---|
| R39 | A top-level sidebar category **Maintenance** holds the maintenance modules. The old "Maintenance" entry leaves "Operations & Maintenance". | The sidebar shows Maintenance as its own group with its modules; the group opens on any maintenance route; role filtering still applies. |
| R40 | Each module is its own route with its own page, loading state, failure state and empty state. A failure in one module never blanks another. | Route specs per module: ready, empty, failed load, 390 px. |
| R41 | Modules are related by **links, not copies**: a work order shows its request and schedule as links; a request shows its work order; a schedule lists the work orders it raised; the planner opens the record. | Every cross-reference in the model (M.1) is a working link both ways. |
| R42 | Every free-typing field that names a thing in an existing register becomes a **register picker**: type to search, arrow keys, **Tab fills the highlighted match**, free text still accepted, and the field shows whether the value matched the register. Registers: employees (people, section, supervisor), equipment (machines), tools (Tools & Equipment register), spares (parts), lookup lists (sections, departments, failure modes). | No form in the maintenance modules has a plain text box for a machine, a person, a section, a tool or a part. A test per picker. |
| R43 | A work order lists the **tools** needed, picked from the Tools register, each showing whether it is available now, who holds it, and whether its inspection is overdue. These are **warnings, not blocks**; issuing and returning stay in `/tools`. | Pick a tool: its status shows. A tool that is issued out or overdue for inspection shows a plain-words warning and can still be added. Maintenance never writes to the Tools register. |
| R44 | **One primary action per screen**, one search per list, filters collapsed until needed, no statistic tile that is not also a filter. | Checked against the clean rules in section 6.1 in review of each screen. |
| R45 | Old addresses keep working. `/maintenance` stays valid. | `/maintenance` lands on the Overview **[D]**; the old Work orders content is at `/maintenance/work-orders`; the home page "New work order" shortcut opens the New work order dialog. |
| R46 | A module is shown to a person only if their role may use it (viewers see lists and records, not create buttons; the Planner and approvals need `manager`). | Role test per module; a viewer sees no dead buttons. |
| R47 | The phone experience is first-class: lists become cards, forms become full-height sheets, the record is a full page. | Route specs at 390 px for every module. |

## 2. The modules

| Module (sidebar label) | Route | One job | Main users | Registers it reads | Delivery slice |
|---|---|---|---|---|---|
| **Overview** | `/maintenance` | "What needs me today": overdue, awaiting sign-off, requests waiting, my jobs, a small set of figures. Not a dashboard of everything. | everyone; managers most | work orders, requests | 12 |
| **Work orders** | `/maintenance/work-orders`, record at `/maintenance/work-orders/[id]` | Raise, assign, do, sign off and find work orders (including on-the-fly and breakdown). | artisans, foremen, planners | equipment, employees, tools, spares, lookup lists | 2 to 6, 8, 11 |
| **Requests** | `/maintenance/requests` | Anyone asks for work; a foreman approves with a signature or rejects with a reason; approval makes the work order. | requesters, foremen | equipment, employees | 7 |
| **Schedules** | `/maintenance/schedules` | Recurring work: define it, see the next dates before saving, raise work orders on time. | planners | equipment, employees, tools | 9 |
| **Planner** | `/maintenance/planner` | People against days, leave visible, drag work onto people, publish the week. | planner, manager | employees, leaves, work orders | 10 |
| **Task library** | `/maintenance/tasks` | Reusable tasks with steps and parts. **Not built now [D]**; the module slot is reserved and the sidebar does not show it until it exists. | planners | tools, spares | 13 |

**Related modules that already exist and move into the Maintenance category [D]:** Breakdowns, Condition Monitoring, Reliability. They are maintenance by nature; only their sidebar group changes, not their addresses. **Job Cards** stays in Operations, frozen, as in v1 Q4. Spares, Compressors, Standby, Requisitions and Third Party Services stay in Operations & Maintenance. This is one edit to `components/app-shell/modules.ts` and can be reverted by editing the same list.

Why these splits: each module answers one question a person arrives with ("what is on my plate", "what is broken and who has it", "who asked for what", "what recurs", "who is free"), so each screen can be quiet. Putting all five on one page, as today, is what made it noisy.

## 3. Registers: what every picker reads, and the one gap

| Field | Register | Source today | Notes |
|---|---|---|---|
| Machine | Equipment | `GET /api/equipment` via `useEquipment` | one or several machines on a schedule or request; one per work order (v1 R25) |
| Person (assignee, requested by, foreman, engineer) | Employees | `useEmployees`; leave from `leaves` | on leave: greyed with reason and dates, refused by the server (v1 R7, R8) |
| Section, department | Lookup lists, else distinct employee sections | `lookup_lists`, `employees.section` | free text allowed |
| Tool needed | **Tools & Equipment** | `tools_workspace_equipment`, **not reachable today** (see below) | read only |
| Part | Spares | `useSpares` | stock figure shown; issue path is slice 11 |
| Failure mode | `failure_modes` | router exists | replaces the 20 hard-coded names |

**The one gap, found while reading the code:** the Tools register has **its own sign-in** (its own accounts and sessions, `app/routers/tools_workspace.py`), by the owner's decision that `/tools` stays a standalone workspace. A maintenance page signed in with the normal MyOffice login cannot call it. **Proposed bridge [D]:** one new **read-only** endpoint in the maintenance router, `GET /api/maintenance/registers/tools`, protected by the normal MyOffice sign-in, which reads `tools_workspace_equipment` (non-archived) and the current custody and inspection state with the service-role client the backend already holds, and returns only what a picker needs. It does not touch the Tools accounts, sessions or write paths. The alternative (asking maintenance staff to sign in to Tools as well) was rejected because it defeats "never retype".

Returned per tool: `id`, `register_number`, `name`, `make_model`, `category`, `equipment_kind`, `department`, `status` (available, issued, overdue, out of service), `holder` (name when issued), `expected_return_at`, `inspection_due` (date and whether overdue), `condition`, `archived`.

## 4. Model changes (additive to v1 M.2)

Only one new table; everything else is v1.

#### `work_order_tools` (new; slice 3)

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | bigserial | PK | | |
| `work_order_id` | bigint | NN | | FK `work_orders(id)` ON DELETE CASCADE |
| `tool_register_number` | text | | | the key from the Tools register (not a foreign key: that register is a separate workspace and its ids are text) |
| `tool_name` | text | NN | | snapshot of the name, so the work order still reads correctly if the tool is renamed or archived |
| `note` | text | | | "needs 24 mm socket set" |
| `added_by` | uuid | | | |
| `created_at` | timestamptz | NN | `now()` | |

Unique on (`work_order_id`, `tool_register_number`) where the number is not null. Free-text tools (not in the register) are allowed with a null register number, which is the provision for the free-text rule. Maintenance never changes custody. The migration is a new section in the draft and, in Phase 2, its own `supabase_migration_maintenance_tools.sql` with the same rehearsal as slice 1.

**Not in the model, on purpose:** no copy of employees, equipment or tools; no cost or rate columns (out of scope in v1); no tool reservation (Maintenance warns, `/tools` issues).

## 5. Functions (additions to v1 F)

| Endpoint | Role | Purpose |
|---|---|---|
| `GET /api/maintenance/registers/tools` | any signed-in | the picker feed above; a failed read is a failure, never an empty list |
| `GET/PUT /api/maintenance/work-orders/{id}/tools` | read: any; write: `user`+ | the tools on a work order; `PUT` replaces the list, audited in `maintenance_events` |
| `GET /api/maintenance/overview` | any signed-in | counts and the "needs me" lists for the Overview (slice 12): overdue, awaiting sign-off, requests waiting, my jobs; reuses the work order and request tables, no new data |

Frontend shared pieces (all in `app/maintenance/`, built on `components/ui-system`, no second design system): `RegisterField` (one picker for every register, built on `PredictiveInput`/`SuggestField`), `useRegisters` (employees, equipment, tools, spares, lists, one cached read each), `MaintenanceNav` (sub-navigation used on small screens, see 6.3), `RecordHeader`.

## 6. The look: what "as clean as the top bar" means in practice

### 6.1 The rules (each is checkable in review)

Distilled from what makes the top bar quiet: one row, neutral surface, one search, icon buttons with no labels clutter, status shown only where it matters.

1. **One primary button per screen**, top right. Everything else is a text button or inside a **More** menu.
2. **No statistic tiles** on list pages. The count and the filters are one quiet line of text above the table ("96 open, 14 overdue") whose words are the filters. Figures live on the Overview.
3. **Table first** on desktop, cards on phone. No card grids on desktop lists.
4. **Hairlines, not boxes.** Rows are separated by a 1 px line; no nested bordered panels; whitespace groups things.
5. **Badges only for status and priority**, and a row shows at most two. Type, section and source are plain muted text.
6. **One search field**; machine, person, section, status and date filters sit behind a single **Filters** button until used. Active filters show as removable chips.
7. **A record shows five facts, then tabs.** Machine, status, assignee, due, and the next action. Everything else is under tabs.
8. **Forms are pop-ups** (as the owner already likes in New work order), short, one column, three required fields at most for the quick forms.
9. **Type and colour exactly as the existing system** (v1 W.0): no new colour, no new size.

### 6.2 Sidebar

```
 MyOffice                                  (existing shell)
 ──────────────────
 Home
 Favourites
 All modules
  ▸ Core Management
  ▸ Manager Tools
  ▾ Maintenance                      <- new category, opens on any maintenance route
      Overview
      Work orders
      Requests            (7)        <- count only when something is waiting
      Schedules
      Planner
      Breakdowns                     <- moved here
      Condition Monitoring           <- moved here
      Reliability                    <- moved here
  ▸ Operations & Maintenance        <- keeps Spares, Compressors, Standby, Requisitions, Third party, Job Cards
  ▸ Time & Attendance
  ...
```

The group uses the existing `NavGroup`/`NavItem`; the only code change is the data in `modules.ts` plus routes. On a phone the sidebar is the existing drawer, and the page shows a one-line module switcher (`Segmented`: Overview, Work orders, Requests, Schedules, Planner) under the title.

### 6.3 Page frame shared by every module

```
 Maintenance / Work orders
 Work orders                                                         [ + New work order ]
 ───────────────────────────────────────────────────────────────────────────────────────
```

Title in `text-page`, one muted breadcrumb, one primary button. Nothing else in the header. The old heading description line is dropped (it said what the title already says).

### 6.4 Overview (`/maintenance`)

```
 Maintenance / Overview
 Overview                                                            [ + New work order ]
 ───────────────────────────────────────────────────────────────────────────────────────
 Needs attention
   14 overdue work orders  ·  9 awaiting sign-off  ·  7 requests waiting  ·  3 unassigned
   (each phrase is a link into the filtered list)

 Mine today                                                     Waiting for you
 ┌──────────────────────────────────────────┐   ┌───────────────────────────────────────┐
 │ Compressor 2, drive end bearing   Today  │   │ REQ-00018  Pump A leaking     Approve │
 │ Pump A, discharge valve           Overdue│   │ REQ-00017  Fan 2 vibration    Approve │
 │ ...                                      │   │ ...                                   │
 └──────────────────────────────────────────┘   └───────────────────────────────────────┘

 Last 30 days     Completed on time 82%  ·  Breakdowns 6  ·  Mean time to repair 4.2 h   (small text, one line)
```

Two plain lists and two lines of text. Targets show "not set" until the owner gives them (v1 Q10). Role view: a requester sees "My requests"; a viewer sees the lists without actions.

### 6.5 Work orders (`/maintenance/work-orders`)

```
 Maintenance / Work orders
 Work orders                                                         [ + New work order ]
 ───────────────────────────────────────────────────────────────────────────────────────
 [ Search machine, number or person            ]  [ Filters ]  Mine · Overdue · Unassigned      [ ≡ ]  [ ⋯ ]
 96 open · 14 overdue · 9 awaiting sign-off                                  Sorted by due date
 ───────────────────────────────────────────────────────────────────────────────────────
   Machine                          Status            Assigned       Due
 ───────────────────────────────────────────────────────────────────────────────────────
   Compressor 2, drive end bearing  In progress       A. Moyo        12 Oct
   WO-00231 · Breakdown · Plant 2
 ───────────────────────────────────────────────────────────────────────────────────────
   Pump A, discharge valve          Pending  Overdue  Unassigned     3 Oct
   WO-00229 · Weekly pumps schedule
 ───────────────────────────────────────────────────────────────────────────────────────
   1 to 25 of 96                                                          ‹  1  2  3  ›
```

- `Mine · Overdue · Unassigned` are the preset views as plain links; the active one is underlined, not boxed.
- `[ ≡ ]` switches table and cards; `[ ⋯ ]` holds Download, Refresh, Bulk select, Saved views.
- The status column shows the status badge, plus **Overdue** only when true. Priority appears as a small marker beside the machine only for High and Urgent.
- Selecting rows reveals a bulk bar that replaces the count line; nothing is shown until a row is selected.
- Phone: the same list as cards, one tap opens the full-page record, a floating **+** raises a work order.

### 6.6 Work order record (`/maintenance/work-orders/[id]`)

```
 Maintenance / Work orders / WO-00231
 Compressor 2, drive end bearing                         [ Complete ]   [ ⋯ ]
 In progress · High · Breakdown                                           (muted, one line)
 ───────────────────────────────────────────────────────────────────────────────────────
 Assigned  A. Moyo, T. Dube       Due  12 Oct       Section  Plant 2       Raised  6 Oct by T. Dube
 From request REQ-00018  ·  Machine record  ·  Breakdown BD-00112          (links)
 ───────────────────────────────────────────────────────────────────────────────────────
 Details   Feedback   Assignments   Tools & parts   Comments   History
 ───────────────────────────────────────────────────────────────────────────────────────
 (tab content: one column of label/value rows; no boxes)
```

The status action is the one primary button and is the next legal step (Start, Complete, Sign off). On desktop the record may also open as the large pop-up from a list (the owner's earlier preference) with the same content; the full page is the shareable address and the phone view **[D]**.

### 6.7 Requests (`/maintenance/requests`)

```
 Maintenance / Requests
 Requests                                                              [ + New request ]
 ───────────────────────────────────────────────────────────────────────────────────────
 Waiting for approval (7) · My requests · All                    [ Search ]
 ───────────────────────────────────────────────────────────────────────────────────────
   Pump A, gland leaking      REQ-00018   T. Dube    Today      High        [ Approve ] [ Reject ]
   Fan 2 vibration            REQ-00017   S. Ncube   Yesterday  Medium      [ Approve ] [ Reject ]
```

Approve opens a small pop-up: summary, assignee and due date (pre-filled, from the registers), the approver's signature, one **Approve and raise work order** button. Reject asks only for a reason. A requester sees their own requests with a plain status line and, once approved, a link to the work order.

### 6.8 Schedules (`/maintenance/schedules`)

```
 Maintenance / Schedules
 Schedules                                                            [ + New schedule ]
 ───────────────────────────────────────────────────────────────────────────────────────
   Weekly pump inspection       Pump A, Pump B       Mondays       Next 12 Oct       Active
   Monthly conveyor audit       Conveyor 3           22nd          Next 22 Oct       Paused
```

The New schedule pop-up has three short parts (what, which machines, how often) and a live line **"Next dates: 12 Oct, 19 Oct, 26 Oct"** before saving (v1 R22).

### 6.9 Planner (`/maintenance/planner`, `manager`)

```
 Maintenance / Planner
 Planner                                                        [ Publish week ]
 ───────────────────────────────────────────────────────────────────────────────────────
 ‹  Week of 12 Oct  ›      Mon     Tue     Wed     Thu     Fri     Sat     Sun
 A. Moyo                  [job]   [job]   ....    ....    [job]
 T. Dube                  [job]   LEAVE   LEAVE   LEAVE   ....
 S. Ncube                 ....    ....    [job]   ....    ....
 ───────────────────────────────────────────────────────────────────────────────────────
 Unassigned (3)   Overdue (14)          drag a job onto a person and day
```

Leave days are a quiet grey band with the word LEAVE; a job cannot be dropped there (refused with the reason, as on the server).

### 6.10 The picker used everywhere (`RegisterField`)

```
 Machine
 [ comp                                     ]
   Compressor 1        EQ-014   Plant 2        <- highlighted, Tab fills it
   Compressor 2        EQ-015   Plant 2
   Compressor 3 (standby)  EQ-016
   ─ Use "comp" as typed ─                     <- the free-text provision, always last

 Assign to
 [ moy                                      ]
   A. Moyo       Fitter      Available
   T. Moyo       Electrician On leave 14 to 18 Oct   <- greyed, with reason and dates, not selectable

 Tool needed
   [ 24 mm socket                             ]
   Socket set 24 mm   TL-0231   Issued to S. Ncube, due back today      <- warning, still selectable
   Torque wrench 200 Nm TL-0044  Inspection overdue 3 days              <- warning, still selectable
```

A picker shows a small tick when the value matched the register and "typed, not in register" when it did not, so free text is visible and never silent.

### 6.11 Data states in every module

Loading shows a skeleton; a slow or waking service keeps loading and retries (existing `transientRetry`); a real failure shows a plain message with **Try again** and keeps any rows already shown; empty is shown only after a successful empty answer, with the one action that fills it. Same as v1 W.10.

## 7. Delivery plan v2 (replaces v1 D.1; same rules: one backend PR and one frontend PR per slice, backend first, owner applies migrations)

| # | Slice | What the owner sees | Migration |
|---|---|---|---|
| 1 | Audit, row version, comments | History and Comments tabs; edit-conflict notice. **Built; waiting for the owner to apply its migration.** | `maintenance_audit` (written) |
| 2 | **Maintenance category and module routes** | New sidebar group with Overview (a placeholder list of links), Work orders, Requests, Schedules, Planner showing only what exists; the current page moved to `/maintenance/work-orders` with `/maintenance` pointing to it until the Overview exists; Breakdowns, Condition Monitoring, Reliability move group; clean page frame (6.3) | none |
| 3 | **Registers: pickers, leave, tools** | `RegisterField` on the work order form; people on leave greyed and refused; tools picked from the Tools register with warnings; the tools bridge endpoint | `maintenance_registers` (leave index, `work_order_tools`) |
| 4 | Lifecycle, sign-off, permits | next-step button, signatures, permit gate, "Awaiting sign-off" | `maintenance_lifecycle` |
| 5 | On-the-fly and breakdown work orders | 4-field quick raise, breakdown preset | none |
| 6 | **Work orders list and record page, clean** | the 6.5 and 6.6 screens, saved views, phone cards | none |
| 7 | Requests and approval | Requests module (6.7) | `maintenance_requests` |
| 8 | Assignments | several people per job, conflict notice when leave is approved later | `maintenance_assignments` |
| 9 | Schedules | Schedules module (6.8), projection preview | `maintenance_schedules_v2` |
| 10 | Planner | 6.9 | none |
| 11 | Parts on work orders | issue through the existing stock path, once per token | `maintenance_parts` |
| 12 | Overview | 6.4 | none |
| 13 | Task library (only if asked) | | its own |

Why slice 2 before the rest: it is a pure navigation and routing change with no data change, it makes the new structure visible immediately, and every later slice then lands in its final home instead of being moved afterwards.

**Release gate and rollout** are unchanged from v1 (T.4): migration, then backend, then frontend; tsc, eslint, vitest, docs check, route specs, a look at the rendered page; the agent never applies a migration or touches live data.

## 8. Verification plan for the new parts

- **Navigation (slice 2):** unit test on `modules.ts` (no duplicate hrefs; every module's role filter intact; Maintenance group present and ordered); route spec per module at 1440 and 390 px; the active-item logic must highlight exactly one entry (today `isActive` matches by prefix, so `/maintenance` would light up on every sub-route; the fix is an `exact` flag on the Overview entry, with a test).
- **Pickers (slice 3):** unit tests for Tab-fill, free text, matched/unmatched marker, greyed leave with dates, tool warnings; a server test that a person on leave is refused even when typed.
- **Tools bridge (slice 3):** backend test with the fake client: archived tools excluded, issued and overdue state derived as `tools_workspace` does, a failed read is a 5xx not an empty list, write methods do not exist on the route.
- **Clean rules (every UI slice):** a screenshot at 1440 and 390 px reviewed against 6.1 before the PR is raised; the review notes the rules the screen meets and any it relaxes, with why.

## 9. Decisions taken by the author [D], for the owner to confirm or change at wireframe review

1. `/maintenance` becomes the Overview; Work orders move to `/maintenance/work-orders`; the old address keeps working during the move.
2. Breakdowns, Condition Monitoring and Reliability move into the Maintenance category; Job Cards stays in Operations, frozen.
3. The Tools register is read through a new read-only bridge endpoint under the normal sign-in; maintenance never writes to it, and issuing and returning stay in `/tools`.
4. Tool availability and inspection status are warnings, not blocks.
5. Desktop list default is a table; phone default is cards; the record is a large pop-up from the list and a full page at its own address and on phones.
6. The Task library is reserved but not built or shown until the owner asks.
7. KPI targets show "not set" until the owner supplies them.
8. Statistic tiles leave the list pages; the Overview carries the figures as plain text and two short lists.

## 10. Open items that still need the owner (unchanged from before unless noted)

- Written approval of these wireframes (and any change to section 9).
- Apply the slice 1 migration (`supabase_migration_maintenance_audit.sql`), after the one read-only check at its top.
- Run the precondition queries at the top of the draft workflow migration and send the results (column types of `work_orders`, `equipment`, `employees`, `leaves`).
- KPI targets (v1 Q10).
- Confirm that the Tools register's own accounts are not needed for the read-only bridge (section 3); if the owner wants maintenance staff to need a Tools account, say so and the bridge changes.
