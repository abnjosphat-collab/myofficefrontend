// app/availability/page.tsx
'use client';

import { useState, useEffect, ElementType } from 'react';
import Link from 'next/link';
import {
  ToolCase, AlertTriangle, BarChart3, Download, Gauge,
  LineChart, Plus, RefreshCw, Search, Settings,
  Clock, Activity, Percent, Calculator,
} from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import {
  useTheme, PageHero, StatTile, StatusBadge, SearchInput, ProgressBar, useCollapseSection, ACCENT_HEX, SelectField,
} from '@/components/shared/theme';

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface Equipment {
  id: string;
  name: string;
  category: string;
  department: string;
  operationalHours: number;
  breakdownHours: number;
  availability: number;
  status: 'operational' | 'maintenance' | 'breakdown' | 'idle';
  lastMaintenance: string | null;
  nextMaintenance: string | null;
  uptime: number;
  downtime: number;
  mtbf: number;
  mttr: number;
}

interface AvailabilityStats {
  totalEquipment: number;
  operational: number;
  inMaintenance: number;
  inBreakdown: number;
  overallAvailability: number;
  avgUptime: number;
  avgDowntime: number;
  totalOperationalHours: number;
  totalBreakdownHours: number;
  monthAvailability: number;
  weekAvailability: number;
}

// ─── MOCK DATA ────────────────────────────────────────────────────────────────

const MOCK_EQUIPMENT: Equipment[] = [
  { id: '1', name: 'CNC Machine 1', category: 'Machinery', department: 'Production', operationalHours: 450.5, breakdownHours: 12.3, availability: 97.27, status: 'operational', lastMaintenance: '2024-01-15', nextMaintenance: '2024-02-15', uptime: 438.2, downtime: 12.3, mtbf: 120.5, mttr: 2.5 },
  { id: '2', name: 'Forklift A', category: 'Vehicles', department: 'Logistics', operationalHours: 320.0, breakdownHours: 8.5, availability: 97.34, status: 'operational', lastMaintenance: '2024-01-10', nextMaintenance: '2024-02-10', uptime: 311.5, downtime: 8.5, mtbf: 85.3, mttr: 3.2 },
  { id: '3', name: '3D Printer', category: 'Electronics', department: 'R&D', operationalHours: 280.0, breakdownHours: 24.0, availability: 91.43, status: 'maintenance', lastMaintenance: '2024-01-20', nextMaintenance: '2024-03-20', uptime: 256.0, downtime: 24.0, mtbf: 65.7, mttr: 6.5 },
  { id: '4', name: 'Laser Cutter', category: 'Machinery', department: 'Production', operationalHours: 500.0, breakdownHours: 2.5, availability: 99.5, status: 'operational', lastMaintenance: '2024-01-05', nextMaintenance: '2024-03-05', uptime: 497.5, downtime: 2.5, mtbf: 180.2, mttr: 1.8 },
  { id: '5', name: 'Test Equipment', category: 'Tools', department: 'Quality', operationalHours: 150.0, breakdownHours: 15.0, availability: 90.0, status: 'breakdown', lastMaintenance: '2023-12-15', nextMaintenance: '2024-02-15', uptime: 135.0, downtime: 15.0, mtbf: 50.3, mttr: 4.2 },
  { id: '6', name: 'Conveyor Belt', category: 'Machinery', department: 'Production', operationalHours: 600.0, breakdownHours: 30.0, availability: 95.0, status: 'operational', lastMaintenance: '2024-01-25', nextMaintenance: '2024-02-25', uptime: 570.0, downtime: 30.0, mtbf: 95.7, mttr: 3.5 },
  { id: '7', name: 'Server Rack', category: 'Electronics', department: 'IT', operationalHours: 720.0, breakdownHours: 8.0, availability: 98.89, status: 'idle', lastMaintenance: '2024-01-18', nextMaintenance: '2024-04-18', uptime: 712.0, downtime: 8.0, mtbf: 200.5, mttr: 2.0 },
  { id: '8', name: 'Air Compressor', category: 'Machinery', department: 'Maintenance', operationalHours: 400.0, breakdownHours: 20.0, availability: 95.0, status: 'maintenance', lastMaintenance: '2024-01-30', nextMaintenance: '2024-03-30', uptime: 380.0, downtime: 20.0, mtbf: 75.3, mttr: 5.2 },
];

