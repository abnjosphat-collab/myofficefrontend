# Frontend UI architecture

**Status:** active architecture decision  
**Scope:** all MyOffice frontend routes

## Decision

MyOffice uses a layered, open-code UI system rather than a second monolithic
component framework:

1. **Radix UI** provides accessible interaction primitives.
2. **shadcn-style components** under `components/ui/` provide owned source code
   that can be inspected and changed locally.
3. **Tailwind CSS and semantic CSS variables** provide layout and theme tokens.
4. **`components/shared/design-system/`** provides MyOffice-specific components,
   icon meaning, chart palettes, motion, and product rules.
5. Route CSS modules are allowed for specialist interfaces such as Tools, but
   they must consume the same semantic color model.

Do not add Material UI, Chakra UI, Ant Design, or another competing component
system unless an accepted architecture decision identifies a capability that
the existing stack cannot reasonably provide. A second visual framework would
increase bundle size, duplicate behavior, and make system-wide fixes harder.

## Color model

Color has separate responsibilities:

| Channel | Purpose | Dark-mode rule |
|---|---|---|
| Structure | Canvas, surfaces, borders, text, controls, active navigation | Black, white, and graphite only |
| Semantic | Success, warning, danger, information, operational status | Use only when the color communicates state |
| Data | Chart series, heat maps, comparisons, visualization highlights | Use the shared categorical palette |
| Brand | Light-mode emphasis and approved identity moments | Must not wash dark-mode structure in violet |

The Dallaglio dark theme maps legacy `brand-*` utilities to an achromatic
interaction ramp for compatibility. Charts do not read that ramp; they use
`chartTheme()` from `components/shared/design-system/charts.ts`. Tools follows
the same split with `--brand` for interaction and `--data-accent` for charts.

## Component selection

- Search the shared design-system barrel before writing a new control.
- Extend an existing component when the behavior is the same and only a
  meaningful option differs.
- Keep route-specific business logic outside shared visual primitives.
- Keep native semantics and keyboard behavior; do not replace accessible Radix
  behavior with hand-built event handlers for visual convenience.
- Document exported contracts and surprising constraints; do not narrate
  obvious JSX or utility classes.

## Verification contract

Any theme or shared-component change requires:

1. Focused unit or interaction tests for changed behavior.
2. TypeScript and ESLint checks on affected files.
3. A production build.
4. Rendered verification in light and dark modes at desktop and phone widths.
5. A check that semantic and chart colors remain distinguishable and are not
   being used as decoration.

## Primary references

- shadcn/ui documentation: https://ui.shadcn.com/docs
- shadcn/ui theming: https://ui.shadcn.com/docs/theming
- Radix Primitives introduction: https://www.radix-ui.com/primitives/docs/overview/introduction
- Tailwind CSS dark mode: https://tailwindcss.com/docs/dark-mode

