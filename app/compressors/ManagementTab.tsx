// app/compressors/ManagementTab.tsx — fleet summary (status, location, age), recent alerts and services, system actions.
'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button, EmptyState, MetricGrid, MetricTile, Panel, Progress, StatusBadge } from '@/components/ui-system';
import { fmtDate } from '@/components/shared/utils';
import { STATUS_META, hours } from './meta';
import { SectionView } from './SectionView';
import type { ManagementSummary } from './types';
import type { Section } from './useCompressorsData';

export function ManagementTab({ summary, onRetry, onExport, onBackup, backupReady }: {
  summary: Section<ManagementSummary | null>;
  onRetry: () => void;
  onExport: () => Promise<void>;
  onBackup: () => void;
  backupReady: boolean;
}) {
  const [exporting, setExporting] = useState(false);
  const exportReport = async () => {
    setExporting(true);
    try { await onExport(); toast.success('Report exported.'); } catch (e) { toast.error((e as Error).message); } finally { setExporting(false); }
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Panel title="System summary">
        <SectionView section={summary} subject="the management summary" onRetry={onRetry}>
          {s => !s
            ? <EmptyState icon="empty" title="No summary yet" />
            : (
              <div className="flex flex-col gap-5">
                <section aria-labelledby="mg-status" className="flex flex-col gap-2">
                  <h3 id="mg-status" className="font-sans text-label font-semibold text-ink">Status</h3>
                  <MetricGrid columns={4}>
                    {Object.entries(s.status_distribution ?? {}).filter(([k]) => STATUS_META[k]).map(([k, n]) => <MetricTile key={k} label={STATUS_META[k].label} icon={STATUS_META[k].icon} value={n} />)}
                  </MetricGrid>
                </section>
                <section aria-labelledby="mg-loc" className="flex flex-col gap-2">
                  <h3 id="mg-loc" className="font-sans text-label font-semibold text-ink">Location</h3>
                  <ul className="flex flex-col gap-2">
                    {Object.entries(s.location_distribution ?? {}).map(([loc, n]) => (
                      <li key={loc} className="grid grid-cols-[minmax(0,1fr)_2rem_8rem] items-center gap-3 font-sans text-body-sm">
                        <span className="truncate text-ink">{loc}</span><span className="text-right font-semibold text-ink tabular">{n}</span>
                        <Progress value={(n / (s.total_compressors || 1)) * 100} label={`${loc} share of compressors`} />
                      </li>
                    ))}
                  </ul>
                </section>
                <section aria-labelledby="mg-age" className="flex flex-col gap-2">
                  <h3 id="mg-age" className="font-sans text-label font-semibold text-ink">Age</h3>
                  <MetricGrid columns={4}>
                    <MetricTile label="Under 1 year" value={s.age_distribution?.less_than_year ?? 0} />
                    <MetricTile label="1 to 3 years" value={s.age_distribution?.['1_3_years'] ?? 0} />
                    <MetricTile label="3 to 5 years" value={s.age_distribution?.['3_5_years'] ?? 0} />
                    <MetricTile label="Over 5 years" value={s.age_distribution?.more_than_5 ?? 0} />
                  </MetricGrid>
                </section>
              </div>
            )}
        </SectionView>
      </Panel>

      <div className="flex flex-col gap-4">
        <Panel title="Recent alerts" actions={summary.data ? <StatusBadge tone={(summary.data.unread_alerts ?? 0) > 0 ? 'danger' : 'neutral'}>{`${summary.data.unread_alerts ?? 0} unread`}</StatusBadge> : undefined}>
          <SectionView section={summary} subject="recent alerts" onRetry={onRetry}>
            {s => !s?.recent_alerts?.length
              ? <EmptyState icon="success" title="No recent alerts" />
              : (
                <ul className="flex flex-col gap-2">
                  {s.recent_alerts.slice(0, 5).map(a => (
                    <li key={a.id} className="rounded-control bg-surface-subtle p-3">
                      <div className="flex items-start justify-between gap-2"><div><p className="font-sans text-label font-medium text-ink">{a.title}</p><p className="font-sans text-body-sm text-ink-muted">{a.message}</p></div>
                        <div className="flex shrink-0 gap-1.5"><StatusBadge tone={a.severity === 'critical' ? 'danger' : a.severity === 'error' ? 'warning' : 'info'}>{a.severity}</StatusBadge>{!a.is_read && <StatusBadge tone="brand">New</StatusBadge>}</div></div>
                      <p className="mt-1.5 font-sans text-caption text-ink-muted">{fmtDate(a.created_at)}</p>
                    </li>
                  ))}
                </ul>
              )}
          </SectionView>
        </Panel>

        <Panel title="Recent services">
          <SectionView section={summary} subject="recent services" onRetry={onRetry}>
            {s => !s?.recent_services?.length
              ? <EmptyState icon="service" title="No recent services" />
              : (
                <ul className="flex flex-col gap-2">
                  {s.recent_services.slice(0, 5).map(r => (
                    <li key={r.id} className="rounded-control bg-surface-subtle p-3">
                      <div className="flex items-center justify-between gap-2"><span className="font-sans text-label font-medium text-ink">{r.service_type}</span><StatusBadge tone="success" icon="success">Completed</StatusBadge></div>
                      <p className="mt-1 font-sans text-body-sm text-ink-muted">{r.description}</p>
                      <p className="mt-1.5 flex justify-between font-sans text-caption text-ink-muted"><span>{fmtDate(r.service_date)}</span><span className="tabular">{hours(r.running_hours_at_service)}</span></p>
                    </li>
                  ))}
                </ul>
              )}
          </SectionView>
        </Panel>

        <Panel title="System actions">
          <div className="flex flex-col gap-2">
            <Button icon="refresh" onClick={onRetry}>Refresh all data</Button>
            <Button icon="download" pending={exporting} onClick={exportReport}>Export last 30 days (CSV)</Button>
            <Button icon="save" disabled={!backupReady} onClick={onBackup}>Back up what is loaded (JSON)</Button>
            {!backupReady && <p className="font-sans text-caption text-ink-muted">The register has not loaded, so there is nothing to back up yet.</p>}
          </div>
        </Panel>
      </div>
    </div>
  );
}
