// app/tools/ToolDrawer.tsx — one tool up close, in a side panel: its status, the movement it can take next (issue, receive,
// transfer, extend, mark ready), who may take it, its full record, recent activity and condition evidence.
'use client';

import { useState } from 'react';
import { Button, Dialog, Fact, FactList, Field, FieldGroup, Notice, Segmented, StatusBadge, Textarea } from '@/components/ui-system';
import { EligibleEmployeesList } from './ToolsEligibility';
import { RecordCheckDialog } from './ToolsResolve';
import { EvidenceGallery } from './ToolsUI';
import { departmentOf } from './prototype';
import { nobodyCanUse } from './toolConditions';
import { statusAccent, statusLabel, statusTone, whereIs } from './toolLook';
import type { ToolsWorkspace } from './useToolsWorkspace';

function PreUseForm({ w, toolId }: { w: ToolsWorkspace; toolId: string }) {
  const [outcome, setOutcome] = useState<'passed' | 'conditional' | 'failed'>('passed');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  return (
    <form className="flex flex-col gap-3" onSubmit={event => { event.preventDefault(); setSaving(true); void w.recordInspection(toolId, { inspection_type: 'pre_use', outcome, notes: notes.trim() || undefined }).finally(() => setSaving(false)); }}>
      <FieldGroup label="Pre-use result">
        <Segmented label="Pre-use result" value={outcome} onValueChange={setOutcome} options={[{ value: 'passed', label: 'Passed' }, { value: 'conditional', label: 'Passed with notes' }, { value: 'failed', label: 'Failed' }]} />
      </FieldGroup>
      <Field label="Check notes" optional>
        <Textarea aria-label="Check notes" rows={2} value={notes} onChange={event => setNotes(event.target.value)} placeholder="Anything the next person should know." />
      </Field>
      <div><Button type="submit" variant="primary" size="sm" pending={saving}>Record pre-use check</Button></div>
    </form>
  );
}

