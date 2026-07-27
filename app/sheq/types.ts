// app/sheq/types.ts — the SHEQ dashboard's data model: the raw per-module record bag,
// the computed cross-module stats shapes, and small chart/UI data shapes (DonutSegment,
// MonthBucket, Comment). Split out of page.tsx as part of the standing "decompose on
// touch" convention. Component *prop* interfaces stay in page.tsx — they're coupled to
// one component, not the page's data contract.

export type QuickRange = '7d' | '30d' | '90d' | '6m' | 'all';

export interface DonutSegment { value: number; color: string; label?: string; }
export interface MonthBucket { label: string; year: number; month: number; count: number; }

export interface NMStats { total: number; open: number; closed: number; high: number; }
export interface WSStats { total: number; actDone: number; actPend: number; actProg: number; actTotal: number; }
export interface VFLStats { total: number; safe: number; unsafe: number; draft: number; submitted: number; closed: number; actDone: number; actPend: number; actProg: number; actTotal: number; }
export interface PTOStats { total: number; highRisk: number; initial: number; followup: number; actDone: number; actPend: number; actProg: number; actTotal: number; }
export interface InspStats { total: number; draft: number; submitted: number; approved: number; rejected: number; openFindings: number; closedFindings: number; criticalFindings: number; overdueFindings: number; }
export interface PachStats { total: number; intentional: number; unintentional: number; draft: number; submitted: number; reviewed: number; closed: number; }
export interface Totals { totalReports: number; totalActions: number; totalActionsDone: number; totalActionsProg: number; totalActionsPend: number; }

export interface ComputedStats {
  nm: NMStats; ws: WSStats; vfl: VFLStats; pto: PTOStats; insp: InspStats; pach: PachStats;
  totals: Totals; safetyScore: number; months: MonthBucket[];
  moduleMonthly: { nm: number[]; ws: number[]; vfl: number[]; pto: number[]; insp: number[]; pach: number[] };
}

export interface RawData { nm: any[]; ws: any[]; vfl: any[]; pto: any[]; insp: any[]; pach: any[]; }

export interface Comment { id: string; text: string; author: string; ts: string; }
