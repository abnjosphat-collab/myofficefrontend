import { createElement, type CSSProperties, type ElementType } from 'react';
import type { IconWeight } from '@phosphor-icons/react';
import { ICON_BY_MEANING, type IconMeaning } from './icon-meanings';

/**
 * Contextual weight policy (one place, no global toggle):
 *   control    light    buttons, inputs, toolbars, table actions   (default)
 *   navigation regular  sidebar / bottom-bar destinations
 *   emphasis   fill     the single selected spotlight, status glyphs
 */
export type IconContextWeight = 'control' | 'navigation' | 'emphasis';

const WEIGHTS: Record<IconContextWeight, IconWeight> = {
  control: 'light',
  navigation: 'regular',
  emphasis: 'fill',
};

/** Standard sizes in px. Pick the one that matches the control height. */
export const ICON_SIZE = { xs: 14, sm: 16, md: 18, lg: 20, xl: 24 } as const;
export type IconSize = keyof typeof ICON_SIZE;

type Common = {
  size?: IconSize | number;
  weight?: IconContextWeight;
  className?: string;
  style?: CSSProperties;
  /** Accessible name. Omit for decorative icons (the default: aria-hidden). */
  label?: string;
};

function resolveSize(size: IconSize | number | undefined): number {
  if (typeof size === 'number') return size;
  return ICON_SIZE[size ?? 'sm'];
}

/** Render a semantic icon: `<Icon name="edit" />`. */
export function Icon({ name, size, weight = 'control', className, style, label }: Common & { name: IconMeaning }) {
  return renderGlyph(ICON_BY_MEANING[name], { size, weight, className, style, label });
}

/** True when `value` is one of the semantic icon meanings (as opposed to a glyph component). */
export function isIconMeaning(value: unknown): value is IconMeaning {
  return typeof value === 'string' && value in ICON_BY_MEANING;
}

/** Render an arbitrary glyph component (from glyphs.ts) with the same weight policy. */
export function Glyph({ as, size, weight = 'control', className, style, label }: Common & { as: ElementType }) {
  return renderGlyph(as, { size, weight, className, style, label });
}

function renderGlyph(component: ElementType, { size, weight, className, style, label }: Common) {
  return createElement(component, {
    size: resolveSize(size),
    weight: WEIGHTS[weight ?? 'control'],
    className,
    style,
    ...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true }),
  });
}
