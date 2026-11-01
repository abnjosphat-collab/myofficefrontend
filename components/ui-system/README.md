# MyOffice UI system (`@/components/ui-system`)

The one design system for MyOffice. It is derived from the real Tools & Equipment workspace (`/tools`) and is the
standard every route is migrated to. The default appearance is Sage light; Mono dark is a flag-gated trial for
feature-enabled accounts (see `appearance/appearance.ts`), not a user switch. There is no Classic/Dallaglio switch and
no icon-style switch. Status of the migration is in [`docs/CURRENT_HANDOFF.md`](../../docs/CURRENT_HANDOFF.md) and
[`docs/MIGRATION_LEDGER.md`](../../docs/MIGRATION_LEDGER.md). This file describes the system itself.

> **Import rule.** Client code imports everything from `@/components/ui-system`. Do not deep-import internals.
> **Server components (for example `app/layout.tsx`) must not import the barrel**: it pulls in the Phosphor icon layer,
> which calls `createContext`, and the page returns HTTP 500. Server code imports a pure module by path, such as
> `@/components/ui-system/appearance/appearance` for `APPEARANCE_BOOTSTRAP`. This crash was found by rendering, not by
> type-checking.

## Layout of the folder

| Folder | Contents |
|---|---|
| `foundations/` | `tokens.css` (semantic `--mo-*` variables), `theme.css` (Tailwind 4 `@theme inline` bridge: colours, radii, shadows, type roles), `base.css` (element defaults), `cn.ts` (class merge), `typography.ts`, the icon layers (`glyphs.ts`, `icon-meanings.ts`, `Icon.tsx`), `chartTheme.ts` |
| `appearance/` | The shared preference record and its provider, store and pre-paint bootstrap |
| `primitives/` | Button, IconButton, badges, Field, Input/Textarea/NativeSelect, Checkbox, SearchField, Tabs, Card, Skeleton, Segmented, Rating, Progress |
| `overlays/` | Dialog, Drawer, Confirm, Popover, Tooltip, Select, Combobox, Menu; `surfaces.ts` holds the shared floating-surface classes |
| `patterns/` | PageHeader, Toolbar, MetricTile/MetricGrid, RecordCard, DataTable, Pagination, ViewToggle, DataRegion/EmptyState/Notice, DestinationSearch, Chart/ChartPanel, FormDialog, plus pure logic (`dataStatus.ts`, `tableLogic.ts`) with tests |
| `shell/` | `Nav` (NavItem, NavGroup, NavHeading), `Frame` (AppFrame, TopBar, SidebarFrame) |
| `hooks/` | `usePersistentState`, `useMediaQuery` |

The application-specific shell (what is in the top bar, the module list, notifications, feedback, settings) is built
**from** this system in `components/app-shell/` and is not part of it; see [`docs/UI_ARCHITECTURE.md`](../../docs/UI_ARCHITECTURE.md).

## Foundations

**Colour layers.** `foundations/tokens.css` supplies base roles (canvas `#f4f6f5`, surface `#fbfcfb`, ink `#1b2923`, action
`#233b31`, focus `#4f806a`). `components/shared/floor/floor-themes.css`, mounted by `FloorProvider`, overrides Sage canvas
to `#dbe7df`, surface to `#f6faf7`, and related grounds/lines. `foundations/themes.css` has the more specific
`html[data-theme='mono'][data-darkness='dark']` overrides. Inspect the composed values, not base tokens alone. Status
colours (success, warning, danger, info, neutral) carry operational meaning only and are always paired with a label or an
icon. Base-token contrast regressions in `foundations/tokens.test.ts` use the WCAG formula: the tested text pairs
pass (lowest 4.60:1, muted ink on the darkest interactive fill); the control boundary holds 3:1 on canvas, surface, raised
and muted (worst 3.26:1 on muted); the focus ring is 4.4:1 against the 3:1 required. Chart series use a fixed eight-colour
categorical order (`--mo-chart-1..8`): every series holds 3:1 on surface, raised and subtle grounds, every pair is dE > 30
apart (minimum 33.9, orange vs red), and every pair stays distinct under deuteranopia simulation. Never reuse status colours
as chart series. Separate composed Sage/Mono checks cover text, action and status pairs after the floor overrides;
rendered checks also inspect the effective backdrop and confirmation text. Pages never contain hex literals: use tokens or Tailwind roles
(`bg-surface`, `text-ink-muted`, `border-line`, `bg-action`).

