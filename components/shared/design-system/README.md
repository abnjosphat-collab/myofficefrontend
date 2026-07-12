# Shared Design System

This directory (`components/shared/design-system/`) is the **single source of
truth** for styling, theming, and reusable UI primitives across every page of
the ERP. `components/shared/theme.tsx` is a thin re-export shim kept only so
old `from '@/components/shared/theme'` imports keep working — new code should
import from `@/components/shared/design-system` (or the shim; both resolve to
the same barrel, `index.ts`).

## Why this exists

Before this system, pages hand-rolled their own glass panels, buttons, hover
effects, and colors — hex values and Tailwind class strings copy-pasted and
subtly drifted per page. That produced exactly the class of bugs this file
exists to prevent:

- The same "info card" hover effect re-implemented slightly differently on
  10+ pages, some of which then diverged when one page's version got tuned
  and the others didn't.
- A button's padding rule accidentally written once, inconsistently, so a
  fix had to be applied by hand to 10 separate files instead of one.
- A CSS rule (date-input `color-scheme`) written for one theme and never
  revisited when the app grew a second theme, silently breaking a form
  control on every single page that used it.

**The rule going forward: if you're about to write `hover:-translate-y`,
copy a gradient class string, or pick an arbitrary hex color, stop — there is
almost certainly already a component or token here for it. Import it. If it
doesn't fit your case, extend the shared component (add a prop) rather than
hand-rolling a one-off — that's what keeps a fix in one place instead of
needing to be repeated across every page that copied the pattern.**

## File map

| File | Contents |
|---|---|
| `tokens.tsx` | `useTheme()`, `ThemeProvider`, `ACCENT`/`ACCENT_HEX`/`ACCENT_RGBA` (the 6-color accent palette), `TYPE_SCALE`, `SPACING`, `RADIUS`. Read colors/sizing from here — never hardcode a hex or an arbitrary `text-[Npx]`. |
| `color.ts` | Color math helpers (`hexToRgba`, `rgbaFromHexSafe`, etc.) for turning a hex into a themed rgba string. |
| `motion.ts` | Shared framer-motion variants (`fadeUp`, `staggerContainer`, `fadeTextVariant`, `tileIconItem`/`tileTextContainer`/`tileTextItem`). Reuse these instead of writing a new `variants={{ ... }}` object per component — that's how animation timing/easing drifts out of sync across pages. |
| `primitives.tsx` | Low-level reusable building blocks: `GlowCard`, `CountUp`, `EmptyState`, `Collapse`, `AnimatedText`, `PulsingIcon`. |
| `components.tsx` | Higher-level, page-facing components built on the primitives: `PageHero`, `StatTile`, `StatCard`, `StatStrip`, `StatusBadge`, `ProgressBar`, `FormField`, `FormActions`, `SearchInput`, `ViewToggle`, `CenterModal`, `PrimaryButton`, `InfoCard`, `CollapsibleHeader`, `useCollapseSection`. |
| `index.ts` | Barrel — `export *` from all of the above. |

## Component quick-reference

### `useTheme()`

Returns `{ light: boolean; toggle: () => void }` plus every key from
`themeClasses()` in `tokens.tsx` (`glass`, `glassSoft`, `shadow`,
`textPrimary`, `textSecondary`, `textTertiary`, `textFaint`, `textMuted`,
`border`, `divide`, `hoverBg`, `hoverBgSoft`, `hoverText`, `groupHoverText`,
`chipBg`, `inputBg`, `trendUp`, `trendDown`, `ring`, `scrim`, `linkText`,
`linkHover`, `pageBg`). Every page component must call this and use these
tokens instead of a literal `text-white`/`bg-white/[0.0x]`/etc. — that literal
only looks right in one theme.

### `GlowCard`

The one card primitive for anything that needs a hover-lift affordance:
glass surface, a neutral ambient shadow at rest, a colored 3D glow that
fades in on hover, and a `y: -5` lift. **Never hand-roll
`hover:-translate-y-0.5` + a custom shadow class on a plain `<div>` — use
this.**

