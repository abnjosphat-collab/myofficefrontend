// app/tools/ToolDrawer.tsx — one tool up close, in a side panel: its status, the movement it can take next (issue, receive,
// transfer, extend, mark ready), who may take it, its full record, recent activity and condition evidence.
'use client';

import { Button, Dialog, Notice, StatusBadge } from '@/components/ui-system';
import { EligibleEmployeesList } from './ToolsEligibility';
import { EvidenceGallery } from './ToolsUI';
import { departmentOf } from './prototype';
import { statusAccent, statusLabel, statusTone, whereIs } from './toolLook';
import type { ToolsWorkspace } from './useToolsWorkspace';

export function ToolDrawer({ w }: { w: ToolsWorkspace }) {
  const { selected: tool, selectedFacts, activity, employees, currentAccount, options } = w;
  const history = tool ? activity.filter(a => a.toolId === tool.id) : [];
  const accent = tool ? statusAccent(tool.status) : 'var(--mo-neutral)';
  const movable = tool && !tool.archived;
  const out = tool && (tool.status === 'issued' || tool.status === 'overdue');
  const close = () => w.setSelectedId(null);
  const canIssueTo = tool?.status === 'available' && !tool.archived && currentAccount?.role === 'issuer';
  return (
    <Dialog
      open={!!tool}
      onOpenChange={o => { if (!o) close(); }}
      placement="right"
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
            {!!tool.inspectionDue?.length && <Notice tone="warning" title="Scheduled checks overdue">{tool.inspectionDue.map(item => item.replaceAll('_', ' ')).join(', ')}. Issue and transfer are blocked.</Notice>}
          </section>

          {movable && (
            <section aria-label="Record a movement" className="flex flex-col gap-2 border-t border-[var(--mo-line-subtle)] pt-5">
              <h3 className="font-sans text-caption font-medium text-ink-muted">Record a movement</h3>
              <div className="flex flex-wrap gap-2">
                {tool.status === 'available' && (
                  <Button variant="primary" disabled={!tool.eligibleEmployees?.length}
                    title={tool.inspectionDue?.length ? 'A check is overdue: you can still issue it by recording a reason.' : !tool.eligibleEmployees?.length ? 'Authorize at least one employee first.' : undefined}
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

          <EligibleEmployeesList people={tool.eligibleEmployees}
            onIssue={canIssueTo ? person => w.openAction('issue', tool, employees.find(item => item.backendId === person.id || item.employeeNumber === person.employeeNumber)) : undefined} />

          <section aria-label="Full record" className="border-t border-[var(--mo-line-subtle)] pt-5">
            <h3 className="mb-3 font-sans text-caption font-medium text-ink-muted">Full record</h3>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              {selectedFacts.map(([label, value], index) => (
                <div key={`${label}-${index}`} className="min-w-0">
                  <dt className="font-sans text-caption text-ink-muted">{label}</dt>
                  <dd className="mt-0.5 break-words font-sans text-body-sm text-ink">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section aria-label="Recent activity" className="flex flex-col gap-2 border-t border-[var(--mo-line-subtle)] pt-5">
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

          <section aria-label="Condition evidence" className="flex flex-col gap-2 border-t border-[var(--mo-line-subtle)] pt-5">
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
  );
}
