# Polish round 2 plan — wordmark, spotlight fill, spill purge, homepage, centering, commit

Status: implemented and verified 2026-10-01 (see
`VERIFICATION_2026-10-01.md` § Polish round 2). Kept as the design
record.

## Decisions

1. **Wordmark icon removed.** Plain `Equipment E-System` text; dead
   `.wordmark>span` rules removed too.
2. **Green fill, principled scope.** Filling every sidebar/header icon
   solid green would destroy hierarchy (color must mark state, not
   decoration) and fight the bell badge + Issue primacy. Instead: the
   **spotlight chip only** becomes solid brand green with a filled
   light glyph (Phosphor `weight="fill"` — no pack change needed;
   `ToolsIcon` gains an optional `weight` prop, default `light`).
   Balance comes from a triangle — spotlight (left), Issue (content),
   FAB (corner) — not a wash. Header icons stay neutral (decision
   recorded; revisit only with new evidence).
3. **Hover-spill purge.** Rule: hover feedback stays inside the
   border (wash + edge); the 3px ring is reserved for keyboard focus
   (`:focus-visible`), which is untouched everywhere. Root cause of
   the sightings: a (0,3,0) hover rule re-added the ring after the
   earlier fixes. One appended override nulls hover `box-shadow` for:
   actions anchor + secondary actions, person cards, export choices,
   guide action, select triggers, dialog close, filter/field
   selects + inputs, table list rows. Kept deliberately: `.primary`
   glow (user-approved exemplar), dept trigger glow (requested
   identity), heat-cell rings (chart hover tracking), all panel rest
   shadows (elevation, not hover), all focus halos.
4. **Homepage as homepage (still an app, not a website).** Keep the
   dashboard; add (a) a two-line system introduction + muted scope
   line (department · account/role, composed by the page), and (b) a
   section-nav grid built from the same `visibleTabs` the sidebar
   uses (icon chip + label + one-line description + chevron,
   `Open <label>` names, 2-col → 1-col). No hero, no CTAs, no
   marketing. Order: intro → stats → sections → attention/movements.
5. **Centering.** Sidebar nav is the only bare-icon list in the app
   (everywhere else uses fixed chips: 34/35/36px, header 36px boxes).
   Wrap nav glyphs in a fixed 22px centered cell so labels share one
   x and glyphs center optically. Audit found no other bare-icon
   lists (secondary action buttons are inline adornments at 16px —
   imperceptible, left alone).

## Implementation

- `page.tsx`: wordmark span out; nav icon cells; homepage
  `sections` + `contextLine` props.
- `ToolsIcon.tsx`: `weight` prop (`light` default).
- Sidebar spotlight JSX: `weight="fill"` on the chip icon.
- `ToolsHomepage.tsx` + CSS: intro block, scope line, section grid,
  descriptions map; tests extended.
- CSS: spill-purge override (+ dept glow re-assert after it),
  spotlight green chip, nav icon cells, homepage sections.
- `verify.mjs`: homepage section click-through (spotlight assert);
  existing hover assertion unchanged (still no shadow).
- Git: `git init` + commit in `MuseOffice/` (own repo; no remote
  exists — see push note). Docs: verification log entry; this plan
  marked implemented.

## Verification

`vitest`, `tsc`, `eslint`, `next build`, `node scripts/verify.mjs`
exit 0, screenshots (header, green spotlight, personCard/actions
hover states, homepage, mobile), then commit; push needs a
destination (no remote configured — ask, don't invent).
