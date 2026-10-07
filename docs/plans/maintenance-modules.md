# Maintenance as its own category: modules, registers, clean UI (plan v2)

**Status:** requirements, plan, model and wireframes for owner review (look revised 8 Oct 2026: section 6 is now card-based). Nothing in this document is built. It revises [the v1 plan](./maintenance-workflow.md) after the owner's 7 Oct 2026 direction, and the v1 plan stays authoritative for everything this document does not change (rules R1 to R38, tables in M.2, state diagrams in M.4, the leave rule in M.5).
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
| R44 | **One primary action per screen**, one search per list, filters collapsed until needed, no statistic tile that is not also a filter. | Checked against the design language in section 6.1 in review of each screen. |
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

Frontend shared pieces (all in `app/maintenance/`, built on `components/ui-system`, no second design system): `RegisterField` (one picker for every register, built on `PredictiveInput`/`SuggestField`), `useRegisters` (employees, equipment, tools, spares, lists, one cached read each), `MaintenanceNav` (sub-navigation used on small screens, see 6.13), `InfoCard`, `StatCard`, `Avatar`, `StatusDot`, `Reveal` (6.5).

## 6. The look: calm, card-based, and exact about what it uses (revised 8 Oct 2026 after the owner called Requests, Planner and Overview "terrible")

The first wireframes (rows and tables of text) were too plain. This revision keeps the structure (one category, five modules, registers everywhere) and changes how information is presented: **each fact lives on a card that answers one question**, hierarchy comes from size, weight and space instead of borders, and motion explains what changed.

### 6.1 Design language

Drawn from Apple's Human Interface Guidelines (clarity, deference, depth, direct manipulation, feedback) and from ordinary software engineering practice (one responsibility per component, one source of truth, no duplicated styling, tested states). Each principle below says what it means on these screens and how a reviewer can check it.

