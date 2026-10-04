# Page and overlay patterns

**Audience:** developers and coding agents building or migrating a MyOffice page.
**Status:** adopted 3 Oct 2026 from a rendered inventory of every route. The per-route record is
[WIREFRAME_LEDGER.md](./WIREFRAME_LEDGER.md) (generated from [wireframe-ledger.json](./wireframe-ledger.json)).
Captures are in `docs/wireframes/before/` (`structure.json` and `sheet-*.png` contact sheets; regenerate with
`node scripts/wireframe-audit.mjs --label <name>` then `node scripts/contact-sheets.mjs --label <name>`).

The Tools top bar is the quality reference: a clear title, restrained controls, one family of stroke icons and fine
rules that give an area structure without weight. That standard applies to every page's finish. Layout follows the
work done on the page, so a small set of **patterns** is used rather than one template.

## What the inventory found

51 routes were rendered at 1440 and 390 px (820 px spot-checked) and their structure read from the DOM.

| Finding | Evidence | Decision |
|---|---|---|
| Migrated pages already share a skeleton (breadcrumb, title, description, actions, tiles, toolbar, content) but it was never written down, so tile counts (2 to 6), toolbar contents and content widths drift. | Contact sheets 1 to 7 | Define the patterns below and hold new pages to them. |
| On a phone each filter and each date input took its own full row. On `/pto`, `/vfl`, `/requisitions`, `/safety_complaints` the first screen was tiles and form controls and the first record was more than a screen away. | Phone sheets 2 to 4 | `Toolbar` now keeps the search visible and puts the other filters behind a Filters button with an "applied" marker. One shared change. |
| The page header had no structure line, unlike the Tools bar. | Header vs reference screenshot | `PageHeader` carries a hairline rule under the title block. |
| Unmigrated pages use a large, thin hero (icon, "MYOFFICE" eyebrow, 30 px light title) and flat inline stats. | Contact sheets, `/av`, `/breakdowns`, `/employees`, `/spares`, `/services`, `/shifts`, `/timesheets` | Replaced as each route migrates; their headings were raised from weight 350 to 500 meanwhile. |
| Duplicate and orphan routes: `/av` and `/availability` and `/availabilities` (equipment availability); `/leaves` and `/leave-management`; `/employees` and `/employees-preview`; `/availability` is not in the navigation. | Titles in `structure.json` | Decided 4 Oct 2026: `/av` and `/leave-management` redirect to `/availabilities` and `/leaves`; `/availability` is linked as Availability Overview; `/employees-preview` is retired once `/employees` is rebuilt. |
| `/tools` and the auth pages keep their own chrome by design. | Ledger | Documented exceptions. |

## Page patterns

Every pattern has the same top: **breadcrumb, one title, one sentence, actions at the right** (Refresh icon, Download,
then one primary action). A failed load shows its reason with Try again; it is never an empty list.

### R. Register (searchable list of records)

```
Breadcrumb
Title                                        [refresh][Download][+ Primary]
One-sentence description
------------------------------------------------------------------ rule
[tile][tile][tile][tile]      <= at most 5; tiles double as status filters
[Search........][filter][filter][filter][Clear]            [cards|table]
3 of 12 records
[ card ][ card ][ card ]   or   | Name | Status | ... | actions |
```

Phone: tiles in two columns; the toolbar shows the search and a Filters button; table columns that do not fit are
hidden (`hideBelow`) and reachable in the detail dialog. Open = the whole card or row; edit and delete are explicit
buttons; delete confirms. Create and edit use `FormDialog`; reading uses `Dialog` with Edit and Delete in the footer.
Routes: most operations and safety pages (see the ledger).

### D. Dashboard (read-mostly overview)

Header (optional range and refresh, "refreshed at" as metadata), then up to six tiles, then either tabs
(Overview, Trends, Modules) or stacked `Panel`/`ChartPanel` sections. Every chart carries a text alternative and its
numbers; no chart is the only carrier of a value. A section that fails shows its own error and the others still load.
Routes: `/sheq`, `/engineering-dashboard`, `/reliability`, `/usage-analyzer`, `/availability`, `/breakdowns/analytics`.

### Rp. Report (document-like, printable)

Header with the period selector and Print/Save as PDF as the primary action; sections as numbered `Panel`s in reading
order; tiles carry their target and basis. Route: `/engineering_report`.

