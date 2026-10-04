// app/overtime/insights/CausesTab.tsx — the analysis possible causes (hypotheses to investigate, not facts), grouped by how serious
// the rules rate them, and the actions it suggests, by priority. Severity and priority are stated in words.
'use client';

import { EmptyState, Icon, StatusBadge, type Tone } from '@/components/ui-system';
import type { OTAnalysisResult } from '../types';

const SEVERITY = ['critical', 'high', 'medium', 'low'] as const;
const SEV_TONE: Record<(typeof SEVERITY)[number], Tone> = { critical: 'danger', high: 'warning', medium: 'info', low: 'neutral' };
const PRIORITY: Record<string, { label: string; tone: Tone }> = { immediate: { label: 'Immediate', tone: 'danger' }, short_term: { label: 'Short term', tone: 'warning' }, long_term: { label: 'Long term', tone: 'info' } };

export function CausesTab({ r }: { r: OTAnalysisResult }) {
  if (!r.possible_causes.length && !r.recommendations.length) return <EmptyState icon="analytics" title="Nothing stands out" description="The rules found no causes or actions worth raising for this selection." />;
  return (
    <div className="flex flex-col gap-5">
      {r.possible_causes.length > 0 && (
        <section aria-labelledby="causes" className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5 shadow-card">
          <div><h2 id="causes" className="font-display text-title font-semibold text-ink">Possible causes</h2><p className="font-sans text-body-sm text-ink-muted">Hypotheses from the patterns in the data. Check each against what you know.</p></div>
          {SEVERITY.map(sev => {
            const items = r.possible_causes.filter(p => p.severity === sev);
            if (!items.length) return null;
            return (
              <div key={sev} className="flex flex-col gap-2">
                <h3 className="flex items-center gap-2 font-sans text-label font-semibold capitalize text-ink"><StatusBadge tone={SEV_TONE[sev]}>{sev}</StatusBadge><span className="font-normal text-ink-muted">{items.length}</span></h3>
                <ul className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                  {items.map((p, i) => (
                    <li key={i} className="flex gap-3 rounded-control border border-line bg-surface-subtle p-3.5"><Icon name={sev === 'critical' || sev === 'high' ? 'warning' : 'info'} size="md" className="mt-0.5 shrink-0 text-ink-muted" /><div className="min-w-0"><p className="font-sans text-label font-semibold text-ink">{p.title}</p><p className="mt-0.5 font-sans text-body-sm text-ink-muted [overflow-wrap:anywhere]">{p.description}</p></div></li>
                  ))}
                </ul>
              </div>
            );
          })}
        </section>
      )}
      {r.recommendations.length > 0 && (
        <section aria-labelledby="actions" className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5 shadow-card">
          <h2 id="actions" className="font-display text-title font-semibold text-ink">Suggested actions</h2>
          <ul className="flex flex-col gap-2.5">
            {r.recommendations.map((a, i) => {
              const p = PRIORITY[a.priority] ?? { label: a.priority, tone: 'neutral' as Tone };
              return <li key={i} className="flex flex-col gap-1 rounded-control border border-line bg-surface-subtle p-3.5"><p className="flex flex-wrap items-center gap-2 font-sans text-label font-semibold text-ink"><StatusBadge tone={p.tone}>{p.label}</StatusBadge>{a.action}</p><p className="font-sans text-body-sm text-ink-muted [overflow-wrap:anywhere]">{a.rationale}{a.target ? `, ${a.target}` : ''}</p></li>;
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