| Principle | On these screens | Check |
|---|---|---|
| **Clarity** | One focal point per screen. A card carries one title, at most three facts and one action. Three type sizes per card, never more. | Squint test: the eye lands on the title or the primary action first. |
| **Deference** | The content is the interface. No borders where space or a soft shadow does the job; no icons that only decorate; no statistic that is not also a link or a decision. | Remove any element: if nothing is lost, it should not be there. |
| **Depth** | Three layers only: canvas, card (`--mo-shadow-card`), floating (popover, dialog). Hover deepens the shadow (`--mo-shadow-card-hover`); nothing lifts, tilts or glows (the system's rule: cards are stationary). | One shadow token per layer; no new shadows. |
| **Direct manipulation** | Act on the thing itself: approve on the request, drag a job onto a person and day, tap a card to open it. | Every common task is one gesture on the object, not a trip to a toolbar. |
| **Feedback and continuity** | Motion says what happened (an approved request leaves its list; a job lands in its cell; a refused drop shakes once and says why). Never decorative. | Each animation has a sentence explaining what it communicates. |
| **Consistency** | One card anatomy, one avatar, one status dot, one date format everywhere. | The same fact looks the same in every module. |
| **Accessibility first** | 4.5:1 text contrast (system pairs already pass), 44 px targets on touch, full keyboard path, text size 85 to 130 per cent survives, status always has a word, motion honours reduced-motion. | Route specs plus a keyboard-only pass per screen. |
| **Single responsibility (engineering)** | `InfoCard`, `StatCard`, `Avatar`, `StatusDot` and `Reveal` are small shared pieces; modules compose them. No module restyles a card. | One definition of each card; modules pass data, not classes. |
| **Honest states (engineering)** | Every card region has loading (skeleton), failure (message and Try again) and empty (the one action that fills it). No demo data outside the preview. | Same data-state rules as v1 W.10. |

### 6.2 Type: the pairing, and why it is not changed

The design system already pairs **Plus Jakarta Sans** (display: titles, record names, large numerals) with **Inter** (text: everything read in volume), both with tabular figures. That is the pairing this redesign uses, tuned rather than replaced: a geometric humanist display face gives cards a warm, confident title; a neutral screen-tuned text face keeps dense lines legible. A third family would break the owner's standing rule (one design system, no second typography set), so none is added. If the owner wants a different pairing, it changes in `tokens.css` for the whole product, not per module.

| Role on a card | Token | Face and weight | Why |
|---|---|---|---|
| Card title (machine and job) | `text-title` | Plus Jakarta Sans, medium | the "which job" answer, readable from arm's length |
| Large figure (a count, a date) | `text-metric` | Plus Jakarta Sans, medium, tabular | numerals of equal width; the only large type on a screen |
| Page title | `text-page` | Plus Jakarta Sans, medium, tight tracking | orientation |
| Body and facts | `text-body`, `text-body-sm` | Inter, regular | volume reading |
| Eyebrow (status word, id) | `text-caption` | Inter, medium, muted | quiet, scanned not read |
| Section heading | `text-label` | Inter, semibold | structure without competing with titles |

### 6.3 Colour, depth and shape (all existing tokens)

Canvas `--mo-canvas`; cards `--mo-surface` with `--mo-shadow-card` and `--mo-radius-card` (12 px); popovers and dialogs `--mo-shadow-popover` and `--mo-shadow-dialog`. Colour carries meaning only: the charcoal-green action colour for the one primary action and selection; status tones (warning, info, success, danger, neutral) for status, always beside a word; priority is a word and a thin 3 px accent on the card's leading edge, never colour alone. No gradients, no new hex values.

### 6.4 Motion (every item uses the existing duration and easing tokens, so `prefers-reduced-motion` turns all of it off)

| Motion | Duration | Says |
|---|---|---|
| Content rises 8 px and fades in on arrival; cards stagger 30 ms apart, at most eight | 260 ms, emphasized ease | "this is the new page", and the order to read in |
| Card shadow deepens on hover and focus-within | 180 ms | "this is interactive" |
| Progress and load bars fill to their value | 260 ms | "this is how far along" |
| A decided request collapses out of the waiting list and its neighbours slide up | 260 ms | "that one is done" |
| A dragged job dims; valid cells show a ring; a day on leave shows a hatched band and, on refusal, shakes once with the reason | 120 to 180 ms | "you can drop here" and "you cannot, and why" |
| Dialogs and menus | existing | unchanged |

No bounce, no parallax, no looping animation, no animated numbers (a figure that counts up is a figure that is briefly wrong).

### 6.5 The shared pieces

```
InfoCard                                   StatCard                         Avatar          StatusDot
┌────────────────────────────────┐         ┌──────────────────────┐         (AM)            ● In progress
│ ● In progress          WO-00231│ eyebrow │ 14                    │ metric  initials on     dot + word, tone from
│ Compressor 2                   │ title   │ Overdue               │ label   a quiet well    the status map
│ Drive end bearing              │ sub     │ Oldest is 9 days      │ context
│                                │         └──────────────────────┘
│ (AM) A. Moyo        Due 9 Oct  │ facts
│ ▓▓▓▓▓▓▓░░░░░░  60%             │ optional progress
└────────────────────────────────┘
 leading 3 px accent for High and Urgent only
```

Rules: a card is one control (the title is the button, as `RecordCard` already does), nested actions are siblings; secondary actions appear on hover or focus on desktop and are always visible on touch; the card never exceeds three facts.

### 6.6 Page frame shared by every module

```
 Maintenance  ›  Work orders
 Work orders                                                         ( + New work order )
```

`text-page` title, one muted breadcrumb, one primary button. The example-data notice in the preview is a single caption line under the title and does not exist in the product.

### 6.7 Overview (`/maintenance`): "what needs me today"

```
 Maintenance › Overview
 Overview                                                            ( + New work order )

 ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
 │ 14            │ │ 9             │ │ 7             │ │ 3             │
 │ Overdue       │ │ Awaiting      │ │ Requests      │ │ Unassigned    │   StatCards: each is a link
 │ Oldest 9 days │ │ sign-off      │ │ waiting       │ │ Oldest 4 days │   into the filtered list
 └───────────────┘ └───────────────┘ └───────────────┘ └───────────────┘

 Your day                                     See all     Waiting for you                  See all
 ┌────────────────────────────────────┐                   ┌────────────────────────────────────┐
 │ ● In progress             WO-00231 │                   │ High               REQ-00018       │
 │ Compressor 2                       │                   │ Pump A                             │
 │ Drive end bearing                  │                   │ Gland leaking                      │
 │ (AM) A. Moyo          Due today    │                   │ (TD) T. Dube · Today               │
 │ ▓▓▓▓▓▓▓░░░░░  60%                  │                   │ [ Approve ]  [ Reject ]            │
 └────────────────────────────────────┘                   └────────────────────────────────────┘
 ┌────────────────────────────────────┐                   ┌────────────────────────────────────┐
 │ ... up to three cards ...          │                   │ ... up to three cards ...          │

 Last 30 days
 ┌─────────────────────────┐ ┌─────────────────────────┐ ┌─────────────────────────┐
 │ Completed on time       │ │ Breakdowns              │ │ Mean time to repair     │
 │ 82%  ▓▓▓▓▓▓▓▓░░         │ │ 6   9 in the 30 before  │ │ 4.2 h   5.1 h before    │
 └─────────────────────────┘ └─────────────────────────┘ └─────────────────────────┘
```

Focal point: the four StatCards, left to right in order of urgency. Targets show "not set" until supplied. A requester sees "My requests" in place of "Waiting for you"; a viewer sees no action buttons.

### 6.8 Work orders (`/maintenance/work-orders`)

```
 Maintenance › Work orders
 Work orders                                                         ( + New work order )

 [ 🔍 Search machine, number or person ]   ( All | Mine | Overdue | Unassigned )     [ Cards | Table ]  ⋯

 Overdue  2
 ┌───────────────────────┐ ┌───────────────────────┐ ┌───────────────────────┐
 │ ● Pending      WO-229 │ │ ● Awaiting     WO-228 │ │ ...                   │
 │ Pump A                │ │   sign-off            │ │                       │
 │ Discharge valve       │ │ Crusher 1             │ │                       │
 │ Unassigned   4 Oct    │ │ Liner inspection      │ │                       │
 └───────────────────────┘ └───────────────────────┘ └───────────────────────┘

 This week  3
 ┌───────────────────────┐ ┌───────────────────────┐ ┌───────────────────────┐
 ...
 Later  1        Done  1  (collapsed; opens on click)
```

Groups by urgency, not by status, because "what is late" is the first question. Cards are the default; **Table** (the earlier columns view) stays one click away for scanning many rows and is the default above 200 rows **[D]**. Opening a card shows the record as a large pop-up, with the shareable page behind "Open as a page". Selecting several rows is a Table feature.

### 6.9 Work order record (pop-up, page and phone)

```
 ┌──────────────────────────────────────────────────────────────────────────┐
 │ Compressor 2                                                         ✕   │  display title
 │ Drive end bearing · WO-00231                                              │
 │                                                                           │
 │ ● In progress   High   Breakdown                  ( Complete )   ⋯        │  status, one primary action
 │                                                                           │
 │ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                       │
 │ │ Assigned │ │ Due      │ │ Section  │ │ Raised   │   four fact cards     │
 │ │ (AM) A.M │ │ 9 Oct    │ │ Plant 2  │ │ 6 Oct    │                       │
 │ └──────────┘ └──────────┘ └──────────┘ └──────────┘                       │
 │ From request REQ-00018                                                    │
 │                                                                           │
 │ Details   Assignments   Tools and parts   Comments   History              │
 │ ─────────                                                                 │
 │ Machine        Compressor 2                                               │
 │ Description    Bearing noise and heat ...                                 │
 └──────────────────────────────────────────────────────────────────────────┘
```

On a phone the same content is a page; the four fact cards become a 2 by 2 grid and the primary action sticks to the bottom.

### 6.10 Requests (`/maintenance/requests`): an inbox, as in Mail

```
 Maintenance › Requests
 Requests                                                            ( + New request )

 ( Waiting 2 | Decided | All )                 ┌─────────────────────────────────────────────┐
 ┌──────────────────────────────┐              │ High                                        │
 │ ▌High              REQ-00018 │ selected     │ Pump A                                      │ display
 │ Pump A                       │              │ Gland leaking                               │
 │ Gland leaking                │              │                                             │
 │ (TD) T. Dube · Today         │              │ Requested by   (TD) T. Dube, today 07:42    │
 ├──────────────────────────────┤              │ Machine        Pump A · EQ-021 · Plant 2    │
 │ Medium             REQ-00017 │              │ Details        Gland weeping since the      │
 │ Fan 2                        │              │                night shift ...              │
 │ Vibration on start-up        │              │                                             │
 │ (SN) S. Ncube · Yesterday    │              │ Progress                                    │
 └──────────────────────────────┘              │ ○ Requested   ○ Approved   ○ Work order     │
                                               │                                             │
                                               │ ( Approve )  ( Reject )                     │
                                               └─────────────────────────────────────────────┘
```

Master and detail: the list on the left is the queue, the panel on the right is the decision. Approve opens the small signature pop-up (assignee and due date from the registers). On approval the card leaves the Waiting list (it collapses out) and the panel shows the new work order as a link. On a phone the list is the page and a request opens as a sheet.

### 6.11 Schedules (`/maintenance/schedules`)

```
 Maintenance › Schedules
 Schedules                                                           ( + New schedule )

 ┌─────────────────────────────┐ ┌─────────────────────────────┐ ┌─────────────────────────────┐
 │ ● Active                    │ │ ● Active                    │ │ ○ Paused                    │
 │ Weekly pumps                │ │ Monthly crusher             │ │ Compressor service          │
 │ [Pump A]                    │ │ [Crusher 1]                 │ │ [Compressor 1][Compressor 2]│
 │ Every Monday                │ │ The 22nd of each month      │ │ Every 3 months              │
 │                             │ │                             │ │                             │
 │ Next                        │ │ Next                        │ │ Next                        │
 │ Mon 12 Oct   in 5 days      │ │ Thu 22 Oct   in 15 days     │ │ Mon 16 Nov   in 40 days     │ display date
 │ ●────●────●                 │ │ ●────────●────────●         │ │ ○ ─ ─ ○ ─ ─ ○               │ next three dates
 │ Raises 1 work order    ⋯    │ │ Raises 1 work order    ⋯    │ │ Raises 2 work orders   ⋯    │
 └─────────────────────────────┘ └─────────────────────────────┘ └─────────────────────────────┘
```

The date is the focal point (it is the answer to "when"), shown large in the display face with its relative form beside it. The three dots are the next three dates on a proportional line. The New schedule pop-up shows the same line and dates live before saving (v1 R22). Paused cards are quiet (muted), not hidden.

### 6.12 Planner (`/maintenance/planner`, `manager`)

```
 Maintenance › Planner
 Planner                                                  ‹  Week of 8 Oct  ›  ( Today )  ( Publish week )

 ┌───────────────┬───────────┬───────────┬───────────┬───────────┬───────────┬───────────┬───────────┐
 │               │ Wed       │ Thu       │ Fri       │ Sat       │ Sun       │ Mon       │ Tue       │
 │               │ (8)       │ 9         │ 10        │ 11        │ 12        │ 13        │ 14        │ today = filled date
 ├───────────────┼───────────┼───────────┼───────────┼───────────┼───────────┼───────────┼───────────┤
 │ (AM) A. Moyo  │           │ ▌Comp. 2  │           │           │           │           │           │ job chips: leading accent
 │ Fitter  ▓▓░   │           │           │           │           │           │           │           │ for High and Urgent;
 ├───────────────┼───────────┼───────────┼───────────┼───────────┼───────────┼───────────┼───────────┤ load bar under the name
 │ (TD) T. Dube  │           │ ╱╱╱╱╱╱╱╱╱ │ ╱╱ Leave ╱│ ╱╱╱╱╱╱╱╱╱ │ ╱╱╱╱╱╱╱╱╱ │           │           │ hatched band, word Leave,
 │ Electrician   │           │ Annual    │           │           │           │           │           │ reason on hover and in text
 └───────────────┴───────────┴───────────┴───────────┴───────────┴───────────┴───────────┴───────────┘

 ┌─ Unassigned  3 ────────────────────────────────────────────────────────────────────────────────┐
 │  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐        drag a card onto a person and day   │
 │  │ Pump A         │ │ Fan 2          │ │ ...            │                                           │
 │  │ Discharge valve│ │ Vibration check│ │                │                                           │
 │  └────────────────┘ └────────────────┘ └────────────────┘                                           │
 └─────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

The unassigned tray is docked at the bottom like a shelf; dragging a card highlights every valid cell and marks leave days as refused. Keyboard: pick a job, choose a person and a day from the same pickers as everywhere (so the planner is usable without dragging, and on a phone, where it becomes a day-by-day list with the same pickers). The load bar is jobs against a working day, a hint, not a rule.

### 6.13 Sidebar

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

### 6.14 The picker used everywhere (`RegisterField`)

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

### 6.15 Data states in every module

Loading shows a skeleton; a slow or waking service keeps loading and retries (existing `transientRetry`); a real failure shows a plain message with **Try again** and keeps any rows already shown; empty is shown only after a successful empty answer, with the one action that fills it. Same as v1 W.10.

## 7. Delivery plan v2 (replaces v1 D.1; same rules: one backend PR and one frontend PR per slice, backend first, owner applies migrations)

| # | Slice | What the owner sees | Migration |
|---|---|---|---|
| 1 | Audit, row version, comments | History and Comments tabs; edit-conflict notice. **Built; waiting for the owner to apply its migration.** | `maintenance_audit` (written) |
| 2 | **Maintenance category and module routes** | New sidebar group with Overview (a placeholder list of links), Work orders, Requests, Schedules, Planner showing only what exists; the current page moved to `/maintenance/work-orders` with `/maintenance` pointing to it until the Overview exists; Breakdowns, Condition Monitoring, Reliability move group; page frame (6.6) | none |
| 3 | **Registers: pickers, leave, tools** | `RegisterField` on the work order form; people on leave greyed and refused; tools picked from the Tools register with warnings; the tools bridge endpoint | `maintenance_registers` (leave index, `work_order_tools`) |
| 4 | Lifecycle, sign-off, permits | next-step button, signatures, permit gate, "Awaiting sign-off" | `maintenance_lifecycle` |
| 5 | On-the-fly and breakdown work orders | 4-field quick raise, breakdown preset | none |
| 6 | **Work orders list and record page, clean** | the 6.8 and 6.9 screens, saved views, phone cards | none |
| 7 | Requests and approval | Requests module (6.10) | `maintenance_requests` |
| 8 | Assignments | several people per job, conflict notice when leave is approved later | `maintenance_assignments` |
| 9 | Schedules | Schedules module (6.11), projection preview | `maintenance_schedules_v2` |
| 10 | Planner | 6.12 | none |
| 11 | Parts on work orders | issue through the existing stock path, once per token | `maintenance_parts` |
| 12 | Overview | 6.7 | none |
| 13 | Task library (only if asked) | | its own |

Why slice 2 before the rest: it is a pure navigation and routing change with no data change, it makes the new structure visible immediately, and every later slice then lands in its final home instead of being moved afterwards.

**Release gate and rollout** are unchanged from v1 (T.4): migration, then backend, then frontend; tsc, eslint, vitest, docs check, route specs, a look at the rendered page; the agent never applies a migration or touches live data.

## 8. Verification plan for the new parts

- **Navigation (slice 2):** unit test on `modules.ts` (no duplicate hrefs; every module's role filter intact; Maintenance group present and ordered); route spec per module at 1440 and 390 px; the active-item logic must highlight exactly one entry (today `isActive` matches by prefix, so `/maintenance` would light up on every sub-route; the fix is an `exact` flag on the Overview entry, with a test).
- **Pickers (slice 3):** unit tests for Tab-fill, free text, matched/unmatched marker, greyed leave with dates, tool warnings; a server test that a person on leave is refused even when typed.
- **Tools bridge (slice 3):** backend test with the fake client: archived tools excluded, issued and overdue state derived as `tools_workspace` does, a failed read is a 5xx not an empty list, write methods do not exist on the route.
- **Design language (every UI slice):** a screenshot at 1440 and 390 px reviewed against 6.1 to 6.4 before the PR is raised; the review notes the principles the screen meets and any it relaxes, with why. Reduced-motion is tested by emulating the preference and checking no animation runs.

## 9. Decisions taken by the author [D], for the owner to confirm or change at wireframe review

1. `/maintenance` becomes the Overview; Work orders move to `/maintenance/work-orders`; the old address keeps working during the move.
2. Breakdowns, Condition Monitoring and Reliability move into the Maintenance category; Job Cards stays in Operations, frozen.
3. The Tools register is read through a new read-only bridge endpoint under the normal sign-in; maintenance never writes to it, and issuing and returning stay in `/tools`.
4. Tool availability and inspection status are warnings, not blocks.
5. Desktop list default is a table; phone default is cards; the record is a large pop-up from the list and a full page at its own address and on phones.
6. The Task library is reserved but not built or shown until the owner asks.
7. KPI targets show "not set" until the owner supplies them.
8. Statistic tiles leave the list pages; the Overview carries the figures as four linked StatCards and a short last-30-days row.
9. **Look (8 Oct 2026 revision):** information is shown on cards (one anatomy, 6.5); Requests is an inbox with a detail panel; Schedules show the next date large with the next three dates on a line; the Planner has a docked unassigned tray, hatched leave bands and a load hint; Work orders group by urgency with Table one click away.
10. **Type is unchanged:** Plus Jakarta Sans for display and Inter for text, from the design system. No third family is added (the owner's one-design-system rule); a different pairing is a product-wide token change.
11. **Depth is shadow only** (existing tokens), and motion is limited to the six items in 6.4, all token-driven and off under reduced-motion. This relaxes nothing in the design system README except that cards deepen their shadow on hover, which the shadow token already exists for.

## 10. Open items that still need the owner (unchanged from before unless noted)

- Written approval of these wireframes (and any change to section 9).
- Apply the slice 1 migration (`supabase_migration_maintenance_audit.sql`), after the one read-only check at its top.
- Run the precondition queries at the top of the draft workflow migration and send the results (column types of `work_orders`, `equipment`, `employees`, `leaves`).
- KPI targets (v1 Q10).
- Confirm that the Tools register's own accounts are not needed for the read-only bridge (section 3); if the owner wants maintenance staff to need a Tools account, say so and the bridge changes.
