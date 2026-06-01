'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Shield, RefreshCw, TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
  Target, Eye, ClipboardList, ClipboardCheck, Ban, ExternalLink, ChevronRight, MessageSquare,
  Activity, FileSearch, BarChart3, ChevronsDown, ChevronsUp, Calendar,
  Clock, Zap, Bell, ChevronDown, ChevronUp, HeartHandshake,
} from 'lucide-react';
import { usePageCollapse, MasterCollapseButton } from '@/components/shared';
import Link from 'next/link';
import { PageShell } from '@/components/PageShell';
import { toast } from 'sonner';
import { safetyFetch, glassInput } from '@/components/safety';

// ─── PALETTE ─────────────────────────────────────────────────────────────────
const C = {
  nm:   '#f59e0b',   // amber   — Near Miss
  ws:   '#f43f5e',   // rose    — Work Stoppage
  vfl:  '#10b981',   // emerald — VFL
  pto:  '#818cf8',   // indigo  — PTO
  insp: '#06b6d4',   // cyan    — SHEQ Inspections
  pach: '#a855f7',   // purple  — Pachedu behavioural observations
  done: '#34d399',   // green   — completed
  prog: '#60a5fa',   // blue    — in progress
  pend: '#fbbf24',   // yellow  — pending
  high: '#ef4444',   // red     — high risk / danger
  safe: '#10b981',   // green   — safe
};

// ─── TYPES ────────────────────────────────────────────────────────────────────
type QuickRange = '7d' | '30d' | '90d' | '6m' | 'all';

interface DonutSegment { value: number; color: string; label?: string; }

interface MonthBucket { label: string; year: number; month: number; count: number; }

interface NMStats   { total: number; open: number; closed: number; high: number; }
interface WSStats   { total: number; actDone: number; actPend: number; actProg: number; actTotal: number; }
interface VFLStats  { total: number; safe: number; unsafe: number; draft: number; submitted: number; closed: number; actDone: number; actPend: number; actProg: number; actTotal: number; }
interface PTOStats  { total: number; highRisk: number; initial: number; followup: number; actDone: number; actPend: number; actProg: number; actTotal: number; }
interface InspStats { total: number; draft: number; submitted: number; approved: number; rejected: number; openFindings: number; closedFindings: number; criticalFindings: number; overdueFindings: number; }
interface PachStats { total: number; intentional: number; unintentional: number; draft: number; submitted: number; reviewed: number; closed: number; }
interface Totals    { totalReports: number; totalActions: number; totalActionsDone: number; totalActionsProg: number; totalActionsPend: number; }

interface ComputedStats {
  nm: NMStats; ws: WSStats; vfl: VFLStats; pto: PTOStats; insp: InspStats; pach: PachStats;
  totals: Totals; safetyScore: number;
  months: MonthBucket[];
  moduleMonthly: { nm: number[]; ws: number[]; vfl: number[]; pto: number[]; insp: number[]; pach: number[] };
}

interface RawData { nm: any[]; ws: any[]; vfl: any[]; pto: any[]; insp: any[]; pach: any[]; }
interface Comment  { id: string; text: string; author: string; ts: string; }

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function getDate(r: any, module: 'nm' | 'ws' | 'vfl' | 'pto'): Date | null {
  const raw = module === 'nm'
    ? (r.submittedAt || r.date || r.created_at)
    : (r.created_at  || r.date || r.submittedAt);
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

function filterByRange(items: any[], module: 'nm' | 'ws' | 'vfl' | 'pto', from: Date | null, to: Date | null): any[] {
  if (!from && !to) return items;
  return items.filter(r => {
    const d = getDate(r, module);
    if (!d) return true;
    if (from && d < from) return false;
    if (to   && d > to)   return false;
    return true;
  });
}

function rangeToFromTo(quick: QuickRange | 'custom', customFrom: string, customTo: string): [Date | null, Date | null] {
  if (quick === 'all') return [null, null];
  if (quick === 'custom') {
    return [customFrom ? new Date(customFrom) : null, customTo ? new Date(customTo + 'T23:59:59') : null];
  }
  const now = new Date();
  const days = quick === '7d' ? 7 : quick === '30d' ? 30 : quick === '90d' ? 90 : 182;
  const from = new Date(now);
  from.setDate(from.getDate() - days);
  return [from, null];
}

function scoreColor(s: number) {
  if (s >= 80) return C.done;
  if (s >= 60) return C.nm;
  if (s >= 40) return '#f97316';
  return C.high;
}
function scoreLabel(s: number) {
  if (s >= 80) return 'Good Standing';
  if (s >= 60) return 'Needs Attention';
  if (s >= 40) return 'Concern';
  return 'Critical';
}

// ─── DATA FETCHING ────────────────────────────────────────────────────────────
async function fetchAllModules(): Promise<RawData> {
  const settled = await Promise.allSettled([
    safetyFetch<any[]>('/api/nearmiss/'),
    safetyFetch<any[]>('/api/work-stoppage/'),
    safetyFetch<any[]>('/api/vfl/'),
    safetyFetch<any[]>('/api/pto/'),
    safetyFetch<any[]>('/sheq/'),
    safetyFetch<any[]>('/api/pachedu/'),
  ]);
  const [nm, ws, vfl, pto, insp, pach] = settled.map(r =>
    r.status === 'fulfilled' && Array.isArray(r.value) ? r.value : []
  );
  return { nm, ws, vfl, pto, insp, pach };
}

// ─── STATS COMPUTATION ────────────────────────────────────────────────────────
function buildMonthly(items: any[], module: 'nm' | 'ws' | 'vfl' | 'pto', months: MonthBucket[]): number[] {
  return months.map(m => items.filter(r => {
    const d = getDate(r, module);
    return d && d.getFullYear() === m.year && d.getMonth() === m.month;
  }).length);
}

function computeStats(raw: RawData, from: Date | null, to: Date | null): ComputedStats {
  const nm   = filterByRange(raw.nm,   'nm',  from, to);
  const ws   = filterByRange(raw.ws,   'ws',  from, to);
  const vfl  = filterByRange(raw.vfl,  'vfl', from, to);
  const pto  = filterByRange(raw.pto,  'pto', from, to);
  const pach = (raw.pach || []).filter(r => {
    const d = r.date ? new Date(r.date) : (r.created_at ? new Date(r.created_at) : null);
    if (!d || isNaN(d.getTime())) return true;
    if (from && d < from) return false;
    if (to   && d > to)   return false;
    return true;
  });
  const insp = (raw.insp || []).filter(r => {
    const d = r.date ? new Date(r.date) : (r.createdAt ? new Date(r.createdAt) : null);
    if (!d || isNaN(d.getTime())) return true;
    if (from && d < from) return false;
    if (to   && d > to)   return false;
    return true;
  });

  // Near Miss — API returns no status/priority on some setups; handle gracefully
  const nmTotal  = nm.length;
  const nmOpen   = nm.filter(r => ['open','under_investigation','Open','Under Investigation'].includes(r.status ?? '')).length;
  const nmClosed = nm.filter(r => ['resolved','closed','Resolved','Closed'].includes(r.status ?? '')).length;
  const nmHigh   = nm.filter(r => ['high','critical'].includes((r.priority ?? r.severity ?? '').toLowerCase())).length;

  // Work Stoppage
  const wsTotal   = ws.length;
  const wsActions = ws.flatMap((r: any) => r.correctiveActions || []);
  const wsActDone = wsActions.filter((a: any) => a.status === 'Completed').length;
  const wsActPend = wsActions.filter((a: any) => a.status === 'Pending').length;
  const wsActProg = wsActions.filter((a: any) => a.status === 'In Progress').length;

  // VFL
  const vflTotal     = vfl.length;
  const vflSafe      = vfl.filter(r => r.behaviourCategory === 'Safe Behaviour').length;
  const vflUnsafe    = vfl.filter(r => r.behaviourCategory === 'Unsafe Behaviour').length;
  const vflDraft     = vfl.filter(r => r.status === 'draft').length;
  const vflSubmitted = vfl.filter(r => r.status === 'submitted').length;
  const vflClosed    = vfl.filter(r => r.status === 'closed').length;
  const vflActions   = vfl.flatMap((r: any) => r.actions || []);
  const vflActDone   = vflActions.filter((a: any) => a.status === 'Completed').length;
  const vflActPend   = vflActions.filter((a: any) => a.status === 'Pending').length;
  const vflActProg   = vflActions.filter((a: any) => a.status === 'In Progress').length;

  // PTO
  const ptoTotal    = pto.length;
  const ptoHighRisk = pto.filter(r => r.riskAssessment?.made === 'No' || r.riskAssessment?.identified === 'No' || r.riskAssessment?.effective === 'No').length;
  const ptoInitial  = pto.filter(r => r.observationType === 'Initial').length;
  const ptoFollowup = pto.filter(r => r.observationType === 'Follow up').length;
  const ptoActions  = pto.flatMap((r: any) => r.actionPlan || []);
  const ptoActDone  = ptoActions.filter((a: any) => a.status === 'Completed').length;
  const ptoActPend  = ptoActions.filter((a: any) => a.status === 'Pending').length;
  const ptoActProg  = ptoActions.filter((a: any) => a.status === 'In Progress').length;

  // SHEQ Inspections
  const inspTotal          = insp.length;
  const inspDraft          = insp.filter(r => r.status === 'draft').length;
  const inspSubmitted      = insp.filter(r => r.status === 'submitted').length;
  const inspApproved       = insp.filter(r => r.status === 'approved').length;
  const inspRejected       = insp.filter(r => r.status === 'rejected').length;
  const allFindings        = insp.flatMap((r: any) => r.findings || []);
  const inspOpenFindings   = allFindings.filter((f: any) => ['open', 'in-progress'].includes(f.status)).length;
  const inspClosedFindings = allFindings.filter((f: any) => f.status === 'closed').length;
  const inspCritical       = allFindings.filter((f: any) => f.priority === 'critical').length;
  const inspOverdue        = allFindings.filter((f: any) => f.status === 'overdue').length;

  // Pachedu
  const pachTotal         = pach.length;
  const pachIntentional   = pach.filter(r => r.behaviourType === 'Intentional').length;
  const pachUnintentional = pach.filter(r => r.behaviourType === 'Unintentional').length;
  const pachDraft         = pach.filter(r => r.status === 'draft').length;
  const pachSubmitted     = pach.filter(r => r.status === 'submitted').length;
  const pachReviewed      = pach.filter(r => r.status === 'reviewed').length;
  const pachClosed        = pach.filter(r => r.status === 'closed').length;

  // Totals
  const totalActionsPend = wsActPend + vflActPend + ptoActPend;
  const totalActionsProg = wsActProg + vflActProg + ptoActProg;
  const totalActionsDone = wsActDone + vflActDone + ptoActDone;
  const totalActions     = totalActionsPend + totalActionsProg + totalActionsDone;
  const totalReports     = nmTotal + wsTotal + vflTotal + ptoTotal + inspTotal + pachTotal;

  // Safety score
  const nmScore   = nmTotal   ? ((nmClosed || nmTotal - nmOpen) / nmTotal) * 100 : 100;
  const vflScore  = vflTotal  ? (vflSafe  / vflTotal) * 100 : 100;
  const ptoScore  = ptoTotal  ? ((ptoTotal - ptoHighRisk) / ptoTotal) * 100 : 100;
  const actScore  = totalActions ? (totalActionsDone / totalActions) * 100 : 100;
  const inspScore = inspTotal ? (inspApproved / inspTotal) * 100 : 100;
  // Pachedu: closed + reviewed counts as resolved
  const pachScore = pachTotal ? ((pachClosed + pachReviewed) / pachTotal) * 100 : 100;
  const safetyScore = Math.round((nmScore + vflScore + ptoScore + actScore + inspScore + pachScore) / 6);

  // Monthly buckets — driven by selected range
  const now = new Date();
  const months: MonthBucket[] = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { label: d.toLocaleDateString('en-US', { month: 'short' }), year: d.getFullYear(), month: d.getMonth(), count: 0 };
  });
  [...nm, ...ws, ...vfl, ...pto, ...insp, ...pach].forEach(r => {
    const ds = r.submittedAt || r.created_at || r.date || r.createdAt;
    if (!ds) return;
    const d = new Date(ds);
    const m = months.find(x => x.year === d.getFullYear() && x.month === d.getMonth());
    if (m) m.count++;
  });

  const inspMonthly = months.map(m => insp.filter(r => {
    const ds = r.date || r.createdAt || r.created_at;
    if (!ds) return false;
    const d = new Date(ds);
    return d.getFullYear() === m.year && d.getMonth() === m.month;
  }).length);

  const pachMonthly = months.map(m => pach.filter(r => {
    const ds = r.date || r.created_at;
    if (!ds) return false;
    const d = new Date(ds);
    return d.getFullYear() === m.year && d.getMonth() === m.month;
  }).length);

  return {
    nm:   { total: nmTotal, open: nmOpen, closed: nmClosed, high: nmHigh },
    ws:   { total: wsTotal, actDone: wsActDone, actPend: wsActPend, actProg: wsActProg, actTotal: wsActions.length },
    vfl:  { total: vflTotal, safe: vflSafe, unsafe: vflUnsafe, draft: vflDraft, submitted: vflSubmitted, closed: vflClosed, actDone: vflActDone, actPend: vflActPend, actProg: vflActProg, actTotal: vflActions.length },
    pto:  { total: ptoTotal, highRisk: ptoHighRisk, initial: ptoInitial, followup: ptoFollowup, actDone: ptoActDone, actPend: ptoActPend, actProg: ptoActProg, actTotal: ptoActions.length },
    insp: { total: inspTotal, draft: inspDraft, submitted: inspSubmitted, approved: inspApproved, rejected: inspRejected, openFindings: inspOpenFindings, closedFindings: inspClosedFindings, criticalFindings: inspCritical, overdueFindings: inspOverdue },
    pach: { total: pachTotal, intentional: pachIntentional, unintentional: pachUnintentional, draft: pachDraft, submitted: pachSubmitted, reviewed: pachReviewed, closed: pachClosed },
    totals: { totalReports, totalActions, totalActionsDone, totalActionsProg, totalActionsPend },
    safetyScore,
    months,
    moduleMonthly: {
      nm:   buildMonthly(nm,  'nm',  months),
      ws:   buildMonthly(ws,  'ws',  months),
      vfl:  buildMonthly(vfl, 'vfl', months),
      pto:  buildMonthly(pto, 'pto', months),
      insp: inspMonthly,
      pach: pachMonthly,
    },
  };
}