**Type.** Inter is the default body face; Manrope and Plus Jakarta Sans are body preferences. The mounted floor sets
Space Grotesk for display, falling back to Plus Jakarta Sans, then the system sans stack. Floor meters use JetBrains Mono
with system monospace fallbacks. These floor fonts are loaded by `components/shared/floor/fonts.ts`; root body fonts are
loaded by `app/layout.tsx`. Pages use role utilities, not raw sizes:
`text-display`, `text-page`, `text-section`, `text-title`, `text-body`, `text-body-sm`, `text-label`, `text-caption`,
`text-metric`. Headings carry `font-display`. Every role is `calc(<rem> * var(--mo-text-scale))`.

**Text size (85 to 130 per cent in 5 per cent steps).** One preference, applied by setting `--mo-text-scale` on `<html>`, so
portals (dialogs, menus, tooltips) inherit it. CSS `zoom` is not used by the shell or by migrated pages. Non-migrated page
bodies receive the saved size through `zoom` on their own content only, until they migrate (`AppShell` prop `migrated`).

**Icons.** Pages name a *meaning* (`<Icon name="breakdown" />`), never a Phosphor component. `ICON_BY_MEANING` maps 147
meanings to glyphs; `Glyph` renders a glyph component supplied by data (module lists). Weight is a policy, not a choice per
call: control icons are light, navigation icons regular, emphasis (status, selected spotlight) fill. Phosphor may be
imported directly only inside `foundations/` (enforced by ESLint).

**Geometry and motion.** Radii: control 7 px, card 12 px, panel 16 px. Data grids use their own sharper pair: cells 2 px (`--mo-radius-cell`), containers 4 px (`--mo-radius-grid`). Cards are stationary: no lift, tilt or glow.
Durations 120/180/260 ms with `--mo-ease-standard`; a global `prefers-reduced-motion: reduce` rule in `tokens.css` zeroes the duration tokens and stops spinners and skeleton pulses. Selected normal/reduced-motion routes and dialogs are exercised by `e2e/ui-consistency.spec.ts`; this is not a complete motion audit. Layers:
sticky 20, header 30, sidebar 35, overlay 60, dialog 61, popover 70, toast 80, tooltip 90.

**Appearance record.** `localStorage["myoffice_appearance_v1"] = { version: 1, font, fontSize, guidance, theme, darkness }`. Precedence when
reading: the shared record, then the Tools preferences, then the legacy `oz_*` keys, then defaults
(`migrateAppearance`, covered by `appearance/appearance.test.ts`). `APPEARANCE_BOOTSTRAP` is inlined
in `<head>` and sets `data-font`, `data-guidance`, `data-theme`, `data-darkness` and `--mo-text-scale` before first paint.
`AppearanceProvider` enforces eligibility: Mono dark requires the `appearance_themes` feature; Tools always uses Sage light.
Native date/time pickers inherit the effective CSS colour scheme; print-first light surfaces deliberately override it.

## Contracts that callers rely on

**Data states: `deriveDataStatus` and `DataRegion`.** One pure function decides what a list, table or grid shows:
`loading`, `retrying`, `refreshing`, `stale-error`, `unauthorized`, `error`, `empty`, `ready`. Rules that must not be
broken: nothing is called empty before one successful response; a failed request is never rendered as an empty list; records
already loaded stay visible through a failed refresh (with a "may be out of date" banner); HTTP 401/403 is an access message.
Hooks should report `{ loading, loaded, error, errorStatus }`; `lib/useApiList.ts` does this and ignores superseded responses.

**Dialogs.** `Dialog` is Radix Dialog with focus return to a still-connected opener, a scrollable body between a fixed header
and footer, and `dismissible={false}` while saving. Focus opens on the first field when the body has one, else the title (`focusTitle` pins either). `FormDialog` is the one create/edit dialog: a real `<form>`, a submit
button wired to it, a pending state that blocks double submit and dismissal, validation by returning `false`, and a save
failure (thrown) shown inline **with the typed values kept**. Never close a form on failure. `useConfirm` is the one
confirmation (focus starts on Cancel so Enter cannot complete a destructive action).

**Records.** `RecordCard` makes the *title* a native button (or caller-supplied link) stretched over the card, so the card
is one correct control and nested actions are valid sibling controls (`relative z-10`). Do not put `role="button"` on a
wrapper that contains buttons.

**Tables.** `DataTable` is a semantic `<table>` in a keyboard-focusable scroll region: sticky header, right-aligned tabular
numbers, `aria-sort` on sortable headers, selection as a fill **and** a checked box. Sorting and selection logic lives in
`tableLogic.ts` (unit-tested).

