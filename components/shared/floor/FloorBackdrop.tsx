// components/shared/floor/FloorBackdrop.tsx — the floor's background and theme. A shaded wash and the quiet net
// in the background corner give the depth; each event sends one ripple across it in the event's colour. It also sets
// the chosen theme on <html> (so portalled dialogs, menus and toasts follow it) and the browser / installed-app title
// bar colour, and restores both when the page closes.
'use client';

import { useEffect } from 'react';
import type { SignalKind } from './signals';
import { TITLE_BAR, type FloorTheme } from './themes';
import s from './floor.module.css';
import './floor-themes.css';
import { floorDisplay, floorMono } from './fonts';
import { MeshCanvas } from '@/components/shared/deep-space/MeshCanvas';

const PULSE_COLOUR: Record<SignalKind, string> = { saved: 'var(--mo-success)', status: 'var(--mo-info)', alert: 'var(--mo-danger)' };

export type FloorPulse = { n: number; kind: SignalKind };

export function FloorBackdrop({ pulse, theme }: { pulse: FloorPulse; theme: FloorTheme }) {
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.floorTheme = theme;
    root.classList.add(floorDisplay.variable, floorMono.variable);
    // The title bar of the browser and of the installed app (PWA) takes the theme's canvas colour.
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]:not([media])');
    const created = !meta;
    if (!meta) { meta = document.createElement('meta'); meta.name = 'theme-color'; document.head.appendChild(meta); }
    const before = meta.content;
    meta.content = TITLE_BAR;
    return () => {
      delete root.dataset.floorTheme;
      root.classList.remove(floorDisplay.variable, floorMono.variable);
      if (created) meta?.remove(); else if (meta) meta.content = before;
    };
  }, [theme]);
  return (
    <div className={s.backdrop} aria-hidden="true">
      <MeshCanvas look="floor" className={s.meshFloor} />
      {/* Keyed on the count, so every event mounts a fresh ripple and the animation plays once. */}
      {pulse.n > 0 && <span key={pulse.n} className={s.ripple} data-pulse="" style={{ ['--pulse' as string]: PULSE_COLOUR[pulse.kind] }} />}
    </div>
  );
}
