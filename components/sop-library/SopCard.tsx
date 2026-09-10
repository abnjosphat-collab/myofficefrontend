// components/sop-library/SopCard.tsx — one SOP as an animated, expandable
// workspace. Built on RecordCard (design-system/components.tsx): its
// `headerActions` slot is already kept structurally separate from the expand
// toggle (clicks inside it don't also expand the card — see RecordCard's
// data-card-actions handling), which is exactly the "don't accidentally expand
// while editing/exporting" requirement. Section-level accordions inside use the
// same Collapse primitive as every other collapsible in the app, with the same
// reduced-motion-respecting CSS grid-row animation (Collapse itself has no
// separate reduced-motion branch — it's already a cheap opacity/height transition,
// not a large transform, which is the app-wide baseline for "purposeful, not
// gratuitous" motion).
'use client';

import { useState } from 'react';
import {
  RecordCard, StatusBadge, Collapse, useCollapseSection,
  CardIconButton, useTheme,
} from '@/components/shared/theme';
import {
  FileText, Pencil, FileDown, Download, Archive, RotateCcw, ChevronDown, User, Clock,
} from '@/components/shared/theme';
import {
  SOP_SECTION_LABELS, SOP_STATUS_LABEL, SOP_STATUS_HEX, SOP_RISK_TIER_LABEL, isReviewOverdue, isReviewDueSoon,
  type SopDocument, type SopRevision,
} from '@/lib/sops/types';

const RISK_TIER_HEX = { 1: '#94a3b8', 2: '#f59e0b', 3: '#ef4444' } as const;

