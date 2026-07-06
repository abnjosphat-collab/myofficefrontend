'use client';

import { useState, useEffect } from 'react';
import { PageShell } from '@/components/PageShell';
import { toast } from 'sonner';
import {
  TrendingUp, AlertTriangle, Wrench, Users, Package, Calendar,
  RefreshCw, Filter, X, ChevronDown, ChevronUp, BarChart3,
  Clock, Activity, Zap, Shield, MapPin, PieChart, Layers,
  ScatterChart, LineChart, AreaChart, GitCompare, Hash,
  Building2, Timer, Gauge, List, Sun, Moon, Sunrise, Sunset
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RePieChart, Pie, Cell, Legend, AreaChart as ReAreaChart, Area,
  LineChart as ReLineChart, Line, ScatterChart as ReScatterChart, Scatter,
  ComposedChart, RadialBarChart, RadialBar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, RadarChart, Radar
} from 'recharts';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://myofficebackend.onrender.com';

// ===== TYPES =====
interface HeatmapData {
  heatmap: {
    hour_day: number[][];
    labels: {
      hours: string[];
      days: string[];
    };
  };
  hourly_distribution: { hour: string; count: number }[];
  daily_distribution: { day: string; count: number }[];
  top_problem_machines: {
    name: string;
    count: number;
    total_downtime: number;
    department: string;
    avg_downtime: number;
    avg_repair_time: number;
    avg_response_time: number;
  }[];
  top_artisans: {
    name: string;
    count: number;
    total_repair_time: number;
    avg_repair_time: number;
  }[];
  top_spare_parts: {
    name: string;
    count: number;
    total_cost: number;
    part_number: string;
    total_quantity: number;
  }[];
  breakdown_type_distribution: { type: string; count: number }[];
  priority_distribution: { priority: string; count: number }[];
  status_distribution: { status: string; count: number }[];
  department_comparison: { department: string; count: number; downtime: number }[];
  monthly_trends: { month: string; count: number }[];
  weekly_trends: { week: string; count: number }[];
  location_distribution: { location: string; count: number }[];
  response_time_by_hour: { hour: string; avg_response_time: number; count: number }[];
  machine_downtime_scatter: {
    name: string;
    breakdowns: number;
    total_downtime: number;
    avg_downtime: number;
    avg_repair_time: number;
    department: string;
  }[];
  artisan_performance: {
    name: string;
    count: number;
    total_repair_time: number;
    avg_repair_time: number;
  }[];
  summary: {
    total_breakdowns: number;
    unique_machines: number;
    unique_artisans: number;
    unique_spares: number;
    unique_departments: number;
    unique_types: number;
    total_downtime_minutes: number;
    total_repair_time_minutes: number;
    total_spare_cost: number;
  };
  response_time_heatmap: number[][];
  type_hour_heatmap: Record<string, { hour: string; count: number }[]>;
  type_day_heatmap: Record<string, { day: string; count: number }[]>;
  dept_hour_heatmap: Record<string, { hour: string; count: number }[]>;
  priority_hour_heatmap: Record<string, { hour: string; count: number }[]>;
  artisan_hour_heatmap: Record<string, { hour: string; count: number }[]>;
  location_hour_heatmap: Record<string, { hour: string; count: number }[]>;
  monthly_day_heatmap: Record<string, { day: number; count: number }[]>;
  filters_applied: {
    date_from: string | null;
    date_to: string | null;
    department: string | null;
    machine_id: string | null;
  };
  success: boolean;
}

// ===== HELPERS =====
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const getHeatmapColor = (value: number, max: number): string => {
  if (value === 0) return 'rgba(255,255,255,0.03)';
  const intensity = value / max;
  if (intensity < 0.33) {
    return `rgba(59, 130, 246, ${0.3 + 0.4 * intensity})`;
  } else if (intensity < 0.66) {
    return `rgba(245, 158, 11, ${0.4 + 0.4 * intensity})`;
  } else {
    return `rgba(239, 68, 68, ${0.5 + 0.5 * intensity})`;
  }
};