// ─── CHARTS ──────────────────────────────────────────────────────────────────

function DonutChart({ segments = [], size = 120, strokeWidth = 18, label, sublabel }: {
  segments?: DonutSegment[]; size?: number; strokeWidth?: number;
  label?: string | number; sublabel?: string;
}) {
  const r = (size - strokeWidth) / 2;
  const cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + (x.value || 0), 0);
  let offset = 0;
  const arcs = segments.map(seg => {
    const pct = total > 0 ? (seg.value || 0) / total : 0;
    const dash = pct * circ;
    const cur = offset;
    offset += dash;
    return { ...seg, dash, offset: cur };
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
      {total > 0 && arcs.filter(a => a.dash > 0.5).map((arc, i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="none"
          stroke={arc.color} strokeWidth={strokeWidth - 2}
          strokeDasharray={`${arc.dash} ${circ - arc.dash}`}
          strokeDashoffset={(circ / 4) - arc.offset}
          style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px`, transition: 'stroke-dasharray 0.6s ease' }}
        />
      ))}
      {label !== undefined && (
        <text x={cx} y={cy + (sublabel ? -6 : 7)} textAnchor="middle"
          fill="rgba(255,255,255,0.94)" fontSize={size > 110 ? 22 : 15} fontWeight="800">{label}</text>
      )}
      {sublabel && (
        <text x={cx} y={cy + 12} textAnchor="middle" fill="rgba(255,255,255,0.38)" fontSize={9}>{sublabel}</text>
      )}
    </svg>
  );
}

function TrendLineChart({ data = [], labels = [], color = '#60a5fa', height = 130 }: {
  data?: number[]; labels?: string[]; color?: string; height?: number;
}) {
  if (data.length < 2) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.28)', fontSize: 12 }}>
        Not enough data to display trend
      </div>
    );
  }
  const vw = 600, padL = 28, padR = 12, padT = 16, padB = 28;
  const cW = vw - padL - padR, cH = height - padT - padB;
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => ({ x: padL + (i / (data.length - 1)) * cW, y: padT + (1 - v / max) * cH, v }));
  const poly = pts.map(p => `${p.x},${p.y}`).join(' ');
  const area = `${pts[0].x},${padT + cH} ${poly} ${pts[pts.length - 1].x},${padT + cH}`;
  return (
    <svg viewBox={`0 0 ${vw} ${height}`} style={{ width: '100%', height, display: 'block' }}>
      <defs>
        <linearGradient id={`grad-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map(t => {
        const y = padT + (1 - t) * cH;
        return (
          <g key={t}>
            <line x1={padL} y1={y} x2={vw - padR} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth={1} strokeDasharray="4 4" />
            <text x={padL - 4} y={y + 4} textAnchor="end" fill="rgba(255,255,255,0.28)" fontSize={8}>{Math.round(t * max)}</text>
          </g>
        );
      })}
      <polygon points={area} fill={`url(#grad-${color.replace('#','')})`} />
      <polyline points={poly} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={4.5} fill={color} opacity={0.9} />
          <circle cx={p.x} cy={p.y} r={2.5} fill="rgba(5,15,28,0.9)" />
          {p.v > 0 && <text x={p.x} y={p.y - 10} textAnchor="middle" fill={color} fontSize={9} fontWeight="700">{p.v}</text>}
          <text x={p.x} y={height - 3} textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize={8}>{labels[i] || ''}</text>
        </g>
      ))}
    </svg>
  );
}

