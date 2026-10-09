// app/timesheets/AddEmployeesDialog.tsx — add people the automatic roster missed (for example, no employment type set yet) to this tab.
// They are kept as an exception in this browser, and a person removed earlier is shown again when re-added.
'use client';

import { useMemo, useState } from 'react';
import { Button, Checkbox, Dialog, EmptyState, LoadingPulse, SearchField } from '@/components/ui-system';
import type { Employee } from './types';

export function AddEmployeesDialog({ allEmployees, currentIds, loading, onAdd, onClose }: { allEmployees: Employee[]; currentIds: string[]; loading: boolean; onAdd: (emps: Employee[]) => void; onClose: () => void }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const available = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allEmployees.filter(e => !currentIds.includes(e.id) && (!q || e.name.toLowerCase().includes(q) || e.department.toLowerCase().includes(q) || e.position.toLowerCase().includes(q)));
  }, [allEmployees, currentIds, search]);
  const toggle = (id: string) => setSelected(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const all = selected.size === available.length && available.length > 0;
  return (
    <Dialog
      open onOpenChange={o => { if (!o) onClose(); }} size="md" title="Add employees" description="Choose people to add to this timesheet roster."
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={selected.size === 0} onClick={() => { onAdd(allEmployees.filter(e => selected.has(e.id))); onClose(); }}>{selected.size > 0 ? `Add ${selected.size} ${selected.size === 1 ? 'employee' : 'employees'}` : 'Add'}</Button></>}
    >
      <div className="flex flex-col gap-3">
        <SearchField value={search} onValueChange={setSearch} placeholder="Search name, position or department" />
        <div className="flex items-center justify-between font-sans text-caption text-ink-muted"><span role="status">{available.length} available, {selected.size} selected</span><Button size="sm" variant="ghost" disabled={available.length === 0} onClick={() => setSelected(all ? new Set() : new Set(available.map(e => e.id)))}>{all ? 'Deselect all' : 'Select all'}</Button></div>
        {loading && available.length === 0
          ? <LoadingPulse compact label="Loading people" />
          : available.length === 0
          ? <EmptyState icon="employees" title="No one available" description={search ? 'Try a different search.' : 'Everyone is already on this roster.'} />
          : (
            <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto" aria-label="Employees to add">
              {available.map(e => (
                <li key={e.id} className="rounded-control px-2 py-1.5 hover:bg-surface-subtle">
                  <Checkbox label={e.name} description={[e.position, e.department].filter(Boolean).join(', ')} checked={selected.has(e.id)} onChange={() => toggle(e.id)} />
                </li>
              ))}
            </ul>
          )}
      </div>
    </Dialog>
  );
}
