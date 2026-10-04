// app/sheq/types.ts — the SHEQ dashboard's data model: the raw per-module record bag, the computed cross-module
// stats shapes, and small UI data shapes (MonthBucket, Comment). Component prop interfaces stay in page.tsx.

export type QuickRange = '7d' | '30d' | '90d' | '6m' | 'all';
export type ModuleKey = 'nm' | 'ws' | 'vfl' | 'pto' | 'insp' | 'pach';

export interface MonthBucket { label: string; year: number; month: number; count: number; }

// Near-miss records carry no status, priority or severity in the backend, so only the section split is real.
export interface NMStats { total: number; mechanical: number; electrical: number; general: number; }
export interface WSStats { total: number; actDone: number; actPend: number; actProg: number; actTotal: number; }
export interface VFLStats { total: number; safe: number; unsafe: number; draft: number; submitted: number; closed: number; actDone: number; actPend: number; actProg: number; actTotal: number; }
export interface PTOStats { total: number; highRisk: number; initial: number; followup: number; actDone: number; actPend: number; actProg: number; actTotal: number; }
export interface InspStats { total: number; draft: number; submitted: number; approved: number; rejected: number; openFindings: number; closedFindings: number; criticalFindings: number; overdueFindings: number; }
export interface PachStats { total: number; intentional: number; unintentional: number; draft: number; submitted: number; reviewed: number; closed: number; }
export interface Totals { totalReports: number; totalActions: number; totalActionsDone: number; totalActionsProg: number; totalActionsPend: number; }

/** One input to the safety score. `value` is a percentage, or null when the module has no records to judge. */
export interface ScorePart { key: string; label: string; value: number | null; num: number; den: number; }

export interface ComputedStats {
  nm: NMStats; ws: WSStats; vfl: VFLStats; pto: PTOStats; insp: InspStats; pach: PachStats;
  totals: Totals;
  /** Mean of the score parts that have data; null when none do (an empty period is not "good standing"). */
  safetyScore: number | null;
  scoreParts: ScorePart[];
  months: MonthBucket[];
  moduleMonthly: Record<ModuleKey, number[]>;
}

/** A record from one of the six modules. Their shapes differ and the dashboard reads only a few fields from each. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Rec = Record<string, any>;
export interface RawData { nm: Rec[]; ws: Rec[]; vfl: Rec[]; pto: Rec[]; insp: Rec[]; pach: Rec[]; }

export interface Comment { id: string; text: string; author: string; ts: string; }
