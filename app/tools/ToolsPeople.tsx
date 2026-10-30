// app/tools/ToolsPeople.tsx — the employee register: who may receive which tools, by person or by equipment, with the
// approvals (trained, qualified, authorised) behind each, bulk deactivation, and a detailed approvals panel per person.
'use client';

import { useMemo, useState } from 'react';
import { Button, Checkbox, EmptyState, Field, Icon, Input, Notice, SearchField, Tabs, TabsContent, TabsList, TabsTrigger, ZoomLink, useConfirm } from '@/components/ui-system';
import type { CompetencyRecord } from './complianceTypes';
import { ToolsDialog } from './ToolsUI';
import { EligibilityByEquipment, EligibilityByPerson } from './ToolsEligibility';
import type { Employee, Tool } from './prototype';
import { buildEligibility, competencyForEmployeeTool, eligibilityKey, isCurrentCompetency, latestAuthoriser, type EligibilityBasis } from './toolEligibility';

type SaveCompetency = (value: {
  employee_id: string;
  tool_id: string;
  trained: boolean;
  qualified: boolean;
  authorized: boolean;
  authorized_by?: string;
}) => Promise<void>;

function EmployeeToolEligibilityRow({ employee, tool, record, basis, canManage, onSave }: {
  employee: Employee;
  tool: Tool;
  record?: CompetencyRecord;
  basis?: EligibilityBasis;
  canManage: boolean;
  onSave: SaveCompetency;
}) {
  const [trained, setTrained] = useState(record?.trained || false);
  const [qualified, setQualified] = useState(record?.qualified || false);
  const [authorized, setAuthorized] = useState(record?.authorized || false);
  const [saving, setSaving] = useState(false);
  const eligible = isCurrentCompetency(record) || basis !== undefined;
  const basisNote = basis?.kind === 'section' ? ` · by section (${basis.section})` : basis?.kind === 'open' ? ' · anyone may use it' : '';
  const changed = trained !== !!record?.trained || qualified !== !!record?.qualified || authorized !== !!record?.authorized;
  const inherited = !!record?.category && !record.tool_id;

  async function save() {
    if (!employee.backendId || !tool.backendId) return;
    setSaving(true);
    try {
      await onSave({ employee_id: employee.backendId, tool_id: tool.backendId, trained, qualified, authorized });
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="flex flex-col gap-3 rounded-card border border-line-subtle p-3 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="text-ink-muted"><Icon name="equipment" size="md" /></span>
        <span className="min-w-0"><strong className="block truncate font-sans text-body-sm font-medium text-ink">{tool.id} · {tool.name}</strong><small className="block font-sans text-caption text-ink-muted">{tool.category}{inherited ? ' · inherited category approval' : ''}</small></span>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1" role="group" aria-label={`${tool.name} competency requirements`}>
        <Checkbox aria-label="Trained" label="Trained" checked={trained} disabled={!canManage} onChange={event => setTrained(event.target.checked)} />
        <Checkbox aria-label="Qualified" label="Qualified" checked={qualified} disabled={!canManage} onChange={event => setQualified(event.target.checked)} />
        <Checkbox aria-label="Authorized" label="Authorized" checked={authorized} disabled={!canManage} onChange={event => setAuthorized(event.target.checked)} />
      </div>
      <div className="flex items-center gap-3">
        <span className={`font-sans text-caption font-medium ${eligible ? 'text-success' : 'text-ink-muted'}`}>{eligible ? `Eligible to receive${basisNote}` : 'Not eligible'}</span>
        {canManage && <Button type="button" disabled={!changed || saving} onClick={() => void save()}>{saving ? 'Saving…' : 'Save'}</Button>}
      </div>
    </article>
  );
}

export function ToolsPeople({ employees, tools, competencies, approvals, search, canManage, onAdd, onIssue, onEditNumber, onEditSection, onSaveCompetency, onSetActive, onDeactivateMany, allowDeactivate = true }: {
  employees: Employee[];
  tools: Tool[];
  competencies: CompetencyRecord[];
  /** Whether the approvals have loaded: until they have, nobody's eligibility is known, which is not the same as having none. */
  approvals: { state: 'ready' | 'loading' | 'failed'; message?: string; onRetry: () => void };
  search: string;
  canManage: boolean;
  onAdd: () => void;
  onIssue: (employee: Employee) => void;
  onEditNumber?: (employee: Employee) => void;
  onEditSection?: (employee: Employee) => void;
  onSaveCompetency: SaveCompetency;
  /** Deactivate or reactivate a person: nothing is deleted, they simply stop being offered. */
  onSetActive: (employee: Employee, active: boolean) => Promise<void>;
  /** Deactivate several people at once (the same rule as one: nobody holding equipment). */
  onDeactivateMany?: (employees: Employee[]) => Promise<void>;
  /** False hides the Deactivate buttons (one at a time and in bulk); Reactivate is always available. */
  allowDeactivate?: boolean;
}) {
  const confirm = useConfirm();
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Employee | null>(null);
  const [toolSearch, setToolSearch] = useState('');
  const [view, setView] = useState<'person' | 'equipment'>('person');
  const [showInactive, setShowInactive] = useState(false);
  const [authoriserEdit, setAuthoriserEdit] = useState<string | null>(() => { try { return typeof window === 'undefined' ? null : window.localStorage.getItem('tools-authoriser'); } catch { return null; } });
  const authoriser = authoriserEdit ?? latestAuthoriser(competencies);
  const setAuthoriser = (value: string) => { setAuthoriserEdit(value); try { window.localStorage.setItem('tools-authoriser', value); } catch { /* storage unavailable */ } };
  const eligibility = useMemo(() => buildEligibility(employees, tools), [employees, tools]);
  const query = search.trim().toLowerCase();
  const inactiveCount = employees.filter(employee => !employee.active).length;
  const visible = employees.filter(employee => (showInactive || employee.active) && `${employee.name} ${employee.employeeNumber ?? ''} ${employee.department} ${employee.jobTitle || ''} ${employee.supervisorName || ''} ${employee.section || ''}`.toLowerCase().includes(query));
  const blockedReason = (employee: Employee) => !employee.active ? 'Already inactive.' : tools.some(tool => tool.holder === employee.name || tool.holder?.startsWith(`${employee.name} ·`)) ? 'Receive their equipment before deactivating them.' : undefined;
  const pickable = visible.filter(employee => !blockedReason(employee));
  const chosen = pickable.filter(employee => picked.includes(employee.id));
  const canSelect = canManage && allowDeactivate && !!onDeactivateMany && view === 'person' && pickable.length > 0;
  const stopSelecting = () => { setSelecting(false); setPicked([]); };
  const deactivateChosen = async () => {
    const ok = await confirm({ title: `Deactivate ${chosen.length} ${chosen.length === 1 ? 'person' : 'people'}?`, message: 'Nothing is deleted and they can be reactivated.', confirmLabel: 'Yes, deactivate', destructive: true });
    if (!ok) return;
    setBusy(true);
    try { await onDeactivateMany?.(chosen); stopSelecting(); } finally { setBusy(false); }
  };
  const bulkBar = canSelect && (selecting
    ? (
      <div role="toolbar" aria-label="Deactivate several people" className="flex flex-wrap items-center gap-2">
        <strong role="status" className="font-sans text-body-sm font-medium text-ink">{chosen.length ? `${chosen.length} selected` : 'Tick the people to deactivate'}</strong>
        <Button type="button" variant="ghost" size="sm" onClick={() => setPicked(chosen.length === pickable.length ? [] : pickable.map(employee => employee.id))}>{chosen.length === pickable.length ? 'Clear selection' : `Select all ${pickable.length}`}</Button>
        <span className="ml-auto flex gap-2">
          <Button type="button" onClick={stopSelecting}>Cancel</Button>
          <Button type="button" variant="primary" disabled={!chosen.length} pending={busy} onClick={() => void deactivateChosen()}>{`Deactivate${chosen.length ? ` ${chosen.length}` : ''}`}</Button>
        </span>
      </div>
    )
    : <div className="flex"><Button type="button" icon="user" onClick={() => setSelecting(true)}>Select to deactivate</Button></div>);
  const held = selected ? tools.filter(tool => tool.holder === selected.name || tool.holder?.startsWith(`${selected.name} ·`)) : [];
  const employeeTools = useMemo(() => selected ? tools
    .filter(tool => !tool.archived && tool.backendId && (!tool.department || tool.department === selected.department))
    .filter(tool => `${tool.id} ${tool.name} ${tool.category}`.toLowerCase().includes(toolSearch.trim().toLowerCase())) : [], [selected, toolSearch, tools]);
  const selectedBackendId = selected?.backendId;
  const eligibleTools = selectedBackendId ? tools.filter(tool => tool.backendId !== undefined && eligibility.basis.has(eligibilityKey(tool.backendId, selectedBackendId))) : [];
  // The open card re-reads the person from the fresh register, so a number saved while it is open shows at once.
  const shown = selected?.backendId ? employees.find(employee => employee.backendId === selected.backendId) ?? selected : selected;

  if (!employees.length) {
    return <EmptyState icon="user" title="Build your employee register" description="Add the people who may receive tools. This register is separate from MyOffice." action={<ZoomLink zoomId="tools:new-employee" className="inline-block"><Button variant="primary" icon="plus" onClick={onAdd}>Add the first employee</Button></ZoomLink>} />;
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        {inactiveCount > 0 && <Button type="button" variant="ghost" size="sm" aria-pressed={showInactive} onClick={() => setShowInactive(value => !value)}>{showInactive ? 'Hide inactive people' : `Show ${inactiveCount} inactive ${inactiveCount === 1 ? 'person' : 'people'}`}</Button>}
        {canManage && <Field label="Authorised by" className="ml-auto w-full sm:w-72"><Input aria-label="Authorised by" value={authoriser} onChange={event => setAuthoriser(event.target.value)} placeholder="Name of the authorising officer" /></Field>}
      </div>
      {approvals.state !== 'ready' && (
        <Notice tone="warning" title={approvals.state === 'loading' ? 'Loading approvals…' : 'The approvals could not be loaded'}
          action={approvals.state === 'failed' ? <Button type="button" onClick={approvals.onRetry}>Try again</Button> : undefined}>
          {approvals.state === 'loading' ? 'Who is eligible for what will appear in a moment.' : `${approvals.message || 'The server did not answer.'} Eligibility is not shown until they load, so nobody is listed as having none.`}
        </Notice>
      )}
      <Tabs value={view} onValueChange={v => setView(v as typeof view)}>
        <TabsList aria-label="Show eligibility" guideId="tools-people" guideText="Switch between the per-person and per-tool views here">
          <TabsTrigger value="person">By person</TabsTrigger>
          <TabsTrigger value="equipment">By tool</TabsTrigger>
        </TabsList>
        <TabsContent value="person">
          {bulkBar}
          {visible.length
          ? <EligibilityByPerson selection={canSelect && selecting ? { picked, blocked: blockedReason, onToggle: (employee, on) => setPicked(current => on ? [...current, employee.id] : current.filter(id => id !== employee.id)) } : undefined}
              employees={visible} tools={tools} eligibility={eligibility} competencies={competencies} ready={approvals.state === 'ready'} canManage={canManage && approvals.state === 'ready'} authoriser={authoriser.trim()}
              onGrant={onSaveCompetency} onOpenApprovals={employee => { setSelected(employee); setToolSearch(''); }} onIssue={onIssue} onSetActive={onSetActive} allowDeactivate={allowDeactivate} />
          : <EmptyState icon="search" title="No matching employees" description="Try a name, employee number, supervisor or department." />}
        </TabsContent>
        <TabsContent value="equipment">
          <EligibilityByEquipment employees={employees} tools={tools} eligibility={eligibility} competencies={competencies} ready={approvals.state === 'ready'} search={search} canManage={canManage && approvals.state === 'ready'} authoriser={authoriser.trim()} onGrant={onSaveCompetency} />
        </TabsContent>
      </Tabs>
      <ToolsDialog open={!!selected} onClose={() => setSelected(null)} title={shown?.name || 'Employee details'} description={shown ? `${shown.employeeNumber ?? 'Not recorded'} · ${shown.department}` : ''} wide>
        {shown && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="grid size-11 place-items-center rounded-full bg-action-soft text-ink"><Icon name="user" size="md" /></span>
              <div className="min-w-0 flex-1">
                <strong className="block font-sans text-body-sm font-semibold text-ink">{shown.jobTitle || 'Job title not recorded'}</strong>
                <p className="font-sans text-caption text-ink-muted">{shown.active ? 'Active employee' : 'Inactive employee'} · {shown.department}</p>
                {shown.supervisorName && <p className="font-sans text-caption text-ink-muted">Supervisor: {shown.supervisorName}</p>}
                <p className="flex items-center gap-2 font-sans text-caption text-ink-muted">Mine number: {shown.employeeNumber ?? 'Not recorded'}
                  {canManage && onEditNumber && <Button type="button" variant="ghost" size="sm" onClick={() => onEditNumber(shown)}>{shown.employeeNumber ? 'Edit number' : 'Add number'}</Button>}
                </p>
                <p className="flex items-center gap-2 font-sans text-caption text-ink-muted">Trade section: {shown.section ?? 'Not recorded'}
                  {canManage && onEditSection && <Button type="button" variant="ghost" size="sm" onClick={() => onEditSection(shown)}>{shown.section ? 'Edit section' : 'Add section'}</Button>}
                </p>
              </div>
              <span className="text-right"><strong className="block font-display text-title text-ink">{eligibleTools.length}</strong><small className="font-sans text-caption text-ink-muted">eligible {eligibleTools.length === 1 ? 'item' : 'items'}</small></span>
            </div>
            <section className="flex flex-col gap-2 border-t border-line-subtle pt-4">
              <div className="flex items-baseline justify-between gap-2"><h3 className="font-sans text-caption font-medium text-ink-muted">Currently assigned</h3><span className="font-sans text-caption text-ink-muted">{held.length} {held.length === 1 ? 'item' : 'items'}</span></div>
              {held.length
                ? <ul className="flex flex-col divide-y divide-line-subtle">{held.map(tool => <li key={tool.id} className="flex items-center gap-3 py-2"><Icon name="equipment" size="sm" /><span><strong className="block font-sans text-body-sm font-medium text-ink">{tool.name}</strong><small className="font-sans text-caption text-ink-muted">{tool.id} · {tool.location}</small></span></li>)}</ul>
                : <p className="font-sans text-body-sm text-ink-muted">No tools are currently assigned to this person.</p>}
            </section>
            <section className="flex flex-col gap-3 border-t border-line-subtle pt-4">
              <div className="flex items-baseline justify-between gap-2">
                <div><h3 className="font-sans text-body-sm font-semibold text-ink">Tool eligibility</h3><p className="font-sans text-caption text-ink-muted">Individual approval needs all three requirements current; people in a matching trade section are eligible without it.</p></div>
                <span className="shrink-0 font-sans text-caption text-ink-muted">{eligibleTools.length} eligible</span>
              </div>
              <SearchField label="Find tools" placeholder="Find tools by name, ID or category…" value={toolSearch} onValueChange={setToolSearch} />
              <div className="flex flex-col gap-2">
                {employeeTools.map(tool => { const record = competencyForEmployeeTool(shown, tool, competencies); return <EmployeeToolEligibilityRow key={`${shown.id}-${tool.id}-${record?.updated_at || 'new'}`} employee={shown} tool={tool} record={record} basis={tool.backendId && shown.backendId ? eligibility.basis.get(eligibilityKey(tool.backendId, shown.backendId)) : undefined} canManage={canManage} onSave={onSaveCompetency} />; })}
                {!employeeTools.length && <p className="font-sans text-body-sm text-ink-muted">No tools in {shown.department} matches this search.</p>}
              </div>
              {!canManage && <p className="font-sans text-caption text-ink-muted">Only an administrator or issuer can update competency approvals.</p>}
            </section>
            <div className="flex justify-end gap-2 border-t border-line-subtle pt-4">
              <Button onClick={() => setSelected(null)}>Close</Button>
              <Button variant="primary" disabled={!shown.active || !eligibleTools.length} title={!shown.active ? 'This employee is inactive.' : !eligibleTools.length ? 'Approve at least one tool first.' : undefined}
                onClick={() => { const employee = shown; setSelected(null); onIssue(employee); }}>Issue a tool</Button>
            </div>
          </div>
        )}
      </ToolsDialog>
    </div>
  );
}
