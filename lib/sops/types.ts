// lib/sops/types.ts — the canonical SOP Library data contract. This is the SAME
// shape the backend persists (sop_documents + sop_revisions), the page/card UI
// renders, and the Word/PDF exporters consume — one DTO, three renderings, per
// the single-source-of-truth rule this feature was built around. Don't add a
// separate "display" or "export" shape; extend this one.
//
// The status/classification/risk-tier vocabulary and the section list below are
// modeled directly on Ozech's own SOP Governance Manual and Master SOP Template
// (not invented): status mirrors the document lifecycle table (Draft/Pilot/
// Effective/Superseded/Retired), classification mirrors Internal/Confidential/
// Restricted, risk_tier mirrors the 1/2/3 routine/material/critical tiers, and
// the section keys mirror the manual's "mandatory SOP content" list. Only
// code/title/department/owner are required — every section and every
// governance field beyond that is optional, since a Draft is filled in
// incrementally, not all at once.

export type SopStatus = 'draft' | 'pilot' | 'effective' | 'superseded' | 'retired';

export const SOP_STATUSES: SopStatus[] = ['draft', 'pilot', 'effective', 'superseded', 'retired'];

export const SOP_STATUS_LABEL: Record<SopStatus, string> = {
  draft: 'Draft',
  pilot: 'Pilot',
  effective: 'Effective',
  superseded: 'Superseded',
  retired: 'Retired',
};

// Matches how status color reads elsewhere in the app (StatusBadge takes a hex).
// Effective = emerald (the live operating standard); superseded = amber (a
// newer version exists — worth a second look); retired/draft = neutral greys;
// pilot = blue (a trial in progress).
export const SOP_STATUS_HEX: Record<SopStatus, string> = {
  draft: '#94a3b8',
  pilot: '#3b82f6',
  effective: '#10b981',
  superseded: '#f59e0b',
  retired: '#64748b',
};

export type SopClassification = 'Internal' | 'Confidential' | 'Restricted';
export const SOP_CLASSIFICATIONS: SopClassification[] = ['Internal', 'Confidential', 'Restricted'];

export type SopRiskTier = 1 | 2 | 3;
export const SOP_RISK_TIERS: SopRiskTier[] = [1, 2, 3];
export const SOP_RISK_TIER_LABEL: Record<SopRiskTier, string> = {
  1: 'Tier 1 — Routine',
  2: 'Tier 2 — Material',
  3: 'Tier 3 — Critical',
};

export interface SopSections {
  purpose: string;
  scope_exclusions: string;
  definitions: string;
  trigger_outcome: string;
  roles_responsibilities: string;
  inputs_dependencies: string;
  procedure: string;
  controls: string;
  exceptions_escalation: string;
  records_retention: string;
  measures_review: string;
  training: string;
}

export const EMPTY_SOP_SECTIONS: SopSections = {
  purpose: '',
  scope_exclusions: '',
  definitions: '',
  trigger_outcome: '',
  roles_responsibilities: '',
  inputs_dependencies: '',
  procedure: '',
  controls: '',
  exceptions_escalation: '',
  records_retention: '',
  measures_review: '',
  training: '',
};

export const SOP_SECTION_LABELS: { key: keyof SopSections; label: string }[] = [
  { key: 'purpose', label: 'Purpose' },
  { key: 'scope_exclusions', label: 'Scope & Exclusions' },
  { key: 'definitions', label: 'Definitions' },
  { key: 'trigger_outcome', label: 'Trigger & Desired Outcome' },
  { key: 'roles_responsibilities', label: 'Roles & Responsibilities' },
  { key: 'inputs_dependencies', label: 'Inputs, Prerequisites & Dependencies' },
  { key: 'procedure', label: 'Procedure' },
  { key: 'controls', label: 'Quality, Security & Compliance Controls' },
  { key: 'exceptions_escalation', label: 'Exceptions, Escalation & Deviations' },
  { key: 'records_retention', label: 'Records, Evidence & Retention' },
  { key: 'measures_review', label: 'Performance Measures & Review' },
  { key: 'training', label: 'Training & Competency' },
];

export interface SopDocument {
  id: string;
  code: string;
  title: string;
  department: string;
  summary: string;
  status: SopStatus;
  classification: SopClassification;
  risk_tier?: SopRiskTier | null;
  owner: string;
  approver?: string | null;
  supersedes?: string | null;
  version: string;
  effective_date?: string | null;
  next_review_date?: string | null;
  tags: string[];
  sections: SopSections;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  deleted_at?: string | null;
}

export interface SopRevision {
  id: string;
  sop_id: string;
  revision_number: number;
  snapshot: SopDocument;
  change_note: string;
  author_email: string;
  author_id?: string;
  created_at: string;
}

/** Payload shape for create/edit — everything but server-owned fields, plus a
 *  required-by-convention change note (the backend defaults it if blank).
 *  risk_tier is a string in the form (SelectField needs a string value; '' =
 *  unassigned) and converted to a number/undefined before the API call. */
export interface SopFormValues {
  code: string;
  title: string;
  department: string;
  summary: string;
  status: SopStatus;
  classification: SopClassification;
  risk_tier: '' | `${SopRiskTier}`;
  owner: string;
  approver: string;
  supersedes: string;
  version: string;
  effective_date: string;
  next_review_date: string;
  tags: string[];
  sections: SopSections;
  change_note: string;
}

export function emptySopForm(): SopFormValues {
  return {
    code: '', title: '', department: '', summary: '', status: 'draft',
    classification: 'Internal', risk_tier: '',
    owner: '', approver: '', supersedes: '', version: '0.1',
    effective_date: '', next_review_date: '',
    tags: [], sections: { ...EMPTY_SOP_SECTIONS }, change_note: '',
  };
}

export function sopToFormValues(sop: SopDocument): SopFormValues {
  return {
    code: sop.code, title: sop.title, department: sop.department, summary: sop.summary,
    status: sop.status, classification: sop.classification,
    risk_tier: sop.risk_tier ? (String(sop.risk_tier) as `${SopRiskTier}`) : '',
    owner: sop.owner, approver: sop.approver ?? '', supersedes: sop.supersedes ?? '', version: sop.version,
    effective_date: sop.effective_date ?? '', next_review_date: sop.next_review_date ?? '',
    tags: sop.tags, sections: { ...EMPTY_SOP_SECTIONS, ...sop.sections }, change_note: '',
  };
}

/** Converts form values to the API payload shape — risk_tier as a number or
 *  undefined, never the empty-string placeholder SelectField needs. */
export function formValuesToPayload(values: SopFormValues): Omit<SopFormValues, 'risk_tier'> & { risk_tier?: SopRiskTier } {
  const { risk_tier, ...rest } = values;
  return { ...rest, risk_tier: risk_tier ? (Number(risk_tier) as SopRiskTier) : undefined };
}

/** True when next_review_date has passed. */
export function isReviewOverdue(sop: SopDocument): boolean {
  if (!sop.next_review_date) return false;
  return new Date(sop.next_review_date).getTime() < Date.now();
}

/** True when next_review_date falls within the next `days` days (default 30). */
export function isReviewDueSoon(sop: SopDocument, days = 30): boolean {
  if (!sop.next_review_date) return false;
  const ms = new Date(sop.next_review_date).getTime() - Date.now();
  return ms >= 0 && ms <= days * 24 * 60 * 60 * 1000;
}
