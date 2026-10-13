// components/shared/floor/FloorProvider.tsx — the app's look: the sage theme on <html> and the 3D floor behind every page, with
// one pulse any screen can send (a saved reading, an overdue tool) through useFloorSignals. Mounted once in Providers, so
// navigating between pages never rebuilds the backdrop.
'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { SignalKind } from '@/lib/notificationSound';
import { FloorBackdrop, type FloorPulse } from './FloorBackdrop';
import { FLOOR_THEME } from './themes';

type FloorContextValue = { pulse: FloorPulse; ping: (kind: SignalKind) => void };
const FloorContext = createContext<FloorContextValue | null>(null);

export function FloorProvider({ children }: { children: ReactNode }) {
  const [pulse, setPulse] = useState<FloorPulse>({ n: 0, kind: 'status' });
  const value = useMemo<FloorContextValue>(() => ({ pulse, ping: kind => setPulse(p => ({ n: p.n + 1, kind })) }), [pulse]);
  return (
    <FloorContext.Provider value={value}>
      <FloorBackdrop pulse={pulse} theme={FLOOR_THEME} />
      {children}
    </FloorContext.Provider>
  );
}

export function useFloor(): FloorContextValue {
  return useContext(FloorContext) ?? { pulse: { n: 0, kind: 'status' }, ping: () => {} };
}
