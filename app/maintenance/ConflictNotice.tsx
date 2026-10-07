// app/maintenance/ConflictNotice.tsx — shown when a save was refused because someone else saved the work order first. The editor keeps
// what was typed; the person chooses to keep their version (saving over the other) or take the one on the server.
'use client';

import { Button, Notice } from '@/components/ui-system';
import { fmtDateTime } from '@/components/shared/utils';
import type { WorkOrder } from './types';

export function ConflictNotice({ current, pending, onKeepMine, onUseTheirs }: {
  current: WorkOrder; pending: boolean; onKeepMine: () => void; onUseTheirs: () => void;
}) {
  return (
    <Notice
      tone="warning" title="Someone else saved this work order first"
      action={<div className="flex flex-wrap gap-2"><Button size="sm" variant="primary" pending={pending} onClick={onKeepMine}>Keep mine and save</Button><Button size="sm" disabled={pending} onClick={onUseTheirs}>Use theirs, discard mine</Button></div>}
    >
      It was last saved {current.updated_at ? fmtDateTime(current.updated_at) : 'just now'}. Your changes are still here and nothing has been lost. Keeping yours replaces what they saved in the same fields.
    </Notice>
  );
}
