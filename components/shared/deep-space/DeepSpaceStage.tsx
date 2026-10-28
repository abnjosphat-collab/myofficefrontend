// components/shared/deep-space/DeepSpaceStage.tsx — a full-screen surface for sign-in screens: a wireframe net covering the background and moving in a
// breeze (MeshCanvas), with the content centred above it. `?bg=silk` on the address swaps in the silk cloth (SilkCanvas), for comparing the two.
// Neither reacts to the pointer.
// Light (the app's sage tokens, as they are) is the default unless the app itself is dark; a small toggle at the bottom right
// switches to a dark sage version and the choice is remembered on this device. Honours prefers-reduced-motion (one still frame),
// pauses when the tab is hidden, and cleans up its loop and listeners on unmount.
'use client';

import { useSyncExternalStore, type ReactNode } from 'react';
import { cn, migrateAppearance } from '@/components/ui-system';
import { MeshCanvas } from './MeshCanvas';
import { SilkCanvas } from './SilkCanvas';
import s from './deep-space.module.css';

const STORAGE_KEY = 'myoffice.signin.theme';

function ThemeToggle({ dark, onToggle }: { dark: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} aria-label={dark ? 'Switch to light' : 'Switch to dark'} aria-pressed={dark} title={dark ? 'Light' : 'Dark'} className={s.toggle}>
      {dark
        ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" /></svg>
        : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z" /></svg>}
    </button>
  );
}

// The remembered light/dark choice, read through an external store so the server and first client render agree (light, the default) without an effect.
const listeners = new Set<() => void>();
const subscribe = (callback: () => void) => { listeners.add(callback); window.addEventListener('storage', callback); return () => { listeners.delete(callback); window.removeEventListener('storage', callback); }; };
const readDark = () => {
  try {
    const own = localStorage.getItem(STORAGE_KEY);
    if (own === 'dark') return true;
    if (own === 'light') return false;
    // No sign-in choice yet: follow the app's stored darkness, so the card and its text agree (a dark app behind a light card washes the text out).
    return migrateAppearance(localStorage).darkness === 'dark';
  } catch { return false; }
};
const writeDark = (next: boolean) => { try { localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light'); } catch { /* not remembered */ } listeners.forEach(callback => callback()); };

// Which background: the wireframe net by default, the silk cloth with ?bg=silk (kept for comparing). Read through an external store so the server
// and first client render agree.
const readBackground = () => (new URLSearchParams(window.location.search).get('bg') === 'silk' ? 'silk' : 'mesh');
const subscribeBackground = (callback: () => void) => { window.addEventListener('popstate', callback); return () => window.removeEventListener('popstate', callback); };

/** Full-screen sign-in surface; children are centred above the background. */
export function DeepSpaceStage({ children, className }: { children: ReactNode; className?: string }) {
  const dark = useSyncExternalStore(subscribe, readDark, () => false);
  const background = useSyncExternalStore(subscribeBackground, readBackground, () => 'mesh');
  const toggle = () => writeDark(!dark);
  return (
    <div className={cn(s.stage, dark && s.dark, className)}>
      {background === 'mesh' ? <MeshCanvas look="stage" className={s.canvas} dark={dark} /> : <SilkCanvas className={s.canvas} dark={dark} />}
      <div className={s.layer}>{children}</div>
      <ThemeToggle dark={dark} onToggle={toggle} />
    </div>
  );
}

/** Class for the frosted card that sits on the stage. */
export const deepSpaceGlass = s.glass;
