// components/shared/theme.tsx — re-export shim.
// The design system now lives in components/shared/design-system/ (tokens.ts,
// color.ts, motion.ts, primitives.tsx). This file is kept so existing imports
// from '@/components/shared/theme' keep working without changes — new code
// should import from '@/components/shared/design-system' directly.
export * from './design-system';
