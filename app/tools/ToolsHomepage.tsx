// app/tools/ToolsHomepage.tsx — the overview: the figures that matter (each opens its list), what needs attention, shortcuts
// to the sections, and the latest movements (closed by default; the choice is remembered in this browser).
'use client';

import { useState } from 'react';
import { Button, Icon, MetricGrid, MetricTile, Notice, Panel } from '@/components/ui-system';
import type { Status } from './prototype';
import type { ToolsTab } from './toolSelectors';

export type HomepageStat = { key: string; label: string; value: number; tab: ToolsTab; filter: Status | 'all'; tone?: 'amber' | 'red'; unavailable?: boolean; loading?: boolean };
export type HomepageAttention = { id: string; tone: 'amber' | 'red'; title: string; detail: string; tab: ToolsTab };
export type HomepageMovement = { id: string; title: string; detail: string; time: string };
export type HomepageSection = { value: ToolsTab; label: string };

const SECTION_DESCRIPTIONS: Partial<Record<ToolsTab, string>> = {
  register: 'Browse every tool and its live status',
  loans: 'Track custody and overdue returns',
  employees: 'People who can receive tools',
  compliance: 'Competence, inspections and incidents',
  activity: 'Issue and return audit trail',
  sources: 'Original registers and scans',
  accounts: 'Roles and department access',
  analytics: 'Usage, errors and feedback',
  feedback: 'Suggestions and recordings',
};

const MOVEMENTS_OPEN_KEY = 'myoffice.tools.movementsOpen';

