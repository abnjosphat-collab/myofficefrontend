# Color harmony — what the app actually looks like

**Status:** Rewritten 2026-10-18 to match the shipped UI system. The September text
described a violet brand with a light/dark split that no longer exists: there is one
light appearance, no theme switch, no dark mode.

Source of truth is `components/ui-system/foundations/tokens.css`, exposed to Tailwind
in `theme.css`. Hex values below are copied from the tokens; `tokens.test.ts` and
`lib/pwa-colours.test.ts` re-check the contrast and PWA claims on every run.

## The palette

Sage surfaces, charcoal-green action, near-black-green ink. One light appearance.

| Layer | Tokens | Values |
|-------|--------|--------|
| Page ground | `--mo-canvas` | `#f4f6f5` |
| Cards, panels, dialogs, menus | `--mo-surface` | `#fbfcfb` |
| Inputs and controls on a surface | `--mo-surface-raised` | `#ffffff` |
| Table headers, hovered rows, quiet wells | `--mo-surface-subtle` | `#f7f9f8` |
| Icon wells, segmented track | `--mo-surface-muted` | `#e8eeeb` |
| Primary text | `--mo-ink` | `#1b2923` (14.7:1 on surface) |
| Supporting text | `--mo-ink-muted` | `#52625a` (worst 4.6:1, on the darkest interactive fill) |
| Quiet notes, placeholders | `--mo-ink-subtle` | `#5c6b64` (worst 4.8:1, on muted wells) |
| Card and panel borders | `--mo-line` | `#ccd7d1` |
| Row dividers | `--mo-line-subtle` | `#e2e9e5` |
| Input/select/checkbox boundary | `--mo-line-control` | `#76867e` (worst 3.3:1 on muted; 3:1 held on all four grounds) |
| Action (brand): default / hover / pressed | `--mo-action*` | `#233b31` / `#2c4d40` / `#182820`, ink `#f8fbf9` |
| Selected row / nav item | `--mo-action-soft` | `#e0ebe5` |
| Focus ring | `--mo-focus` | `#4f806a` (4.4:1 on surface) |

## Status colour (operational meaning only)

Success, warning, danger, info and neutral each have a text, soft-fill and line
token. Status text holds 4.5:1 on its own soft fill. Status is always paired with
a label or an icon — colour is never the only signal. Status colours are never
reused as chart series.

## Charts (categorical, fixed order)

`--mo-chart-1` `#2a78d6` (blue), `-2` `#e8641b` (orange), `-3` `#0b7a55` (teal),
`-4` `#b57e00` (amber), `-5` `#c44e7d` (pink), `-6` `#4d7c0f` (olive),
`-7` `#6d28d9` (violet), `-8` `#b93535` (red). Use `chartColor(n)` / `chartTheme`;
never derive series from the action colour or a route's button colour. Every
series holds 3:1 on surface, raised and subtle grounds; every pair is dE > 30
apart (minimum 33.9); every pair stays distinct under deuteranopia simulation.
Every chart sits in a `ChartPanel` with a text summary.

## The floor (compressors, Tools)

Floor pages set `data-floor-theme="sage"`, which repaints the canvas to `#dbe7df`
and deepens the surfaces around it (`floor-themes.css`). `FloorBackdrop` also
moves the browser/installed-app title bar to the same sage (`TITLE_BAR`), and
restores it when the page closes. This is the only sanctioned second canvas.

## PWA and browser chrome

The manifests (`public/manifest.json`, `public/tools/manifest.webmanifest`) and
both viewport `themeColor`s use the canvas token `#f4f6f5`, so the splash, the
title bar and the page ground are one surface. `lib/pwa-colours.test.ts` asserts
they stay equal to the token.

## Rules

- Pages contain no hex literals: tokens or Tailwind roles (`bg-surface`,
  `text-ink-muted`, `border-line`, `bg-action`). Enforced by ESLint and
  `scripts/css-consistency.mjs`.
- KPI values and metrics are primary text, not hue-coded, unless the number is a
  status signal (then the status tone plus its label).
- Selected state is a filled action pill on the muted track — never a pale tint
  that blends into the track.
