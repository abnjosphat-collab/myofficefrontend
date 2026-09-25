'use client';

import { createElement, type ElementType } from 'react';
import { useTheme } from './tokens';
import type { IconMeaning } from './shared/icon-meanings';
import { CLASSIC_ICONS } from './classic/icons';
import { DALLAGLIO_ICONS, DALLAGLIO_ICON_SIZE, DALLAGLIO_ICON_WEIGHT } from './dallaglio/icons';

export function designIcon(meaning: IconMeaning, design: 'classic' | 'dallaglio'): ElementType {
  return design === 'dallaglio' ? DALLAGLIO_ICONS[meaning] : CLASSIC_ICONS[meaning];
}

export function DsIcon({
  name, size, className = '',
}: {
  name: IconMeaning;
  size?: number;
  className?: string;
}) {
  const { design } = useTheme();
  const resolvedSize = size ?? (design === 'dallaglio' ? DALLAGLIO_ICON_SIZE : 14);
  return createElement(designIcon(name, design), {
    size: resolvedSize,
    weight: design === 'dallaglio' ? DALLAGLIO_ICON_WEIGHT : undefined,
    className,
    'aria-hidden': true,
  });
}
