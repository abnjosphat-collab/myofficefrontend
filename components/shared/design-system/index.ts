// components/shared/design-system/index.ts — barrel export. Import everything
// from this one path: `import { useTheme, ACCENT, GlowCard } from '@/components/shared/design-system'`.
// See README.md in this directory for the full component reference, usage
// conventions (accent colors, GlowCard vs. hand-rolled cards, etc.), and a
// list of gotchas already hit once — read it before adding a new component
// or hand-rolling something this barrel might already provide.
export * from './tokens';
export * from './color';
export * from './motion';
export * from './primitives';
export * from './components';