The lift itself animates in fast (~0.2s, feels immediate) while the glow
fades in slower (1.6s, delayed 0.3s) and any text-emerge animation inside
the card (`AnimatedText`/`fadeTextVariant`) is delayed further still (0.25s)
— the sequence is: card moves → glow builds → text emerges, not all three
firing at once. If you ever need to retune this, both live in
`primitives.tsx` (the `hover` variant's per-property `transition`) and
`motion.ts` (`fadeTextVariant`) respectively — keep them roughly in that
relative order if you touch either.

**Never stack a decorative colored border/ribbon/ring on a `GlowCard`** —
not even a thin one, not even for a "this record is different" cue. Every
card in the app, no exceptions, should render as exactly the same shape as
the homepage's own module tiles: glass surface, shadow, glow-on-hover, no
edge accents. If a card needs to communicate severity/status/type, that's
what the `color` prop is for (it becomes the hover glow tint) — if the
information needs to be visible at rest too (not just on hover), put it in
a `StatusBadge`/icon inside the card content, not on the card's edge. This
was gotten wrong repeatedly during the original migration (a `border-l-4`
ribbon, a `border-t-2` accent, conditional `ring-1`/`ring-2` states) before
being caught and stripped — don't reintroduce it.

The one legitimate exception: a `ring` used as the *active/selected* state
on a **filter-chip** built on `GlowCard` (e.g. a toggleable category/type
filter tile, not a record card) — that's functional selection affordance
for a toggle-button group, not decoration, and removing it would remove the
only indication of which filter is currently active.

```tsx
<GlowCard color={statusHexOrAccentHex} surface={`${t.glass} rounded-2xl`} onClick={...}>
  {/* card content */}
</GlowCard>
```

- `color` (required): the hover-glow tint. Reuse a color you already have
  in scope (a status/priority hex, `ACCENT_HEX[accent]`) — don't invent a
  new one. If nothing fits, use `ACCENT_HEX.violet` (the app's default
  theme color, matching the homepage).
- `surface`: override the default `glassSoft rounded-lg` (e.g.
  `` `${t.glass} rounded-2xl` `` for a heavier panel-style card).
- `style`: static inline-style passthrough for rare per-item needs (e.g. a
  computed `borderTopColor`) — merges with, doesn't replace, GlowCard's own
  animated `boxShadow`/`y`.

**Common mistake (fixed twice already, in `app/pachedu` and
`app/employees`):** don't stack a heavy `border-l-4`/`border-t-2` in a
saturated color on top of a `GlowCard` to show a per-item status color — it
visually drowns out the glow/lift and defeats the point of using GlowCard.
Pass that color to `color` instead; if a persistent at-rest cue is truly
needed on top of that, use a thin `border-l-2` at ~40-50% opacity, not the
full-strength default.

### `GroupSection` / `Subsection`

`GroupSection` is the homepage-style collapsible category accordion — use it
on any list page whose records read better grouped (staff by section,
equipment by category, spares by area…) instead of one flat scroll.

`Subsection` is a second grouping level that nests *inside* a `GroupSection`
(e.g. within "Underground": Fitters/Riggers/Boilermakers by trade) —
deliberately lighter than `GroupSection` itself (no separate glass card, just
an indented header row + `Collapse`, since it already sits inside one).
Promoted from the `employees` page's designation/trade breakdown. Only wire
this up when grouping actually consolidates records — if every sub-group
would have exactly one member, it's noise, not organization; gate it behind
a check like `subgroups.some(sg => sg.items.length > 1)` before switching a
`GroupSection`'s children over to a list of `Subsection`s.

### `InfoRow` / `SummaryItem`

The two small record-detail atoms every `RecordCard` uses:

- `InfoRow` — a label/value key-value pair (ID numbers, dates, departments…)
  inside a `RecordCard`'s expanded detail.
- `SummaryItem` — one line of a `RecordCard`'s always-visible summary (icon +
  label + value, e.g. "# Mine No.: C1234"). Pass `color` to tint the icon
  with the record's own accent color instead of flat grey — a flat-grey
  summary icon next to a vividly accent-colored record title/badges reads as
  inconsistent ("some icons pop, some don't"); this was an actual reported
  bug on the employees page, fixed by wiring `color={accentHex}` through.

Both were hand-copied per-page before (employees, equipment, inventory,
drivers, contractors each had an identical local copy) — always import these
from the design system now instead of re-adding a local copy to a new page.

### `InfoCard`

Built on `GlowCard`. The canonical "information display" card — used for the
homepage module tiles (`variant="tile"`) and quick-view popup headers
(`variant="header"`). If you're building any new card whose job is "show an
icon + title + description (+ optional metric/badge)", use this instead of
composing raw `GlowCard` + manual layout — it already has the standardized
`SPACING.cardPad`/`SPACING.cardTextGap` spacing and the text-emerge
animation wired up.

### `PrimaryButton`

The one canonical CTA (gradient + brightness-on-hover). Every "New X"/"Add
Y" header action and every modal's submit button should use this instead of
hand-rolling a gradient class string per page.

- `size="sm"` (default): compact, `h-8 px-3`, used for inline header
  actions.
- `size="md"`: taller `py-2.5 px-5`, used for modal/form submit buttons.
  **If you ever see button text overlapping the button edges, check
  whether `px-5` got dropped from the `md` branch again** — this exact bug
  shipped once already (`components.tsx` — `sizeCls` for `size === 'md'`
  originally had `py-2.5` with no horizontal padding at all).
