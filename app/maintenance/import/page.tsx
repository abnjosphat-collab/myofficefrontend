// app/maintenance/import/page.tsx — M7: import eMaint assets and PM schedules.
// Two tabs over one flow; ?kind=schedules lands on the PM tab (the schedules
// page links here that way).
'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui-system';
import { EmaintImportFlow } from './EmaintImportFlow';
import type { ImportKind } from './emaintImport';

function ImportContent() {
  const params = useSearchParams();
  const initial: ImportKind = params.get('kind') === 'schedules' ? 'schedules' : 'assets';
  return (
    <Tabs defaultValue={initial} key={initial}>
      <TabsList aria-label="What to import">
        <TabsTrigger value="assets" icon="equipment">Assets</TabsTrigger>
        <TabsTrigger value="schedules" icon="clock">PM schedules</TabsTrigger>
      </TabsList>
      <TabsContent value="assets" className="mt-4"><EmaintImportFlow kind="assets" /></TabsContent>
      <TabsContent value="schedules" className="mt-4"><EmaintImportFlow kind="schedules" /></TabsContent>
    </Tabs>
  );
}

export default function EmaintImportPage() {
  return <AppShell migrated><Suspense fallback={null}><ImportContent /></Suspense></AppShell>;
}
