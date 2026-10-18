// app/tools/ToolsCustomize.tsx — the Tools settings: the shared typeface, text size and hints, notification
// sounds, and whether Archive and Deactivate are shown. Saved on this device.
'use client';

import { useState, type Dispatch, type SetStateAction } from 'react';
import { AppearanceFields, Button, Checkbox } from '@/components/ui-system';
import { setSoundEnabled, soundEnabled } from '@/lib/notify';
import type { FontChoice, FontSizeChoice } from './ToolsUI';

export type SectionName = 'register';
export type WorkspaceOptions = { order: SectionName[]; hidden: SectionName[]; font: FontChoice; fontSize: FontSizeChoice; guidance: boolean; guide: boolean; /** Whether the Archive and Deactivate buttons are shown; hiding them guards against accidental removal on this device. */ showRemoval: boolean };
export const DEFAULT_OPTIONS: WorkspaceOptions = { order: ['register'], hidden: [], font: 'inter', fontSize: 100, guidance: true, guide: true, showRemoval: true };

export function ToolsCustomize({ options, setOptions }: { options: WorkspaceOptions; setOptions: Dispatch<SetStateAction<WorkspaceOptions>> }) {
  const [sounds, setSounds] = useState(soundEnabled);
  return (
    <div className="flex flex-col gap-5">
      <AppearanceFields />

      <Checkbox label="Notification sounds" description="Play a soft sound with the success and failure popups."
        aria-label="Notification sounds" checked={sounds} onChange={e => { setSounds(e.target.checked); setSoundEnabled(e.target.checked); }} />

      <Checkbox label="Archive and deactivate buttons" description="Turn off to hide them for equipment and employees, so nothing is removed by accident. Restore and Reactivate stay available."
        aria-label="Archive and deactivate buttons" checked={options.showRemoval} onChange={e => setOptions(p => ({ ...p, showRemoval: e.target.checked }))} />

      <div className="flex items-center justify-between gap-3 border-t border-line-subtle pt-4">
        <p className="font-sans text-caption text-ink-muted">Your choices are saved on this device.</p>
        <Button icon="reset" onClick={() => setOptions({ ...DEFAULT_OPTIONS, order: [...DEFAULT_OPTIONS.order], hidden: [] })}>Restore defaults</Button>
      </div>
    </div>
  );
}
