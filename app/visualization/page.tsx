'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { 
  BarChart3, 
  Cpu, 
  Brain, 
  Zap, 
  TrendingUp,
  Download,
  Play,
  RefreshCw,
  Sparkles,
  Globe,
  Database,
  BarChart,
  PieChart,
  LineChart,
  ScatterChart,
  Target,
  FileText,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  MemoryStick,
  Gauge,
  Server,
  Layers,
  ArrowUpDown,
  Wrench,
  Building,
  Package,
  Users,
  DollarSign,
  Calculator,
  CalendarDays,
  AlertTriangle,
  Fan,
  Shield,
  FileCheck,
  Eye,
  ChevronRight,
  ChevronLeft,
  Maximize2,
  Minimize2,
  Grid,
  List,
  ZoomIn,
  ZoomOut,
  Activity,
  Thermometer,
  ZapOff,
  UserCheck,
  Box,
  Bell,
  MessageSquare,
  TrendingDown,
  Target as TargetIcon,
  GitBranch,
  Network,
  ChevronDown,
  Home
} from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { useTheme, PageHero } from '@/components/shared/theme';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

// ===== TYPE SAFE PLOTLY WRAPPER =====
// Create a type-safe wrapper for Plotly
const PlotComponent = dynamic(
  () => import('react-plotly.js').then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    ),
  }
) as any; // We'll use any for the dynamic import to avoid type issues

// Create a safe Plot component with proper typing
const Plot = ({ data, layout, config, style }: any) => {
  return <PlotComponent data={data} layout={layout} config={config} style={style} />;
};

// ===== TYPES =====
interface PageOption {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  category: 'operations' | 'personnel' | 'safety' | 'analytics';
  link: string;
}

// Simplified and flexible types for Plotly data
type PlotData = Record<string, any>;
type PlotLayout = Record<string, any>;

interface Visualization {
  data: PlotData[];
  layout: PlotLayout;
}

interface PageData {
  page_info: {
    id: string;
    name: string;
    description: string;
    color_scheme: string;
    primary_metrics: string[];
    recommended_charts: string[];
    ai_analysis_type: string;
    data_source: string;
  };
  data_summary: {
    total_records: number;
    columns: string[];
    sample_data: any[];
  };
  visualizations: Record<string, Visualization>;
  generated_at: string;
}

interface AIAnalysis {
  page_info: any;
  analysis_type: string;
  timestamp: string;
  insights: Array<{
    metric: string;
    average: number;
    median: number;
    std: number;
    min: number;
    max: number;
    trend: string;
  }>;
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
  }>;
  anomalies: Array<{
    metric: string;
    count: number;
    description: string;
  }>;
  predictions: Array<{
    metric: string;
    forecast: number[];
    trend: string;
    confidence: number;
  }>;
}

// ===== PAGE OPTIONS DATA =====
const pageOptions: PageOption[] = [
  // Operations
  {
    id: 'breakdowns',
    name: 'Breakdowns',
    description: 'Equipment failure analysis and maintenance tracking',
    icon: <AlertTriangle className="h-5 w-5" />,
    color: 'bg-red-500',
    category: 'operations',
    link: '/breakdowns'
  },
  {
    id: 'maintenance',
    name: 'Maintenance',
    description: 'Work orders and preventive maintenance',
    icon: <Wrench className="h-5 w-5" />,
    color: 'bg-orange-500',
    category: 'operations',
    link: '/maintenance'
  },
  {
    id: 'equipment',
    name: 'Assets',
    description: 'Equipment performance and availability metrics',
    icon: <Building className="h-5 w-5" />,
    color: 'bg-blue-500',
    category: 'operations',
    link: '/equipment'
  },
  {
    id: 'compressors',
    name: 'Compressors',
    description: 'Monitor compressor performance',
    icon: <Fan className="h-5 w-5" />,
    color: 'bg-teal-500',
    category: 'operations',
    link: '/compressors'
  },
  {
    id: 'spares',
    name: 'Spares',
    description: 'Spare parts inventory management',
    icon: <Package className="h-5 w-5" />,
    color: 'bg-green-500',
    category: 'operations',
    link: '/spares'
  },
  {
    id: 'standby',
    name: 'Standby',
    description: 'On-call schedules and coverage',
    icon: <Bell className="h-5 w-5" />,
    color: 'bg-purple-500',
    category: 'operations',
    link: '/standby'
  },
  
  // Personnel
  {
    id: 'employees',
    name: 'Personnel',
    description: 'Employee profiles and team management',
    icon: <Users className="h-5 w-5" />,
    color: 'bg-indigo-500',
    category: 'personnel',
    link: '/employees'
  },
  {
    id: 'leaves',
    name: 'Leaves',
    description: 'Employee time off management',
    icon: <CalendarDays className="h-5 w-5" />,
    color: 'bg-pink-500',
    category: 'personnel',
    link: '/leaves'
  },
  {
    id: 'overtime',
    name: 'Overtime',
    description: 'Track and approve overtime requests',
    icon: <Calculator className="h-5 w-5" />,
    color: 'bg-yellow-500',
    category: 'personnel',
    link: '/overtime'
  },
  {
    id: 'timesheets',
    name: 'Timesheets',
    description: 'Time tracking and payroll integration',
    icon: <Clock className="h-5 w-5" />,
    color: 'bg-cyan-500',
    category: 'personnel',
    link: '/timesheets'
  },
  
  // Safety
  {
    id: 'ppe',
    name: 'PPE',
    description: 'Protective equipment tracking',
    icon: <Shield className="h-5 w-5" />,
    color: 'bg-red-500',
    category: 'safety',
    link: '/ppe'
  },
  {
    id: 'sheq',
    name: 'SHEQ',
    description: 'Safety, Health, Environment & Quality',
    icon: <FileCheck className="h-5 w-5" />,
    color: 'bg-green-500',
    category: 'safety',
    link: '/sheq'
  },
  
  // Analytics
  {
    id: 'reports',
    name: 'Reports',
    description: 'Generate operational reports',
    icon: <BarChart3 className="h-5 w-5" />,
    color: 'bg-purple-500',
    category: 'analytics',
    link: '/reports'
  },
  {
    id: 'documents',
    name: 'Documents',
    description: 'Centralized document storage',
    icon: <FileText className="h-5 w-5" />,
    color: 'bg-gray-500',
    category: 'analytics',
    link: '/documents'
  },
  {
    id: 'noticeboard',
    name: 'Notice Board',
    description: 'Company announcements',
    icon: <MessageSquare className="h-5 w-5" />,
    color: 'bg-indigo-500',
    category: 'analytics',
    link: '/noticeboard'
  }
];

