// app/employees/NormalizeRosterDialog.tsx — tidy the whole roster in one batch: standard designations, the section that fits the trade,
// phone numbers in one format, hoist drivers archived. It shows every change it would make before doing anything, and says which
// people could not be updated if the batch is only partly applied.
'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button, Dialog, EmptyState, MetricGrid, MetricTile, Notice } from '@/components/ui-system';
import { planRosterNormalization, type FieldChange } from './calcNormalizeRoster';
import type { Employee } from './types';
import { bulkNormalizeEmployees } from './useEmployeesData';

const FIELD_LABELS: Record<FieldChange['field'], string> = { designation: 'Designation', section: 'Section', phone: 'Phone', archived: 'Archived' };

export function NormalizeRosterDialog({ open, employees, onOpenChange, onComplete }: { open: boolean; employees: Employee[]; onOpenChange: (open: boolean) => void; onComplete: () => Promise<void> }) {
  const plan = useMemo(() => planRosterNormalization(employees), [employees]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const preview = plan.items.slice(0, 25);
  const more = plan.items.length - preview.length;

  const run = async () => {
    setRunning(true); setError(null);
    try {
      const { succeeded, failed, errors } = await bulkNormalizeEmployees(plan, employees);
      await onComplete();
      if (failed === 0) { toast.success(`Normalised ${succeeded} ${succeeded === 1 ? 'record' : 'records'}.`); onOpenChange(false); }
      else if (succeeded > 0) setError(`${succeeded} updated, ${failed} could not be. ${errors?.[0] ?? ''} Close this and open it again to retry the rest.`);
      else setError(errors?.[0] || 'Nothing was updated.');
    } catch (e) { setError(e instanceof Error ? e.message : 'The batch failed.'); }
    finally { setRunning(false); }
  };

  return (
    <Dialog
      open={open} onOpenChange={o => { if (!running) onOpenChange(o); }} size="lg" title="Normalise the roster" description="Standardise designations, sections and phone numbers across every record."
      footer={<><Button onClick={() => onOpenChange(false)} disabled={running}>{plan.affected === 0 ? 'Close' : 'Cancel'}</Button>{plan.affected > 0 && <Button variant="primary" icon="normalize" pending={running} onClick={run}>{`Normalise ${plan.affected} ${plan.affected === 1 ? 'record' : 'records'}`}</Button>}</>}
    >
      <div className="flex flex-col gap-4">
        {plan.affected === 0 ? (
          <EmptyState icon="success" title="The roster is already clean" description={`All ${plan.total} ${plan.total === 1 ? 'employee uses' : 'employees use'} standard designations, sections and phone numbers.`} />
        ) : (
          <>
            <MetricGrid columns={3}>
              <MetricTile label="Will change" icon="edit" tone="warning" value={plan.affected} />
              <MetricTile label="Unchanged" icon="check" value={plan.unchanged} />
              <MetricTile label="Total" icon="employees" value={plan.total} />
            </MetricGrid>
            <p className="font-sans text-caption text-ink-muted">{(['designation', 'section', 'phone', 'archived'] as const).filter(f => plan.byField[f] > 0).map(f => `${FIELD_LABELS[f]}: ${plan.byField[f]}`).join(', ')}</p>
            <section aria-labelledby="nr-prev" className="rounded-card border border-line">
              <h3 id="nr-prev" className="border-b border-line bg-surface-subtle px-4 py-2 font-sans text-label font-semibold text-ink">Changes to be made</h3>
              <ul className="max-h-72 divide-y divide-line-subtle overflow-y-auto">
                {preview.map(item => (
                  <li key={item.id} className="flex flex-col gap-1 px-4 py-2.5">
                    <p className="font-sans text-body-sm font-medium text-ink">{item.name} <span className="font-mono text-caption text-ink-muted">{item.employee_id}</span></p>
                    {item.changes.map(c => <p key={`${item.id}-${c.field}`} className="font-sans text-caption text-ink-muted"><span className="font-medium">{FIELD_LABELS[c.field]}:</span> <span className="line-through">{c.from || 'empty'}</span> to <span className="text-ink">{c.to || 'empty'}</span></p>)}
                  </li>
                ))}
              </ul>
              {more > 0 && <p className="border-t border-line px-4 py-2 font-sans text-caption text-ink-muted">and {more} more {more === 1 ? 'person' : 'people'}</p>}
            </section>
            <Notice tone="info" title="What it does">Roles it does not recognise are left alone. Assistant titles merge to one form (Assistant Fitter becomes Fitter Assistant). Sections follow the trade. Driver titles become Light Vehicle Driver. Phone numbers are stored as +263 XX XXX XXXX. Hoist Driver roles are archived.</Notice>
          </>
        )}
        {error && <Notice tone="danger" title="The batch did not finish">{error}</Notice>}
      </div>
    </Dialog>
  );
}