**Metric strips.** `MetricGrid` keeps phone scroll snapping. Only actual horizontal overflow creates a focusable region
with `tabIndex=0` and the optional `label` (default "Summary metrics"). Native arrow-key scrolling applies. Resize observers
track the strip and tiles, including font/content resizing; no extra tab stop or region is added when everything fits.

**Notices.** `Notice` accepts flow content (paragraphs, lists or simple text) without a paragraph wrapper. At phone widths
the icon and text keep their width and actions sit beneath the text; actions wrap as needed. Tone and role still communicate
operational meaning. Important notices are not automatically dismissed.

**Checkboxes.** `Checkbox` forwards the native input ref and preserves controlled/uncontrolled, disabled and indeterminate
behaviour. The native input itself occupies at least 44×44 px on coarse pointers; the visible mark stays 18 px and carries
the focus ring. No wrapper click handler or wrapping label is added. Consumers may supply an external label when `label`
is omitted. Browser geometry and edge-tap checks, not wrapper classes, establish target size.

**Bulk selection.** `RecordCard` takes an optional shared selection checkbox (`selectable`, `selected`,
`onSelectedChange`): a 44 px target at the top-left that never opens the card. One `BulkBar` per register
carries the count ("3 selected (1 hidden by filters)"), "Select all shown (n)" and "Clear" plus the
caller's actions; it floats at the bottom of the viewport on phones and sits inline above the list on
desktop. Selection is shared across views and survives filtering; bulk actions act on the whole set.

**Charts.** Use `ChartPanel` with a `summary` (the text alternative is required), the `Chart` frame around the Recharts chart (responsive box, hidden from assistive technology, first-draw-only animation — still under prefers-reduced-motion and after any refresh or filter change), and `chartTheme`/`chartColor` for styling.
Heatmaps and charts are `aria-hidden`; the summary carries the information.

**Search.** `SearchField` filters a local list. `DestinationSearch` navigates: an ARIA combobox that keeps DOM focus in the
input (`aria-activedescendant`), idle recent results, portalled list with collision handling.

**Choices and multi-filters.** `ChoiceCards` is a labelled radio group of explained cards for pick-one-of-a-few-modes
(a `Segmented` label is screen-reader-only, so anything needing a visible explanation is cards). `MultiSelectFilter` is the
one include/exclude tick-list-in-a-popover with counts, chips and Reset; its list core `OptionChecklist` is shared with
`PeopleChecklist`, so search, select-all-filtered and chip behaviour never drift between people and value pickers.

**Fields.** Wrap controls in `Field` (label, description, error, required/optional text). `useFieldProps()` lets a control
join its Field. Legacy typeaheads (`PredictiveInput`, `AutofillInput`) are hosted inside Fields through
`components/shared/SuggestField.tsx` until they are rebuilt here. `FieldGroup` labels a group of controls — a `Segmented` choice, a checkbox row, read-only values — with the same label, hint and error rhythm.

**Bell badges.** Both bells (MyOffice shell, Tools) render `BellBadge`: dark green normally, red only when something is overdue or critical. Each bell decides its own `urgent` from its own data; the rule "urgent means red" lives in `BellBadge` alone. Never tone a bell badge directly with `CountBadge`.

**Collapsed rail.** The desktop sidebar collapses to a 68 px icon rail (`--mo-sidebar-collapsed`); the rail keeps the outer divider and restrained separators, never the inner bordered panel. Every rail row is a 40 px target (44 px on coarse pointers) with a 4 px gap between ordinary items; the hidden label leaves layout entirely (`hidden`, never a zero-width flex item), so rows stay uniformly 40 px and the 18 px navigation icon centres within 1 px. The label survives as the control's accessible name and a right-side tooltip. Brand, search, expand and destination icons sit in 40 px boxes on one centred axis. Focus rings fit inside the rail's side padding and are never clipped. The drawer below 821 px is never collapsed. `/documents` pins the rail temporarily without persisting it; the user's expand choice always wins.

**Tabs and Segmented.** Tabs switch views (panels of different content); Segmented picks a value (a filter, a form choice, a scope). Never nest one tab strip inside another — a filter inside a tab panel stays a Segmented. TabsList draws a sliding indicator under the active tab (instant under reduced motion) and can show a first-visit guide line (`guideId` + `guideText`) that retires after the first tab change and is remembered per strip.

**Exports.** Every page-level export is one labelled `ExportButton` in the Toolbar's trailing slot, before the view toggle: "Export" with a caret and an "Excel (.xlsx)" / "PDF" menu, or "Export Excel" / "Export PDF" with no menu for a single format. `DownloadButton` renders through it. `iconOnly` is for dense table row actions only (a docs check fails it elsewhere). Nothing export-related sits in More. At 390 px and below a single-format label shortens to "Export", never to a bare icon.

