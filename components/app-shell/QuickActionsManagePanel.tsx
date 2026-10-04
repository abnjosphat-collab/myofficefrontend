'use client';

import type { ElementType, ReactNode } from 'react';
import { Checkbox, Dialog, Glyph } from '@/components/ui-system';
import { QUICK_ACTIONS } from './modules';
import { useAppShell } from './context';

function ToggleRow({ icon, label, hint, checked, onChange }: { icon: ElementType; label: string; hint?: string; checked: boolean; onChange: (on: boolean) => void }) {
  return (
    <li className="flex items-center gap-3 rounded-control px-2 py-2 hover:bg-surface-subtle">
      <Glyph as={icon} size="md" className="shrink-0 text-ink-muted" />
      <Checkbox className="min-w-0 flex-1" checked={checked} onChange={e => onChange(e.target.checked)} label={label} description={hint} />
    </li>
  );
}

const Section = ({ title, note, children }: { title: string; note?: string; children: ReactNode }) => (
  <section>
    <h3 className="mb-1 font-display text-title font-semibold text-ink">{title}</h3>
    {note && <p className="mb-2 font-sans text-body-sm text-ink-muted">{note}</p>}
    <ul className="flex flex-col">{children}</ul>
  </section>
);

export function QuickActionsManagePanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useAppShell();
  return (
    <Dialog open={open} onOpenChange={next => { if (!next) onClose(); }} title="Quick actions" description="Choose what appears on your home page. Pin more from any module card with the plus button." size="sm">
      <div className="flex flex-col gap-5">
        <Section title="Built-in shortcuts">
          {QUICK_ACTIONS.map(action => (
            <ToggleRow key={action.id} icon={action.icon} label={action.label} checked={!s.dismissedBuiltinIds.has(action.id)} onChange={on => s.setBuiltinQuickActionVisible(action.id, on)} />
          ))}
        </Section>

        {s.customQuickActions.length > 0 && (
          <Section title="Pinned modules">
            {s.customQuickActions.map(action => (
              <ToggleRow key={action.id} icon={action.icon} label={action.label} checked={s.quickActionHrefs.has(action.href)} onChange={() => s.toggleQuickAction(action.href)} />
            ))}
          </Section>
        )}

        {s.frequentQuickActions.length > 0 && (
          <Section title="Suggested from usage" note="Clear a box to hide a suggestion. It may be suggested again if you keep using that module.">
            {s.frequentQuickActions.map(action => (
              <ToggleRow key={action.id} icon={action.icon} label={action.label} hint="Frequently used" checked={!s.dismissedAutoHrefs.has(action.href)} onChange={on => (on ? s.restoreAutoAction(action.href) : s.dismissAutoAction(action.href))} />
            ))}
          </Section>
        )}

        {s.visibleQuickActions.length === 0 && (
          <p className="font-sans text-body-sm text-ink-muted">No quick actions selected. Turn on a built-in shortcut above, or pin a module from the module list.</p>
        )}
      </div>
    </Dialog>
  );
}
