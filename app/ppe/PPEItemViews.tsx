// app/ppe/PPEItemViews.tsx — what one person holds, and one item in full. Each item says where it stands against its expiry in words and
// offers its actions in a menu: view, edit, mark not required (or active again), add to the order list, delete.
'use client';

import { Button, Dialog, IconButton, Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger, StatusBadge, Fact, FactList } from '@/components/ui-system';
import { fmtDate } from '@/components/shared/utils';
import { normalizeSection } from '@/lib/sections';
import { STANDING_LABEL, standing, type Standing } from './ppeLogic';
import { conditionMeta, statusMeta, typeName } from './ppeMeta';
import type { EmployeeWithPPE, PPERecord } from './types';

export interface ItemActions { onView: (r: PPERecord) => void; onEdit: (r: PPERecord) => void; onDelete: (r: PPERecord) => void; onToggleNotRequired: (r: PPERecord) => void; onOrder?: (r: PPERecord) => void; ordered?: (r: PPERecord) => boolean }
const STANDING_TONE = { overdue: 'danger', soon: 'warning', ok: 'success', none: 'neutral' } as const;

export function StandingBadge({ r }: { r: PPERecord }) {
  const s: Standing = standing(r);
  const st = statusMeta(r.status);
  return s === 'none' || !STANDING_LABEL[s] ? <StatusBadge tone={st.tone}>{st.label}</StatusBadge> : <StatusBadge tone={STANDING_TONE[s]}>{STANDING_LABEL[s]}</StatusBadge>;
}

export function ItemMenu({ r, a }: { r: PPERecord; a: ItemActions }) {
  const due = r.status === 'active' && (standing(r) === 'overdue' || standing(r) === 'soon');
  return (
    <Menu>
      <MenuTrigger asChild><IconButton icon="more-vertical" size="sm" variant="ghost" label={`More actions for ${r.item_name || typeName(r.ppe_type)}, ${r.employee_name}`} /></MenuTrigger>
      <MenuContent>
        <MenuItem icon="eye" onSelect={() => a.onView(r)}>View details</MenuItem>
        <MenuItem icon="edit" onSelect={() => a.onEdit(r)}>Edit</MenuItem>
        <MenuItem icon={r.status === 'not_required' ? 'undo' : 'close'} onSelect={() => a.onToggleNotRequired(r)}>{r.status === 'not_required' ? 'Mark active again' : 'Mark not required'}</MenuItem>
        {due && a.onOrder && <MenuItem icon="cart" disabled={a.ordered?.(r)} onSelect={() => a.onOrder?.(r)}>{a.ordered?.(r) ? 'Already on the order list' : 'Add to the order list'}</MenuItem>}
        <MenuSeparator />
        <MenuItem icon="delete" onSelect={() => a.onDelete(r)}>Delete</MenuItem>
      </MenuContent>
    </Menu>
  );
}

export function EmployeePPEDetail({ employee, onClose, onIssue, actions }: { employee: EmployeeWithPPE | null; onClose: () => void; onIssue: (e: EmployeeWithPPE) => void; actions: ItemActions }) {
  const e = employee;
  const items = e ? [...e.records].sort((a, b) => (a.expiry_date ?? '9999').localeCompare(b.expiry_date ?? '9999')) : [];
  return (
    <Dialog
      open={!!e} onOpenChange={o => { if (!o) onClose(); }} size="lg" title={e?.employee_name ?? 'Employee'} description={e ? [e.employee_id, e.position, e.section ? normalizeSection(e.section) : ''].filter(Boolean).join(', ') : undefined}
      footer={e && (<><Button onClick={onClose}>Close</Button><Button variant="primary" icon="plus" onClick={() => onIssue(e)}>Issue PPE</Button></>)}
    >
      {e && (
        <ul className="flex flex-col gap-2" aria-label={`PPE held by ${e.employee_name}`}>
          {items.map(r => (
            <li key={r.id} className="flex items-center gap-3 rounded-control border border-line bg-surface-subtle px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="font-sans text-label font-medium text-ink [overflow-wrap:anywhere]">{typeName(r.ppe_type)}{r.size && <span className="font-normal text-ink-muted">, size {r.size}</span>}</p>
                <p className="font-sans text-caption text-ink-muted tabular">{r.item_name}{r.item_name && ', '}issued {fmtDate(r.issue_date)}{r.expiry_date ? `, expires ${fmtDate(r.expiry_date)}` : ', no expiry'}</p>
              </div>
              <StandingBadge r={r} />
              <ItemMenu r={r} a={actions} />
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}

export function PPEItemDetail({ item: r, onClose, onEdit }: { item: PPERecord | null; onClose: () => void; onEdit: (r: PPERecord) => void }) {
  const cond = r ? conditionMeta(r.condition) : null;
  return (
    <Dialog open={!!r} onOpenChange={o => { if (!o) onClose(); }} size="md" title={r ? typeName(r.ppe_type) : 'PPE item'} description={r ? `${r.employee_name}, ${r.employee_id}` : undefined}
      footer={r && (<><Button onClick={onClose}>Close</Button><Button icon="edit" onClick={() => onEdit(r)}>Edit</Button></>)}>
      {r && cond && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2"><StandingBadge r={r} /><StatusBadge tone={cond.tone}>{cond.label}</StatusBadge></div>
          <FactList>
            <Fact label="Item or brand">{r.item_name}</Fact><Fact label="Size">{r.size}</Fact>
            <Fact label="Issued">{fmtDate(r.issue_date)}</Fact><Fact label="Expires">{r.expiry_date ? fmtDate(r.expiry_date) : 'Does not expire'}</Fact>
            <Fact label="Position">{r.position}</Fact><Fact label="Section">{r.mine_section}</Fact>
            <Fact label="Issued by">{r.issued_by}</Fact><Fact label="Location">{r.location}</Fact>
            {r.notes && <div className="sm:col-span-2"><Fact label="Notes">{r.notes}</Fact></div>}
          </FactList>
        </div>
      )}
    </Dialog>
  );
}
