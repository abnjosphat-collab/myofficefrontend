'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Shield, RefreshCw, TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
  Target, Eye, ClipboardList, Ban, ExternalLink, ChevronRight, MessageSquare,
  ShieldAlert, Activity, FileSearch, BarChart3, Zap, Wrench,
} from 'lucide-react';
import Link from 'next/link';
import { PageShell } from '@/components/PageShell';
import { toast } from 'sonner';
import { safetyFetch, glassInput } from '@/components/safety';

// ─── CHART: DONUT ────────────────────────────────────────────────────────────
function DonutChart({ segments = [], size = 120, strokeWidth = 18, label, sublabel }) {
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
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
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={strokeWidth} />
      {total > 0 && arcs.filter(a => a.dash > 0.5).map((arc, i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="none"
          stroke={arc.color} strokeWidth={strokeWidth - 2}
          strokeDasharray={`${arc.dash} ${circ - arc.dash}`}
          strokeDashoffset={(circ / 4) - arc.offset}
          style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px` }}
        />
      ))}
      {label !== undefined && (
        <text x={cx} y={cy + (sublabel ? -5 : 6)} textAnchor="middle"
          fill="rgba(255,255,255,0.92)" fontSize={size > 110 ? 21 : 14} fontWeight="800">{label}</text>
      )}
      {sublabel && (
        <text x={cx} y={cy + 12} textAnchor="middle"
          fill="rgba(255,255,255,0.38)" fontSize={9}>{sublabel}</text>
      )}
    </svg>
  );
}

// ─── CHART: TREND LINE ────────────────────────────────────────────────────────
function TrendLineChart({ data = [], labels = [], color = '#60a5fa', height = 130 }) {
  if (data.length < 2) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>
        Not enough data to display trend
      </div>
    );
  }
  const vw = 600;
  const padL = 28, padR = 12, padT = 14, padB = 28;
  const cW = vw - padL - padR;
  const cH = height - padT - padB;
  const max = Math.max(...data, 1);

  const pts = data.map((v, i) => ({
    x: padL + (i / (data.length - 1)) * cW,
    y: padT + (1 - v / max) * cH,
    v,
  }));
  const poly = pts.map(p => `${p.x},${p.y}`).join(' ');
  const area = `${pts[0].x},${padT + cH} ${poly} ${pts[pts.length - 1].x},${padT + cH}`;

  return (
    <svg viewBox={`0 0 ${vw} ${height}`} style={{ width: '100%', height, display: 'block' }}>
      {[0, 0.5, 1].map(t => {
        const y = padT + (1 - t) * cH;
        return (
          <g key={t}>
            <line x1={padL} y1={y} x2={vw - padR} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
            <text x={padL - 4} y={y + 4} textAnchor="end" fill="rgba(255,255,255,0.22)" fontSize={8}>{Math.round(t * max)}</text>
          </g>
        );
      })}
      <polygon points={area} fill={color} opacity={0.09} />
      <polyline points={poly} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={4} fill={color} />
          {p.v > 0 && (
            <text x={p.x} y={p.y - 9} textAnchor="middle" fill="rgba(255,255,255,0.65)" fontSize={9} fontWeight="700">{p.v}</text>
          )}
          <text x={p.x} y={height - 4} textAnchor="middle" fill="rgba(255,255,255,0.28)" fontSize={8}>{labels[i] || ''}</text>
        </g>
      ))}
    </svg>
  );
}

// ─── CHART: BAR ───────────────────────────────────────────────────────────────
function BarChart({ data = [], height = 110, barWidth = 44, gap = 16 }) {
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
            <rect x={x} y={2} width={barWidth} height={height - 8} rx={6} fill="rgba(255,255,255,0.04)" />
            <rect x={x} y={y} width={barWidth} height={barH} rx={6} fill={color} opacity={0.82} />
            <text x={x + barWidth / 2} y={y - 5} textAnchor="middle" fill="rgba(255,255,255,0.75)" fontSize={10} fontWeight="700">{item.value}</text>
            <text x={x + barWidth / 2} y={height + 18} textAnchor="middle" fill="rgba(255,255,255,0.38)" fontSize={9}>{item.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── CHART: PROGRESS BAR ──────────────────────────────────────────────────────
function ProgBar({ label, value, max = 100, color = '#10b981', sub }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.68)' }}>{label}</span>
        <span style={{ fontSize: 11, color, fontWeight: 700 }}>{Math.round(pct)}%</span>
      </div>
      <div style={{ height: 7, borderRadius: 999, background: 'rgba(255,255,255,0.07)' }}>
        <div style={{ height: '100%', borderRadius: 999, width: `${pct}%`, background: color, transition: 'width 0.6s ease' }} />
      </div>
      {sub && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

// ─── MODULE CARD ──────────────────────────────────────────────────────────────
function ModuleCard({ label, href, icon, color, total, donutSegments, miniStats, legend }) {
  return (
    <div style={{ background: 'rgba(5, 15, 28, 0.70)', backdropFilter: 'blur(24px) saturate(1.4)', WebkitBackdropFilter: 'blur(24px) saturate(1.4)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, padding: '18px 18px 14px', display: 'flex', flexDirection: 'column', gap: 12, boxShadow: '0 6px 28px rgba(0,0,0,0.34)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ padding: 8, borderRadius: 9, background: color + '25' }}>
            <span style={{ color, display: 'flex' }}>{icon}</span>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>{label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1.1 }}>{total}</div>
          </div>
        </div>
        <Link href={href} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color, background: color + '1a', padding: '5px 10px', borderRadius: 8, textDecoration: 'none', fontWeight: 600, border: `1px solid ${color}33` }}>
          View <ExternalLink size={10} />
        </Link>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <DonutChart segments={donutSegments} size={86} strokeWidth={14} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${miniStats.length}, 1fr)`, gap: 6 }}>
        {miniStats.map(({ label: l, value: v, color: c }) => (
          <div key={l} style={{ textAlign: 'center', background: 'rgba(255,255,255,0.04)', borderRadius: 7, padding: '6px 4px' }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: c }}>{v}</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.38)', marginTop: 1 }}>{l}</div>
          </div>
        ))}
      </div>

      {legend && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {legend.filter(l => l.value > 0).map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>
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
function CommentsSection() {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [author, setAuthor] = useState('');

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('sheq_dash_notes') || '[]');
      setComments(saved);
    } catch { }
  }, []);

  const save = (updated) => {
    setComments(updated);
    localStorage.setItem('sheq_dash_notes', JSON.stringify(updated));
  };

  const add = () => {
    if (!text.trim()) return;
    const c = { id: Date.now().toString(), text: text.trim(), author: author.trim() || 'Safety Manager', ts: new Date().toISOString() };
    save([c, ...comments].slice(0, 30));
    setText('');
  };

  return (
    <div style={{ background: 'rgba(5, 15, 28, 0.72)', backdropFilter: 'blur(28px) saturate(1.4)', WebkitBackdropFilter: 'blur(28px) saturate(1.4)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, padding: '22px 24px', boxShadow: '0 8px 40px rgba(0,0,0,0.38)' }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.85)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <MessageSquare size={15} style={{ color: '#60a5fa' }} /> Dashboard Notes &amp; Observations
      </h3>

      <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
        <input value={author} onChange={e => setAuthor(e.target.value)} placeholder="Your name (optional)"
          className={glassInput} style={{ width: 180 }} title="Your name" />
        <input value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); add(); } }}
          placeholder="Add a safety observation or note... (Enter to submit)"
          className={glassInput} style={{ flex: 1 }} title="Note" />
        <button onClick={add}
          style={{ background: 'rgba(96,165,250,0.18)', border: '1px solid rgba(96,165,250,0.35)', borderRadius: 8, padding: '0 18px', color: '#60a5fa', cursor: 'pointer', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
          Add
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, maxHeight: 280, overflowY: 'auto', marginTop: 12 }}>
        {comments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>
            No notes yet. Add observations, flags, or safety reminders above.
          </div>
        ) : comments.map(c => (
          <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: 'rgba(255,255,255,0.04)', borderRadius: 9, padding: '9px 12px', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.82)', lineHeight: 1.55 }}>{c.text}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
                {c.author} · {new Date(c.ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            <button onClick={() => save(comments.filter(x => x.id !== c.id))}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.25)', fontSize: 16, padding: '0 4px', lineHeight: 1, flexShrink: 0 }}>
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── DATA FETCHING ────────────────────────────────────────────────────────────
async function fetchAllModules() {
  const settled = await Promise.allSettled([
    safetyFetch('/api/near-miss/'),
    safetyFetch('/api/work-stoppage/'),
    safetyFetch('/api/vfl/'),
    safetyFetch('/api/pto/'),
  ]);
  const [nm, ws, vfl, pto] = settled.map(r => (r.status === 'fulfilled' && Array.isArray(r.value) ? r.value : []));
  return { nm, ws, vfl, pto };
}

// ─── STATS COMPUTATION ────────────────────────────────────────────────────────
function computeStats({ nm, ws, vfl, pto }) {
  // Near Miss
  const nmTotal = nm.length;
  const nmOpen = nm.filter(r => ['open', 'under_investigation', 'Open', 'Under Investigation'].includes(r.status)).length;
  const nmClosed = nm.filter(r => ['resolved', 'closed', 'Resolved', 'Closed'].includes(r.status)).length;
  const nmHigh = nm.filter(r => ['high', 'critical'].includes((r.priority || '').toLowerCase())).length;

  // Work Stoppage
  const wsTotal = ws.length;
  const wsActions = ws.flatMap(r => r.correctiveActions || []);
  const wsActDone = wsActions.filter(a => a.status === 'Completed').length;
  const wsActPend = wsActions.filter(a => a.status === 'Pending').length;
  const wsActProg = wsActions.filter(a => a.status === 'In Progress').length;

  // VFL
  const vflTotal = vfl.length;
  const vflSafe = vfl.filter(r => r.behaviourCategory === 'Safe Behaviour').length;
  const vflUnsafe = vfl.filter(r => r.behaviourCategory === 'Unsafe Behaviour').length;
  const vflDraft = vfl.filter(r => r.status === 'draft').length;
  const vflSubmitted = vfl.filter(r => r.status === 'submitted').length;
  const vflClosed = vfl.filter(r => r.status === 'closed').length;
  const vflActions = vfl.flatMap(r => r.actions || []);
  const vflActDone = vflActions.filter(a => a.status === 'Completed').length;
  const vflActPend = vflActions.filter(a => a.status === 'Pending').length;
  const vflActProg = vflActions.filter(a => a.status === 'In Progress').length;

  // PTO
  const ptoTotal = pto.length;
  const ptoHighRisk = pto.filter(r =>
    r.riskAssessment?.made === 'No' || r.riskAssessment?.identified === 'No' || r.riskAssessment?.effective === 'No'
  ).length;
  const ptoInitial = pto.filter(r => r.observationType === 'Initial').length;
  const ptoFollowup = pto.filter(r => r.observationType === 'Follow up').length;
  const ptoActions = pto.flatMap(r => r.actionPlan || []);
  const ptoActDone = ptoActions.filter(a => a.status === 'Completed').length;
  const ptoActPend = ptoActions.filter(a => a.status === 'Pending').length;
  const ptoActProg = ptoActions.filter(a => a.status === 'In Progress').length;

  // Totals
  const totalReports = nmTotal + wsTotal + vflTotal + ptoTotal;
  const totalActionsPend = wsActPend + vflActPend + ptoActPend;
  const totalActionsProg = wsActProg + vflActProg + ptoActProg;
  const totalActionsDone = wsActDone + vflActDone + ptoActDone;
  const totalActions = totalActionsPend + totalActionsProg + totalActionsDone;

  // Safety score (0–100)
  const nmScore   = nmTotal  ? (nmClosed  / nmTotal)  * 100 : 100;
  const vflScore  = vflTotal ? (vflSafe   / vflTotal)  * 100 : 100;
  const ptoScore  = ptoTotal ? ((ptoTotal - ptoHighRisk) / ptoTotal) * 100 : 100;
  const actScore  = totalActions ? (totalActionsDone / totalActions) * 100 : 100;
  const safetyScore = Math.round((nmScore + vflScore + ptoScore + actScore) / 4);

  // Monthly trend (last 6 months) across all modules
  const allReports = [...nm, ...ws, ...vfl, ...pto];
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { label: d.toLocaleDateString('en-US', { month: 'short' }), year: d.getFullYear(), month: d.getMonth(), count: 0 };
  });
  allReports.forEach(r => {
    const ds = r.created_at || r.date;
    if (!ds) return;
    const d = new Date(ds);
    const m = months.find(x => x.year === d.getFullYear() && x.month === d.getMonth());
    if (m) m.count++;
  });

  // Per-module monthly (last 6) for comparison
  const moduleMonthly = {
    nm:  buildMonthly(nm,  months),
    ws:  buildMonthly(ws,  months),
    vfl: buildMonthly(vfl, months),
    pto: buildMonthly(pto, months),
  };

  return {
    nm:  { total: nmTotal, open: nmOpen, closed: nmClosed, high: nmHigh },
    ws:  { total: wsTotal, actDone: wsActDone, actPend: wsActPend, actProg: wsActProg, actTotal: wsActions.length },
    vfl: { total: vflTotal, safe: vflSafe, unsafe: vflUnsafe, draft: vflDraft, submitted: vflSubmitted, closed: vflClosed, actDone: vflActDone, actPend: vflActPend, actProg: vflActProg, actTotal: vflActions.length },
    pto: { total: ptoTotal, highRisk: ptoHighRisk, initial: ptoInitial, followup: ptoFollowup, actDone: ptoActDone, actPend: ptoActPend, actProg: ptoActProg, actTotal: ptoActions.length },
    totals: { totalReports, totalActions, totalActionsDone, totalActionsProg, totalActionsPend },
    safetyScore,
    months, moduleMonthly,
  };
}