const MOCK_STATS: AvailabilityStats = {
  totalEquipment: 8, operational: 5, inMaintenance: 2, inBreakdown: 1,
  overallAvailability: 95.43, avgUptime: 410.03, avgDowntime: 15.03,
  totalOperationalHours: 3420.5, totalBreakdownHours: 120.3,
  monthAvailability: 90.66, weekAvailability: 93.52,
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Not scheduled';

function statusCfg(status: Equipment['status']) {
  const map: Record<Equipment['status'], { color: string; label: string }> = {
    operational: { color: '#34d399', label: 'Operational' },
    maintenance: { color: '#fbbf24', label: 'Maintenance' },
    breakdown: { color: '#f87171', label: 'Breakdown' },
    idle: { color: '#94a3b8', label: 'Idle' },
  };
  return map[status];
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
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [stats, setStats] = useState<AvailabilityStats>(MOCK_STATS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tab, setTab] = useState<'overview' | 'detailed' | 'trends'>('overview');

  const fetchData = async (quiet = false) => {
    if (!quiet) setLoading(true);
    setRefreshing(true);
    try {
      const [eqRes, stRes] = await Promise.all([
        fetch('/api/availabilities').catch(() => null),
        fetch('/api/availabilities/stats').catch(() => null),
      ]);
      setEquipment(eqRes?.ok ? await eqRes.json() : MOCK_EQUIPMENT);
      setStats(stRes?.ok ? await stRes.json() : MOCK_STATS);
    } catch {
      setEquipment(MOCK_EQUIPMENT);
      setStats(MOCK_STATS);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const categories = Array.from(new Set(equipment.map(e => e.category)));
  const departments = Array.from(new Set(equipment.map(e => e.department)));

  const filtered = equipment.filter(eq => {
    const s = searchTerm.toLowerCase();
    const matchSearch = !s || eq.name.toLowerCase().includes(s) || eq.category.toLowerCase().includes(s) || eq.department.toLowerCase().includes(s);
    const matchCat = categoryFilter === 'all' || eq.category === categoryFilter;
    const matchStatus = statusFilter === 'all' || eq.status === statusFilter;
    return matchSearch && matchCat && matchStatus;
  });

  const selCls = `h-9 rounded-lg px-3 text-sm outline-none transition-colors ${t.inputBg}`;
  const thCls = `text-left px-3 py-2 text-[10px] uppercase tracking-wide font-medium ${t.textFaint}`;
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
            <button type="button" disabled={equipment.length === 0} className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-medium ${t.chipBg} ${t.textMuted} ${t.hoverBg} disabled:opacity-40`}>
              <Download className="h-3.5 w-3.5" /> Export
            </button>
            <Link href="/breakdowns" className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-medium ${t.chipBg} ${t.textMuted} ${t.hoverBg}`}>
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
          <div className="flex items-center gap-1.5 mb-1"><Percent className="h-3.5 w-3.5 text-blue-400" /><span className={`text-xs ${t.textFaint}`}>Overall Availability</span></div>
          <div className={`text-xl font-bold ${avColor(stats.overallAvailability)}`}>{stats.overallAvailability.toFixed(1)}%</div>
          <div className="mt-2"><ProgressBar value={stats.overallAvailability} color={avHex(stats.overallAvailability)} showValue={false} /></div>
        </div>
        <div className={`${t.glass} rounded-xl p-4`}>
          <div className="flex items-center gap-1.5 mb-1"><Clock className="h-3.5 w-3.5 text-emerald-400" /><span className={`text-xs ${t.textFaint}`}>Avg Uptime</span></div>
          <div className="text-xl font-bold text-emerald-400">{stats.avgUptime.toFixed(1)}h</div>
        </div>
        <div className={`${t.glass} rounded-xl p-4`}>
          <div className="flex items-center gap-1.5 mb-1"><Activity className="h-3.5 w-3.5 text-red-400" /><span className={`text-xs ${t.textFaint}`}>Avg Downtime</span></div>
          <div className="text-xl font-bold text-red-400">{stats.avgDowntime.toFixed(1)}h</div>
        </div>
        <div className={`${t.glass} rounded-xl p-4`}>
          <div className="flex items-center gap-1.5 mb-1"><AlertTriangle className="h-3.5 w-3.5 text-amber-400" /><span className={`text-xs ${t.textFaint}`}>Total Downtime</span></div>
          <div className="text-xl font-bold text-amber-400">{stats.totalBreakdownHours.toFixed(0)}h</div>
        </div>
      </div>

      <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
        <div className={`flex items-center gap-2 px-5 py-3 border-b ${t.border}`}>
          <Search className="h-4 w-4 text-blue-400" />
          <span className={`font-semibold text-sm ${t.textPrimary}`}>Filters</span>
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

      <div className={`flex items-center gap-1 ${t.glassSoft} rounded-xl p-1 w-fit`}>
        {TABS.map(tb => (
          <button key={tb.key} type="button" onClick={() => setTab(tb.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === tb.key ? 'bg-blue-500/20 text-blue-400' : `${t.textFaint} ${t.hoverText} ${t.hoverBg}`}`}>
            <tb.icon className="h-4 w-4" />{tb.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><RefreshCw className={`h-6 w-6 animate-spin ${t.textFaint}`} /></div>
      ) : tab === 'overview' ? (
        <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
          <div className={`flex items-center gap-2 px-5 py-3 border-b ${t.border}`}>
            <Gauge className="h-4 w-4 text-blue-400" /><span className={`font-semibold text-sm ${t.textPrimary}`}>Equipment Availability Dashboard</span>
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
                    return (
                      <tr key={eq.id} className={`border-b ${t.border} ${t.hoverBgSoft} transition-colors`}>
                        <td className={tdCls}><span className={`font-medium ${t.textPrimary}`}>{eq.name}</span></td>
                        <td className={tdCls}>{eq.category}</td>
                        <td className={tdCls}>{eq.department}</td>
                        <td className={tdCls}><StatusBadge color={scfg.color} label={scfg.label} /></td>
                        <td className={`${tdCls} text-right`}>{eq.operationalHours.toFixed(1)}h</td>
                        <td className={`${tdCls} text-right text-red-400`}>{eq.breakdownHours.toFixed(1)}h</td>
                        <td className={`${tdCls} text-right`}>
                          <div className="flex items-center gap-2 justify-end">
                            <span className={`font-bold text-sm ${avColor(eq.availability)}`}>{eq.availability.toFixed(1)}%</span>
                            <div className="w-20"><ProgressBar value={eq.availability} color={avHex(eq.availability)} showValue={false} /></div>
                          </div>
                        </td>
                        <td className={`${tdCls} text-right text-emerald-400`}>{eq.uptime.toFixed(1)}h</td>
                        <td className={`${tdCls} text-right text-red-400`}>{eq.downtime.toFixed(1)}h</td>
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
            <Calculator className="h-4 w-4 text-blue-400" /><span className={`font-semibold text-sm ${t.textPrimary}`}>Detailed Availability Analysis</span>
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
                  {filtered.map(eq => (
                    <tr key={eq.id} className={`border-b ${t.border} ${t.hoverBgSoft} transition-colors`}>
                      <td className={tdCls}><span className={`font-medium ${t.textPrimary}`}>{eq.name}</span></td>
                      <td className={`${tdCls} text-center`}><StatusBadge color={eq.mtbf > 200 ? '#34d399' : eq.mtbf > 100 ? '#94a3b8' : '#f87171'} label={`${eq.mtbf.toFixed(1)}h`} /></td>
                      <td className={`${tdCls} text-center`}><StatusBadge color={eq.mttr < 5 ? '#34d399' : eq.mttr < 10 ? '#94a3b8' : '#f87171'} label={`${eq.mttr.toFixed(1)}h`} /></td>
                      <td className={`${tdCls} text-xs`}>{fmtDate(eq.lastMaintenance)}</td>
                      <td className="px-3 py-2.5 text-xs text-blue-400">{fmtDate(eq.nextMaintenance)}</td>
                      <td className={`${tdCls} text-right`}>{eq.breakdownHours > 0 ? (eq.breakdownHours / eq.operationalHours * 100).toFixed(1) : '0.0'}%</td>
                      <td className={`${tdCls} text-right text-red-400 font-medium`}>${(eq.downtime * 250).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
            <div className={`flex items-center gap-2 px-5 py-3 border-b ${t.border}`}>
              <LineChart className="h-4 w-4 text-blue-400" /><span className={`font-semibold text-sm ${t.textPrimary}`}>Availability Trends</span>
            </div>
            <div className="p-5">
              <div className={`rounded-xl border ${t.border} ${t.chipBg} h-48 flex items-center justify-center mb-4`}>
                <div className="text-center">
                  <LineChart className={`h-8 w-8 mx-auto mb-2 ${t.textFaint}`} />
                  <p className={`text-sm ${t.textFaint}`}>Chart integration point</p>
                  <p className={`text-lg font-bold mt-1 ${avColor(stats.overallAvailability)}`}>{stats.overallAvailability.toFixed(1)}% current</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className={`flex justify-between ${t.textMuted}`}><span>Last month</span><span className={`font-medium ${avColor(stats.monthAvailability)}`}>{stats.monthAvailability.toFixed(1)}%</span></div>
                <div className={`flex justify-between ${t.textMuted}`}><span>Last week</span><span className={`font-medium ${avColor(stats.weekAvailability)}`}>{stats.weekAvailability.toFixed(1)}%</span></div>
              </div>
            </div>
          </div>

          <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
            <div className={`flex items-center gap-2 px-5 py-3 border-b ${t.border}`}>
              <BarChart3 className="h-4 w-4 text-blue-400" /><span className={`font-semibold text-sm ${t.textPrimary}`}>Department Comparison</span>
            </div>
            <div className="p-5 space-y-3">
              {departments.map(dept => {
                const deptEq = equipment.filter(e => e.department === dept);
                const deptAv = deptEq.length > 0 ? deptEq.reduce((s, e) => s + e.availability, 0) / deptEq.length : 0;
                return (
                  <div key={dept}>
                    <div className="flex justify-between mb-1">
                      <span className={`text-xs ${t.textMuted}`}>{dept}</span>
                      <span className={`text-xs font-bold ${avColor(deptAv)}`}>{deptAv.toFixed(1)}%</span>
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
        <Link href="/equipment" className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-medium ${t.chipBg} ${t.textMuted} ${t.hoverBg}`}><ToolCase className="h-3.5 w-3.5" /> Manage Equipment</Link>
        <Link href="/breakdowns/new" className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-semibold text-white bg-gradient-to-br from-blue-500 to-blue-700 hover:brightness-110 transition-all"><Plus className="h-3.5 w-3.5" /> Report Breakdown</Link>
        <Link href="/reports/availability" className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-medium ${t.chipBg} ${t.textMuted} ${t.hoverBg}`}><BarChart3 className="h-3.5 w-3.5" /> Generate Report</Link>
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