### W. Workflow or entry (a form is the point)

The form comes first and is complete on its own; the history or register follows below or in a tab. Field groups use
`Field` with visible labels, errors in words next to the field, and a single primary action at the end.
Routes: `/issues`, `/leave-management`, `/quotations`, `/spares/import`, and the entry half of `/compressors`.

### G. Planning grid (people or days by periods)

Header, then period navigation and filters in one toolbar, then the grid with a sticky first column and totals; edits
happen in the cell or a `FormDialog`, never by leaving the grid. Routes: `/timesheets`, `/artisan-timesheets`,
`/shifts`, `/competency`.

### A. Administration

Header, role or scope tiles that filter, a table with row actions that open a manage dialog; destructive actions
confirm and say what will not be deleted. Routes: `/admin`, `/admin/lists`.

### H. Hub

A directory of destinations grouped by meaning: search, favourites, then groups. Routes: `/`, `/documents`.

### Exceptions (own chrome)

`/tools` (the reference workspace), `/login`, `/auth/*`. They are not restyled by these patterns.

## Overlay patterns

| Overlay | Pattern | Rules |
|---|---|---|
| Read a record | `Dialog` | Title is the record's name; facts as a definition list; long text wraps; footer: Delete (danger, left), Edit, then the primary action; Escape and the close button dismiss; the body scrolls, the footer does not. |
| Create or edit | `FormDialog` | A real form (Enter submits); required fields marked and explained in words; validation after the first submit; the server's reason is shown inside the dialog and typing is kept; cannot be dismissed while saving. |
| Confirm | `useConfirm` | States the consequence in one sentence; the destructive button is named for the action ("Delete", not "OK"); focus starts on Cancel. |
| Menu, popover, tooltip | `Menu`, `Popover`, `Tooltip` | Opens from a labelled control; Escape returns focus to it; never holds the only way to do something. |
| Notices | `ActiveNoticesPopup`, toasts | Feedback stays in the top bar region; a popup never covers page actions. |
| Navigation | Shell sidebar and phone strip | Owned by the shell; pages do not add their own navigation. |

## Responsive rules

- One column of content at phone width; two-column tiles; no horizontal page scroll at 320 px.
- The first record is visible without scrolling past the filters on a phone (the reason for the Filters button).
- Touch targets are 44 px (`pointer-coarse`); icon-only controls always have a text label for assistive technology.
- Text can be enlarged to 130% and spaced per WCAG 1.4.12 without clipping (`scripts/linen-audit.mjs` checks this).

## Typography review

Compared on the rendered patterns, with the measurements in `docs/linen/`:

- **Pairing: keep.** Manrope for body and labels, Plus Jakarta Sans for titles and metrics. On the registers the
  titles, tile figures and 13 px labels read cleanly and the tabular numerals align in tables and tiles. Inter remains
  only a user-selectable appearance. No typeface was added.
- **Roles:** page title 24/600, section 17/600, record name 15/600, body 14, label 13/500, table cell 13, caption 12,
  metric 28/600 tabular. Nothing important is smaller than 12 px and nothing is lighter than 400.
- **Changed:** balanced heading wraps, pretty paragraph wraps, tabular table figures, caption tracking, and the
  350-weight legacy headings raised to 500. A unit stays with its number (`3490.0 h` no longer breaks onto two lines).
- **Not changed on purpose:** sizes were not reduced to fit crowded layouts. The phone crowding was solved by layout
  (the collapsing toolbar), not by smaller text.

## Icons, borders and motion

One stroke family in four sizes (14, 16, 18, 20) with the weight policy control light, navigation regular, emphasis
fill; the audit found no icon more than 1.5 px off its label's centre. Hairlines use `--mo-line`; the page header and
the toolbar use the same line. Motion is limited to short state transitions (`--mo-duration-*`). See
`components/ui-system/README.md`.

## Rules for new and migrated pages

1. Pick the pattern first and say so in the ledger; a deliberate exception is written down with its reason.
2. Use the shared pieces (`PageHeader`, `MetricGrid`, `Toolbar`, `DataRegion`, `DataTable`, `RecordCard`, `FormDialog`,
   `Dialog`); a page-local layout is removed once its replacement is verified.
3. Verify at 1440, 820 and 390 px with real-length content, empty and error states, long labels, keyboard and touch use,
   and every overlay the route opens; then record it in the ledger.
