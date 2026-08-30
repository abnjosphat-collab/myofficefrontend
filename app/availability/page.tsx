// app/availability/page.tsx
'use client';

import { useState, ElementType } from 'react';
import Link from 'next/link';
import {
  ToolCase, AlertTriangle, BarChart3, Gauge,
  LineChart, Plus, RefreshCw, Search, Settings,
  Clock, Activity, Percent, Calculator,
} from '@/components/shared/theme';
import { AppShell } from '@/components/app-shell';
import { formatDate } from '@/lib/format';
import { DownloadButton, type DLColumn } from '@/components/shared/DownloadButton';
import { exportFilename } from '@/lib/exportUtils';
import { PillTabs } from '@/components/shared/PillTabs';
import {
  useTheme, PageHero, StatTile, StatusBadge, SearchInput, ProgressBar, useCollapseSection, ACCENT_HEX, SelectField, accentText, TYPE_WEIGHT,
} from '@/components/shared/theme';
import type { Equipment } from './types';
import { useAvailabilityData } from './useAvailabilityData';

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const fmtDate = (d: string | null) => (d ? formatDate(d) : 'Not scheduled');

function statusCfg(status: Equipment['status']) {
  const map: Record<Equipment['status'], { color: string; label: string }> = {
    operational: { color: '#34d399', label: 'Operational' },
    maintenance: { color: '#fbbf24', label: 'Maintenance' },
    breakdown: { color: '#f87171', label: 'Breakdown' },
    idle: { color: '#94a3b8', label: 'Idle' },
  };
  return map[status] ?? { color: '#94a3b8', label: status };
}

