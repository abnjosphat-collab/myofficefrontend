// app/tools/ToolsSections.tsx — the body of whichever section is open. It waits for that section's data (a stated loading or
// failed state, never a misleading empty one), then shows the section.
'use client';

import { Button, DataTable, DestinationSearch, EmptyState, LoadingPulse, Notice } from '@/components/ui-system';
import { ToolsAccountAccess } from './ToolsAuth';
import { ToolsAnalytics } from './ToolsAnalytics';
import { ToolsCompliance } from './ToolsCompliance';
import { ToolsFeedbackInbox } from './ToolsFeedbackInbox';
import { ToolsHomepage, type HomepageAttention, type HomepageStat } from './ToolsHomepage';
import { ToolsPeople } from './ToolsPeople';
import { ToolsSectionBar } from './ToolsSectionBar';
import { ToolsSourceRegisters } from './ToolsSourceRegisters';
import { RegisterView } from './RegisterView';
import type { ToolsWorkspace } from './useToolsWorkspace';

function DataState({ title, state, onRetry }: { title: string; state: { loaded: boolean; loading: boolean; error?: string }; onRetry: () => void }) {
  if (state.loading && !state.loaded) return <LoadingPulse label={`Loading ${title.toLowerCase()}`} />;
  if (state.error) {
    return <Notice tone="warning" title={`${title} could not be loaded`} action={<Button size="sm" onClick={onRetry} pending={state.loading}>Try again</Button>}>{state.error}</Notice>;
  }
  return null;
}

