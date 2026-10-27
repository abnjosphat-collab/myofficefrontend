// app/maintenance/print/page.tsx — one work order as a clean, printable job
// card (M8): the request, the artisan's report, the foreman's sign-off and,
// for breakdowns, the downtime. Own chrome (no AppShell): on paper only the
// card shows, with handwritten signature lines for the site.
'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Button, EmptyState } from '@/components/ui-system';
import { PrintJobCardView } from './PrintJobCardView';

function PrintContent() {
  const params = useSearchParams();
  const open = params?.get('open')?.trim() ?? '';
  if (!open) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col justify-center gap-4 p-6">
        <h1 className="font-display text-title font-semibold text-ink">Print job card</h1>
        <EmptyState
          icon="wrench" title="Choose a job"
          description="Open a work order on the register to print its job card."
          action={<Button variant="primary" icon="back" asChild><Link href="/maintenance">Back to maintenance</Link></Button>}
        />
      </main>
    );
  }
  return <PrintJobCardView workOrderId={open} />;
}

export default function PrintPage() {
  return <Suspense fallback={null}><PrintContent /></Suspense>;
}
