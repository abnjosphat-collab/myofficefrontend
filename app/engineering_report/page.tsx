"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Calendar, 
  Download, 
  FileText, 
  BarChart3, 
  RefreshCw, 
  AlertTriangle,
  Gauge,
  HardHat,
  Wrench,
  TrendingUp,
  Clock,
  Activity,
  Database,
  Eye,
  Trash2,
  CheckCircle,
  AlertCircle,
  Settings,
  Shield,
  ClipboardCheck,
  Users,
  Plus,
  ChevronDown,
  ChevronUp,
  Cloud,
  Zap,
  Wind,
  X,
  Search,
  Filter,
  FileSpreadsheet,
  Printer,
  Target,
  AlertOctagon,
  Droplets,
  CalendarDays,
  CalendarRange,
  ArrowUpDown,
  Maximize2,
  Minimize2,
  ActivitySquare,
  BatteryCharging,
  BookOpen,
  ChevronRight,
  BarChart,
  Thermometer,
  Power,
  AlertCircle as AlertCircleIcon,
  CheckSquare,
  ClipboardList,
  Building,
  Cpu,
  Fan,
  Layers,
  Train,
  AlertOctagon as AlertOctagonIcon,
  Clock as ClockIcon,
  CheckCheck,
  ChevronLeft,
  ChevronsUpDown,
  Hash,
  Percent,
  ThermometerSun,
  ZapOff,
  Bell,
  FolderOpen,
  CalendarCheck,
  FileBarChart,
  TrendingDown,
  Activity as ActivityIcon,
  Target as TargetIcon,
  Expand,
  Minus,
  ChevronsUp,
  ChevronsDown,
  Maximize,
  Minimize,
  Grid3x3,
  Table,
  List,
  LineChart as LineChartIcon,
  AreaChart as AreaChartIcon,
  PieChart as PieChartIcon,
  DownloadCloud,
  File,
  FileCode,
  FileDigit,
  FilePlus,
  FileDown,
  FileType,
  FileJson,
  Eye as EyeIcon,
  MoreHorizontal,
  ExternalLink,
  Copy,
  Share2,
  Star,
  Bookmark,
  BellRing,
  AlertOctagon as AlertOctagonIcon2,
  ChevronRightCircle,
  Info,
  HelpCircle,
  ChevronFirst,
  ChevronLast,
  Grid,
  LayoutGrid,
  LayoutList,
  GitCompare,
  GitPullRequest,
  GitBranch,
  GitCommit,
  GitMerge,
  GitPullRequestClosed,
  FilterX,
  CalendarX,
  CalendarCheck2,
  CalendarClock,
  CalendarOff,
  CalendarPlus,
  CalendarSearch,
  CalendarSync,
  CalendarDays as CalendarDaysIcon,
  CalendarHeart,
  CalendarMinus,
  CalendarRange as CalendarRangeIcon,
  CalendarCheck as CalendarCheckIcon,
  CalendarCog,
  CalendarFold,
  CalendarMinus2,
  CalendarPlus2,
  CalendarX2,
  Calendar as CalendarIcon,
  ChartArea,
  ChartBar,
  ChartBarBig,
  ChartCandlestick,
  ChartColumn,
  ChartColumnIncreasing,
  ChartGantt,
  ChartLine,
  ChartNetwork,
  ChartNoAxesColumn,
  ChartPie,
  ChartScatter,
  ChartSpline,
  Target as TargetIcon2,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Zap as ZapIcon,
  Wind as WindIcon,
  Cloud as CloudIcon,
  Download as DownloadIcon,
  CalendarPlus as CalendarPlusIcon,
  Thermometer as ThermometerIcon,
  PieChart as PieChartIcon2,
  Radar as RadarIcon,
  Box as BoxIcon,
  ChevronRight as ChevronRightIcon,
  ChevronLeft as ChevronLeftIcon
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart as RechartsLineChart, 
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart as RechartsBarChart,
  Bar,
  AreaChart as RechartsAreaChart,
  Area,
  ComposedChart,
  Cell,
  PieChart,
  Pie,
  Legend,
  ScatterChart,
  Scatter,
  ZAxis,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ReferenceLine,
  Treemap,
  Brush,
  Sankey,
  RadialBarChart,
  RadialBar,
  FunnelChart,
  Funnel,
  Label as RechartsLabel,
  ErrorBar
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuGroup,
  DropdownMenuShortcut,
} from "@/components/ui/dropdown-menu";
import { 
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { PageShell } from '@/components/PageShell';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ─── TypeScript Interfaces ───────────────────────────────────────────────────

interface Callout {
  shift: 'day' | 'night';
  description: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
}

interface Equipment {
  name: string;
  target: number;
  actual: number;
  category: string;
}

interface DailyReport {
  _id?: string;
  date: string;
  safety: string;
  projects: string;
  weekly_plan: string;
  daily_checks: string;
  power_availability: string;
  dam_level: string | number;
  call_outs: Callout[];
  plant_availability_percent: number;
  equipment: Equipment[];
  notes: string;
  created_at?: string;
}

interface ReportForm {
  date: string;
  safety: string;
  projects: string;
  weekly_plan: string;
  daily_checks: string;
  power_availability: string;
  dam_level: string;
  call_outs: Callout[];
  plant_availability_percent: number | string;
  equipment: Equipment[];
  notes: string;
}

interface TrendDataPoint {
  period: string;
  date: string;
  plantAvailability: number;
  damLevel: number;
  callouts: number;
  equipmentPerformance: number;
  target: number;
  damTarget: number;
  [key: string]: string | number;
}

interface EquipmentPerformancePoint {
  name: string;
  category: string;
  avgPerformance: number;
  minPerformance: number;
  maxPerformance: number;
  trend: number;
}

interface DashboardStats {
  total: number;
  avgPlant: number;
  totalCalloutsHours: number;
  avgDamLevel: number;
  totalCallouts: number;
  avgEquipmentPerformance: number;
  bestPerformingCategory: string;
  worstPerformingCategory: string;
}

interface AnalyticsFilters {
  dateRange: { from: Date; to: Date };
  equipmentCategory: string;
  specificEquipment: string;
  performanceThreshold: number;
  powerStatus: string;
  showTrendLines: boolean;
  showTargetLine: boolean;
  groupBy: string;
  chartType: string;
  viewMode: string;
  compareMode: boolean;
  comparePeriod: string;
  metrics: string[];
}

interface CalloutDuration {
  start: string;
  end: string;
}

interface CustomExportDates {
  from: Date;
  to: Date;
}

interface GroupAccumulator {
  period: string;
  plantAvailability: number[];
  damLevels: number[];
  callouts: number;
  equipmentPerformance: number[];
}

interface GroupedPeriodData {
  period: string;
  plantAvailability: string | number;
  damLevel: string | number;
  callouts: number;
  equipmentPerformance: string | number;
}

interface EquipmentMapEntry {
  name: string;
  category: string;
  values: number[];
  dates: string[];
}

interface CategoryPerformanceEntry {
  total: number;
  count: number;
}

interface EquipmentSummaryEntry {
  name: string;
  category: string;
  totalActual: number;
  totalTarget: number;
  count: number;
}

const EQUIPMENT_CATEGORIES = [
  {
    name: 'Power Systems',
    icon: BatteryCharging,
    color: 'bg-amber-500',
    textColor: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    equipment: [
      { name: 'ZESA Power Supply', target: 80 },
      { name: 'Backup Generators', target: 95 },
    ]
  },
  {
    name: 'Compressors',
    icon: Cloud,
    color: 'bg-blue-500',
    textColor: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    equipment: [
      { name: 'PUG Compressors', target: 95 },
      { name: '4L Compressor', target: 95 },
      { name: '6L Compressor', target: 95 },
    ]
  },
  {
    name: 'Ventilation',
    icon: Wind,
    color: 'bg-emerald-500',
    textColor: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    equipment: [
      { name: 'Concession Ventilation Fans', target: 95 },
      { name: 'Sandblast Ventilation Fans', target: 95 },
    ]
  },
  {
    name: 'Winders',
    icon: TrendingUp,
    color: 'bg-purple-500',
    textColor: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    equipment: [
      { name: 'Southwell Shaft Winder', target: 95 },
      { name: 'Burnett Shaft Winder', target: 95 },
      { name: 'Venning Shaft Winder', target: 95 },
      { name: 'Sub-Vert Shaft Winder', target: 95 },
      { name: 'Lobe Shaft Winder', target: 95 },
    ]
  },
  {
    name: 'Loading Systems',
    icon: HardHat,
    color: 'bg-orange-500',
    textColor: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    equipment: [
      { name: '4L Tipping System', target: 95 },
      { name: '6L Loading Station', target: 95 },
      { name: '5L Loading Flask', target: 95 },
      { name: '10.5 Loading Station', target: 95 },
      { name: 'Air-Loaders', target: 95 },
    ]
  },
  {
    name: 'Conveyors',
    icon: Settings,
    color: 'bg-red-500',
    textColor: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    equipment: [
      { name: 'PUG Overland Conveyor', target: 95 },
      { name: '5L Conveyor System', target: 95 },
      { name: '5L Decline Conveyor', target: 95 },
    ]
  },
  {
    name: 'Processing',
    icon: Wrench,
    color: 'bg-pink-500',
    textColor: 'text-pink-600',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-200',
    equipment: [
      { name: '5L Ore Feed Box 1', target: 95 },
      { name: '5L Ore Feed Box 2', target: 95 },
    ]
  },
  {
    name: 'Transport',
    icon: Users,
    color: 'bg-cyan-500',
    textColor: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
    borderColor: 'border-cyan-200',
    equipment: [
      { name: '4L Locomotives', target: 95 },
      { name: '5L Locomotives', target: 95 },
      { name: '6L Locomotives', target: 95 },
      { name: '10L Locomotives', target: 95 },
    ]
  },
  {
    name: 'Water Systems',
    icon: Gauge,
    color: 'bg-indigo-500',
    textColor: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    equipment: [
      { name: 'Gilberts Dam', target: 5 }, // Target: 5 meters (not percentage)
      { name: 'Burnett Cascade Pumping', target: 95 },
    ]
  }
];

const CHART_TYPES = [
  { value: 'line', label: 'Line Chart', icon: ChartLine },
  { value: 'bar', label: 'Bar Chart', icon: ChartBar },
  { value: 'area', label: 'Area Chart', icon: ChartArea },
  { value: 'composed', label: 'Composed Chart', icon: ChartColumnIncreasing },
  { value: 'pie', label: 'Pie Chart', icon: ChartPie },
  { value: 'radar', label: 'Radar Chart', icon: RadarIcon },
  { value: 'scatter', label: 'Scatter Plot', icon: ChartScatter },
  { value: 'treemap', label: 'Treemap', icon: BoxIcon },
];

const PRESET_EQUIPMENT = EQUIPMENT_CATEGORIES.flatMap(category => 
  category.equipment.map(eq => ({
    ...eq,
    category: category.name,
    actual: category.name === 'Water Systems' && eq.name === 'Gilberts Dam' ? 5 : 100
  }))
);

const emptyReport = (): ReportForm => ({
  date: new Date().toISOString().slice(0,10),
  safety: '',
  projects: '',
  weekly_plan: '',
  daily_checks: '',
  power_availability: 'normal',
  dam_level: '5.0', // Default to target value
  call_outs: [],
  plant_availability_percent: 97,
  equipment: PRESET_EQUIPMENT,
  notes: ''
});

const ensureArray = (data: unknown): DailyReport[] => {
  if (Array.isArray(data)) return data as DailyReport[];
  if (data && typeof data === 'object') return Object.values(data as Record<string, DailyReport>);
  return [];
};

// Helper function to generate CSV content
const generateCSVContent = (data: Record<string, unknown>[], headers: string[]): string => {
  const csvRows: string[] = [];
  csvRows.push(headers.join(','));

  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header] ?? '';
      return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
};

// Helper function to export data
const exportData = (data: string, filename: string, type = 'text/csv;charset=utf-8;') => {
  const blob = new Blob([data], { type });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
};

