// components/sop-library/SopCard.tsx — one SOP in the library list. The whole card opens the viewer;
// exports and management actions live in one per-card menu (nothing is nested inside the open target).
'use client';

import { IconButton, Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger, RecordCard, StatusBadge, Tag, type Tone } from '@/components/ui-system';
import { SOP_RISK_TIER_LABEL, SOP_STATUS_LABEL, isReviewDueSoon, isReviewOverdue, type SopDocument, type SopStatus } from '@/lib/sops/types';
import { formatDate } from '@/lib/format';

export const SOP_STATUS_TONE: Record<SopStatus, Tone> = { draft: 'neutral', pilot: 'info', effective: 'success', superseded: 'warning', retired: 'neutral' };

export function SopBadges({ sop }: { sop: SopDocument }) {
  const overdue = isReviewOverdue(sop);
  const dueSoon = !overdue && isReviewDueSoon(sop);
  return (
    <span className="flex flex-wrap items-center justify-end gap-1.5">
      <StatusBadge tone={SOP_STATUS_TONE[sop.status]}>{SOP_STATUS_LABEL[sop.status]}</StatusBadge>
      <Tag>v{sop.version}</Tag>
      {sop.classification !== 'Internal' && <StatusBadge tone={sop.classification === 'Restricted' ? 'danger' : 'warning'}>{sop.classification}</StatusBadge>}
      {sop.risk_tier && <StatusBadge tone={sop.risk_tier === 3 ? 'danger' : sop.risk_tier === 2 ? 'warning' : 'neutral'}>{SOP_RISK_TIER_LABEL[sop.risk_tier]}</StatusBadge>}
      {overdue && <StatusBadge tone="danger" icon="overdue">Review overdue</StatusBadge>}
      {dueSoon && <StatusBadge tone="warning" icon="due-soon">Review due soon</StatusBadge>}
    </span>
  );
}

export function SopCard({ sop, canEdit, archived, onOpen, onEdit, onExportWord, onExportPdf, onArchive, onRestore }: {
  sop: SopDocument;
  canEdit: boolean;
  archived?: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onExportWord: () => void;
  onExportPdf: () => void;
  onArchive?: () => void;
  onRestore?: () => void;
}) {
  return (
    <RecordCard
      eyebrow={<span className="font-mono">{sop.code}</span>}
      title={sop.title}
      subtitle={sop.department}
      status={<SopBadges sop={sop} />}
      facts={[
        { label: 'Owner', value: sop.owner || 'Unassigned' },
        { label: 'Updated', value: formatDate(sop.updated_at) },
        ...(sop.next_review_date ? [{ label: 'Next review', value: formatDate(sop.next_review_date) }] : []),
        ...(sop.supersedes ? [{ label: 'Supersedes', value: sop.supersedes }] : []),
      ]}
      meta={sop.summary ? <span className="line-clamp-2">{sop.summary}</span> : undefined}
      action={(
        <Menu>
          <MenuTrigger asChild><IconButton icon="more" label={`Actions for ${sop.code}`} size="sm" /></MenuTrigger>
          <MenuContent align="end">
            <MenuItem icon="download" onSelect={onExportWord}>Export Word</MenuItem>
            <MenuItem icon="pdf" onSelect={onExportPdf}>Export PDF</MenuItem>
            {canEdit && <MenuSeparator />}
            {canEdit && !archived && <MenuItem icon="edit" onSelect={onEdit}>Edit</MenuItem>}
            {canEdit && !archived && onArchive && <MenuItem icon="archive" tone="danger" onSelect={onArchive}>Archive</MenuItem>}
            {canEdit && archived && onRestore && <MenuItem icon="reset" onSelect={onRestore}>Restore</MenuItem>}
          </MenuContent>
        </Menu>
      )}
      onOpen={onOpen}
      openLabel={`Open ${sop.code}: ${sop.title}`}
    />
  );
}
