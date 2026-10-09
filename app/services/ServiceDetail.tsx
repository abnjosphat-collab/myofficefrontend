// app/services/ServiceDetail.tsx — one job in full: its details, the six approvals (each saved on its own), and its attachments.
'use client';

import { useState } from 'react';
import { Button, Dialog, Progress, StatusBadge, Tabs, TabsContent, TabsList, TabsTrigger, Fact, FactList } from '@/components/ui-system';
import { fmtDate } from '@/components/shared/utils';
import { AttachmentsPanel } from './AttachmentsPanel';
import { PipelineEditor } from './PipelineEditor';
import { STAGE_COUNT } from './meta';
import { references, statusOf, type StageDraft } from './serviceLogic';
import type { StageKey } from './meta';
import type { ServiceRecord } from './types';

export function ServiceDetail({ record, who, onClose, onEdit, onDelete, onSaveStage }: {
  record: ServiceRecord | null; who: string; onClose: () => void; onEdit: (r: ServiceRecord) => void; onDelete: (r: ServiceRecord) => void; onSaveStage: (id: string, key: StageKey, d: StageDraft, signature?: string) => Promise<void>;
}) {
  const [tab, setTab] = useState('pipeline');
  const status = record ? statusOf(record) : null;
  const [seen, setSeen] = useState<string | null>(null);
  if ((record?.id ?? null) !== seen) { setSeen(record?.id ?? null); setTab('pipeline'); }
  return (
    <Dialog
      open={!!record} onOpenChange={o => { if (!o) onClose(); }} size="xl"
      title={record?.description || 'Service'} description={record ? [record.supplier, record.date && fmtDate(record.date)].filter(Boolean).join(', ') || undefined : undefined}
      footer={record && (<><Button variant="danger" icon="delete" onClick={() => onDelete(record)}>Delete</Button><Button onClick={onClose}>Close</Button><Button variant="primary" icon="edit" onClick={() => onEdit(record)}>Edit details</Button></>)}
    >
      {record && status && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
            {record.category && <StatusBadge tone="info">{record.category}</StatusBadge>}
            {references(record).map(r => <StatusBadge key={r} tone="neutral">{r}</StatusBadge>)}
          </div>
          <Progress value={(status.done / STAGE_COUNT) * 100} label={`${status.done} of ${STAGE_COUNT} approvals complete`} />
          <FactList columns={3}>
            <Fact label="Supplier">{record.supplier}</Fact><Fact label="Contact person">{record.contact_person}</Fact><Fact label="Amount">{record.amount}</Fact>
          </FactList>
          {record.general_comments && <div className="rounded-control bg-surface-subtle p-3"><p className="font-sans text-caption text-ink-muted">General comments</p><p className="mt-1 whitespace-pre-wrap font-sans text-body text-ink [overflow-wrap:anywhere]">{record.general_comments}</p></div>}
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList aria-label="Job sections">
              <TabsTrigger value="pipeline" icon="task">Approvals</TabsTrigger>
              <TabsTrigger value="attachments" icon="attachment">Attachments</TabsTrigger>
            </TabsList>
            <TabsContent value="pipeline" className="mt-4"><PipelineEditor record={record} who={who} onSave={(key, d, signature) => onSaveStage(record.id, key, d, signature)} /></TabsContent>
            <TabsContent value="attachments" className="mt-4"><AttachmentsPanel serviceId={record.id} /></TabsContent>
          </Tabs>
        </div>
      )}
    </Dialog>
  );
}
