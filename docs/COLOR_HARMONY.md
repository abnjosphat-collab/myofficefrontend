# Color harmony — icon & accent strategy

**Status:** Approved and rolling out app-wide (Sep 2026). Homepage info tiles are the visual reference.

## Principles

| Layer | Role | Color |
|--------|------|--------|
| **Structure** | Navigation, module/category/row icons, labels | Neutral foreground (`uiIconClass('neutral')`) |
| **Brand** | Primary CTAs, hover glow, active route, pinned favorites | **brand/violet** scale (`BRAND_GLOW_HEX`, `text-brand-*`) |
| **Semantic** | Health, priority, errors, trends, operational status | **`STATUS_TONE` only** |
| **Data** | KPI values, metrics | Primary text — not hue-coded unless semantic |
| **Hero stat chips** | `StatTile` in page heroes | Decorative `color` tints icons in **light only**; dark uses neutral icons. `iconTone="semantic"` + `STATUS_TONE` in both themes when the count is a status signal |
| **Categorical** | Charts, training categories, record-type chips | Deliberate accent — use `iconTone="accent"` or page-local maps |

Categorical `ACCENT.*` remains for intentional use — not default icon coloring on every tile.

## Implementation map

| Phase | Scope | Status |
|-------|--------|--------|
| 1 | Homepage module tiles, quick actions | Done |
| 2 | App shell — sidebar module icons neutral, brand active/favorites, scroll accents | Done |
| 3 | `PageHero`, `GroupSection`, `RecordCard` default neutral icons; brand glow on `GlowCard` | Done |
| 4 | `InfoCard.iconTone` default **`neutral`**; use **`iconTone="accent"`** where categorical colour is justified | Done (default); audit call sites over time |
| 5 | Theme split — decorative accents **light only** (`decorativeAccentHex`); semantic via **`isStatusToneHex`** in both themes | Done |
| 6 | shadcn **`chart-*`** / **`sidebar-*`** CSS vars aligned to brand + stone (not legacy blue rainbow) | Done |

## Component API

- **`InfoCard`**: `iconTone` default `'neutral'`. Pass `iconTone="accent"` + `accentColor` for categorical tiles.
- **`PageHero`**: `iconTone` default `'neutral'`. Pass `iconTone="accent"` for deliberate category heroes.
- **`GroupSection`**: `iconTone` default `'neutral'`. Optional `accentHex` when `iconTone="accent"`.
- **`RecordCard`**: `iconTone` default `'neutral'`; hover glow uses `BRAND_GLOW_HEX` unless `iconTone="accent"`. Pass `STATUS_TONE` hex as `accentHex` for semantic glow when needed.
- **`StatTile`**: decorative `color` → light mode only (`decorativeAccentHex`); semantic tones in both themes.
- **`SummaryItem` / `GroupSection` / `RecordCard`**: pass `accentHex` / `color` for light-mode category polish; dark stays neutral icons + brand glow unless `iconTone="accent"` (avoid accent in dark).
- **`decorativeAccentHex(light, hex, { semantic? })`** — light-only decorative tints; pass `semantic: true` (or use a `STATUS_TONE` hex detected via **`isStatusToneHex`**) when the accent must show in dark mode too.
- **`PageHero` / `InfoCard` / `ProgressBar`** — respect the same split (category heroes and accent tiles vivid in light; dark uses neutral icons / brand fills unless semantic).

## Dialogs

- **`CenterModal`**: standard centred ERP dialog (themed glass, glow, 48px close, shared Escape rules).
- **`components/ui/dialog`**: Radix primitive themed to match CenterModal; shares `handleModalEscapeKeyDown` from `dialog-shared.ts`.

## Verification

- **Light:** categorical hero/group/card accents OK on stone canvas.
- **Dark:** no rainbow module grids or hero strips — neutral structure, brand on hover/CTA/active; status screens keep semantic rose/amber/emerald meaning.
- `prefers-reduced-motion`: GlowCard lift, AnimatedText emerge, PulsingIcon pulse, modal motion respect reduced preference.
