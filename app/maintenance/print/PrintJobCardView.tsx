// app/maintenance/print/PrintJobCardView.tsx — the printable job card: one
// work order's request, artisan report, foreman sign-off and (for
// breakdowns) downtime, plus handwritten signature lines for the site. The
// toolbar is screen-only; on paper only the card shows.
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button, EmptyState, Fact, FactList, LoadingPulse, Notice } from '@/components/ui-system';
import { fmtDate } from '@/components/shared/utils';
import { minutesToDisplay } from '../../breakdowns/calcBreakdowns';
import { downtimeOf, repairOf } from '../../breakdowns/breakdownLogic';
import { fetchWorkOrderById } from '../api';
import { classificationLabel, priorityMeta, statusMeta } from '../meta';
import type { WorkOrder } from '../types';
import { useLinkedBreakdown } from '../useMaintenanceData';

/** One work order, fetched once; null when the server has no such record. Exported for tests. */
export function usePrintWorkOrder(id: string) {
  const [tick, setTick] = useState(0);
  const [settled, setSettled] = useState<{ key: string; order: WorkOrder | null; failed: boolean }>({ key: '', order: null, failed: false });
  const key = `${id}|${tick}`;
  useEffect(() => {
    let current = true;
    fetchWorkOrderById(id).then(
      order => { if (current) setSettled({ key, order, failed: false }); },
      () => { if (current) setSettled({ key, order: null, failed: true }); },
    );
    return () => { current = false; };
  }, [id, key]);
  const mine = settled.key === key ? settled : null;
  const refetch = () => { setSettled({ key: '', order: null, failed: false }); setTick(t => t + 1); };
  return { order: mine?.order ?? null, loading: !mine, failed: mine?.failed ?? false, gone: !!mine && !mine.failed && !mine.order, refetch };
}

function SignImage({ src, label }: { src: string; label: string }) {
  // A signature is a PNG data URL, so it is shown as it is rather than through the image optimiser.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={label} className="h-10 max-w-[9rem] rounded-xs border border-line bg-white object-contain" />;
}

