// app/maintenance-preview/work-orders/[id]/page.tsx — the record as a page: the shareable address, and what a phone sees.
'use client';

import { use } from 'react';
import { EmptyState } from '@/components/ui-system';
import { PageFrame } from '../../PageFrame';
import { usePreview } from '../../store';
import { WorkOrderRecord } from '../../WorkOrderRecord';

export default function WorkOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { orders } = usePreview();
  const order = orders.find(o => String(o.id) === id);
  if (!order) return <PageFrame title="Work order" crumbs={[{ label: 'Work orders', href: '/maintenance-preview/work-orders' }, { label: id }]}><EmptyState icon="search" title="Work order not found" description="It may have been deleted, or the address is wrong." /></PageFrame>;
  return (
    <PageFrame title={`${order.machine}, ${order.title}`} crumbs={[{ label: 'Work orders', href: '/maintenance-preview/work-orders' }, { label: order.number }]}>
      <WorkOrderRecord order={order} />
    </PageFrame>
  );
}
