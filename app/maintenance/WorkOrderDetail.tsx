// app/maintenance/WorkOrderDetail.tsx — one work order in full, in the three steps it passes through: the request (read only), the
// artisan's report, and the foreman's sign-off. A save in either step replaces the work order everywhere, and both forms restart
// from what the server now holds.
'use client';

import { useState } from 'react';
import { Button, Dialog, Progress, StatusBadge, Tabs, TabsContent, TabsList, TabsTrigger, Fact, FactList } from '@/components/ui-system';
import { fmtDate } from '@/components/shared/utils';
import { ArtisanReportForm } from './ArtisanReportForm';
import { ForemanSignoff } from './ForemanSignoff';
import { isOverdue } from './helpers';
import { classificationLabel, priorityMeta, statusMeta } from './meta';
import type { WorkOrder } from './types';

export function WorkOrderDetail({ order, onClose, onEdit, onDelete, onSaved }: {
  order: WorkOrder | null; onClose: () => void; onEdit: (w: WorkOrder) => void; onDelete: (w: WorkOrder) => void; onSaved: (w: WorkOrder) => void;
}) {
  const [tab, setTab] = useState('artisan');
  const [seen, setSeen] = useState<string | null>(null);
  if ((order ? String(order.id) : null) !== seen) { setSeen(order ? String(order.id) : null); setTab('artisan'); }
  const w = order;
  const status = w ? statusMeta(w.status) : null;
  const priority = w ? priorityMeta(w.priority) : null;
  const overdue = w ? isOverdue(w) : false;
  return (
    <Dialog
      open={!!w} onOpenChange={o => { if (!o) onClose(); }} size="xl" title={w ? `Work order ${w.work_order_number}` : 'Work order'} description={w?.equipment_info}
      footer={w && (<><Button variant="danger" icon="delete" onClick={() => onDelete(w)}>Delete</Button><Button icon="edit" onClick={() => onEdit(w)}>Edit request</Button><Button onClick={onClose}>Close</Button></>)}
    >
      {w && status && priority && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
            <StatusBadge tone={priority.tone}>{priority.label} priority</StatusBadge>
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
            </TabsContent>
            {/* The forms start from the saved work order, so they restart after every save. */}
            <TabsContent value="artisan" className="mt-4"><ArtisanReportForm key={`${w.id}-${w.updated_at}`} order={w} onSaved={onSaved} /></TabsContent>
            <TabsContent value="foreman" className="mt-4"><ForemanSignoff key={`${w.id}-${w.updated_at}`} order={w} onSaved={onSaved} /></TabsContent>
          </Tabs>
        </div>
      )}
    </Dialog>
  );
}
