// app/tools/RegisterView.tsx — the tools register as cards or a table. A person who may archive can tick several
// items (not ones out on loan) and archive them together after one confirmation.
'use client';

import { useState } from 'react';
import { Button, DataTable, MotionList, MotionListItem, StatusBadge, useConfirm } from '@/components/ui-system';
import { departmentOf, type Tool } from './prototype';
import { statusLabel, statusTone } from './toolLook';
import { ToolPod, type ToolQuickAction } from './ToolPod';

export function RegisterView({ tools, view, onSelect, onAction, onArchiveMany, calmKey }: {
  tools: Tool[]; view: 'grid' | 'list'; onSelect: (id: string) => void; onAction?: (kind: ToolQuickAction, tool: Tool) => void; onArchiveMany?: (tools: Tool[]) => Promise<void>; calmKey?: string;
}) {
  const confirm = useConfirm();
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const pickable = tools.filter(tool => !tool.archived && !tool.holder);
  const chosen = pickable.filter(tool => picked.has(tool.id));
  const canSelect = !!onArchiveMany && view === 'list' && pickable.length > 0;
  const stop = () => { setSelecting(false); setPicked(new Set()); };
  const archiveChosen = async () => {
    const ok = await confirm({ title: `Archive ${chosen.length} ${chosen.length === 1 ? 'item' : 'items'}?`, message: 'History is kept and they can be restored.', confirmLabel: 'Archive', destructive: true });
    if (!ok) return;
    setBusy(true);
    try { await onArchiveMany?.(chosen); stop(); } finally { setBusy(false); }
  };

  if (view === 'grid') {
    return <MotionList calmKey={calmKey} className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{tools.map(tool => <MotionListItem key={tool.id}><ToolPod tool={tool} onOpen={() => onSelect(tool.id)} onAction={onAction} /></MotionListItem>)}</MotionList>;
  }
  return (
    <div className="flex flex-col gap-3">
      {canSelect && (selecting
        ? (
          <div role="toolbar" aria-label="Archive several items" className="flex flex-wrap items-center gap-2">
            <strong role="status" className="font-sans text-body-sm font-medium text-ink">{chosen.length ? `${chosen.length} selected` : 'Tick the tools to archive'}</strong>
            <Button variant="ghost" size="sm" onClick={() => setPicked(chosen.length === pickable.length ? new Set() : new Set(pickable.map(t => t.id)))}>{chosen.length === pickable.length ? 'Clear selection' : `Select all ${pickable.length}`}</Button>
            <span className="ml-auto flex gap-2">
              <Button onClick={stop}>Cancel</Button>
              <Button variant="primary" disabled={!chosen.length} pending={busy} onClick={archiveChosen}>{`Archive${chosen.length ? ` ${chosen.length}` : ''}`}</Button>
            </span>
          </div>
        )
        : <div className="flex"><Button icon="archive" onClick={() => setSelecting(true)}>Select to archive</Button></div>)}
      <DataTable
        stillKey={calmKey}
        caption="Tools register"
        rows={tools}
        getRowId={tool => tool.id}
        onRowActivate={tool => onSelect(tool.id)}
        selected={selecting ? picked : undefined}
        onSelectedChange={selecting ? setPicked : undefined}
        rowSelectLabel={tool => `Select ${tool.name}`}
        rowSelectBlocked={tool => tool.holder ? 'Receive this tool before archiving it.' : tool.archived ? 'Already archived.' : undefined}
        columns={[
          { id: 'tool', header: 'Tool', sticky: true, cell: tool => <button type="button" aria-label={`View ${tool.name}`} onClick={() => onSelect(tool.id)} className="focus-ring text-left"><strong className="block font-medium text-ink">{tool.name}</strong><small className="text-ink-muted">{tool.id} · {departmentOf(tool)}</small>{tool.setTypeId && <small className="block text-ink-muted">Set · {tool.setTypeTitle ?? 'set'} · {tool.pieces?.length ?? 0} pieces</small>}</button> },
          { id: 'status', header: 'Status', width: '10rem', cell: tool => <StatusBadge tone={tool.archived ? 'neutral' : statusTone(tool.status)}>{tool.archived ? 'Archived' : statusLabel(tool.status)}</StatusBadge> },
          { id: 'where', header: 'Custody / location', hideBelow: 'md', cell: tool => <>{tool.holder?.split(' · ')[0] || 'Tool room'}<small className="block text-ink-muted">{tool.location}</small></> },
          { id: 'due', header: 'Expected return', hideBelow: 'md', cell: tool => <span className={tool.status === 'overdue' ? 'font-medium text-danger' : undefined}>{tool.due || '—'}</span> },
        ]}
      />
    </div>
  );
}
