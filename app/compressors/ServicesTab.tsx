// app/compressors/ServicesTab.tsx — upcoming services (downloadable as Excel or PDF) and the service intervals.
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button, EmptyState, Icon, Panel, Progress, StatusBadge, useConfirm } from '@/components/ui-system';
import { SERVICE_INTERVALS, calculateNextService } from './calcCompressors';
import { URGENCY_TONE, hours } from './meta';
import { DownloadButton } from '@/components/shared/DownloadButton';
import { exportFilename } from '@/lib/exportUtils';
import { SERVICES_COLUMNS } from './exports';
import { SectionView } from './SectionView';
import type { Compressor, UpcomingService } from './types';
import type { Section } from './useCompressorsData';

export function ServicesTab({ services, compressors, registerLoaded, onRetry, onComplete }: {
  services: Section<UpcomingService[]>;
  compressors: Compressor[];
  registerLoaded: boolean;
  onRetry: () => void;
  /** Record a service as done from here. Left out where service work is recorded in the Maintenance module instead. */
  onComplete?: (compressorId: number, interval: number) => Promise<void>;
}) {
  const confirm = useConfirm();
  const [busy, setBusy] = useState<string | null>(null);

  const complete = async (svc: UpcomingService) => {
    if (!onComplete) return;
    const ok = await confirm({
      title: `Record the ${svc.service_interval} h service for ${svc.compressor_name}?`,
      message: `This records the service as completed at the compressor's current meter. The running hours are left alone.`,
      confirmLabel: 'Record service',
    });
    if (!ok) return;
    setBusy(`svc-${svc.compressor_id}`);
    try { await onComplete(svc.compressor_id, svc.service_interval); toast.success(`${svc.compressor_name}: ${svc.service_interval} h service recorded.`); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(null); }
  };
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Panel title="Upcoming services" description="The next service interval each compressor has not yet reached." actions={services.data.length > 0 ? <DownloadButton data={services.data as unknown as Record<string, unknown>[]} columns={SERVICES_COLUMNS} filename={exportFilename('Compressor_Upcoming_Services')} title="Upcoming compressor services" /> : undefined}>
          <SectionView section={services} subject="upcoming services" onRetry={onRetry}>
            {list => list.length === 0
              ? <EmptyState icon="success" title="All compressors are up to date" description="No compressor has a service interval ahead of it." />
              : (
                <ul className="flex flex-col gap-3">
                  {list.map(svc => (
                    <li key={`${svc.compressor_id}-${svc.service_interval}`} className="flex flex-col gap-3 rounded-card border border-line bg-surface-subtle p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-surface text-ink-muted"><Icon name="compressor" size="md" /></span>
                          <div className="min-w-0"><h3 className="font-display text-title font-semibold text-ink [overflow-wrap:anywhere]">{svc.compressor_name}</h3><p className="font-sans text-caption text-ink-muted">Now {hours(svc.current_hours)} · next at {hours(svc.next_service_hours)}</p></div>
                        </div>
                        <StatusBadge tone={URGENCY_TONE[svc.urgency] ?? 'neutral'} icon={svc.urgency === 'critical' || svc.urgency === 'high' ? 'warning' : undefined}>{`${svc.urgency.charAt(0).toUpperCase()}${svc.urgency.slice(1)}`}</StatusBadge>
                      </div>
                      <dl className="grid grid-cols-[repeat(auto-fit,minmax(7.5rem,1fr))] gap-3">
                        <div><dt className="font-sans text-caption text-ink-muted">Interval</dt><dd className="font-display text-title font-semibold text-ink tabular">{svc.service_interval} h</dd></div>
                        <div><dt className="font-sans text-caption text-ink-muted">Remaining</dt><dd className="font-display text-title font-semibold text-ink tabular">{hours(svc.hours_remaining)}</dd></div>
                        <div><dt className="font-sans text-caption text-ink-muted">Days until</dt><dd className="font-display text-title font-semibold text-ink tabular">{svc.days_remaining}</dd></div>
                      </dl>
                      <Progress value={svc.next_service_hours ? (svc.current_hours / svc.next_service_hours) * 100 : 0} label={`${svc.compressor_name} progress to its ${svc.service_interval} hour service`} />
                      <div>{onComplete
                        ? <Button icon="check" pending={busy === `svc-${svc.compressor_id}`} onClick={() => complete(svc)} aria-label={`Mark ${svc.service_interval} hour service done for ${svc.compressor_name}`}>Mark as done</Button>
                        : <Link href={`/maintenance?q=${encodeURIComponent(svc.compressor_name.trim())}`} className="font-sans text-body-sm text-ink-muted underline underline-offset-2 hover:text-ink">See its work orders in Maintenance</Link>}</div>
                    </li>
                  ))}
                </ul>
              )}
          </SectionView>
        </Panel>
      </div>

      <div className="flex flex-col gap-4">
        <Panel title="Service intervals" headingLevel={2}>
          <ul className="flex flex-col gap-2">
            {SERVICE_INTERVALS.map(iv => (
              <li key={iv} className="flex items-center justify-between rounded-control bg-surface-subtle px-3 py-2">
                <span className="flex items-center gap-2 font-sans text-label font-medium text-ink"><Icon name="clock" size="sm" />{iv} h</span>
                <span className="font-sans text-caption text-ink-muted">{registerLoaded ? `${compressors.filter(c => calculateNextService(c.total_running_hours)?.interval === iv).length} due next` : 'Unavailable'}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
