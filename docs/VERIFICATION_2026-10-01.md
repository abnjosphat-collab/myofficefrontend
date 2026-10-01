# MuseOffice verification — 1 October 2026

Source: MyOffice frontend `main/a992afd`, backend `main/d2e0e2a`.
Target: `myoffice/MuseOffice`, workspace at `/`, dev port 3002.

## Automated gates (all pass, run independently from `frontend/`)

- `npx vitest run`: **75/75 across 15 files** — 72 copied verbatim, plus new
  `toolsExports.test.ts` pinning charcoal-green xlsx/pdf headers and docx output.
- `npx tsc --noEmit`: clean.
- `npx eslint . --quiet`: zero errors.
- `npm run build` (Next.js 16.3.8): clean, routes `/` + `/_not-found`.

## Browser verifier (`scripts/verify.mjs`, exit 0 on fresh production build)

Read-only Chromium fixture run against `http://localhost:3002/`:

- Session seeded as legacy v1, app migrated it to the v2 envelope; v1/v2/
  browser/preferences storage restored exactly afterward.
- Progressive equipment delivery before delayed History; independent initial
  History failure without false empty state; quiet failures preserve loaded
  records with stale labeling; transient 503 stays loading (no vendor copy,
  exactly one equipment loader).
- Settled keyboard focus: no outline, `#4f806a` border, 3px halo. Settled
  tile hover: `transform: none`, 3px mineral-green halo.
- Issue-form employee autocomplete commits on click with `pointer-events:
  auto`; full-field date picker invokes the native picker.
- Department grouping, employee eligibility matrix (trained + qualified +
  authorised checked), Compliance, Gate passes, and Analytics visuals
  (usage-trend + feature chart) all render.
- 390px: zero document and main overflow. 60 API responses observed (55
  fixture 200s + 5 deliberate failures); every non-GET app request blocked.

## Visual parity

Same-fixture screenshots of MyOffice `/tools` (untouched, port 3000) vs
MuseOffice `/`: desktop register, desktop Analytics, and 390px register are
visually identical (only the dev overlay badge differs). Signed-out auth
dialog reviewed: clean, on-palette, truthful password note.

## Polish delta (same direction, each with a reason)

1. XLSX/PDF export headers violet `#6D4AFF` → charcoal-green `#233b31`
   (exports are shared product surfaces; violet contradicts the tonal theme).
2. XLSX `book.creator` → product name (was host-project name).
3. Toast border/shadow blue-gray → sage/neutral-green (was MyOffice-global chrome).
4. Viewport `themeColor` → canvas `#f4f6f5` (seamless mobile chrome).
5. Manifest `start_url`/`scope` → `/`, theme colors → tonal palette.
6. Ownership comment in `tools.module.css` updated; no rule changed.

Kept deliberately: `myoffice.tools.*` storage keys (origin-scoped, cutover-
compatible), "register is separate from MyOffice" helper copy (still true of
the employee stores), recharts pinned to proven 3.5.1.

## UI polish pass (same session, user-requested)

Five defects found by screenshot review, all fixed and re-verified (77/77
tests, tsc, ESLint, production build, browser verifier exit 0):

1. Stat chips always used plural labels ("1 Records", "1 Competencies") —
   now singular/plural correct in Compliance and Account access, matching the
   register's existing inline-ternary convention. Pinned by two new render tests.
2. "Import 1 records" button and "1 records imported" toast — pluralized.
3. Competency-row "Authorized byAudit Admin" / "Updated20/09/2026" cramp —
   small/strong now stack in every account-access column (was first-column only).
4. Detail dialog "Complete saved record" competed with the heading — now a
   muted context note.
5. Compliance form actions floated mid-panel — footers bottom-align within
   each equal-height panel row (scoped rule, dialogs unaffected).

## Visual elevation pass (same session, user-requested redesign brief)

"Precision instrument" layer appended to `tools.module.css` (no markup or
behavior changes): tabular numerals on numeric surfaces; sidebar nav at
12px/500 with an active mark (hidden when collapsed/on mobile); summary
strip with confident numerals and hover affordance on its filter cells;
tiles with register-code chips, stronger titles, semantic status pills and
real quiet-button actions; crisper primary shadow; steadier table/heading
weights; constrained empty-state measure; quiet panel scrollbars.
Focus-halo and tile-hover end-states intentionally untouched (verifier-pinned).
Re-verified: 77/77 tests, tsc, ESLint, production build, browser verifier
exit 0, plus screenshot review of register, list, detail dialog and 390px
mobile against the dev server.

## Typeface pairing + bolder tiles (same session, user-requested)

