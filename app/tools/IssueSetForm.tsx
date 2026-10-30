// app/tools/IssueSetForm.tsx — Issue a set: pick a set type and the people. Each person gets their
// own numbered set (a free one from store, or a new one made for them). Tick people, mark any
// piece exceptions per person (everything else issues as Good), and the button counts the sets.
'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, Checkbox, Field, FieldGroup, Input, Notice, SearchField, Segmented, Select, Textarea } from '@/components/ui-system';
import type { Employee, Tool } from './prototype';
import type { IssueSetsResponse, ServerSetType, ServerSetTypeLine } from './useToolsWorkspace';
import { PIECE_CONDITIONS } from './setTypes';

export type IssueSetsInput = {
  employee_ids: string[]; location: string; job_reference?: string; expected_return_at?: string;
  assigned_equipment?: string[]; notes?: string;
  conditions?: Record<string, Record<string, string>>;
  override_due_checks?: boolean; override_reason?: string;
};

export function IssueSetForm({ setTypes, employees, tools, setTypeLines, initialSetTypeId, initialEmployee, locationSuggestions, onIssue, onViewSet, onCancel }: {
  setTypes: ServerSetType[];
  employees: Employee[];
  tools: Tool[];
  setTypeLines: (typeId: string) => Promise<ServerSetTypeLine[]>;
  initialSetTypeId?: string;
  initialEmployee?: Employee;
  locationSuggestions: string[];
  onIssue: (typeId: string, input: IssueSetsInput) => Promise<IssueSetsResponse | null>;
  onViewSet?: (backendId: string) => void;
  onCancel: () => void;
}) {
  const activeTypes = setTypes.filter(type => type.active);
  const [typeId, setTypeId] = useState(initialSetTypeId ?? activeTypes[0]?.id ?? '');
  const [ticked, setTicked] = useState<string[]>(initialEmployee ? [initialEmployee.id] : []);
  const [personQuery, setPersonQuery] = useState('');
  const [lines, setLines] = useState<ServerSetTypeLine[]>([]);
  const [linesFor, setLinesFor] = useState('');
  const [exceptionsOpen, setExceptionsOpen] = useState<string | null>(null);
  const [conditions, setConditions] = useState<Record<string, Record<string, string>>>({});
  const [location, setLocation] = useState('');
  const [job, setJob] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [issuing, setIssuing] = useState(false);
  const [response, setResponse] = useState<IssueSetsResponse | null>(null);

  const type = activeTypes.find(item => item.id === typeId);
  const activeEmployees = useMemo(() => employees.filter(person => person.active), [employees]);
  const visibleEmployees = activeEmployees.filter(person => `${person.name} ${person.employeeNumber ?? ''} ${person.jobTitle ?? ''}`.toLowerCase().includes(personQuery.trim().toLowerCase()));
  const holders = useMemo(() => {
    const names = new Map<string, string>();
    for (const tool of tools) {
      if (tool.setTypeId === typeId && tool.holder) names.set(tool.holder.split(' · ')[0], tool.id);
    }
    return names;
  }, [tools, typeId]);
  const tickedNames = ticked.map(id => employees.find(person => person.id === id)?.name ?? id);
  const alreadyHolding = tickedNames.filter(name => holders.has(name));

  useEffect(() => {
    if (!typeId || typeId === linesFor) return;
    let live = true;
    void setTypeLines(typeId).then(fetched => { if (live) { setLines(fetched); setLinesFor(typeId); } });
    return () => { live = false; };
  }, [typeId, linesFor, setTypeLines]);
  const ensureLines = (next: string) => { setTypeId(next); setExceptionsOpen(null); };

  const setCondition = (employeeId: string, lineNo: number, condition: string) =>
    setConditions(current => ({ ...current, [employeeId]: { ...(current[employeeId] ?? {}), [String(lineNo)]: condition } }));

  const issue = async () => {
    if (!typeId) { setError('Choose a set type first.'); return; }
    if (!ticked.length) { setError('Tick at least one person.'); return; }
    if (!location.trim()) { setError('Say where the sets are going.'); return; }
    setError(null); setIssuing(true);
    try {
      const nonDefault: Record<string, Record<string, string>> = {};
      for (const [employeeId, byLine] of Object.entries(conditions)) {
        const marked = Object.fromEntries(Object.entries(byLine).filter(([, condition]) => condition !== 'Good'));
        if (Object.keys(marked).length) nonDefault[employeeId] = marked;
      }
      const result = await onIssue(typeId, {
        employee_ids: ticked, location: location.trim(), job_reference: job.trim() || undefined, notes: notes.trim() || undefined,
        conditions: Object.keys(nonDefault).length ? nonDefault : undefined,
      });
      if (result) setResponse(result);
    } finally { setIssuing(false); }
  };

  if (response) {
    return (
      <div className="flex flex-col gap-3">
        <Notice tone={response.failed ? 'warning' : 'info'} title={response.failed ? `${response.issued} issued, ${response.failed} not issued` : 'Sets issued'}>
          {response.failed ? 'Fix the people below and issue again for them only.' : 'Every person has their own numbered set.'}
        </Notice>
        <ul className="flex flex-col gap-2">
          {response.results.map(row => (
            <li key={row.employee_id} className="flex items-center justify-between gap-2 rounded-control border border-line-subtle px-3 py-2">
              {row.ok ? (
                <span className="font-sans text-body-sm text-ink">{row.register_number} issued to {row.employee_name} ({row.piece_count} pieces)</span>
              ) : (
                <span className="font-sans text-body-sm text-ink">Not issued to {row.employee_name ?? row.employee_id}: {row.reason}</span>
              )}
              {row.ok && row.set_id && onViewSet && (
                <Button variant="secondary" onClick={() => onViewSet(row.set_id!)}>View</Button>
              )}
            </li>
          ))}
        </ul>
        <div className="flex justify-end"><Button variant="secondary" onClick={onCancel}>Done</Button></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Field label="Set type">
        <Select aria-label="Set type" value={typeId} onValueChange={value => { void ensureLines(value); }}
          options={activeTypes.map(item => ({ value: item.id, label: `${item.title} (${item.in_store} in store${item.out ? `, ${item.out} out` : ''})` }))} />
      </Field>
      {type?.competency_required && (
        <Notice tone="info" title="Approval required">Only people approved for {type.title} can receive a set.</Notice>
      )}
      <section aria-label="People" className="flex flex-col gap-2">
        <SearchField label="Find people" placeholder="Find people" value={personQuery} onValueChange={setPersonQuery} />
        <ul role="group" aria-label="Tick the people" className="max-h-56 overflow-y-auto rounded-control border border-line-subtle">
          {visibleEmployees.map(person => (
            <li key={person.id}>
              <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-surface-subtle">
                <Checkbox aria-label={`Issue to ${person.name}`} checked={ticked.includes(person.id)} onChange={event => setTicked(current => (event.target.checked ? [...current, person.id] : current.filter(id => id !== person.id)))} />
                <span className="min-w-0 flex-1">
                  <strong className="block truncate font-sans text-body-sm font-medium text-ink">{person.name}</strong>
                  <small className="block truncate font-sans text-caption text-ink-muted">{[person.employeeNumber, person.jobTitle, holders.has(person.name) ? `holds ${type?.title ?? 'a set'}` : ''].filter(Boolean).join(' · ')}</small>
                </span>
              </label>
            </li>
          ))}
          {!visibleEmployees.length && <li className="px-3 py-3 font-sans text-body-sm text-ink-muted">Nobody matches that search.</li>}
        </ul>
        {ticked.length > 0 && <p className="font-sans text-caption text-ink-muted">{ticked.length} {ticked.length === 1 ? 'person' : 'people'} ticked.</p>}
        {alreadyHolding.length > 0 && (
          <Notice tone="warning" title="Already holding">{alreadyHolding.join(', ')} already {alreadyHolding.length === 1 ? 'holds' : 'hold'} a set of this type. Issuing again gives them a second set.</Notice>
        )}
      </section>
      {ticked.length > 0 && (
        <section aria-label="Piece exceptions" className="flex flex-col gap-2">
          <h3 className="font-sans text-label font-medium text-ink">Piece exceptions (everything else issues as Good)</h3>
          {ticked.map(id => {
            const person = employees.find(item => item.id === id);
            if (!person) return null;
            const open = exceptionsOpen === id;
            return (
              <div key={id} className="rounded-control border border-line-subtle px-3 py-2">
                <button type="button" aria-expanded={open} aria-label={`Mark exceptions for ${person.name}`} onClick={() => setExceptionsOpen(open ? null : id)}
                  className="focus-ring flex w-full items-center justify-between gap-2 rounded-control py-1 text-left font-sans text-body-sm font-medium text-ink">
                  {person.name}
                  <span className="font-sans text-caption font-normal text-ink-muted">{open ? 'Hide' : 'Mark exceptions'}</span>
                </button>
                {open && (
                  <ul className="flex flex-col gap-2 py-2">
                    {lines.map(line => (
                      <li key={line.id} className="flex items-center justify-between gap-2">
                        <span className="min-w-0 flex-1 truncate font-sans text-body-sm text-ink">{line.line_no}. {line.name}{line.size ? ` · ${line.size}` : ''}{line.qty > 1 ? ` × ${line.qty}` : ''}</span>
                        <Segmented label={`${line.name} condition for ${person.name}`} value={conditions[id]?.[String(line.line_no)] ?? 'Good'}
                          onValueChange={value => setCondition(id, line.line_no, value)}
                          options={PIECE_CONDITIONS.map(value => ({ value, label: value }))} />
                      </li>
                    ))}
                    {!lines.length && <li className="font-sans text-body-sm text-ink-muted">Lines are loading…</li>}
                  </ul>
                )}
              </div>
            );
          })}
        </section>
      )}
      <FieldGroup label="Issue details">
        <Field label="Location"><Input aria-label="Location" value={location} onChange={event => setLocation(event.target.value)} placeholder="Pit" list="tools-location-suggestions" /></Field>
        <Field label="Job reference"><Input aria-label="Job reference" value={job} onChange={event => setJob(event.target.value)} /></Field>
        <Field label="Notes"><Textarea aria-label="Notes" value={notes} rows={2} onChange={event => setNotes(event.target.value)} /></Field>
      </FieldGroup>
      <datalist id="tools-location-suggestions">{locationSuggestions.map(value => <option key={value} value={value} />)}</datalist>
      {error && <Notice tone="danger" title="Cannot issue">{error}</Notice>}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" icon="success" pending={issuing} disabled={!ticked.length} onClick={() => { void issue(); }}>
          {issuing ? 'Issuing…' : `Issue ${ticked.length === 1 ? '1 set' : `${ticked.length} sets`}`}
        </Button>
      </div>
    </div>
  );
}