export function PrintJobCardView({ workOrderId }: { workOrderId: string }) {
  const { order: w, loading, failed, gone, refetch } = usePrintWorkOrder(workOrderId);
  const linked = useLinkedBreakdown(w?.id, w?.classification === 'breakdown');
  const [printing, setPrinting] = useState(false);
  if (loading) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col justify-center p-6">
        <LoadingPulse label="Loading the job card" />
      </main>
    );
  }
  if (failed || gone) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col justify-center gap-4 p-6">
        <h1 className="font-display text-title font-semibold text-ink">Print job card</h1>
        {failed ? (
          <Notice tone="danger" title="The job card could not be loaded" action={<Button size="sm" onClick={() => refetch()}>Try again</Button>}>
            Check the connection and try again.
          </Notice>
        ) : (
          <EmptyState
            icon="wrench" title="That work order no longer exists"
            description="It may have been deleted."
            action={<><Button size="sm" onClick={() => refetch()}>Try again</Button><span className="ml-2 inline-block"><Button variant="primary" icon="back" asChild><Link href="/maintenance">Back to maintenance</Link></Button></span></>}
          />
        )}
      </main>
    );
  }
  if (!w) return null;
  const status = statusMeta(w.status);
  const priority = priorityMeta(w.priority);
  const spares = w.spares_used ?? [];
  const artisanSigned = (w.artisan_sign || '').startsWith('data:image');
  const foremanSigned = (w.foreman_sign || '').startsWith('data:image');
  return (
    <main className="mx-auto w-full max-w-3xl p-6 print:max-w-none print:p-0">
      <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
        <Button variant="secondary" icon="back" asChild><Link href="/maintenance">Back</Link></Button>
        <p className="font-sans text-body-sm text-ink-muted">Check the card, then print it for the site.</p>
        <Button
          variant="primary" icon="print" className="ml-auto" pending={printing}
          onClick={() => { setPrinting(true); window.print(); setPrinting(false); }}
        >
          Print
        </Button>
      </div>
      <article aria-label={`Job card ${w.work_order_number}`} className="mo-print-light flex flex-col gap-5 rounded-card border border-line bg-surface p-6 print:gap-4 print:rounded-none print:border-0 print:p-0">
        <header className="border-b border-line pb-4">
          <p className="font-sans text-caption text-ink-muted tabular">Job card #{w.work_order_number}</p>
          <h1 className="font-display text-title font-semibold text-ink">{w.equipment_info}</h1>
          <p className="mt-1 font-sans text-body-sm text-ink-muted">
            {[status.label, `${priority.label} priority`, classificationLabel(w)].filter(Boolean).join(' · ')}
          </p>
        </header>
        <section aria-labelledby="jc-request">
          <h2 id="jc-request" className="mb-2 font-display text-section font-semibold text-ink">Work request</h2>
          <FactList>
            <Fact label="Machine">{w.equipment_info}</Fact>
            <Fact label="Allocated to">{w.allocated_to || w.artisan_name}</Fact>
            <Fact label="Date raised">{w.date_raised && fmtDate(w.date_raised)}</Fact>
            <Fact label="Due date">{w.due_date && fmtDate(w.due_date)}</Fact>
            <Fact label="Department">{w.to_department}</Fact>
            <Fact label="Estimated hours">{w.estimated_hours && `${w.estimated_hours} h`}</Fact>
            <Fact label="Requested by">{w.requested_by}</Fact>
            <Fact label="Authorising foreman">{w.authorising_foreman}</Fact>
            <Fact label="Job request" wide>{w.job_request_details}</Fact>
            {w.job_instructions && <Fact label="Special instructions" wide>{w.job_instructions}</Fact>}
          </FactList>
        </section>
        <section aria-labelledby="jc-artisan">
          <h2 id="jc-artisan" className="mb-2 font-display text-section font-semibold text-ink">Artisan report</h2>
          <FactList>
            <Fact label="Work done" wide>{w.work_done_details}</Fact>
            <Fact label="Started">{w.time_work_started}</Fact>
            <Fact label="Finished">{w.time_work_finished}</Fact>
            <Fact label="Time worked">{w.total_time_worked}</Fact>
            {w.classification === 'breakdown' && <Fact label="Problem">{w.failure_mode}</Fact>}
            {w.classification === 'breakdown' && <Fact label="Cause">{w.cause_of_failure}</Fact>}
            {w.classification === 'breakdown' && <Fact label="Action taken">{w.corrective_action}</Fact>}
            <Fact label="Artisan">{w.artisan_name}</Fact>
            <Fact label="Date">{w.artisan_date && fmtDate(w.artisan_date)}</Fact>
            <Fact label="Signature">{artisanSigned ? <SignImage src={w.artisan_sign} label="Artisan signature" /> : (w.artisan_sign || 'Not signed')}</Fact>
          </FactList>
          {spares.length > 0 && (
            <div className="mt-3">
              <h3 className="mb-1 font-sans text-label font-semibold text-ink">Spares used</h3>
              <ul className="flex flex-col gap-1">
                {spares.map(s => (
                  <li key={s.id} className="flex items-center gap-3 font-sans text-body-sm">
                    <span className="min-w-0 flex-1 text-ink">{s.name}</span>
                    <span className="tabular text-ink-muted">×{s.quantity}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
        <section aria-labelledby="jc-foreman">
          <h2 id="jc-foreman" className="mb-2 font-display text-section font-semibold text-ink">Foreman sign-off</h2>
          <FactList>
            <Fact label="Foreman name">{w.foreman_name}</Fact>
            <Fact label="Date">{w.foreman_date && fmtDate(w.foreman_date)}</Fact>
            <Fact label="Signature">{foremanSigned ? <SignImage src={w.foreman_sign} label="Foreman signature" /> : (w.foreman_sign || 'Not signed')}</Fact>
          </FactList>
        </section>
        {w.classification === 'breakdown' && (
          <section aria-labelledby="jc-downtime">
            <h2 id="jc-downtime" className="mb-2 font-display text-section font-semibold text-ink">Downtime</h2>
            {linked.loading ? (
              <p className="font-sans text-body-sm text-ink-muted">Loading the breakdown…</p>
            ) : linked.failed ? (
              <p className="font-sans text-body-sm text-ink-muted">The downtime could not be loaded.</p>
            ) : linked.breakdown ? (
              <FactList>
                <Fact label="Breakdown date">{linked.breakdown.breakdown_date && fmtDate(linked.breakdown.breakdown_date)}</Fact>
                <Fact label="Downtime">{downtimeOf(linked.breakdown) > 0 ? minutesToDisplay(downtimeOf(linked.breakdown)) : ''}</Fact>
                <Fact label="Repair time">{repairOf(linked.breakdown) > 0 ? minutesToDisplay(repairOf(linked.breakdown)) : ''}</Fact>
              </FactList>
            ) : (
              <p className="font-sans text-body-sm text-ink-muted">No downtime recorded yet.</p>
            )}
          </section>
        )}
        <footer className="flex flex-col gap-4 border-t border-line pt-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="font-sans text-label font-semibold text-ink">Artisan</p>
              <p className="mt-6 border-b border-line" aria-hidden="true" />
              <p className="mt-1 font-sans text-caption text-ink-muted">Signature and date</p>
            </div>
            <div>
              <p className="font-sans text-label font-semibold text-ink">Foreman</p>
              <p className="mt-6 border-b border-line" aria-hidden="true" />
              <p className="mt-1 font-sans text-caption text-ink-muted">Signature and date</p>
            </div>
          </div>
          <p className="font-sans text-caption text-ink-muted">Printed from MyOffice.</p>
        </footer>
      </article>
    </main>
  );
}