Display/content headings (dialog titles, tile titles, section headings,
empty states, analytics panels) now use Plus Jakarta Sans while body and
chrome follow the Settings typeface choice; Settings copy updated to "Body
typeface" with an explanatory note, and the search index entry renamed to
match. Tiles redesigned: paper surface with stronger figure/ground, 12px
radius, roomier padding, 19px display titles, and full-width state-aware
actions (charcoal Issue when available, outlined Receive while issued/
overdue, quiet Details for attention/archived). Pure CSS except the two
copy strings; pinned focus/hover end-states untouched. Re-verified: 77/77
tests, tsc, ESLint, production build, browser verifier exit 0, plus
screenshot review of available/issued/overdue tiles on desktop and 390px
mobile against the dev server.

## Airy register + header (same session, user-requested)

Register grid reduced from 3 columns to 2 on desktop (single column on
mobile unchanged) so the bolder tiles have room; wordmark joins the
display pairing (Jakarta semibold) and the header bar tightened slightly.
Accent color reviewed and deliberately kept: mineral green owns the
ready/safe/go semantics, amber/red are reserved for warnings, and the
alternatives are either generic (blue), off-idiom (violet) or colliding
(warm metallics). Pure CSS; re-verified with production build and browser
verifier exit 0 plus a 4-tile desktop screenshot review including a
long-name wrap case.

## Inset tile glow (same session, user-requested)

Equipment tile hover/keyboard glow moved from an outer halo to an inset
ring hugging the inside of the border (no shadow spills outside the tile).
Pure CSS; production build and browser verifier exit 0, hover state
confirmed by screenshot.

## Uniform hover wash (same session, user-requested)

Tile hover simplified to one uniform subtle green wash with a crisp green
border: no inset ring, no edge darkening, no shadow spill. The browser
verifier assertion was updated to the new intent (no lift, no shadow,
background visibly changes). Pure CSS + verifier; production build and
browser verifier exit 0, hover state confirmed by screenshot.

## Header hover, chip motion, detail disclosure (same session, user-requested)

1. Header action buttons (Feedback, notifications, Settings, account) and
   employee cards: hover feedback stays inside the border (wash + edge,
   no outer spill). Keyboard focus halos deliberately untouched.
2. Text motion: the crossfade-on-change treatment already on summary,
   results and analytics numerals extended to the Compliance and Account
   access stat chips; reduced-motion safe throughout. Decorative text
   animation declined as off-idiom for the product.
3. Tool detail dialog: specifications now span the full dialog width;
   movement history moved into a collapsed-by-default "Recent activity"
   disclosure with a count badge, item preview, and a "View in History"
   action that closes the dialog and opens the History tab pre-filtered
   to that tool's register number.
Re-verified: 77/77 tests, tsc, ESLint, production build, browser verifier
exit 0 (twice consecutively; one transient dev-server-timing failure
discarded after two green reruns), plus screenshot review of the dialog
collapsed/expanded states, the History deep-link, and header hover.

## Navigation redesign (same session, user-requested)

Header: icon-only notification/Settings/account actions with gaps;
department trigger abbreviated (ALL/ENG/MTS/...) with a glow and no
outline, full names kept inside the open dropdown; `Equipment E-System`
wordmark; hairline-only topline; search narrowed to ~430px; feedback
moved to a bottom-right FAB embedding the text+audio form (Escape,
outside-click, and popover-bus dismissal). Sidebar: current section as
a re-selectable spotlight button with `aria-current`; remaining
sections MRU-ranked (`rankTabs`/`recordTabUse`, persisted under
`myoffice.tools.sidebar.v1`); icons collapsible via a Show/Hide toggle
inside the pill. Homepage tab replaces At a glance: four navigating
stat tiles, an attention list (open incidents via `INCIDENT_LABELS` +
`backendId` lookup, pending gate passes), and recent movements, with
per-source unavailable+retry states and a signed-in `Loading homepage`
gate (never failure-zeroes); old `overview` prefs silently migrate to
the register. Popups: audit found panels already consistent
(paper+hairline+inside hover); FAB joined the popover bus; tooltips made
click-through (`pointer-events:none` on tip and Radix wrapper) after a
focus-opened tip blocked a control; mobile wordmark restored at <=430px
(short text fits now that the dept trigger abbreviates).
Re-verified: 94/94 tests across 18 files, tsc, ESLint, production build
(`/`, `/_not-found`), browser verifier exit 0 on the final build
(landing updates: Equipment navigation after reloads/hydration,
`Loading homepage` in the settle gate; spotlight keeps every tab
clickable), plus screenshot review of header/dept glow, FAB open,
spotlight+MRU, icons toggle, Homepage desktop+390px, notifications with
items, and the settings spanner icon.

## Header polish (same session, user-requested)