**Refresh.** A page never needs a refresh button: lists and dashboards re-read themselves on a silent background tick (60 s while visible, visible-again after 30 s away, back-online; the bell every 15 s). A background refresh never shows a "refreshing" state, never moves scroll or focus, and only surfaces the "may be out of date" line after two failures in a row. `icon="refresh"` outside error-state "Try again"/"Retry" and the named do-more controls fails `docs:check`.

## Motion

**Inline content.** `Presence` defaults to a block wrapper. Pass `as="span"` inside phrasing content (for example
`StatusBadge` inside a paragraph), so enabling animation preserves valid HTML. Reduced motion retains the same content.

**Modal pointer locks.** `PointerEventsGuard` recognizes mounted Radix content by `role` plus `data-state`, including
closing content until unmount. Radix portals have no wrapper marker. A plain inline listbox does not own a body lock;
the guard repairs orphaned locks on mount and after DOM/style changes.

**Report printing.** A report can opt into `.mo-print-report.mo-print-light`: normal document pagination, no shell
navigation/top bar/actions, a white ground, and legible light-palette text/charts even when the screen is Mono dark.
The report must include a visible period and make its metric rows wrap (`.mo-report-metrics`). Other pages keep their
existing print behaviour; the standalone job card shares the light-palette fallback.
`.mo-print-light` also switches the browser's printed page box to a light colour scheme and hides the decorative
floor backdrop, so dark-mode margins stay white. Keep short report cards together with `print:break-inside-avoid`.

One motion layer in `motion/`, one feel: **calm and precise** — smooth springs,
no visible bounce, under 0.5 s, motion only where it explains something. All
framer-motion use goes through `motion/` (enforced by
`local/no-framer-outside-motion` and `scripts/motion-consistency.mjs`); every
duration and bounce lives in `motion/presets.ts`, and the CSS `linear()`
springs in `foundations/tokens.css` are generated from those presets by
`scripts/gen-spring-css.mjs` (re-run it after changing a preset).

Rules (from the WWDC sessions behind PLAN 5.1):

- Motion has to mean something: where it came from, what changed, did the
  action work, is something still happening, what next. Otherwise it doesn't move.
- Springs, not timing curves. Smooth (bounce 0) almost everywhere, at most 0.1
  for press feedback, hard cap 0.15. Linear only for a repeating spinner.
- Never wait for a spring to "settle": no logic on animation-complete callbacks,
  no `isAnimating` flags; a transition can start or reverse at any time.
- Continuity: the thing tapped becomes the thing seen (card zoom, button-grown
  dialog, sliding tab indicator).
- Reduced motion is respected, not just switched off: movement becomes a short
  crossfade, numbers change in place, indefinite effects stop, feedback stays.
- Scope every animation to the thing it belongs to (`layout` only on the moving
  element, never on a generic wrapper) and animate only transform and opacity
  (plus the list height collapse, on lists of ~100 items or fewer).
- Restraint: no animation on page navigation, sorting, filtering, typing, hover
  of ordinary rows, or charts redrawing after a refresh. At most one moving
  thing per user action.

Effect–meaning matrix (one meaning per effect, applied everywhere):

| Effect | Means | Used for |
|---|---|---|
| bounce (once) | it happened / it arrived | bell on new notices; check after save, close, approve; export finished |
| wiggle (once) | a next step you might overlook | first error's icon on invalid submit; sign-off action; post-import Review |
| pulse (while true) | ongoing activity | uploads, background sync, running-job dot |
| rotate (while true) | a task in progress | spinners only (the only linear motion) |
| connecting (while true) | trying to reach the server | the "still trying" line while the service wakes |
| scale (while selected) | this is the selected one | selected MetricTile filter / ViewToggle icon (1.0 → 1.08) |
| replace | the state of this control flipped | star/pin, mute, show/hide, copy → copied, download → done (down-up; up-up for progress; slash draw for slash pairs) |
| appear/disappear | it came or went | badges, bulk bar, chips, thumbnails, toasts, saved-signature options |
| number roll | the value changed | metric tiles, counts, badges, percentages (filter and checklist counts too) |
| zoom | this became that | card → detail; row thumbnail → detail; "New …" button → its form |
| tick draw (once) | this choice is picked | checkbox tick and radio-circle check, checklist selection (CheckMark; indeterminate dash scales from the centre) |
| fill sweep | how far along the work is | progress bars, upload progress, service-life rings (ProgressFill: bars scaleX, rings sweep offset, never overshoot) |
| disclose | folded detail opened / closed | "show more" sections, service runway, drawer extras (Disclosure: chevron 90° + Presence fade/height, reversible) |

