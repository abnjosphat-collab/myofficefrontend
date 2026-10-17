// app/tools/ToolConditions.tsx — what must be true before a tool can be issued, as a live checklist that
// updates with the picked tool, employee and confirmations. Blockers stop the issue; the rest is information.
'use client';

import { Button, Icon, cn, type IconMeaning } from '@/components/ui-system';
import type { Employee, Tool } from './prototype';
import { CONDITION_ACTION_LABELS, toolConditions, type ConditionAction, type ConditionState } from './toolConditions';

const ICON: Record<ConditionState, { name: IconMeaning; className: string }> = {
  met: { name: 'success', className: 'text-success' },
  unmet: { name: 'warning', className: 'text-danger' },
  info: { name: 'info', className: 'text-ink-muted' },
  attention: { name: 'warning', className: 'text-warning' },
};

export function ToolConditions({ tool, employee, onAction }: {
  tool: Tool; employee?: Employee | null; onAction?: (action: ConditionAction, tool: Tool) => void;
}) {
  const rows = toolConditions(tool, employee);
  return (
    <section aria-label={`Conditions for ${tool.name}`} className="flex flex-col gap-2 rounded-card border border-line-subtle bg-surface-subtle/50 p-3">
      <h3 className="font-sans text-label font-semibold text-ink">Conditions for this tool</h3>
      <ul className="flex flex-col gap-1.5">
        {rows.map(row => {
          const icon = ICON[row.state];
          return (
            <li key={row.key} className="flex items-start gap-2 font-sans text-body-sm text-ink-muted">
              <Icon name={icon.name} size="sm" weight="emphasis" className={cn('mt-0.5 shrink-0', icon.className)} />
              <span className="min-w-0 flex-1"><strong className="font-medium text-ink">{row.label}</strong>{row.detail ? ` — ${row.detail}` : ''}</span>
              {onAction && row.actions?.map(action => (
                <Button key={action} type="button" size="sm" variant="secondary" className="shrink-0" onClick={() => onAction(action, tool)}>{CONDITION_ACTION_LABELS[action]}</Button>
              ))}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
