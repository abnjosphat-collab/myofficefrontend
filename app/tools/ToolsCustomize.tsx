// app/tools/ToolsCustomize.tsx — the Tools settings: the shared typeface, text size and hints, then the sidebar icon style and
// whether Archive and Deactivate are shown. Saved on this device.
'use client';

import type { Dispatch, SetStateAction } from 'react';
import { AppearanceFields, Button, Checkbox } from '@/components/ui-system';
import type { FontChoice, FontSizeChoice } from './ToolsUI';
import type { IconPackId } from './sidebarNav';
import { IconPackPicker } from './ToolsSidebarIcon';

export type SectionName = 'register';
export type WorkspaceOptions = { order: SectionName[]; hidden: SectionName[]; font: FontChoice; fontSize: FontSizeChoice; guidance: boolean; guide: boolean; /** Whether the Archive and Deactivate buttons are shown; hiding them guards against accidental removal on this device. */ showRemoval: boolean };
export const DEFAULT_OPTIONS: WorkspaceOptions = { order: ['register'], hidden: [], font: 'inter', fontSize: 100, guidance: true, guide: true, showRemoval: true };

export function ToolsCustomize({ options, setOptions, iconPack, onIconPack }: { options: WorkspaceOptions; setOptions: Dispatch<SetStateAction<WorkspaceOptions>>; iconPack: IconPackId; onIconPack: (pack: IconPackId) => void }) {
  return (
    <div className="flex flex-col gap-5">
      <AppearanceFields />

      <section className="flex flex-col gap-2">
        <h3 className="font-sans text-label font-medium text-ink">Sidebar icons</h3>
        <p className="font-sans text-caption text-ink-muted">Choose the style of the icons in the left sidebar. This changes Tools only.</p>
        <IconPackPicker pack={iconPack} onChange={onIconPack} />
      </section>

      <Checkbox label="Archive and deactivate buttons" description="Turn off to hide them for equipment and employees, so nothing is removed by accident. Restore and Reactivate stay available."
        aria-label="Archive and deactivate buttons" checked={options.showRemoval} onChange={e => setOptions(p => ({ ...p, showRemoval: e.target.checked }))} />

      <div className="flex items-center justify-between gap-3 border-t border-[var(--mo-line-subtle)] pt-4">
        <p className="font-sans text-caption text-ink-muted">Your choices are saved on this device.</p>
        <Button icon="reset" onClick={() => setOptions({ ...DEFAULT_OPTIONS, order: [...DEFAULT_OPTIONS.order], hidden: [] })}>Restore defaults</Button>
      </div>
    </div>
  );
}