function avColor(pct: number) {
  if (pct >= 95) return 'text-emerald-400';
  if (pct >= 90) return 'text-amber-400';
  return 'text-red-400';
}
function avHex(pct: number) {
  if (pct >= 95) return '#34d399';
  if (pct >= 90) return '#fbbf24';
  return '#f87171';
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

function AvailabilityContent() {
  const t = useTheme();
  const sections = useCollapseSection({ hero: true, filters: true });
  const { equipment, stats, loading, refreshing, fetchData } = useAvailabilityData();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tab, setTab] = useState<'overview' | 'detailed' | 'trends'>('overview');

  const categories = Array.from(new Set(equipment.map(e => e.category)));
  const departments = Array.from(new Set(equipment.map(e => e.department)));

  const filtered = equipment.filter(eq => {
    const s = searchTerm.toLowerCase();
    const matchSearch = !s || eq.name.toLowerCase().includes(s) || eq.category.toLowerCase().includes(s) || (eq.department ?? '').toLowerCase().includes(s);
    const matchCat = categoryFilter === 'all' || eq.category === categoryFilter;
    const matchStatus = statusFilter === 'all' || eq.status === statusFilter;
    return matchSearch && matchCat && matchStatus;
  });

  const exportColumns: DLColumn[] = [
    { key: 'name', label: 'Equipment', width: 24 },
    { key: 'category', label: 'Category', width: 18 },
    { key: 'department', label: 'Department', width: 18, format: v => (v as string) ?? '' },
    { key: 'status', label: 'Status', width: 14, format: v => statusCfg(v as Equipment['status']).label },
    { key: 'operational_hours', label: 'Op. Hours', width: 12 },
    { key: 'breakdown_hours', label: 'Breakdown Hours', width: 16 },
    { key: 'availability', label: 'Availability %', width: 14, format: v => `${((v as number) ?? 0).toFixed(1)}%` },
    { key: 'uptime', label: 'Uptime', width: 12 },
    { key: 'downtime', label: 'Downtime', width: 12 },
    { key: 'mtbf', label: 'MTBF (h)', width: 12 },
    { key: 'mttr', label: 'MTTR (h)', width: 12 },
    { key: 'last_maintenance', label: 'Last Maintenance', width: 16, format: v => fmtDate(v as string | null) },
    { key: 'next_maintenance', label: 'Next Maintenance', width: 16, format: v => fmtDate((v as string | null) ?? null) },
  ];

  const selCls = `h-9 rounded-lg px-3 text-sm outline-none transition-colors ${t.inputBg}`;
  const thCls = `text-left px-3 py-2 text-[10px] uppercase tracking-wide ${TYPE_WEIGHT.medium} ${t.textFaint}`;
  const tdCls = `px-3 py-2.5 text-sm ${t.textMuted}`;

  const TABS: { key: typeof tab; label: string; icon: ElementType }[] = [
    { key: 'overview', label: 'Availability Overview', icon: Gauge },
    { key: 'detailed', label: 'Detailed Analysis', icon: Calculator },
    { key: 'trends', label: 'Trends & Metrics', icon: LineChart },
  ];

  return (
    <main className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <PageHero
        icon={Gauge}
        accent="violet"
        crumbs={['Time & Attendance', 'Availability']}
        title="Equipment Availability"
        description="Track availability = (Operational Hours − Breakdown Hours) / Operational Hours × 100"
        statsOpen={sections.expanded.hero}
        actions={
          <>
            <button type="button" onClick={() => fetchData(true)} title="Refresh" className={`h-8 w-8 flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} ${t.hoverText}`}>
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            {filtered.length > 0 && (
              <DownloadButton
                data={filtered as unknown as Record<string, unknown>[]}
                columns={exportColumns}
                filename={exportFilename('Equipment_Availability')}
                title="Equipment Availability"
                statusColumn="status"
                statusColor={(_v, row) => statusCfg(row.status as Equipment['status']).color.replace('#', '')}
              />
            )}
            <Link href="/breakdowns" className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] ${TYPE_WEIGHT.medium} ${t.chipBg} ${t.textMuted} ${t.hoverBg}`}>
              <AlertTriangle className="h-3.5 w-3.5" /> Breakdowns
            </Link>
          </>
        }
      >
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
          <StatTile icon={Gauge} color={ACCENT_HEX.blue} label="Total Equipment" value={stats.totalEquipment} />
          <StatTile icon={Activity} color="#34d399" label="Operational" value={stats.operational} />
          <StatTile icon={Settings} color="#fbbf24" label="Maintenance" value={stats.inMaintenance} />
          <StatTile icon={AlertTriangle} color="#f87171" label="Breakdown" value={stats.inBreakdown} />
          <StatTile icon={Percent} color={avHex(stats.overallAvailability)} label="Availability" value={`${stats.overallAvailability.toFixed(1)}%`} />
        </div>
      </PageHero>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className={`${t.glass} rounded-xl p-4`}>
          <div className="flex items-center gap-1.5 mb-1"><Percent className="h-3.5 w-3.5 text-brand-400" /><span className={`text-xs ${t.textFaint}`}>Overall Availability</span></div>
          <div className={`text-xl ${TYPE_WEIGHT.bold} ${avColor(stats.overallAvailability)}`}>{stats.overallAvailability.toFixed(1)}%</div>
          <div className="mt-2"><ProgressBar value={stats.overallAvailability} color={avHex(stats.overallAvailability)} showValue={false} /></div>
        </div>
        <div className={`${t.glass} rounded-xl p-4`}>
          <div className="flex items-center gap-1.5 mb-1"><Clock className={`h-3.5 w-3.5 ${accentText('emerald', t.light)}`} /><span className={`text-xs ${t.textFaint}`}>Avg Uptime</span></div>
          <div className={`text-xl ${TYPE_WEIGHT.bold} ${accentText('emerald', t.light)}`}>{stats.avgUptime.toFixed(1)}h</div>
        </div>
        <div className={`${t.glass} rounded-xl p-4`}>
          <div className="flex items-center gap-1.5 mb-1"><Activity className="h-3.5 w-3.5 text-red-400" /><span className={`text-xs ${t.textFaint}`}>Avg Downtime</span></div>
          <div className={`text-xl ${TYPE_WEIGHT.bold} text-red-400`}>{stats.avgDowntime.toFixed(1)}h</div>
        </div>
        <div className={`${t.glass} rounded-xl p-4`}>
          <div className="flex items-center gap-1.5 mb-1"><AlertTriangle className={`h-3.5 w-3.5 ${accentText('amber', t.light)}`} /><span className={`text-xs ${t.textFaint}`}>Total Downtime</span></div>
          <div className={`text-xl ${TYPE_WEIGHT.bold} ${accentText('amber', t.light)}`}>{stats.totalBreakdownHours.toFixed(0)}h</div>
        </div>
      </div>

      <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
        <div className={`flex items-center gap-2 px-5 py-3 border-b ${t.border}`}>
          <Search className="h-4 w-4 text-brand-400" />
          <span className={`${TYPE_WEIGHT.semibold} text-sm ${t.textPrimary}`}>Filters</span>
        </div>
        <div className="px-5 pb-4 pt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search by name, category, department…" />
          <SelectField size="filter" title="Category" value={categoryFilter} onChange={setCategoryFilter}
            options={[{ value: 'all', label: 'All Categories' }, ...categories.map(c => ({ value: c, label: c }))]} />
          <SelectField size="filter" title="Status" value={statusFilter} onChange={setStatusFilter}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'operational', label: 'Operational' },
              { value: 'maintenance', label: 'Maintenance' },
              { value: 'breakdown', label: 'Breakdown' },
              { value: 'idle', label: 'Idle' },
            ]} />
        </div>
        <div className={`px-5 pb-3 text-xs ${t.textFaint}`}>{filtered.length} of {equipment.length} equipment</div>
      </div>

      <PillTabs tabs={TABS} value={tab} onChange={setTab} />

      {loading ? (
        <div className="flex items-center justify-center py-16"><RefreshCw className={`h-6 w-6 animate-spin ${t.textFaint}`} /></div>
      ) : tab === 'overview' ? (
        <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
          <div className={`flex items-center gap-2 px-5 py-3 border-b ${t.border}`}>
            <Gauge className="h-4 w-4 text-brand-400" /><span className={`${TYPE_WEIGHT.semibold} text-sm ${t.textPrimary}`}>Equipment Availability Dashboard</span>
          </div>
          {filtered.length === 0 ? (
            <div className={`py-12 text-center text-sm ${t.textFaint}`}>No equipment data. Add equipment and breakdown data to start tracking.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`border-b ${t.border}`}>
                  <tr>
                    <th className={thCls}>Equipment</th><th className={thCls}>Category</th><th className={thCls}>Department</th>
                    <th className={thCls}>Status</th><th className={`${thCls} text-right`}>Op. Hours</th><th className={`${thCls} text-right`}>Breakdown h</th>
                    <th className={`${thCls} text-right`}>Availability</th><th className={`${thCls} text-right`}>Uptime</th><th className={`${thCls} text-right`}>Downtime</th><th className={thCls}></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(eq => {
                    const scfg = statusCfg(eq.status);
                    // A real/legacy equipment record missing one of these numeric fields
                    // otherwise crashed the whole table on .toFixed() (found live, 2026-08-29
                    // UI audit, audit/07-ui-polish-findings.md) — same class of bug as
                    // useAvailabilityData's stats merge, one level down at the per-row field.
                    const opHours = eq.operational_hours ?? 0;
                    const bdHours = eq.breakdown_hours ?? 0;
                    const av = eq.availability ?? 0;
                    const uptime = eq.uptime ?? 0;
                    const downtime = eq.downtime ?? 0;
                    return (
                      <tr key={eq.id} className={`border-b ${t.border} ${t.hoverBgSoft} transition-colors`}>
                        <td className={tdCls}><span className={`${TYPE_WEIGHT.medium} ${t.textPrimary}`}>{eq.name}</span></td>
                        <td className={tdCls}>{eq.category}</td>
                        <td className={tdCls}>{eq.department}</td>
                        <td className={tdCls}><StatusBadge color={scfg.color} label={scfg.label} /></td>
                        <td className={`${tdCls} text-right`}>{opHours.toFixed(1)}h</td>
                        <td className={`${tdCls} text-right text-red-400`}>{bdHours.toFixed(1)}h</td>
                        <td className={`${tdCls} text-right`}>
                          <div className="flex items-center gap-2 justify-end">
                            <span className={`${TYPE_WEIGHT.bold} text-sm ${avColor(av)}`}>{av.toFixed(1)}%</span>
                            <div className="w-20"><ProgressBar value={av} color={avHex(av)} showValue={false} /></div>
                          </div>
                        </td>
                        <td className={`${tdCls} text-right ${accentText('emerald', t.light)}`}>{uptime.toFixed(1)}h</td>
                        <td className={`${tdCls} text-right text-red-400`}>{downtime.toFixed(1)}h</td>
                        <td className={tdCls}>
                          <div className="flex gap-1.5 justify-end">
                            <Link href={`/breakdowns?equipment=${eq.id}`} className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] ${t.chipBg} ${t.textFaint} ${t.hoverBg} ${t.hoverText}`}><AlertTriangle className="h-3 w-3" /> Breakdowns</Link>
                            <Link href={`/maintenance?equipment=${eq.id}`} className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] ${t.chipBg} ${t.textFaint} ${t.hoverBg} ${t.hoverText}`}><Settings className="h-3 w-3" /> Maintenance</Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : tab === 'detailed' ? (
        <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
          <div className={`flex items-center gap-2 px-5 py-3 border-b ${t.border}`}>
            <Calculator className="h-4 w-4 text-brand-400" /><span className={`${TYPE_WEIGHT.semibold} text-sm ${t.textPrimary}`}>Detailed Availability Analysis</span>
          </div>
          {filtered.length === 0 ? (
            <div className={`py-12 text-center text-sm ${t.textFaint}`}>No equipment data available for detailed analysis.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`border-b ${t.border}`}>
                  <tr>
                    <th className={thCls}>Equipment</th><th className={`${thCls} text-center`}>MTBF</th><th className={`${thCls} text-center`}>MTTR</th>
                    <th className={thCls}>Last Maintenance</th><th className={thCls}>Next Maintenance</th>
                    <th className={`${thCls} text-right`}>BD Frequency</th><th className={`${thCls} text-right`}>Cost Impact</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(eq => {
                    const mtbf = eq.mtbf ?? 0;
                    const mttr = eq.mttr ?? 0;
                    const bdHours = eq.breakdown_hours ?? 0;
                    const opHours = eq.operational_hours ?? 0;
                    const downtime = eq.downtime ?? 0;
                    return (
                    <tr key={eq.id} className={`border-b ${t.border} ${t.hoverBgSoft} transition-colors`}>
                      <td className={tdCls}><span className={`${TYPE_WEIGHT.medium} ${t.textPrimary}`}>{eq.name}</span></td>
                      <td className={`${tdCls} text-center`}><StatusBadge color={mtbf > 200 ? '#34d399' : mtbf > 100 ? '#94a3b8' : '#f87171'} label={`${mtbf.toFixed(1)}h`} /></td>
                      <td className={`${tdCls} text-center`}><StatusBadge color={mttr < 5 ? '#34d399' : mttr < 10 ? '#94a3b8' : '#f87171'} label={`${mttr.toFixed(1)}h`} /></td>
                      <td className={`${tdCls} text-xs`}>{fmtDate(eq.last_maintenance)}</td>
                      <td className="px-3 py-2.5 text-xs text-brand-400">{fmtDate(eq.next_maintenance ?? null)}</td>
                      <td className={`${tdCls} text-right`}>{bdHours > 0 && opHours > 0 ? (bdHours / opHours * 100).toFixed(1) : '0.0'}%</td>
                      <td className={`${tdCls} text-right text-red-400 ${TYPE_WEIGHT.medium}`}>${(downtime * 250).toLocaleString()}</td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
            <div className={`flex items-center gap-2 px-5 py-3 border-b ${t.border}`}>
              <LineChart className="h-4 w-4 text-brand-400" /><span className={`${TYPE_WEIGHT.semibold} text-sm ${t.textPrimary}`}>Availability Trends</span>
            </div>
            <div className="p-5">
              <div className={`rounded-xl border ${t.border} ${t.chipBg} h-48 flex items-center justify-center mb-4`}>
                <div className="text-center">
                  <LineChart className={`h-8 w-8 mx-auto mb-2 ${t.textFaint}`} />
                  <p className={`text-sm ${t.textFaint}`}>Chart integration point</p>
                  <p className={`text-lg ${TYPE_WEIGHT.bold} mt-1 ${avColor(stats.overallAvailability)}`}>{stats.overallAvailability.toFixed(1)}% current</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className={`flex justify-between ${t.textMuted}`}><span>Last month</span><span className={`${TYPE_WEIGHT.medium} ${avColor(stats.monthAvailability)}`}>{stats.monthAvailability.toFixed(1)}%</span></div>
                <div className={`flex justify-between ${t.textMuted}`}><span>Last week</span><span className={`${TYPE_WEIGHT.medium} ${avColor(stats.weekAvailability)}`}>{stats.weekAvailability.toFixed(1)}%</span></div>
              </div>
            </div>
          </div>

          <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
            <div className={`flex items-center gap-2 px-5 py-3 border-b ${t.border}`}>
              <BarChart3 className="h-4 w-4 text-brand-400" /><span className={`${TYPE_WEIGHT.semibold} text-sm ${t.textPrimary}`}>Department Comparison</span>
            </div>
            <div className="p-5 space-y-3">
              {departments.map(dept => {
                const deptEq = filtered.filter(e => e.department === dept);
                const deptAv = deptEq.length > 0 ? deptEq.reduce((s, e) => s + (e.availability ?? 0), 0) / deptEq.length : 0;
                return (
                  <div key={dept}>
                    <div className="flex justify-between mb-1">
                      <span className={`text-xs ${t.textMuted}`}>{dept}</span>
                      <span className={`text-xs ${TYPE_WEIGHT.bold} ${avColor(deptAv)}`}>{deptAv.toFixed(1)}%</span>
                    </div>
                    <ProgressBar value={deptAv} color={avHex(deptAv)} showValue={false} />
                  </div>
                );
              })}
              {departments.length === 0 && <p className={`text-sm text-center py-4 ${t.textFaint}`}>No department data</p>}
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Link href="/equipment" className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] ${TYPE_WEIGHT.medium} ${t.chipBg} ${t.textMuted} ${t.hoverBg}`}><ToolCase className="h-3.5 w-3.5" /> Manage Equipment</Link>
        <Link href="/breakdowns/new" className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] ${TYPE_WEIGHT.semibold} text-white bg-gradient-to-br from-brand-500 to-brand-700 hover:brightness-110 transition-all`}><Plus className="h-3.5 w-3.5" /> Report Breakdown</Link>
        <Link href="/reports/availability" className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] ${TYPE_WEIGHT.medium} ${t.chipBg} ${t.textMuted} ${t.hoverBg}`}><BarChart3 className="h-3.5 w-3.5" /> Generate Report</Link>
      </div>
    </main>
  );
}

export default function AvailabilitiesPage() {
  return (
    <AppShell>
      <AvailabilityContent />
    </AppShell>
  );
}