// Helper to generate DOCX file
const generateDocxContent = (reports: DailyReport[]): string => {
  let content = `Engineering Operations Reports\n`;
  content += `Generated: ${new Date().toLocaleDateString()}\n\n`;
  
  content += '='.repeat(80) + '\n\n';
  
  reports.forEach((report, index) => {
    content += `REPORT ${index + 1}: ${report.date}\n`;
    content += '='.repeat(80) + '\n\n';
    
    content += `Date: ${report.date}\n`;
    content += `Plant Availability: ${report.plant_availability_percent || 0}%\n`;
    content += `Dam Level: ${report.dam_level || 0}m\n`;
    content += `Power Status: ${report.power_availability}\n`;
    content += `Callouts: ${report.call_outs?.length || 0}\n\n`;
    
    if (report.safety) {
      content += `Safety Observations:\n${report.safety}\n\n`;
    }
    
    if (report.projects) {
      content += `Projects Update:\n${report.projects}\n\n`;
    }
    
    if (report.weekly_plan) {
      content += `Weekly Maintenance Plan:\n${report.weekly_plan}\n\n`;
    }
    
    if (report.daily_checks) {
      content += `Daily Checks:\n${report.daily_checks}\n\n`;
    }
    
    if (report.notes) {
      content += `Additional Notes:\n${report.notes}\n\n`;
    }
    
    if (report.call_outs?.length > 0) {
      content += `Emergency Callouts:\n`;
      report.call_outs.forEach((callout, idx) => {
        content += `  ${idx + 1}. ${callout.description} (${callout.shift} shift, ${callout.duration_hours}h)\n`;
      });
      content += '\n';
    }
    
    if (report.equipment?.length > 0) {
      content += `Equipment Performance:\n`;
      EQUIPMENT_CATEGORIES.forEach(category => {
        const categoryEq = report.equipment.filter(eq => eq.category === category.name);
        if (categoryEq.length > 0) {
          content += `  ${category.name}:\n`;
          categoryEq.forEach(eq => {
            content += `    - ${eq.name}: ${eq.actual || 0}${eq.name === 'Gilberts Dam' ? 'm' : '%'}\n`;
          });
        }
      });
      content += '\n';
    }
    
    content += '='.repeat(80) + '\n\n';
  });
  
  return content;
};