function BarChart({ data = [], height = 110, barWidth = 44, gap = 18 }: {
  data?: { label: string; value: number; color?: string }[];
  height?: number; barWidth?: number; gap?: number;
}) {
  const max = Math.max(...data.map(d => d.value), 1);
  const totalW = data.length * (barWidth + gap) - gap;
  return (
    <svg width={totalW} height={height + 30} viewBox={`0 0 ${totalW} ${height + 30}`} style={{ display: 'block', overflow: 'visible' }}>
      {data.map((item, i) => {
        const barH = Math.max((item.value / max) * (height - 10), item.value > 0 ? 4 : 0);
        const x = i * (barWidth + gap);
        const y = height - barH;
        const color = item.color || '#60a5fa';
        return (
          <g key={i}>
            <rect x={x} y={2} width={barWidth} height={height - 8} rx={7} fill="rgba(255,255,255,0.04)" />
            <rect x={x} y={y} width={barWidth} height={barH} rx={7} fill={color} opacity={0.85} />
            {item.value > 0 && <text x={x + barWidth / 2} y={y - 5} textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize={11} fontWeight="700">{item.value}</text>}
            <text x={x + barWidth / 2} y={height + 20} textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize={9}>{item.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function ProgBar({ label, value, max = 100, color = '#10b981', sub }: {
  label: string; value: number; max?: number; color?: string; sub?: string;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 11, color, fontWeight: 700 }}>{Math.round(pct)}%</span>
      </div>
      <div style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.07)' }}>
        <div style={{ height: '100%', borderRadius: 999, width: `${pct}%`, background: `linear-gradient(90deg, ${color}cc, ${color})`, transition: 'width 0.7s cubic-bezier(0.4,0,0.2,1)' }} />
      </div>
      {sub && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

// ─── UI COMPONENTS ────────────────────────────────────────────────────────────

const Glass = ({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: 'rgba(5,15,28,0.74)', backdropFilter: 'blur(28px) saturate(1.5)', WebkitBackdropFilter: 'blur(28px) saturate(1.5)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 16, padding: '22px 24px', boxShadow: '0 8px 40px rgba(0,0,0,0.36)', ...style }}>
    {children}
  </div>
);

const Chip = ({ label, color }: { label: string; color: string }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: color + '22', color, border: `1px solid ${color}44` }}>{label}</span>
);

const EmptyViz = ({ text = 'No data for this period' }: { text?: string }) => (
  <div style={{ textAlign: 'center', padding: '32px 0', color: 'rgba(255,255,255,0.28)', fontSize: 12, fontStyle: 'italic' }}>{text}</div>
);

function SectionHeader({ icon, title, sub, color = 'rgba(255,255,255,0.42)' }: {
  icon: React.ReactNode; title: string; sub?: string; color?: string;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.88)' }}>
        <span style={{ color, display: 'flex' }}>{icon}</span>
        {title}
      </div>
      {sub && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)', marginTop: 4, marginLeft: 24 }}>{sub}</div>}
    </div>
  );
}

function CollapsibleSection({ title, icon, sub, children, defaultOpen = true, accent = '#60a5fa', open: controlledOpen, onToggle }: {
  title: string; icon: React.ReactNode; sub?: string; children: React.ReactNode;
  defaultOpen?: boolean; accent?: string; open?: boolean; onToggle?: () => void;
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const toggle = onToggle ?? (() => setInternalOpen(o => !o));
  return (
    <Glass style={{ padding: 0, overflow: 'hidden' }}>
      <button
        type="button"
        onClick={toggle}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: open ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ padding: 7, borderRadius: 9, background: accent + '1e' }}>
            <span style={{ color: accent, display: 'flex' }}>{icon}</span>
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.90)' }}>{title}</div>
            {sub && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)', marginTop: 2 }}>{sub}</div>}
          </div>
        </div>
        <span style={{ color: 'rgba(255,255,255,0.35)', display: 'flex' }}>
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>
      {open && <div style={{ padding: '20px 24px' }}>{children}</div>}
    </Glass>
  );
}

// ─── MODULE CARD ─────────────────────────────────────────────────────────────
function ModuleCard({ label, href, icon, color, total, donutSegments, miniStats, legend }: {
  label: string; href: string; icon: React.ReactNode; color: string; total: number;
  donutSegments: DonutSegment[];
  miniStats: { label: string; value: number; color: string }[];
  legend: { label: string; value: number; color: string }[];
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ background: hovered ? 'rgba(5,15,28,0.82)' : 'rgba(5,15,28,0.70)', backdropFilter: 'blur(24px) saturate(1.4)', WebkitBackdropFilter: 'blur(24px) saturate(1.4)', border: `1px solid ${hovered ? color + '44' : 'rgba(255,255,255,0.10)'}`, borderRadius: 14, padding: '18px 18px 14px', display: 'flex', flexDirection: 'column', gap: 12, boxShadow: hovered ? `0 8px 32px ${color}22` : '0 4px 20px rgba(0,0,0,0.28)', transition: 'all 0.25s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ padding: 8, borderRadius: 9, background: color + '22' }}>
            <span style={{ color, display: 'flex' }}>{icon}</span>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8 }}>{label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1.1 }}>{total}</div>
          </div>
        </div>
        <Link href={href} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color, background: color + '18', padding: '5px 10px', borderRadius: 8, textDecoration: 'none', fontWeight: 700, border: `1px solid ${color}30` }}>
          Open <ExternalLink size={9} />
        </Link>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <DonutChart segments={donutSegments} size={88} strokeWidth={14} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${miniStats.length}, 1fr)`, gap: 5 }}>
        {miniStats.map(({ label: l, value: v, color: c }) => (
          <div key={l} style={{ textAlign: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '7px 4px' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: c }}>{v}</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.42)', marginTop: 2, lineHeight: 1.2 }}>{l}</div>
          </div>
        ))}
      </div>

      {legend.filter(l => l.value > 0).length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {legend.filter(l => l.value > 0).map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'rgba(255,255,255,0.52)' }}>
              <div style={{ width: 7, height: 7, borderRadius: 2, background: l.color, flexShrink: 0 }} />
              {l.label}: {l.value}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── COMMENTS SECTION ────────────────────────────────────────────────────────
function CommentsSection({ open: controlledOpen, onToggle }: { open?: boolean; onToggle?: () => void } = {}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState('');
  const [author, setAuthor] = useState('');
  const [internalOpen, setInternalOpen] = useState(true);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const toggle = onToggle ?? (() => setInternalOpen(o => !o));

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    try { setComments(JSON.parse(localStorage.getItem('sheq_dash_notes') || '[]') as Comment[]); }
    catch { /* ignore */ }
  }, []);

  const persist = (updated: Comment[]) => {
    setComments(updated);
    localStorage.setItem('sheq_dash_notes', JSON.stringify(updated));
  };

  const add = () => {
    if (!text.trim()) return;
    persist([{ id: Date.now().toString(), text: text.trim(), author: author.trim() || 'Safety Manager', ts: new Date().toISOString() }, ...comments].slice(0, 50));
    setText('');
  };

  return (
    <Glass style={{ padding: 0, overflow: 'hidden' }}>
      <button type="button" onClick={toggle}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: open ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ padding: 7, borderRadius: 9, background: '#60a5fa1e' }}>
            <MessageSquare size={14} style={{ color: '#60a5fa' }} />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.90)' }}>Dashboard Notes &amp; Observations</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)', marginTop: 2 }}>{comments.length} note{comments.length !== 1 ? 's' : ''} saved locally</div>
          </div>
        </div>
        <span style={{ color: 'rgba(255,255,255,0.35)', display: 'flex' }}>{open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
      </button>
      {open && (
        <div style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input value={author} onChange={e => setAuthor(e.target.value)}
              placeholder="Your name (optional)"
              className={glassInput} style={{ width: 170 }} title="Your name" />
            <input value={text} onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); add(); } }}
              placeholder="Add a safety observation or note… (Enter to submit)"
              className={glassInput} style={{ flex: 1 }} title="Note" />
            <button type="button" onClick={add}
              style={{ background: 'rgba(96,165,250,0.18)', border: '1px solid rgba(96,165,250,0.35)', borderRadius: 9, padding: '0 16px', color: '#60a5fa', cursor: 'pointer', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
              Add
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 260, overflowY: 'auto' }}>
            {comments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'rgba(255,255,255,0.30)', fontSize: 13 }}>
                No notes yet — add safety observations, flags or reminders above.
              </div>
            ) : comments.map(c => (
              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: 'rgba(255,255,255,0.05)', borderRadius: 9, padding: '10px 13px', gap: 10, borderLeft: '3px solid #60a5fa44' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.86)', lineHeight: 1.55 }}>{c.text}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.36)', marginTop: 4 }}>
                    {c.author} · {new Date(c.ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <button type="button" onClick={() => persist(comments.filter(x => x.id !== c.id))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.28)', fontSize: 17, padding: '0 4px', lineHeight: 1, flexShrink: 0 }}>×</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </Glass>
  );
}

// ─── QUICK DATE FILTER ────────────────────────────────────────────────────────
const QUICK_OPTIONS: { key: QuickRange | 'custom'; label: string }[] = [
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
  { key: '90d', label: '90 Days' },
  { key: '6m', label: '6 Months' },
  { key: 'all', label: 'All Time' },
  { key: 'custom', label: 'Custom' },
];

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function SHEQDashboardPage() {
  const sections = usePageCollapse({ weekly: false, score: false, modules: false, analytics: false, actions: false, notes: false, ai: false });
  const [raw,         setRaw]         = useState<RawData>({ nm: [], ws: [], vfl: [], pto: [], insp: [], pach: [] });
  const [loading,     setLoading]     = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Weekly targets (persisted in localStorage) ──────────────────────────────
  const DEFAULT_TARGETS = { vfl: 2, pto: 4, insp: 7, pach: 20, nm: 5 } as const;
  type ModuleKey = keyof typeof DEFAULT_TARGETS;

  const [weeklyTargets, setWeeklyTargets] = useState<Record<ModuleKey, number>>(() => {
    try {
      const s = typeof window !== 'undefined' ? localStorage.getItem('sheq_weekly_targets') : null;
      return s ? { ...DEFAULT_TARGETS, ...JSON.parse(s) } : { ...DEFAULT_TARGETS };
    } catch { return { ...DEFAULT_TARGETS }; }
  });
  const [editingTargets, setEditingTargets] = useState(false);
  const [targetDraft,    setTargetDraft]    = useState({ ...DEFAULT_TARGETS } as Record<ModuleKey, number>);

  function saveTargets() {
    setWeeklyTargets({ ...targetDraft });
    localStorage.setItem('sheq_weekly_targets', JSON.stringify(targetDraft));
    setEditingTargets(false);
  }

  // AI analysis state
  const [aiResult,    setAiResult]    = useState<Record<string, any> | null>(null);
  const [aiLoading,   setAiLoading]   = useState(false);
  const [aiError,     setAiError]     = useState('');

  // Filters
  const [quickRange,  setQuickRange]  = useState<QuickRange | 'custom'>('all');
  const [customFrom,  setCustomFrom]  = useState('');
  const [customTo,    setCustomTo]    = useState('');
  const [showCustom,  setShowCustom]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAllModules();
      setRaw(data);
      setLastUpdated(new Date());
    } catch {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/$/, '');

  const runAiAnalysis = useCallback(async () => {
    setAiLoading(true);
    setAiError('');
    try {
      const res = await fetch(`${API_BASE}/api/ai/safety-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          near_miss:    raw.nm,
          work_stoppage: raw.ws,
          vfl:          raw.vfl,
          pto:          raw.pto,
          inspections:  raw.insp,
          pachedu:      raw.pach,
          period_label: quickRange === 'all' ? 'all time' : quickRange,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setAiResult(await res.json());
      if (!sections.expanded.ai) sections.toggle('ai');
    } catch (e) {
      setAiError(`Analysis failed: ${(e as Error).message}`);
    } finally {
      setAiLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw, quickRange]);

  // ── Weekly actuals — records created Mon–Sun this calendar week ────────────
  const weeklyActuals = useMemo(() => {
    const now   = new Date();
    const day   = now.getDay(); // 0 = Sun
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    monday.setHours(0, 0, 0, 0);

    const inWeek = (r: any): boolean => {
      const ds = r.date || r.submittedAt || r.created_at || r.createdAt || '';
      if (!ds) return false;
      const d = new Date(ds);
      return !isNaN(d.getTime()) && d >= monday;
    };

    return {
      vfl:  raw.vfl.filter(inWeek).length,
      pto:  raw.pto.filter(inWeek).length,
      insp: raw.insp.filter(inWeek).length,
      pach: raw.pach.filter(inWeek).length,
      nm:   raw.nm.filter(inWeek).length,
    } as Record<ModuleKey, number>;
  }, [raw]);

  // Week label e.g. "Mon 26 May – Sun 1 Jun 2026"
  const weekLabel = useMemo(() => {
    const now    = new Date();
    const day    = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    return `${fmt(monday)} – ${fmt(sunday)} ${sunday.getFullYear()}`;
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(load, 5 * 60 * 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, load]);

  const [fromDate, toDate] = useMemo(() => rangeToFromTo(quickRange as QuickRange, customFrom, customTo), [quickRange, customFrom, customTo]);
  const stats = useMemo(() => computeStats(raw, fromDate, toDate), [raw, fromDate, toDate]);

  const score = stats.safetyScore;
  const sc = scoreColor(score);
  const trendData = stats.months.map(m => m.count);
  const trendLabels = stats.months.map(m => m.label);
  const { totals } = stats;

  // Alerts
  const alerts: { text: string; color: string }[] = [];
  if (stats.nm.high > 0) alerts.push({ text: `${stats.nm.high} high/critical near miss report${stats.nm.high > 1 ? 's' : ''} require attention`, color: C.high });
  if (stats.nm.open > 0) alerts.push({ text: `${stats.nm.open} near miss report${stats.nm.open > 1 ? 's' : ''} open / under investigation`, color: C.nm });
  if (stats.pto.highRisk > 0) alerts.push({ text: `${stats.pto.highRisk} PTO observation${stats.pto.highRisk > 1 ? 's' : ''} flagged as high risk`, color: '#f97316' });
  if (totals.totalActionsPend > 5) alerts.push({ text: `${totals.totalActionsPend} corrective actions pending — review required`, color: C.pend });
  if (stats.insp.criticalFindings > 0) alerts.push({ text: `${stats.insp.criticalFindings} critical inspection finding${stats.insp.criticalFindings > 1 ? 's' : ''} require immediate action`, color: C.high });
  if (stats.insp.overdueFindings > 0) alerts.push({ text: `${stats.insp.overdueFindings} inspection finding${stats.insp.overdueFindings > 1 ? 's' : ''} are overdue`, color: '#f97316' });

  const selectRange = (key: QuickRange | 'custom') => {
    setQuickRange(key);
    setShowCustom(key === 'custom');
  };

  return (
    <PageShell>
      <main className="container mx-auto px-4 py-6" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* ── HERO ── */}
        <Glass style={{ padding: '20px 26px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
            <div>
              <nav style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'rgba(255,255,255,0.40)', marginBottom: 8 }}>
                <span>Home</span><ChevronRight size={11} />
                <span style={{ color: 'rgba(255,255,255,0.72)', fontWeight: 600 }}>SHEQ Dashboard</span>
              </nav>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: '#fff', fontFamily: 'Montserrat, sans-serif', letterSpacing: -0.5, marginBottom: 4 }}>
                SHEQ Safety Dashboard
              </h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.52)' }}>
                Live overview across Near Miss, Work Stoppage, VFL &amp; PTO modules
              </p>
              {lastUpdated && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'rgba(255,255,255,0.30)', marginTop: 6 }}>
                  <Clock size={10} />
                  Refreshed {lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 }}>
              {([
                { href: '/near_miss',       label: 'Near Miss',    color: C.nm   },
                { href: '/work_stoppage',   label: 'Work Stop.',   color: C.ws   },
                { href: '/vfl',             label: 'VFL',          color: C.vfl  },
                { href: '/pto',             label: 'PTO',          color: C.pto  },
                { href: '/sheq_inspection', label: 'Inspections',  color: C.insp },
              ] as const).map(({ href, label, color }) => (
                <Link key={href} href={href} style={{ fontSize: 11, color, background: color + '18', padding: '6px 11px', borderRadius: 9, textDecoration: 'none', fontWeight: 700, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', gap: 4 }}>
                  {label} <ExternalLink size={9} />
                </Link>
              ))}
              <MasterCollapseButton collapse={sections} />
              <button type="button" onClick={() => setAutoRefresh(a => !a)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, background: autoRefresh ? '#10b98118' : 'rgba(255,255,255,0.07)', border: `1px solid ${autoRefresh ? '#10b98144' : 'rgba(255,255,255,0.14)'}`, borderRadius: 9, padding: '7px 12px', cursor: 'pointer', color: autoRefresh ? '#10b981' : 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: 600 }}>
                <Zap size={12} /> {autoRefresh ? 'Auto ON' : 'Auto OFF'}
              </button>
              <button type="button" onClick={load} disabled={loading}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.16)', borderRadius: 9, padding: '8px 14px', cursor: loading ? 'not-allowed' : 'pointer', color: 'rgba(255,255,255,0.80)', fontSize: 12, fontWeight: 600 }}>
                <RefreshCw size={13} style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }} />
                {loading ? 'Loading…' : 'Refresh'}
              </button>
            </div>
          </div>

          {/* Quick date filter bar */}
          <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'rgba(255,255,255,0.40)' }}>
              <Calendar size={12} /> Filter:
            </div>
            {QUICK_OPTIONS.map(({ key, label }) => (
              <button key={key} type="button" onClick={() => selectRange(key as QuickRange | 'custom')}
                style={{ padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: quickRange === key ? '1px solid #60a5fa66' : '1px solid rgba(255,255,255,0.12)', background: quickRange === key ? 'rgba(96,165,250,0.18)' : 'rgba(255,255,255,0.05)', color: quickRange === key ? '#60a5fa' : 'rgba(255,255,255,0.50)', transition: 'all 0.15s' }}>
                {label}
              </button>
            ))}
            {showCustom && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 4 }}>
                <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                  className={glassInput} style={{ width: 138 }} title="From date" />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)' }}>to</span>
                <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                  className={glassInput} style={{ width: 138 }} title="To date" />
              </div>
            )}
          </div>
        </Glass>

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '80px 0' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 42, height: 42, border: '3px solid rgba(255,255,255,0.08)', borderTopColor: '#60a5fa', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 14px' }} />
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.42)' }}>Loading safety data…</div>
            </div>
          </div>
        )}

        {!loading && (
          <>
            {/* ── ALERTS ── */}
            {alerts.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {alerts.map((a, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: a.color + '14', border: `1px solid ${a.color}33`, borderRadius: 11, padding: '10px 16px' }}>
                    <Bell size={13} style={{ color: a.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: a.color, fontWeight: 600 }}>{a.text}</span>
                  </div>
                ))}
              </div>
            )}

            {/* ── KPI ROW ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: 12 }}>
              {[
                { label: 'Total Reports',    value: totals.totalReports,        color: '#60a5fa', icon: <FileSearch size={18} />,      sub: 'All 5 modules' },
                { label: 'Near Miss',        value: stats.nm.total,             color: C.nm,      icon: <AlertTriangle size={18} />,    sub: `${stats.nm.open || stats.nm.total} active` },
                { label: 'Work Stoppages',   value: stats.ws.total,             color: C.ws,      icon: <Ban size={18} />,              sub: `${stats.ws.actPend} actions pending` },
                { label: 'VFL Observations', value: stats.vfl.total,            color: C.vfl,     icon: <Eye size={18} />,              sub: `${stats.vfl.safe} safe, ${stats.vfl.unsafe} unsafe` },
                { label: 'PTO Reports',      value: stats.pto.total,            color: C.pto,     icon: <ClipboardList size={18} />,    sub: `${stats.pto.highRisk} high risk` },
                { label: 'Inspections',      value: stats.insp.total,           color: C.insp,    icon: <ClipboardCheck size={18} />,   sub: `${stats.insp.openFindings} open findings` },
                { label: 'Pending Actions',  value: totals.totalActionsPend,    color: C.pend,    icon: <Target size={18} />,           sub: `${totals.totalActionsDone} completed` },
              ].map(({ label, value, color, icon, sub }) => (
                <div key={label} style={{ background: 'rgba(5,15,28,0.68)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 13, padding: '16px 18px', boxShadow: '0 4px 18px rgba(0,0,0,0.28)', transition: 'border-color 0.2s' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ padding: 8, borderRadius: 9, background: color + '20' }}>
                      <span style={{ color, display: 'flex' }}>{icon}</span>
                    </div>
                    <Chip label={value.toString()} color={color} />
                  </div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: 'rgba(255,255,255,0.95)', lineHeight: 1 }}>{value}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.72)', marginTop: 6, fontWeight: 600 }}>{label}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.36)', marginTop: 3 }}>{sub}</div>
                </div>
              ))}
            </div>

            {/* ── WEEKLY PERFORMANCE vs TARGET ── */}
            <CollapsibleSection
              title="Weekly Performance vs Target"
              icon={<Target size={15} />}
              sub={`Week of ${weekLabel} · click a target to edit`}
              accent="#a855f7"
              open={sections.expanded.weekly}
              onToggle={() => sections.toggle('weekly')}
            >
              {/* Target edit toolbar */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14, gap: 8 }}>
                {editingTargets ? (
                  <>
                    <button type="button" onClick={() => setEditingTargets(false)}
                      style={{ fontSize: 11, padding: '5px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.55)', cursor: 'pointer' }}>
                      Cancel
                    </button>
                    <button type="button" onClick={saveTargets}
                      style={{ fontSize: 11, padding: '5px 14px', borderRadius: 8, background: '#a855f7', border: '1px solid rgba(168,85,247,0.5)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                      Save Targets
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={() => { setTargetDraft({ ...weeklyTargets }); setEditingTargets(true); }}
                    style={{ fontSize: 11, padding: '5px 12px', borderRadius: 8, background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.28)', color: '#a855f7', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                    ✎ Edit Targets
                  </button>
                )}
              </div>

              {/* Rows */}
              {([
                { key: 'vfl',  label: 'VFL Observations',  color: C.vfl,  icon: <Eye size={15} />,           href: '/vfl' },
                { key: 'pto',  label: 'PTO Reports',        color: C.pto,  icon: <ClipboardList size={15} />, href: '/pto' },
                { key: 'insp', label: 'Inspections',        color: C.insp, icon: <ClipboardCheck size={15} />,href: '/sheq_inspection' },
                { key: 'pach', label: 'Pachedu',            color: C.pach, icon: <HeartHandshake size={15} />,href: '/pachedu' },
                { key: 'nm',   label: 'Near Miss',          color: C.nm,   icon: <AlertTriangle size={15} />, href: '/near_miss' },
              ] as { key: ModuleKey; label: string; color: string; icon: React.ReactNode; href: string }[]).map(({ key, label, color, icon, href }) => {
                const actual   = weeklyActuals[key] ?? 0;
                const target   = weeklyTargets[key] ?? 1;
                const pct      = Math.min(Math.round((actual / target) * 100), 100);
                const overflow = actual > target;
                const barColor = overflow
                  ? C.safe
                  : pct >= 80  ? '#60a5fa'
                  : pct >= 50  ? C.nm
                  : C.high;
                const statusLabel = overflow
                  ? 'Exceeded ✓'
                  : pct >= 100 ? 'On Target ✓'
                  : pct >= 80  ? 'Almost'
                  : pct >= 50  ? 'In Progress'
                  : actual === 0 ? 'Not Started'
                  : 'Below Target';
                const statusColor = overflow || pct >= 100 ? C.safe : pct >= 80 ? '#60a5fa' : pct >= 50 ? C.nm : C.high;

                return (
                  <div key={key} style={{ display: 'grid', gridTemplateColumns: '28px 1fr 80px 90px 80px', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    {/* Icon */}
                    <div style={{ color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>

                    {/* Label + bar */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <Link href={href} style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.85)', textDecoration: 'none' }}>{label}</Link>
                      </div>
                      <div style={{ height: 7, borderRadius: 999, background: 'rgba(255,255,255,0.07)', overflow: 'hidden', position: 'relative' }}>
                        <div style={{
                          height: '100%', borderRadius: 999,
                          width: `${pct}%`,
                          background: `linear-gradient(90deg, ${barColor}99, ${barColor})`,
                          transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)',
                          boxShadow: pct > 0 ? `0 0 8px ${barColor}66` : 'none',
                        }} />
                      </div>
                    </div>

                    {/* Actual / Target */}
                    <div style={{ textAlign: 'center' }}>
                      {editingTargets ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                          <span style={{ fontSize: 16, fontWeight: 800, color }}>{actual}</span>
                          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)' }}>/</span>
                          <input
                            type="number" min={1} max={999}
                            value={targetDraft[key]}
                            onChange={e => setTargetDraft(p => ({ ...p, [key]: Math.max(1, parseInt(e.target.value) || 1) }))}
                            style={{ width: 44, textAlign: 'center', background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.45)', borderRadius: 7, color: '#a855f7', fontSize: 13, fontWeight: 800, padding: '2px 4px', outline: 'none' }}
                          />
                        </div>
                      ) : (
                        <div>
                          <div style={{ fontSize: 16, fontWeight: 800, color }}>{actual}</div>
                          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>of {target}</div>
                        </div>
                      )}
                    </div>

                    {/* % bar */}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 20, fontWeight: 900, color: barColor, lineHeight: 1 }}>
                        {overflow ? `${Math.round((actual / target) * 100)}%` : `${pct}%`}
                      </div>
                      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.30)', marginTop: 2 }}>achievement</div>
                    </div>

                    {/* Status badge */}
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: statusColor + '20', color: statusColor, border: `1px solid ${statusColor}40` }}>
                        {statusLabel}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Summary footer */}
              {(() => {
                const keys: ModuleKey[] = ['vfl', 'pto', 'insp', 'pach', 'nm'];
                const met = keys.filter(k => (weeklyActuals[k] ?? 0) >= weeklyTargets[k]).length;
                const totalTarget = keys.reduce((s, k) => s + weeklyTargets[k], 0);
                const totalActual = keys.reduce((s, k) => s + (weeklyActuals[k] ?? 0), 0);
                const overall = Math.min(Math.round((totalActual / totalTarget) * 100), 100);
                const overallColor = met === keys.length ? C.safe : met >= 3 ? '#60a5fa' : met >= 1 ? C.nm : C.high;
                return (
                  <div style={{ marginTop: 16, padding: '14px 18px', background: 'rgba(255,255,255,0.04)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)', marginBottom: 4 }}>WEEKLY SUMMARY</div>
                      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.80)', fontWeight: 600 }}>
                        <span style={{ color: overallColor, fontWeight: 800, fontSize: 18 }}>{met}</span>
                        <span style={{ color: 'rgba(255,255,255,0.40)' }}> / {keys.length} modules on target</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>Total Activities</div>
                      <div style={{ fontSize: 22, fontWeight: 900, color: overallColor }}>{totalActual} <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>/ {totalTarget}</span></div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>Overall Achievement</div>
                      <div style={{ fontSize: 28, fontWeight: 900, color: overallColor, lineHeight: 1 }}>{overall}%</div>
                    </div>
                    {/* Mini overall bar */}
                    <div style={{ flex: '1 0 120px', minWidth: 120 }}>
                      <div style={{ height: 10, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 999, width: `${overall}%`, background: `linear-gradient(90deg, ${overallColor}88, ${overallColor})`, transition: 'width 0.9s cubic-bezier(0.16,1,0.3,1)', boxShadow: `0 0 10px ${overallColor}55` }} />
                      </div>
                      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', marginTop: 4, textAlign: 'right' }}>{totalActual} completed this week</div>
                    </div>
                  </div>
                );
              })()}
            </CollapsibleSection>

            {/* ── SCORE + TREND ── */}
            <CollapsibleSection title="Safety Score &amp; Trends" icon={<Shield size={15} />} sub="Weighted safety score across all modules + monthly activity trend" accent={sc} {...sections.panel('score')}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20 }}>
                {/* Score */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <DonutChart
                    segments={[{ value: score, color: sc }, { value: 100 - score, color: 'rgba(255,255,255,0.04)' }]}
                    size={155} strokeWidth={22} label={score} sublabel="/ 100" />
                  <div style={{ marginTop: 12, textAlign: 'center' }}>
                    <div style={{ fontSize: 16, color: sc, fontWeight: 800 }}>{scoreLabel(score)}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.36)', marginTop: 4 }}>Weighted across all modules</div>
                  </div>
                  <div style={{ marginTop: 18, width: '100%' }}>
                    <ProgBar label="NM Resolution"      value={stats.nm.closed || stats.nm.total}     max={Math.max(stats.nm.total,  1)} color={C.nm}   sub={`${stats.nm.closed || stats.nm.total}/${stats.nm.total}`} />
                    <ProgBar label="VFL Safe Rate"      value={stats.vfl.safe}                         max={Math.max(stats.vfl.total, 1)} color={C.vfl}  sub={`${stats.vfl.safe}/${stats.vfl.total}`} />
                    <ProgBar label="Action Completion"  value={totals.totalActionsDone}               max={Math.max(totals.totalActions, 1)} color={C.prog} sub={`${totals.totalActionsDone}/${totals.totalActions}`} />
                    <ProgBar label="PTO Low Risk"       value={stats.pto.total - stats.pto.highRisk}   max={Math.max(stats.pto.total, 1)} color={C.pto}   sub={`${stats.pto.total - stats.pto.highRisk}/${stats.pto.total}`} />
                    <ProgBar label="Insp. Approved"     value={stats.insp.approved}                    max={Math.max(stats.insp.total, 1)} color={C.insp}  sub={`${stats.insp.approved}/${stats.insp.total}`} />
                  </div>
                </div>

                {/* Trend */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.88)' }}>Monthly Report Trend</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)', marginTop: 3 }}>All modules combined — last 6 months</div>
                    </div>
                    {trendData.length >= 2 && (() => {
                      const prev = trendData[trendData.length - 2];
                      const curr = trendData[trendData.length - 1];
                      const delta = curr - prev;
                      const up = delta >= 0;
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: up ? C.done : '#f87171', background: (up ? C.done : '#f87171') + '18', padding: '5px 11px', borderRadius: 8 }}>
                          {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {delta >= 0 ? '+' : ''}{delta} vs prev month
                        </div>
                      );
                    })()}
                  </div>
                  <TrendLineChart data={trendData} labels={trendLabels} color="#60a5fa" height={140} />
                  {/* Per-module sparklines */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginTop: 16 }}>
                    {([
                      { key: 'nm'   as const, label: 'Near Miss', color: C.nm },
                      { key: 'ws'   as const, label: 'Work Stop.', color: C.ws },
                      { key: 'vfl'  as const, label: 'VFL', color: C.vfl },
                      { key: 'pto'  as const, label: 'PTO', color: C.pto },
                      { key: 'insp' as const, label: 'Inspections', color: C.insp },
                    ]).map(({ key, label, color }) => {
                      const data = stats.moduleMonthly[key];
                      const tot = data.reduce((a, b) => a + b, 0);
                      return (
                        <div key={key} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color }}>{label}</span>
                            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.40)' }}>{tot}</span>
                          </div>
                          <TrendLineChart data={data} labels={trendLabels} color={color} height={60} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            {/* ── MODULE CARDS ── */}
            <CollapsibleSection title="Module Overview" icon={<BarChart3 size={15} />} sub="Live stats per safety module — click a card's Open link to navigate" accent="#818cf8" {...sections.panel('modules')}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14 }}>
                <ModuleCard label="Near Miss" href="/near_miss" color={C.nm} icon={<AlertTriangle size={17} />}
                  total={stats.nm.total}
                  donutSegments={[
                    { value: stats.nm.closed || Math.round(stats.nm.total * 0.7), color: C.safe,  label: 'Resolved' },
                    { value: stats.nm.open   || Math.round(stats.nm.total * 0.3), color: C.nm,    label: 'Open' },
                    { value: Math.max(0, stats.nm.total - stats.nm.closed - stats.nm.open),        color: '#6b7280', label: 'Other' },
                  ]}
                  miniStats={[
                    { label: 'Open',      value: stats.nm.open,   color: C.nm },
                    { label: 'Closed',    value: stats.nm.closed, color: C.safe },
                    { label: 'High/Crit', value: stats.nm.high,   color: C.high },
                  ]}
                  legend={[
                    { label: 'Resolved', value: stats.nm.closed, color: C.safe },
                    { label: 'Open',     value: stats.nm.open,   color: C.nm },
                  ]} />

                <ModuleCard label="Work Stoppage" href="/work_stoppage" color={C.ws} icon={<Ban size={17} />}
                  total={stats.ws.total}
                  donutSegments={[
                    { value: stats.ws.actDone, color: C.done, label: 'Done' },
                    { value: stats.ws.actProg, color: C.prog, label: 'Active' },
                    { value: stats.ws.actPend, color: C.ws,   label: 'Pending' },
                  ]}
                  miniStats={[
                    { label: 'Reports', value: stats.ws.total,   color: C.ws },
                    { label: 'Pending', value: stats.ws.actPend, color: C.pend },
                    { label: 'Done',    value: stats.ws.actDone, color: C.done },
                  ]}
                  legend={[
                    { label: 'Done',    value: stats.ws.actDone, color: C.done },
                    { label: 'Active',  value: stats.ws.actProg, color: C.prog },
                    { label: 'Pending', value: stats.ws.actPend, color: C.ws },
                  ]} />

                <ModuleCard label="VFL" href="/vfl" color={C.vfl} icon={<Eye size={17} />}
                  total={stats.vfl.total}
                  donutSegments={[
                    { value: stats.vfl.safe,   color: C.vfl,  label: 'Safe' },
                    { value: stats.vfl.unsafe, color: C.high, label: 'Unsafe' },
                  ]}
                  miniStats={[
                    { label: 'Safe',    value: stats.vfl.safe,     color: C.vfl },
                    { label: 'Unsafe',  value: stats.vfl.unsafe,   color: C.high },
                    { label: 'Actions', value: stats.vfl.actTotal, color: C.prog },
                  ]}
                  legend={[
                    { label: 'Safe',   value: stats.vfl.safe,   color: C.vfl },
                    { label: 'Unsafe', value: stats.vfl.unsafe, color: C.high },
                  ]} />

                <ModuleCard label="PTO" href="/pto" color={C.pto} icon={<ClipboardList size={17} />}
                  total={stats.pto.total}
                  donutSegments={[
                    { value: stats.pto.total - stats.pto.highRisk, color: C.pto,  label: 'Low Risk' },
                    { value: stats.pto.highRisk,                   color: C.high, label: 'High Risk' },
                  ]}
                  miniStats={[
                    { label: 'Initial',   value: stats.pto.initial,   color: '#a78bfa' },
                    { label: 'Follow up', value: stats.pto.followup,  color: '#f97316' },
                    { label: 'High Risk', value: stats.pto.highRisk,  color: C.high },
                  ]}
                  legend={[
                    { label: 'Low Risk',  value: stats.pto.total - stats.pto.highRisk, color: C.pto },
                    { label: 'High Risk', value: stats.pto.highRisk,                   color: C.high },
                  ]} />

                <ModuleCard label="SHEQ Inspections" href="/sheq_inspection" color={C.insp} icon={<ClipboardCheck size={17} />}
                  total={stats.insp.total}
                  donutSegments={[
                    { value: stats.insp.approved,   color: C.safe,    label: 'Approved' },
                    { value: stats.insp.submitted,  color: C.insp,    label: 'Submitted' },
                    { value: stats.insp.draft,      color: '#6b7280', label: 'Draft' },
                    { value: stats.insp.rejected,   color: C.high,    label: 'Rejected' },
                  ]}
                  miniStats={[
                    { label: 'Approved',  value: stats.insp.approved,          color: C.safe },
                    { label: 'Open Fnds', value: stats.insp.openFindings,      color: C.nm },
                    { label: 'Critical',  value: stats.insp.criticalFindings,  color: C.high },
                  ]}
                  legend={[
                    { label: 'Approved',  value: stats.insp.approved,  color: C.safe },
                    { label: 'Submitted', value: stats.insp.submitted, color: C.insp },
                    { label: 'Draft',     value: stats.insp.draft,     color: '#6b7280' },
                    { label: 'Rejected',  value: stats.insp.rejected,  color: C.high },
                  ]} />

                <ModuleCard label="Pachedu" href="/pachedu" color={C.pach} icon={<HeartHandshake size={17} />}
                  total={stats.pach.total}
                  donutSegments={[
                    { value: stats.pach.closed,        color: C.safe,    label: 'Closed' },
                    { value: stats.pach.reviewed,      color: C.pach,    label: 'Reviewed' },
                    { value: stats.pach.submitted,     color: C.prog,    label: 'Submitted' },
                    { value: stats.pach.draft,         color: '#6b7280', label: 'Draft' },
                  ]}
                  miniStats={[
                    { label: 'Intentional',   value: stats.pach.intentional,   color: C.nm },
                    { label: 'Unintentional', value: stats.pach.unintentional, color: C.pach },
                    { label: 'Closed',        value: stats.pach.closed,        color: C.safe },
                  ]}
                  legend={[
                    { label: 'Closed',    value: stats.pach.closed,    color: C.safe },
                    { label: 'Reviewed',  value: stats.pach.reviewed,  color: C.pach },
                    { label: 'Submitted', value: stats.pach.submitted, color: C.prog },
                    { label: 'Draft',     value: stats.pach.draft,     color: '#6b7280' },
                  ]} />
              </div>
            </CollapsibleSection>

            {/* ── CHARTS ── */}
            <CollapsibleSection title="Analytics &amp; Visualisations" icon={<Activity size={15} />} sub="Reports by module, action status breakdown and behaviour analysis" accent={C.prog} {...sections.panel('analytics')}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }}>
                {/* Reports by Module */}
                <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '16px 18px' }}>
                  <SectionHeader icon={<BarChart3 size={13} />} title="Reports by Module" sub="Total count per category" />
                  <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8 }}>
                    <BarChart data={[
                      { label: 'Near Miss',  value: stats.nm.total,   color: C.nm },
                      { label: 'Work Stop.', value: stats.ws.total,   color: C.ws },
                      { label: 'VFL',        value: stats.vfl.total,  color: C.vfl },
                      { label: 'PTO',        value: stats.pto.total,  color: C.pto },
                      { label: 'Insp.',      value: stats.insp.total, color: C.insp },
                      { label: 'Pachedu',    value: stats.pach.total, color: C.pach },
                    ]} height={110} barWidth={40} gap={14} />
                  </div>
                </div>

                {/* Action Items Status */}
                <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '16px 18px' }}>
                  <SectionHeader icon={<Target size={13} />} title="Action Items Status" sub="Across all modules combined" />
                  {totals.totalActions === 0 ? <EmptyViz /> : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 24, justifyContent: 'center' }}>
                      <DonutChart segments={[
                        { value: totals.totalActionsDone, color: C.done },
                        { value: totals.totalActionsProg, color: C.prog },
                        { value: totals.totalActionsPend, color: C.pend },
                      ]} size={130} strokeWidth={20} label={totals.totalActions} sublabel="total" />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {[
                          { label: 'Completed',  value: totals.totalActionsDone, color: C.done },
                          { label: 'In Progress', value: totals.totalActionsProg, color: C.prog },
                          { label: 'Pending',    value: totals.totalActionsPend, color: C.pend },
                        ].map(({ label, value, color }) => (
                          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 10, height: 10, borderRadius: 3, background: color, flexShrink: 0 }} />
                            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', flex: 1 }}>{label}</span>
                            <span style={{ fontSize: 16, fontWeight: 800, color }}>{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                {/* VFL Behaviour */}
                <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '16px 18px' }}>
                  <SectionHeader icon={<Eye size={13} />} title="VFL Behaviour Breakdown" sub="Safe vs Unsafe observations" />
                  {stats.vfl.total === 0 ? <EmptyViz /> : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 22, justifyContent: 'center' }}>
                      <DonutChart segments={[{ value: stats.vfl.safe, color: C.vfl }, { value: stats.vfl.unsafe, color: C.high }]}
                        size={110} strokeWidth={17}
                        label={`${Math.round((stats.vfl.safe / stats.vfl.total) * 100)}%`} sublabel="safe" />
                      <div style={{ flex: 1 }}>
                        <ProgBar label="Safe Behaviour"   value={stats.vfl.safe}   max={stats.vfl.total} color={C.vfl} sub={`${stats.vfl.safe} of ${stats.vfl.total}`} />
                        <ProgBar label="Unsafe Behaviour" value={stats.vfl.unsafe} max={stats.vfl.total} color={C.high} sub={`${stats.vfl.unsafe} of ${stats.vfl.total}`} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Pachedu Behaviour */}
                <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '16px 18px' }}>
                  <SectionHeader icon={<HeartHandshake size={13} />} title="Pachedu Behaviour Breakdown" sub="Intentional vs Unintentional observations" color={C.pach} />
                  {stats.pach.total === 0 ? <EmptyViz /> : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 22, justifyContent: 'center' }}>
                      <DonutChart
                        segments={[
                          { value: stats.pach.intentional,   color: C.nm,   label: 'Intentional' },
                          { value: stats.pach.unintentional, color: C.pach, label: 'Unintentional' },
                        ]}
                        size={110} strokeWidth={17}
                        label={stats.pach.total} sublabel="reports"
                      />
                      <div style={{ flex: 1 }}>
                        <ProgBar label="Intentional"   value={stats.pach.intentional}   max={stats.pach.total} color={C.nm}   sub={`${stats.pach.intentional} of ${stats.pach.total}`} />
                        <ProgBar label="Unintentional" value={stats.pach.unintentional} max={stats.pach.total} color={C.pach} sub={`${stats.pach.unintentional} of ${stats.pach.total}`} />
                        <ProgBar label="Resolved (Closed + Reviewed)" value={stats.pach.closed + stats.pach.reviewed} max={stats.pach.total} color={C.safe} sub={`${stats.pach.closed + stats.pach.reviewed} of ${stats.pach.total}`} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Near Miss Resolution */}
                <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '16px 18px' }}>
                  <SectionHeader icon={<AlertTriangle size={13} />} title="Near Miss Status" sub={`${stats.nm.total} report${stats.nm.total !== 1 ? 's' : ''} in selected period`} />
                  {stats.nm.total === 0 ? <EmptyViz text="No near miss reports in this period" /> : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 22, justifyContent: 'center' }}>
                      <DonutChart segments={[
                        { value: stats.nm.closed, color: C.safe },
                        { value: stats.nm.open,   color: C.nm },
                        { value: Math.max(0, stats.nm.total - stats.nm.closed - stats.nm.open), color: '#6b7280' },
                      ]} size={110} strokeWidth={17}
                        label={stats.nm.total} sublabel="total" />
                      <div style={{ flex: 1 }}>
                        <ProgBar label="Resolved/Closed"   value={stats.nm.closed || stats.nm.total} max={stats.nm.total} color={C.safe} sub={`${stats.nm.closed || stats.nm.total} reports`} />
                        <ProgBar label="Open/Investigating" value={stats.nm.open}  max={stats.nm.total} color={C.nm}   sub={`${stats.nm.open} reports`} />
                        {stats.nm.high > 0 && <ProgBar label="High/Critical" value={stats.nm.high} max={stats.nm.total} color={C.high} sub={`${stats.nm.high} reports`} />}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CollapsibleSection>

            {/* ── ACTION PROGRESS ── */}
            <CollapsibleSection title="Action Plan Progress" icon={<CheckCircle size={15} />} sub="Completion rates for corrective actions per module" accent={C.done} {...sections.panel('actions')}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
                {[
                  { label: 'Work Stoppage Actions', done: stats.ws.actDone, total: stats.ws.actTotal, color: C.ws },
                  { label: 'VFL Actions',           done: stats.vfl.actDone, total: stats.vfl.actTotal, color: C.vfl },
                  { label: 'PTO Actions',           done: stats.pto.actDone, total: stats.pto.actTotal, color: C.pto },
                  { label: 'All Actions Combined',  done: totals.totalActionsDone, total: totals.totalActions, color: '#a78bfa' },
                ].map(({ label, done, total, color }) => (
                  <div key={label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 11, padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.78)', fontWeight: 600 }}>{label}</span>
                      <span style={{ fontSize: 12, color, fontWeight: 700 }}>{done}/{total}</span>
                    </div>
                    <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.07)' }}>
                      <div style={{ height: '100%', borderRadius: 999, width: `${total > 0 ? (done / total) * 100 : 0}%`, background: `linear-gradient(90deg, ${color}aa, ${color})`, transition: 'width 0.7s cubic-bezier(0.4,0,0.2,1)' }} />
                    </div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 5 }}>
                      {total > 0 ? Math.round((done / total) * 100) : 0}% complete
                      {total === 0 && ' — no actions recorded'}
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleSection>

            {/* ── AI SAFETY INSIGHTS ── */}
            <CollapsibleSection
              title="Safety Analysis &amp; Recommendations"
              icon={<Shield size={15} />}
              sub="Polars statistical analysis — hotspot detection, trend direction, risk scoring, rule-based recommendations"
              accent="#a855f7"
              open={sections.expanded.ai}
              onToggle={() => sections.toggle('ai')}
            >
              {/* Trigger button */}
              <div style={{ marginBottom: 18, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  disabled={aiLoading || loading}
                  onClick={runAiAnalysis}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '9px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                    background: aiLoading ? 'rgba(168,85,247,0.15)' : 'linear-gradient(135deg,#6d28d9,#a855f7)',
                    color: '#fff', border: '1px solid rgba(168,85,247,0.45)',
                    cursor: aiLoading ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                    boxShadow: aiLoading ? 'none' : '0 4px 16px rgba(168,85,247,0.3)',
                  }}
                >
                  {aiLoading
                    ? <><span style={{ display: 'inline-block', animation: 'spin 1s linear infinite', marginRight: 4, fontSize: 14 }}>⟳</span> Analysing…</>
                    : <><span style={{ fontSize: 16 }}>✦</span> {aiResult ? 'Re-analyse' : 'Analyse'}</>
                  }
                </button>
                {aiResult && (
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                    {aiResult._records_analysed} records analysed · Polars statistical engine
                  </span>
                )}
                {aiError && (
                  <span style={{ fontSize: 11, color: '#f87171', background: 'rgba(248,113,113,0.10)', padding: '4px 10px', borderRadius: 8 }}>
                    {aiError}
                  </span>
                )}
              </div>

              {aiResult && !aiLoading && (() => {
                const riskColors: Record<string, string> = { low: C.safe, medium: C.pend, high: C.nm, critical: C.high };
                const priorityColors: Record<string, string> = { immediate: C.high, short_term: C.nm, long_term: C.prog };
                const sevColor = (s: string) => riskColors[s] ?? '#60a5fa';

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                    {/* Risk header */}
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                      <div style={{ flex: 2, minWidth: 200, background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '14px 18px' }}>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Executive Summary</div>
                        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.82)', lineHeight: 1.65 }}>{aiResult.summary}</p>
                      </div>
                      <div style={{ minWidth: 140, background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '14px 18px', textAlign: 'center' }}>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Risk Level</div>
                        <div style={{ fontSize: 32, fontWeight: 900, color: sevColor(aiResult.overall_risk), lineHeight: 1 }}>{aiResult.risk_score}</div>
                        <div style={{ fontSize: 11, marginTop: 4, fontWeight: 700, textTransform: 'uppercase', color: sevColor(aiResult.overall_risk) }}>{aiResult.overall_risk}</div>
                        {/* Mini gauge */}
                        <div style={{ marginTop: 10, height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.07)' }}>
                          <div style={{ height: '100%', borderRadius: 999, width: `${aiResult.risk_score}%`, background: `linear-gradient(90deg, ${sevColor(aiResult.overall_risk)}99, ${sevColor(aiResult.overall_risk)})`, transition: 'width 0.8s' }} />
                        </div>
                      </div>
                    </div>

                    {/* Problem Areas */}
                    {(aiResult.problem_areas ?? []).length > 0 && (
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.55)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8 }}>⚠ Problem Areas</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
                          {(aiResult.problem_areas as any[]).map((p: any, i: number) => (
                            <div key={i} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '12px 14px', borderLeft: `3px solid ${sevColor(p.severity)}` }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.88)' }}>{p.title}</span>
                                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: sevColor(p.severity) + '22', color: sevColor(p.severity), border: `1px solid ${sevColor(p.severity)}44` }}>{p.severity?.toUpperCase()}</span>
                              </div>
                              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 1.55, margin: '0 0 6px' }}>{p.description}</p>
                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {p.module && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.06)', padding: '2px 7px', borderRadius: 6 }}>{p.module}</span>}
                                {p.location_or_dept && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.06)', padding: '2px 7px', borderRadius: 6 }}>📍 {p.location_or_dept}</span>}
                                {p.count > 0 && <span style={{ fontSize: 10, color: C.nm, background: C.nm + '15', padding: '2px 7px', borderRadius: 6 }}>{p.count} incidents</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recommendations */}
                    {(aiResult.recommendations ?? []).length > 0 && (
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.55)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8 }}>✅ Recommendations</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {(aiResult.recommendations as any[]).map((r: any, i: number) => {
                            const pc = priorityColors[r.priority] ?? '#60a5fa';
                            return (
                              <div key={i} style={{ display: 'flex', gap: 12, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 14px' }}>
                                <div style={{ width: 70, flexShrink: 0, fontSize: 9, fontWeight: 800, padding: '3px 0', textAlign: 'center', borderRadius: 7, background: pc + '20', color: pc, border: `1px solid ${pc}40`, textTransform: 'uppercase', letterSpacing: 0.5, alignSelf: 'flex-start', marginTop: 2 }}>{r.priority?.replace('_', ' ')}</div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.88)', marginBottom: 2 }}>{r.action}</div>
                                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.50)', lineHeight: 1.5 }}>{r.rationale}</div>
                                  <div style={{ display: 'flex', gap: 10, marginTop: 5 }}>
                                    {r.owner && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>👤 {r.owner}</span>}
                                    {r.target && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>🎯 {r.target}</span>}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Trends + Locations */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      {(aiResult.trends ?? []).length > 0 && (
                        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '14px 16px' }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8 }}>Trends</div>
                          {(aiResult.trends as any[]).map((t: any, i: number) => {
                            const dc = t.direction === 'improving' ? C.safe : t.direction === 'worsening' ? C.high : C.pend;
                            const arrow = t.direction === 'improving' ? '↑' : t.direction === 'worsening' ? '↓' : '→';
                            return (
                              <div key={i} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 2 }}>
                                  <span style={{ fontSize: 13, fontWeight: 800, color: dc }}>{arrow}</span>
                                  <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.80)' }}>{t.metric}</span>
                                </div>
                                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5, margin: 0 }}>{t.insight}</p>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {((aiResult.top_risk_locations ?? []).length > 0 || (aiResult.top_risk_departments ?? []).length > 0) && (
                        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '14px 16px' }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8 }}>Risk Hotspots</div>
                          {(aiResult.top_risk_locations ?? []).length > 0 && (
                            <div style={{ marginBottom: 12 }}>
                              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 5 }}>📍 Locations</div>
                              {(aiResult.top_risk_locations as string[]).map((loc: string, i: number) => (
                                <div key={i} style={{ fontSize: 12, color: C.nm, marginBottom: 3 }}>• {loc}</div>
                              ))}
                            </div>
                          )}
                          {(aiResult.top_risk_departments ?? []).length > 0 && (
                            <div>
                              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 5 }}>🏭 Departments</div>
                              {(aiResult.top_risk_departments as string[]).map((d: string, i: number) => (
                                <div key={i} style={{ fontSize: 12, color: C.pend, marginBottom: 3 }}>• {d}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', textAlign: 'right' }}>
                      Generated {aiResult.generated_at ? new Date(aiResult.generated_at).toLocaleString() : ''} · AI analysis may contain inaccuracies — review before acting
                    </div>
                  </div>
                );
              })()}
            </CollapsibleSection>

            {/* ── COMMENTS ── */}
            <CommentsSection open={sections.expanded.notes} onToggle={() => sections.toggle('notes')} />
          </>
        )}

        <style>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
      </main>
    </PageShell>
  );
}
