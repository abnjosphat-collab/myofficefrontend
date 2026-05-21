// app/availability/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ToolCase, AlertTriangle, BarChart3, Download, Gauge,
  LineChart, Plus, RefreshCw, Search, Settings,
  Clock, Activity, Percent, Calculator, CalendarClock,
  Calendar,
} from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import {
  HeroPanel, GlassPanel, GlassStatCard, GlassBadge, GlassButton,
  GlassInput, GlassSelect, GlassTable, GlassTabs, GlassProgress,
  LoadingPane, StatItem, GlassTab, GlassColumn,
  usePageCollapse, MasterCollapseButton,
} from '@/components/shared';

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

function statusBadge(status: Equipment['status']) {
  const map: Record<Equipment['status'], { variant: 'success' | 'warning' | 'danger' | 'neutral'; label: string }> = {
    operational: { variant: 'success', label: 'Operational' },
    maintenance:  { variant: 'warning', label: 'Maintenance' },
    breakdown:    { variant: 'danger',  label: 'Breakdown'   },
    idle:         { variant: 'neutral', label: 'Idle'        },
  };
  const { variant, label } = map[status];
  return <GlassBadge variant={variant}>{label}</GlassBadge>;
}

function avColor(pct: number) {
  if (pct >= 95) return 'text-emerald-400';
  if (pct >= 90) return 'text-amber-400';
  return 'text-red-400';
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function AvailabilitiesPage() {
  const sections = usePageCollapse({ hero: false, stats: false, filters: false, content: false });
  const [equipment, setEquipment]   = useState<Equipment[]>([]);
  const [stats, setStats]           = useState<AvailabilityStats>(MOCK_STATS);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter]     = useState('all');

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

  const filtered = equipment.filter(eq => {
    const s = searchTerm.toLowerCase();
    const matchSearch = !s || eq.name.toLowerCase().includes(s) || eq.category.toLowerCase().includes(s) || eq.department.toLowerCase().includes(s);
    const matchCat    = categoryFilter === 'all' || eq.category === categoryFilter;
    const matchStatus = statusFilter   === 'all' || eq.status   === statusFilter;
    return matchSearch && matchCat && matchStatus;
  });

  // ── Stats for HeroPanel ───────────────────────────────────────────────────
  const heroStats: StatItem[] = [
    { label: 'Total Equipment', value: stats.totalEquipment },
    { label: 'Operational',     value: stats.operational,   textClass: 'text-emerald-400' },
    { label: 'Maintenance',     value: stats.inMaintenance, textClass: 'text-amber-400'   },
    { label: 'Breakdown',       value: stats.inBreakdown,   textClass: 'text-red-400'     },
    { label: 'Availability',    value: `${stats.overallAvailability.toFixed(1)}%`, textClass: avColor(stats.overallAvailability) },
  ];

  // ── Columns for overview table ─────────────────────────────────────────────
  const overviewCols: GlassColumn<Equipment>[] = [
    { key: 'name',             header: 'Equipment',    render: eq => <span className="font-medium text-white">{eq.name}</span> },
    { key: 'category',        header: 'Category'      },
    { key: 'department',      header: 'Department'    },
    { key: 'status',          header: 'Status',       render: eq => statusBadge(eq.status) },
    { key: 'operationalHours', header: 'Op. Hours',   align: 'right', render: eq => `${eq.operationalHours.toFixed(1)}h` },
    { key: 'breakdownHours',  header: 'Breakdown h',  align: 'right', render: eq => <span className="text-red-400">{eq.breakdownHours.toFixed(1)}h</span> },
    {
      key: 'availability', header: 'Availability', align: 'right',
      render: eq => (
        <div className="flex items-center gap-2 justify-end">
          <span className={`font-bold text-sm ${avColor(eq.availability)}`}>{eq.availability.toFixed(1)}%</span>
          <GlassProgress value={eq.availability} className="w-20" />
        </div>
      ),
    },
    { key: 'uptime',   header: 'Uptime',   align: 'right', render: eq => <span className="text-emerald-400">{eq.uptime.toFixed(1)}h</span> },
    { key: 'downtime', header: 'Downtime', align: 'right', render: eq => <span className="text-red-400">{eq.downtime.toFixed(1)}h</span> },
    {
      key: 'actions', header: '',
      render: eq => (
        <div className="flex gap-1.5">
          <Link href={`/breakdowns?equipment=${eq.id}`}>
            <GlassButton size="xs" variant="ghost" icon={AlertTriangle}>Breakdowns</GlassButton>
          </Link>
          <Link href={`/maintenance?equipment=${eq.id}`}>
            <GlassButton size="xs" variant="ghost" icon={Settings}>Maintenance</GlassButton>
          </Link>
        </div>
      ),
    },
  ];

  // ── Columns for detailed table ─────────────────────────────────────────────
  const detailCols: GlassColumn<Equipment>[] = [
    { key: 'name',   header: 'Equipment', render: eq => <span className="font-medium text-white">{eq.name}</span> },
    {
      key: 'mtbf', header: 'MTBF', align: 'center',
      render: eq => (
        <GlassBadge variant={eq.mtbf > 200 ? 'success' : eq.mtbf > 100 ? 'neutral' : 'danger'}>
          {eq.mtbf.toFixed(1)}h
        </GlassBadge>
      ),
    },
    {
      key: 'mttr', header: 'MTTR', align: 'center',
      render: eq => (
        <GlassBadge variant={eq.mttr < 5 ? 'success' : eq.mttr < 10 ? 'neutral' : 'danger'}>
          {eq.mttr.toFixed(1)}h
        </GlassBadge>
      ),
    },
    { key: 'lastMaintenance', header: 'Last Maintenance', render: eq => <span className="text-white/60 text-xs">{fmtDate(eq.lastMaintenance)}</span> },
    { key: 'nextMaintenance', header: 'Next Maintenance', render: eq => <span className="text-[#86BBD8] text-xs">{fmtDate(eq.nextMaintenance)}</span> },
    {
      key: 'breakdownFreq', header: 'BD Frequency', align: 'right',
      render: eq => `${eq.breakdownHours > 0 ? (eq.breakdownHours / eq.operationalHours * 100).toFixed(1) : '0.0'}%`,
    },
    {
      key: 'costImpact', header: 'Cost Impact', align: 'right',
      render: eq => <span className="text-red-400 font-medium">${(eq.downtime * 250).toLocaleString()}</span>,
    },
  ];

  // ── Department breakdown for Trends tab ───────────────────────────────────
  const departments = Array.from(new Set(equipment.map(e => e.department)));

  // ── Tabs ──────────────────────────────────────────────────────────────────
  const tabs: GlassTab[] = [
    {
      key: 'overview',
      label: 'Availability Overview',
      icon: Gauge,
      content: (
        <GlassPanel title="Equipment Availability Dashboard" icon={Gauge} variant="dark">
          <GlassTable
            columns={overviewCols}
            data={filtered}
            keyField="id"
            emptyMessage="No equipment data. Add equipment and breakdown data to start tracking."
            stickyHeader
            maxHeight="480px"
          />
        </GlassPanel>
      ),
    },
    {
      key: 'detailed',
      label: 'Detailed Analysis',
      icon: Calculator,
      content: (
        <GlassPanel title="Detailed Availability Analysis" icon={Calculator} variant="dark">
          <GlassTable
            columns={detailCols}
            data={filtered}
            keyField="id"
            emptyMessage="No equipment data available for detailed analysis."
            stickyHeader
            maxHeight="480px"
          />
        </GlassPanel>
      ),
    },
    {
      key: 'trends',
      label: 'Trends & Metrics',
      icon: LineChart,
      content: (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <GlassPanel title="Availability Trends" icon={LineChart} variant="dark">
            <div className="p-5">
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] h-48 flex items-center justify-center mb-4">
                <div className="text-center">
                  <LineChart className="h-8 w-8 text-white/20 mx-auto mb-2" />
                  <p className="text-sm text-white/40">Chart integration point</p>
                  <p className={`text-lg font-bold mt-1 ${avColor(stats.overallAvailability)}`}>
                    {stats.overallAvailability.toFixed(1)}% current
                  </p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-white/70">
                  <span>Last month</span>
                  <span className={`font-medium ${avColor(stats.monthAvailability)}`}>{stats.monthAvailability.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-white/70">
                  <span>Last week</span>
                  <span className={`font-medium ${avColor(stats.weekAvailability)}`}>{stats.weekAvailability.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </GlassPanel>

          <GlassPanel title="Department Comparison" icon={BarChart3} variant="dark">
            <div className="p-5 space-y-3">
              {departments.map(dept => {
                const deptEq = equipment.filter(e => e.department === dept);
                const deptAv = deptEq.length > 0
                  ? deptEq.reduce((s, e) => s + e.availability, 0) / deptEq.length
                  : 0;
                return (
                  <div key={dept}>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-white/70">{dept}</span>
                      <span className={`text-xs font-bold ${avColor(deptAv)}`}>{deptAv.toFixed(1)}%</span>
                    </div>
                    <GlassProgress value={deptAv} />
                  </div>
                );
              })}
              {departments.length === 0 && (
                <p className="text-sm text-white/30 text-center py-4">No department data</p>
              )}
            </div>
          </GlassPanel>
        </div>
      ),
    },
  ];

  return (
    <PageShell>
      <main className="container mx-auto px-4 py-8 space-y-4">

        <HeroPanel
          icon={Gauge}
          title="Equipment Availability"
          subtitle="Track availability = (Operational Hours − Breakdown Hours) / Operational Hours × 100"
          onRefresh={() => fetchData(true)}
          loading={refreshing}
          stats={heroStats}
          {...sections.panel('hero')}
          actions={
            <>
              <MasterCollapseButton collapse={sections} />
              <GlassButton variant="secondary" icon={Download} size="sm" disabled={equipment.length === 0}>
                Export
              </GlassButton>
              <Link href="/breakdowns">
                <GlassButton variant="secondary" icon={AlertTriangle} size="sm">Breakdowns</GlassButton>
              </Link>
            </>
          }
        />

        {/* Stat cards row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <GlassStatCard label="Overall Availability" value={`${stats.overallAvailability.toFixed(1)}%`}
            icon={Percent} valueClass={avColor(stats.overallAvailability)}>
            <GlassProgress value={stats.overallAvailability} className="mt-2" />
          </GlassStatCard>
          <GlassStatCard label="Avg Uptime" value={`${stats.avgUptime.toFixed(1)}h`}
            icon={Clock} valueClass="text-emerald-400" />
          <GlassStatCard label="Avg Downtime" value={`${stats.avgDowntime.toFixed(1)}h`}
            icon={Activity} valueClass="text-red-400" />
          <GlassStatCard label="Total Downtime" value={`${stats.totalBreakdownHours.toFixed(0)}h`}
            icon={AlertTriangle} valueClass="text-amber-400" />
        </div>

        {/* Filters */}
        <GlassPanel icon={Search} title="Filters" variant="panel" {...sections.panel('filters')}>
          <div className="px-5 pb-4 pt-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <GlassInput
              icon={Search}
              placeholder="Search by name, category, department…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            <GlassSelect
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Categories' },
                ...categories.map(c => ({ value: c, label: c })),
              ]}
            />
            <GlassSelect
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              options={[
                { value: 'all',           label: 'All Status'    },
                { value: 'operational',   label: 'Operational'   },
                { value: 'maintenance',   label: 'Maintenance'   },
                { value: 'breakdown',     label: 'Breakdown'     },
                { value: 'idle',          label: 'Idle'          },
              ]}
            />
          </div>
          <div className="px-5 pb-3 text-xs text-white/35">
            {filtered.length} of {equipment.length} equipment
          </div>
        </GlassPanel>

        {/* Main content tabs */}
        {loading ? (
          <LoadingPane message="Loading equipment availability…" />
        ) : (
          <GlassTabs tabs={tabs} defaultTab="overview" />
        )}

        {/* Bottom actions */}
        <div className="flex justify-end gap-2">
          <Link href="/equipment">
            <GlassButton variant="secondary" icon={ToolCase} size="sm">Manage Equipment</GlassButton>
          </Link>
          <Link href="/breakdowns/new">
            <GlassButton variant="primary" icon={Plus} size="sm">Report Breakdown</GlassButton>
          </Link>
          <Link href="/reports/availability">
            <GlassButton variant="secondary" icon={BarChart3} size="sm">Generate Report</GlassButton>
          </Link>
        </div>

      </main>
    </PageShell>
  );
}
