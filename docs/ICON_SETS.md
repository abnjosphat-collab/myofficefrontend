# Icon sets installed for later (not used yet)

Three Iconify icon sets are installed as **dev dependencies** so their glyphs can be bundled into the app later. **Nothing imports them today.** The app's icons are still all Phosphor, through `components/ui-system/foundations/glyphs.ts` and `icon-meanings.ts`.

## Why

Phosphor has no glyph for much of what this business actually handles: safety vest, respirator, ear protection, excavator, dump truck, forklift, pickaxe, conveyor, ID card, air compressor, electric motor, transformer, winch, drill rig, crusher, gas detector. Research on 2026-10-21 (47 concepts tested across 36 sets, compared side by side) chose these three as a supplement to Phosphor, not a replacement. The findings, coverage data and the side-by-side image are in the workspace folder `audit/icon-sets-2026-10-21/`.

| Package | Version | Licence | Icons | Grid | Use for |
|---|---|---|---|---|---|
| `@iconify-json/iconoven` | 1.2.1 | MIT (Appic Marketing) | 18,236 | 24 | First choice for plant, PPE and equipment: closest look to Phosphor (rounded, medium stroke). One weight; round and `-sharp` variants, no fill. |
| `@iconify-json/energy-icons` | 1.2.4 | MIT (Sam Passmore) | 8,252 | 20 and 48 | Heavy plant and energy equipment IconOven lacks (winch, drill rig, crusher, gas detector). Regular and bold. Thinner, more technical look. |
| `@iconify-json/healthicons` | 1.2.13 | MIT (Resolve to Save Lives) | 2,709 | 48 | PPE items no other set has: respirator, N95 mask, goggles, gloves, PPE suit. Outline and filled. |

`@iconify/types` comes with them. About 16 MB sits in `node_modules`; none of it reaches the app until a glyph is used.

## How to use them when the time comes

- **Bundle, never fetch.** Do not call Iconify's live API: the app is a PWA used on mine sites with patchy connections. Extract only the glyphs needed at build time from the installed `icons.json` into a small generated module, so only those ship.
- **Go through the mapping layer.** Add the glyph to `glyphs.ts` and give it a meaning in `icon-meanings.ts`, as for any icon, so "one glyph per meaning" and the lint rule against direct icon imports still hold.
- **Weights.** The app renders three weights by context (light for controls, regular for navigation, fill for emphasis, `Icon.tsx`). None of these sets has that ladder. Decide the stand-in for "fill" (for example the HealthIcons filled style, or a stroke-only glyph at emphasis) before the first one is used, and check each glyph beside Phosphor at 14 to 24 px.
- **Licence notice.** All three are MIT. When the first glyph ships, add each set's copyright and licence text to the app's third-party notices.
- **Name checks.** Search the installed `icons.json` for exact names; a few expected names differ (for example `drilling-rig-20`, not `drill-rig-20`).
