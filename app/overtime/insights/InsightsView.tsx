// app/overtime/insights/InsightsView.tsx — four views of the filtered overtime: Overview and Analytics are counted from the records
// themselves (instant); Patterns and Causes come from the server's analysis, re-run about half a second after the filters settle.
'use client';

import { useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui-system';
import type { EmployeeLookup } from '@/hooks/useLookups';
import { tally } from '../overtimeLogic';
import type { OTRecord } from '../types';
import { useOvertimeAnalysis } from '../useOvertimeData';
import { AnalysisGate } from './AnalysisGate';
import { AnalyticsTab } from './AnalyticsTab';
import { CausesTab } from './CausesTab';
import { OverviewTab } from './OverviewTab';
import { PatternsTab } from './PatternsTab';

export function InsightsView({ records, employees, picked, onToggle }: { records: OTRecord[]; employees: EmployeeLookup[]; picked: string[]; onToggle: (employeeId: string, name: string) => void }) {
  const [tab, setTab] = useState('overview');
  const analysis = useOvertimeAnalysis(records, records.length > 0);
  const t = useMemo(() => tally(records, employees), [records, employees]);
  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList aria-label="Insight views">
        <TabsTrigger value="overview" icon="gauge">Overview</TabsTrigger>
        <TabsTrigger value="analytics" icon="analytics">Analytics</TabsTrigger>
        <TabsTrigger value="patterns" icon="activity">Patterns</TabsTrigger>
        <TabsTrigger value="causes" icon="target">Causes and actions</TabsTrigger>
      </TabsList>
      <TabsContent value="overview" className="mt-4"><OverviewTab stats={t.stats} people={t.byArtisan} count={records.length} result={analysis.result} analysing={analysis.loading} picked={picked} onToggle={onToggle} /></TabsContent>
      <TabsContent value="analytics" className="mt-4"><AnalyticsTab t={t} picked={picked} onToggle={onToggle} /></TabsContent>
      <TabsContent value="patterns" className="mt-4"><AnalysisGate analysis={analysis} count={records.length}>{r => <PatternsTab r={r} />}</AnalysisGate></TabsContent>
      <TabsContent value="causes" className="mt-4"><AnalysisGate analysis={analysis} count={records.length}>{r => <CausesTab r={r} />}</AnalysisGate></TabsContent>
    </Tabs>
  );
}
