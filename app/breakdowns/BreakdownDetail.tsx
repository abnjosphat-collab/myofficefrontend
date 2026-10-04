// app/breakdowns/BreakdownDetail.tsx — one breakdown in full: status, priority and kind, the machine and who attended, the times with
// the downtime and repair worked out, what happened, the work done and recommendations, and the parts used with their cost.
'use client';

import { Button, Dialog, StatusBadge } from '@/components/ui-system';
import { fmtDate, formatCurrency } from '@/components/shared/utils';
import { minutesToDisplay } from './calcBreakdowns';
import { priorityMeta, statusMeta, typeMeta } from './breakdownMeta';
import { costOf, downtimeOf, partsOf, repairOf } from './breakdownLogic';
import type { Breakdown } from './types';

const time = (t?: string | null) => (t ? t.slice(0, 5) : '');
function Fact({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return <div className={`rounded-control bg-surface-subtle p-3 ${wide ? 'sm:col-span-2' : ''}`}><dt className="font-sans text-caption text-ink-muted">{label}</dt><dd className="whitespace-pre-wrap font-sans text-body text-ink [overflow-wrap:anywhere]">{children || 'Not recorded'}</dd></div>;
}

export function BreakdownDetail({ record: b, onClose, onEdit, onDelete }: { record: Breakdown | null; onClose: () => void; onEdit: (b: Breakdown) => void; onDelete: (b: Breakdown) => void }) {
  const parts = b ? partsOf(b) : [];
  const down = b ? downtimeOf(b) : 0; const repair = b ? repairOf(b) : 0;
  const range = (a?: string | null, z?: string | null) => (a && z ? `${time(a)} to ${time(z)}` : a ? `from ${time(a)}` : '');
  return (
    <Dialog
      open={!!b} onOpenChange={o => { if (!o) onClose(); }} size="lg" title={b?.machine_name ?? 'Breakdown'} description={b ? [b.machine_id, b.breakdown_date ? fmtDate(b.breakdown_date) : ''].filter(Boolean).join(', ') : undefined}
      footer={b && (<><Button variant="danger" icon="delete" onClick={() => onDelete(b)}>Delete</Button><Button icon="edit" onClick={() => onEdit(b)}>Edit</Button><Button onClick={onClose}>Close</Button></>)}
    >
      {b && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={statusMeta(b.status).tone}>{statusMeta(b.status).label}</StatusBadge>
            <StatusBadge tone={priorityMeta(b.priority).tone}>{priorityMeta(b.priority).label} priority</StatusBadge>
            <StatusBadge tone="neutral">{typeMeta(b.breakdown_type).label}</StatusBadge>
          </div>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Fact label="What happened" wide>{b.breakdown_description || b.machine_description}</Fact>
            <Fact label="Artisan">{b.artisan_name}</Fact>
            <Fact label="Location">{b.location}</Fact>
            <Fact label="Department">{b.department}</Fact>
            <Fact label="Nature of the breakdown">{b.breakdown_nature}</Fact>
            <Fact label="Breakdown">{range(b.breakdown_start, b.breakdown_end)}</Fact>
            <Fact label="Downtime">{down > 0 ? minutesToDisplay(down) : ''}</Fact>
            <Fact label="Work">{range(b.work_start, b.work_end)}</Fact>
            <Fact label="Repair time">{repair > 0 ? minutesToDisplay(repair) : ''}</Fact>
            <Fact label="Work done" wide>{b.work_done}</Fact>
            <Fact label="Recommendations" wide>{b.artisan_recommendations}</Fact>
          </dl>
          {parts.length > 0 && (
            <section aria-label="Parts used" className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between"><h3 className="font-sans text-label font-semibold text-ink">Parts used</h3><span className="font-sans text-body-sm text-ink-muted">Total <span className="font-semibold tabular text-ink">{formatCurrency(costOf(b))}</span></span></div>
              <ul className="flex flex-col gap-1.5">
                {parts.map((s, i) => (
                  <li key={i} className="flex items-baseline justify-between gap-3 rounded-control border border-line bg-surface px-3 py-2 font-sans text-body-sm">
                    <span className="min-w-0 [overflow-wrap:anywhere]">{s.name}{s.part_number && <span className="text-ink-muted"> ({s.part_number})</span>} <span className="text-ink-muted tabular">× {s.quantity}</span></span>
                    <span className="shrink-0 font-semibold tabular text-ink">{formatCurrency(Number(s.total_cost) || (Number(s.quantity) || 0) * (Number(s.unit_price) || 0))}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </Dialog>
  );
}