// Helper to generate PDF content
const generatePDFContent = (reports: DailyReport[]): string => {
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch {
      return dateString;
    }
  };

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Engineering Operations Reports</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          font-family: 'Inter', sans-serif;
        }
        
        body {
          padding: 40px;
          background: #f8fafc;
          color: #334155;
        }
        
        .header {
          margin-bottom: 40px;
          padding-bottom: 20px;
          border-bottom: 3px solid #3b82f6;
        }
        
        h1 {
          font-size: 28px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 8px;
        }
        
        .meta {
          display: flex;
          gap: 20px;
          color: #64748b;
          font-size: 14px;
          margin-bottom: 20px;
        }
        
        .report-card {
          background: white;
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 24px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          border: 1px solid #e2e8f0;
          page-break-inside: avoid;
        }
        
        .report-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 2px solid #f1f5f9;
        }
        
        .date {
          font-size: 18px;
          font-weight: 600;
          color: #1e293b;
        }
        
        .status-badge {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }
        
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        
        .metric {
          background: #f8fafc;
          padding: 16px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }
        
        .metric-label {
          font-size: 12px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 4px;
        }
        
        .metric-value {
          font-size: 24px;
          font-weight: 700;
          color: #1e293b;
        }
        
        .section {
          margin-bottom: 20px;
        }
        
        .section-title {
          font-size: 16px;
          font-weight: 600;
          color: #334155;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .section-content {
          font-size: 14px;
          line-height: 1.6;
          color: #475569;
          white-space: pre-line;
        }
        
        .equipment-table {
          width: 100%;
          border-collapse: collapse;
          margin: 16px 0;
        }
        
        .equipment-table th {
          background: #f1f5f9;
          padding: 12px;
          text-align: left;
          font-size: 12px;
          font-weight: 600;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        
        .equipment-table td {
          padding: 12px;
          border-bottom: 1px solid #e2e8f0;
          font-size: 14px;
        }
        
        .callout-item {
          background: #fffbeb;
          border: 1px solid #fde68a;
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 8px;
        }
        
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 2px solid #e2e8f0;
          color: #64748b;
          font-size: 12px;
          text-align: center;
        }
        
        @media print {
          body {
            padding: 0;
          }
          
          .report-card {
            box-shadow: none;
            border: 1px solid #ccc;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Engineering Operations Reports</h1>
        <div class="meta">
          <span>Generated: ${new Date().toLocaleDateString()}</span>
          <span>Total Reports: ${reports.length}</span>
          ${reports.length > 0 ? `
            <span>Period: ${formatDate(reports[0]?.date)} - ${formatDate(reports[reports.length - 1]?.date)}</span>
          ` : ''}
        </div>
      </div>
      
      ${reports.map((report, index) => {
        const plantPercent = Number(report.plant_availability_percent) || 0;
        const statusColor = plantPercent >= 95 ? '#10b981' : plantPercent >= 85 ? '#f59e0b' : '#ef4444';
        const statusText = plantPercent >= 95 ? 'Optimal' : plantPercent >= 85 ? 'Warning' : 'Critical';
        
        return `
          <div class="report-card">
            <div class="report-header">
              <div class="date">${formatDate(report.date)}</div>
              <div class="status-badge" style="background: ${statusColor}20; color: ${statusColor}; border: 1px solid ${statusColor}40">
                ${statusText} (${plantPercent}%)
              </div>
            </div>
            
            <div class="metrics-grid">
              <div class="metric">
                <div class="metric-label">Plant Availability</div>
                <div class="metric-value" style="color: ${statusColor}">${plantPercent}%</div>
              </div>
              <div class="metric">
                <div class="metric-label">Dam Level</div>
                <div class="metric-value">${Math.min(10, Number(report.dam_level) || 0)}m</div>
              </div>
              <div class="metric">
                <div class="metric-label">Power Status</div>
                <div class="metric-value" style="text-transform: capitalize">${report.power_availability}</div>
              </div>
              <div class="metric">
                <div class="metric-label">Callouts</div>
                <div class="metric-value">${report.call_outs?.length || 0}</div>
              </div>
            </div>
            
            ${report.safety ? `
              <div class="section">
                <div class="section-title">Safety Observations</div>
                <div class="section-content">${report.safety.replace(/\n/g, '<br>')}</div>
              </div>
            ` : ''}
            
            ${report.projects ? `
              <div class="section">
                <div class="section-title">Projects Update</div>
                <div class="section-content">${report.projects.replace(/\n/g, '<br>')}</div>
              </div>
            ` : ''}
            
            ${report.weekly_plan ? `
              <div class="section">
                <div class="section-title">Weekly Maintenance Plan</div>
                <div class="section-content">${report.weekly_plan.replace(/\n/g, '<br>')}</div>
              </div>
            ` : ''}
            
            ${report.call_outs?.length > 0 ? `
              <div class="section">
                <div class="section-title">Emergency Callouts</div>
                <div class="section-content">
                  ${report.call_outs.map((callout, idx) => `
                    <div class="callout-item">
                      <strong>${idx + 1}. ${callout.description}</strong><br>
                      <small>Shift: ${callout.shift} | Duration: ${callout.duration_hours}h | Time: ${callout.start_time || 'N/A'} - ${callout.end_time || 'N/A'}</small>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
            
            ${report.equipment?.length > 0 ? `
              <div class="section">
                <div class="section-title">Equipment Performance</div>
                <table class="equipment-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Equipment</th>
                      <th>Actual</th>
                      <th>Target</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${report.equipment.map(eq => `
                      <tr>
                        <td>${eq.category}</td>
                        <td>${eq.name}</td>
                        <td>${eq.actual || 0}${eq.name === 'Gilberts Dam' ? 'm' : '%'}</td>
                        <td>${eq.target}${eq.name === 'Gilberts Dam' ? 'm' : '%'}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            ` : ''}
            
            ${report.notes ? `
              <div class="section">
                <div class="section-title">Additional Notes</div>
                <div class="section-content">${report.notes.replace(/\n/g, '<br>')}</div>
              </div>
            ` : ''}
          </div>
        `;
      }).join('')}
      
      <div class="footer">
        <p>Confidential - Engineering Operations Department</p>
        <p>Report generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
      </div>
    </body>
    </html>
  `;
  
  return html;
};

export default function EngineeringDashboard() {
  const [isClient, setIsClient] = useState(false);
  const [form, setForm] = useState<ReportForm>(emptyReport());
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("new-report");
  const [selectedReport, setSelectedReport] = useState<DailyReport | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [databaseStatus, setDatabaseStatus] = useState('checking');
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [equipmentPerformanceData, setEquipmentPerformanceData] = useState<EquipmentPerformancePoint[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    avgPlant: 0,
    totalCalloutsHours: 0,
    avgDamLevel: 0,
    totalCallouts: 0,
    avgEquipmentPerformance: 0,
    bestPerformingCategory: '',
    worstPerformingCategory: ''
  });

  const [analyticsFilters, setAnalyticsFilters] = useState<AnalyticsFilters>({
    dateRange: {
      from: subDays(new Date(), 30),
      to: new Date()
    },
    equipmentCategory: 'all',
    specificEquipment: 'all',
    performanceThreshold: 0,
    powerStatus: 'all',
    showTrendLines: true,
    showTargetLine: true,
    groupBy: 'day',
    chartType: 'line',
    viewMode: 'grid',
    compareMode: false,
    comparePeriod: 'previous_week',
    metrics: ['plantAvailability', 'equipmentPerformance', 'damLevel', 'callouts']
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
  const [selectedEquipmentForAnalysis, setSelectedEquipmentForAnalysis] = useState<string[]>([]);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState('excel');
  const [historyViewMode, setHistoryViewMode] = useState('grid');
  const [selectedReports, setSelectedReports] = useState<string[]>([]);
  const [customExportDates, setCustomExportDates] = useState<CustomExportDates>({
    from: subDays(new Date(), 7),
    to: new Date()
  });
  const [selectedExportDates, setSelectedExportDates] = useState<string[]>([]);
  const [calloutDuration, setCalloutDuration] = useState<CalloutDuration>({ start: '08:00', end: '12:00' });

  useEffect(() => {
    setIsClient(true);
    checkDatabase();
    loadReports();
  }, []);

  useEffect(() => {
    if (reports.length > 0) {
      applyAnalyticsFilters();
    }
  }, [analyticsFilters, reports, selectedEquipmentForAnalysis]);

  const checkDatabase = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/daily-reports/health/check`);
      const data = await res.json();
      setDatabaseStatus(data.status);
      
      if (data.status === 'healthy') {
        toast.success(`Database connected. Reports: ${data.report_count || 0}`);
      } else {
        toast.error('Database connection failed');
      }
    } catch (error) {
      setDatabaseStatus('error');
      toast.error('Failed to connect to database');
    }
  };

  const loadReports = async () => {
    try {
      setIsLoading(true);
      
      const params = new URLSearchParams({
        start_date: format(analyticsFilters.dateRange.from, 'yyyy-MM-dd'),
        end_date: format(analyticsFilters.dateRange.to, 'yyyy-MM-dd'),
        limit: '1000'
      });
      
      const res = await fetch(`${API_BASE}/api/daily-reports/?${params}`, {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store'
      });
      
      if (!res.ok) throw new Error('Failed to load reports');
      
      const data = await res.json();
      const dataArray = ensureArray(data);
      setReports(dataArray);
      
      const today = new Date().toISOString().slice(0,10);
      const existing = dataArray.find(r => r.date === today);
      if (existing) toast.info('A report already exists for today');
      
    } catch (error) {
      toast.error('Could not load reports from database');
    } finally {
      setIsLoading(false);
    }
  };

  const applyAnalyticsFilters = () => {
    let filteredReports = [...reports];
    
    filteredReports = filteredReports.filter(report => {
      const reportDate = new Date(report.date);
      return reportDate >= analyticsFilters.dateRange.from && 
             reportDate <= analyticsFilters.dateRange.to;
    });
    
    if (analyticsFilters.equipmentCategory !== 'all') {
      filteredReports = filteredReports.filter(report => 
        report.equipment?.some(eq => eq.category === analyticsFilters.equipmentCategory)
      );
    }
    
    if (analyticsFilters.specificEquipment !== 'all') {
      filteredReports = filteredReports.filter(report => 
        report.equipment?.some(eq => eq.name === analyticsFilters.specificEquipment)
      );
    }
    
    if (analyticsFilters.powerStatus !== 'all') {
      filteredReports = filteredReports.filter(report => 
        report.power_availability === analyticsFilters.powerStatus
      );
    }
    
    if (analyticsFilters.performanceThreshold > 0) {
      filteredReports = filteredReports.filter(report => 
        report.plant_availability_percent >= analyticsFilters.performanceThreshold
      );
    }
    
    const groupedData = groupDataByPeriod(filteredReports);
    calculateStats(filteredReports);
    updateTrendData(groupedData);
    updateEquipmentPerformanceData(filteredReports);
  };

  const groupDataByPeriod = (reports: DailyReport[]) => {
    const groups: Record<string, GroupAccumulator> = {};

    reports.forEach(report => {
      let periodKey: string;
      const date = new Date(report.date);
      
      switch (analyticsFilters.groupBy) {
        case 'week': {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          periodKey = format(weekStart, 'yyyy-MM-dd');
          break;
        }
        case 'month':
          periodKey = format(date, 'yyyy-MM');
          break;
        default:
          periodKey = report.date;
      }
      
      if (!groups[periodKey]) {
        groups[periodKey] = {
          period: periodKey,
          plantAvailability: [],
          damLevels: [],
          callouts: 0,
          equipmentPerformance: []
        };
      }
      
      groups[periodKey].plantAvailability.push(report.plant_availability_percent || 0);
      groups[periodKey].damLevels.push(Math.min(10, Number(report.dam_level) || 0));
      groups[periodKey].callouts += (report.call_outs?.length || 0);
      
      if (report.equipment) {
        report.equipment.forEach(eq => {
          if (analyticsFilters.specificEquipment === 'all' || eq.name === analyticsFilters.specificEquipment) {
            if (selectedEquipmentForAnalysis.length === 0 || selectedEquipmentForAnalysis.includes(eq.name)) {
              groups[periodKey].equipmentPerformance.push(eq.actual || 0);
            }
          }
        });
      }
    });
    
    return Object.values(groups).map(group => ({
      period: group.period,
      plantAvailability: group.plantAvailability.length > 0 
        ? (group.plantAvailability.reduce((a, b) => a + b, 0) / group.plantAvailability.length).toFixed(1)
        : 0,
      damLevel: group.damLevels.length > 0 
        ? (group.damLevels.reduce((a, b) => a + b, 0) / group.damLevels.length).toFixed(1)
        : 0,
      callouts: group.callouts,
      equipmentPerformance: group.equipmentPerformance.length > 0
        ? (group.equipmentPerformance.reduce((a, b) => a + b, 0) / group.equipmentPerformance.length).toFixed(1)
        : 0
    })).sort((a, b) => a.period.localeCompare(b.period));
  };

  const calculateStats = (filteredReports: DailyReport[]) => {
    if (filteredReports.length === 0) {
      setStats({
        total: 0,
        avgPlant: 0,
        totalCalloutsHours: 0,
        avgDamLevel: 0,
        totalCallouts: 0,
        avgEquipmentPerformance: 0,
        bestPerformingCategory: 'N/A',
        worstPerformingCategory: 'N/A'
      });
      return;
    }
    
    const total = filteredReports.length;
    const avgPlant = filteredReports.reduce((sum, report) => 
      sum + (report.plant_availability_percent || 0), 0) / total;
    
    const totalCallouts = filteredReports.reduce((sum, report) => 
      sum + (report.call_outs?.length || 0), 0);
    
    const totalCalloutsHours = filteredReports.reduce((sum, report) => 
      sum + (report.call_outs?.reduce((callSum, call) => callSum + (call.duration_hours || 0), 0) || 0), 0);
    
    const avgDamLevel = filteredReports.reduce((sum, report) => 
      sum + (Math.min(10, parseFloat(String(report.dam_level)) || 0)), 0) / total;
    
    const allEquipment = filteredReports.flatMap(report => report.equipment || []);
    const avgEquipmentPerformance = allEquipment.length > 0
      ? allEquipment.reduce((sum, eq) => sum + (eq.actual || 0), 0) / allEquipment.length
      : 0;
    
    const categoryPerformance: Record<string, CategoryPerformanceEntry> = {};
    filteredReports.forEach(report => {
      report.equipment?.forEach(eq => {
        if (!categoryPerformance[eq.category]) {
          categoryPerformance[eq.category] = { total: 0, count: 0 };
        }
        categoryPerformance[eq.category].total += (eq.actual || 0);
        categoryPerformance[eq.category].count += 1;
      });
    });
    
    const categoryAverages = Object.entries(categoryPerformance).map(([category, data]) => ({
      category,
      average: data.total / data.count
    }));
    
    categoryAverages.sort((a, b) => b.average - a.average);
    
    const bestPerformingCategory = categoryAverages[0]?.category || 'N/A';
    const worstPerformingCategory = categoryAverages[categoryAverages.length - 1]?.category || 'N/A';
    
    setStats({
      total,
      avgPlant,
      totalCalloutsHours,
      avgDamLevel,
      totalCallouts,
      avgEquipmentPerformance,
      bestPerformingCategory,
      worstPerformingCategory
    });
  };

  const updateTrendData = (groupedData: GroupedPeriodData[]) => {
    setTrendData(groupedData.map(data => ({
      period: analyticsFilters.groupBy === 'month' 
        ? format(new Date(data.period + '-01'), 'MMM yyyy')
        : analyticsFilters.groupBy === 'week'
        ? `Week ${format(new Date(data.period), 'w')}`
        : format(new Date(data.period), 'MMM d'),
      date: data.period,
      plantAvailability: parseFloat(String(data.plantAvailability)),
      damLevel: parseFloat(String(data.damLevel)),
      callouts: data.callouts,
      equipmentPerformance: parseFloat(String(data.equipmentPerformance)),
      target: 95,
      damTarget: 5 // 5 meters target
    })));
  };

  const updateEquipmentPerformanceData = (filteredReports: DailyReport[]) => {
    const equipmentMap: Record<string, EquipmentMapEntry> = {};

    filteredReports.forEach(report => {
      report.equipment?.forEach(eq => {
        if (!equipmentMap[eq.name]) {
          equipmentMap[eq.name] = {
            name: eq.name,
            category: eq.category,
            values: [],
            dates: []
          };
        }
        equipmentMap[eq.name].values.push(eq.actual || 0);
        equipmentMap[eq.name].dates.push(report.date);
      });
    });
    
    const performanceData = Object.values(equipmentMap).map(eq => ({
      name: eq.name,
      category: eq.category,
      avgPerformance: eq.values.length > 0 
        ? eq.values.reduce((a, b) => a + b, 0) / eq.values.length 
        : 0,
      minPerformance: eq.values.length > 0 ? Math.min(...eq.values) : 0,
      maxPerformance: eq.values.length > 0 ? Math.max(...eq.values) : 0,
      trend: eq.values.length > 1 
        ? (eq.values[eq.values.length - 1] - eq.values[0]) / eq.values.length 
        : 0
    }));
    
    setEquipmentPerformanceData(performanceData);
  };

  const saveReport = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    
    try {
      if (!form.date) {
        toast.error('Please select a date');
        setIsLoading(false);
        return;
      }
      
      if (!form.plant_availability_percent || Number(form.plant_availability_percent) < 0 || Number(form.plant_availability_percent) > 100) {
        toast.error('Please enter a valid plant availability percentage (0-100)');
        setIsLoading(false);
        return;
      }
      
      const payload = {
        date: form.date,
        safety: form.safety.trim(),
        projects: form.projects.trim(),
        weekly_plan: form.weekly_plan.trim(),
        daily_checks: form.daily_checks.trim(),
        power_availability: form.power_availability,
        dam_level: form.dam_level ? Math.min(10, parseFloat(form.dam_level)) : 0, // Cap at 10m
        plant_availability_percent: Number(form.plant_availability_percent),
        call_outs: form.call_outs.map(co => ({
          ...co,
          duration_hours: Number(co.duration_hours)
        })),
        equipment: form.equipment.map(eq => ({
          name: eq.name,
          target: Number(eq.target),
          actual: eq.actual ? Math.min(eq.name === 'Gilberts Dam' ? 10 : 100, Number(eq.actual)) : null,
          category: eq.category
        })),
        notes: form.notes.trim()
      };
      
      const res = await fetch(`${API_BASE}/api/daily-reports/`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) throw new Error('Save failed');
      
      const savedReport = await res.json();
      
      setReports(prev => {
        const prevArray = ensureArray(prev);
        const filtered = prevArray.filter(r => r.date !== savedReport.date);
        const updated = [savedReport, ...filtered].sort((a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        return updated;
      });
      
      setForm(emptyReport());
      toast.success('Report saved to database!');
      setActiveTab('history');
      
    } catch (error) {
      toast.error('Failed to save report to database');
    } finally {
      setIsLoading(false);
    }
  };

  const addCallout = () => {
    const description = prompt('Enter callout description:');
    if (!description?.trim()) return;
    
    const shift = prompt('Enter shift (day/night):', 'day');
    
    // Calculate duration based on user input times
    const startTime = prompt('Enter start time (HH:MM):', calloutDuration.start) ?? '00:00';
    const endTime = prompt('Enter end time (HH:MM):', calloutDuration.end) ?? '00:00';

    // Calculate duration in hours
    const start = startTime.split(':').map(Number);
    const end = endTime.split(':').map(Number);
    let duration = (end[0] - start[0]) + (end[1] - start[1]) / 60;
    if (duration < 0) duration += 24; // Handle overnight

    const newCallout: Callout = {
      shift: shift === 'night' ? 'night' : 'day',
      description: description.trim(),
      start_time: startTime,
      end_time: endTime,
      duration_hours: Math.max(0, Number(duration.toFixed(1)))
    };
    
    setForm(prev => ({
      ...prev,
      call_outs: [...prev.call_outs, newCallout]
    }));
    
    toast.success('Callout added');
  };

  const updateEquipment = (categoryIndex: number, eqIndex: number, value: string) => {
    const category = EQUIPMENT_CATEGORIES[categoryIndex];
    const equipmentName = category.equipment[eqIndex].name;
    
    setForm(prev => {
      const newEquipment = [...prev.equipment];
      const eqIndex = newEquipment.findIndex(eq => eq.name === equipmentName);
      if (eqIndex !== -1) {
        // For Gilberts Dam, cap at 10m
        if (equipmentName === 'Gilberts Dam') {
          newEquipment[eqIndex] = {
            ...newEquipment[eqIndex],
            actual: Math.max(0, Math.min(10, Number(value) || 0)) // Cap at 10m
          };
        } else {
          newEquipment[eqIndex] = {
            ...newEquipment[eqIndex],
            actual: Math.min(100, Math.max(0, Number(value) || 0))
          };
        }
      }
      return { ...prev, equipment: newEquipment };
    });
  };

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryName)
        ? prev.filter(c => c !== categoryName)
        : [...prev, categoryName]
    );
  };

  const filteredReports = useMemo(() => {
    let filtered = ensureArray(reports);
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(report => 
        report.safety?.toLowerCase().includes(term) ||
        report.projects?.toLowerCase().includes(term) ||
        report.date?.toLowerCase().includes(term) ||
        report.power_availability?.toLowerCase().includes(term) ||
        report.notes?.toLowerCase().includes(term) ||
        report.daily_checks?.toLowerCase().includes(term) ||
        report.weekly_plan?.toLowerCase().includes(term)
      );
    }
    
    filtered.sort((a, b) => {
      let aValue: number;
      let bValue: number;

      switch (sortField) {
        case 'plant_availability':
          aValue = Number(a.plant_availability_percent) || 0;
          bValue = Number(b.plant_availability_percent) || 0;
          break;
        case 'dam_level':
          aValue = Math.min(10, Number(a.dam_level) || 0);
          bValue = Math.min(10, Number(b.dam_level) || 0);
          break;
        case 'callouts':
          aValue = (a.call_outs?.length || 0);
          bValue = (b.call_outs?.length || 0);
          break;
        default:
          aValue = new Date(a.date).getTime();
          bValue = new Date(b.date).getTime();
      }

      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    });
    
    return filtered;
  }, [reports, searchTerm, sortField, sortDirection]);

  const getEquipmentPerformanceData = () => {
    const equipmentMap: Record<string, EquipmentSummaryEntry> = {};
    
    reports.forEach(report => {
      report.equipment?.forEach(eq => {
        if (!equipmentMap[eq.name]) {
          equipmentMap[eq.name] = {
            name: eq.name,
            category: eq.category,
            totalActual: 0,
            totalTarget: 0,
            count: 0
          };
        }
        
        const actual = Number(eq.actual) || 0;
        const target = Number(eq.target) || 100;
        
        equipmentMap[eq.name].totalActual += actual;
        equipmentMap[eq.name].totalTarget += target;
        equipmentMap[eq.name].count += 1;
      });
    });
    
    return Object.values(equipmentMap).map(eq => ({
      name: eq.name,
      category: eq.category,
      avgActual: eq.count > 0 ? eq.totalActual / eq.count : 0,
      avgTarget: eq.count > 0 ? eq.totalTarget / eq.count : 100,
      performance: eq.count > 0 ? (eq.totalActual / eq.totalTarget) * 100 : 0
    }));
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const allEquipmentNames = useMemo(() => {
    const names = new Set<string>();
    EQUIPMENT_CATEGORIES.forEach(category => {
      category.equipment.forEach(eq => names.add(eq.name));
    });
    return Array.from(names).sort();
  }, []);

  const toggleReportExpansion = (reportId: string) => {
    setExpandedReportId(expandedReportId === reportId ? null : reportId);
  };

  const toggleReportSelection = (reportId: string) => {
    setSelectedReports(prev =>
      prev.includes(reportId)
        ? prev.filter(id => id !== reportId)
        : [...prev, reportId]
    );
  };

  // Fixed: Export single report in different formats
  const exportSingleReport = (report: DailyReport, formatType: string) => {
    const reportsToExport = [report];
    
    switch (formatType) {
      case 'pdf': {
        const pdfContent = generatePDFContent(reportsToExport);
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
          toast.error('Please allow popups to generate PDF');
          return;
        }
        printWindow.document.write(pdfContent);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 500);
        toast.success('PDF opened for printing');
        break;
      }
      case 'word': {
        const wordContent = generateDocxContent(reportsToExport);
        exportData(wordContent, `engineering_report_${report.date}.doc`, 'application/msword');
        toast.success('Word document (DOC) downloaded');
        break;
      }
      case 'excel': {
        const headers = ['Date', 'Plant Availability (%)', 'Dam Level (m)', 'Power Status', 'Callouts', 'Safety Notes'];
        const data: Record<string, unknown>[] = reportsToExport.map(r => ({
          'Date': r.date,
          'Plant Availability (%)': r.plant_availability_percent,
          'Dam Level (m)': Math.min(10, Number(r.dam_level) || 0),
          'Power Status': r.power_availability,
          'Callouts': r.call_outs?.length || 0,
          'Safety Notes': r.safety || ''
        }));
        const csvContent = generateCSVContent(data, headers);
        exportData(csvContent, `engineering_report_${report.date}.csv`, 'text/csv;charset=utf-8;');
        toast.success('Excel file (CSV) downloaded');
        break;
      }
      case 'json': {
        const jsonString = JSON.stringify(report, null, 2);
        exportData(jsonString, `engineering_report_${report.date}.json`, 'application/json');
        toast.success('JSON file downloaded');
        break;
      }
    }
  };

  // Fixed: Export selected reports - removed format function conflict
  const exportSelectedReports = (formatType: string) => {
    if (selectedExportDates.length === 0 && selectedReports.length === 0) {
      toast.error('Please select dates or reports to export');
      return;
    }
    
    let reportsToExport;
    if (selectedExportDates.length > 0) {
      reportsToExport = reports.filter(report => 
        selectedExportDates.includes(report.date)
      );
    } else {
      reportsToExport = reports.filter(report => 
        selectedReports.includes(report._id || report.date)
      );
    }
    
    if (reportsToExport.length === 0) {
      toast.error('No reports found for selected dates');
      return;
    }
    
    // Use a different variable name to avoid conflict with format function
    const currentDate = new Date();
    const formattedDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
    
    switch (formatType) {
      case 'pdf':
        const pdfContent = generatePDFContent(reportsToExport);
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
          toast.error('Please allow popups to generate PDF');
          return;
        }
        printWindow.document.write(pdfContent);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 500);
        toast.success('PDF opened for printing');
        break;
        
      case 'word':
        const wordContent = generateDocxContent(reportsToExport);
        exportData(wordContent, `engineering_reports_${formattedDate}.doc`, 'application/msword');
        toast.success('Word document (DOC) downloaded');
        break;
        
      case 'excel':
        const headers = ['Date', 'Plant Availability (%)', 'Dam Level (m)', 'Power Status', 'Callouts', 'Safety Notes'];
        const data = reportsToExport.map(r => ({
          'Date': r.date,
          'Plant Availability (%)': r.plant_availability_percent,
          'Dam Level (m)': Math.min(10, Number(r.dam_level) || 0),
          'Power Status': r.power_availability,
          'Callouts': r.call_outs?.length || 0,
          'Safety Notes': r.safety || ''
        }));
        const csvContent = generateCSVContent(data, headers);
        exportData(csvContent, `engineering_reports_${formattedDate}.csv`, 'text/csv;charset=utf-8;');
        toast.success('Excel file (CSV) downloaded');
        break;
        
      case 'json':
        const jsonString = JSON.stringify(reportsToExport, null, 2);
        exportData(jsonString, `engineering_reports_${formattedDate}.json`, 'application/json');
        toast.success('JSON file downloaded');
        break;
    }
  };

  const renderChart = (title: string, dataKey: string, color: string, showTarget = false, targetValue = 95) => {
    const data = trendData;
    
    const ChartComponent = () => {
      switch (analyticsFilters.chartType) {
        case 'line':
          return (
            <RechartsLineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis 
                dataKey="period" 
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
              />
              <YAxis 
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                tickFormatter={(value) => dataKey === 'damLevel' ? `${value}m` : `${value}%`}
                domain={dataKey === 'damLevel' ? [0, 10] : [0, 100]}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '12px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
                formatter={(value) => [dataKey === 'damLevel' ? `${value}m` : `${value}%`, title]}
                labelFormatter={(label) => `Period: ${label}`}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey={dataKey} 
                name={title}
                stroke={color} 
                strokeWidth={2}
                dot={{ r: 4, strokeWidth: 2, stroke: color, fill: 'white' }}
                activeDot={{ r: 6, fill: color }}
              />
              {showTarget && analyticsFilters.showTargetLine && (
                <ReferenceLine 
                  y={targetValue} 
                  stroke="#94a3b8" 
                  strokeDasharray="5 5"
                  label={{ 
                    value: dataKey === 'damLevel' ? `Target: ${targetValue}m` : `Target: ${targetValue}%`, 
                    position: 'insideTopRight',
                    fill: '#94a3b8',
                    fontSize: 12 
                  }}
                />
              )}
              {analyticsFilters.showTrendLines && (
                <Line 
                  type="linear" 
                  dataKey="target" 
                  name="Target"
                  stroke="#94a3b8" 
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  dot={false}
                />
              )}
            </RechartsLineChart>
          );
        
        case 'bar':
          return (
            <RechartsBarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="period" fontSize={11} tickLine={false} />
              <YAxis 
                fontSize={11} 
                tickLine={false}
                domain={dataKey === 'damLevel' ? [0, 10] : [0, 100]}
              />
              <Tooltip />
              <Legend />
              <Bar 
                dataKey={dataKey} 
                name={title}
                fill={color}
                radius={[4, 4, 0, 0]}
              />
              {showTarget && analyticsFilters.showTargetLine && (
                <ReferenceLine 
                  y={targetValue} 
                  stroke="#94a3b8" 
                  strokeDasharray="5 5"
                />
              )}
            </RechartsBarChart>
          );
        
        case 'area':
          return (
            <RechartsAreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="period" fontSize={11} tickLine={false} />
              <YAxis 
                fontSize={11} 
                tickLine={false}
                domain={dataKey === 'damLevel' ? [0, 10] : [0, 100]}
              />
              <Tooltip />
              <Legend />
              <Area 
                type="monotone" 
                dataKey={dataKey} 
                name={title}
                stroke={color} 
                fill={color}
                fillOpacity={0.3}
              />
              {showTarget && analyticsFilters.showTargetLine && (
                <ReferenceLine 
                  y={targetValue} 
                  stroke="#94a3b8" 
                  strokeDasharray="5 5"
                />
              )}
            </RechartsAreaChart>
          );
        
        case 'pie':
          const pieData = data.slice(-6).map(item => ({
            name: item.period,
            value: item[dataKey]
          }));
          return (
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${dataKey === 'damLevel' ? `${value}m` : `${value}%`}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          );
        
        case 'radar':
          const radarData = data.slice(-8).map(item => ({
            period: item.period,
            [title]: item[dataKey]
          }));
          return (
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="period" />
              <PolarRadiusAxis domain={dataKey === 'damLevel' ? [0, 10] : [0, 100]} />
              <Radar
                name={title}
                dataKey={title}
                stroke={color}
                fill={color}
                fillOpacity={0.6}
              />
              <Legend />
              <Tooltip />
            </RadarChart>
          );
        
        case 'scatter':
          return (
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="period" fontSize={11} tickLine={false} />
              <YAxis 
                fontSize={11} 
                tickLine={false}
                domain={dataKey === 'damLevel' ? [0, 10] : [0, 100]}
              />
              <Tooltip />
              <Legend />
              <Scatter
                name={title}
                dataKey={dataKey}
                fill={color}
              />
            </ScatterChart>
          );
        
        default:
          return (
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="period" fontSize={11} tickLine={false} />
              <YAxis 
                fontSize={11} 
                tickLine={false}
                domain={dataKey === 'damLevel' ? [0, 10] : [0, 100]}
              />
              <Tooltip />
              <Legend />
              <Bar 
                dataKey={dataKey} 
                name={title}
                fill={color}
                radius={[4, 4, 0, 0]}
              />
              <Line 
                type="monotone" 
                dataKey="target" 
                name="Target"
                stroke="#94a3b8" 
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          );
      }
    };
    
    return (
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <ChartComponent />
        </ResponsiveContainer>
      </div>
    );
  };

  // Enhanced Detailed Report View Component with Export Options
  const DetailedReportView = ({ report }: { report: DailyReport }) => {
    const plantPercent = Number(report.plant_availability_percent) || 0;
    
    return (
      <div className="mt-4 animate-in fade-in-50 slide-in-from-top-2 duration-200">
        <Card className="border-2 border-slate-200 shadow-lg">
          <CardContent className="p-0">
            <div className="space-y-6 p-6">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Daily Engineering Report
                    </h3>
                    <p className="text-sm text-slate-600">
                      {format(new Date(report.date), 'EEEE, MMMM d, yyyy')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "font-medium",
                      report.power_availability === 'normal' 
                        ? "border-emerald-200 text-emerald-700 bg-emerald-50" 
                        : report.power_availability === 'low' 
                        ? "border-amber-200 text-amber-700 bg-amber-50" 
                        : "border-red-200 text-red-700 bg-red-50"
                    )}
                  >
                    <Power className="w-3 h-3 mr-1" />
                    {report.power_availability}
                  </Badge>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 px-2">
                        <Download className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => exportSingleReport(report, 'pdf')}>
                        <FileText className="mr-2 h-4 w-4 text-red-600" />
                        Export as PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => exportSingleReport(report, 'word')}>
                        <FileType className="mr-2 h-4 w-4 text-blue-600" />
                        Export as Word (.doc)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => exportSingleReport(report, 'excel')}>
                        <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" />
                        Export as Excel (.csv)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => exportSingleReport(report, 'json')}>
                        <FileCode className="mr-2 h-4 w-4 text-amber-600" />
                        Export as JSON
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-slate-600">Plant Availability</p>
                    <ActivityIcon className="h-4 w-4 text-slate-400" />
                  </div>
                  <p className={cn(
                    "text-xl font-bold",
                    plantPercent >= 95 
                      ? "text-emerald-600" 
                      : plantPercent >= 85 
                      ? "text-amber-600" 
                      : "text-red-600"
                  )}>
                    {plantPercent}%
                  </p>
                  <Progress 
                    value={plantPercent} 
                    className={cn(
                      "h-1.5",
                      plantPercent >= 95 
                        ? "[&>div]:bg-emerald-500" 
                        : plantPercent >= 85 
                        ? "[&>div]:bg-amber-500" 
                        : "[&>div]:bg-red-500"
                    )}
                  />
                </div>

                <div className="space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-slate-600">Dam Level</p>
                    <Droplets className="h-4 w-4 text-blue-400" />
                  </div>
                  <p className="text-xl font-bold text-slate-900">
                    {Math.min(10, Number(report.dam_level) || 0)}m
                  </p>
                  <div className="space-y-1">
                    <Progress 
                      value={(Math.min(10, Number(report.dam_level) || 0) / 10) * 100} 
                      className="h-1.5"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>0m</span>
                      <span className="font-medium">Target: 5m</span>
                      <span>10m</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-slate-600">Callouts</p>
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                  </div>
                  <p className="text-xl font-bold text-slate-900">
                    {report.call_outs?.length || 0}
                  </p>
                  {report.call_outs?.length > 0 && (
                    <p className="text-xs text-slate-600">
                      Total: {report.call_outs.reduce((sum, call) => sum + (call.duration_hours || 0), 0)}h
                    </p>
                  )}
                </div>

                <div className="space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-slate-600">Daily Checks</p>
                    <CheckCheck className={cn(
                      "h-4 w-4",
                      report.daily_checks 
                        ? "text-emerald-400" 
                        : "text-slate-300"
                    )} />
                  </div>
                  <p className="text-xl font-bold text-slate-900">
                    {report.daily_checks ? '✓' : '✗'}
                  </p>
                  <p className="text-xs text-slate-600">
                    {report.daily_checks ? 'Completed' : 'Pending'}
                  </p>
                </div>
              </div>

              {/* Content Sections - Improved Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Left Column */}
                <div className="space-y-4">
                  {report.safety && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-amber-500" />
                        <h4 className="text-sm font-semibold text-slate-900">Safety Observations</h4>
                      </div>
                      <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                          {report.safety}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {report.projects && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <ClipboardList className="h-4 w-4 text-blue-500" />
                        <h4 className="text-sm font-semibold text-slate-900">Projects Update</h4>
                      </div>
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                          {report.projects}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {report.weekly_plan && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-purple-500" />
                        <h4 className="text-sm font-semibold text-slate-900">Weekly Maintenance Plan</h4>
                      </div>
                      <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                        <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                          {report.weekly_plan}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  {/* Callouts */}
                  {report.call_outs?.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        <h4 className="text-sm font-semibold text-slate-900">Emergency Callouts</h4>
                      </div>
                      <div className="space-y-2">
                        {report.call_outs.map((callout, idx) => (
                          <div key={idx} className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-slate-900 mb-1">
                                  {callout.description}
                                </p>
                                <div className="flex items-center gap-3 text-xs text-slate-600">
                                  <Badge variant="outline" className="h-5 text-[10px] px-1.5">
                                    {callout.shift}
                                  </Badge>
                                  <span>{callout.duration_hours}h</span>
                                  {callout.start_time && callout.end_time && (
                                    <span className="text-slate-500">
                                      ({callout.start_time} - {callout.end_time})
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Equipment Summary */}
                  {report.equipment?.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Settings className="h-4 w-4 text-slate-500" />
                        <h4 className="text-sm font-semibold text-slate-900">Equipment Performance</h4>
                      </div>
                      <div className="space-y-2">
                        {EQUIPMENT_CATEGORIES.map(category => {
                          const categoryEquipment = report.equipment.filter(eq => eq.category === category.name);
                          if (categoryEquipment.length === 0) return null;
                          
                          const avgPerformance = categoryEquipment.reduce((sum, eq) => 
                            sum + (Number(eq.actual) || 0), 0) / categoryEquipment.length;
                          
                          return (
                            <div key={category.name} className="p-2 border border-slate-200 rounded-lg">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <div className={`p-1 ${category.color} rounded-md`}>
                                    <category.icon className="h-3 w-3 text-white" />
                                  </div>
                                  <span className="text-xs font-medium text-slate-900">{category.name}</span>
                                </div>
                                <span className={cn(
                                  "text-xs font-semibold",
                                  avgPerformance >= 95 
                                    ? "text-emerald-600" 
                                    : avgPerformance >= 85 
                                    ? "text-amber-600" 
                                    : "text-red-600"
                                )}>
                                  {category.name === 'Water Systems' && categoryEquipment.some(eq => eq.name === 'Gilberts Dam') 
                                    ? `${Math.min(10, avgPerformance).toFixed(1)}m`
                                    : `${avgPerformance.toFixed(1)}%`
                                  }
                                </span>
                              </div>
                              <Progress 
                                value={avgPerformance} 
                                className={cn(
                                  "h-1",
                                  avgPerformance >= 95 
                                    ? "[&>div]:bg-emerald-500" 
                                    : avgPerformance >= 85 
                                    ? "[&>div]:bg-amber-500" 
                                    : "[&>div]:bg-red-500"
                                )}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Additional Notes */}
                  {report.notes && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-slate-500" />
                        <h4 className="text-sm font-semibold text-slate-900">Additional Notes</h4>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                          {report.notes}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs text-slate-500">
                    Report created: {new Date(report.created_at || report.date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => toggleReportExpansion(report._id || report.date)}
                      className="h-8 px-3 text-xs"
                    >
                      <Minimize className="w-3 h-3 mr-1" />
                      Collapse
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  if (!isClient) return null;

  return (
    <PageShell>
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <nav className="flex items-center gap-1.5 text-xs text-[#6B7B8E] mb-2">
              <span>Home</span><ChevronRight className="h-3 w-3" /><span className="text-[#2A4D69] font-medium">Engineering Report</span>
            </nav>
            <h1 className="text-3xl font-bold text-[#2A4D69] font-heading tracking-tight">Engineering Operations</h1>
            <p className="text-[#6B7B8E] mt-1">Monitor equipment performance, callouts, and operational trends.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadReports}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-[#2A4D69] hover:bg-[#1e3a52] text-white shadow-md">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Export Reports</DialogTitle>
                  <DialogDescription>
                    Choose format and select specific dates for export
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  {/* Date Selection Section */}
                  <div className="space-y-4">
                    <Label className="font-medium">Select Dates to Export</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm">Quick Selection</Label>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const last7Days = reports
                                .slice(0, Math.min(7, reports.length))
                                .map(r => r.date);
                              setSelectedExportDates(last7Days);
                            }}
                            className="text-xs"
                          >
                            Last 7 Days
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const now = new Date();
                              const thisMonth = reports
                                .filter(r => {
                                  try {
                                    const reportDate = new Date(r.date);
                                    return reportDate.getMonth() === now.getMonth() &&
                                           reportDate.getFullYear() === now.getFullYear();
                                  } catch {
                                    return false;
                                  }
                                })
                                .map(r => r.date);
                              setSelectedExportDates(thisMonth);
                            }}
                            className="text-xs"
                          >
                            This Month
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedExportDates(reports.map(r => r.date))}
                            className="text-xs"
                          >
                            All Reports
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedExportDates([])}
                            className="text-xs"
                          >
                            Clear Selection
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm">Custom Date Range</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            type="date"
                            value={format(customExportDates.from, 'yyyy-MM-dd')}
                            onChange={(e) => setCustomExportDates(prev => ({
                              ...prev,
                              from: new Date(e.target.value)
                            }))}
                            className="text-sm"
                          />
                          <Input
                            type="date"
                            value={format(customExportDates.to, 'yyyy-MM-dd')}
                            onChange={(e) => setCustomExportDates(prev => ({
                              ...prev,
                              to: new Date(e.target.value)
                            }))}
                            className="text-sm"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const customDates = reports
                              .filter(r => {
                                try {
                                  const reportDate = new Date(r.date);
                                  return reportDate >= customExportDates.from &&
                                         reportDate <= customExportDates.to;
                                } catch {
                                  return false;
                                }
                              })
                              .map(r => r.date);
                            setSelectedExportDates(customDates);
                          }}
                          className="w-full text-xs"
                        >
                          <CalendarPlusIcon className="w-3 h-3 mr-2" />
                          Select Range
                        </Button>
                      </div>
                    </div>
                    
                    {/* Selected Dates Preview */}
                    {selectedExportDates.length > 0 && (
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-blue-900">
                            {selectedExportDates.length} dates selected
                          </span>
                          {selectedExportDates.length > 0 && (
                            <span className="text-xs text-blue-700">
                              {format(new Date(Math.min(...selectedExportDates.map(d => new Date(d).getTime()))), 'MMM d')} - 
                              {format(new Date(Math.max(...selectedExportDates.map(d => new Date(d).getTime()))), 'MMM d')}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-blue-800 max-h-20 overflow-y-auto">
                          {selectedExportDates.sort().slice(0, 10).join(', ')}
                          {selectedExportDates.length > 10 && '...'}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Format Selection */}
                  <div className="space-y-4">
                    <Label className="font-medium">Export Format</Label>
                    <RadioGroup 
                      value={exportFormat} 
                      onValueChange={setExportFormat}
                      className="grid grid-cols-2 gap-3"
                    >
                      <Label className="relative flex flex-col items-center justify-center border-2 rounded-lg p-4 hover:bg-slate-50 cursor-pointer has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50">
                        <RadioGroupItem value="excel" id="excel" className="sr-only" />
                        <FileSpreadsheet className="w-6 h-6 mb-2 text-emerald-600" />
                        <span className="text-sm font-medium">Excel (.csv)</span>
                        <span className="text-xs text-slate-500 mt-1">Spreadsheet format</span>
                      </Label>
                      <Label className="relative flex flex-col items-center justify-center border-2 rounded-lg p-4 hover:bg-slate-50 cursor-pointer has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50">
                        <RadioGroupItem value="pdf" id="pdf" className="sr-only" />
                        <FileText className="w-6 h-6 mb-2 text-red-600" />
                        <span className="text-sm font-medium">PDF</span>
                        <span className="text-xs text-slate-500 mt-1">Print-ready format</span>
                      </Label>
                      <Label className="relative flex flex-col items-center justify-center border-2 rounded-lg p-4 hover:bg-slate-50 cursor-pointer has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50">
                        <RadioGroupItem value="word" id="word" className="sr-only" />
                        <FileType className="w-6 h-6 mb-2 text-blue-600" />
                        <span className="text-sm font-medium">Word (.doc)</span>
                        <span className="text-xs text-slate-500 mt-1">Microsoft Word format</span>
                      </Label>
                      <Label className="relative flex flex-col items-center justify-center border-2 rounded-lg p-4 hover:bg-slate-50 cursor-pointer has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50">
                        <RadioGroupItem value="json" id="json" className="sr-only" />
                        <FileCode className="w-6 h-6 mb-2 text-amber-600" />
                        <span className="text-sm font-medium">JSON</span>
                        <span className="text-xs text-slate-500 mt-1">Data interchange format</span>
                      </Label>
                    </RadioGroup>
                  </div>
                </div>
                <DialogFooter className="gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setExportDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      if (selectedExportDates.length === 0 && selectedReports.length === 0) {
                        toast.error('Please select dates or reports to export');
                        return;
                      }
                      exportSelectedReports(exportFormat);
                      setExportDialogOpen(false);
                    }}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export {exportFormat.toUpperCase()}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Quick Trend Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { 
              title: 'Plant Trend', 
              value: `${stats.avgPlant.toFixed(1)}%`, 
              icon: TrendingUpIcon, 
              color: 'bg-blue-50 border-blue-200 text-blue-600',
              trend: stats.avgPlant >= 95 ? '+2.1%' : '-1.5%',
              description: '7-day average',
              positive: stats.avgPlant >= 95
            },
            { 
              title: 'Equipment', 
              value: `${stats.avgEquipmentPerformance.toFixed(1)}%`, 
              icon: Settings, 
              color: 'bg-emerald-50 border-emerald-200 text-emerald-600',
              trend: stats.avgEquipmentPerformance >= 95 ? '+3.2%' : '-2.3%',
              description: 'Overall performance',
              positive: stats.avgEquipmentPerformance >= 95
            },
            { 
              title: 'Callout Rate', 
              value: `${stats.totalCallouts}`, 
              icon: AlertTriangle, 
              color: 'bg-amber-50 border-amber-200 text-amber-600',
              trend: stats.totalCallouts > 5 ? 'High' : 'Low',
              description: 'Last 30 days',
              positive: stats.totalCallouts <= 5
            },
            { 
              title: 'Dam Level', 
              value: `${Math.min(10, stats.avgDamLevel).toFixed(1)}m`, 
              icon: Droplets, 
              color: 'bg-indigo-50 border-indigo-200 text-indigo-600',
              trend: stats.avgDamLevel >= 4.5 ? 'Good' : 'Low',
              description: 'Target: 5m',
              positive: stats.avgDamLevel >= 4.5
            }
          ].map((stat, idx) => (
            <Card key={idx} className="border-2 hover:shadow-md transition-all duration-200 hover:-translate-y-1">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-600 mb-1 uppercase tracking-wider">{stat.title}</p>
                    <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                  </div>
                  <div className={`p-2.5 rounded-lg border ${stat.color}`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-slate-500">{stat.description}</span>
                  <Badge 
                    variant={stat.positive ? 'default' : 'destructive'} 
                    className="text-xs"
                  >
                    {stat.trend}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-4 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <TabsTrigger 
              value="new-report" 
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-slate-300 rounded-lg font-medium transition-all"
            >
              <FileText className="w-4 h-4 mr-2" />
              New Report
            </TabsTrigger>
            <TabsTrigger 
              value="visualizations" 
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-slate-300 rounded-lg font-medium transition-all"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger 
              value="equipment" 
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-slate-300 rounded-lg font-medium transition-all"
            >
              <Settings className="w-4 h-4 mr-2" />
              Equipment
            </TabsTrigger>
            <TabsTrigger 
              value="history" 
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-slate-300 rounded-lg font-medium transition-all"
            >
              <CalendarDays className="w-4 h-4 mr-2" />
              History ({reports.length})
            </TabsTrigger>
          </TabsList>

          {/* New Report Tab */}
          <TabsContent value="new-report">
            <Card className="border-2 border-slate-200 shadow-lg">
              <CardHeader className="px-6 py-5 border-b-2 border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                <CardTitle className="text-xl font-bold text-slate-900">Create Daily Report</CardTitle>
                <CardDescription className="text-slate-600">Complete today's engineering operations report</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={saveReport} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">Report Date *</Label>
                      <Input
                        type="date"
                        value={form.date}
                        onChange={(e) => setForm(prev => ({ ...prev, date: e.target.value }))}
                        required
                        className="border-slate-300 focus:border-blue-500"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">Plant Availability % *</Label>
                      <div className="flex items-center gap-3">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={form.plant_availability_percent}
                          onChange={(e) => setForm(prev => ({ 
                            ...prev, 
                            plant_availability_percent: e.target.value 
                          }))}
                          required
                          className="border-slate-300 focus:border-blue-500"
                        />
                        <div className="w-24">
                          <Progress value={Number(form.plant_availability_percent)} className="h-2" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">Power Status</Label>
                      <Select
                        value={form.power_availability}
                        onValueChange={(value) => setForm(prev => ({ ...prev, power_availability: value }))}
                      >
                        <SelectTrigger className="border-slate-300 focus:border-blue-500">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="normal" className="text-emerald-600">Normal</SelectItem>
                          <SelectItem value="low" className="text-amber-600">Low Power</SelectItem>
                          <SelectItem value="outage" className="text-red-600">Power Outage</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">Dam Level (m) *</Label>
                      <div className="flex items-center gap-3">
                        <Input
                          value={form.dam_level}
                          onChange={(e) => setForm(prev => ({ 
                            ...prev, 
                            dam_level: Math.min(10, Math.max(0, Number(e.target.value) || 0)).toFixed(1)
                          }))}
                          placeholder="e.g., 5.0"
                          className="border-slate-300 focus:border-blue-500"
                          required
                          type="number"
                          min="0"
                          max="10"
                          step="0.1"
                        />
                        <UITooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-4 h-4 text-slate-400 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Target: 5 meters (Max: 10m)</p>
                          </TooltipContent>
                        </UITooltip>
                      </div>
                      <div className="space-y-1">
                        <Progress 
                          value={(Math.min(10, parseFloat(form.dam_level) || 0) / 10) * 100} 
                          className="h-2"
                        />
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>0m</span>
                          <span className="font-medium">Target: 5m</span>
                          <span>10m (Full)</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">Daily Checks</Label>
                      <Input
                        value={form.daily_checks}
                        onChange={(e) => setForm(prev => ({ ...prev, daily_checks: e.target.value }))}
                        placeholder="Brief summary"
                        className="border-slate-300 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">Safety Observations</Label>
                      <Textarea
                        value={form.safety}
                        onChange={(e) => setForm(prev => ({ ...prev, safety: e.target.value }))}
                        placeholder="Record safety incidents or observations"
                        rows={3}
                        className="border-slate-300 focus:border-blue-500"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">Projects Update</Label>
                      <Textarea
                        value={form.projects}
                        onChange={(e) => setForm(prev => ({ ...prev, projects: e.target.value }))}
                        placeholder="Update on ongoing projects"
                        rows={3}
                        className="border-slate-300 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base font-medium text-slate-900">Call Outs</Label>
                        <p className="text-sm text-slate-500">Record emergency callouts</p>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <div className="flex items-center gap-2">
                          <Label className="text-xs">Time Range:</Label>
                          <Input
                            type="time"
                            value={calloutDuration.start}
                            onChange={(e) => setCalloutDuration(prev => ({ ...prev, start: e.target.value }))}
                            className="w-24 h-8 text-xs"
                          />
                          <span className="text-xs">to</span>
                          <Input
                            type="time"
                            value={calloutDuration.end}
                            onChange={(e) => setCalloutDuration(prev => ({ ...prev, end: e.target.value }))}
                            className="w-24 h-8 text-xs"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addCallout}
                          className="border-slate-300"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Callout
                        </Button>
                      </div>
                    </div>
                    
                    {form.call_outs.length > 0 && (
                      <div className="space-y-2">
                        {form.call_outs.map((callout, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200">
                            <div className="flex items-center gap-3">
                              <Badge variant={callout.shift === 'day' ? 'default' : 'secondary'}>
                                {callout.shift}
                              </Badge>
                              <div>
                                <span className="text-sm font-medium">{callout.description}</span>
                                <div className="text-xs text-slate-600">
                                  {callout.start_time} - {callout.end_time} ({callout.duration_hours}h)
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setForm(prev => ({
                                    ...prev,
                                    call_outs: prev.call_outs.filter((_, i) => i !== index)
                                  }));
                                }}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">Weekly Maintenance Plan</Label>
                      <Textarea
                        value={form.weekly_plan}
                        onChange={(e) => setForm(prev => ({ ...prev, weekly_plan: e.target.value }))}
                        placeholder="This week's maintenance schedule"
                        rows={2}
                        className="border-slate-300 focus:border-blue-500"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">Additional Notes</Label>
                      <Textarea
                        value={form.notes}
                        onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Any additional information"
                        rows={2}
                        className="border-slate-300 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setForm(emptyReport())}
                      disabled={isLoading}
                      className="border-slate-300"
                    >
                      Clear Form
                    </Button>
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                    >
                      {isLoading ? 'Saving...' : 'Save to Database'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Enhanced Visualizations Tab */}
          <TabsContent value="visualizations">
            <div className="space-y-6">
              {/* Enhanced Filter Panel */}
              <Card className="border-2 border-slate-200 shadow-lg">
                <CardHeader className="px-6 py-5 border-b-2 border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                  <CardTitle className="text-lg font-bold text-slate-900">Analytics Dashboard</CardTitle>
                  <CardDescription className="text-slate-600">Customize your analytics view with advanced filters</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    {/* Date Range */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                        <CalendarRangeIcon className="w-4 h-4" />
                        Date Range
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="date"
                          value={format(analyticsFilters.dateRange.from, 'yyyy-MM-dd')}
                          onChange={(e) => setAnalyticsFilters(prev => ({
                            ...prev,
                            dateRange: { ...prev.dateRange, from: new Date(e.target.value) }
                          }))}
                          className="text-sm border-2 border-slate-300 focus:border-blue-500"
                        />
                        <Input
                          type="date"
                          value={format(analyticsFilters.dateRange.to, 'yyyy-MM-dd')}
                          onChange={(e) => setAnalyticsFilters(prev => ({
                            ...prev,
                            dateRange: { ...prev.dateRange, to: new Date(e.target.value) }
                          }))}
                          className="text-sm border-2 border-slate-300 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    {/* Chart Type Selector */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                        <ChartLine className="w-4 h-4" />
                        Chart Type
                      </Label>
                      <Select
                        value={analyticsFilters.chartType}
                        onValueChange={(value) => setAnalyticsFilters(prev => ({ ...prev, chartType: value }))}
                      >
                        <SelectTrigger className="border-2 border-slate-300">
                          <SelectValue placeholder="Select chart type" />
                        </SelectTrigger>
                        <SelectContent>
                          {CHART_TYPES.map(type => {
                            const Icon = type.icon;
                            return (
                              <SelectItem key={type.value} value={type.value} className="flex items-center gap-2">
                                <Icon className="w-4 h-4" />
                                {type.label}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Equipment Selection for Analysis */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                        <GitCompare className="w-4 h-4" />
                        Compare Equipment
                      </Label>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="w-full justify-between border-2 border-slate-300">
                            <span className="truncate">
                              {selectedEquipmentForAnalysis.length === 0 
                                ? 'All Equipment' 
                                : `${selectedEquipmentForAnalysis.length} selected`}
                            </span>
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56">
                          <DropdownMenuLabel>Select Equipment</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuCheckboxItem
                            checked={selectedEquipmentForAnalysis.length === 0}
                            onCheckedChange={() => setSelectedEquipmentForAnalysis([])}
                          >
                            All Equipment
                          </DropdownMenuCheckboxItem>
                          {allEquipmentNames.map(equipment => (
                            <DropdownMenuCheckboxItem
                              key={equipment}
                              checked={selectedEquipmentForAnalysis.includes(equipment)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedEquipmentForAnalysis(prev => [...prev, equipment]);
                                } else {
                                  setSelectedEquipmentForAnalysis(prev => prev.filter(e => e !== equipment));
                                }
                              }}
                            >
                              {equipment}
                            </DropdownMenuCheckboxItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* View Mode Toggle */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                        <LayoutGrid className="w-4 h-4" />
                        View Mode
                      </Label>
                      <div className="flex border-2 border-slate-300 rounded-md overflow-hidden">
                        <Button
                          type="button"
                          variant={analyticsFilters.viewMode === 'grid' ? 'default' : 'ghost'}
                          size="sm"
                          className="flex-1 rounded-none border-r border-slate-300"
                          onClick={() => setAnalyticsFilters(prev => ({ ...prev, viewMode: 'grid' }))}
                        >
                          <Grid3x3 className="w-4 h-4 mr-2" />
                          Grid
                        </Button>
                        <Button
                          type="button"
                          variant={analyticsFilters.viewMode === 'list' ? 'default' : 'ghost'}
                          size="sm"
                          className="flex-1 rounded-none"
                          onClick={() => setAnalyticsFilters(prev => ({ ...prev, viewMode: 'list' }))}
                        >
                          <List className="w-4 h-4 mr-2" />
                          List
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Advanced Filters Row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-4 pt-4 border-t border-slate-200">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-slate-600">Performance Threshold</Label>
                      <div className="flex items-center gap-3">
                        <Slider
                          value={[analyticsFilters.performanceThreshold]}
                          max={100}
                          step={5}
                          onValueChange={([value]) => setAnalyticsFilters(prev => ({ 
                            ...prev, 
                            performanceThreshold: value 
                          }))}
                          className="flex-1"
                        />
                        <span className="text-sm font-medium w-12">
                          {analyticsFilters.performanceThreshold}%
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-slate-600">Group By</Label>
                      <Select
                        value={analyticsFilters.groupBy}
                        onValueChange={(value) => setAnalyticsFilters(prev => ({ ...prev, groupBy: value }))}
                      >
                        <SelectTrigger className="h-9 text-xs border-2 border-slate-300">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="day">Daily</SelectItem>
                          <SelectItem value="week">Weekly</SelectItem>
                          <SelectItem value="month">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-slate-600">Show Target Line</Label>
                      <Switch
                        checked={analyticsFilters.showTargetLine}
                        onCheckedChange={(checked) => 
                          setAnalyticsFilters(prev => ({ ...prev, showTargetLine: checked }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-slate-600">Compare Mode</Label>
                      <Switch
                        checked={analyticsFilters.compareMode}
                        onCheckedChange={(checked) => 
                          setAnalyticsFilters(prev => ({ ...prev, compareMode: checked }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-slate-600">Trend Lines</Label>
                      <Switch
                        checked={analyticsFilters.showTrendLines}
                        onCheckedChange={(checked) => 
                          setAnalyticsFilters(prev => ({ ...prev, showTrendLines: checked }))
                        }
                      />
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setAnalyticsFilters({
                          dateRange: { from: subDays(new Date(), 30), to: new Date() },
                          equipmentCategory: 'all',
                          specificEquipment: 'all',
                          performanceThreshold: 0,
                          powerStatus: 'all',
                          showTrendLines: true,
                          showTargetLine: true,
                          groupBy: 'day',
                          chartType: 'line',
                          viewMode: 'grid',
                          compareMode: false,
                          comparePeriod: 'previous_week',
                          metrics: ['plantAvailability', 'equipmentPerformance', 'damLevel', 'callouts']
                        });
                        setSelectedEquipmentForAnalysis([]);
                      }}
                      className="h-9 border-2 border-slate-300"
                    >
                      <FilterX className="w-4 h-4 mr-2" />
                      Reset All
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Enhanced Stats Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Best Category', value: stats.bestPerformingCategory, icon: TrendingUp, color: 'text-emerald-600' },
                  { label: 'Worst Category', value: stats.worstPerformingCategory, icon: TrendingDown, color: 'text-red-600' },
                  { label: 'Avg Dam Level', value: `${Math.min(10, stats.avgDamLevel).toFixed(1)}m`, icon: Droplets, color: 'text-blue-600' },
                  { label: 'Callout Hours', value: `${stats.totalCalloutsHours.toFixed(1)}h`, icon: Clock, color: 'text-amber-600' }
                ].map((stat, idx) => (
                  <Card key={idx} className="border-2 border-slate-200 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-slate-500">{stat.label}</p>
                          <p className={`text-lg font-bold ${stat.color} mt-1`}>{stat.value}</p>
                        </div>
                        <stat.icon className={`h-8 w-8 ${stat.color} opacity-50`} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Enhanced Charts Grid with New Chart Types */}
              {analyticsFilters.viewMode === 'grid' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Plant Availability Chart */}
                  <Card className="border-2 border-slate-200 shadow-lg">
                    <CardHeader className="pb-3 border-b-2 border-slate-100">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-blue-600" />
                          Plant Availability Trend
                          <Badge variant="outline" className="ml-2 text-xs">
                            {stats.avgPlant.toFixed(1)}% avg
                          </Badge>
                        </CardTitle>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => window.print()}>
                              <Printer className="mr-2 h-4 w-4" />
                              Print Chart
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      {renderChart('Plant Availability', 'plantAvailability', '#3b82f6', true, 95)}
                    </CardContent>
                  </Card>

                  {/* Equipment Performance Chart */}
                  <Card className="border-2 border-slate-200 shadow-lg">
                    <CardHeader className="pb-3 border-b-2 border-slate-100">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                          <ActivitySquare className="w-5 h-5 text-emerald-600" />
                          Equipment Performance
                          <Badge variant="outline" className="ml-2 text-xs">
                            {stats.avgEquipmentPerformance.toFixed(1)}% avg
                          </Badge>
                        </CardTitle>
                        <UITooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Info className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Shows performance for selected equipment</p>
                          </TooltipContent>
                        </UITooltip>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      {renderChart('Equipment Performance', 'equipmentPerformance', '#10b981', true, 95)}
                    </CardContent>
                  </Card>

                  {/* Callouts Distribution Chart */}
                  <Card className="border-2 border-slate-200 shadow-lg">
                    <CardHeader className="pb-3 border-b-2 border-slate-100">
                      <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <AlertOctagon className="w-5 h-5 text-amber-600" />
                        Callouts Distribution
                        <Badge variant="outline" className="ml-2 text-xs">
                          {stats.totalCallouts} total
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      {renderChart('Callouts', 'callouts', '#f59e0b')}
                    </CardContent>
                  </Card>

                  {/* Dam Level Trend Chart */}
                  <Card className="border-2 border-slate-200 shadow-lg">
                    <CardHeader className="pb-3 border-b-2 border-slate-100">
                      <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <Droplets className="w-5 h-5 text-blue-600" />
                        Dam Level Trend
                        <Badge variant="outline" className="ml-2 text-xs">
                          {Math.min(10, stats.avgDamLevel).toFixed(1)}m avg
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      {renderChart('Dam Level', 'damLevel', '#8b5cf6', true, 5)}
                    </CardContent>
                  </Card>
                </div>
              ) : (
                /* List View */
                <div className="space-y-6">
                  {trendData.map((data, index) => (
                    <Card key={index} className="border-2 border-slate-200 shadow-sm">
                      <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-slate-600">Period</p>
                            <p className="text-lg font-bold text-slate-900">{data.period}</p>
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-slate-600">Plant Availability</p>
                            <div className="flex items-center gap-2">
                              <p className="text-lg font-bold text-blue-600">{data.plantAvailability}%</p>
                              <Progress value={data.plantAvailability} className="h-2 flex-1" />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-slate-600">Equipment Performance</p>
                            <div className="flex items-center gap-2">
                              <p className="text-lg font-bold text-emerald-600">{data.equipmentPerformance}%</p>
                              <Progress value={data.equipmentPerformance} className="h-2 flex-1" />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-slate-600">Callouts</p>
                            <p className="text-lg font-bold text-amber-600">{data.callouts}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Equipment Performance Comparison */}
              {selectedEquipmentForAnalysis.length > 0 && (
                <Card className="border-2 border-slate-200 shadow-lg">
                  <CardHeader className="px-6 py-5 border-b-2 border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                    <CardTitle className="text-lg font-bold text-slate-900">Equipment Performance Comparison</CardTitle>
                    <CardDescription className="text-slate-600">
                      Comparing {selectedEquipmentForAnalysis.length} selected equipment items
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsBarChart data={equipmentPerformanceData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis 
                            dataKey="name" 
                            stroke="#64748b"
                            fontSize={11}
                            tickLine={false}
                            angle={-45}
                            textAnchor="end"
                            height={60}
                          />
                          <YAxis 
                            domain={[0, 100]} 
                            stroke="#64748b"
                            fontSize={11}
                            tickLine={false}
                            tickFormatter={(value) => `${value}%`}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'white',
                              border: '1px solid #e2e8f0',
                              borderRadius: '6px',
                              fontSize: '12px'
                            }}
                            formatter={(value) => [`${value}%`, 'Performance']}
                          />
                          <Legend />
                          <Bar 
                            dataKey="avgPerformance" 
                            name="Average Performance"
                            fill="#3b82f6"
                            radius={[4, 4, 0, 0]}
                          />
                          <Bar 
                            dataKey="minPerformance" 
                            name="Minimum Performance"
                            fill="#ef4444"
                            radius={[4, 4, 0, 0]}
                          />
                          <Bar 
                            dataKey="maxPerformance" 
                            name="Maximum Performance"
                            fill="#10b981"
                            radius={[4, 4, 0, 0]}
                          />
                        </RechartsBarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Enhanced Equipment Tab */}
          <TabsContent value="equipment">
            <Card className="border-2 border-slate-200 shadow-lg">
              <CardHeader className="px-6 py-5 border-b-2 border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                <CardTitle className="text-xl font-bold text-slate-900">Equipment Performance Management</CardTitle>
                <CardDescription className="text-slate-600">Set targets and record actual performance for all equipment</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setExpandedCategories(EQUIPMENT_CATEGORIES.map(c => c.name))}
                      className="border-2 border-slate-300"
                    >
                      <Maximize2 className="w-4 h-4 mr-2" />
                      Expand All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setExpandedCategories([])}
                      className="border-2 border-slate-300"
                    >
                      <Minimize2 className="w-4 h-4 mr-2" />
                      Collapse All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setForm(prev => ({
                          ...prev,
                          equipment: prev.equipment.map(eq => ({ 
                            ...eq, 
                            actual: eq.name === 'Gilberts Dam' ? 5 : 100 
                          }))
                        }));
                        toast.success('All equipment set to optimal values');
                      }}
                      className="border-2 border-slate-300"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Set All to Optimal
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const equipmentData = getEquipmentPerformanceData();
                        const csvContent = generateCSVContent(
                          equipmentData,
                          ['Name', 'Category', 'Average Performance (%)', 'Target (%)', 'Performance Ratio (%)']
                        );
                        exportData(csvContent, 'equipment_performance.csv', 'text/csv;charset=utf-8;');
                        toast.success('Equipment data exported as CSV');
                      }}
                      className="border-2 border-slate-300"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export CSV
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {EQUIPMENT_CATEGORIES.map((category, categoryIndex) => {
                      const Icon = category.icon;
                      const isExpanded = expandedCategories.includes(category.name);
                      const categoryEquipment = form.equipment.filter(eq => eq.category === category.name);
                      
                      return (
                        <Card key={category.name} className="border-2 border-slate-200 shadow-sm hover:shadow-md transition-all duration-200">
                          <CardHeader 
                            className="cursor-pointer p-4 hover:bg-slate-50 transition-colors"
                            onClick={() => toggleCategory(category.name)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 ${category.color} rounded-lg shadow-sm`}>
                                  <Icon className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                  <CardTitle className="text-base font-semibold text-slate-900">{category.name}</CardTitle>
                                  <p className="text-sm text-slate-600">{categoryEquipment.length} equipment items</p>
                                </div>
                              </div>
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-slate-500" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-slate-500" />
                              )}
                            </div>
                          </CardHeader>
                          
                          {isExpanded && (
                            <CardContent className="p-4 pt-0">
                              <div className="space-y-3">
                                {category.equipment.map((eq, eqIndex) => {
                                  const formEq = form.equipment.find(e => e.name === eq.name) ?? { ...eq, actual: 0 };
                                  const actual = Number(formEq.actual) || 0;
                                  const target = Number(eq.target) || 100;
                                  const isGilbertsDam = eq.name === 'Gilberts Dam';
                                  const performance = isGilbertsDam ? actual : (actual / target) * 100;
                                  
                                  return (
                                    <div key={eq.name} className="flex items-center justify-between p-3 border-2 border-slate-200 rounded-lg hover:bg-slate-50">
                                      <div className="flex-1">
                                        <p className="font-medium text-sm text-slate-900">{eq.name}</p>
                                        <p className="text-xs text-slate-600">
                                          Target: {isGilbertsDam ? `${target}m` : `${target}%`}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <div className="text-right">
                                          <p className={`text-sm font-bold ${
                                            isGilbertsDam 
                                              ? (actual >= 4.5 ? 'text-emerald-600' : actual >= 4 ? 'text-amber-600' : 'text-red-600')
                                              : (performance >= 95 ? 'text-emerald-600' : 
                                                 performance >= 85 ? 'text-amber-600' : 'text-red-600')
                                          }`}>
                                            {isGilbertsDam ? `${Math.min(10, actual)}m` : `${actual}%`}
                                          </p>
                                          <p className="text-xs text-slate-500">Actual</p>
                                        </div>
                                        {!isGilbertsDam && (
                                          <div className="w-24">
                                            <Progress 
                                              value={actual} 
                                              className={`h-2 ${
                                                performance >= 95 ? '[&>div]:bg-emerald-500' : 
                                                performance >= 85 ? '[&>div]:bg-amber-500' : '[&>div]:bg-red-500'
                                              }`}
                                            />
                                          </div>
                                        )}
                                        <Input
                                          type="number"
                                          min="0"
                                          max={isGilbertsDam ? "10" : "100"}
                                          step={isGilbertsDam ? "0.1" : "1"}
                                          value={actual}
                                          onChange={(e) => updateEquipment(categoryIndex, eqIndex, e.target.value)}
                                          className="w-20 text-center border-2 border-slate-300"
                                          placeholder={isGilbertsDam ? "m" : "%"}
                                        />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </CardContent>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Enhanced History Tab with Grid/List View Toggle */}
          <TabsContent value="history">
            <Card className="border-2 border-slate-200 shadow-lg">
              <CardHeader className="px-6 py-5 border-b-2 border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl font-bold text-slate-900">Report History</CardTitle>
                    <CardDescription className="text-slate-600">View and manage past reports in grid or list view</CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        placeholder="Search reports..."
                        className="pl-10 w-48 border-2 border-slate-300"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    
                    <div className="flex border-2 border-slate-300 rounded-md overflow-hidden">
                      <Button
                        type="button"
                        variant={historyViewMode === 'grid' ? 'default' : 'ghost'}
                        size="sm"
                        className="flex-1 rounded-none border-r border-slate-300"
                        onClick={() => setHistoryViewMode('grid')}
                      >
                        <Grid3x3 className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant={historyViewMode === 'list' ? 'default' : 'ghost'}
                        size="sm"
                        className="flex-1 rounded-none"
                        onClick={() => setHistoryViewMode('list')}
                      >
                        <List className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="border-2 border-slate-300">
                          <Filter className="w-4 h-4 mr-2" />
                          Filter
                          <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                        <DropdownMenuCheckboxItem>Optimal (≥95%)</DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem>Warning (85-94%)</DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem>Critical (≤84%)</DropdownMenuCheckboxItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Filter by Power</DropdownMenuLabel>
                        <DropdownMenuCheckboxItem>Normal</DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem>Low Power</DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem>Outage</DropdownMenuCheckboxItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setExportDialogOpen(true)}
                      className="border-2 border-slate-300"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                    
                    {selectedReports.length > 0 && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Delete ${selectedReports.length} selected reports?`)) {
                            // Implement batch delete
                            toast.info(`Would delete ${selectedReports.length} reports`);
                            setSelectedReports([]);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete ({selectedReports.length})
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {isLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                      <Card key={i} className="border-2 border-slate-200">
                        <CardContent className="p-4">
                          <Skeleton className="h-4 w-1/4 mb-4" />
                          <Skeleton className="h-6 w-3/4 mb-2" />
                          <Skeleton className="h-4 w-full mb-2" />
                          <Skeleton className="h-4 w-2/3" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : filteredReports.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                    <h3 className="text-lg font-bold text-slate-600">No reports found</h3>
                    <p className="text-slate-500 mt-2">Create your first report to get started</p>
                    <Button
                      onClick={() => setActiveTab('new-report')}
                      className="mt-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                    >
                      Create First Report
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* Stats Bar */}
                    <div className="flex items-center justify-between mb-6">
                      <div className="text-sm text-slate-600 flex items-center gap-2">
                        <FolderOpen className="w-4 h-4" />
                        Showing <span className="font-bold">{filteredReports.length}</span> reports
                        {searchTerm && (
                          <span className="text-slate-500"> for "{searchTerm}"</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSort('date')}
                          className="flex items-center gap-1 border-2 border-slate-300"
                        >
                          Date
                          <ArrowUpDown className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSort('plant_availability')}
                          className="flex items-center gap-1 border-2 border-slate-300"
                        >
                          Plant %
                          <ArrowUpDown className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSort('dam_level')}
                          className="flex items-center gap-1 border-2 border-slate-300"
                        >
                          Dam Level
                          <ArrowUpDown className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Grid View */}
                    {historyViewMode === 'grid' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredReports.map((report, index) => {
                          const plantPercent = Number(report.plant_availability_percent) || 0;
                          const status = plantPercent >= 95 ? 'optimal' : plantPercent >= 85 ? 'warning' : 'critical';
                          const statusColors = {
                            optimal: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                            warning: 'bg-amber-100 text-amber-800 border-amber-200',
                            critical: 'bg-red-100 text-red-800 border-red-200'
                          };
                          const isSelected = selectedReports.includes(report._id || report.date);
                          const isExpanded = expandedReportId === (report._id || report.date);
                          
                          return (
                            <div key={index} className="space-y-2">
                              {/* Grid Card */}
                              <Card 
                                className={cn(
                                  "border-2 hover:border-blue-300 hover:shadow-lg transition-all duration-200 hover:-translate-y-1 cursor-pointer",
                                  isSelected ? "border-blue-500 ring-2 ring-blue-200" : "border-slate-200"
                                )}
                              >
                                <CardContent className="p-4">
                                  <div className="space-y-3">
                                    {/* Header with checkbox */}
                                    <div className="flex items-start justify-between">
                                      <div className="flex items-start gap-3">
                                        <Checkbox 
                                          checked={isSelected}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleReportSelection(report._id || report.date);
                                          }}
                                        />
                                        <div>
                                          <p className="text-xs font-medium text-slate-500">{report.date}</p>
                                          <h3 className="text-base font-bold text-slate-900 mt-1">
                                            Daily Engineering Report
                                          </h3>
                                        </div>
                                      </div>
                                      <Badge className={`${statusColors[status]} font-medium border`}>
                                        {status}
                                      </Badge>
                                    </div>

                                    {/* Metrics */}
                                    <div className="grid grid-cols-2 gap-3">
                                      <div className="space-y-1">
                                        <p className="text-xs text-slate-500">Plant %</p>
                                        <div className="flex items-center gap-2">
                                          <span className={`text-lg font-bold ${
                                            plantPercent >= 95 ? 'text-emerald-600' : 
                                            plantPercent >= 85 ? 'text-amber-600' : 'text-red-600'
                                          }`}>
                                            {plantPercent}%
                                          </span>
                                          <Progress value={plantPercent} className="h-2 flex-1" />
                                        </div>
                                      </div>
                                      <div className="space-y-1">
                                        <p className="text-xs text-slate-500">Dam Level</p>
                                        <p className="text-lg font-bold text-slate-900">
                                          {Math.min(10, Number(report.dam_level) || 0)}m
                                        </p>
                                      </div>
                                      <div className="space-y-1">
                                        <p className="text-xs text-slate-500">Callouts</p>
                                        <p className="text-lg font-bold text-amber-600">
                                          {report.call_outs?.length || 0}
                                        </p>
                                      </div>
                                      <div className="space-y-1">
                                        <p className="text-xs text-slate-500">Power</p>
                                        <Badge 
                                          variant="outline" 
                                          className={cn(
                                            "font-medium",
                                            report.power_availability === 'normal' 
                                              ? "border-emerald-200 text-emerald-700" 
                                              : report.power_availability === 'low' 
                                              ? "border-amber-200 text-amber-700" 
                                              : "border-red-200 text-red-700"
                                          )}
                                        >
                                          {report.power_availability}
                                        </Badge>
                                      </div>
                                    </div>

                                    {/* Preview */}
                                    <div className="space-y-2 pt-2 border-t border-slate-200">
                                      <p className="text-xs font-medium text-slate-600">Safety Notes</p>
                                      <p className="text-sm text-slate-700 line-clamp-2">
                                        {report.safety || 'No safety notes recorded'}
                                      </p>
                                    </div>

                                    {/* Action Button */}
                                    <div className="pt-3 border-t border-slate-200">
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                        onClick={() => toggleReportExpansion(report._id || report.date)}
                                      >
                                        <EyeIcon className="w-4 h-4 mr-2" />
                                        View Details
                                        <ChevronRightIcon className="w-4 h-4 ml-auto" />
                                      </Button>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>

                              {/* Expanded Details */}
                              {isExpanded && <DetailedReportView report={report} />}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* List View */
                      <div className="space-y-3">
                        {filteredReports.map((report, index) => {
                          const plantPercent = Number(report.plant_availability_percent) || 0;
                          const status = plantPercent >= 95 ? 'optimal' : plantPercent >= 85 ? 'warning' : 'critical';
                          const statusColors = {
                            optimal: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                            warning: 'bg-amber-100 text-amber-800 border-amber-200',
                            critical: 'bg-red-100 text-red-800 border-red-200'
                          };
                          const isExpanded = expandedReportId === report._id || expandedReportId === report.date;
                          
                          return (
                            <div key={index} className="space-y-2">
                              {/* List view card */}
                              <Card className="border-slate-200 shadow-xs hover:shadow-sm transition-shadow">
                                <CardContent className="p-4">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                      <div className="text-center">
                                        <div className="text-2xl font-bold text-slate-900">{plantPercent}%</div>
                                        <div className="text-xs text-slate-500">Plant</div>
                                      </div>
                                      
                                      <div>
                                        <div className="font-semibold text-slate-900">{report.date}</div>
                                        <div className="text-sm text-slate-600 line-clamp-1 max-w-md">
                                          {report.safety || 'No safety notes'}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                                          <Bell className="w-3 h-3" />
                                          {report.call_outs?.length || 0} callouts • Power: {report.power_availability}
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-3">
                                      <Badge className={`${statusColors[status]} font-medium`}>
                                        {status}
                                      </Badge>
                                      
                                      <div className="flex items-center gap-4">
                                        <div className="text-right">
                                          <div className="text-sm font-medium">{Math.min(10, Number(report.dam_level) || 0)}m</div>
                                          <div className="text-xs text-slate-500">Dam</div>
                                        </div>
                                        
                                        <div className="flex gap-2">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => toggleReportExpansion(report._id || report.date)}
                                            title={isExpanded ? "Collapse Details" : "Expand Details"}
                                            className="hover:bg-slate-100"
                                          >
                                            {isExpanded ? (
                                              <Minimize className="w-4 h-4" />
                                            ) : (
                                              <Maximize className="w-4 h-4" />
                                            )}
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>

                              {/* Expanded details */}
                              {isExpanded && <DetailedReportView report={report} />}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Batch Actions Footer */}
                    {selectedReports.length > 0 && (
                      <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <CheckSquare className="w-5 h-5 text-blue-600" />
                            <span className="font-medium text-blue-900">
                              {selectedReports.length} reports selected
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setExportDialogOpen(true)}
                              className="border-blue-300 text-blue-700"
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Export Selected
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                if (confirm(`Delete ${selectedReports.length} selected reports?`)) {
                                  // Implement batch delete
                                  toast.info(`Would delete ${selectedReports.length} reports`);
                                  setSelectedReports([]);
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Selected
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedReports([])}
                            >
                              Clear Selection
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </PageShell>
  );
}