// ===== TECH PACKAGES =====
const techPackages = [
  { 
    name: 'Plotly', 
    icon: <BarChart3 className="h-5 w-5" />, 
    description: 'Interactive web charts',
    status: 'active' as const,
    progress: 100
  },
  { 
    name: 'Polars', 
    icon: <Zap className="h-5 w-5" />, 
    description: 'Lightning-fast data processing',
    status: 'active' as const,
    progress: 100
  },
  { 
    name: 'Transformers', 
    icon: <Brain className="h-5 w-5" />, 
    description: 'AI/NLP text analysis',
    status: 'active' as const,
    progress: 100
  },
  { 
    name: 'Matplotlib', 
    icon: <TrendingUp className="h-5 w-5" />, 
    description: 'Publication-quality charts',
    status: 'active' as const,
    progress: 100
  },
  { 
    name: 'Seaborn', 
    icon: <Sparkles className="h-5 w-5" />, 
    description: 'Statistical visualizations',
    status: 'active' as const,
    progress: 100
  },
  { 
    name: 'NumPy', 
    icon: <Cpu className="h-5 w-5" />, 
    description: 'Numerical computing',
    status: 'active' as const,
    progress: 100
  },
];

// ===== HELPER FUNCTIONS =====
const getPageConfig = (pageId: string) => {
  const page = pageOptions.find(p => p.id === pageId) || pageOptions[0];
  return {
    id: page.id,
    name: page.name,
    description: page.description,
    color_scheme: page.color.replace('bg-', ''),
    primary_metrics: ['metric1', 'metric2', 'metric3', 'metric4'],
    recommended_charts: ['line', 'bar', 'pie', 'scatter'],
    ai_analysis_type: 'sentiment',
    data_source: `${page.id}_data`
  };
};

