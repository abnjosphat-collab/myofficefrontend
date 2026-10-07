// app/maintenance/CommentsTab.tsx — the conversation on one work order, oldest first, with a box to add to it. A viewer reads but cannot comment.
'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button, DataRegion, EmptyState, Field, Textarea, Notice, deriveDataStatus, isTransientStatus } from '@/components/ui-system';
import { fmtDateTime } from '@/components/shared/utils';
import { useAuth } from '@/lib/auth-context';
import { useApiList } from '@/lib/useApiList';
import { addWorkOrderComment } from './api';
import type { WorkOrderComment } from './types';

export function CommentsTab({ orderId, active }: { orderId: string; active: boolean }) {
  const { isAtLeast } = useAuth();
  const { items, loading, loaded, error, errorStatus, refetch } = useApiList<WorkOrderComment>(`/api/maintenance/work-orders/${orderId}/comments`, undefined, { enabled: active });
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const status = deriveDataStatus({ loaded, loading, error, errorStatus, count: items.length, transient: isTransientStatus(errorStatus) });

  const send = async () => {
    if (!draft.trim()) return;
    setPending(true); setSendError(null);
    try {
      await addWorkOrderComment(orderId, draft.trim());
      setDraft('');
      toast.success('Comment added.');
      await refetch();
    } catch (e) { setSendError(e instanceof Error ? e.message : 'The comment was not saved.'); }
    finally { setPending(false); }
  };

  return (
    <div className="flex flex-col gap-4">
      <DataRegion
        status={status} subject="the comments" error={error} onRetry={() => void refetch()}
        empty={<EmptyState icon="chat" title="No comments yet" description="Add a note for the next person: what was found, what was ordered, what is left to do." />}
      >
        <ul className="flex flex-col gap-3">
          {items.map(c => (
            <li key={c.id} className="rounded-control bg-surface-subtle p-3">
              <p className="font-sans text-caption text-ink-muted">{c.author_name || 'Unknown user'}, {fmtDateTime(c.created_at)}</p>
              <p className="mt-0.5 whitespace-pre-wrap font-sans text-body text-ink [overflow-wrap:anywhere]">{c.body}</p>
            </li>
          ))}
        </ul>
      </DataRegion>
      {isAtLeast('user') ? (
        <div className="flex flex-col gap-2">
          <Field label="Add a comment"><Textarea rows={3} value={draft} maxLength={4000} onChange={e => setDraft(e.target.value)} placeholder="What was found, ordered or left to do" /></Field>
          {sendError && <Notice tone="danger" title="The comment was not saved">{sendError}</Notice>}
          <div className="flex justify-end"><Button variant="primary" icon="save" pending={pending} disabled={!draft.trim()} onClick={() => void send()}>Add comment</Button></div>
        </div>
      ) : <p className="font-sans text-body-sm text-ink-muted">Your account can read comments but not add them.</p>}
    </div>
  );
}