export function ToolsHomepage({ stats, attention, movements, historyFailed, attentionFailed, historyLoading = false, attentionLoading = false, sections, scopeLabel, onNavigate, onRetry, onIssue, canIssue }: {
  stats: HomepageStat[];
  attention: HomepageAttention[];
  movements: HomepageMovement[];
  historyFailed: boolean;
  attentionFailed: boolean;
  /** The panel's own records are still on their way; the rest of the overview is already usable. */
  historyLoading?: boolean;
  attentionLoading?: boolean;
  sections: HomepageSection[];
  scopeLabel: string;
  onNavigate: (tab: ToolsTab, filter: Status | 'all') => void;
  onRetry: () => void;
  /** Issuing is the workspace's central action, so the overview carries it too. */
  onIssue: () => void;
  canIssue: boolean;
}) {
  const [movementsChosen, setMovementsChosen] = useState(() => { try { return typeof window !== 'undefined' && window.localStorage.getItem(MOVEMENTS_OPEN_KEY) === '1'; } catch { return false; } });
  const toggleMovements = () => setMovementsChosen(open => { const next = !open; try { window.localStorage.setItem(MOVEMENTS_OPEN_KEY, next ? '1' : '0'); } catch { /* storage unavailable */ } return next; });
  // A failed history stays open, so the retry cannot be missed.
  const movementsOpen = movementsChosen || historyFailed;
  const movementsChip = historyLoading ? 'Loading…' : historyFailed ? 'Unavailable' : String(movements.length);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-sans text-body-sm text-ink-muted">{scopeLabel}</p>
        <Button variant="primary" onClick={onIssue} disabled={!canIssue}>Issue tools</Button>
      </div>
      <MetricGrid compact>
        {stats.map(stat => (
          <MetricTile key={stat.key} compact label={stat.label} value={stat.value} loading={stat.loading} unavailable={stat.unavailable}
            tone={stat.tone === 'red' ? 'danger' : stat.tone === 'amber' ? 'warning' : 'default'}
            onClick={stat.loading || stat.unavailable ? undefined : () => onNavigate(stat.tab, stat.filter)} />
        ))}
      </MetricGrid>
      {stats.some(stat => stat.unavailable) && <div><Button size="sm" onClick={onRetry}>Retry</Button></div>}

      <Panel title="Needs attention" description={attention.length ? `${attention.length} to look at` : undefined}>
        {attentionLoading ? <p role="status" className="font-sans text-body-sm text-ink-muted">Loading the latest records…</p>
          : attentionFailed ? <Notice tone="warning" title="Needs-attention data is unavailable." action={<Button size="sm" onClick={onRetry}>Retry</Button>} />
          : attention.length ? (
            <ul className="flex flex-col divide-y divide-line-subtle">
              {attention.map(item => (
                <li key={item.id}>
                  <button type="button" onClick={() => onNavigate(item.tab, 'all')} className="focus-ring flex w-full items-start gap-3 py-2.5 text-left transition-colors hover:bg-surface-subtle">
                    <span aria-hidden="true" className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: item.tone === 'red' ? 'var(--mo-danger)' : 'var(--mo-warning)' }} />
                    <span className="min-w-0 flex-1"><strong className="block font-sans text-body-sm font-medium text-ink">{item.title}</strong><small className="block font-sans text-caption text-ink-muted">{item.detail}</small></span>
                    <Icon name="chevron-right" size="xs" className="mt-1 text-ink-muted" />
                  </button>
                </li>
              ))}
            </ul>
          )
          : <p className="flex items-center gap-2 font-sans text-body-sm text-ink-muted"><Icon name="success" size="sm" />Everything is clear. No overdue returns, open incidents or due checks.</p>}
      </Panel>

      <nav aria-label="Workspace shortcuts" className="flex flex-col gap-2">
        <h2 className="font-sans text-caption font-medium text-ink-muted">Workspace shortcuts</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {sections.map(section => (
            <button key={section.value} type="button" aria-label={`Open ${section.label}`} title={SECTION_DESCRIPTIONS[section.value] ?? section.label} onClick={() => onNavigate(section.value, 'all')}
              className="focus-ring flex items-center justify-between gap-2 rounded-sm border border-line-subtle bg-surface-raised px-3 py-2.5 text-left font-sans text-body-sm font-medium text-ink transition-colors hover:border-action">
              <span className="min-w-0"><span className="block truncate">{section.label}</span><small className="block truncate font-normal text-ink-muted">{SECTION_DESCRIPTIONS[section.value]}</small></span>
              <Icon name="chevron-right" size="xs" className="shrink-0 text-ink-muted" />
            </button>
          ))}
        </div>
      </nav>

      <Panel title={(
        <button type="button" aria-expanded={movementsOpen} aria-controls="home-movements" disabled={historyFailed} onClick={toggleMovements} className="focus-ring inline-flex items-center gap-2 rounded-xs">
          Recent movements <small className="font-normal text-ink-muted">{movementsChip}</small><Icon name={movementsOpen ? 'chevron-up' : 'chevron-down'} size="xs" />
        </button>
      )} actions={movementsOpen && !historyLoading ? <Button variant="ghost" size="sm" onClick={() => onNavigate('activity', 'all')}>View all</Button> : undefined}>
        {movementsOpen && (
          <div id="home-movements">
            {historyLoading ? <p role="status" className="font-sans text-body-sm text-ink-muted">Loading the latest records…</p>
              : historyFailed ? <Notice tone="warning" title="Movement history is unavailable." action={<Button size="sm" onClick={onRetry}>Retry</Button>} />
              : movements.length ? (
                <ul className="flex flex-col divide-y divide-line-subtle">
                  {movements.map(item => (
                    <li key={item.id}>
                      <button type="button" onClick={() => onNavigate('activity', 'all')} className="focus-ring flex w-full items-start justify-between gap-3 py-2.5 text-left transition-colors hover:bg-surface-subtle">
                        <span className="min-w-0"><strong className="block font-sans text-body-sm font-medium text-ink">{item.title}</strong><small className="block font-sans text-caption text-ink-muted">{item.detail}</small></span>
                        <time className="shrink-0 font-sans text-caption text-ink-muted">{item.time}</time>
                      </button>
                    </li>
                  ))}
                </ul>
              )
              : <p className="font-sans text-body-sm text-ink-muted">No movements recorded yet.</p>}
          </div>
        )}
      </Panel>
    </div>
  );
}
