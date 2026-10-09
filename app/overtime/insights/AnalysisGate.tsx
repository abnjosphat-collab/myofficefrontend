// app/overtime/insights/AnalysisGate.tsx — the shared frame for the two tabs that read the server's analysis (Patterns, Causes):
// loading, "nothing to analyse", a failed analysis with a retry, and a status line with a refresh once there is a result.
'use client';

import type { ReactNode } from 'react';
import { Button, EmptyState, IconButton, Notice } from '@/components/ui-system';
import type { useOvertimeAnalysis } from '../useOvertimeData';
import type { OTAnalysisResult } from '../types';

export function AnalysisGate({ analysis: a, count, children }: { analysis: ReturnType<typeof useOvertimeAnalysis>; count: number; children: (r: OTAnalysisResult) => ReactNode }) {
  if (count === 0) return <EmptyState icon="analytics" title="Nothing to analyse" description="No records match the current filters." />;
  if (!a.result) {
    if (a.error) return <Notice tone="danger" title="The analysis could not be run" action={<Button size="sm" icon="refresh" onClick={() => a.refresh()}>Try again</Button>}>{a.error}</Notice>;
    return <p role="status" className="py-12 text-center font-sans text-body text-ink-muted">{a.loading ? 'Analysing the records…' : 'The analysis starts as soon as the filters settle.'}</p>;
  }
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p role="status" className="font-sans text-caption text-ink-muted">
          {a.updating ? 'Updating for the current filters…' : `${a.result._records_analysed} ${a.result._records_analysed === 1 ? 'record' : 'records'} analysed, ${new Date(a.result.generated_at).toLocaleString('en-GB')}`}
        </p>
        <IconButton icon="refresh" variant="shell" label="Run the analysis again" pending={a.updating} onClick={() => a.refresh()} />
      </div>
      {a.error && <Notice tone="warning" title="The analysis could not be refreshed">Showing the last result. {a.error}</Notice>}
      {children(a.result)}
    </div>
  );
}
