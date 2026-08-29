'use client';
// frontend/components/maintenance/analytics.tsx — work-order analytics charts and
// their filter bar. Only AnalyticsPanel is consumed outside this file.
import { useState, useMemo } from "react";
import { useTheme, ACCENT_HEX, accentText, FormField, SelectField } from "@/components/shared/theme";
import {
  ChevronDown, ChevronUp, SlidersHorizontal, X, Layers, Activity, Cpu, HardHat, AlertTriangle, TrendingUp,
} from "@/components/shared/theme";
import type { WorkOrder } from "../../app/maintenance/types";
import { calcStats } from "../../app/maintenance/helpers";

// ==================== ANALYTICS FILTERS ====================
interface AnalyticsFilters { dateFrom: string; dateTo: string; department: string; artisan: string; machine: string; trade: string; failureMode: string; classification: string; discipline: string; }
const emptyAnalyticsFilters: AnalyticsFilters = { dateFrom: '', dateTo: '', department: '', artisan: '', machine: '', trade: '', failureMode: '', classification: '', discipline: '' };

function applyAnalyticsFilters(orders: WorkOrder[], f: AnalyticsFilters): WorkOrder[] {
  return orders.filter(w => {
    if (f.dateFrom && (w.date_raised || '') < f.dateFrom) return false;
    if (f.dateTo && (w.date_raised || '') > f.dateTo) return false;
    if (f.department && w.to_department !== f.department) return false;
    if (f.discipline && w.discipline !== f.discipline) return false;
    if (f.classification && w.classification !== f.classification) return false;
    if (f.trade && w.trade !== f.trade) return false;
    if (f.failureMode && w.failure_mode !== f.failureMode) return false;
    if (f.artisan) { const name = (w.allocated_to || w.artisan_name || '').trim(); if (name !== f.artisan) return false; }
    if (f.machine && !w.equipment_info?.toLowerCase().includes(f.machine.toLowerCase())) return false;
    return true;
  });
}

// ==================== ANALYTICS CHARTS ====================
function DonutChart({ segments, centerLabel }: { segments: { value: number; color: string; label: string }[]; centerLabel?: string }) {
  const t = useTheme();
  const total = segments.reduce((s, x) => s + x.value, 0);
  if (total === 0) return <div className={`flex items-center justify-center h-full text-xs ${t.textFaint}`}>No data</div>;
  const r = 36, cx = 50, cy = 50, sw = 14;
  const circ = 2 * Math.PI * r;
  const segData = segments.reduce<Array<{ seg: typeof segments[0]; dashLen: number; dashOff: number }>>((acc, seg) => {
    const pct = seg.value / total;
    const prevPct = acc.reduce((s, x) => s + x.dashLen / circ, 0);
    acc.push({ seg, dashLen: pct * circ, dashOff: -(prevPct * circ) });
    return acc;
  }, []);
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={t.light ? 'rgba(15,23,42,0.06)' : 'rgba(255,255,255,0.05)'} strokeWidth={sw} />
      {segData.map(({ seg, dashLen, dashOff }, i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={seg.color} strokeWidth={sw} strokeDasharray={`${dashLen} ${circ - dashLen}`} strokeDashoffset={dashOff} transform="rotate(-90 50 50)" style={{ transition: 'stroke-dasharray 0.4s ease' }}>
          <title>{seg.label}: {seg.value} ({Math.round((seg.value / total) * 100)}%)</title>
        </circle>
      ))}
      {centerLabel && <text x="50" y="47" textAnchor="middle" fill={t.light ? '#0f172a' : 'rgba(255,255,255,0.85)'} fontSize="11" fontWeight="600">{centerLabel}</text>}
      <text x="50" y="59" textAnchor="middle" fill={t.light ? 'rgba(15,23,42,0.4)' : 'rgba(255,255,255,0.35)'} fontSize="7">{total} total</text>
    </svg>
  );
}