function buildMonthly(reports, months) {
  return months.map(m => {
    const count = reports.filter(r => {
      const ds = r.created_at || r.date;
      if (!ds) return false;
      const d = new Date(ds);
      return d.getFullYear() === m.year && d.getMonth() === m.month;
    }).length;
    return count;
  });
}

function scoreColor(s) {
  if (s >= 80) return '#10b981';
  if (s >= 60) return '#f59e0b';
  if (s >= 40) return '#f97316';
  return '#ef4444';
}
function scoreLabel(s) {
  if (s >= 80) return 'Good';
  if (s >= 60) return 'Needs Attention';
  if (s >= 40) return 'Concern';
  return 'Critical';
}

// ─── SECTION HEADER ──────────────────────────────────────────────────────────
const SH = ({ icon, title, sub }) => (
  <div style={{ marginBottom: 14 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.78)' }}>
      <span style={{ color: 'rgba(255,255,255,0.35)' }}>{icon}</span>
      {title}
    </div>
    {sub && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 3, marginLeft: 26 }}>{sub}</div>}
  </div>
);

const Glass = ({ children, style = {} }) => (
  <div style={{ background: 'rgba(5, 15, 28, 0.72)', backdropFilter: 'blur(28px) saturate(1.4)', WebkitBackdropFilter: 'blur(28px) saturate(1.4)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, padding: '22px 24px', boxShadow: '0 8px 40px rgba(0,0,0,0.38)', ...style }}>
    {children}
  </div>
);

const EmptyViz = () => (
  <div style={{ textAlign: 'center', padding: '28px 0', color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>No data yet</div>
);

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function SHEQDashboardPage() {
  const [raw, setRaw] = useState({ nm: [], ws: [], vfl: [], pto: [] });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

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

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => computeStats(raw), [raw]);
  const score = stats.safetyScore;
  const sc = scoreColor(score);
  const trendData = stats.months.map(m => m.count);
  const trendLabels = stats.months.map(m => m.label);

  const { totals } = stats;

  return (
    <PageShell>
      <main className="container mx-auto px-4 py-6" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── HERO ── */}
        <Glass style={{ padding: '22px 28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <nav style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'rgba(255,255,255,0.38)', marginBottom: 8 }}>
                <span>Home</span>
                <ChevronRight size={11} />
                <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Safety Dashboard</span>
              </nav>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: 'rgba(255,255,255,0.95)', fontFamily: 'Montserrat, sans-serif', letterSpacing: -0.5, marginBottom: 4 }}>
                SHEQ Safety Dashboard
              </h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.48)' }}>
                Live overview across Near Miss, Work Stoppage, VFL &amp; PTO modules.
              </p>
              {lastUpdated && (
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 5 }}>
                  Last refreshed: {lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
              {/* Quick nav links */}
              {[
                { href: '/near_miss', label: 'Near Miss', color: '#f59e0b' },
                { href: '/work_stoppage', label: 'Work Stoppage', color: '#f43f5e' },
                { href: '/vfl', label: 'VFL', color: '#10b981' },
                { href: '/pto', label: 'PTO', color: '#60a5fa' },
              ].map(({ href, label, color }) => (
                <Link key={href} href={href} style={{ fontSize: 11, color, background: color + '1a', padding: '5px 10px', borderRadius: 8, textDecoration: 'none', fontWeight: 700, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', gap: 4 }}>
                  {label} <ExternalLink size={9} />
                </Link>
              ))}
              <button onClick={load} disabled={loading}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 10, padding: '9px 14px', cursor: loading ? 'not-allowed' : 'pointer', color: 'rgba(255,255,255,0.72)', fontSize: 12, fontWeight: 600 }}>
                <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                {loading ? 'Loading…' : 'Refresh'}
              </button>
            </div>
          </div>
        </Glass>

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '80px 0' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 40, height: 40, border: '3px solid rgba(255,255,255,0.08)', borderTopColor: '#60a5fa', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>Loading safety data…</div>
            </div>
          </div>
        )}

        {!loading && (<>

        {/* ── KPI ROW ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
          {[
            { label: 'Total Reports', value: totals.totalReports, icon: <FileSearch size={17} />, color: '#60a5fa', sub: 'All 4 modules' },
            { label: 'Open Actions', value: totals.totalActionsPend, icon: <Target size={17} />, color: '#f59e0b', sub: 'Pending attention' },
            { label: 'In Progress', value: totals.totalActionsProg, icon: <Activity size={17} />, color: '#3b82f6', sub: 'Active actions' },
            { label: 'Completed', value: totals.totalActionsDone, icon: <CheckCircle size={17} />, color: '#10b981', sub: 'Actions resolved' },
            { label: 'High Risk Items', value: stats.nm.high + stats.pto.highRisk, icon: <AlertTriangle size={17} />, color: '#f43f5e', sub: 'Near Miss + PTO' },
            { label: 'VFL Observations', value: stats.vfl.total, icon: <Eye size={17} />, color: '#34d399', sub: `${stats.vfl.safe} safe, ${stats.vfl.unsafe} unsafe` },
          ].map(({ label, value, icon, color, sub }) => (
            <div key={label} style={{ background: 'rgba(5, 15, 28, 0.68)', backdropFilter: 'blur(20px) saturate(1.4)', WebkitBackdropFilter: 'blur(20px) saturate(1.4)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 13, padding: '16px 17px', boxShadow: '0 4px 20px rgba(0,0,0,0.30)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ padding: 7, borderRadius: 8, background: color + '22' }}>
                  <span style={{ color, display: 'flex' }}>{icon}</span>
                </div>
              </div>
              <div style={{ fontSize: 30, fontWeight: 800, color: 'rgba(255,255,255,0.92)', lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.62)', marginTop: 5, fontWeight: 600 }}>{label}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', marginTop: 2 }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* ── SCORE + TREND ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16 }}>
          {/* Safety Score */}
          <Glass style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 14 }}>Safety Score</div>
            <DonutChart
              segments={[
                { value: score, color: sc },
                { value: 100 - score, color: 'rgba(255,255,255,0.04)' },
              ]}
              size={150} strokeWidth={22} label={score} sublabel="/ 100"
            />
            <div style={{ marginTop: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 14, color: sc, fontWeight: 800 }}>{scoreLabel(score)}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>Weighted across all modules</div>
            </div>
            <div style={{ marginTop: 16, width: '100%' }}>
              <ProgBar label="NM Resolution" value={stats.nm.closed} max={Math.max(stats.nm.total, 1)} color="#f59e0b" />
              <ProgBar label="VFL Safe Rate" value={stats.vfl.safe} max={Math.max(stats.vfl.total, 1)} color="#10b981" />
              <ProgBar label="Action Completion" value={totals.totalActionsDone} max={Math.max(totals.totalActions, 1)} color="#60a5fa" />
              <ProgBar label="PTO Low Risk" value={stats.pto.total - stats.pto.highRisk} max={Math.max(stats.pto.total, 1)} color="#a78bfa" />
            </div>
          </Glass>

          {/* Trend */}
          <Glass>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>Monthly Report Trend</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', marginTop: 3 }}>All modules combined — last 6 months</div>
              </div>
              {trendData.length >= 2 && (() => {
                const prev = trendData[trendData.length - 2];
                const curr = trendData[trendData.length - 1];
                const delta = curr - prev;
                const up = delta >= 0;
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: up ? '#34d399' : '#f87171', background: (up ? '#34d399' : '#f87171') + '18', padding: '5px 11px', borderRadius: 8 }}>
                    {up ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                    {delta >= 0 ? '+' : ''}{delta} vs last month
                  </div>
                );
              })()}
            </div>
            <TrendLineChart data={trendData} labels={trendLabels} color="#60a5fa" height={130} />
          </Glass>
        </div>

        {/* ── MODULE CARDS ── */}
        <div>
          <SH icon={<BarChart3 size={14} />} title="Module Overview" sub="Click a module card to navigate to its reports page" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14 }}>
            <ModuleCard label="Near Miss" href="/near_miss" color="#f59e0b"
              icon={<AlertTriangle size={17} />}
              total={stats.nm.total}
              donutSegments={[
                { value: stats.nm.closed, color: '#10b981', label: 'Closed' },
                { value: stats.nm.open, color: '#f59e0b', label: 'Open' },
                { value: Math.max(0, stats.nm.total - stats.nm.closed - stats.nm.open), color: '#6b7280', label: 'Other' },
              ]}
              miniStats={[
                { label: 'Open', value: stats.nm.open, color: '#f59e0b' },
                { label: 'Closed', value: stats.nm.closed, color: '#10b981' },
                { label: 'High/Crit', value: stats.nm.high, color: '#ef4444' },
              ]}
              legend={[
                { label: 'Closed', value: stats.nm.closed, color: '#10b981' },
                { label: 'Open', value: stats.nm.open, color: '#f59e0b' },
              ]}
            />

            <ModuleCard label="Work Stoppage" href="/work_stoppage" color="#f43f5e"
              icon={<Ban size={17} />}
              total={stats.ws.total}
              donutSegments={[
                { value: stats.ws.actDone, color: '#10b981', label: 'Done' },
                { value: stats.ws.actProg, color: '#3b82f6', label: 'Active' },
                { value: stats.ws.actPend, color: '#f43f5e', label: 'Pending' },
              ]}
              miniStats={[
                { label: 'Reports', value: stats.ws.total, color: '#f43f5e' },
                { label: 'Pending', value: stats.ws.actPend, color: '#f59e0b' },
                { label: 'Done', value: stats.ws.actDone, color: '#10b981' },
              ]}
              legend={[
                { label: 'Done', value: stats.ws.actDone, color: '#10b981' },
                { label: 'Active', value: stats.ws.actProg, color: '#3b82f6' },
                { label: 'Pending', value: stats.ws.actPend, color: '#f43f5e' },
              ]}
            />

            <ModuleCard label="VFL" href="/vfl" color="#10b981"
              icon={<Eye size={17} />}
              total={stats.vfl.total}
              donutSegments={[
                { value: stats.vfl.safe, color: '#10b981', label: 'Safe' },
                { value: stats.vfl.unsafe, color: '#ef4444', label: 'Unsafe' },
              ]}
              miniStats={[
                { label: 'Safe', value: stats.vfl.safe, color: '#10b981' },
                { label: 'Unsafe', value: stats.vfl.unsafe, color: '#ef4444' },
                { label: 'Actions', value: stats.vfl.actTotal, color: '#60a5fa' },
              ]}
              legend={[
                { label: 'Safe', value: stats.vfl.safe, color: '#10b981' },
                { label: 'Unsafe', value: stats.vfl.unsafe, color: '#ef4444' },
              ]}
            />

            <ModuleCard label="PTO" href="/pto" color="#60a5fa"
              icon={<ClipboardList size={17} />}
              total={stats.pto.total}
              donutSegments={[
                { value: stats.pto.total - stats.pto.highRisk, color: '#60a5fa', label: 'Low Risk' },
                { value: stats.pto.highRisk, color: '#ef4444', label: 'High Risk' },
              ]}
              miniStats={[
                { label: 'Initial', value: stats.pto.initial, color: '#a78bfa' },
                { label: 'Follow up', value: stats.pto.followup, color: '#f97316' },
                { label: 'High Risk', value: stats.pto.highRisk, color: '#ef4444' },
              ]}
              legend={[
                { label: 'Low Risk', value: stats.pto.total - stats.pto.highRisk, color: '#60a5fa' },
                { label: 'High Risk', value: stats.pto.highRisk, color: '#ef4444' },
              ]}
            />
          </div>
        </div>

        {/* ── CHARTS ROW 1 ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Bar: Reports by module */}
          <Glass>
            <SH icon={<BarChart3 size={14} />} title="Reports by Module" sub="Total report count per safety category" />
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8 }}>
              <BarChart
                data={[
                  { label: 'Near Miss', value: stats.nm.total, color: '#f59e0b' },
                  { label: 'Work Stop.', value: stats.ws.total, color: '#f43f5e' },
                  { label: 'VFL', value: stats.vfl.total, color: '#10b981' },
                  { label: 'PTO', value: stats.pto.total, color: '#60a5fa' },
                ]}
                height={110} barWidth={46} gap={18}
              />
            </div>
          </Glass>

          {/* Donut: Action items status */}
          <Glass>
            <SH icon={<Target size={14} />} title="Action Items Status" sub="Across all safety modules combined" />
            {totals.totalActions === 0 ? <EmptyViz /> : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 24, justifyContent: 'center' }}>
                <DonutChart
                  segments={[
                    { value: totals.totalActionsDone, color: '#10b981' },
                    { value: totals.totalActionsProg, color: '#3b82f6' },
                    { value: totals.totalActionsPend, color: '#f59e0b' },
                  ]}
                  size={130} strokeWidth={20} label={totals.totalActions} sublabel="total"
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[
                    { label: 'Completed', value: totals.totalActionsDone, color: '#10b981' },
                    { label: 'In Progress', value: totals.totalActionsProg, color: '#3b82f6' },
                    { label: 'Pending', value: totals.totalActionsPend, color: '#f59e0b' },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 3, background: color, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', flex: 1 }}>{label}</span>
                      <span style={{ fontSize: 15, fontWeight: 800, color }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Glass>
        </div>

        {/* ── CHARTS ROW 2 ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* VFL behaviour */}
          <Glass>
            <SH icon={<Eye size={14} />} title="VFL Behaviour Breakdown" sub="Safe vs Unsafe observations recorded" />
            {stats.vfl.total === 0 ? <EmptyViz /> : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 24, justifyContent: 'center' }}>
                <DonutChart
                  segments={[
                    { value: stats.vfl.safe, color: '#10b981' },
                    { value: stats.vfl.unsafe, color: '#ef4444' },
                  ]}
                  size={110} strokeWidth={17}
                  label={`${Math.round((stats.vfl.safe / stats.vfl.total) * 100)}%`}
                  sublabel="safe"
                />
                <div style={{ flex: 1 }}>
                  <ProgBar label="Safe Behaviour" value={stats.vfl.safe} max={stats.vfl.total} color="#10b981"
                    sub={`${stats.vfl.safe} observations`} />
                  <ProgBar label="Unsafe Behaviour" value={stats.vfl.unsafe} max={stats.vfl.total} color="#ef4444"
                    sub={`${stats.vfl.unsafe} observations`} />
                </div>
              </div>
            )}
          </Glass>

          {/* Near Miss resolution */}
          <Glass>
            <SH icon={<AlertTriangle size={14} />} title="Near Miss Resolution" sub="Open vs Resolved near miss reports" />
            {stats.nm.total === 0 ? <EmptyViz /> : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 24, justifyContent: 'center' }}>
                <DonutChart
                  segments={[
                    { value: stats.nm.closed, color: '#10b981' },
                    { value: stats.nm.open, color: '#f59e0b' },
                    { value: Math.max(0, stats.nm.total - stats.nm.closed - stats.nm.open), color: '#6b7280' },
                  ]}
                  size={110} strokeWidth={17}
                  label={`${Math.round((stats.nm.closed / stats.nm.total) * 100)}%`}
                  sublabel="resolved"
                />
                <div style={{ flex: 1 }}>
                  <ProgBar label="Resolved / Closed" value={stats.nm.closed} max={stats.nm.total} color="#10b981" sub={`${stats.nm.closed} reports`} />
                  <ProgBar label="Open / Investigating" value={stats.nm.open} max={stats.nm.total} color="#f59e0b" sub={`${stats.nm.open} reports`} />
                  {stats.nm.high > 0 && (
                    <ProgBar label="High / Critical" value={stats.nm.high} max={stats.nm.total} color="#ef4444" sub={`${stats.nm.high} reports`} />
                  )}
                </div>
              </div>
            )}
          </Glass>
        </div>

        {/* ── PER-MODULE TREND ── */}
        <Glass>
          <SH icon={<TrendingUp size={14} />} title="Per-Module Monthly Trends" sub="Reports per module over the last 6 months" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            {[
              { key: 'nm',  label: 'Near Miss',    color: '#f59e0b' },
              { key: 'ws',  label: 'Work Stoppage', color: '#f43f5e' },
              { key: 'vfl', label: 'VFL',           color: '#10b981' },
              { key: 'pto', label: 'PTO',           color: '#60a5fa' },
            ].map(({ key, label, color }) => {
              const data = stats.moduleMonthly[key];
              const tot = data.reduce((a, b) => a + b, 0);
              return (
                <div key={key} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color }}>{label}</span>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{tot} total</span>
                  </div>
                  <TrendLineChart data={data} labels={trendLabels} color={color} height={70} />
                </div>
              );
            })}
          </div>
        </Glass>

        {/* ── PROGRESS SUMMARY ── */}
        <Glass>
          <SH icon={<Activity size={14} />} title="Action Plan Progress Summary" sub="Completion rates for corrective actions across all modules" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
            {[
              { label: 'Work Stoppage Actions', done: stats.ws.actDone, total: stats.ws.actTotal, color: '#f43f5e' },
              { label: 'VFL Actions', done: stats.vfl.actDone, total: stats.vfl.actTotal, color: '#10b981' },
              { label: 'PTO Actions', done: stats.pto.actDone, total: stats.pto.actTotal, color: '#60a5fa' },
              { label: 'All Actions Combined', done: totals.totalActionsDone, total: totals.totalActions, color: '#a78bfa' },
            ].map(({ label, done, total, color }) => (
              <div key={label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', fontWeight: 600 }}>{label}</span>
                  <span style={{ fontSize: 11, color, fontWeight: 700 }}>{done}/{total}</span>
                </div>
                <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.07)' }}>
                  <div style={{ height: '100%', borderRadius: 999, width: `${total > 0 ? (done / total) * 100 : 0}%`, background: color, transition: 'width 0.6s' }} />
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', marginTop: 4 }}>
                  {total > 0 ? Math.round((done / total) * 100) : 0}% complete
                </div>
              </div>
            ))}
          </div>
        </Glass>

        {/* ── COMMENTS ── */}
        <CommentsSection />

        </>)}

        <style>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
      </main>
    </PageShell>
  );
}
