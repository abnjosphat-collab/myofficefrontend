// app/maintenance/WorkOrderDetail.tsx — one work order in full, in the three steps it passes through: the request (read only), the
// artisan's report, and the foreman's sign-off. A save in either step replaces the work order everywhere, and both forms restart
// from what the server now holds.
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button, Dialog, Progress, StatusBadge, Tabs, TabsContent, TabsList, TabsTrigger, Fact, FactList, FactSection, DetailActions } from '@/components/ui-system';
import { fmtDate } from '@/components/shared/utils';
import { minutesToDisplay } from '../breakdowns/calcBreakdowns';
import { downtimeOf, repairOf } from '../breakdowns/breakdownLogic';
import { statusMeta as breakdownStatusMeta } from '../breakdowns/breakdownMeta';
import { ArtisanReportForm } from './ArtisanReportForm';
import { ForemanSignoff } from './ForemanSignoff';
import { recordBreakdownForWorkOrder } from './api';
import { isAwaitingSignoff, isClosable, isOverdue } from './helpers';
import { classificationLabel, priorityMeta, statusMeta } from './meta';
import type { WorkOrder } from './types';
import { useLinkedBreakdown } from './useMaintenanceData';

export function WorkOrderDetail({ order, onClose, onEdit, onDelete, onSaved, onDone, canManage }: {
  order: WorkOrder | null; onClose: () => void; onEdit: (w: WorkOrder) => void; onDelete: (w: WorkOrder) => void; onSaved: (w: WorkOrder) => void; onDone: (w: WorkOrder) => void; canManage: boolean;
}) {
  const [tab, setTab] = useState('artisan');
  const [seen, setSeen] = useState<string | null>(null);
  if ((order ? String(order.id) : null) !== seen) { setSeen(order ? String(order.id) : null); setTab('artisan'); }
  const w = order;
  const status = w ? statusMeta(w.status) : null;
  const priority = w ? priorityMeta(w.priority) : null;
  const overdue = w ? isOverdue(w) : false;
  const linked = useLinkedBreakdown(w?.id, w?.classification === 'breakdown');
  const [recording, setRecording] = useState(false);
  const record = async () => {
    if (!w) return;
    setRecording(true);
    try {
      const out = await recordBreakdownForWorkOrder(w.id);
      toast.success(out.already_linked ? 'The breakdown is already linked.' : 'Downtime record created.');
      linked.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'The breakdown could not be recorded.');
    } finally {
      setRecording(false);
    }
  };
  return (
    <Dialog
      open={!!w} onOpenChange={o => { if (!o) onClose(); }} size="xl" title={w ? `Work order ${w.work_order_number}` : 'Work order'} description={w?.equipment_info} zoomId={w ? `maintenance:order:${w.id}` : undefined}
      footer={w && (<DetailActions onDelete={canManage ? () => onDelete(w) : undefined} onClose={onClose} onEdit={() => onEdit(w)} editLabel="Edit request"><Button variant="secondary" icon="print" asChild><Link href={`/maintenance/print?open=${w.id}`}>Print job card</Link></Button>{isClosable(w) && <Button variant="primary" icon="check" onClick={() => onDone(w)}>Done</Button>}</DetailActions>)}
    >
      {w && status && priority && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
            <StatusBadge tone={priority.tone}>{priority.label} priority</StatusBadge>
            {w && isAwaitingSignoff(w) && <StatusBadge tone="info">Awaiting sign-off</StatusBadge>}
            {overdue && <StatusBadge tone="danger">Overdue</StatusBadge>}
            {classificationLabel(w) && <StatusBadge tone="info">{classificationLabel(w)}</StatusBadge>}
          </div>
          <Progress value={w.progress ?? 0} label={`Progress on ${w.equipment_info}`} />
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList aria-label="Work order steps">
              <TabsTrigger value="request" icon="documents">Work request</TabsTrigger>
              <TabsTrigger value="artisan" icon="wrench">Artisan report</TabsTrigger>
              <TabsTrigger value="foreman" icon="success">Foreman sign-off</TabsTrigger>
            </TabsList>
            <TabsContent value="request" className="mt-4">
              <FactList>
                <Fact label="Machine">{w.equipment_info}</Fact>
                <Fact label="Allocated to">{w.allocated_to || w.artisan_name}</Fact>
                <Fact label="Date raised">{w.date_raised && fmtDate(w.date_raised)}</Fact>
                <Fact label="Due date">{w.due_date && <span className={overdue ? 'font-semibold text-danger' : ''}>{fmtDate(w.due_date)}{overdue && ', overdue'}</span>}</Fact>
                <Fact label="Department">{w.to_department}</Fact>
                <Fact label="Estimated hours">{w.estimated_hours && `${w.estimated_hours} h`}</Fact>
                <Fact label="Requested by">{w.requested_by}</Fact>
                <Fact label="Authorising foreman">{w.authorising_foreman}</Fact>
                <Fact label="Job request" wide>{w.job_request_details}</Fact>
                {w.job_instructions && <Fact label="Special instructions" wide>{w.job_instructions}</Fact>}
              </FactList>
              {w.classification === 'breakdown' && (
                <div className="mt-4">
                  <FactSection
                    title="Downtime"
                    aside={linked.breakdown ? <Button size="sm" variant="ghost" asChild icon="external"><Link href={`/breakdowns?open=${linked.breakdown.id}`}>Open breakdown</Link></Button> : undefined}
                  >
                    {linked.loading ? (
                      <p className="font-sans text-body-sm text-ink-muted">Loading the breakdown…</p>
                    ) : linked.failed ? (
                      <p className="font-sans text-body-sm text-ink-muted">The breakdown could not be loaded. <Button size="sm" variant="ghost" onClick={() => linked.refetch()}>Try again</Button></p>
                    ) : linked.breakdown ? (
                      <FactList>
                        <Fact label="Breakdown date">{linked.breakdown.breakdown_date && fmtDate(linked.breakdown.breakdown_date)}</Fact>
                        <Fact label="Status">{breakdownStatusMeta(linked.breakdown.status).label}</Fact>
                        <Fact label="Downtime">{downtimeOf(linked.breakdown) > 0 ? minutesToDisplay(downtimeOf(linked.breakdown)) : ''}</Fact>
                        <Fact label="Repair time">{repairOf(linked.breakdown) > 0 ? minutesToDisplay(repairOf(linked.breakdown)) : ''}</Fact>
                      </FactList>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-sans text-body-sm text-ink-muted">No downtime recorded yet.</p>
                        <Button size="sm" variant="secondary" pending={recording} onClick={record}>Record downtime</Button>
                      </div>
                    )}
                  </FactSection>
                </div>
              )}
            </TabsContent>
            {/* The forms start from the saved work order, so they restart after every save. */}
            <TabsContent value="artisan" className="mt-4"><ArtisanReportForm key={`${w.id}-${w.updated_at}`} order={w} onSaved={onSaved} /></TabsContent>
            <TabsContent value="foreman" className="mt-4"><ForemanSignoff key={`${w.id}-${w.updated_at}`} order={w} onSaved={onSaved} canManage={canManage} /></TabsContent>
          </Tabs>
        </div>
      )}
    </Dialog>
  );
}