function ChartLegend({ items }: { items: { color: string; label: string; value: number; total: number }[] }) {
  const t = useTheme();
  return (
    <div className="space-y-1.5 mt-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
          <span className={`text-xs flex-1 truncate ${t.textMuted}`}>{item.label}</span>
          <span className={`text-xs font-medium ${t.textPrimary}`}>{item.value}</span>
          <span className={`text-[10px] w-8 text-right ${t.textFaint}`}>{item.total > 0 ? `${Math.round(item.value / item.total * 100)}%` : '—'}</span>
        </div>
      ))}
    </div>
  );
}

function HBarChart({ data, maxColor }: { data: { label: string; value: number }[]; maxColor: string }) {
  const t = useTheme();
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="space-y-2">
      {data.map((d, i) => (
        <div key={i} className="space-y-0.5">
          <div className="flex items-center justify-between"><span className={`text-xs truncate max-w-[140px] ${t.textMuted}`}>{d.label}</span><span className={`text-xs font-medium ml-2 ${t.textPrimary}`}>{d.value}</span></div>
          <div className={`h-2 ${t.chipBg} rounded-full overflow-hidden`}><div className="h-full rounded-full transition-all duration-500" style={{ width: `${(d.value / max) * 100}%`, backgroundColor: maxColor, opacity: 0.6 + 0.4 * (d.value / max) }} /></div>
        </div>
      ))}
    </div>
  );
}