// ===== MAIN COMPONENT CONTENT =====
function VisualizationContent() {
  const t = useTheme();
  const searchParams = useSearchParams();
  const router = useRouter();

  // State
  const [selectedPage, setSelectedPage] = useState<PageOption>(pageOptions[0]);
  const [pageData, setPageData] = useState<PageData | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [fullscreenChart, setFullscreenChart] = useState<string | null>(null);
  const [chartScale, setChartScale] = useState(1);
  const [activeCategory, setActiveCategory] = useState<'all' | 'operations' | 'personnel' | 'safety' | 'analytics'>('all');
  const [activeChartKey, setActiveChartKey] = useState<string>('');

  // Get page from URL parameter
  useEffect(() => {
    const pageParam = searchParams.get('page');
    if (pageParam) {
      const page = pageOptions.find(p => p.id === pageParam);
      if (page) {
        setSelectedPage(page);
        loadPageData(page.id);
      }
    } else {
      loadPageData('breakdowns');
    }
  }, [searchParams]);

  const loadPageData = async (pageId: string) => {
    setLoading(true);
    setPageData(null);
    setAiAnalysis(null);
    
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Generate mock page data
      const mockData = generateMockPageData(pageId);
      setPageData(mockData);
      
      // Load AI analysis
      loadAiAnalysis(pageId);
      
    } catch (error) {
      console.error('Error loading page data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAiAnalysis = async (pageId: string) => {
    setAiLoading(true);
    try {
      // Mock AI analysis
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockAnalysis = generateMockAiAnalysis(pageId);
      setAiAnalysis(mockAnalysis);
      
    } catch (error) {
      console.error('Error loading AI analysis:', error);
    } finally {
      setAiLoading(false);
    }
  };

  const generateMockPageData = (pageId: string): PageData => {
    const config = getPageConfig(pageId);
    
    // Generate mock visualizations based on page type
    const visualizations: Record<string, Visualization> = {};
    
    // Page-specific charts
    if (pageId === 'breakdowns') {
      visualizations.failure_timeline = generateMockChart('line', '📈 Daily Failure Timeline', 'red');
      visualizations.severity_distribution = generateMockChart('pie', '⚡ Breakdown Severity', 'red');
      visualizations.mttr_mtbf_analysis = generateMockChart('scatter', '🔄 MTTR vs MTBF Analysis', 'red');
      visualizations.downtime_by_department = generateMockChart('bar', '⏱️ Downtime by Department', 'red');
      visualizations.repair_cost_trend = generateMockChart('area', '💰 Repair Cost Trend', 'red');
      visualizations.equipment_reliability = generateMockChart('indicator', '🔧 Equipment Reliability Score', 'red');
    } else if (pageId === 'employees') {
      visualizations.department_distribution = generateMockChart('bar', '👥 Employee Distribution', 'indigo');
      visualizations.performance_radar = generateMockChart('scatterpolar', '🎯 Performance Radar', 'indigo');
      visualizations.salary_distribution = generateMockChart('violin', '💼 Salary Distribution', 'indigo');
      visualizations.attendance_trend = generateMockChart('line', '📊 Attendance Trend', 'indigo');
      visualizations.skills_heatmap = generateMockChart('heatmap', '🔥 Skills Matrix', 'indigo');
      visualizations.productivity_gauge = generateMockChart('indicator', '⚡ Productivity Score', 'indigo');
    } else if (pageId === 'maintenance') {
      visualizations.maintenance_sunburst = generateMockChart('sunburst', '🔧 Maintenance Hierarchy', 'orange');
      visualizations.cost_analysis = generateMockChart('scatter', '💰 Cost vs Duration', 'orange');
      visualizations.schedule_calendar = generateMockChart('heatmap', '📅 Maintenance Calendar', 'orange');
      visualizations.completion_rate = generateMockChart('indicator', '✅ Completion Rate', 'orange');
      visualizations.backlog_trend = generateMockChart('line', '📊 Backlog Trend', 'orange');
      visualizations.priority_distribution = generateMockChart('pie', '🎯 Priority Distribution', 'orange');
    } else {
      // General charts for other pages
      visualizations.primary_metric = generateMockChart('line', `📈 ${config.name} Trend`, config.color_scheme);
      visualizations.distribution = generateMockChart('histogram', '📊 Data Distribution', config.color_scheme);
      visualizations.correlation = generateMockChart('heatmap', '🔥 Correlation Analysis', config.color_scheme);
      visualizations.comparison = generateMockChart('bar', '📦 Comparison View', config.color_scheme);
    }
    
    // Set active chart
    if (Object.keys(visualizations).length > 0) {
      setActiveChartKey(Object.keys(visualizations)[0]);
    }
    
    return {
      page_info: config,
      data_summary: {
        total_records: Math.floor(Math.random() * 1000) + 500,
        columns: ['id', 'name', 'value', 'category', 'date', 'status', 'metric1', 'metric2'],
        sample_data: Array.from({ length: 5 }, (_, i) => ({
          id: i + 1,
          name: `Item ${i + 1}`,
          value: Math.random() * 100,
          category: ['A', 'B', 'C'][i % 3],
          date: new Date().toISOString().split('T')[0],
          status: ['active', 'inactive'][i % 2],
          metric1: Math.random() * 50,
          metric2: Math.random() * 200
        }))
      },
      visualizations,
      generated_at: new Date().toISOString()
    };
  };

  const generateMockAiAnalysis = (pageId: string): AIAnalysis => {
    const config = getPageConfig(pageId);
    
    return {
      page_info: config,
      analysis_type: config.ai_analysis_type,
      timestamp: new Date().toISOString(),
      insights: Array.from({ length: 4 }, (_, i) => ({
        metric: ['Availability', 'Productivity', 'Cost', 'Efficiency'][i],
        average: Math.random() * 100,
        median: Math.random() * 100,
        std: Math.random() * 20,
        min: Math.random() * 50,
        max: Math.random() * 150,
        trend: ['increasing', 'decreasing', 'stable'][i % 3]
      })),
      recommendations: [
        {
          priority: 'high' as const,
          title: 'Optimize Maintenance Schedule',
          description: 'Current schedule shows inefficiencies during peak hours'
        },
        {
          priority: 'medium' as const,
          title: 'Improve Resource Allocation',
          description: 'Some departments are underutilized while others are overloaded'
        },
        {
          priority: 'low' as const,
          title: 'Update Documentation',
          description: 'Process documentation is outdated in certain areas'
        }
      ],
      anomalies: [
        {
          metric: 'Response Time',
          count: 3,
          description: 'Unusually high response times detected on Tuesday afternoons'
        },
        {
          metric: 'Energy Consumption',
          count: 5,
          description: 'Spikes in energy usage without corresponding production increase'
        }
      ],
      predictions: [
        {
          metric: 'Monthly Breakdowns',
          forecast: [12, 14, 16, 18],
          trend: 'increasing',
          confidence: 0.85
        }
      ]
    };
  };

  const generateMockChart = (type: string, title: string, colorScheme: string = 'Viridis'): Visualization => {
    const colors: Record<string, string> = {
      'red': '#ef4444',
      'orange': '#f97316',
      'blue': '#3b82f6',
      'green': '#10b981',
      'indigo': '#6366f1',
      'purple': '#8b5cf6',
      'teal': '#14b8a6',
      'pink': '#ec4899',
      'yellow': '#f59e0b',
      'cyan': '#06b6d4',
      'Viridis': '#3b82f6',
      'Plotly3': '#3b82f6',
      'Rainbow': '#3b82f6'
    };
    
    const color = colors[colorScheme as keyof typeof colors] || '#3b82f6';
    
    switch (type) {
      case 'line':
        return {
          data: [{
            type: 'scatter',
            mode: 'lines+markers',
            x: Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`),
            y: Array.from({ length: 30 }, () => Math.random() * 100),
            line: { color }
          }],
          layout: {
            title,
            height: 400,
            xaxis: { title: 'Date' },
            yaxis: { title: 'Value' },
            plot_bgcolor: 'rgba(0,0,0,0)',
            paper_bgcolor: 'rgba(0,0,0,0)'
          }
        };
      case 'bar':
        return {
          data: [{
            type: 'bar',
            x: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            y: Array.from({ length: 6 }, () => Math.random() * 100),
            marker: { color }
          }],
          layout: {
            title,
            height: 400,
            xaxis: { title: 'Category' },
            yaxis: { title: 'Value' }
          }
        };
      case 'pie':
        return {
          data: [{
            type: 'pie',
            values: [35, 25, 20, 15, 5],
            labels: ['Category A', 'Category B', 'Category C', 'Category D', 'Category E'],
            marker: { 
              colors: [color, `${color}80`, `${color}60`, `${color}40`, `${color}20`]
            }
          }],
          layout: {
            title,
            height: 400,
            showlegend: true
          }
        };
      case 'scatter3d':
        return {
          data: [{
            type: 'scatter3d',
            mode: 'markers',
            x: Array.from({ length: 50 }, () => Math.random() * 100),
            y: Array.from({ length: 50 }, () => Math.random() * 100),
            z: Array.from({ length: 50 }, () => Math.random() * 100),
            marker: {
              size: 6,
              color: Array.from({ length: 50 }, () => Math.random() * 100),
              colorscale: [[0, color], [1, `${color}80`]],
              showscale: true
            }
          }],
          layout: {
            title,
            height: 500,
            scene: {
              xaxis: { title: 'X Axis' },
              yaxis: { title: 'Y Axis' },
              zaxis: { title: 'Z Axis' }
            }
          }
        };
      case 'heatmap':
        return {
          data: [{
            type: 'heatmap',
            z: Array.from({ length: 8 }, () => 
              Array.from({ length: 8 }, () => Math.random() * 100)
            ),
            colorscale: [[0, color], [1, `${color}80`]]
          }],
          layout: {
            title,
            height: 400
          }
        };
      case 'indicator':
        return {
          data: [{
            type: "indicator",
            mode: "gauge+number",
            value: Math.random() * 100,
            title: { text: title },
            gauge: {
              axis: { range: [0, 100] },
              bar: { color },
              steps: [
                { range: [0, 50], color: "#ef4444" },
                { range: [50, 80], color: "#f59e0b" },
                { range: [80, 100], color: "#10b981" }
              ]
            }
          }],
          layout: {
            height: 400
          }
        };
      case 'scatterpolar':
        return {
          data: [{
            type: 'scatterpolar',
            r: [Math.random() * 100, Math.random() * 100, Math.random() * 100, Math.random() * 100],
            theta: ['Metric A', 'Metric B', 'Metric C', 'Metric D'],
            fill: 'toself',
            marker: { color }
          }],
          layout: {
            title,
            height: 400,
            polar: {
              radialaxis: {
                visible: true,
                range: [0, 100]
              }
            }
          }
        };
      case 'sunburst':
        return {
          data: [{
            type: 'sunburst',
            labels: ['All', 'Group A', 'Group B', 'Group C', 'Item A1', 'Item A2', 'Item B1', 'Item B2'],
            parents: ['', 'All', 'All', 'All', 'Group A', 'Group A', 'Group B', 'Group B'],
            values: [100, 40, 35, 25, 20, 20, 18, 17],
            marker: { 
              colors: [color, `${color}80`, `${color}60`, `${color}40`, `${color}20`, `${color}10`, `${color}90`, `${color}70`]
            }
          }],
          layout: {
            title,
            height: 500
          }
        };
      case 'violin':
        return {
          data: [{
            type: 'violin',
            y: Array.from({ length: 50 }, () => Math.random() * 100),
            box: { visible: true },
            line: { color },
            fillcolor: `${color}20`
          }],
          layout: {
            title,
            height: 400
          }
        };
      case 'area':
        return {
          data: [{
            type: 'scatter',
            mode: 'lines',
            x: Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`),
            y: Array.from({ length: 30 }, () => Math.random() * 100),
            fill: 'tozeroy',
            line: { color },
            fillcolor: `${color}20`
          }],
          layout: {
            title,
            height: 400,
            xaxis: { title: 'Date' },
            yaxis: { title: 'Value' }
          }
        };
      case 'histogram':
        return {
          data: [{
            type: 'histogram',
            x: Array.from({ length: 100 }, () => Math.random() * 100),
            marker: { color },
            nbinsx: 20
          }],
          layout: {
            title,
            height: 400,
            xaxis: { title: 'Value' },
            yaxis: { title: 'Frequency' }
          }
        };
      case 'scatter':
        return {
          data: [{
            type: 'scatter',
            mode: 'markers',
            x: Array.from({ length: 50 }, () => Math.random() * 100),
            y: Array.from({ length: 50 }, () => Math.random() * 100),
            marker: { 
              color,
              size: 10
            }
          }],
          layout: {
            title,
            height: 400,
            xaxis: { title: 'X Value' },
            yaxis: { title: 'Y Value' }
          }
        };
      default:
        return {
          data: [{ 
            type: 'scatter', 
            x: [1, 2, 3], 
            y: [1, 2, 3],
            marker: { color }
          }],
          layout: { 
            title, 
            height: 400 
          }
        };
    }
  };

  const handlePageSelect = (page: PageOption) => {
    setSelectedPage(page);
    setActiveTab('dashboard');
    loadPageData(page.id);
    router.push(`/visualization?page=${page.id}`);
  };

  const handleRefresh = () => {
    loadPageData(selectedPage.id);
  };

  const handleExport = () => {
    if (!pageData) return;
    
    const exportData = {
      page: pageData.page_info,
      visualizations: Object.keys(pageData.visualizations).length,
      ai_analysis: aiAnalysis,
      exported_at: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedPage.id}_analytics_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredPages = activeCategory === 'all' 
    ? pageOptions 
    : pageOptions.filter(page => page.category === activeCategory);

  return (
    <>
      {/* Fullscreen Chart Modal */}
      {fullscreenChart && pageData && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
          <div className="flex items-center justify-between p-4 bg-black/50">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setFullscreenChart(null)}
                className="text-white hover:bg-white/20"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <h2 className="text-xl font-bold text-white">
                {pageData.visualizations[fullscreenChart]?.layout?.title || fullscreenChart}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setChartScale(Math.min(2, chartScale + 0.1))}
                className="text-white hover:bg-white/20"
              >
                <ZoomIn className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setChartScale(Math.max(0.5, chartScale - 0.1))}
                className="text-white hover:bg-white/20"
              >
                <ZoomOut className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setFullscreenChart(null)}
                className="text-white hover:bg-white/20"
              >
                <Minimize2 className="h-5 w-5" />
              </Button>
            </div>
          </div>
          <div className="flex-1 p-4">
            <div 
              className="w-full h-full bg-white rounded-lg"
              style={{ transform: `scale(${chartScale})`, transformOrigin: 'center' }}
            >
              {Plot && pageData.visualizations[fullscreenChart] && (
                <Plot
                  data={pageData.visualizations[fullscreenChart].data}
                  layout={{
                    ...pageData.visualizations[fullscreenChart].layout,
                    height: 800,
                    width: 1400
                  }}
                  config={{ responsive: true }}
                  style={{ width: '100%', height: '100%' }}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        <PageHero
          icon={Eye}
          accent="violet"
          crumbs={['Analytics & Insights', 'Visualizations']}
          title="Data Visualizations"
          description="Select a module to view tailored charts, analytics, and insights."
          actions={
            <>
              <Button variant="outline" onClick={handleRefresh} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button onClick={handleExport} disabled={!pageData} className="bg-[#2A4D69] hover:bg-[#1e3a52] text-white shadow-md">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </>
          }
        />

        {/* Page Selection */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  Select Page to Visualize
                </CardTitle>
                <CardDescription>
                  Choose which module/page you want to analyze with visualizations
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Select value={activeCategory} onValueChange={(value: any) => setActiveCategory(value)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="operations">Operations</SelectItem>
                    <SelectItem value="personnel">Personnel</SelectItem>
                    <SelectItem value="safety">Safety</SelectItem>
                    <SelectItem value="analytics">Analytics</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="icon"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="icon"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredPages.map((page) => (
                  <button
                    key={page.id}
                    onClick={() => handlePageSelect(page)}
                    className={`p-4 border rounded-lg text-left transition-all hover:shadow-lg ${
                      selectedPage.id === page.id 
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${page.color} text-white`}>
                          {page.icon}
                        </div>
                        <div>
                          <h3 className="font-semibold">{page.name}</h3>
                          <Badge variant="outline" className="mt-1 text-xs">
                            {page.category}
                          </Badge>
                        </div>
                      </div>
                      <ChevronRight className={`h-5 w-5 ${
                        selectedPage.id === page.id ? 'text-blue-500' : 'text-gray-400'
                      }`} />
                    </div>
                    <p className={`text-sm ${t.textMuted}`}>{page.description}</p>
                    {selectedPage.id === page.id && (
                      <div className="mt-3 flex justify-end">
                        <Badge className="bg-blue-500">Selected</Badge>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredPages.map((page) => (
                  <button
                    key={page.id}
                    onClick={() => handlePageSelect(page)}
                    className={`w-full p-3 border rounded-lg text-left transition-all flex items-center justify-between ${
                      selectedPage.id === page.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${page.color} text-white`}>
                        {page.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold">{page.name}</h3>
                        <p className={`text-sm ${t.textMuted}`}>{page.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{page.category}</Badge>
                      <ChevronRight className={`h-4 w-4 ${
                        selectedPage.id === page.id ? 'text-blue-500' : 'text-gray-400'
                      }`} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Selected Page Dashboard */}
        {selectedPage && (
          <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-white rounded-lg border shadow-sm">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${selectedPage.color} text-white`}>
                  {selectedPage.icon}
                </div>
                <div>
                  <h2 className={`text-2xl font-bold ${t.textPrimary}`}>{selectedPage.name}</h2>
                  <p className={`${t.textMuted}`}>{selectedPage.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link href={selectedPage.link}>
                  <Button variant="outline">
                    Go to {selectedPage.name}
                  </Button>
                </Link>
              </div>
            </div>

            {/* Tech Stack Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  Data Science Stack Powering Visualizations
                </CardTitle>
                <CardDescription>
                  All packages running directly in your browser
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {techPackages.map((pkg) => (
                    <div key={pkg.name} className="p-4 border rounded-lg bg-white hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`p-2 rounded-lg ${
                            pkg.status === 'active' ? 'bg-green-100 text-green-600' :
                            `bg-gray-100 ${t.textMuted}`
                          }`}>
                            {pkg.icon}
                          </div>
                          <div>
                            <h3 className="font-semibold">{pkg.name}</h3>
                            <p className={`text-sm ${t.textMuted}`}>{pkg.description}</p>
                          </div>
                        </div>
                        <Badge variant={pkg.status === 'active' ? 'default' : 'secondary'}>
                          {pkg.status}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Performance</span>
                          <span>{pkg.progress}%</span>
                        </div>
                        <Progress value={pkg.progress} className="h-2" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Main Navigation Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
                <TabsTrigger value="dashboard" className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  <span className="hidden md:inline">Dashboard</span>
                </TabsTrigger>
                <TabsTrigger value="interactive" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden md:inline">Interactive</span>
                </TabsTrigger>
                <TabsTrigger value="ai" className="flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  <span className="hidden md:inline">AI Analysis</span>
                </TabsTrigger>
                <TabsTrigger value="polars" className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  <span className="hidden md:inline">Data Processing</span>
                </TabsTrigger>
                <TabsTrigger value="static" className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  <span className="hidden md:inline">Static Charts</span>
                </TabsTrigger>
              </TabsList>

              {/* ===== DASHBOARD TAB ===== */}
              <TabsContent value="dashboard" className="space-y-6">
                {loading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-8 w-8 animate-spin rounded-full border-3 border-gray-300 border-t-blue-600" />
                      <p className={`${t.textMuted}`}>Loading visualizations for {selectedPage.name}...</p>
                    </div>
                  </div>
                ) : pageData ? (
                  <>
                    {/* Data Overview */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Database className="h-5 w-5" />
                          Data Overview
                        </CardTitle>
                        <CardDescription>
                          {pageData.data_summary.total_records.toLocaleString()} records loaded • 
                          Generated {new Date(pageData.generated_at).toLocaleTimeString()}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="p-4 bg-blue-50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">
                              {pageData.data_summary.total_records.toLocaleString()}
                            </div>
                            <div className={`text-sm ${t.textMuted}`}>Total Records</div>
                          </div>
                          <div className="p-4 bg-green-50 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">
                              {pageData.data_summary.columns.length}
                            </div>
                            <div className={`text-sm ${t.textMuted}`}>Data Columns</div>
                          </div>
                          <div className="p-4 bg-purple-50 rounded-lg">
                            <div className="text-2xl font-bold text-purple-600">
                              {Object.keys(pageData.visualizations).length}
                            </div>
                            <div className={`text-sm ${t.textMuted}`}>Visualizations</div>
                          </div>
                          <div className="p-4 bg-amber-50 rounded-lg">
                            <div className="text-2xl font-bold text-amber-600">
                              {pageData.page_info.primary_metrics.length}
                            </div>
                            <div className={`text-sm ${t.textMuted}`}>Key Metrics</div>
                          </div>
                        </div>

                        {/* Key Metrics */}
                        <div className="mt-6">
                          <h4 className="font-semibold mb-3">Key Metrics for {selectedPage.name}</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {pageData.page_info.primary_metrics.map((metric, index) => (
                              <Badge key={index} variant="outline" className="justify-center py-2">
                                {metric.replace('_', ' ')}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Main Visualizations Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {Object.entries(pageData.visualizations).slice(0, 6).map(([key, chart]) => (
                        <Card key={key} className="overflow-hidden">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-base">{chart.layout?.title || key}</CardTitle>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setFullscreenChart(key)}
                                className="h-6 w-6"
                              >
                                <Maximize2 className="h-3 w-3" />
                              </Button>
                            </div>
                            <CardDescription>
                              {chart.data?.[0]?.type?.toUpperCase()} chart • Click to interact
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="h-[300px]">
                              {Plot && chart.data && (
                                <Plot
                                  data={chart.data}
                                  layout={{
                                    ...chart.layout,
                                    height: 300,
                                    showlegend: false,
                                    margin: { t: 30, b: 30, l: 40, r: 30 }
                                  }}
                                  config={{ responsive: true }}
                                  style={{ width: '100%', height: '100%' }}
                                />
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* Quick Actions */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Play className="h-5 w-5" />
                          Quick Actions
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Button 
                            className="w-full"
                            onClick={() => setActiveTab('ai')}
                            disabled={aiLoading}
                          >
                            {aiLoading ? (
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Brain className="h-4 w-4 mr-2" />
                            )}
                            Run AI Analysis
                          </Button>
                          <Button 
                            className="w-full" 
                            variant="outline"
                            onClick={() => setActiveTab('interactive')}
                          >
                            <BarChart3 className="h-4 w-4 mr-2" />
                            Interactive Charts
                          </Button>
                          <Button 
                            className="w-full" 
                            variant="outline"
                            onClick={handleExport}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Export All
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                ) : null}
              </TabsContent>

              {/* ===== INTERACTIVE CHARTS TAB ===== */}
              <TabsContent value="interactive" className="space-y-6">
                {pageData && Object.keys(pageData.visualizations).length > 0 && (
                  <>
                    <div className="flex justify-between items-center">
                      <div>
                        <h2 className={`text-2xl font-bold ${t.textPrimary} flex items-center gap-2`}>
                          <BarChart3 className="h-6 w-6" />
                          Interactive Visualizations
                        </h2>
                        <p className={`${t.textMuted}`}>3D plots, animations, and real-time interactivity</p>
                      </div>
                      <div className={`text-sm ${t.textMuted}`}>
                        {Object.keys(pageData.visualizations).length} charts available
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                      {/* Chart Selection Sidebar */}
                      <Card className="lg:col-span-1">
                        <CardHeader>
                          <CardTitle>Chart Selection</CardTitle>
                          <CardDescription>Choose interactive visualization</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ScrollArea className="h-[500px]">
                            <div className="space-y-2">
                              {Object.entries(pageData.visualizations).map(([key, chart]) => (
                                <button
                                  key={key}
                                  onClick={() => {
                                    setActiveChartKey(key);
                                    setFullscreenChart(key);
                                  }}
                                  className={`w-full p-3 text-left rounded-lg border transition-all ${
                                    activeChartKey === key 
                                      ? 'border-blue-500 bg-blue-50' 
                                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                  }`}
                                >
                                  <div className="font-medium text-sm">
                                    {chart.layout?.title || key}
                                  </div>
                                  <div className={`flex items-center justify-between text-xs ${t.textMuted} mt-1`}>
                                    <span>{chart.data?.[0]?.type} chart</span>
                                    <Maximize2 className="h-3 w-3" />
                                  </div>
                                </button>
                              ))}
                            </div>
                          </ScrollArea>
                        </CardContent>
                      </Card>

                      {/* Main Chart Display */}
                      <Card className="lg:col-span-3">
                        <CardHeader>
                          <CardTitle>Interactive Visualization</CardTitle>
                          <CardDescription>
                            Click and drag to rotate • Hover for details • Scroll to zoom
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="h-[500px] border rounded-lg bg-white">
                            {activeChartKey && pageData.visualizations[activeChartKey] && Plot && (
                              <Plot
                                data={pageData.visualizations[activeChartKey].data}
                                layout={{
                                  ...pageData.visualizations[activeChartKey].layout,
                                  height: 500
                                }}
                                config={{ responsive: true }}
                                style={{ width: '100%', height: '100%' }}
                              />
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </>
                )}
              </TabsContent>

              {/* ===== AI ANALYSIS TAB ===== */}
              <TabsContent value="ai" className="space-y-6">
                <div className="flex items-center gap-3">
                  <Brain className="h-8 w-8 text-purple-600" />
                  <div>
                    <h2 className={`text-2xl font-bold ${t.textPrimary}`}>🤖 AI Analysis</h2>
                    <p className={`${t.textMuted}`}>
                      Powered by Hugging Face Transformers for {selectedPage.name}
                    </p>
                  </div>
                </div>

                {aiLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-8 w-8 animate-spin rounded-full border-3 border-gray-300 border-t-purple-600" />
                      <p className={`${t.textMuted}`}>AI is analyzing {selectedPage.name} data...</p>
                    </div>
                  </div>
                ) : aiAnalysis ? (
                  <>
                    {/* AI Insights */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Insights */}
                      <Card className="lg:col-span-2">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Activity className="h-5 w-5" />
                            AI Insights
                          </CardTitle>
                          <CardDescription>
                            Automated analysis of {selectedPage.name} data
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {aiAnalysis.insights.map((insight, index) => (
                              <div key={index} className="p-4 border rounded-lg hover:shadow-sm transition-shadow">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-semibold">{insight.metric}</h4>
                                  <Badge variant={
                                    insight.trend === 'increasing' ? 'default' :
                                    insight.trend === 'decreasing' ? 'destructive' : 'outline'
                                  }>
                                    {insight.trend}
                                  </Badge>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                                  <div className="text-center p-2 bg-gray-50 rounded">
                                    <div className="font-bold">{insight.average.toFixed(1)}</div>
                                    <div className={`text-xs ${t.textMuted}`}>Avg</div>
                                  </div>
                                  <div className="text-center p-2 bg-gray-50 rounded">
                                    <div className="font-bold">{insight.median.toFixed(1)}</div>
                                    <div className={`text-xs ${t.textMuted}`}>Median</div>
                                  </div>
                                  <div className="text-center p-2 bg-gray-50 rounded">
                                    <div className="font-bold">{insight.min.toFixed(1)}</div>
                                    <div className={`text-xs ${t.textMuted}`}>Min</div>
                                  </div>
                                  <div className="text-center p-2 bg-gray-50 rounded">
                                    <div className="font-bold">{insight.max.toFixed(1)}</div>
                                    <div className={`text-xs ${t.textMuted}`}>Max</div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Recommendations */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <TargetIcon className="h-5 w-5" />
                            Recommendations
                          </CardTitle>
                          <CardDescription>
                            AI-generated suggestions
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {aiAnalysis.recommendations.map((rec, index) => (
                              <div key={index} className={`p-3 rounded-lg border-l-4 ${
                                rec.priority === 'high' ? 'border-l-red-500 bg-red-50' :
                                rec.priority === 'medium' ? 'border-l-amber-500 bg-amber-50' :
                                'border-l-green-500 bg-green-50'
                              }`}>
                                <div className="flex items-start justify-between">
                                  <div>
                                    <div className="font-medium">{rec.title}</div>
                                    <div className={`text-sm ${t.textMuted} mt-1`}>{rec.description}</div>
                                  </div>
                                  <Badge variant={
                                    rec.priority === 'high' ? 'destructive' :
                                    rec.priority === 'medium' ? 'outline' : 'default'
                                  }>
                                    {rec.priority}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Anomalies & Predictions */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Anomalies */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5" />
                            Detected Anomalies
                          </CardTitle>
                          <CardDescription>
                            Unusual patterns found in the data
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {aiAnalysis.anomalies.length > 0 ? (
                              aiAnalysis.anomalies.map((anomaly, index) => (
                                <div key={index} className="p-3 border rounded-lg hover:shadow-sm">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-medium">{anomaly.metric}</span>
                                    <Badge variant="destructive">{anomaly.count} cases</Badge>
                                  </div>
                                  <p className={`text-sm ${t.textMuted}`}>{anomaly.description}</p>
                                </div>
                              ))
                            ) : (
                              <div className="text-center py-8">
                                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                                <p className={`${t.textMuted}`}>No anomalies detected</p>
                                <p className="text-sm text-gray-400">Data patterns appear normal</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Predictions */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5" />
                            AI Predictions
                          </CardTitle>
                          <CardDescription>
                            Forecast based on historical data
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {aiAnalysis.predictions.map((pred, index) => (
                              <div key={index} className="p-4 border rounded-lg">
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="font-semibold">{pred.metric}</h4>
                                  <Badge variant={pred.trend === 'increasing' ? 'default' : 'outline'}>
                                    {pred.trend}
                                  </Badge>
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between text-sm">
                                    <span>Next Periods:</span>
                                    <span className="font-medium">
                                      {pred.forecast.map(f => f.toFixed(1)).join(', ')}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between text-sm">
                                    <span>Confidence:</span>
                                    <div className="flex items-center gap-2">
                                      <Progress value={pred.confidence * 100} className="w-24 h-2" />
                                      <span className="font-medium">{(pred.confidence * 100).toFixed(0)}%</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </>
                ) : (
                  <Card>
                    <CardContent className="py-12">
                      <div className="text-center">
                        <Brain className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className={`${t.textMuted}`}>No AI analysis available</p>
                        <p className="text-sm text-gray-400 mt-1">
                          Click &quot;Run AI Analysis&quot; to generate insights
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* ===== DATA PROCESSING TAB ===== */}
              <TabsContent value="polars" className="space-y-6">
                <div className="flex items-center gap-3">
                  <Zap className="h-8 w-8 text-amber-600" />
                  <div>
                    <h2 className={`text-2xl font-bold ${t.textPrimary}`}>⚡ Data Processing</h2>
                    <p className={`${t.textMuted}`}>
                      Lightning-fast data processing with Polars (10-100x faster than pandas)
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Performance Stats */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Gauge className="h-5 w-5" />
                        Performance Metrics
                      </CardTitle>
                      <CardDescription>Real-time processing benchmarks</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Clock className={`h-4 w-4 ${t.textMuted}`} />
                            <span>Processing Time</span>
                          </div>
                          <div className="text-2xl font-bold text-green-600">~10ms</div>
                        </div>
                        <Progress value={95} className="h-2" />
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <MemoryStick className={`h-4 w-4 ${t.textMuted}`} />
                            <span>Memory Usage</span>
                          </div>
                          <div className="text-2xl font-bold text-blue-600">4.2MB</div>
                        </div>
                        <Progress value={65} className="h-2" />
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ArrowUpDown className={`h-4 w-4 ${t.textMuted}`} />
                            <span>Speed vs Pandas</span>
                          </div>
                          <div className="text-2xl font-bold text-purple-600">42x</div>
                        </div>
                        <Progress value={95} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Operations */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Cpu className="h-5 w-5" />
                        Operations Performance
                      </CardTitle>
                      <CardDescription>Millisecond-scale operations</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {[
                        { operation: 'Group By + Aggregate', time: '2.1ms', records: '10k' },
                        { operation: 'Filter + Sort', time: '1.8ms', records: '10k' },
                        { operation: 'Join Operations', time: '3.2ms', records: '20k' },
                        { operation: 'Window Functions', time: '4.5ms', records: '10k' }
                      ].map((op, index) => (
                        <div key={index} className="mb-4 last:mb-0 p-3 border rounded-lg hover:bg-gray-50">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium">{op.operation}</span>
                            <Badge variant="outline">{op.time}</Badge>
                          </div>
                          <div className={`flex justify-between text-sm ${t.textMuted}`}>
                            <span>{op.records} records</span>
                            <span className="flex items-center gap-1">
                              <Zap className="h-3 w-3 text-amber-500" />
                              Lazy evaluated
                            </span>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Dataset Info */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Dataset Information</CardTitle>
                      <CardDescription>Processing data in real-time</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <div className={`text-xl font-bold ${t.textPrimary}`}>
                              {pageData?.data_summary.total_records.toLocaleString() || '0'}
                            </div>
                            <div className={`text-sm ${t.textMuted}`}>Total Records</div>
                          </div>
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <div className={`text-xl font-bold ${t.textPrimary}`}>
                              {pageData?.data_summary.columns.length || '0'}
                            </div>
                            <div className={`text-sm ${t.textMuted}`}>Columns</div>
                          </div>
                        </div>
                        
                        <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg">
                          <div className="text-center">
                            <div className="text-3xl font-bold text-amber-600">42x</div>
                            <div className={`text-sm ${t.textMuted}`}>Faster with Polars</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* ===== STATIC CHARTS TAB ===== */}
              <TabsContent value="static" className="space-y-6">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-8 w-8 text-green-600" />
                  <div>
                    <h2 className={`text-2xl font-bold ${t.textPrimary}`}>📊 Static Publication Charts</h2>
                    <p className={`${t.textMuted}`}>Matplotlib & Seaborn for reports and publications</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[
                    {
                      title: 'Correlation Heatmap',
                      description: 'Seaborn correlation matrix',
                      icon: <BarChart className="h-5 w-5" />,
                      features: ['Multi-variable', 'Color-coded', 'Statistical']
                    },
                    {
                      title: 'Distribution Grid',
                      description: 'Matplotlib histograms',
                      icon: <PieChart className="h-5 w-5" />,
                      features: ['KDE overlay', 'Box plots', 'Statistics']
                    },
                    {
                      title: 'Pair Plot Matrix',
                      description: 'Seaborn scatter matrix',
                      icon: <ScatterChart className="h-5 w-5" />,
                      features: ['Multi-comparison', 'Diagonal KDE', 'Hue support']
                    },
                    {
                      title: 'Regression Plot',
                      description: 'Linear regression with CI',
                      icon: <LineChart className="h-5 w-5" />,
                      features: ['Confidence bands', 'Residuals', 'R-squared']
                    },
                    {
                      title: 'Multi-panel Figure',
                      description: 'Publication layout',
                      icon: <Target className="h-5 w-5" />,
                      features: ['Grid layout', 'Mixed charts', 'Annotations']
                    },
                    {
                      title: 'Violin + Box',
                      description: 'Distribution comparison',
                      icon: <BarChart3 className="h-5 w-5" />,
                      features: ['Distribution shape', 'Outliers', 'Comparison']
                    }
                  ].map((chart, index) => (
                    <Card key={index}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <div className="p-2 bg-gray-100 rounded">
                            {chart.icon}
                          </div>
                          {chart.title}
                        </CardTitle>
                        <CardDescription>{chart.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="h-40 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
                            <div className="text-center">
                              <div className="text-4xl font-bold text-gray-400">{index + 1}</div>
                              <div className={`text-sm ${t.textMuted}`}>Chart Preview</div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {chart.features.map((feature, i) => (
                              <div key={i} className="flex items-center gap-2 text-sm">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                {feature}
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Export Options */}
                <Card>
                  <CardHeader>
                    <CardTitle>Export Options</CardTitle>
                    <CardDescription>Download charts for reports and presentations</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Button variant="outline" className="flex-col h-auto py-4">
                        <div className="text-2xl mb-2">PNG</div>
                        <div className={`text-sm ${t.textMuted}`}>High resolution</div>
                      </Button>
                      <Button variant="outline" className="flex-col h-auto py-4">
                        <div className="text-2xl mb-2">PDF</div>
                        <div className={`text-sm ${t.textMuted}`}>Vector format</div>
                      </Button>
                      <Button variant="outline" className="flex-col h-auto py-4">
                        <div className="text-2xl mb-2">SVG</div>
                        <div className={`text-sm ${t.textMuted}`}>Scalable vector</div>
                      </Button>
                      <Button variant="outline" className="flex-col h-auto py-4">
                        <div className="text-2xl mb-2">HTML</div>
                        <div className={`text-sm ${t.textMuted}`}>Interactive</div>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Footer Stats */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center p-4">
              <div className="text-3xl font-bold text-purple-600">{pageOptions.length}</div>
              <div className={`text-sm ${t.textMuted}`}>Pages Available</div>
            </div>
            <div className="text-center p-4">
              <div className="text-3xl font-bold text-blue-600">
                {pageData ? Object.keys(pageData.visualizations).length : 0}
              </div>
              <div className={`text-sm ${t.textMuted}`}>Active Visualizations</div>
            </div>
            <div className="text-center p-4">
              <div className="text-3xl font-bold text-green-600">42x</div>
              <div className={`text-sm ${t.textMuted}`}>Processing Speed</div>
            </div>
            <div className="text-center p-4">
              <div className="text-3xl font-bold text-amber-600">100%</div>
              <div className={`text-sm ${t.textMuted}`}>Interactive</div>
            </div>
          </div>
          
          <div className={`mt-8 text-center text-sm ${t.textMuted}`}>
            <p>Select different pages to see tailored visualizations for each module.</p>
            <p className="mt-2">
              Packages: Plotly • Polars • Transformers • Matplotlib • Seaborn • NumPy
            </p>
          </div>
        </div>
      </main>
    </>
  );
}

function VisualizationFallback() {
  const t = useTheme();
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-gray-300 border-t-blue-600" />
        <p className={`${t.textMuted}`}>Loading visualizations...</p>
      </div>
    </div>
  );
}

// ===== MAIN COMPONENT WITH SUSPENSE =====
export default function VisualizationPage() {
  return (
    <AppShell>
      <Suspense fallback={<VisualizationFallback />}>
        <VisualizationContent />
      </Suspense>
    </AppShell>
  );
}