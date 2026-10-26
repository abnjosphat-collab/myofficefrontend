// app/equipment/history/page.tsx — one machine's history (M6): the jobs, breakdowns,
// planned work, spares, hours and measures for the register item named by ?equipment=<id>.
'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { AppShell } from '@/components/app-shell';
import { Button, EmptyState, PageHeader } from '@/components/ui-system';
import { MachineHistoryView } from './MachineHistoryView';

function HistoryContent() {
  const params = useSearchParams();
  const raw = params?.get('equipment')?.trim() ?? '';
  const equipmentId = /^\d+$/.test(raw) ? raw : null;
  if (!equipmentId) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader
          breadcrumbs={[{ label: 'Equipment', href: '/equipment' }, { label: 'History' }]}
          title="Machine history"
          description="One machine: its jobs, breakdowns, planned work, spares, hours and measures."
        />
        <EmptyState
          icon="equipment" title="Choose a machine"
          description="Pick a machine on the register to see its history."
          action={<Button variant="primary" icon="back" asChild><Link href="/equipment">Back to the register</Link></Button>}
        />
      </div>
    );
  }
  return <MachineHistoryView equipmentId={equipmentId} />;
}

export default function HistoryPage() {
  return <AppShell migrated><Suspense fallback={null}><HistoryContent /></Suspense></AppShell>;
}