- `fullWidth`: adds `flex-1` (for filling a `flex` button row) — does not
  by itself provide horizontal padding, `size` still controls that.

### `PageHero`

The standard page header — icon, breadcrumbs, title, description, an
`actions` slot (top-right buttons), and a `statsOpen` collapsible stat strip
underneath. Every retrofitted page uses this instead of a hand-rolled
`<h1>` block.

- `accent`: one of the 6 `Accent` values. **App-wide convention: use
  `"violet"` for the page's own hero/primary-action color** (matches the
  homepage's brand purple, `ACCENT_HEX.violet = '#7c3aed'`). Reserve other
  accent values for genuinely semantic uses elsewhere on the page — e.g.
  `amber` for delete/warning confirmations, `emerald` for success/sign-off
  actions, and the deliberately multi-color `StatCard`/`KpiCard` rows that
  encode good/bad/neutral status per metric. Don't repurpose those semantic
  colors as a page's hero accent.

### `CenterModal`, `FormField`, `FormActions`

Standard modal shell and form-row/submit-row wrappers. `FormActions`
already renders a `Cancel` + `PrimaryButton (size="md" fullWidth)` submit
pair — use it instead of hand-rolling a modal's button row.

### `StatusBadge`, `StatTile`, `StatCard`, `ProgressBar`

Small reusable display atoms for a colored pill label, a hero-strip KPI
chip, a bigger dashboard stat card, and a labeled progress bar,
respectively — all theme-aware, all taking a `color` hex prop rather than a
hardcoded Tailwind color class.

### Icon conventions — the Phosphor icon system (`icons.tsx`)

