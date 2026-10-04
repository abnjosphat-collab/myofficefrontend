# MyOffice UI system (`@/components/ui-system`)

The one design system for MyOffice. It is derived from the real Tools & Equipment workspace (`/tools`) and is the
standard every route is migrated to. There is **one appearance**: no light/dark switch, no Classic/Dallaglio switch,
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
| `patterns/` | PageHeader, Toolbar, MetricTile/MetricGrid, RecordCard, DataTable, Pagination, ViewToggle, DataRegion/EmptyState/Notice, DestinationSearch, ChartPanel, FormDialog, plus pure logic (`dataStatus.ts`, `tableLogic.ts`) with tests |
| `shell/` | `Nav` (NavItem, NavGroup, NavHeading), `Frame` (AppFrame, TopBar, SidebarFrame) |
| `hooks/` | `usePersistentState`, `useMediaQuery` |

The application-specific shell (what is in the top bar, the module list, notifications, feedback, settings) is built
**from** this system in `components/app-shell/` and is not part of it; see [`docs/UI_ARCHITECTURE.md`](../../docs/UI_ARCHITECTURE.md).

## Foundations

**Colour.** Canvas `#f4f6f5`, surface `#fbfcfb`, ink `#1b2923`, action (charcoal green) `#233b31`, focus `#4f806a`. Status
colours (success, warning, danger, info, neutral) carry operational meaning only and are always paired with a label or an
icon. Contrast was computed from `tokens.css` (WCAG formula): every text, status and control pair passes (lowest text pair
4.73:1; control boundary 6.5:1; focus ring 4.4:1 against the 3:1 required). Chart series use a fixed eight-colour categorical
order (`--mo-chart-1..8`) validated against the surface; slots 3 to 5 are below 3:1, so a chart that uses them needs direct
labels or a table. Never reuse status colours as chart series. Pages never contain hex literals: use tokens or Tailwind roles
(`bg-surface`, `text-ink-muted`, `border-line`, `bg-action`).

**Type.** Inter for body, Plus Jakarta Sans for display (Manrope selectable). Pages use role utilities, not raw sizes:
`text-display`, `text-page`, `text-section`, `text-title`, `text-body`, `text-body-sm`, `text-label`, `text-caption`,
`text-metric`. Headings carry `font-display`. Every role is `calc(<rem> * var(--mo-text-scale))`.

**Text size (85 to 130 per cent in 5 per cent steps).** One preference, applied by setting `--mo-text-scale` on `<html>`, so
portals (dialogs, menus, tooltips) inherit it. CSS `zoom` is not used by the shell or by migrated pages. Non-migrated page
bodies receive the saved size through `zoom` on their own content only, until they migrate (`AppShell` prop `migrated`).

**Icons.** Pages name a *meaning* (`<Icon name="breakdown" />`), never a Phosphor component. `ICON_BY_MEANING` maps 147
meanings to glyphs; `Glyph` renders a glyph component supplied by data (module lists). Weight is a policy, not a choice per
call: control icons are light, navigation icons regular, emphasis (status, selected spotlight) fill. Phosphor may be
imported directly only inside `foundations/` (enforced by ESLint).

**Geometry and motion.** Radii: control 7 px, card 12 px, panel 16 px. Cards are stationary: no lift, tilt or glow.
Durations 120/180/260 ms with `--mo-ease-standard`; a global `prefers-reduced-motion: reduce` rule in `tokens.css` zeroes the duration tokens and stops spinners and skeleton pulses (implemented; **not yet exercised in a browser**). Layers:
sticky 20, header 30, sidebar 35, overlay 60, dialog 61, popover 70, toast 80, tooltip 90.

**Appearance record.** `localStorage["myoffice_appearance_v1"] = { version: 1, font, fontSize, guidance }`. Precedence when
reading: the shared record, then the Tools preferences, then the legacy `oz_*` keys, then defaults
(`migrateAppearance`, covered by `appearance.test.ts` in the legacy design-system folder). `APPEARANCE_BOOTSTRAP` is inlined
in `<head>` and sets `data-font`, `data-guidance` and `--mo-text-scale` before first paint, so there is no flash or layout jump.

## Contracts that callers rely on

**Data states: `deriveDataStatus` and `DataRegion`.** One pure function decides what a list, table or grid shows:
`loading`, `retrying`, `refreshing`, `stale-error`, `unauthorized`, `error`, `empty`, `ready`. Rules that must not be
broken: nothing is called empty before one successful response; a failed request is never rendered as an empty list; records
already loaded stay visible through a failed refresh (with a "may be out of date" banner); HTTP 401/403 is an access message.
Hooks should report `{ loading, loaded, error, errorStatus }`; `lib/useApiList.ts` does this and ignores superseded responses.

**Dialogs.** `Dialog` is Radix Dialog with focus return to a still-connected opener, a scrollable body between a fixed header
and footer, and `dismissible={false}` while saving. `FormDialog` is the one create/edit dialog: a real `<form>`, a submit
button wired to it, a pending state that blocks double submit and dismissal, validation by returning `false`, and a save
failure (thrown) shown inline **with the typed values kept**. Never close a form on failure. `useConfirm` is the one
confirmation (focus starts on Cancel so Enter cannot complete a destructive action).

**Records.** `RecordCard` makes the *title* a native button (or caller-supplied link) stretched over the card, so the card
is one correct control and nested actions are valid sibling controls (`relative z-10`). Do not put `role="button"` on a
wrapper that contains buttons.

**Tables.** `DataTable` is a semantic `<table>` in a keyboard-focusable scroll region: sticky header, right-aligned tabular
numbers, `aria-sort` on sortable headers, selection as a fill **and** a checked box. Sorting and selection logic lives in
`tableLogic.ts` (unit-tested).

**Charts.** Use `ChartPanel` with a `summary` (the text alternative is required) and `chartTheme`/`chartColor` for Recharts.
Heatmaps and charts are `aria-hidden`; the summary carries the information.

**Search.** `SearchField` filters a local list. `DestinationSearch` navigates: an ARIA combobox that keeps DOM focus in the
input (`aria-activedescendant`), idle recent results, portalled list with collision handling.

**Fields.** Wrap controls in `Field` (label, description, error, required/optional text). `useFieldProps()` lets a control
join its Field. Legacy typeaheads (`PredictiveInput`, `AutofillInput`) are hosted inside Fields through
`components/shared/SuggestField.tsx` until they are rebuilt here.

## Recipe: migrating a page

1. Read the page, its hook and its API calls. List the business rules (validation, permissions, exports, statuses).
2. Replace the data hook with `useApiList` (or keep the hook but expose `loaded/error/errorStatus`).
3. Build `PageHeader` > `MetricGrid` > `Toolbar` > `DataRegion` > `DataTable`/`RecordCard`; create/edit in `FormDialog`;
   destructive actions through `useConfirm`; export through `DownloadButton` (already on the shared `Menu`).
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
the signature pad, photo upload and typeahead are built from this system. What remains outside it is the Tools & Equipment
workspace's own component layer (`app/tools`: `ToolsUI`, `AnimatedSelect`, `ToolsDateInput`, `tools.module.css`); it shares
the tokens and glyphs and is the visual reference. Moving those components onto this system is an open decision (see
`docs/CURRENT_HANDOFF.md`).