export function SopCard({
  sop, canEdit, canArchive, archived, onEdit, onExportWord, onExportPdf, onArchive, onRestore,
  loadRevisions,
}: {
  sop: SopDocument;
  canEdit: boolean;
  canArchive: boolean;
  archived?: boolean;
  onEdit: () => void;
  onExportWord: () => void;
  onExportPdf: () => void;
  onArchive?: () => void;
  onRestore?: () => void;
  /** Lazily loads revision history the first time that section is opened. */
  loadRevisions: () => Promise<SopRevision[]>;
}) {
  const t = useTheme();
  const sections = useCollapseSection({
    purpose: false, scope_exclusions: false, definitions: false, trigger_outcome: false,
    roles_responsibilities: false, inputs_dependencies: false, procedure: false, controls: false,
    exceptions_escalation: false, records_retention: false, measures_review: false, training: false,
    history: false,
  });
  const [revisions, setRevisions] = useState<SopRevision[] | null>(null);
  const [revisionsLoading, setRevisionsLoading] = useState(false);

  const overdue = isReviewOverdue(sop);
  const dueSoon = !overdue && isReviewDueSoon(sop);
  const accentHex = SOP_STATUS_HEX[sop.status];

  const toggleHistory = async () => {
    sections.toggle('history');
    if (revisions === null && !sections.expanded.history) {
      setRevisionsLoading(true);
      try { setRevisions(await loadRevisions()); } finally { setRevisionsLoading(false); }
    }
  };

  return (
    <RecordCard
      icon={FileText}
      accentHex={accentHex}
      title={`${sop.code} — ${sop.title}`}
      subtitle={sop.department}
      badges={
        <>
          <StatusBadge color={accentHex} label={SOP_STATUS_LABEL[sop.status]} dot />
          <StatusBadge color={t.light ? '#334155' : '#cbd5e1'} label={`v${sop.version}`} />
          {sop.classification !== 'Internal' && (
            <StatusBadge color={sop.classification === 'Restricted' ? '#ef4444' : '#f59e0b'} label={sop.classification} />
          )}
          {sop.risk_tier && <StatusBadge color={RISK_TIER_HEX[sop.risk_tier]} label={SOP_RISK_TIER_LABEL[sop.risk_tier]} />}
          {overdue && <StatusBadge color="#ef4444" label="Review overdue" dot />}
          {dueSoon && <StatusBadge color="#f59e0b" label="Review due soon" dot />}
        </>
      }
      summary={
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <span className={`flex items-center gap-1 ${t.textMuted}`}><User className="h-3 w-3" />{sop.owner || 'Unassigned'}</span>
          <span className={`flex items-center gap-1 ${t.textFaint}`}><Clock className="h-3 w-3" />Updated {new Date(sop.updated_at).toLocaleDateString()}</span>
          {sop.next_review_date && (
            <span className={`flex items-center gap-1 ${overdue ? 'text-rose-500' : dueSoon ? 'text-amber-500' : t.textFaint}`}>
              Next review {new Date(sop.next_review_date).toLocaleDateString()}
            </span>
          )}
          {sop.supersedes && <span className={t.textFaint}>Supersedes {sop.supersedes}</span>}
        </div>
      }
      headerActions={
        <>
          {sop.summary && (
            <p className={`hidden md:block text-[11px] ${t.textFaint} max-w-[240px] truncate mr-1`} title={sop.summary}>
              {sop.summary}
            </p>
          )}
          <CardIconButton icon={Download} title="Export Word" onClick={e => { e.stopPropagation(); onExportWord(); }} />
          <CardIconButton icon={FileDown} title="Export PDF" onClick={e => { e.stopPropagation(); onExportPdf(); }} />
          {canEdit && !archived && (
            <CardIconButton icon={Pencil} title="Edit" onClick={e => { e.stopPropagation(); onEdit(); }} />
          )}
          {canArchive && !archived && onArchive && (
            <CardIconButton icon={Archive} title="Archive" onClick={e => { e.stopPropagation(); onArchive(); }} />
          )}
          {canArchive && archived && onRestore && (
            <CardIconButton icon={RotateCcw} title="Restore" onClick={e => { e.stopPropagation(); onRestore(); }} />
          )}
        </>
      }
    >
      {sop.summary && <p className={`text-[13px] ${t.textSecondary} leading-relaxed`}>{sop.summary}</p>}

      {SOP_SECTION_LABELS.map(({ key, label }) => (
        <div key={key} className={`rounded-lg border ${t.border} overflow-hidden`}>
          <button
            type="button"
            onClick={() => sections.toggle(key)}
            aria-expanded={sections.expanded[key]}
            className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-[13px] font-medium ${t.textPrimary} ${t.hoverBgSoft} transition-colors`}
          >
            {label}
            <ChevronDown className={`h-3.5 w-3.5 shrink-0 ${t.textFaint} transition-transform ${sections.expanded[key] ? 'rotate-180' : ''}`} />
          </button>
          <Collapse open={!!sections.expanded[key]}>
            <div className={`px-3 pb-3 pt-1 text-[13px] ${t.textSecondary} whitespace-pre-wrap leading-relaxed`}>
              {sop.sections[key]?.trim() || <span className={t.textFaint}>Not yet documented.</span>}
            </div>
          </Collapse>
        </div>
      ))}

      <div className={`rounded-lg border ${t.border} overflow-hidden`}>
        <button
          type="button"
          onClick={toggleHistory}
          aria-expanded={sections.expanded.history}
          className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-[13px] font-medium ${t.textPrimary} ${t.hoverBgSoft} transition-colors`}
        >
          Revision History
          <ChevronDown className={`h-3.5 w-3.5 shrink-0 ${t.textFaint} transition-transform ${sections.expanded.history ? 'rotate-180' : ''}`} />
        </button>
        <Collapse open={!!sections.expanded.history}>
          <div className="px-3 pb-3 pt-1 space-y-2">
            {revisionsLoading && <p className={`text-xs ${t.textFaint}`}>Loading history…</p>}
            {!revisionsLoading && revisions?.length === 0 && <p className={`text-xs ${t.textFaint}`}>No revisions yet.</p>}
            {!revisionsLoading && revisions?.map(rev => (
              <div key={rev.id} className={`text-xs ${t.textSecondary} border-l-2 ${t.border} pl-2.5`}>
                <div className="flex items-center gap-2">
                  <span className={`font-semibold ${t.textPrimary}`}>Rev {rev.revision_number}</span>
                  <span className={t.textFaint}>{new Date(rev.created_at).toLocaleString()}</span>
                  <span className={t.textFaint}>· {rev.author_email}</span>
                </div>
                <p className="mt-0.5">{rev.change_note}</p>
              </div>
            ))}
          </div>
        </Collapse>
      </div>
    </RecordCard>
  );
}