**Every page in the app** draws all icons from a single module —
`components/shared/design-system/icons.tsx` — which re-exports
[`@phosphor-icons/react`](https://phosphoricons.com) glyphs under the app's
existing logical names (the same names the codebase used to import from
lucide). **Import icons from the `@/components/shared/theme` barrel, never
directly from `@phosphor-icons/react` (or any other icon package).** A direct
import won't respond to the solid/outline toggle and reintroduces the
mixed-family look this exists to prevent. `lucide-react` and `@tabler/icons-react`
have both been fully removed as dependencies.

Why Phosphor (not lucide/tabler): every Phosphor icon has both a `regular`
(outline) and a `fill` (solid) weight, and Phosphor's `IconContext` sets a
default `weight` for all icons at once. That's what makes a **global
outline/solid toggle** possible in one place. lucide is outline-only; tabler
only had `*Filled` for ~half the glyphs (which is what produced the earlier
half-solid/half-outline mess). The former custom `SmartphoneFilled` SVG and
the tabler dependency were both removed once Phosphor superseded them.

- **Default is solid.** `IconStyleProvider` (in `icons.tsx`, mounted in
  `components/Providers.tsx` inside `ThemeProvider`) bridges a persisted
  preference (`oz_iconStyle` in localStorage, default `'solid'`) to Phosphor's
  `IconContext` `weight` (`'fill'`/`'regular'`). The header toggle
  (`TopNavigation`, next to the theme sun/moon; uses `useIconStyle()`) flips
  it; every icon in the app changes instantly.
- **Adding/using an icon**: import its logical name from the barrel
  (`import { Users, Trash2, Phone } from '@/components/shared/theme'`). Sizing
  via Tailwind `className="h-4 w-4"` works (Phosphor defaults to `size="1em"`,
  which CSS width/height overrides); color via `style={{ color }}` /
  `text-*` works (Phosphor defaults `fill="currentColor"`). Don't pass
  `weight` per-icon — let the global toggle own it. Leftover lucide-only props
  like `strokeWidth`/`absoluteStrokeWidth` are harmless (valid SVG attributes,
  ignored by Phosphor's fill glyphs) but should be dropped when you touch a
  line.
- **`icons.tsx` covers the ~355 logical names the app already used** (verified
  against Phosphor). For a genuinely new glyph, add a re-export line to
  `icons.tsx` (e.g. `export { CircleHalf as IconStyleGlyph } from
  '@phosphor-icons/react'`); don't import phosphor directly at the call site.
  The `LucideIcon` type (used for `icon:` props) is also re-exported from
  `icons.tsx` as `ElementType`.
- **The logical→Phosphor mapping lives in `icons.tsx`.** A few notable choices:
  `Phone` → `DeviceMobile` (a solid smartphone — the settled "call" affordance),
  `ToolCase` → `Toolbox`, `Award` → `Medal`, `Wheat` → `Plant`, `Radar` →
  `Broadcast`, `Landmark` → `Bank`, and within-category collisions on the
  homepage were given distinct glyphs (`PackageMinus`/Stock Issues →
  `HandDeposit`, `FileWarning`/Near Miss → `WarningDiamond`, `FileCheck`/
  Compliance → `SealCheck`, `FileBarChart`/Eng Report → `PresentationChart`).
  If you re-map one, keep same-category modules visually distinct.
- **Per-context color tinting is preserved everywhere** — **not** flat purple.
  Status/severity color-coding (red overdue, amber warning, green active,
  section/category accents) stays; a filled icon that reads flat grey next to
  a vividly accent-colored record should get `color={accentHex}` /
  `style={{ color }}` (see `SummaryItem`'s `color` prop). The reference sheet
  is monochrome, but ours stays semantically colored by explicit decision.
- **Verify any icon change by screenshotting the running page**, not by
  eyeballing source — several rounds of this work were revised after a real
  render showed a glyph reading heavier/lighter than its neighbors at actual
  size, or a within-category duplicate.

**Scope:** the migration is **app-wide** — all 94 files that imported
`lucide-react` were repointed to the barrel, so the toggle affects every page.
A handful of Phosphor substitutions for specialized glyphs are cosmetic
best-fits (e.g. `Beef`/`Drumstick` → `Cow`, `Sandwich` → `Hamburger`,
`Radar` → `Broadcast`) — fine to refine per-page if one reads wrong, but
change the mapping in `icons.tsx`, don't re-import lucide.

For per-action glyph consistency (independent of solid/outline): **edit →
`Pencil`**, **delete → `Trash2`**, **add → `Plus`**, **call/phone → `Phone`**
(the smartphone). Reuse the established name; don't introduce a second glyph
for the same action.

## Known gotchas (already fixed, but the underlying shape of bug can recur)

0. **When auditing a page for un-migrated `GlowCard` candidates, check EVERY
   repeatable card in the file, not just the first one you find.** This bug
   shipped repeatedly: `app/spares/page.tsx` had `SpareCard` correctly
   migrated but a separate category-filter card was missed; `app/leaves/page.tsx`
   had a leave-type filter chip migrated but the actual leave-request record
   card (`LeaveCard`) was missed entirely; `app/documents/page.tsx` had its
   file-grid card migrated but a category-tile card and a folder card were
   both missed; `app/reports/page.tsx` had its grid-view `ReportCard`
   migrated but the list-view `ReportListItem` was missed. A file "already
   migrated" is not evidence every card in it is — grep the whole file for
   every `.map()`-rendered glass/rounded-2xl block, not just the first
   `hover:-translate-y` hit.

1. **`<input type="date">` calendar-picker icon invisible in one theme.**
   `app/globals.css` has a rule setting the CSS `color-scheme` property for
   date/time inputs — this must always be scoped to
   `:root[data-theme="dark"] input[type="date"] { color-scheme: dark; }`
   (plus a light-mode default), never a blanket unscoped
   `input[type="date"] { color-scheme: dark; }`. `color-scheme` controls
   the browser's *native* picker icon color, which Tailwind classes can't
   touch — if it doesn't match the surrounding theme, the icon can render
   invisibly against the input's background.

2. **Two `<input type="date">` fields crammed into one grid cell.** Native
   date inputs have a non-negotiable intrinsic rendered width (day/month/
   year segments + picker icon). If you put a date-range pair in a `flex`
   wrapper inside a fixed grid column, give the wrapper its own multi-column
   `col-span` (don't just rely on `flex-1`) and add `min-w-0` to each input
   — otherwise they overflow the cell instead of shrinking or wrapping.

3. **Redundant/conflicting border utility stacking.** Don't write
   `` `border ${t.border} border-l-4 border-emerald-500/60` `` — the plain
   `border` is redundant once `t.border` (which already includes a border
   color) and a `border-l-4` override are both present; it's leftover
   copy-paste cruft that makes the eventual border rendering harder to
   reason about across light/dark. Drop the bare `border`.

## Verification checklist for any new/edited page

1. `cd frontend && npx tsc --noEmit | grep <file>` — must be empty for
   your file. (A pre-existing, unrelated `TS2322: ... ease: number[] ...
   not assignable to type 'Variants'` error pattern exists throughout the
   codebase from before this design system — safe to ignore if it's not
   newly introduced by your change.)
2. Grep your file for `Glass|oz-|@/components/shared'|@/components/safety'|usePageCollapse|MasterCollapseButton`
   — must return zero matches. Those are the legacy pre-design-system
   signals; every page should be fully migrated off them.
3. Load the page in both light and dark mode and confirm text stays
   readable and no element clips/overflows its container.
