# Maintenance as its own category: modules, registers, clean UI (plan v2)

**Status:** requirements, plan, model and wireframes for owner review (look revised 9 Oct 2026: section 6 now uses the existing page patterns, nothing new). Nothing in this document is built. It revises [the v1 plan](./maintenance-workflow.md) after the owner's 7 Oct 2026 direction, and the v1 plan stays authoritative for everything this document does not change (rules R1 to R38, tables in M.2, state diagrams in M.4, the leave rule in M.5).
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
| R44 | **One primary action per screen**, one search per list, filters collapsed until needed, no statistic tile that is not also a filter. | Checked against the rule in section 6.1: only existing ui-system parts, composed as docs/PAGE_PATTERNS.md says. |
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

Frontend shared pieces (all in `app/maintenance/`, built on `components/ui-system`, no second design system): `RegisterField` (one picker for every register, built on `PredictiveInput`/`SuggestField`), `useRegisters` (employees, equipment, tools, spares, lists, one cached read each), `MaintenanceNav` (sub-navigation used on small screens, see 6.5).

## 6. The look: the owner's existing design system, used as it is (revised 9 Oct 2026)

**Correction.** The 8 Oct revision invented a new card layer (InfoCard, StatCard, Avatar, animations). The owner rejected it: *use the design system the whole of MyOffice already uses.* This section replaces it. **Nothing new is designed here.** Every module is built from the patterns in [`docs/PAGE_PATTERNS.md`](../PAGE_PATTERNS.md) and the components in [`components/ui-system`](../../components/ui-system/README.md), and looks like the pages the owner already approved (Requisitions, Breakdowns, SHEQ dashboard, Shifts). The preview at `/maintenance-preview` was rebuilt on exactly these parts.

### 6.1 What was checked, and the rule that follows

Read: `components/ui-system/README.md` (foundations, contracts), `docs/PAGE_PATTERNS.md` (patterns R, D, W, G, A, H, overlay patterns, responsive rules), `docs/TOOLS_DESIGN_STANDARD.md` is the Tools reference. Looked at the rendered Requisitions, Breakdowns, Availability, Shifts (cards and schedule grid), SHEQ dashboard and the current Maintenance page.

**Rule: a Maintenance screen may use only these parts, composed as the pattern says.** `PageHeader`, `MetricGrid`/`MetricTile` (tiles that double as filters), `Tabs` with icons, `Toolbar` with `SearchField`, `Select`, `ViewToggle` and the Filters popover, `RecordCard`, `DataTable`, `Panel`/`ChartPanel`/`Distribution`, `Notice`, `StatusBadge`, `Progress`, `Dialog` to read a record, `FormDialog` to create or edit, `useConfirm`, `EmptyState`, `DataRegion`. No custom card, no avatar, no new colour, size, shadow or animation. Type is the system's (Inter for text, Plus Jakarta Sans for titles and figures, tabular numerals); motion is the system's own (dialogs, menus, focus), which already honours reduced-motion.

### 6.2 Module to pattern to parts

| Module | Pattern | Skeleton (top to bottom) | Notes |
|---|---|---|---|
| Overview | **D** dashboard | breadcrumb, title, sentence, primary action; four icon `MetricTile`s that link; `Tabs` (Today, Last 30 days); tinted `Notice`s for what needs action; two `Panel`s of `RecordCard`s (your day, waiting for approval); a `ChartPanel` with `Distribution` | like the SHEQ dashboard |
| Work orders | **R** register | header; five compact filter tiles; `Toolbar` (search, sort, cards or table); count line; `RecordCard`s or `DataTable`; record opens in a `Dialog` | the page the owner already uses, with the new tiles |
| Requests | **R** register | header; four compact filter tiles (Requests, Waiting, Approved, Rejected); `Toolbar` (search, priority, view); cards with Approve and Reject, or table with row actions; read in a `Dialog`; Approve opens the signature `FormDialog` | like Requisitions |
| Schedules | **R** register | header; tiles (Schedules, Active, Paused, Due in 7 days); `Toolbar`; cards (next date, the dates after it, how many work orders it raises) or table; New schedule `FormDialog` that prints the next dates before saving | |
| Planner | **G** planning grid | header; period navigation (chevrons, range, Today); a bordered grid with a sticky first column, today and weekends tinted, leave cells dashed and labelled; key to the grid; a `Panel` of unassigned `RecordCard`s | the Shifts four-week schedule |

### 6.3 Wireframes

Each is the pattern skeleton filled in; the rendered result is in `docs/plans/prototype-modules/`.

**Overview (D)**

