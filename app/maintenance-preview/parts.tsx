// app/maintenance-preview/parts.tsx — status and priority badges built from the design system's StatusBadge, plus the page frame.
'use client';

import type { ReactNode } from 'react';
import { PageHeader, StatusBadge } from '@/components/ui-system';
import { priorityMeta } from '@/app/maintenance/meta';
import { PRIORITY_LABEL, STATUS_LABEL, STATUS_TONE, isOverdue, type Priority, type WorkOrder } from './fixtures';

export const StatusBadges = ({ w }: { w: WorkOrder }) => <><StatusBadge tone={STATUS_TONE[w.status]}>{STATUS_LABEL[w.status]}</StatusBadge>{isOverdue(w) && <StatusBadge tone="danger">Overdue</StatusBadge>}</>;
export const PriorityBadge = ({ p }: { p: Priority }) => <StatusBadge tone={priorityMeta(p).tone}>{PRIORITY_LABEL[p]}</StatusBadge>;

/** The top of every module page: breadcrumb, one title, one sentence, actions at the right (pattern R/D/G in docs/PAGE_PATTERNS.md). */
export function PageFrame({ title, description, crumb, action, children }: { title: string; description: string; crumb: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader breadcrumbs={[{ label: 'Maintenance', href: '/maintenance-preview' }, { label: crumb }]} title={title} description={description} meta="Preview with example data. Nothing here is saved." actions={action} />
      {children}
    </div>
  );
}
