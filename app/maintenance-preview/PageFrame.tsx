// app/maintenance-preview/PageFrame.tsx — the frame every module shares: breadcrumb, title, one primary action, and (on a phone) the one-line
// module switcher. The example-data notice is a single quiet line at the foot of the header, never a banner.
'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PageHeader, cn } from '@/components/ui-system';

const MODULES = [
  { href: '/maintenance-preview', label: 'Overview', exact: true },
  { href: '/maintenance-preview/work-orders', label: 'Work orders' },
  { href: '/maintenance-preview/requests', label: 'Requests' },
  { href: '/maintenance-preview/schedules', label: 'Schedules' },
  { href: '/maintenance-preview/planner', label: 'Planner' },
];

export function PageFrame({ title, crumbs, action, children }: { title: string; crumbs?: { label: string; href?: string }[]; action?: ReactNode; children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="flex flex-col gap-5">
      <nav aria-label="Maintenance modules" className="-mb-2 flex gap-4 overflow-x-auto border-b border-line-subtle lg:hidden">
        {MODULES.map(m => {
          const on = m.exact ? pathname === m.href : pathname.startsWith(m.href);
          return <Link key={m.href} href={m.href} aria-current={on ? 'page' : undefined} className={cn('focus-ring shrink-0 border-b-2 border-transparent py-2 font-sans text-label text-ink-muted', on && 'border-action font-semibold text-ink')}>{m.label}</Link>;
        })}
      </nav>
      <PageHeader breadcrumbs={[{ label: 'Maintenance', href: '/maintenance-preview' }, ...(crumbs ?? [{ label: title }])]} title={title} actions={action} meta="Preview with example data. Nothing here is saved." />
      {children}
    </div>
  );
}
