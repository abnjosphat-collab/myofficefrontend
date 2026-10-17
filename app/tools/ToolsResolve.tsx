// app/tools/ToolsResolve.tsx — the two popups that unblock a tool without leaving the flow: record a due check,
// or record what was repaired (the same MarkReadyForm the Compliance register and the drawer use, so the history
// entries are identical wherever they are recorded from).
'use client';

import type { Tool } from './prototype';
import { MarkReadyForm, RecordCheckForm, type RecordCheckInput } from './ToolsForms';
import { ToolsDialog } from './ToolsUI';

export function RecordCheckDialog({ tool, onClose, onSave }: {
  tool: Tool | null; onClose: () => void; onSave: (tool: Tool, input: RecordCheckInput) => void | Promise<void>;
}) {
  return (
    <ToolsDialog open={!!tool} onClose={onClose} title={tool ? `Record a check — ${tool.name}` : 'Record a check'} description={tool ? `${tool.id} · completing a due check unblocks it for issue.` : ''}>
      {tool && <RecordCheckForm key={tool.id} tool={tool} onSave={input => onSave(tool, input)} onCancel={onClose} />}
    </ToolsDialog>
  );
}

export function RecordRepairDialog({ tool, onClose, onSave }: {
  tool: Tool | null; onClose: () => void; onSave: (tool: Tool, resolutionNote: string) => void | Promise<void>;
}) {
  return (
    <ToolsDialog open={!!tool} onClose={onClose} title={tool ? `Record a repair — ${tool.name}` : 'Record a repair'} description="Record what was repaired or checked before releasing the tool.">
      {tool && <MarkReadyForm key={tool.id} tool={tool} onSave={note => void onSave(tool, note)} onCancel={onClose} />}
    </ToolsDialog>
  );
}