Not used, by decision: breathe (pulse already says "ongoing"); bouncy springs,
parallax, page-to-page transitions, scroll-linked transforms, confetti and
celebratory flips. One small scroll behaviour: horizontal strips snap with CSS
`scroll-snap`, no transforms. The Personell study page keeps its 3D tilt.

The gallery at `/dev/motion` (signed-in admin only, not in the nav) shows every
piece and every matrix row with a simulated reduce-motion switch, including
Selection, Progress fill, Disclosures, Toasts and Sidebar collapse sections.

Toast and sidebar notes: the toast stack is sonner configured through its own
options (`patterns/ToastSetup`, no fork): edge enter, re-flow, swipe keeps
release velocity, success appears once, error wiggles once. The sidebar rail
eases width on one CSS gentle spring while the labels leave layout at once
(no crossfade) and return when it expands; the main content never moves.

## Recipe: migrating a page

1. Read the page, its hook and its API calls. List the business rules (validation, permissions, exports, statuses).
2. Replace the data hook with `useApiList` (or keep the hook but expose `loaded/error/errorStatus`).
3. Build `PageHeader` > `MetricGrid` > `Toolbar` > `DataRegion` > `DataTable`/`RecordCard`; create/edit in `FormDialog`;
   destructive actions through `useConfirm`; export through `DownloadButton` or `ExportButton` in the Toolbar's trailing slot, before the view toggle.
4. Render `<AppShell migrated>`. Remove invented data, dead controls and swallowed errors; record each in the checkpoint.
5. Add `scripts/route-specs/<name>.mjs` (see [`docs/TESTING.md`](../../docs/TESTING.md)), run it, look at the screenshots.
6. Record what was rendered in `docs/migration-verification.json`, run `npm run docs:ledger`, update the handoff.

## Finish ("fine linen") decisions

Measured with `scripts/linen-audit.mjs` (captures in `docs/linen/before` and `docs/linen/after`, nine reference pages at 1440, 820 and 390 px; fixture data only).

- **Type:** the migrated pages already use 12 to 13 distinct size/weight pairs; none is below 12 px except tooltips (11 px, short, high contrast). Headings and `role="heading"` use `text-wrap: balance`; paragraphs, list items and definitions use `text-wrap: pretty`; table figures are tabular. Caption gets +0.005em tracking so 12 px text does not crowd. No font was added.
- **Legacy headings:** unmigrated pages had 350-weight headings (`dallaglio/palette.css`); raised to 500 with tracking -0.03em, so no important text is very thin. They disappear as routes migrate.
- **Icons:** the UI system uses four sizes (14, 16, 18, 20) in one family and weight policy (control light, navigation regular, emphasis fill); the audit found no icon more than 1.5 px off its label's centre on any page. The Tools workspace uses eight sizes (13 to 22); it is user-owned and was left alone.
- **Contrast:** no text on the nine pages falls below WCAG AA (4.5:1, or 3:1 for large text), measured against the effective background.
- **Text spacing (WCAG 1.4.12):** with the minimum overrides applied, no page scrolls horizontally. The only clipped text is the skip link (hidden until focused) and the home module descriptions, which are clamped to two lines by design and shown in full in the quick-view dialog.
- **Not verified:** a real installed PWA or touch device (Playwright emulates viewport and pointer type, not the installed window), the Tools workspace reference page (its own sign-in covers it in this harness), and user-set text sizes beyond the 85 to 130 % scale.

## What is not finished

There is one design system. The legacy one (`components/shared/design-system/`, the `${t.*}` token layer, `GlowCard`,
`CenterModal`, `PrimaryButton`, `PageHero`, the `.oz-*` classes, `components/ui/`) is deleted; sign-in, password, two-factor,
the signature pad, photo upload and typeahead are built from this system. The Tools & Equipment workspace (`app/tools`)
is built from it too (2026-10-10): its sidebar, top bar, dialogs, forms, tables, charts and settings are the shared
components, and its own stylesheet (`tools.module.css`), icon set and select/date/suggestion controls are gone. It keeps its
own sign-in; its sidebar uses the app-wide icon set through the shared `NavItem`/`NavSpotlight`. The compressors
and Tools screens share the floor look (3D backdrop, flat cards, animated text, sound) from `components/shared/floor`.
