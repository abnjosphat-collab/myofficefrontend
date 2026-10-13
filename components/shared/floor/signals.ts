// components/shared/floor/signals.ts — how the floor announces an event: a sound (chosen in Settings, see
// lib/notificationSound) and a pulse the backdrop answers. Sound plays only after the person has interacted with the
// page (browsers block it before that) and never while muted.
'use client';

import { useCallback, useEffect, useRef } from 'react';
import { playSound, useSoundPrefs, type SignalKind } from '@/lib/notificationSound';
import { useFloor } from './FloorProvider';

export type { SignalKind };

/** The floor's signal: `pulse` increments on every event (the backdrop replays its ripple), `signal` fires one. */
export function useFloorSignals() {
  const { muted, voice } = useSoundPrefs();
  const { pulse, ping } = useFloor();
  const interacted = useRef(false);

  // The first interaction unlocks audio.
  useEffect(() => {
    const unlock = () => { interacted.current = true; };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => { window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); };
  }, []);

  const signal = useCallback((kind: SignalKind) => {
    ping(kind);
    if (!muted && interacted.current) playSound(kind, voice);
  }, [muted, voice, ping]);

  return { pulse, signal };
}
