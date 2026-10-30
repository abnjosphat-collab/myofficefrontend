// app/tools/ToolsNotifications.tsx — the bell: what needs attention in the chosen department (overdue returns, held tools,
// checks due, investigations, password requests, new feedback). Opening it marks the notifications as viewed.
'use client';

import { BellBadge, Button, Icon, IconButton, Popover, PopoverContent, PopoverTrigger } from '@/components/ui-system';
import type { IconMeaning } from '@/components/ui-system/foundations/icon-meanings';
import { useRiseKey } from '@/components/app-shell/useRiseKey';

export type ToolAttentionCounts = { overdue: number; attention: number; inspectionDue: number; investigationsOverdue: number; overdueEscalations: number; passwordRequests: number; feedback: number; toolboxDue: number; toolboxOverdue: number };

function Row({ icon, title, detail, onClick }: { icon: IconMeaning; title: string; detail: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="focus-ring flex w-full items-start gap-3 rounded-sm px-2 py-2 text-left transition-colors hover:bg-surface-subtle">
      <span className="mt-0.5 text-ink-muted"><Icon name={icon} size="sm" /></span>
      <span className="min-w-0 flex-1">
        <strong className="block font-sans text-body-sm font-medium text-ink">{title}</strong>
        <small className="block font-sans text-caption text-ink-muted">{detail}</small>
      </span>
      <Icon name="chevron-right" size="xs" className="mt-1 text-ink-muted" />
    </button>
  );
}


/** Pure — the Tools bell is urgent when something is overdue: a return, an investigation, or an escalation. Holds, scheduled checks and password requests stay dark green. Exported for tests. */
export function toolsBellIsUrgent(counts: ToolAttentionCounts): boolean {
  return counts.overdue + counts.investigationsOverdue + counts.overdueEscalations + counts.toolboxOverdue > 0;
}

export function ToolsNotifications({ counts, unread, unavailable, loading, onRetry, onViewed, onShowOverdue, onShowInspection, onShowAccounts, onShowFeedback, onShowToolbox }: {
  counts: ToolAttentionCounts;
  unread: number;
  unavailable?: string;
  loading?: boolean;
  onRetry: () => void;
  onViewed: () => void | Promise<void>;
  onShowFeedback: () => void;
  onShowOverdue: () => void;
  onShowToolbox: () => void;
  onShowInspection: () => void;
  onShowAccounts: () => void;
}) {
  const total = counts.overdue + counts.attention + counts.inspectionDue + counts.investigationsOverdue + counts.toolboxDue + counts.toolboxOverdue + counts.passwordRequests + counts.feedback;
  const bounceKey = useRiseKey(unread);
  return (
    <Popover onOpenChange={open => { if (open) void onViewed(); }}>
      <div className="relative">
        <PopoverTrigger asChild>
          <IconButton icon={unavailable ? 'warning' : 'bell'} variant="ghost"
            label={unavailable ? 'Tool notifications unavailable' : `${unread} unread tool notifications`} bounceTrigger={bounceKey} />
        </PopoverTrigger>
        {unread > 0 && <BellBadge value={unread} urgent={toolsBellIsUrgent(counts)} />}
      </div>
      <PopoverContent align="end" className="w-80 p-3">
        <div className="mb-2">
          <strong className="block font-sans text-body-sm font-semibold text-ink">Notifications</strong>
          <small className="font-sans text-caption text-ink-muted">{total ? (unread ? `${unread} new · ${total} need attention` : `${total} active · viewed`) : 'You are all caught up'}</small>
        </div>
        {unavailable ? (
          <div className="flex flex-col gap-2 py-2">
            <strong className="font-sans text-body-sm font-medium text-ink">Notifications unavailable</strong>
            <small className="font-sans text-caption text-ink-muted">{unavailable}</small>
            <Button disabled={loading} onClick={onRetry}>{loading ? 'Retrying…' : 'Retry'}</Button>
          </div>
        ) : total ? (
          <div className="flex flex-col">
            {counts.overdue > 0 && <Row icon="overdue" title={`${counts.overdue} overdue ${counts.overdue === 1 ? 'return' : 'returns'}`} detail={counts.overdueEscalations ? `${counts.overdueEscalations} exceeded the six-hour reporting threshold.` : 'Review tools past their expected return time.'} onClick={onShowOverdue} />}
            {counts.attention > 0 && <Row icon="warning" title={`${counts.attention} held for inspection`} detail="Check condition notes before returning to service." onClick={onShowInspection} />}
            {counts.inspectionDue > 0 && <Row icon="success" title={`${counts.inspectionDue} scheduled ${counts.inspectionDue === 1 ? 'check' : 'checks'} due`} detail="Complete the required inspection or maintenance before issue." onClick={onShowInspection} />}
            {counts.investigationsOverdue > 0 && <Row icon="warning" title={`${counts.investigationsOverdue} overdue ${counts.investigationsOverdue === 1 ? 'investigation' : 'investigations'}`} detail="Close the tool incident investigation without further delay." onClick={onShowInspection} />}
            {counts.toolboxOverdue > 0 && <Row icon="warning" title={`${counts.toolboxOverdue} overdue toolbox ${counts.toolboxOverdue === 1 ? 'check' : 'checks'}`} detail="A set missed its monthly verification. Record it now." onClick={onShowToolbox} />}
            {counts.toolboxDue > 0 && <Row icon="success" title={`${counts.toolboxDue} toolbox ${counts.toolboxDue === 1 ? 'check' : 'checks'} due`} detail="This month's set verification is waiting to be recorded." onClick={onShowToolbox} />}
            {counts.passwordRequests > 0 && <Row icon="user" title={`${counts.passwordRequests} password reset ${counts.passwordRequests === 1 ? 'request' : 'requests'}`} detail="Set a new password from Account access, then tell the account holder." onClick={onShowAccounts} />}
            {counts.feedback > 0 && <Row icon="edit" title={`${counts.feedback} new feedback`} detail="Read what people sent from the feedback inbox." onClick={onShowFeedback} />}
          </div>
        ) : (
          <p className="py-2 font-sans text-body-sm text-ink-muted">Nothing needs attention. No overdue returns, scheduled checks, toolbox checks, holds, investigations, password requests or new feedback.</p>
        )}
        <p className="mt-2 border-t border-line-subtle pt-2 font-sans text-caption text-ink-muted">Notifications follow the selected department.</p>
      </PopoverContent>
    </Popover>
  );
}