export function ToolDrawer({ w }: { w: ToolsWorkspace }) {
  const { selected: tool, selectedFacts, activity, employees, currentAccount, options } = w;
  const manage = !!currentAccount && ['admin', 'issuer'].includes(currentAccount.role);
  const history = tool ? activity.filter(a => a.toolId === tool.id) : [];
  const accent = tool ? statusAccent(tool.status) : 'var(--mo-neutral)';
  const movable = tool && !tool.archived;
  const out = tool && (tool.status === 'issued' || tool.status === 'overdue');
  const close = () => w.setSelectedId(null);
  const canIssueTo = tool?.status === 'available' && !tool.archived && currentAccount?.role === 'issuer';
  const [recordingCheck, setRecordingCheck] = useState(false);
  return (
    <>
    <Dialog
      open={!!tool}
      onOpenChange={o => { if (!o) close(); }}
      placement="right"
      zoomId={tool ? `tools:rec:${tool.id}` : undefined}
      title={tool?.name.trim() ?? 'Tool'}
      description={tool ? `${tool.id} · ${tool.make || 'No make recorded'} · ${whereIs(tool)}` : undefined}
      footer={tool && (
        <>
          <Button onClick={close}>Close</Button>
          {(options.showRemoval || tool.archived) && (
            <Button variant="ghost" icon={tool.archived ? 'reset' : 'archive'} disabled={!!tool.holder} title={tool.holder ? 'Receive this tool before archiving it.' : 'History is retained and the item can be restored.'} onClick={() => void w.archiveTool(tool)}>
              {tool.archived ? 'Restore tool' : 'Archive'}
            </Button>
          )}
          <Button icon="edit" onClick={() => w.openManageModal({ kind: 'edit', tool })}>Edit details</Button>
        </>
      )}
    >
      {tool && (
        <div className="flex flex-col gap-6" style={{ ['--accent' as string]: accent }}>
          <section aria-label="Status" className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <StatusBadge tone={tool.archived ? 'neutral' : statusTone(tool.status)}>{tool.archived ? 'Archived' : statusLabel(tool.status)}</StatusBadge>
              <span className="font-sans text-caption text-ink-muted">{tool.category} · {departmentOf(tool)}{tool.section ? ` / ${tool.section}` : ''}</span>
            </div>
            {tool.status === 'overdue' && <Notice tone="danger" title="Return overdue">Receive this tool or record an approved extension.</Notice>}
            {tool.status === 'attention' && <Notice tone="warning" title="Held for attention">{tool.notes || 'Check the condition and supporting records before making this tool available.'}</Notice>}
            {!!tool.inspectionDue?.length && <Notice tone="warning" title="Scheduled checks overdue" action={manage && tool.backendId ? <Button size="sm" onClick={() => setRecordingCheck(true)}>Record check</Button> : undefined}>{tool.inspectionDue.map(item => item.replaceAll('_', ' ')).join(', ')}. Issue and transfer are blocked.</Notice>}
            {out && tool.preUsePending && <Notice tone="warning" title="Pre-use check still due">The borrower has not recorded the pre-use check for this loan yet.</Notice>}
          </section>

          {movable && (
            <section aria-label="Record a movement" className="flex flex-col gap-2 border-t border-line-subtle pt-5">
              <h3 className="font-sans text-caption font-medium text-ink-muted">Record a movement</h3>
              <div className="flex flex-wrap gap-2">
                {tool.status === 'available' && (
                  <Button variant="primary" disabled={nobodyCanUse(tool)}
                    title={tool.inspectionDue?.length ? 'A check is overdue: you can still issue it by recording a reason.' : nobodyCanUse(tool) ? 'Nobody can use it yet.' : undefined}
                    onClick={() => w.openAction('issue', tool)}>Issue tool</Button>
                )}
                {tool.status === 'attention' && <Button variant="primary" icon="success" onClick={() => w.openManageModal({ kind: 'ready', tool })}>Mark ready for use</Button>}
                {out && (
                  <>
                    <Button variant="primary" icon="back" onClick={() => w.openAction('return', tool)}>Receive return</Button>
                    <Button onClick={() => w.openAction('transfer', tool)}>Transfer</Button>
                    <Button onClick={() => w.openAction('extend', tool)}>Extend</Button>
                  </>
                )}
              </div>
            </section>
          )}

          {out && tool.preUsePending && tool.backendId && manage && (
            <section aria-label="Pre-use check" className="flex flex-col gap-3 border-t border-line-subtle pt-5">
              <h3 className="font-sans text-caption font-medium text-ink-muted">Pre-use check — done after issuing</h3>
              <PreUseForm key={tool.id} w={w} toolId={tool.backendId} />
            </section>
          )}

          <EligibleEmployeesList people={tool.eligibleEmployees} open={tool.competencyRequired === false} onOpenEmployees={manage ? () => { close(); w.setTab('employees'); } : undefined}
            onIssue={canIssueTo ? person => w.openAction('issue', tool, employees.find(item => item.backendId === person.id || (item.employeeNumber != null && item.employeeNumber === person.employeeNumber))) : undefined} />

          <section aria-label="Full record" className="border-t border-line-subtle pt-5">
            <h3 className="mb-3 font-sans text-caption font-medium text-ink-muted">Full record</h3>
            <FactList columns={2} aria-label="Full record facts">
              {selectedFacts.map(([label, value], index) => (
                <Fact key={`${label}-${index}`} label={label}>{value}</Fact>
              ))}
            </FactList>
          </section>

          <section aria-label="Recent activity" className="flex flex-col gap-2 border-t border-line-subtle pt-5">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="font-sans text-caption font-medium text-ink-muted">Recent activity</h3>
              {history.length > 0 && <Button variant="ghost" size="sm" onClick={() => { close(); w.setTab('activity'); w.setSearch(tool.id); }}>See all {history.length}</Button>}
            </div>
            {history.length === 0
              ? <p className="font-sans text-body-sm text-ink-muted">No movements recorded yet.</p>
              : <ul className="flex flex-col gap-2">{history.slice(0, 4).map(a => (
                <li key={a.id} className="font-sans text-body-sm text-ink">{a.title}<span className="block font-sans text-caption text-ink-muted">{[a.detail, a.time].filter(Boolean).join(' · ')}</span></li>
              ))}</ul>}
          </section>

          <section aria-label="Condition evidence" className="flex flex-col gap-2 border-t border-line-subtle pt-5">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="font-sans text-caption font-medium text-ink-muted">Condition evidence ({tool.evidence?.length ?? 0})</h3>
              <Button variant="ghost" size="sm" icon="attachment" onClick={() => w.openManageModal({ kind: 'attachments', tool })}>Add / manage files</Button>
            </div>
            {tool.evidence?.length
              ? <EvidenceGallery files={tool.evidence} />
              : <p className="font-sans text-body-sm text-ink-muted">Optional photos or PDF records of the tool’s condition.</p>}
          </section>
        </div>
      )}
    </Dialog>
    <RecordCheckDialog tool={recordingCheck ? tool ?? null : null} onClose={() => setRecordingCheck(false)} onSave={async (t, input) => { if (t.backendId) await w.recordInspection(t.backendId, input); setRecordingCheck(false); }} />
    </>
  );
}
