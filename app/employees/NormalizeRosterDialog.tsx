'use client';

import { useMemo, useState } from 'react';
import { Loader2, Sparkles, AlertCircle } from '@/components/shared/theme';
import {
  useTheme, CenterModal, FormActions, TYPE_WEIGHT, accentText,
} from '@/components/shared/theme';
import { toast } from 'sonner';
import type { Employee } from './types';
import { planRosterNormalization, type FieldChange } from './calcNormalizeRoster';
import { bulkNormalizeEmployees } from './useEmployeesData';

const FIELD_LABELS: Record<FieldChange['field'], string> = {
  designation: 'Designation',
  section: 'Section',
  phone: 'Phone',
  archived: 'Archived',
};

function ChangeLine({ change }: { change: FieldChange }) {
  const t = useTheme();
  return (
    <div className={`text-xs ${t.textMuted}`}>
      <span className={`${TYPE_WEIGHT.medium} ${t.textFaint}`}>{FIELD_LABELS[change.field]}:</span>{' '}
      <span className="line-through opacity-60">{change.from || '—'}</span>
      <span className={`mx-1 ${t.textFaint}`}>→</span>
      <span className={t.textPrimary}>{change.to || '—'}</span>
    </div>
  );
}

export function NormalizeRosterDialog({
  open,
  employees,
  onClose,
  onComplete,
}: {
  open: boolean;
  employees: Employee[];
  onClose: () => void;
  onComplete: () => Promise<void>;
}) {
  const t = useTheme();
  const plan = useMemo(() => planRosterNormalization(employees), [employees]);
  const [running, setRunning] = useState(false);
  const preview = plan.items.slice(0, 25);
  const more = plan.items.length - preview.length;

  const handleConfirm = async () => {
    if (plan.affected === 0) { onClose(); return; }
    setRunning(true);
    try {
      const { succeeded, failed, errors } = await bulkNormalizeEmployees(plan, employees);
      await onComplete();
      if (failed === 0) {
        toast.success(`Normalized ${succeeded} employee record${succeeded === 1 ? '' : 's'}`);
      } else if (succeeded > 0) {
        toast.warning(`Updated ${succeeded}; ${failed} failed — refresh and retry the remainder`);
      } else {
        toast.error(errors?.[0] || 'Normalization failed — no records were updated');
      }
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Normalization failed');
    } finally {
      setRunning(false);
    }
  };

  return (
    <CenterModal
      open={open}
      onClose={() => !running && onClose()}
      title="Normalize roster"
      subtitle="Standardize designations, sections, and phone formatting across all personnel records"
      accent="violet"
      width="max-w-xl"
    >
      <div className="p-5 space-y-4">
        {plan.affected === 0 ? (
          <div className={`flex items-start gap-3 rounded-xl p-4 ${t.chipBg}`}>
            <Sparkles className="h-5 w-5 text-brand-400 shrink-0 mt-0.5" />
            <div>
              <p className={`text-sm ${TYPE_WEIGHT.semibold} ${t.textPrimary}`}>Roster is already clean</p>
              <p className={`text-xs mt-1 ${t.textFaint}`}>
                All {plan.total} employee{plan.total === 1 ? '' : 's'} already use standard designations, sections, and phone formatting.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Will update', value: plan.affected, color: accentText('violet', t.light) },
                { label: 'Unchanged', value: plan.unchanged, color: t.textMuted },
                { label: 'Total', value: plan.total, color: t.textPrimary },
              ].map(s => (
                <div key={s.label} className={`${t.chipBg} rounded-xl px-3 py-2.5 text-center`}>
                  <div className={`text-lg ${TYPE_WEIGHT.bold} ${s.color}`}>{s.value}</div>
                  <div className={`text-[10px] uppercase tracking-wide ${t.textFaint}`}>{s.label}</div>
                </div>
              ))}
            </div>

            <div className={`text-xs ${t.textFaint} flex flex-wrap gap-x-4 gap-y-1`}>
              {plan.byField.designation > 0 && <span>Designation: {plan.byField.designation}</span>}
              {plan.byField.section > 0 && <span>Section: {plan.byField.section}</span>}
              {plan.byField.phone > 0 && <span>Phone: {plan.byField.phone}</span>}
              {plan.byField.archived > 0 && <span>Archived: {plan.byField.archived}</span>}
            </div>

            <div className={`rounded-xl border ${t.border} overflow-hidden`}>
              <div className={`px-3 py-2 border-b ${t.border} ${t.chipBg}`}>
                <span className={`text-xs ${TYPE_WEIGHT.semibold} ${t.textSecondary}`}>Preview changes</span>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-white/5">
                {preview.map(item => (
                  <div key={item.id} className="px-3 py-2.5 space-y-1">
                    <div className={`text-sm ${TYPE_WEIGHT.medium} ${t.textPrimary}`}>
                      {item.name}
                      <span className={`ml-2 text-[11px] font-mono ${t.textFaint}`}>{item.employee_id}</span>
                    </div>
                    {item.changes.map(c => (
                      <ChangeLine key={`${item.id}-${c.field}`} change={c} />
                    ))}
                  </div>
                ))}
              </div>
              {more > 0 && (
                <div className={`px-3 py-2 text-[11px] ${t.textFaint} border-t ${t.border}`}>
                  …and {more} more employee{more === 1 ? '' : 's'}
                </div>
              )}
            </div>

            <div className={`flex items-start gap-2 text-xs ${t.textFaint}`}>
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <p>
                Non-standard roles are left unchanged. Assistant titles merge to one form (e.g. Assistant Fitter → Fitter Assistant).
                Sections align to the trade — electricians and lamproom attendants to Electrical, fitters/riggers to Mechanical.
                Driver job titles like Class 4 Driver or Driver Class 4 become Light Vehicle Driver.
                Phone numbers are stored as +263 XX XXX XXXX; multiples separated by /.
                Hoist Driver roles are archived automatically.
              </p>
            </div>
          </>
        )}

        <form onSubmit={e => { e.preventDefault(); void handleConfirm(); }}>
          <FormActions
            onCancel={() => !running && onClose()}
            submitting={running}
            submitLabel={plan.affected === 0 ? 'Close' : `Normalize ${plan.affected} record${plan.affected === 1 ? '' : 's'}`}
            accent="violet"
          />
        </form>
        {running && (
          <div className={`flex items-center justify-center gap-2 text-xs ${t.textFaint} pb-2`}>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Updating {plan.affected} record{plan.affected === 1 ? '' : 's'} in one batch…
          </div>
        )}
      </div>
    </CenterModal>
  );
}
