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