```
 Maintenance › Overview
 Maintenance overview                                                ( + New work order )
 What needs attention across work orders, requests and schedules.
 ┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐
 │ ▣ Overdue          │ │ ▣ Awaiting sign-off│ │ ▣ Requests waiting │ │ ▣ Unassigned       │  MetricTile: icon well,
 │   2             >  │ │   1             >  │ │   2             >  │ │   2             >  │  label, value, detail, link
 │   Past due date    │ │   Ready for foreman│ │   For approval     │ │   Nobody on the job│
 └────────────────────┘ └────────────────────┘ └────────────────────┘ └────────────────────┘
 Today   Last 30 days
 ─────────────────────────────────────────────────────────────────────────────────────────
 ⚠ 2 work orders are overdue.                                                      [ Review ]   Notice danger
 ⚠ 2 requests are waiting for approval.                                            [ Review ]   Notice warning
 ┌ Your day ───────────────────────────────┐ ┌ Waiting for approval ────────────────────┐
 │ #WO-00231                  ( In progress)│ │ #REQ-00018                       ( High )│
 │ Compressor 2                             │ │ Pump A                                   │  RecordCards inside Panels
 │ Drive end bearing                        │ │ Gland leaking                            │
 │ Due   in 2 days   Priority ( High )      │ │ Requested by T. Dube     [ Approve ]     │
 └──────────────────────────────────────────┘ └──────────────────────────────────────────┘
```

**Work orders and Requests (R)**

```
 Maintenance › Work orders
 Work orders                                                         ( + New work order )
 Raise a job, assign it, follow it to sign-off.
 [Work orders 5][Pending 1][In progress 1][Awaiting sign-off 1][Overdue 2]   compact tiles = filters
 [🔍 Search machine, person or WO number        ]                  [Due soonest ▾] [▦ | ▤]
 5 work orders
 ┌───────────────────────────┐ ┌───────────────────────────┐ ┌───────────────────────────┐
 │ #WO-00229  (Pending)(Over…)│ │ #WO-00228 (Awaiting)(Over…)│ │ ...                       │
 │ Pump A                    │ │ Crusher 1                 │ │                           │
 │ Discharge valve           │ │ Liner inspection          │ │                           │
 │ Assigned   Unassigned     │ │ Assigned   S. Ncube, ...  │ │                           │
 │ Priority   ( Medium )     │ │ Priority   ( Medium )     │ │                           │
 │ Due        4 Oct          │ │ Due        6 Oct          │ │                           │
 │ ▓▓▓░░░░░░░░               │ │ ▓▓▓▓▓▓▓▓▓░░               │ │                           │
 └───────────────────────────┘ └───────────────────────────┘ └───────────────────────────┘
```

Requests is the same skeleton with tiles Requests, Waiting, Approved, Rejected, a Priority select, and Approve and Reject on the card (or as row actions in the table).

**Planner (G)**

```
 Maintenance › Planner
 Maintenance planner                                                  ( Publish plan )
 [<]   7 Oct to 20 Oct   [>]  (Today)
 ┌────────────┬────────┬────────┬────────┬────────┬────────┬────────┬────────┐
 │ Person     │ We  7  │ Th  8  │ Fr  9  │ Sa 10  │ Su 11  │ Mo 12  │ ...    │  today tinted green, weekend grey
 ├────────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┤
 │ A. Moyo    │        │        │[Comp 2]│        │        │        │        │  job cell: tone by priority,
 │ (Fitter)   │        │        │ High   │        │        │        │        │  the word High/Urgent in it
 │ 1 job      │        │        │        │        │        │        │        │
 ├────────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┤
 │ T. Dube    │        │ ┄AL┄   │ ┄AL┄   │ ┄AL┄   │ ┄AL┄   │        │        │  leave: dashed neutral cell,
 │ (Electr.)  │        │ Leave  │ Leave  │ Leave  │ Leave  │        │        │  never accepts a drop
 └────────────┴────────┴────────┴────────┴────────┴────────┴────────┴────────┘
 ▸ Key to the planner
 ┌ Unassigned jobs ───────────────────────────────────────────────────────────┐
 │ Drag a job onto a person and day, or press Assign.                          │
 │ [RecordCard + Assign] [RecordCard + Assign] ...                             │
 └─────────────────────────────────────────────────────────────────────────────┘
```

**Schedules (R)** is the Work orders skeleton with tiles Schedules, Active, Paused, Due in 7 days; each card shows Next (date and how far away), Then (the next two dates), Raises (how many work orders), and Pause or Resume.

**Work order record (Dialog, as in PAGE_PATTERNS "Read a record")**: title is the work order number; status, priority and type badges and the one next-step button on one line; four fact tiles (Assigned, Due, Section, Raised) as in the existing detail dialog; then `Tabs` (Details, Assignments, Tools and parts, Comments, History). On a phone the same content is a page.

### 6.4 Phone, data states, accessibility

All three come from the patterns and need nothing new: tiles in two columns, the toolbar keeps search visible and puts the rest behind Filters, tables hide columns with `hideBelow`, the shell supplies navigation (a page adds none), 44 px touch targets, text scaling to 130 per cent, and `DataRegion` for loading, retry, failure and empty. A failed read is never an empty list.

### 6.5 Sidebar

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

### 6.6 The picker used everywhere (`RegisterField`)

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

### 6.7 Data states in every module

Loading shows a skeleton; a slow or waking service keeps loading and retries (existing `transientRetry`); a real failure shows a plain message with **Try again** and keeps any rows already shown; empty is shown only after a successful empty answer, with the one action that fills it. Same as v1 W.10.