export function ToolsSections({ w }: { w: ToolsWorkspace }) {
  const { tab, currentAccount, sourceState, activeSourceState, activeSourceTitle } = w;
  const manage = !!currentAccount && ['admin', 'issuer'].includes(currentAccount.role);

  if (w.sessionChecking) return <LoadingPulse label="Loading the Tools workspace" />;
  if (tab === 'homepage') {
    if (currentAccount && !sourceState.tools.loaded && !sourceState.tools.error) return <LoadingPulse label="Loading the overview" />;
    return (
      <div className="flex flex-col gap-5">
      {/* The same workspace search as the sidebar, here at the top of the overview, so it is one step away even when the sidebar is folded. */}
      <div className="w-full max-w-xs">
      <DestinationSearch
        value={w.search} onValueChange={w.setSearch} results={w.workspaceSearchResults}
        onChoose={result => { const original = w.workspaceSearchResults.find(item => item.id === result.id); if (original) w.chooseSearchResult(original); }}
        placeholder="Search…" label="Search the Tools workspace"
      />
      </div>
      <ToolsHomepage
        stats={w.homeStats as HomepageStat[]} attention={w.homeAttention as HomepageAttention[]}
        movements={w.activity.slice(0, 5).map(event => ({ id: event.id, title: event.title, detail: event.detail, time: event.time }))}
        historyFailed={!!sourceState.history.error} historyLoading={w.panelLoading('history')} attentionLoading={w.panelLoading('compliance')} attentionFailed={!!sourceState.compliance.error}
        sections={w.visibleTabs.filter(item => item.value !== 'homepage')}
        scopeLabel={`Showing ${w.departmentOptions.find(option => option.value === w.department)?.label ?? 'All departments'}`}
        onNavigate={(next, filter) => w.filterTo(filter, next)} onRetry={w.retryWorkspace}
        onIssue={() => w.openManageModal({ kind: 'bulk-issue' })} canIssue={w.counts.available > 0}
      />
      </div>
    );
  }
  if (currentAccount && !activeSourceState.loaded) return <DataState title={activeSourceTitle} state={activeSourceState} onRetry={w.retryWorkspace} />;

  const failed = <DataState title={activeSourceTitle} state={activeSourceState} onRetry={w.retryWorkspace} />;
  switch (tab) {
    case 'accounts': return <>{failed}<ToolsAccountAccess accounts={w.accounts} departments={w.departments} requestUsernames={w.notificationAlerts.filter(alert => alert.kind === 'password_request' && alert.username).map(alert => alert.username as string)} onUpdateRole={w.updateAccountRole} onSetPassword={w.setAccountPassword} /></>;
    case 'compliance':
      return (
        <>{failed}
          <ToolsCompliance tools={w.tools} employees={w.employees} competencies={w.complianceData.competencies} inspections={w.complianceData.inspections} incidents={w.complianceData.incidents}
            canManage={manage} onSaveCompetency={w.saveCompetency} onRecordInspection={w.recordInspection} onReportIncident={w.reportIncident} onCloseIncident={w.closeIncident} onOpenEmployees={() => w.setTab('employees')} />
        </>
      );
    case 'sources': return <>{failed}<ToolsSourceRegisters items={w.sourceRegisters} search={w.search} onUpload={w.openSourceRegister} /></>;
    case 'analytics': return <>{failed}<ToolsAnalytics usage={w.usage} errors={w.clientErrors} feedback={w.feedbackRecords} /></>;
    case 'feedback': return <>{failed}<ToolsFeedbackInbox items={w.feedbackRecords} onAdd={() => w.setModal({ kind: 'feedback' })} /></>;
    case 'employees':
      return (
        <>{failed}<ToolsSectionBar w={w} />
          <ToolsPeople onDeactivateMany={w.options.showRemoval ? w.deactivateEmployees : undefined} allowDeactivate={w.options.showRemoval} employees={w.employees} tools={w.tools} competencies={w.complianceData.competencies}
            approvals={{ state: sourceState.compliance.loaded ? 'ready' : sourceState.compliance.error ? 'failed' : 'loading', message: sourceState.compliance.error || undefined, onRetry: () => { void w.reloadWorkspace(); } }}
            search={w.search} canManage={manage} onAdd={() => w.openManageModal({ kind: 'employee' })} onIssue={employee => w.openAction('issue', undefined, employee)} onEditNumber={employee => w.openManageModal({ kind: 'edit-employee-number', employee })} onSaveCompetency={w.saveCompetency} onSetActive={w.setEmployeeActive} />
        </>
      );
    case 'activity':
      return (
        <>{failed}<ToolsSectionBar w={w} />
          {w.visibleActivity.length === 0
            ? <EmptyState icon="history" title="No history yet" description="Issue and return records will appear here with the employee, recorder and dates." />
            : (
              <DataTable
                caption="Issue and return history"
                rows={w.visibleActivity}
                getRowId={event => event.id}
                onRowActivate={event => w.setSelectedId(event.toolId)}
                columns={[
                  { id: 'event', header: 'Event', sticky: true, cell: event => <strong className="font-medium text-ink">{event.title}</strong> },
                  { id: 'detail', header: 'Details', hideBelow: 'md', cell: event => <>{event.detail}{event.recordedBy ? <small className="block text-ink-muted">Recorded by {event.recordedBy}</small> : null}</> },
                  { id: 'time', header: 'When', width: '12rem', cell: event => <span className="text-ink-muted">{event.time}</span> },
                ]}
              />
            )}
        </>
      );
    default: {
      const { visibleTools, activeTools, department } = w;
      return (
        <>{failed}<ToolsSectionBar w={w} />
          {visibleTools.length === 0
            ? (
              <EmptyState icon={activeTools.length ? 'search' : 'equipment'} title={activeTools.length ? 'No matching equipment' : 'Start your equipment register'}
                description={activeTools.length ? 'Try fewer filters or a different search.' : `Add the first tool or equipment item for ${department === 'all' ? 'your operation' : department}.`}
                action={<Button variant="primary" onClick={activeTools.length ? w.clearFilters : () => w.openManageModal({ kind: 'new' })}>{activeTools.length ? 'Clear search & filters' : 'Add the first item'}</Button>} />
            )
            : <RegisterView tools={visibleTools} view={w.view} onSelect={w.setSelectedId} onAction={(kind, tool) => w.openAction(kind, tool)} onArchiveMany={w.options.showRemoval && tab === 'register' && manage ? w.archiveTools : undefined} />}
        </>
      );
    }
  }
}