function TimeHeatmap({ hourBuckets }: { hourBuckets: number[] }) {
  const t = useTheme();
  const max = Math.max(...hourBuckets, 1);
  const LABELS = ['0', '2', '4', '6', '8', '10', '12', '14', '16', '18', '20', '22'];
  const PERIOD_COLORS: Record<string, string> = { night: '#6366f1', dawn: '#f59e0b', morning: '#10b981', afternoon: '#3b82f6', evening: '#f43f5e', late: '#8b5cf6' };
  const getPeriod = (h: number) => { if (h < 4) return 'night'; if (h < 7) return 'dawn'; if (h < 12) return 'morning'; if (h < 17) return 'afternoon'; if (h < 21) return 'evening'; return 'late'; };
  const peakHour = hourBuckets.indexOf(max);
  return (
    <div>
      <div className="flex gap-0.5">
        {hourBuckets.map((count, h) => {
          const intensity = count / max;
          const color = PERIOD_COLORS[getPeriod(h)];
          return (
            <div key={h} className="flex-1 flex flex-col items-center gap-0.5" title={`${String(h).padStart(2, '0')}:00 — ${count} breakdown${count !== 1 ? 's' : ''}`}>
              <div className="w-full rounded-sm transition-all duration-300" style={{ height: 40, backgroundColor: count > 0 ? color : (t.light ? 'rgba(15,23,42,0.04)' : 'rgba(255,255,255,0.04)'), opacity: count > 0 ? 0.2 + 0.8 * intensity : 1, border: h === peakHour && count > 0 ? '1px solid rgba(128,128,128,0.4)' : '1px solid transparent' }} />
            </div>
          );
        })}
      </div>
      <div className="flex mt-1">{LABELS.map((l, i) => <div key={i} className={`text-[9px] ${t.textFaint}`} style={{ width: `${100 / 12}%` }}>{l}</div>)}</div>
      {max > 0 && (
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          {Object.entries(PERIOD_COLORS).map(([period, color]) => <div key={period} className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm" style={{ backgroundColor: color, opacity: 0.7 }} /><span className={`text-[9px] capitalize ${t.textFaint}`}>{period}</span></div>)}
          <span className={`text-[9px] ml-auto ${t.textFaint}`}>Peak: {String(peakHour).padStart(2, '0')}:00 ({hourBuckets[peakHour]} breakdowns)</span>
        </div>
      )}
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 bg-brand-500/10 text-brand-400/90 text-[10px] px-2 py-0.5 rounded-full">
      {label}<button type="button" onClick={onRemove} className="hover:opacity-70 transition-opacity ml-0.5 flex-shrink-0"><X className="h-2.5 w-2.5" /></button>
    </span>
  );
}

function AnalyticsFilterBar({ allOrders, filters, onChange }: { allOrders: WorkOrder[]; filters: AnalyticsFilters; onChange: (f: AnalyticsFilters) => void; }) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const uniq = (vals: (string | undefined | null)[]) => [...new Set(vals.map(v => (v || '').trim()).filter(Boolean))].sort();
  const depts = uniq(allOrders.map(w => w.to_department));
  const artisans = uniq(allOrders.map(w => w.allocated_to || w.artisan_name));
  const machines = uniq(allOrders.map(w => w.equipment_info));
  const trades = uniq(allOrders.filter(w => w.trade).map(w => w.trade));
  const failModes = uniq(allOrders.filter(w => w.failure_mode).map(w => w.failure_mode));
  const set = (k: keyof AnalyticsFilters, v: string) => onChange({ ...filters, [k]: v });
  const activeCount = Object.values(filters).filter(v => v !== '').length;
  const clearAll = () => onChange({ ...emptyAnalyticsFilters });
  const selCls = `w-full text-xs rounded-lg px-2.5 py-1.5 outline-none cursor-pointer ${t.inputBg}`;
  const inpCls = `w-full text-xs rounded-lg px-2.5 py-1.5 outline-none ${t.inputBg}`;

  const activeChips: { key: keyof AnalyticsFilters; label: string }[] = [
    filters.dateFrom ? { key: 'dateFrom', label: `From: ${filters.dateFrom}` } : null,
    filters.dateTo ? { key: 'dateTo', label: `To: ${filters.dateTo}` } : null,
    filters.department ? { key: 'department', label: `Dept: ${filters.department}` } : null,
    filters.artisan ? { key: 'artisan', label: `Artisan: ${filters.artisan}` } : null,
    filters.machine ? { key: 'machine', label: `Machine: ${filters.machine}` } : null,
    filters.classification ? { key: 'classification', label: `Class: ${filters.classification === 'planned_maintenance' ? 'Planned Maint.' : filters.classification === 'breakdown' ? 'Breakdown' : filters.classification === 'project' ? 'Project' : 'Custom'}` } : null,
    filters.discipline ? { key: 'discipline', label: `Disc: ${filters.discipline}` } : null,
    filters.trade ? { key: 'trade', label: `Trade: ${filters.trade}` } : null,
    filters.failureMode ? { key: 'failureMode', label: `Fail: ${filters.failureMode}` } : null,
  ].filter(Boolean) as { key: keyof AnalyticsFilters; label: string }[];

  return (
    <div className={`${t.chipBg} rounded-xl overflow-hidden`}>
      <button type="button" onClick={() => setOpen(o => !o)} className={`w-full flex items-center gap-2.5 px-4 py-2.5 ${t.hoverBgSoft} transition-colors text-left`}>
        <SlidersHorizontal className="h-3.5 w-3.5 text-brand-400/80 flex-shrink-0" />
        <span className={`text-xs font-medium ${t.textMuted}`}>Filter Analytics</span>
        {activeCount > 0 && <span className="bg-brand-500/20 text-brand-400 text-[10px] font-semibold px-1.5 py-px rounded-full">{activeCount}</span>}
        <div className="flex-1" />
        {activeCount > 0 && !open && <button type="button" onClick={e => { e.stopPropagation(); clearAll(); }} className={`text-[10px] transition-colors px-2 py-0.5 rounded-lg flex-shrink-0 ${t.textFaint} ${t.hoverText} ${t.hoverBg}`}>Clear all</button>}
        {open ? <ChevronUp className={`h-3.5 w-3.5 flex-shrink-0 ${t.textFaint}`} /> : <ChevronDown className={`h-3.5 w-3.5 flex-shrink-0 ${t.textFaint}`} />}
      </button>
      {!open && activeCount > 0 && <div className="flex flex-wrap gap-1.5 px-4 pb-3">{activeChips.map(c => <FilterChip key={c.key} label={c.label} onRemove={() => set(c.key, '')} />)}</div>}
      {open && (
        <div className={`border-t ${t.border} px-4 py-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3`}>
          <FormField label="From Date"><input type="date" title="From date" value={filters.dateFrom} onChange={e => set('dateFrom', e.target.value)} className={inpCls} /></FormField>
          <FormField label="To Date"><input type="date" title="To date" value={filters.dateTo} onChange={e => set('dateTo', e.target.value)} className={inpCls} /></FormField>
          {depts.length > 0 && <FormField label="Department"><SelectField size="filter" title="Department" value={filters.department} onChange={v => set('department', v)} options={[{ value: '', label: 'All departments' }, ...depts.map(d => ({ value: d, label: d }))]} /></FormField>}
          <FormField label="Classification">
            <SelectField size="filter" title="Classification" value={filters.classification} onChange={v => set('classification', v)}
              options={[
                { value: '', label: 'All' },
                { value: 'planned_maintenance', label: 'Planned Maintenance' },
                { value: 'project', label: 'Project' },
                { value: 'breakdown', label: 'Breakdown' },
                { value: 'custom', label: 'Custom / Other' },
              ]} />
          </FormField>
          <FormField label="Discipline"><SelectField size="filter" title="Discipline" value={filters.discipline} onChange={v => set('discipline', v)} options={[{ value: '', label: 'All' }, { value: 'Mechanical', label: 'Mechanical' }, { value: 'Electrical', label: 'Electrical' }]} /></FormField>
          {artisans.length > 0 && <FormField label="Artisan"><SelectField size="filter" title="Artisan" value={filters.artisan} onChange={v => set('artisan', v)} options={[{ value: '', label: 'All artisans' }, ...artisans.map(a => ({ value: a, label: a }))]} /></FormField>}
          {machines.length > 0 && <FormField label="Machine"><SelectField size="filter" title="Machine" value={filters.machine} onChange={v => set('machine', v)} options={[{ value: '', label: 'All machines' }, ...machines.map(m => ({ value: m, label: m }))]} /></FormField>}
          {trades.length > 0 && <FormField label="Trade"><SelectField size="filter" title="Trade" value={filters.trade} onChange={v => set('trade', v)} options={[{ value: '', label: 'All trades' }, ...trades.map(tr => ({ value: tr, label: tr }))]} /></FormField>}
          {failModes.length > 0 && <FormField label="Failure Mode"><SelectField size="filter" title="Failure mode" value={filters.failureMode} onChange={v => set('failureMode', v)} options={[{ value: '', label: 'All failure modes' }, ...failModes.map(f => ({ value: f, label: f }))]} /></FormField>}
          {activeCount > 0 && (
            <div className="flex items-end col-span-full">
              <button type="button" onClick={clearAll} className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors ${t.textFaint} ${t.hoverText} border ${t.border}`}><X className="h-3 w-3" /> Clear all filters</button>
              <span className={`ml-3 text-xs self-center ${t.textFaint}`}>Showing {allOrders.filter(w => applyAnalyticsFilters([w], filters).length > 0).length} of {allOrders.length} work orders</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ArtisanCostChart({ artisanCost }: { artisanCost: ReturnType<typeof calcStats>['artisanCost'] }) {
  const t = useTheme();
  if (artisanCost.length === 0) return <div className={`flex items-center justify-center h-20 text-xs ${t.textFaint}`}>No breakdown data yet</div>;
  const top = artisanCost.slice(0, 6);
  const maxHours = Math.max(...top.map(a => a.hours), 1);
  return (
    <div className="space-y-2">
      {top.map((a, i) => (
        <div key={i} className="space-y-1">
          <div className="flex items-center justify-between">
            <span className={`text-xs truncate max-w-[120px] ${t.textMuted}`}>{a.name}</span>
            <div className="flex items-center gap-3 text-[10px] text-right">
              {/* "~" flags totals that still contain supervisor estimates because the
                  artisan hasn't recorded actual time on some of the work orders. */}
              <span className={t.light ? 'text-brand-600/80' : 'text-brand-400/80'} title={a.estimated > 0 ? `includes ${a.estimated.toFixed(1)}h estimated (no actual time recorded)` : 'actual recorded time'}>{a.estimated > 0 ? '~' : ''}{a.hours.toFixed(1)}h</span>
              {a.sparesCost > 0 && <span className={t.light ? 'text-amber-600/80' : 'text-amber-400/80'}>R{a.sparesCost.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}</span>}
              <span className={t.textFaint}>({a.count} WO)</span>
            </div>
          </div>
          <div className={`h-2 ${t.chipBg} rounded-full overflow-hidden`}><div className="h-full rounded-full bg-brand-400/50 transition-all duration-500" style={{ width: `${(a.hours / maxHours) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

export function AnalyticsPanel({ stats, standalone, rawOrders = [] }: { stats: ReturnType<typeof calcStats>; standalone?: boolean; rawOrders?: WorkOrder[]; }) {
  const t = useTheme();
  const [filters, setFilters] = useState<AnalyticsFilters>(emptyAnalyticsFilters);
  const activeStats = useMemo(() => {
    if (!standalone || rawOrders.length === 0) return stats;
    const activeCount = Object.values(filters).filter(v => v !== '').length;
    if (activeCount === 0) return stats;
    return calcStats(applyAnalyticsFilters(rawOrders, filters));
  }, [standalone, rawOrders, filters, stats]);

  const classSegs = [
    { value: activeStats.plannedMaintenance, color: '#10b981', label: 'Planned Maintenance' },
    { value: activeStats.projects, color: '#3b82f6', label: 'Projects' },
    { value: activeStats.breakdowns, color: '#ef4444', label: 'Breakdowns' },
    { value: activeStats.customClass, color: '#8b5cf6', label: 'Custom / Other' },
  ].filter(s => s.value > 0);
  const statusSegs = [
    { value: activeStats.pending, color: '#fbbf24', label: 'Pending' },
    { value: activeStats.inProgress, color: '#60a5fa', label: 'In Progress' },
    { value: activeStats.completed, color: '#34d399', label: 'Completed' },
    { value: activeStats.onHold, color: '#fb923c', label: 'On Hold' },
  ].filter(s => s.value > 0);
  const discSegs = [
    { value: activeStats.mechanical, color: ACCENT_HEX.blue, label: 'Mechanical' },
    { value: activeStats.electrical, color: '#fbbf24', label: 'Electrical' },
  ].filter(s => s.value > 0);
  const activeFilterCount = Object.values(filters).filter(v => v !== '').length;

  return (
    <div className="space-y-6">
      {standalone && rawOrders.length > 0 && <AnalyticsFilterBar allOrders={rawOrders} filters={filters} onChange={setFilters} />}

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total WOs', value: activeStats.total, color: t.textPrimary, sub: activeFilterCount > 0 ? `of ${stats.total}` : undefined },
          { label: 'Breakdowns', value: activeStats.breakdowns, color: accentText('red', t.light), sub: activeStats.total > 0 ? `${Math.round(activeStats.breakdowns / activeStats.total * 100)}%` : '—' },
          { label: 'Planned Maint.', value: activeStats.plannedMaintenance, color: accentText('green', t.light), sub: undefined },
          { label: 'Breakdown Hrs', value: `${activeStats.artisanCost.reduce((a, x) => a + x.hours, 0).toFixed(1)}h`, color: accentText('brand', t.light), sub: undefined },
          { label: 'Spares Cost', value: `R${activeStats.sparesTotalCost.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}`, color: accentText('amber', t.light), sub: undefined },
          { label: 'Completion', value: `${activeStats.efficiency}%`, color: accentText(activeStats.efficiency >= 70 ? 'green' : activeStats.efficiency >= 40 ? 'yellow' : 'red', t.light), sub: `${activeStats.completed}/${activeStats.total}` },
        ].map(k => (
          <div key={k.label} className={`${t.chipBg} rounded-xl p-3 text-center`}>
            <div className={`text-xl font-bold font-mono ${k.color}`}>{k.value}</div>
            <div className={`text-[10px] mt-0.5 ${t.textFaint}`}>{k.label}</div>
            {k.sub && <div className={`text-[9px] ${t.textFaint}`}>{k.sub}</div>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className={`${t.glass} rounded-xl p-4`}>
          <div className={`text-xs font-medium mb-3 flex items-center gap-1.5 ${t.textMuted}`}><Layers className={`h-3.5 w-3.5 ${accentText('brand', t.light)}`} /> WO Classification</div>
          <div className="h-28"><DonutChart segments={classSegs} centerLabel={String(activeStats.total)} /></div>
          <ChartLegend items={classSegs.map(s => ({ ...s, total: activeStats.total }))} />
        </div>
        <div className={`${t.glass} rounded-xl p-4`}>
          <div className={`text-xs font-medium mb-3 flex items-center gap-1.5 ${t.textMuted}`}><Activity className={`h-3.5 w-3.5 ${accentText('green', t.light)}`} /> Status Breakdown</div>
          <div className="h-28"><DonutChart segments={statusSegs} centerLabel={`${activeStats.efficiency}%`} /></div>
          <ChartLegend items={statusSegs.map(s => ({ ...s, total: activeStats.total }))} />
        </div>
        <div className={`${t.glass} rounded-xl p-4`}>
          <div className={`text-xs font-medium mb-3 flex items-center gap-1.5 ${t.textMuted}`}><Cpu className={`h-3.5 w-3.5 ${accentText('amber', t.light)}`} /> Discipline</div>
          <div className="h-28"><DonutChart segments={discSegs} centerLabel={activeStats.mechanical + activeStats.electrical > 0 ? undefined : '—'} /></div>
          <ChartLegend items={discSegs.map(s => ({ ...s, total: activeStats.mechanical + activeStats.electrical }))} />
          {activeStats.sparesTotalCost > 0 && (
            <div className={`mt-3 pt-2 border-t ${t.border} text-center`}>
              <div className={`text-[10px] ${t.textFaint}`}>Spares Cost</div>
              <div className={`${t.light ? 'text-amber-600/90' : 'text-amber-400/90'} text-sm font-semibold font-mono`}>${activeStats.sparesTotalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className={`${t.glass} rounded-xl p-4`}>
          <div className={`text-xs font-medium mb-3 flex items-center gap-1.5 ${t.textMuted}`}><HardHat className={`h-3.5 w-3.5 ${accentText('brand', t.light)}`} /> Artisan Hours (Breakdowns)</div>
          <ArtisanCostChart artisanCost={activeStats.artisanCost} />
          {activeStats.artisanCost.length > 0 && <div className={`mt-3 text-[10px] ${t.textFaint}`}>Hours shown as a cost proxy. Spares cost in USD ($) shown where entered.</div>}
        </div>
        <div className={`${t.glass} rounded-xl p-4`}>
          <div className={`text-xs font-medium mb-3 flex items-center gap-1.5 ${t.textMuted}`}><AlertTriangle className={`h-3.5 w-3.5 ${accentText('red', t.light)}`} /> Failure Modes (Top 8)</div>
          {activeStats.failureModes.length > 0 ? <HBarChart data={activeStats.failureModes.map(([label, value]) => ({ label, value }))} maxColor="#ef4444" /> : <div className={`text-xs ${t.textFaint}`}>No breakdown failure modes recorded</div>}
        </div>
      </div>

      <div className={`${t.glass} rounded-xl p-4`}>
        <div className={`text-xs font-medium mb-3 flex items-center gap-1.5 ${t.textMuted}`}><TrendingUp className={`h-3.5 w-3.5 ${accentText('violet', t.light)}`} /> Breakdown Occurrence — Time of Day</div>
        {activeStats.breakdowns > 0 ? <TimeHeatmap hourBuckets={activeStats.hourBuckets} /> : <div className={`text-xs py-4 ${t.textFaint}`}>No breakdown time data recorded yet</div>}
      </div>
    </div>
  );
}