Department scope stays in the header (global scope belongs with global
controls) but moves right of the wordmark: `[ALL ▾] | [bell][spanner]
[account]`, with a divider between control types and the "Department"
label removed (an `ActionHint` keeps discoverability). The account
button now reveals an anchored profile popover for signed-in users
(initials avatar, name, access + department rows, 7-day session hint,
full-width Sign out); signed-out still opens the auth modal. Search
starts as a 42px icon button in place (toolbar + homepage) and expands
with a width transition on click or `/`; Escape/blur collapse it when
empty, and a typed query keeps it open. Alignment, measured before and
after with a bounding-box probe: header controls were 34px icons vs a
36px trigger (1px baseline split) — now one 36px row of square icons;
toolbar was search/filter 42px vs a 41px view toggle — inner buttons
33→34 for one 42px row; sidebar already 40/40 (no change); coarse
pointers add settings/account to the 44px touch rule. Icon fill:
deliberately kept neutral — resting chrome stays quiet so the Issue
green (the one primary voice) and semantic colors speak; balance comes
from the hover wash, dept glow, and solid-green FAB. The browser
verifier now pins header-36/toolbar-42 baselines, the profile reveal,
and the search expand step.
Re-verified: 102/102 tests across 20 files, tsc, ESLint, production
build, browser verifier exit 0 on the final build, plus screenshot
review of the header, open dept, open profile, collapsed/expanded
search, and 390px mobile.

## Polish round 2 (same session, user-requested)

Wordmark icon removed (text-only `Equipment E-System`, dead chip
rules removed). Green fill scoped by principle: filling every icon
would destroy hierarchy, so only the spotlight chip is solid brand
green with a filled Phosphor glyph (`ToolsIcon` gains a `weight`
prop, default `light` — no pack change needed); header icons stay
neutral so Issue keeps the one primary voice and the bell badge keeps
its semantics. Hover-spill purge: hover feedback is now inside the
border everywhere (wash + edge, `box-shadow:none`) across actions
anchor, secondary actions, person cards, export choices, guide action,
select triggers, dialog close, filter/field inputs, and table rows —
the root cause was a (0,3,0) hover rule re-adding the ring after the
earlier fixes; it is now split so `:focus-visible` keeps the halo.
Deliberately kept: `.primary` glow (approved exemplar), dept trigger
glow (requested identity), heat-cell rings (chart tracking), panel
rest shadows, all focus halos — each verified by computed-style probe
(person/actions/select/export `none`, dept glow intact). Homepage now
introduces the system (two-line intro + scope line: department ·
account/role) with a section-nav grid built from the same
`visibleTabs` as the sidebar (2-col → 1-col, `Open <label>` names).
Sidebar centering: nav glyphs wrapped in fixed 22px cells (the only
bare-icon list in the app; all others already use fixed chips), so
labels share one x and glyphs center optically.
Re-verified: 103/103 tests across 20 files, tsc, ESLint, production
build, browser verifier exit 0 on the final build (new homepage
section click-through assert), mobile homepage 0/0 overflow, plus
screenshot review of homepage, sidebar closeup, hover states, and
390px mobile.

## Merge-back into myofficefrontend (same session, user-requested)

The standalone `MuseOffice/` app was ported back into this repo:
`components/tools/*` → `app/tools/*` (colocated, `./` imports),
`app/page.tsx` → `app/tools/page.tsx`, `lib/charts.ts` → `lib/charts.ts`,
`scripts/verify.mjs` → `scripts/verify-tools.mjs` (default base
`http://localhost:3000/tools`), docs → `docs/`. No dependency, config,
layout, manifest, icon, or font changes were needed: versions match
(Next 16, React 19, recharts 3.5.1), `@/*` maps identically,
`lib/config.ts` already exports the same `API_BASE`, the root layout
already loads the same four typefaces and a Toaster, and the tools
icons + `/tools/manifest.webmanifest` already exist. Two compat
touches: `.wordmark>span` chip rules restored (shared with
`app/maintenance`, which still renders the chip), and
`e2e/tools-autofill.spec.ts` navigates to Equipment first (Homepage is
the landing tab). The separate `museoffice` repo was retired; the
local `MuseOffice/` directory is left for reference until deleted.

## Still open (not claimed)

- Live signed-in pilot against production data (all browser evidence is
  fixture-based by design; no live data was read or changed).
- Supervised operational acceptance with real HOS/HOD/Security/Finance/GM users.
- Provisional quarterly inspection colours (mine policy) and the F1/F2
  findings in `docs/EXTRACTION_PLAN.md` remain reported, not fixed, in MyOffice.
- Cutover: explicitly out of scope until approved. `/tools` verified untouched
  (both repos show only the pre-existing handoff-doc state).
