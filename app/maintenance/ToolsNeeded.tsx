// app/maintenance/ToolsNeeded.tsx — the tools a job needs, picked from the Tools & Equipment register (or typed when a tool is not on it).
// A tool that is out on loan, overdue or due an inspection is flagged here as a warning; Maintenance never issues or reserves tools
// (that stays in /tools). The list is plain data: the form saves it with the work order.
'use client';

import { useMemo, useState } from 'react';
import { Button, Icon, Notice } from '@/components/ui-system';
import { RegisterField } from './RegisterField';
import { findMatch, toolOptions, toolWarning } from './registers';
import { useToolsRegister } from './useRegisters';
import type { WorkOrderTool } from './types';

export function ToolsNeeded({ tools, onChange, loadError, locked }: { tools: WorkOrderTool[]; onChange: (tools: WorkOrderTool[]) => void; loadError?: string | null; locked?: boolean }) {
  const [typed, setTyped] = useState('');
  const register = useToolsRegister();
  const options = useMemo(() => toolOptions(register.items), [register.items]);
  const loading = register.loading && !register.loaded;
  const error = register.error;
  const byNumber = useMemo(() => new Map(register.items.map(t => [t.register_number, t])), [register.items]);

  // A name typed out in full that is on the register is kept as that register entry, not as free text.
  const add = (name: string, key?: string) => {
    const typedName = name.trim();
    if (!typedName) return;
    const match = key ? null : findMatch(options, typedName);
    const n = match?.value ?? typedName;
    const number = key ?? match?.key ?? null;
    if (number ? tools.some(t => t.tool_register_number === number) : tools.some(t => !t.tool_register_number && t.tool_name.toLowerCase() === n.toLowerCase())) { setTyped(''); return; }
    onChange([...tools, { tool_register_number: number, tool_name: n, note: null }]);
    setTyped('');
  };

  return (
    // Enter in the input adds the typed tool; the group itself is not interactive.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div role="group" aria-label="Tools" className="flex flex-col gap-2" onKeyDown={e => { if (e.key === 'Enter' && !e.defaultPrevented && (e.target as HTMLElement).tagName === 'INPUT') { e.preventDefault(); add(typed); } }}>
      <span className="font-sans text-label font-medium text-ink">Tools needed <span className="font-normal text-ink-muted">Optional</span></span>
      {loadError && <Notice tone="danger" title="The tools on this work order could not be loaded">{loadError} Saving now would replace them, so the list is locked until it loads.</Notice>}
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <RegisterField
            aria-label="Add a tool" value={typed} onChange={setTyped} options={options} registerName="Tools register" placeholder="Type to search the Tools register"
            loading={loading} loadError={error} disabled={!!loadError || locked} onPick={o => add(o.value, o.key)}
          />
        </div>
        <Button icon="plus" aria-label="Add tool" disabled={!typed.trim() || !!loadError || locked} onClick={() => add(typed)}>Add</Button>
      </div>
      {tools.length > 0 && (
        <ul className="flex flex-col gap-1.5" aria-label="Tools needed">
          {tools.map(t => {
            const live = t.tool_register_number ? byNumber.get(t.tool_register_number) : undefined;
            const warning = live ? toolWarning(live) : undefined;
            const gone = !!t.tool_register_number && register.loaded && !live;
            const key = `${t.tool_register_number ?? ''}|${t.tool_name}`;
            return (
              <li key={key} className="flex items-start gap-2 rounded-control border border-line-subtle bg-surface-subtle px-2.5 py-1.5 font-sans">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-body text-ink">{t.tool_name}{t.tool_register_number && <span className="ml-2 text-caption text-ink-muted">{t.tool_register_number}</span>}</div>
                  {!t.tool_register_number && <div className="text-caption text-ink-muted">Not on the Tools register</div>}
                  {warning && <div className="flex items-start gap-1 text-caption text-warning"><Icon name="warning" size="xs" className="mt-0.5 shrink-0" />{warning}</div>}
                  {gone && <div className="text-caption text-ink-muted">No longer on the Tools register</div>}
                </div>
                <button type="button" aria-label={`Remove ${t.tool_name}`} onClick={() => onChange(tools.filter(x => x !== t))} className="focus-ring inline-flex size-6 shrink-0 items-center justify-center rounded-xs text-ink-muted hover:bg-surface-muted hover:text-ink"><Icon name="close" size="xs" /></button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