const formatTime = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m > 0 ? `${m}m` : ''}`.trim() : `${m}m`;
};

const formatCurrency = (value: number): string => {
  return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
};

// Color palettes
const CHART_COLORS = {
  blue: '#3b82f6',
  indigo: '#6366f1',
  violet: '#8b5cf6',
  purple: '#a855f7',
  pink: '#ec4899',
  red: '#ef4444',
  orange: '#f97316',
  amber: '#f59e0b',
  yellow: '#eab308',
  lime: '#84cc16',
  green: '#22c55e',
  emerald: '#10b981',
  teal: '#14b8a6',
  cyan: '#06b6d4',
  sky: '#0ea5e9',
};

const PIE_COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
  '#0ea5e9', '#a855f7', '#eab308', '#10b981', '#06b6d4',
];

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#22c55e',
};

const STATUS_COLORS: Record<string, string> = {
  logged: '#3b82f6',
  in_progress: '#f59e0b',
  resolved: '#22c55e',
  closed: '#6b7280',
};

// ===== HEATMAP CELL COMPONENT =====
function HeatmapCell({ value, max, hour, day }: { value: number; max: number; hour: number; day: number }) {
  const color = getHeatmapColor(value, max);
  const timeLabel = `${String(hour).padStart(2, '0')}:00`;
  
  return (
    <div
      className="relative group cursor-pointer"
      title={`${timeLabel} - ${DAY_NAMES[day]}: ${value} breakdown${value !== 1 ? 's' : ''}`}
    >
      <div
        className="w-full aspect-square rounded-sm transition-all duration-200 hover:scale-110 hover:z-10"
        style={{
          backgroundColor: color,
          border: value === max && max > 0 ? '2px solid rgba(255,255,255,0.6)' : '1px solid rgba(255,255,255,0.05)',
        }}
      />
      {value > 0 && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/90 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none">
          {value} breakdown{value !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}

// ===== CUSTOM TOOLTIP =====
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-black/90 border border-white/10 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-white/60 mb-1">{label}</p>
      {payload.map((entry: any, idx: number) => (
        <p key={idx} className="text-white/90 font-medium">
          {entry.name}: {entry.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
};

// ===== MAIN COMPONENT =====
export default function BreakdownAnalyticsPage() {
  const [data, setData] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [department, setDepartment] = useState('');
  const [machineId, setMachineId] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const params = new URLSearchParams();
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      if (department) params.append('department', department);
      if (machineId) params.append('machine_id', machineId);

      const response = await fetch(`${API_BASE}/api/breakdowns/analytics/heatmap?${params}`);
      if (!response.ok) throw new Error('Failed to fetch analytics');
      
      const result: HeatmapData = await response.json();
      if (result.success) {
        setData(result);
      } else {
        throw new Error('API returned unsuccessful response');
      }
    } catch (error) {
      console.error('Error fetching heatmap data:', error);
      toast.error('Failed to load breakdown analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApplyFilters = () => {
    fetchData();
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setDepartment('');
    setMachineId('');
    fetchData();
    setShowFilters(false);
  };

  const activeFilterCount = [dateFrom, dateTo, department, machineId].filter(Boolean).length;

  // Calculate max value for heatmap coloring
  const maxHeatmapValue = data 
    ? Math.max(...data.heatmap.hour_day.flat(), 1)
    : 1;

  return (
    <PageShell>
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white font-heading tracking-tight">
              Breakdown Analytics & Insights
            </h1>
            <p className="text-white/50 text-sm mt-1">
              Comprehensive visualizations — heatmaps, trends, distributions, and performance metrics
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              className={`gap-2 ${activeFilterCount > 0 ? 'border-[#86BBD8]/50 bg-[#86BBD8]/10' : ''}`}
            >
              <Filter className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="bg-[#86BBD8] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </Button>
            <Button
              onClick={fetchData}
              disabled={refreshing}
              className="bg-[#2A4D69] hover:bg-[#1e3a52] text-white"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <Card className="bg-white/[0.03] border-white/[0.08]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-sm">Analytics Filters</CardTitle>
                <button
                  onClick={() => setShowFilters(false)}
                  className="text-white/40 hover:text-white/60"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-white/60 text-xs">From Date</Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="bg-white/[0.07] border-white/[0.12] text-white text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/60 text-xs">To Date</Label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="bg-white/[0.07] border-white/[0.12] text-white text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/60 text-xs">Department</Label>
                  <Input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g., Maintenance"
                    className="bg-white/[0.07] border-white/[0.12] text-white text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/60 text-xs">Machine ID</Label>
                  <Input
                    type="text"
                    value={machineId}
                    onChange={(e) => setMachineId(e.target.value)}
                    placeholder="e.g., CNC-001"
                    className="bg-white/[0.07] border-white/[0.12] text-white text-sm"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 mt-4">
                <Button
                  onClick={handleClearFilters}
                  variant="ghost"
                  className="text-white/60 hover:text-white"
                >
                  Clear All
                </Button>
                <Button
                  onClick={handleApplyFilters}
                  className="bg-[#86BBD8] hover:bg-[#6fa8c8] text-white"
                >
                  Apply Filters
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="h-8 w-8 animate-spin text-[#86BBD8]" />
          </div>
        ) : !data ? (
          <Card className="bg-white/[0.03] border-white/[0.08]">
            <CardContent className="py-20 text-center">
              <AlertTriangle className="h-12 w-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/40">No data available</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
              <Card className="bg-white/[0.03] border-white/[0.08]">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-red-500/20 rounded-lg">
                      <AlertTriangle className="h-4 w-4 text-red-400" />
                    </div>
                    <div>
                      <div className="text-lg font-bold text-white font-mono">{data.summary.total_breakdowns}</div>
                      <div className="text-white/40 text-[10px]">Total</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white/[0.03] border-white/[0.08]">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-500/20 rounded-lg">
                      <Wrench className="h-4 w-4 text-blue-400" />
                    </div>
                    <div>
                      <div className="text-lg font-bold text-white font-mono">{data.summary.unique_machines}</div>
                      <div className="text-white/40 text-[10px]">Machines</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white/[0.03] border-white/[0.08]">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-amber-500/20 rounded-lg">
                      <Users className="h-4 w-4 text-amber-400" />
                    </div>
                    <div>
                      <div className="text-lg font-bold text-white font-mono">{data.summary.unique_artisans}</div>
                      <div className="text-white/40 text-[10px]">Artisans</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white/[0.03] border-white/[0.08]">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-purple-500/20 rounded-lg">
                      <Package className="h-4 w-4 text-purple-400" />
                    </div>
                    <div>
                      <div className="text-lg font-bold text-white font-mono">{data.summary.unique_spares}</div>
                      <div className="text-white/40 text-[10px]">Spares</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white/[0.03] border-white/[0.08]">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-green-500/20 rounded-lg">
                      <Building2 className="h-4 w-4 text-green-400" />
                    </div>
                    <div>
                      <div className="text-lg font-bold text-white font-mono">{data.summary.unique_departments}</div>
                      <div className="text-white/40 text-[10px]">Depts</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white/[0.03] border-white/[0.08]">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-cyan-500/20 rounded-lg">
                      <Hash className="h-4 w-4 text-cyan-400" />
                    </div>
                    <div>
                      <div className="text-lg font-bold text-white font-mono">{data.summary.unique_types}</div>
                      <div className="text-white/40 text-[10px]">Types</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white/[0.03] border-white/[0.08]">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-orange-500/20 rounded-lg">
                      <Timer className="h-4 w-4 text-orange-400" />
                    </div>
                    <div>
                      <div className="text-lg font-bold text-white font-mono">{formatTime(data.summary.total_downtime_minutes)}</div>
                      <div className="text-white/40 text-[10px]">Downtime</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white/[0.03] border-white/[0.08]">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-pink-500/20 rounded-lg">
                      <BarChart3 className="h-4 w-4 text-pink-400" />
                    </div>
                    <div>
                      <div className="text-lg font-bold text-white font-mono">{formatCurrency(data.summary.total_spare_cost)}</div>
                      <div className="text-white/40 text-[10px]">Spare Cost</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tab Navigation */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="bg-white/[0.05] border border-white/[0.08] p-1 w-full overflow-x-auto flex-nowrap">
                <TabsTrigger value="overview" className="data-[state=active]:bg-[#2A4D69] data-[state=active]:text-white text-white/60 text-xs gap-1.5">
                  <Layers className="h-3.5 w-3.5" /> Overview
                </TabsTrigger>
                <TabsTrigger value="heatmap" className="data-[state=active]:bg-[#2A4D69] data-[state=active]:text-white text-white/60 text-xs gap-1.5">
                  <Activity className="h-3.5 w-3.5" /> Heatmap
                </TabsTrigger>
                <TabsTrigger value="trends" className="data-[state=active]:bg-[#2A4D69] data-[state=active]:text-white text-white/60 text-xs gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5" /> Trends
                </TabsTrigger>
                <TabsTrigger value="machines" className="data-[state=active]:bg-[#2A4D69] data-[state=active]:text-white text-white/60 text-xs gap-1.5">
                  <Wrench className="h-3.5 w-3.5" /> Machines
                </TabsTrigger>
                <TabsTrigger value="artisans" className="data-[state=active]:bg-[#2A4D69] data-[state=active]:text-white text-white/60 text-xs gap-1.5">
                  <Users className="h-3.5 w-3.5" /> Artisans
                </TabsTrigger>
                <TabsTrigger value="spares" className="data-[state=active]:bg-[#2A4D69] data-[state=active]:text-white text-white/60 text-xs gap-1.5">
                  <Package className="h-3.5 w-3.5" /> Spares
                </TabsTrigger>
                <TabsTrigger value="distribution" className="data-[state=active]:bg-[#2A4D69] data-[state=active]:text-white text-white/60 text-xs gap-1.5">
                  <PieChart className="h-3.5 w-3.5" /> Distributions
                </TabsTrigger>
              </TabsList>

              {/* ===== OVERVIEW TAB ===== */}
              <TabsContent value="overview" className="space-y-6 mt-0">
                {/* Monthly Trends Area Chart */}
                <Card className="bg-white/[0.03] border-white/[0.08]">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2 text-sm">
                      <TrendingUp className="h-4 w-4 text-emerald-400" />
                      Monthly Breakdown Trends
                    </CardTitle>
                    <CardDescription className="text-white/40">
                      Breakdown occurrences over time — spot seasonal patterns
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {data.monthly_trends.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <ReAreaChart data={data.monthly_trends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="monthlyGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
                          <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Area type="monotone" dataKey="count" name="Breakdowns" stroke="#10b981" fill="url(#monthlyGradient)" strokeWidth={2} />
                        </ReAreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-white/30 text-xs text-center py-8">No monthly trend data available</p>
                    )}
                  </CardContent>
                </Card>

                {/* Department Comparison + Type Distribution */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Department Comparison */}
                  <Card className="bg-white/[0.03] border-white/[0.08]">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2 text-sm">
                        <Building2 className="h-4 w-4 text-blue-400" />
                        Department Comparison
                      </CardTitle>
                      <CardDescription className="text-white/40">
                        Breakdowns and downtime by department
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {data.department_comparison.length > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                          <ComposedChart data={data.department_comparison} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="department" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                            <YAxis yAxisId="left" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                            <YAxis yAxisId="right" orientation="right" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar yAxisId="left" dataKey="count" name="Breakdowns" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            <Line yAxisId="right" type="monotone" dataKey="downtime" name="Downtime (min)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                          </ComposedChart>
                        </ResponsiveContainer>
                      ) : (
                        <p className="text-white/30 text-xs text-center py-8">No department data available</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Breakdown Type Distribution */}
                  <Card className="bg-white/[0.03] border-white/[0.08]">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2 text-sm">
                        <PieChart className="h-4 w-4 text-violet-400" />
                        Breakdown Type Distribution
                      </CardTitle>
                      <CardDescription className="text-white/40">
                        Most common breakdown categories
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {data.breakdown_type_distribution.length > 0 ? (
                        <div className="flex items-center justify-center">
                          <ResponsiveContainer width="100%" height={280}>
                            <RePieChart>
                              <Pie
                                data={data.breakdown_type_distribution}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={2}
                                dataKey="count"
                                nameKey="type"
                              label={(props: any) => `${props.type} (${(props.percent * 100).toFixed(0)}%)`}
                                labelLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                              >
                                {data.breakdown_type_distribution.map((_, idx) => (
                                  <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip content={<CustomTooltip />} />
                            </RePieChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <p className="text-white/30 text-xs text-center py-8">No type distribution data available</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Priority + Status Distribution */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Priority Distribution */}
                  <Card className="bg-white/[0.03] border-white/[0.08]">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-white flex items-center gap-2 text-xs">
                        <Zap className="h-3.5 w-3.5 text-amber-400" />
                        Priority Distribution
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {data.priority_distribution.length > 0 ? (
                        <ResponsiveContainer width="100%" height={200}>
                          <RePieChart>
                            <Pie
                              data={data.priority_distribution}
                              cx="50%"
                              cy="50%"
                              innerRadius={40}
                              outerRadius={70}
                              dataKey="count"
                              nameKey="priority"
                              label={(props: any) => `${(props.percent * 100).toFixed(0)}%`}
                              labelLine={false}
                            >
                              {data.priority_distribution.map((entry) => (
                                <Cell key={entry.priority} fill={PRIORITY_COLORS[entry.priority] || '#6b7280'} />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                          </RePieChart>
                        </ResponsiveContainer>
                      ) : (
                        <p className="text-white/30 text-xs text-center py-8">No data</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Status Distribution */}
                  <Card className="bg-white/[0.03] border-white/[0.08]">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-white flex items-center gap-2 text-xs">
                        <List className="h-3.5 w-3.5 text-cyan-400" />
                        Status Distribution
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {data.status_distribution.length > 0 ? (
                        <ResponsiveContainer width="100%" height={200}>
                          <RePieChart>
                            <Pie
                              data={data.status_distribution}
                              cx="50%"
                              cy="50%"
                              innerRadius={40}
                              outerRadius={70}
                              dataKey="count"
                              nameKey="status"
                              label={(props: any) => `${(props.percent * 100).toFixed(0)}%`}
                              labelLine={false}
                            >
                              {data.status_distribution.map((entry) => (
                                <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#6b7280'} />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                          </RePieChart>
                        </ResponsiveContainer>
                      ) : (
                        <p className="text-white/30 text-xs text-center py-8">No data</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Location Distribution */}
                  <Card className="bg-white/[0.03] border-white/[0.08] lg:col-span-2">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-white flex items-center gap-2 text-xs">
                        <MapPin className="h-3.5 w-3.5 text-rose-400" />
                        Location Distribution
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {data.location_distribution.length > 0 ? (
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart
                            data={data.location_distribution.slice(0, 8)}
                            layout="vertical"
                            margin={{ top: 5, right: 20, left: 60, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                            <YAxis type="category" dataKey="location" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} width={80} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="count" name="Breakdowns" fill="#f43f5e" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <p className="text-white/30 text-xs text-center py-8">No location data available</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Response Time by Hour */}
                <Card className="bg-white/[0.03] border-white/[0.08]">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-indigo-400" />
                      Average Response Time by Hour of Day
                    </CardTitle>
                    <CardDescription className="text-white/40">
                      How quickly artisans respond at different times — identifies slow periods
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {data.response_time_by_hour.some(r => r.avg_response_time > 0) ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <ReLineChart data={data.response_time_by_hour} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="hour" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} interval={2} />
                          <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Line type="monotone" dataKey="avg_response_time" name="Avg Response (min)" stroke="#6366f1" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 5 }} />
                        </ReLineChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-white/30 text-xs text-center py-8">No response time data available</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ===== HEATMAP TAB ===== */}
              <TabsContent value="heatmap" className="space-y-6 mt-0">
                {/* Hour x Day Heatmap */}
                <Card className="bg-white/[0.03] border-white/[0.08]">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-white flex items-center gap-2">
                          <Activity className="h-5 w-5 text-violet-400" />
                          Breakdown Occurrence Heatmap
                        </CardTitle>
                        <CardDescription className="text-white/40">
                          Hour of day vs Day of week — darker colors indicate more breakdowns
                        </CardDescription>
                      </div>
                      {data.filters_applied.date_from && (
                        <div className="text-xs text-white/30">
                          Filtered: {data.filters_applied.date_from} to {data.filters_applied.date_to}
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <div className="min-w-[600px]">
                        {/* Hour labels */}
                        <div className="grid grid-cols-[auto_1fr] gap-1 mb-1">
                          <div className="w-12"></div>
                          <div className="grid grid-cols-24 gap-0.5">
                            {data.heatmap.labels.hours.filter((_, i) => i % 3 === 0).map((hour, idx) => (
                              <div
                                key={idx}
                                className="text-[9px] text-white/30 text-center"
                                style={{ gridColumn: `${(idx * 3) + 1} / span 3` }}
                              >
                                {hour}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Heatmap grid */}
                        <div className="space-y-0.5">
                          {data.heatmap.hour_day.map((row, hour) => (
                            <div key={hour} className="grid grid-cols-[auto_1fr] gap-1 items-center">
                              <div className="w-12 text-right text-[10px] text-white/40 pr-2">
                                {String(hour).padStart(2, '0')}:00
                              </div>
                              <div className="grid grid-cols-24 gap-0.5">
                                {row.map((value, day) => (
                                  <HeatmapCell
                                    key={day}
                                    value={value}
                                    max={maxHeatmapValue}
                                    hour={hour}
                                    day={day}
                                  />
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Day labels */}
                        <div className="grid grid-cols-[auto_1fr] gap-1 mt-2">
                          <div className="w-12"></div>
                          <div className="grid grid-cols-24 gap-0.5">
                            {DAY_NAMES.map((day, idx) => (
                              <div
                                key={idx}
                                className="text-[9px] text-white/30 text-center"
                                style={{ gridColumn: `${idx + 1} / span 1` }}
                              >
                                {day.slice(0, 3)}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Legend */}
                    <div className="flex items-center justify-center gap-4 mt-6 text-xs text-white/40">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: 'rgba(59, 130, 246, 0.5)' }} />
                        <span>Low</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: 'rgba(245, 158, 11, 0.7)' }} />
                        <span>Medium</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.9)' }} />
                        <span>High</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Hourly + Daily Distribution */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Hourly Distribution */}
                  <Card className="bg-white/[0.03] border-white/[0.08]">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-blue-400" />
                        Hourly Distribution
                      </CardTitle>
                      <CardDescription className="text-white/40">
                        Peak breakdown hours
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {data.hourly_distribution.some(d => d.count > 0) ? (
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart data={data.hourly_distribution} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="hour" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }} interval={2} />
                            <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="count" name="Breakdowns" fill="#3b82f6" radius={[2, 2, 0, 0]}>
                              {data.hourly_distribution.map((entry, idx) => {
                                const maxC = Math.max(...data.hourly_distribution.map(d => d.count));
                                const isPeak = entry.count === maxC && maxC > 0;
                                return <Cell key={idx} fill={isPeak ? '#ef4444' : '#3b82f6'} />;
                              })}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <p className="text-white/30 text-xs text-center py-8">No hourly data available</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Daily Distribution */}
                  <Card className="bg-white/[0.03] border-white/[0.08]">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-green-400" />
                        Daily Distribution
                      </CardTitle>
                      <CardDescription className="text-white/40">
                        Breakdowns by day of week
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {data.daily_distribution.some(d => d.count > 0) ? (
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart data={data.daily_distribution} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                            <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="count" name="Breakdowns" fill="#22c55e" radius={[2, 2, 0, 0]}>
                              {data.daily_distribution.map((entry, idx) => {
                                const maxC = Math.max(...data.daily_distribution.map(d => d.count));
                                const isPeak = entry.count === maxC && maxC > 0;
                                return <Cell key={idx} fill={isPeak ? '#ef4444' : '#22c55e'} />;
                              })}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <p className="text-white/30 text-xs text-center py-8">No daily data available</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* ===== RICHER HEATMAPS ===== */}
                {/* Response Time Heatmap */}
                {data.response_time_heatmap && data.response_time_heatmap.some(row => row.some(v => v > 0)) && (
                  <Card className="bg-white/[0.03] border-white/[0.08]">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-indigo-400" />
                        Response Time Heatmap (minutes)
                      </CardTitle>
                      <CardDescription className="text-white/40">
                        Average response time by hour × day — darker = slower response
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <div className="min-w-[600px]">
                          <div className="grid grid-cols-[auto_1fr] gap-1 mb-1">
                            <div className="w-12" />
                            <div className="grid grid-cols-24 gap-0.5">
                              {DAY_NAMES.map((d, i) => (
                                <div key={i} className="text-[9px] text-white/30 text-center" style={{ gridColumn: `${i + 1} / span 1` }}>{d.slice(0, 3)}</div>
                              ))}
                            </div>
                          </div>
                          {data.response_time_heatmap.map((row, hour) => (
                            <div key={hour} className="grid grid-cols-[auto_1fr] gap-1 items-center">
                              <div className="w-12 text-right text-[10px] text-white/40 pr-2">{String(hour).padStart(2, '0')}:00</div>
                              <div className="grid grid-cols-24 gap-0.5">
                                {row.map((val, day) => {
                                  const maxVal = Math.max(...data.response_time_heatmap.flat(), 1);
                                  const intensity = maxVal > 0 ? val / maxVal : 0;
                                  const color = val === 0 ? 'rgba(255,255,255,0.03)' :
                                    intensity < 0.33 ? `rgba(99,102,241,${0.3 + 0.4 * intensity})` :
                                    intensity < 0.66 ? `rgba(245,158,11,${0.4 + 0.4 * intensity})` :
                                    `rgba(239,68,68,${0.5 + 0.5 * intensity})`;
                                  return (
                                    <div key={day} className="relative group cursor-pointer" title={`${String(hour).padStart(2,'0')}:00 - ${DAY_NAMES[day]}: ${val.toFixed(1)} min avg response`}>
                                      <div className="w-full aspect-square rounded-sm transition-all duration-200 hover:scale-110" style={{ backgroundColor: color, border: val === maxVal && maxVal > 0 ? '2px solid rgba(255,255,255,0.6)' : '1px solid rgba(255,255,255,0.05)' }} />
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Breakdown Type × Hour Heatmaps */}
                {Object.keys(data.type_hour_heatmap || {}).length > 0 && (
                  <Card className="bg-white/[0.03] border-white/[0.08]">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2 text-sm">
                        <Activity className="h-4 w-4 text-violet-400" />
                        Breakdown Type × Hour Distribution
                      </CardTitle>
                      <CardDescription className="text-white/40">
                        When each type of breakdown occurs — stacked bar chart
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(data.type_hour_heatmap).slice(0, 6).map(([type, hours]) => {
                          const maxCount = Math.max(...hours.map(h => h.count), 1);
                          return (
                            <div key={type} className="bg-white/[0.04] rounded-xl p-3 border border-white/[0.06]">
                              <h4 className="text-white/80 text-xs font-semibold mb-2">{type}</h4>
                              <ResponsiveContainer width="100%" height={80}>
                                <BarChart data={hours} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                  <Bar dataKey="count" fill="#8b5cf6" radius={[1, 1, 0, 0]} maxBarSize={4} />
                                </BarChart>
                              </ResponsiveContainer>
                              <div className="flex justify-between text-[9px] text-white/30 mt-1">
                                <span>00:00</span>
                                <span>Peak: {maxCount}</span>
                                <span>23:00</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Department × Hour Heatmap */}
                {Object.keys(data.dept_hour_heatmap || {}).length > 0 && (
                  <Card className="bg-white/[0.03] border-white/[0.08]">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2 text-sm">
                        <Building2 className="h-4 w-4 text-blue-400" />
                        Department × Hour Breakdown Distribution
                      </CardTitle>
                      <CardDescription className="text-white/40">
                        When breakdowns happen in each department
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(data.dept_hour_heatmap).slice(0, 6).map(([dept, hours]) => {
                          const maxCount = Math.max(...hours.map(h => h.count), 1);
                          return (
                            <div key={dept} className="bg-white/[0.04] rounded-xl p-3 border border-white/[0.06]">
                              <h4 className="text-white/80 text-xs font-semibold mb-2">{dept}</h4>
                              <ResponsiveContainer width="100%" height={80}>
                                <BarChart data={hours} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                  <Bar dataKey="count" fill="#3b82f6" radius={[1, 1, 0, 0]} maxBarSize={4} />
                                </BarChart>
                              </ResponsiveContainer>
                              <div className="flex justify-between text-[9px] text-white/30 mt-1">
                                <span>00:00</span>
                                <span>Peak: {maxCount}</span>
                                <span>23:00</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Priority × Hour Heatmap */}
                {Object.keys(data.priority_hour_heatmap || {}).length > 0 && (
                  <Card className="bg-white/[0.03] border-white/[0.08]">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2 text-sm">
                        <Zap className="h-4 w-4 text-amber-400" />
                        Priority × Hour Distribution
                      </CardTitle>
                      <CardDescription className="text-white/40">
                        When critical/high/medium/low priority breakdowns occur
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(data.priority_hour_heatmap).map(([pri, hours]) => {
                          const maxCount = Math.max(...hours.map(h => h.count), 1);
                          const color = PRIORITY_COLORS[pri] || '#6b7280';
                          return (
                            <div key={pri} className="bg-white/[0.04] rounded-xl p-3 border border-white/[0.06]">
                              <h4 className="text-white/80 text-xs font-semibold mb-2 capitalize">{pri}</h4>
                              <ResponsiveContainer width="100%" height={100}>
                                <BarChart data={hours} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                  <Bar dataKey="count" fill={color} radius={[1, 1, 0, 0]} maxBarSize={4} />
                                </BarChart>
                              </ResponsiveContainer>
                              <div className="flex justify-between text-[9px] text-white/30 mt-1">
                                <span>00:00</span>
                                <span>Peak: {maxCount}</span>
                                <span>23:00</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Artisan × Hour Heatmap */}
                {Object.keys(data.artisan_hour_heatmap || {}).length > 0 && (
                  <Card className="bg-white/[0.03] border-white/[0.08]">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4 text-amber-400" />
                        Top Artisans × Hour Activity
                      </CardTitle>
                      <CardDescription className="text-white/40">
                        When top artisans are most active responding to breakdowns
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(data.artisan_hour_heatmap).slice(0, 6).map(([name, hours]) => {
                          const maxCount = Math.max(...hours.map(h => h.count), 1);
                          return (
                            <div key={name} className="bg-white/[0.04] rounded-xl p-3 border border-white/[0.06]">
                              <h4 className="text-white/80 text-xs font-semibold mb-2 truncate">{name}</h4>
                              <ResponsiveContainer width="100%" height={80}>
                                <BarChart data={hours} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                  <Bar dataKey="count" fill="#f59e0b" radius={[1, 1, 0, 0]} maxBarSize={4} />
                                </BarChart>
                              </ResponsiveContainer>
                              <div className="flex justify-between text-[9px] text-white/30 mt-1">
                                <span>00:00</span>
                                <span>Peak: {maxCount}</span>
                                <span>23:00</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Location × Hour Heatmap */}
                {Object.keys(data.location_hour_heatmap || {}).length > 0 && (
                  <Card className="bg-white/[0.03] border-white/[0.08]">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-rose-400" />
                        Top Locations × Hour Activity
                      </CardTitle>
                      <CardDescription className="text-white/40">
                        When breakdowns happen at the most problematic locations
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(data.location_hour_heatmap).slice(0, 6).map(([loc, hours]) => {
                          const maxCount = Math.max(...hours.map(h => h.count), 1);
                          return (
                            <div key={loc} className="bg-white/[0.04] rounded-xl p-3 border border-white/[0.06]">
                              <h4 className="text-white/80 text-xs font-semibold mb-2 truncate">{loc}</h4>
                              <ResponsiveContainer width="100%" height={80}>
                                <BarChart data={hours} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                  <Bar dataKey="count" fill="#f43f5e" radius={[1, 1, 0, 0]} maxBarSize={4} />
                                </BarChart>
                              </ResponsiveContainer>
                              <div className="flex justify-between text-[9px] text-white/30 mt-1">
                                <span>00:00</span>
                                <span>Peak: {maxCount}</span>
                                <span>23:00</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Monthly Day-of-Month Heatmap */}
                {Object.keys(data.monthly_day_heatmap || {}).length > 0 && (
                  <Card className="bg-white/[0.03] border-white/[0.08]">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-cyan-400" />
                        Day-of-Month Breakdown Heatmap
                      </CardTitle>
                      <CardDescription className="text-white/40">
                        Which days of the month have the most breakdowns — spot monthly patterns
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(data.monthly_day_heatmap).slice(0, 6).map(([month, days]) => {
                          const maxCount = Math.max(...days.map(d => d.count), 1);
                          return (
                            <div key={month} className="bg-white/[0.04] rounded-xl p-3 border border-white/[0.06]">
                              <h4 className="text-white/80 text-xs font-semibold mb-2">{month}</h4>
                              <div className="grid grid-cols-31 gap-0.5">
                                {days.map((d, idx) => {
                                  const intensity = maxCount > 0 ? d.count / maxCount : 0;
                                  const color = d.count === 0 ? 'rgba(255,255,255,0.03)' :
                                    intensity < 0.33 ? `rgba(6,182,212,${0.2 + 0.4 * intensity})` :
                                    intensity < 0.66 ? `rgba(245,158,11,${0.3 + 0.4 * intensity})` :
                                    `rgba(239,68,68,${0.4 + 0.5 * intensity})`;
                                  return (
                                    <div key={idx} className="relative group cursor-pointer" title={`Day ${d.day}: ${d.count} breakdowns`}>
                                      <div className="w-full aspect-square rounded-sm" style={{ backgroundColor: color, border: d.count === maxCount && maxCount > 0 ? '1px solid rgba(255,255,255,0.5)' : '1px solid rgba(255,255,255,0.04)' }} />
                                    </div>
                                  );
                                })}
                              </div>
                              <div className="flex justify-between text-[9px] text-white/30 mt-1">
                                <span>Day 1</span>
                                <span>Peak: {maxCount}</span>
                                <span>Day 31</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* ===== TRENDS TAB ===== */}
              <TabsContent value="trends" className="space-y-6 mt-0">
                {/* Monthly Trends */}
                <Card className="bg-white/[0.03] border-white/[0.08]">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2 text-sm">
                      <TrendingUp className="h-4 w-4 text-emerald-400" />
                      Monthly Breakdown Trends
                    </CardTitle>
                    <CardDescription className="text-white/40">
                      Breakdown count per month — identify worsening or improving trends
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {data.monthly_trends.length > 0 ? (
                      <ResponsiveContainer width="100%" height={350}>
                        <ReAreaChart data={data.monthly_trends} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                          <defs>
                            <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
                          <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Area type="monotone" dataKey="count" name="Breakdowns" stroke="#10b981" fill="url(#trendGradient)" strokeWidth={2} />
                        </ReAreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-white/30 text-xs text-center py-8">No monthly trend data available</p>
                    )}
                  </CardContent>
                </Card>

                {/* Weekly Trends */}
                <Card className="bg-white/[0.03] border-white/[0.08]">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-cyan-400" />
                      Weekly Breakdown Trends
                    </CardTitle>
                    <CardDescription className="text-white/40">
                      Breakdowns per week — granular view of recent activity
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {data.weekly_trends.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={data.weekly_trends} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="week" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }} interval={Math.max(1, Math.floor(data.weekly_trends.length / 15))} />
                          <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="count" name="Breakdowns" fill="#06b6d4" radius={[2, 2, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-white/30 text-xs text-center py-8">No weekly trend data available</p>
                    )}
                  </CardContent>
                </Card>

                {/* Response Time by Hour */}
                <Card className="bg-white/[0.03] border-white/[0.08]">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2 text-sm">
                      <Gauge className="h-4 w-4 text-indigo-400" />
                      Response Time Analysis by Hour
                    </CardTitle>
                    <CardDescription className="text-white/40">
                      Average response time (minutes) and number of breakdowns per hour
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {data.response_time_by_hour.some(r => r.avg_response_time > 0) ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <ComposedChart data={data.response_time_by_hour} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="hour" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} interval={2} />
                          <YAxis yAxisId="left" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                          <YAxis yAxisId="right" orientation="right" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar yAxisId="right" dataKey="count" name="Breakdowns" fill="rgba(99,102,241,0.3)" radius={[2, 2, 0, 0]} />
                          <Line yAxisId="left" type="monotone" dataKey="avg_response_time" name="Avg Response (min)" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-white/30 text-xs text-center py-8">No response time data available</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ===== MACHINES TAB ===== */}
              <TabsContent value="machines" className="space-y-6 mt-0">
                {/* Top Problem Machines */}
                <Card className="bg-white/[0.03] border-white/[0.08]">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2 text-sm">
                      <Wrench className="h-4 w-4 text-red-400" />
                      Top Problem Machines
                    </CardTitle>
                    <CardDescription className="text-white/40">
                      Machines with the most breakdown occurrences and downtime
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {data.top_problem_machines.length > 0 ? (
                      <div className="space-y-4">
                        {data.top_problem_machines.slice(0, 10).map((machine, idx) => {
                          const maxCount = Math.max(...data.top_problem_machines.map(m => m.count));
                          const percentage = (machine.count / maxCount) * 100;
                          return (
                            <div key={idx} className="space-y-1.5">
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="text-white/90 text-sm font-medium truncate flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-white/[0.06] flex items-center justify-center text-[10px] text-white/40 font-mono">{idx + 1}</span>
                                    {machine.name}
                                  </div>
                                  <div className="text-white/40 text-[10px] ml-7">
                                    {machine.department} · {formatTime(machine.total_downtime)} downtime · avg {formatTime(machine.avg_repair_time)} repair
                                  </div>
                                </div>
                                <div className="text-right ml-3">
                                  <div className="text-white/90 text-sm font-semibold">{machine.count}</div>
                                  <div className="text-white/30 text-[10px]">breakdowns</div>
                                </div>
                              </div>
                              <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden ml-7">
                                <div
                                  className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full transition-all"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-white/30 text-xs text-center py-8">No machine data available</p>
                    )}
                  </CardContent>
                </Card>

                {/* Machine Downtime Scatter Plot */}
                <Card className="bg-white/[0.03] border-white/[0.08]">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2 text-sm">
                      <ScatterChart className="h-4 w-4 text-orange-400" />
                      Machine Downtime Analysis
                    </CardTitle>
                    <CardDescription className="text-white/40">
                      Breakdowns vs Avg Downtime — each dot is a machine. Hover for details
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {data.machine_downtime_scatter.length > 0 ? (
                      <ResponsiveContainer width="100%" height={350}>
                        <ReScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis
                            type="number"
                            dataKey="breakdowns"
                            name="Breakdowns"
                            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                            label={{ value: 'Number of Breakdowns', position: 'bottom', fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
                          />
                          <YAxis
                            type="number"
                            dataKey="avg_downtime"
                            name="Avg Downtime (min)"
                            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                            label={{ value: 'Avg Downtime (min)', angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
                          />
                          <Tooltip
                            content={({ active, payload }: any) => {
                              if (!active || !payload?.length) return null;
                              const d = payload[0].payload;
                              return (
                                <div className="bg-black/90 border border-white/10 rounded-lg px-3 py-2 text-xs shadow-xl">
                                  <p className="text-white font-semibold mb-1">{d.name}</p>
                                  <p className="text-white/70">Breakdowns: <span className="text-white">{d.breakdowns}</span></p>
                                  <p className="text-white/70">Avg Downtime: <span className="text-white">{formatTime(d.avg_downtime)}</span></p>
                                  <p className="text-white/70">Avg Repair: <span className="text-white">{formatTime(d.avg_repair_time)}</span></p>
                                  <p className="text-white/70">Dept: <span className="text-white">{d.department}</span></p>
                                </div>
                              );
                            }}
                          />
                          <Scatter
                            name="Machines"
                            data={data.machine_downtime_scatter}
                            fill="#f97316"
                            shape="circle"
                          >
                            {data.machine_downtime_scatter.map((entry, idx) => (
                              <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                            ))}
                          </Scatter>
                        </ReScatterChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-white/30 text-xs text-center py-8">No machine scatter data available</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ===== ARTISANS TAB ===== */}
              <TabsContent value="artisans" className="space-y-6 mt-0">
                {/* Top Artisans */}
                <Card className="bg-white/[0.03] border-white/[0.08]">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-amber-400" />
                      Top Artisans by Breakdowns Attended
                    </CardTitle>
                    <CardDescription className="text-white/40">
                      Most breakdowns attended by artisan
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {data.artisan_performance.length > 0 ? (
                      <div className="space-y-3">
                        {data.artisan_performance.slice(0, 10).map((artisan, idx) => {
                          const maxCount = Math.max(...data.artisan_performance.map(a => a.count));
                          const percentage = (artisan.count / maxCount) * 100;
                          return (
                            <div key={idx} className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="w-5 h-5 rounded-full bg-white/[0.06] flex items-center justify-center text-[10px] text-white/40 font-mono">{idx + 1}</span>
                                  <span className="text-white/90 text-sm truncate">{artisan.name}</span>
                                </div>
                                <div className="text-right">
                                  <div className="text-white/90 text-sm font-semibold">{artisan.count}</div>
                                  <div className="text-white/30 text-[10px]">avg {formatTime(artisan.avg_repair_time)}</div>
                                </div>
                              </div>
                              <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden ml-7">
                                <div
                                  className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-white/30 text-xs text-center py-8">No artisan data available</p>
                    )}
                  </CardContent>
                </Card>

                {/* Artisan Performance Comparison */}
                <Card className="bg-white/[0.03] border-white/[0.08]">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2 text-sm">
                      <GitCompare className="h-4 w-4 text-amber-400" />
                      Artisan Performance: Breakdowns vs Avg Repair Time
                    </CardTitle>
                    <CardDescription className="text-white/40">
                      Compare workload (breakdowns) vs efficiency (avg repair time)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {data.artisan_performance.length > 0 ? (
                      <ResponsiveContainer width="100%" height={350}>
                        <ComposedChart
                          data={data.artisan_performance.slice(0, 10)}
                          margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                          <YAxis yAxisId="left" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                          <YAxis yAxisId="right" orientation="right" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar yAxisId="left" dataKey="count" name="Breakdowns" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                          <Line yAxisId="right" type="monotone" dataKey="avg_repair_time" name="Avg Repair (min)" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-white/30 text-xs text-center py-8">No artisan performance data available</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ===== SPARES TAB ===== */}
              <TabsContent value="spares" className="space-y-6 mt-0">
                {/* Most Used Spare Parts */}
                <Card className="bg-white/[0.03] border-white/[0.08]">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2 text-sm">
                      <Package className="h-4 w-4 text-purple-400" />
                      Most Used Spare Parts
                    </CardTitle>
                    <CardDescription className="text-white/40">
                      Frequently replaced components and their costs
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {data.top_spare_parts.length > 0 ? (
                      <div className="space-y-3">
                        {data.top_spare_parts.slice(0, 10).map((spare, idx) => {
                          const maxCount = Math.max(...data.top_spare_parts.map(s => s.count));
                          const percentage = (spare.count / maxCount) * 100;
                          return (
                            <div key={idx} className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-white/[0.06] flex items-center justify-center text-[10px] text-white/40 font-mono">{idx + 1}</span>
                                    <div>
                                      <div className="text-white/90 text-sm truncate">{spare.name}</div>
                                      {spare.part_number && (
                                        <div className="text-white/30 text-[10px]">{spare.part_number}</div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right ml-2">
                                  <div className="text-white/90 text-sm font-semibold">{spare.total_quantity}×</div>
                                  <div className="text-amber-300/70 text-[10px]">{formatCurrency(spare.total_cost)}</div>
                                </div>
                              </div>
                              <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden ml-7">
                                <div
                                  className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full transition-all"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-white/30 text-xs text-center py-8">No spare parts data available</p>
                    )}
                  </CardContent>
                </Card>

                {/* Spare Parts Cost Distribution */}
                <Card className="bg-white/[0.03] border-white/[0.08]">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2 text-sm">
                      <BarChart3 className="h-4 w-4 text-purple-400" />
                      Spare Parts Cost Analysis
                    </CardTitle>
                    <CardDescription className="text-white/40">
                      Total cost vs quantity used for top spare parts
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {data.top_spare_parts.length > 0 ? (
                      <ResponsiveContainer width="100%" height={350}>
                        <ComposedChart
                          data={data.top_spare_parts.slice(0, 10)}
                          margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }} />
                          <YAxis yAxisId="left" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                          <YAxis yAxisId="right" orientation="right" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar yAxisId="left" dataKey="total_quantity" name="Qty Used" fill="#a855f7" radius={[4, 4, 0, 0]} />
                          <Line yAxisId="right" type="monotone" dataKey="total_cost" name="Total Cost ($)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-white/30 text-xs text-center py-8">No spare parts cost data available</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ===== DISTRIBUTION TAB ===== */}
              <TabsContent value="distribution" className="space-y-6 mt-0">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Breakdown Type Pie */}
                  <Card className="bg-white/[0.03] border-white/[0.08]">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2 text-sm">
                        <PieChart className="h-4 w-4 text-violet-400" />
                        Breakdown Types
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {data.breakdown_type_distribution.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <RePieChart>
                            <Pie
                              data={data.breakdown_type_distribution}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={100}
                              paddingAngle={2}
                              dataKey="count"
                              nameKey="type"
                              label={(entry: any) => `${(entry.percent * 100).toFixed(0)}%`}
                              labelLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                            >
                              {data.breakdown_type_distribution.map((_, idx) => (
                                <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend
                              formatter={(value) => <span className="text-white/60 text-xs">{value}</span>}
                            />
                          </RePieChart>
                        </ResponsiveContainer>
                      ) : (
                        <p className="text-white/30 text-xs text-center py-8">No data</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Priority Pie */}
                  <Card className="bg-white/[0.03] border-white/[0.08]">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2 text-sm">
                        <Zap className="h-4 w-4 text-amber-400" />
                        Priority Levels
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {data.priority_distribution.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <RePieChart>
                            <Pie
                              data={data.priority_distribution}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={100}
                              paddingAngle={2}
                              dataKey="count"
                              nameKey="priority"
                              label={(entry: any) => `${(entry.percent * 100).toFixed(0)}%`}
                              labelLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                            >
                              {data.priority_distribution.map((entry) => (
                                <Cell key={entry.priority} fill={PRIORITY_COLORS[entry.priority] || '#6b7280'} />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend
                              formatter={(value) => <span className="text-white/60 text-xs">{value}</span>}
                            />
                          </RePieChart>
                        </ResponsiveContainer>
                      ) : (
                        <p className="text-white/30 text-xs text-center py-8">No data</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Status Distribution */}
                  <Card className="bg-white/[0.03] border-white/[0.08]">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2 text-sm">
                        <List className="h-4 w-4 text-cyan-400" />
                        Status Distribution
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {data.status_distribution.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <RePieChart>
                            <Pie
                              data={data.status_distribution}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={100}
                              paddingAngle={2}
                              dataKey="count"
                              nameKey="status"
                              label={(entry: any) => `${(entry.percent * 100).toFixed(0)}%`}
                              labelLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                            >
                              {data.status_distribution.map((entry) => (
                                <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#6b7280'} />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend
                              formatter={(value) => <span className="text-white/60 text-xs">{value}</span>}
                            />
                          </RePieChart>
                        </ResponsiveContainer>
                      ) : (
                        <p className="text-white/30 text-xs text-center py-8">No data</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Location Distribution */}
                  <Card className="bg-white/[0.03] border-white/[0.08]">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-rose-400" />
                        Location Distribution
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {data.location_distribution.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart
                            data={data.location_distribution.slice(0, 10)}
                            layout="vertical"
                            margin={{ top: 5, right: 20, left: 80, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                            <YAxis type="category" dataKey="location" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} width={80} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="count" name="Breakdowns" fill="#f43f5e" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <p className="text-white/30 text-xs text-center py-8">No location data available</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Department Comparison */}
                <Card className="bg-white/[0.03] border-white/[0.08]">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2 text-sm">
                      <Building2 className="h-4 w-4 text-blue-400" />
                      Department Comparison
                    </CardTitle>
                    <CardDescription className="text-white/40">
                      Breakdowns and total downtime by department
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {data.department_comparison.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <ComposedChart data={data.department_comparison} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="department" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
                          <YAxis yAxisId="left" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                          <YAxis yAxisId="right" orientation="right" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar yAxisId="left" dataKey="count" name="Breakdowns" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                          <Line yAxisId="right" type="monotone" dataKey="downtime" name="Downtime (min)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-white/30 text-xs text-center py-8">No department data available</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Info Banner */}
            <Card className="bg-blue-500/[0.08] border-blue-500/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <BarChart3 className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-white/60">
                    <p className="font-semibold text-white/80 mb-1">Comprehensive Analytics Dashboard</p>
                    <p>
                      Explore breakdown patterns across 7 tabs: Overview (summary + trends), Heatmap (time-based patterns), 
                      Trends (monthly/weekly/response time), Machines (problem machines + scatter analysis), 
                      Artisans (workload + efficiency), Spares (usage + cost analysis), and Distributions (types/priorities/status/locations). 
                      Use filters to drill down by date range, department, or specific machine.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </PageShell>
  );
}
