// app/tools/ToolPod.tsx — one tool in the register: its name, where it is, its custody status, and the one
// thing to do next (Issue while it is ready, Receive while it is out). Built on the shared RecordCard, so the
// register reads like every other record list; the open target is the stretched title button and the quick
// action is its sibling, never nested inside it.
'use client';

import { Button, RecordCard, StatusBadge } from '@/components/ui-system';
import type { Tool } from './prototype';
import { statusLabel, statusTone, whereIs } from './toolLook';

export type ToolQuickAction = 'issue' | 'return';

export function ToolPod({ tool, onOpen, onAction }: { tool: Tool; onOpen: () => void; onAction?: (kind: ToolQuickAction, tool: Tool) => void }) {
  const label = statusLabel(tool.status);
  const out = tool.status === 'issued' || tool.status === 'overdue';
  const quick: ToolQuickAction | null = tool.archived || tool.status === 'attention' ? null : out ? 'return' : 'issue';
  return (
    <RecordCard
      eyebrow={tool.id}
      title={tool.name}
      subtitle={tool.make || undefined}
      status={<StatusBadge tone={tool.archived ? 'neutral' : statusTone(tool.status)}>{tool.archived ? 'Archived' : label}</StatusBadge>}
      meta={<>{whereIs(tool)}{' · '}{out && tool.due ? <span className={tool.status === 'overdue' ? 'font-medium text-danger' : undefined}>Due {tool.due}</span> : tool.category}</>}
      action={quick && onAction ? <Button size="sm" onClick={() => onAction(quick, tool)}>{quick === 'issue' ? 'Issue' : 'Receive'}</Button> : undefined}
      onOpen={onOpen}
      openLabel={`${tool.name}, ${tool.id}, ${label}. ${whereIs(tool)}. Open for details.`}
    />
  );
}