## 7. Delivery plan v2 (replaces v1 D.1; same rules: one backend PR and one frontend PR per slice, backend first, owner applies migrations)

| # | Slice | What the owner sees | Migration |
|---|---|---|---|
| 1 | Audit, row version, comments | History and Comments tabs; edit-conflict notice. **Built; waiting for the owner to apply its migration.** | `maintenance_audit` (written) |
| 2 | **Maintenance category and module routes** | New sidebar group with Overview (a placeholder list of links), Work orders, Requests, Schedules, Planner showing only what exists; the current page moved to `/maintenance/work-orders` with `/maintenance` pointing to it until the Overview exists; Breakdowns, Condition Monitoring, Reliability move group; existing page header (6.2) | none |
| 3 | **Registers: pickers, leave, tools** | `RegisterField` on the work order form; people on leave greyed and refused; tools picked from the Tools register with warnings; the tools bridge endpoint | `maintenance_registers` (leave index, `work_order_tools`) |
| 4 | Lifecycle, sign-off, permits | next-step button, signatures, permit gate, "Awaiting sign-off" | `maintenance_lifecycle` |
| 5 | On-the-fly and breakdown work orders | 4-field quick raise, breakdown preset | none |
| 6 | **Work orders list and record page, clean** | the Work orders (R) and record screens in 6.3, saved views, phone cards | none |
| 7 | Requests and approval | Requests module (pattern R, 6.2) | `maintenance_requests` |
| 8 | Assignments | several people per job, conflict notice when leave is approved later | `maintenance_assignments` |
| 9 | Schedules | Schedules module (pattern R, 6.2), projection preview | `maintenance_schedules_v2` |
| 10 | Planner | pattern G, 6.2 | none |
| 11 | Parts on work orders | issue through the existing stock path, once per token | `maintenance_parts` |
| 12 | Overview | pattern D, 6.2 | none |
| 13 | Task library (only if asked) | | its own |

Why slice 2 before the rest: it is a pure navigation and routing change with no data change, it makes the new structure visible immediately, and every later slice then lands in its final home instead of being moved afterwards.

**Release gate and rollout** are unchanged from v1 (T.4): migration, then backend, then frontend; tsc, eslint, vitest, docs check, route specs, a look at the rendered page; the agent never applies a migration or touches live data.

## 8. Verification plan for the new parts

- **Navigation (slice 2):** unit test on `modules.ts` (no duplicate hrefs; every module's role filter intact; Maintenance group present and ordered); route spec per module at 1440 and 390 px; the active-item logic must highlight exactly one entry (today `isActive` matches by prefix, so `/maintenance` would light up on every sub-route; the fix is an `exact` flag on the Overview entry, with a test).
- **Pickers (slice 3):** unit tests for Tab-fill, free text, matched/unmatched marker, greyed leave with dates, tool warnings; a server test that a person on leave is refused even when typed.
- **Tools bridge (slice 3):** backend test with the fake client: archived tools excluded, issued and overdue state derived as `tools_workspace` does, a failed read is a 5xx not an empty list, write methods do not exist on the route.
- **Design language (every UI slice):** a screenshot at 1440 and 390 px compared with the existing page it follows (Requisitions, Shifts, SHEQ) before the PR is raised; the review lists any part used that is not in the system, which should be none.

## 9. Decisions taken by the author [D], for the owner to confirm or change at wireframe review

1. `/maintenance` becomes the Overview; Work orders move to `/maintenance/work-orders`; the old address keeps working during the move.
2. Breakdowns, Condition Monitoring and Reliability move into the Maintenance category; Job Cards stays in Operations, frozen.
3. The Tools register is read through a new read-only bridge endpoint under the normal sign-in; maintenance never writes to it, and issuing and returning stay in `/tools`.
4. Tool availability and inspection status are warnings, not blocks.
5. Desktop list default is a table; phone default is cards; the record is a large pop-up from the list and a full page at its own address and on phones.
6. The Task library is reserved but not built or shown until the owner asks.
7. KPI targets show "not set" until the owner supplies them.
8. Tiles stay, as in every register: they are filters (pattern R). The Overview is pattern D with four linking tiles.
9. **Look (9 Oct 2026):** no new design. Every module follows an existing pattern (Overview D, Work orders, Requests and Schedules R, Planner G) built from ui-system parts only. The earlier custom card, avatar and animation layer is withdrawn.
10. **Type and motion are the system's own.** No third typeface, no new animation; reduced-motion is already honoured by the system.

## 10. Open items that still need the owner (unchanged from before unless noted)

- Written approval of these wireframes (and any change to section 9).
- Apply the slice 1 migration (`supabase_migration_maintenance_audit.sql`), after the one read-only check at its top.
- Run the precondition queries at the top of the draft workflow migration and send the results (column types of `work_orders`, `equipment`, `employees`, `leaves`).
- KPI targets (v1 Q10).
- Confirm that the Tools register's own accounts are not needed for the read-only bridge (section 3); if the owner wants maintenance staff to need a Tools account, say so and the bridge changes.
