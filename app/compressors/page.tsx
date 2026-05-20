// app/compressors/page.tsx
// Complete Compressor Tracking System Frontend with All Features

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  Calendar,
  Download,
  ChevronLeft,
  ChevronRight,
  Settings,
  Filter,
  Search,
  BarChart3,
  Moon,
  Sun,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Gauge,
  Power,
  Activity,
  FileText,
  Plus,
  Trash2,
  List,
  Grid,
  Wrench,
  Calculator,
  TrendingDown,
  AlertCircle,
  CheckCheck,
  Timer,
  CalendarClock,
  RotateCcw,
  Save,
  Upload,
  ChevronDown,
  ChevronUp,
  Copy,
  Loader2,
  RefreshCw,
  Eye,
  EyeOff,
  Zap,
  Thermometer,
  Gauge as GaugeIcon,
  PieChart,
  LineChart,
  Target,
  Users,
  Building,
  Factory,
  Package,
  Truck,
  Cpu,
  Server,
  Database,
  HardDrive,
  Shield,
  Bell,
  BellOff,
  Settings as SettingsIcon,
  User,
  Mail,
  Phone,
  MapPin,
  Info,
  HelpCircle,
  ExternalLink,
  MoreVertical,
  Edit,
  Archive,
  PowerOff,
  Play,
  Pause,
  StopCircle,
  AlertOctagon,
  Battery,
  BatteryCharging,
  BatteryFull,
  BatteryLow,
  BatteryMedium,
  Cloud,
  CloudOff,
  Wifi,
  WifiOff,
  Bluetooth,
  Signal,
  SignalHigh,
  SignalLow,
  SignalMedium,
  SignalZero,
  Star,
  StarHalf,
  Award,
  Trophy,
  Crown,
  Medal,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  DollarSign,
  CreditCard,
  Wallet,
  Banknote,
  Coins,
  PiggyBank,
  Receipt,
  FileBarChart,
  FileSpreadsheet,
  FileCode,
  FileDigit,
  FileArchive,
  FileImage,
  FileVideo,
  FileAudio,
  File
  //ChevronRight
} from 'lucide-react';
import { PageShell } from '@/components/PageShell';

// ─── TypeScript interfaces ────────────────────────────────────────────────────

interface Compressor {
  id: number;
  name: string;
  model: string;
  capacity: string;
  location: string;
  status: string;
  total_running_hours: number;
  total_loaded_hours: number;
  color?: string;
  initial_total_running?: number;
  initial_total_loaded?: number;
}

interface CompressorInput {
  totalRunning: number;
  totalLoaded: number;
  pressure: number | string;
  temperature: number | string;
  notes: string;
}

interface PreviousReading {
  total_running_hours: number;
  total_loaded_hours: number;
  date: string;
}

interface IsSaving {
  type?: string;
  id?: number | string;
}

interface UpcomingService {
  compressor_id: number;
  compressor_name: string;
  service_interval: number;
  current_hours: number;
  next_service_hours: number;
  hours_remaining: number;
  days_remaining: number;
  urgency: string;
}

interface PerformanceMetric {
  compressor_id: number;
  compressor_name: string;
  avg_efficiency: number;
  avg_daily_running_hours: number;
  avg_daily_loaded_hours: number;
  total_running_hours: number;
  total_loaded_hours: number;
  downtime_percentage: number;
  service_count: number;
}

interface TrendDataItem {
  compressor_name: string;
  efficiency_trend: string;
  avg_efficiency: number;
  total_running_hours?: number;
  total_loaded_hours?: number;
}

interface TrendsResult {
  success: boolean;
  data: TrendDataItem[];
  message: string;
  has_data: boolean;
}

interface ComparisonItem {
  compressor_id: number;
  compressor_name: string;
  location: string;
  value: number;
  rating: string;
}

interface ComparisonResult {
  success: boolean;
  data: ComparisonItem[];
  message: string;
  count: number;
}

interface AnalyticsData {
  performanceMetrics: PerformanceMetric[];
  trends: TrendsResult;
  comparison: ComparisonResult;
}

interface CompressorStats {
  total_compressors: number;
  total_running_hours?: number;
  avg_efficiency: number;
  upcoming_services: number;
  urgent_alerts: number;
  active_compressors: number;
}

interface RecentAlert {
  id: number;
  title: string;
  message: string;
  severity: string;
  is_read: boolean;
  created_at: string;
}

interface RecentService {
  id: number;
  service_type: string;
  description: string;
  service_date: string;
  running_hours_at_service: number;
}

interface AgeDistribution {
  less_than_year?: number;
  "1_3_years"?: number;
  "3_5_years"?: number;
  more_than_5?: number;
}

interface ManagementSummary {
  status_distribution: Record<string, number>;
  location_distribution: Record<string, number>;
  age_distribution: AgeDistribution;
  total_compressors: number;
  unread_alerts?: number;
  recent_alerts?: RecentAlert[];
  recent_services?: RecentService[];
}

interface ManagementData {
  summary: ManagementSummary | null;
  alerts: RecentAlert[];
  services: RecentService[];
}

interface AppSettings {
  darkMode: boolean;
  showInactive: boolean;
  showDailyHours: boolean;
  notifyMaintenance: boolean;
  maintenanceBufferDays: number;
  defaultOperatingHours: number;
}

interface Filters {
  location: string;
  status: string;
  search: string;
  showMaintenance: boolean;
}

interface StatusDialogState {
  open: boolean;
  compressorId: number | null;
  currentStatus: string;
}

interface AddCompressorFormData {
  name: string;
  model: string;
  capacity: string;
  location: string;
  status: string;
  total_running_hours: number;
  total_loaded_hours: number;
  color: string;
}

// ─────────────────────────────────────────────────────────────────────────────

// API Configuration - Use relative URL for same-origin or full URL for different origin
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 
  (typeof window !== 'undefined' && window.location.origin.includes('localhost:3000') 
    ? 'http://localhost:8000' 
    : '/api');

// Service intervals in hours
const SERVICE_INTERVALS = [1000, 2000, 4000, 8000, 16000];

// Status types
const STATUS_TYPES = {
  RUNNING: 'running',
  STANDBY: 'standby',
  MAINTENANCE: 'maintenance',
  OFFLINE: 'offline'
};

const STATUS_CONFIG = {
  [STATUS_TYPES.RUNNING]: { label: 'Running', color: 'bg-green-100 text-green-800', icon: Activity },
  [STATUS_TYPES.STANDBY]: { label: 'Standby', color: 'bg-blue-100 text-blue-800', icon: Power },
  [STATUS_TYPES.MAINTENANCE]: { label: 'Maintenance', color: 'bg-orange-100 text-orange-800', icon: AlertTriangle },
  [STATUS_TYPES.OFFLINE]: { label: 'Offline', color: 'bg-red-100 text-red-800', icon: XCircle }
};

// Location options
const LOCATIONS = ['Main Plant', 'Production', 'Auxiliary', 'Workshop', 'Storage', 'Packaging', 'Shipping', 'Receiving'];

// Enhanced fetch utility with better error handling
const enhancedFetch = async (url: string, options: RequestInit = {}): Promise<unknown> => {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> | undefined),
      },
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();

        // Extract user-friendly error message
        if (errorData.detail) {
          // For FastAPI errors, detail field contains the error
          errorMessage = errorData.detail;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else {
          errorMessage = `HTTP ${response.status}: ${JSON.stringify(errorData)}`;
        }
      } catch (e) {
        // If response is not JSON, use status text
        errorMessage = response.statusText || errorMessage;
      }

      // Check for specific constraint violations
      if (errorMessage.includes('violates check constraint') ||
          errorMessage.includes('chk_daily_loaded_positive')) {
        throw new Error('Invalid data: Loaded hours must be positive and cannot exceed running hours. Please check your values.');
      } else if (errorMessage.includes('violates check constraint')) {
        throw new Error('Invalid data entered. Please check your input values.');
      }

      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    const err = error as Error;
    console.error(`Fetch error for ${url}:`, err);

    // Provide user-friendly error messages
    let userErrorMessage = err.message;

    if (err.message.includes('Failed to fetch')) {
      userErrorMessage = 'Cannot connect to the server. Please check your connection.';
    } else if (err.message.includes('violates check constraint')) {
      userErrorMessage = 'Invalid data: Please check that loaded hours do not exceed running hours and all values are positive.';
    } else if (err.message.includes('chk_daily_loaded_positive')) {
      userErrorMessage = 'Data validation error: Loaded hours must be positive and cannot exceed running hours.';
    }

    throw new Error(userErrorMessage);
  }
};

const CompressorReadingsSystem = () => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [compressors, setCompressors] = useState<Compressor[]>([]);
  const [dailyEntries, setDailyEntries] = useState<Record<string, unknown>>({});
  const [activeTab, setActiveTab] = useState<string>('daily-view');
  const [viewMode, setViewMode] = useState<string>('card');
  const [settings, setSettings] = useState<AppSettings>({
    darkMode: false,
    showInactive: true,
    showDailyHours: true,
    notifyMaintenance: true,
    maintenanceBufferDays: 7,
    defaultOperatingHours: 8
  });
  const [filters, setFilters] = useState<Filters>({
    location: 'all',
    status: 'all',
    search: '',
    showMaintenance: false
  });
  const [expandedCompressor, setExpandedCompressor] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<IsSaving>({});
  const [selectedCompressor, setSelectedCompressor] = useState<Compressor | null>(null);
  const [stats, setStats] = useState<CompressorStats | null>(null);
  const [upcomingServices, setUpcomingServices] = useState<UpcomingService[]>([]);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    performanceMetrics: [],
    trends: { success: false, data: [], message: '', has_data: false },
    comparison: { success: false, data: [], message: '', count: 0 }
  });
  const [managementData, setManagementData] = useState<ManagementData>({
    summary: null,
    alerts: [],
    services: []
  });
  const [analyticsPeriod, setAnalyticsPeriod] = useState<string>('monthly');
  const [analyticsMetric, setAnalyticsMetric] = useState<string>('efficiency');
  const [showAddCompressor, setShowAddCompressor] = useState<boolean>(false);
  const [compressorInputs, setCompressorInputs] = useState<Record<number, CompressorInput>>({});
  const [statusUpdateDialog, setStatusUpdateDialog] = useState<StatusDialogState>({ open: false, compressorId: null, currentStatus: '' });
  const [connectionError, setConnectionError] = useState<boolean>(false);
  const [previousReadings, setPreviousReadings] = useState<Record<number, PreviousReading>>({});

  // Load all data on component mount
  useEffect(() => {
    loadAllData();
  }, []);

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('compressor-settings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('compressor-settings', JSON.stringify(settings));
  }, [settings]);

  // Initialize compressor inputs
  useEffect(() => {
    if (compressors.length > 0) {
      const inputs: Record<number, CompressorInput> = {};
      compressors.forEach(compressor => {
        inputs[compressor.id] = {
          totalRunning: compressor.total_running_hours || 0,
          totalLoaded: compressor.total_loaded_hours || 0,
          pressure: 0,
          temperature: 0,
          notes: ''
        };
      });
      setCompressorInputs(inputs);
    }
  }, [compressors]);

  // Test API connection
  const testConnection = async (): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/compressors/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      return response.ok;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  };

  // Load all data from API
  const loadAllData = async () => {
    try {
      setIsLoading(true);
      setConnectionError(false);
      
      // Test connection first
      const isConnected = await testConnection();
      if (!isConnected) {
        setConnectionError(true);
        toast.error('Cannot connect to server. Please ensure the backend is running.');
        return;
      }

      await Promise.all([
        fetchCompressors(),
        fetchStats(),
        fetchUpcomingServices(),
        fetchPerformanceMetrics(),
        fetchTrendAnalysis(),
        fetchComparisonAnalytics(),
        fetchManagementSummary()
      ]);
      toast.success('Data refreshed successfully');
    } catch (error) {
      console.error('Failed to load data:', error as Error);
      setConnectionError(true);
      toast.error('Failed to load data from server. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch compressors from API
  const fetchCompressors = async () => {
    try {
      console.log('Fetching compressors from:', `${API_BASE_URL}/api/compressors/compressors`);
      const data = (await enhancedFetch(`${API_BASE_URL}/api/compressors/compressors`)) as Compressor[];
      setCompressors(data || []);

      // Fetch previous readings for each compressor
      const previousReadingsData: Record<number, PreviousReading> = {};
      for (const compressor of data || []) {
        try {
          const readings = (await enhancedFetch(`${API_BASE_URL}/api/compressors/readings/${compressor.id}/detailed`)) as { data?: Array<{ date: string; total_running_hours: number; total_loaded_hours: number }> };
          if (readings.data && readings.data.length > 0) {
            // Get the reading before current date
            const currentDateStr = currentDate.toISOString().split('T')[0];
            const previousReading = readings.data
              .filter((r) => r.date < currentDateStr)
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

            if (previousReading) {
              previousReadingsData[compressor.id] = {
                total_running_hours: previousReading.total_running_hours,
                total_loaded_hours: previousReading.total_loaded_hours,
                date: previousReading.date
              };
            } else {
              // Use compressor initial totals
              previousReadingsData[compressor.id] = {
                total_running_hours: compressor.initial_total_running || 0,
                total_loaded_hours: compressor.initial_total_loaded || 0,
                date: 'Initial'
              };
            }
          }
        } catch (error) {
          console.error(`Error fetching readings for compressor ${compressor.id}:`, error);
        }
      }
      setPreviousReadings(previousReadingsData);
    } catch (error) {
      console.error('Error fetching compressors:', error);
      setCompressors([]);
      throw error;
    }
  };

  // Fetch statistics from API
  const fetchStats = async () => {
    try {
      const data = (await enhancedFetch(`${API_BASE_URL}/api/compressors/stats`)) as CompressorStats;
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStats(null);
    }
  };

  // Fetch upcoming services from API
  const fetchUpcomingServices = async () => {
    try {
      const data = (await enhancedFetch(`${API_BASE_URL}/api/compressors/service-due`)) as UpcomingService[];
      setUpcomingServices(data || []);
    } catch (error) {
      console.error('Error fetching services:', error);
      setUpcomingServices([]);
    }
  };

  // Fetch performance metrics
  const fetchPerformanceMetrics = async (periodDays = 30) => {
    try {
      const data = (await enhancedFetch(`${API_BASE_URL}/api/compressors/analytics/performance-metrics?period_days=${periodDays}`)) as PerformanceMetric[];
      setAnalyticsData(prev => ({ ...prev, performanceMetrics: data || [] }));
    } catch (error) {
      console.error('Error fetching performance metrics:', error);
      setAnalyticsData(prev => ({ ...prev, performanceMetrics: [] }));
    }
  };

  // Fetch trend analysis
  const fetchTrendAnalysis = async (period = 'monthly') => {
    try {
      const data = (await enhancedFetch(`${API_BASE_URL}/api/compressors/analytics/trends?period=${period}`)) as TrendsResult;
      setAnalyticsData(prev => ({
        ...prev,
        trends: data || { success: false, data: [], message: 'No data', has_data: false }
      }));
    } catch (error) {
      const err = error as Error;
      console.error('Error fetching trends:', err);
      setAnalyticsData(prev => ({
        ...prev,
        trends: { success: false, data: [], message: err.message, has_data: false }
      }));
    }
  };

  // Fetch comparison analytics
  const fetchComparisonAnalytics = async (metric = 'efficiency') => {
    try {
      const data = (await enhancedFetch(`${API_BASE_URL}/api/compressors/analytics/comparison?metric=${metric}`)) as ComparisonResult;
      setAnalyticsData(prev => ({
        ...prev,
        comparison: data || { success: false, data: [], message: 'No data', count: 0 }
      }));
    } catch (error) {
      const err = error as Error;
      console.error('Error fetching comparison:', err);
      setAnalyticsData(prev => ({
        ...prev,
        comparison: { success: false, data: [], message: err.message, count: 0 }
      }));
    }
  };

  // Fetch management summary
  const fetchManagementSummary = async () => {
    try {
      const data = (await enhancedFetch(`${API_BASE_URL}/api/compressors/management/summary`)) as ManagementSummary;
      setManagementData(prev => ({ ...prev, summary: data }));
    } catch (error) {
      console.error('Error fetching management summary:', error);
      setManagementData(prev => ({ ...prev, summary: null }));
    }
  };

  // Get current date string
  const getCurrentDateStr = useCallback(() => {
    return currentDate.toISOString().split('T')[0];
  }, [currentDate]);

  // Navigate dates
  const previousDay = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() - 1);
      return newDate;
    });
  };

  const nextDay = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + 1);
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Calculate efficiency
  const calculateEfficiency = useCallback((runningHours: number, loadedHours: number) => {
    if (!runningHours || runningHours === 0) return 0;
    return parseFloat(((loadedHours / runningHours) * 100).toFixed(1));
  }, []);

  // Calculate next service information
  const calculateNextService = useCallback((totalRunningHours: number) => {
    const nextIntervals = SERVICE_INTERVALS.filter(interval => interval > totalRunningHours);
    if (nextIntervals.length === 0) return null;
    
    const nextService = nextIntervals[0];
    const hoursRemaining = nextService - totalRunningHours;
    const daysRemaining = Math.ceil(hoursRemaining / settings.defaultOperatingHours);
    
    // Determine urgency
    let urgency = 'low';
    if (daysRemaining <= 0) urgency = 'critical';
    else if (daysRemaining <= 7) urgency = 'high';
    else if (daysRemaining <= 30) urgency = 'medium';
    
    let color = 'text-green-600 bg-green-100';
    if (urgency === 'critical') color = 'text-red-600 bg-red-100';
    else if (urgency === 'high') color = 'text-orange-600 bg-orange-100';
    else if (urgency === 'medium') color = 'text-yellow-600 bg-yellow-100';
    
    return {
      interval: nextService,
      hoursRemaining: hoursRemaining,
      daysRemaining: daysRemaining,
      urgency: urgency,
      color: color,
      isUrgent: daysRemaining <= settings.maintenanceBufferDays
    };
  }, [settings.defaultOperatingHours, settings.maintenanceBufferDays]);

  // Helper to auto-adjust loaded hours if they exceed running hours
  const autoAdjustLoadedHours = (running: number, loaded: number) => {
    // If loaded exceeds running, cap it at running
    if (loaded > running) {
      return running;
    }
    // Ensure loaded is not negative
    return Math.max(0, loaded);
  };

  // Handle running hours change with auto-adjustment
  const handleRunningHoursChange = (compressorId: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    const currentLoaded = compressorInputs[compressorId]?.totalLoaded || 0;
    
    // Auto-adjust loaded hours if they would exceed new running hours
    const adjustedLoaded = autoAdjustLoadedHours(numValue, currentLoaded);
    
    setCompressorInputs(prev => ({
      ...prev,
      [compressorId]: {
        ...prev[compressorId],
        totalRunning: numValue,
        totalLoaded: adjustedLoaded
      }
    }));
  };

  // Handle loaded hours change with validation
  const handleLoadedHoursChange = (compressorId: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    const currentRunning = compressorInputs[compressorId]?.totalRunning || 0;
    
    // Ensure loaded doesn't exceed running
    const adjustedValue = Math.min(numValue, currentRunning);
    
    setCompressorInputs(prev => ({
      ...prev,
      [compressorId]: {
        ...prev[compressorId],
        totalLoaded: adjustedValue
      }
    }));
  };

  // Validate reading before sending
  const validateReading = (compressorId: number, newTotalRunning: number, newTotalLoaded: number) => {
    const previousReading = previousReadings[compressorId];
    if (!previousReading) return true; // No validation if no previous reading
    
    const previousTotalRunning = previousReading.total_running_hours;
    const previousTotalLoaded = previousReading.total_loaded_hours;
    
    // Calculate the daily differences
    const dailyRunning = newTotalRunning - previousTotalRunning;
    const dailyLoaded = newTotalLoaded - previousTotalLoaded;
    
    // Basic validation
    if (newTotalRunning < previousTotalRunning) {
      toast.error(`New running hours (${newTotalRunning}) cannot be less than previous total (${previousTotalRunning})`);
      return false;
    }
    
    if (newTotalLoaded < previousTotalLoaded) {
      toast.error(`New loaded hours (${newTotalLoaded}) cannot be less than previous total (${previousTotalLoaded})`);
      return false;
    }
    
    // Check for negative daily values
    if (dailyRunning < 0) {
      toast.error(`Daily running hours cannot be negative (calculated: ${dailyRunning})`);
      return false;
    }
    
    if (dailyLoaded < 0) {
      toast.error(`Daily loaded hours cannot be negative (calculated: ${dailyLoaded})`);
      return false;
    }
    
    // Check if loaded hours exceed running hours for the daily period
    if (dailyLoaded > dailyRunning) {
      toast.error(`Daily loaded hours (${dailyLoaded.toFixed(1)}) cannot exceed daily running hours (${dailyRunning.toFixed(1)})`);
      return false;
    }
    
    // Calculate days since last reading for validation
    const currentDateStr = getCurrentDateStr();
    const previousDate = previousReading.date;
    
    let daysBetween = 1; // Default to 1 day
    if (previousDate !== 'Initial') {
      const prevDate = new Date(previousDate);
      const currDate = new Date(currentDateStr);
      const diffTime = Math.abs(currDate.getTime() - prevDate.getTime());
      daysBetween = Math.max(1, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
    }
    
    // Maximum possible hours (24 hours per day)
    const maxPossibleHours = previousTotalRunning + (daysBetween * 24);
    
    if (newTotalRunning > maxPossibleHours) {
      toast.error(`New running hours (${newTotalRunning}) exceed maximum possible (${maxPossibleHours} hours for ${daysBetween} days)`);
      return false;
    }
    
    // Validate that loaded hours don't exceed running hours in total
    if (newTotalLoaded > newTotalRunning) {
      toast.error(`Total loaded hours (${newTotalLoaded}) cannot exceed total running hours (${newTotalRunning})`);
      return false;
    }
    
    return true;
  };

  // Update compressor hours (cumulative method)
  const updateCompressorHours = async (
    compressorId: number,
    totalRunning: number,
    totalLoaded: number,
    pressure: number = 0,
    temperature: number = 0,
    notes: string = ''
  ) => {
    try {
      setIsSaving({ type: 'update', id: compressorId });

      // Validate the reading first
      if (!validateReading(compressorId, totalRunning, totalLoaded)) {
        setIsSaving({});
        return;
      }

      const response = (await enhancedFetch(`${API_BASE_URL}/api/compressors/daily-entries/cumulative`, {
        method: 'POST',
        body: JSON.stringify({
          compressor_id: compressorId,
          date: getCurrentDateStr(),
          current_total_running: parseFloat(String(totalRunning)) || 0,
          current_total_loaded: parseFloat(String(totalLoaded)) || 0,
          pressure: parseFloat(String(pressure)) || 0,
          temperature: parseFloat(String(temperature)) || 0,
          notes: notes
        })
      })) as { data?: { total_running_hours?: number; total_loaded_hours?: number; pressure?: number; temperature?: number; notes?: string } };

      // Use the response data to update local state
      if (response.data) {
        setCompressors(prev => prev.map(comp =>
          comp.id === compressorId ? {
            ...comp,
            total_running_hours: response.data!.total_running_hours ?? parseFloat(String(totalRunning)) ?? 0,
            total_loaded_hours: response.data!.total_loaded_hours ?? parseFloat(String(totalLoaded)) ?? 0
          } : comp
        ));

        // Update inputs with the actual saved data
        setCompressorInputs(prev => ({
          ...prev,
          [compressorId]: {
            ...prev[compressorId],
            totalRunning: response.data!.total_running_hours ?? parseFloat(String(totalRunning)) ?? 0,
            totalLoaded: response.data!.total_loaded_hours ?? parseFloat(String(totalLoaded)) ?? 0,
            pressure: response.data!.pressure ?? parseFloat(String(pressure)) ?? 0,
            temperature: response.data!.temperature ?? parseFloat(String(temperature)) ?? 0,
            notes: response.data!.notes ?? notes ?? ''
          }
        }));

        // Update previous readings
        setPreviousReadings(prev => ({
          ...prev,
          [compressorId]: {
            total_running_hours: response.data!.total_running_hours ?? parseFloat(String(totalRunning)) ?? 0,
            total_loaded_hours: response.data!.total_loaded_hours ?? parseFloat(String(totalLoaded)) ?? 0,
            date: getCurrentDateStr()
          }
        }));
      }

      // Refresh data
      await Promise.all([
        fetchStats(),
        fetchUpcomingServices(),
        fetchPerformanceMetrics(),
        fetchComparisonAnalytics()
      ]);

      toast.success('Compressor hours updated successfully');
      return response;
    } catch (error) {
      const err = error as Error;
      console.error('Error updating compressor:', err);

      // Show more specific error messages
      if (err.message.includes('Loaded hours must be positive')) {
        toast.error('Error: Loaded hours cannot exceed running hours and must be positive.');
      } else if (err.message.includes('cannot be less than')) {
        toast.error(err.message);
      } else {
        toast.error(err.message || 'Failed to update compressor hours');
      }

      throw err;
    } finally {
      setIsSaving({});
    }
  };

  // Add new compressor
  const addCompressor = async (compressorData: AddCompressorFormData) => {
    try {
      setIsSaving({ type: 'add', id: 'new' });

      await enhancedFetch(`${API_BASE_URL}/api/compressors/compressors`, {
        method: 'POST',
        body: JSON.stringify(compressorData)
      });

      await fetchCompressors();
      toast.success(`Compressor ${compressorData.name} added successfully`);
      setShowAddCompressor(false);
      return true;
    } catch (error) {
      const err = error as Error;
      console.error('Error adding compressor:', err);
      toast.error(err.message || 'Failed to add compressor');
      throw err;
    } finally {
      setIsSaving({});
    }
  };

  // Update compressor status
  const updateCompressorStatus = async (compressorId: number | null, status: string) => {
    try {
      setIsSaving({ type: 'status', id: compressorId ?? undefined });

      await enhancedFetch(`${API_BASE_URL}/api/compressors/compressors/${compressorId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });

      await fetchCompressors();
      toast.success(`Compressor status updated to ${status}`);
      setStatusUpdateDialog({ open: false, compressorId: null, currentStatus: '' });
    } catch (error) {
      const err = error as Error;
      console.error('Error updating status:', err);
      toast.error(err.message || 'Failed to update status');
    } finally {
      setIsSaving({});
    }
  };

  // Delete compressor
  const deleteCompressor = async (compressorId: number) => {
    try {
      await enhancedFetch(`${API_BASE_URL}/api/compressors/compressors/${compressorId}`, {
        method: 'DELETE',
      });

      await fetchCompressors();
      await fetchStats();
      await fetchUpcomingServices();

      toast.success('Compressor deleted successfully');
    } catch (error) {
      console.error('Error deleting compressor:', error as Error);
      toast.error('Failed to delete compressor');
    }
  };

  // Mark service as completed
  const markServiceCompleted = async (compressorId: number, serviceInterval: number) => {
    try {
      const compressor = compressors.find(c => c.id === compressorId);
      if (!compressor) throw new Error('Compressor not found');
      
      await enhancedFetch(`${API_BASE_URL}/api/compressors/service-records`, {
        method: 'POST',
        body: JSON.stringify({
          compressor_id: compressorId,
          service_type: `${serviceInterval} Hour Service`,
          service_date: new Date().toISOString().split('T')[0],
          running_hours_at_service: serviceInterval,
          description: `Completed ${serviceInterval} hour service`,
          is_completed: true
        })
      });
      
      // Update compressor to match service interval
      await updateCompressorHours(
        compressorId, 
        serviceInterval, 
        compressor.total_loaded_hours,
        0,
        0,
        `${serviceInterval} hour service completed`
      );
      
      await fetchUpcomingServices();
      
      toast.success('Service marked as completed');
    } catch (error) {
      console.error('Error marking service:', error as Error);
      toast.error('Failed to mark service as completed');
    }
  };

  // Generate CSV report
  const generateCSVReport = async () => {
    try {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];
      
      const response = await fetch(`${API_BASE_URL}/api/compressors/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          start_date: startDate,
          end_date: endDate,
          format: 'csv'
        })
      });
      
      if (!response.ok) throw new Error('Failed to generate report');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `compressor-report-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('CSV report generated successfully');
    } catch (error) {
      console.error('Error generating report:', error as Error);
      toast.error('Failed to generate report');
    }
  };

  // Import data from CSV
  const importData = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`${API_BASE_URL}/api/compressors/import`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) throw new Error('Failed to import data');
      
      const result = await response.json() as { errors?: unknown[]; imported_count?: number };

      if (result.errors && result.errors.length > 0) {
        toast.warning(`Imported with ${result.errors.length} errors`);
      } else {
        toast.success(`Imported ${result.imported_count} compressors`);
      }

      await loadAllData();
      return result;
    } catch (error) {
      console.error('Error importing data:', error);
      toast.error('Failed to import data');
      throw error;
    }
  };

  // Get efficiency status
  const getEfficiencyStatus = (efficiency: number) => {
    if (efficiency >= 80) return { label: 'Excellent', color: 'text-green-600', bg: 'bg-green-100' };
    if (efficiency >= 60) return { label: 'Good', color: 'text-blue-600', bg: 'bg-blue-100' };
    if (efficiency >= 40) return { label: 'Fair', color: 'text-orange-600', bg: 'bg-orange-100' };
    return { label: 'Poor', color: 'text-red-600', bg: 'bg-red-100' };
  };

  // Calculate daily hours from inputs
  const calculateDailyFromInputs = (compressorId: number) => {
    const inputs = compressorInputs[compressorId];
    const previousReading = previousReadings[compressorId];
    
    if (!inputs || !previousReading) return { dailyRunning: 0, dailyLoaded: 0 };
    
    const previousTotalRunning = previousReading.total_running_hours || 0;
    const previousTotalLoaded = previousReading.total_loaded_hours || 0;
    
    const dailyRunning = Math.max(0, (inputs.totalRunning || 0) - previousTotalRunning);
    const dailyLoaded = Math.max(0, (inputs.totalLoaded || 0) - previousTotalLoaded);
    
    return { dailyRunning, dailyLoaded };
  };

  // Get previous reading info
  const getPreviousReadingInfo = (compressorId: number) => {
    const previousReading = previousReadings[compressorId];
    if (!previousReading) return { running: 0, loaded: 0, date: 'No previous reading' };
    
    return {
      running: previousReading.total_running_hours,
      loaded: previousReading.total_loaded_hours,
      date: previousReading.date === 'Initial' ? 'Initial' : new Date(previousReading.date).toLocaleDateString()
    };
  };

  // Status Badge Component
  const StatusBadge = React.memo(({ status, onClick }: { status: string; onClick?: () => void }) => {
    const config = STATUS_CONFIG[status];
    if (!config) return null;
    
    const IconComponent = config.icon;
    
    return (
      <Badge 
        variant="secondary" 
        className={`text-xs ${config.color} cursor-pointer hover:opacity-80`}
        onClick={onClick}
      >
        <IconComponent className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  });

  StatusBadge.displayName = 'StatusBadge';

  // Service Badge Component
  const ServiceBadge = React.memo(({ compressor }: { compressor: Compressor }) => {
    const serviceInfo = calculateNextService(compressor.total_running_hours);
    
    if (!serviceInfo) {
      return (
        <Badge variant="outline" className="text-xs bg-gray-100 text-gray-700">
          <CheckCheck className="w-3 h-3 mr-1" />
          All services done
        </Badge>
      );
    }
    
    return (
      <Badge variant="outline" className={`text-xs ${serviceInfo.color}`}>
        <AlertTriangle className="w-3 h-3 mr-1" />
        {serviceInfo.interval}h in {serviceInfo.daysRemaining}d
      </Badge>
    );
  });

  ServiceBadge.displayName = 'ServiceBadge';

  // Compressor Card Component with Cumulative Input
  const CompressorCard = React.memo(({ compressor }: { compressor: Compressor }) => {
    const inputs = compressorInputs[compressor.id] || {};
    const serviceInfo = calculateNextService(compressor.total_running_hours);
    const { dailyRunning, dailyLoaded } = calculateDailyFromInputs(compressor.id);
    const efficiency = calculateEfficiency(dailyRunning, dailyLoaded);
    const efficiencyStatus = getEfficiencyStatus(efficiency);
    const previousReadingInfo = getPreviousReadingInfo(compressor.id);
    
    const handleSave = async () => {
      try {
        await updateCompressorHours(
          compressor.id,
          Number(inputs.totalRunning) || 0,
          Number(inputs.totalLoaded) || 0,
          Number(inputs.pressure) || 0,
          Number(inputs.temperature) || 0,
          inputs.notes || ''
        );
      } catch (error) {
        // Error handled in function
      }
    };
    
    const handleCopyPrevious = () => {
      const prevInfo = previousReadingInfo;
      setCompressorInputs(prev => ({
        ...prev,
        [compressor.id]: {
          ...prev[compressor.id],
          totalRunning: prevInfo.running || 0,
          totalLoaded: prevInfo.loaded || 0
        }
      }));
      toast.success('Copied previous totals');
    };
    
    const handleStatusClick = () => {
      setStatusUpdateDialog({
        open: true,
        compressorId: compressor.id,
        currentStatus: compressor.status
      });
    };
    
    return (
      <Card className={`${settings.darkMode ? 'bg-slate-800 border-slate-700' : ''} ${
        serviceInfo?.isUrgent ? 'border-l-4 border-l-red-500' : ''
      }`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 ${compressor.color || 'bg-blue-500'} rounded-full flex items-center justify-center text-white text-sm font-medium`}>
                <Gauge className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  {compressor.name}
                  {serviceInfo?.isUrgent && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        </TooltipTrigger>
                        <TooltipContent>
                          Service due in {serviceInfo.daysRemaining} days!
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </CardTitle>
                <CardDescription className={settings.darkMode ? 'text-slate-400' : ''}>
                  {compressor.model} • {compressor.location}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={compressor.status} onClick={handleStatusClick} />
              <ServiceBadge compressor={compressor} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Previous Reading Info */}
          <div className={`p-2 rounded-lg border ${settings.darkMode ? 'border-slate-700 bg-slate-900/50' : 'border-slate-200 bg-slate-50/50'}`}>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">Previous Reading:</span>
              <span className={`${settings.darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                {previousReadingInfo.date}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <div className="text-center">
                <div className="text-sm font-semibold">{previousReadingInfo.running.toFixed(1)}h</div>
                <div className="text-xs text-slate-500">Running</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-semibold">{previousReadingInfo.loaded.toFixed(1)}h</div>
                <div className="text-xs text-slate-500">Loaded</div>
              </div>
            </div>
          </div>

          {/* Cumulative Hours Input */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">CUMULATIVE HOURS FOR {getCurrentDateStr()}</Label>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 text-xs"
                onClick={handleCopyPrevious}
              >
                <Copy className="w-3 h-3 mr-1" />
                Copy Previous
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Total Running Hours</Label>
                <div className="relative">
                  <Input
                    value={inputs.totalRunning || ''}
                    onChange={(e) => handleRunningHoursChange(compressor.id, e.target.value)}
                    placeholder="Enter total hours"
                    type="number"
                    step="0.1"
                    className={`h-8 text-xs pr-8 ${settings.darkMode ? 'bg-slate-700 border-slate-600' : ''} ${
                      isSaving.id === compressor.id ? 'opacity-50' : ''
                    }`}
                    disabled={isSaving.id === compressor.id}
                  />
                  <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-slate-500">
                    h
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-1 flex justify-between">
                  <span>Previous: {previousReadingInfo.running.toFixed(1)}h</span>
                  <span>Current: {compressor.total_running_hours?.toFixed(1)}h</span>
                </div>
              </div>
              <div>
                <Label className="text-xs">Total Loaded Hours</Label>
                <div className="relative">
                  <Input
                    value={inputs.totalLoaded || ''}
                    onChange={(e) => handleLoadedHoursChange(compressor.id, e.target.value)}
                    placeholder="Enter total hours"
                    type="number"
                    step="0.1"
                    className={`h-8 text-xs pr-8 ${settings.darkMode ? 'bg-slate-700 border-slate-600' : ''} ${
                      isSaving.id === compressor.id ? 'opacity-50' : ''
                    }`}
                    disabled={isSaving.id === compressor.id}
                  />
                  <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-slate-500">
                    h
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-1 flex justify-between">
                  <span>Previous: {previousReadingInfo.loaded.toFixed(1)}h</span>
                  <span>Current: {compressor.total_loaded_hours?.toFixed(1)}h</span>
                </div>
              </div>
            </div>
          </div>

          {/* Calculated Daily Hours */}
          {settings.showDailyHours && (
            <div className={`p-3 rounded-lg border ${settings.darkMode ? 'border-slate-700' : 'border-blue-200'} bg-blue-50/50 dark:bg-blue-900/20`}>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold text-blue-700 dark:text-blue-400">DAILY CALCULATED</div>
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs text-blue-600 dark:text-blue-400">Auto-calculated</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                    {dailyRunning.toFixed(1)}h
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-400">Running Hours Today</div>
                  <div className="text-xs text-slate-500 mt-1">
                    ({previousReadingInfo.running.toFixed(1)} → {inputs.totalRunning || 0}h)
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                    {dailyLoaded.toFixed(1)}h
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-400">Loaded Hours Today</div>
                  <div className="text-xs text-slate-500 mt-1">
                    ({previousReadingInfo.loaded.toFixed(1)} → {inputs.totalLoaded || 0}h)
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Efficiency Display */}
          {dailyRunning > 0 && (
            <div className={`p-3 rounded-lg border ${efficiencyStatus.bg}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    <span className={efficiencyStatus.color}>Efficiency</span>
                  </div>
                  <div className="text-2xl font-bold mt-1">{efficiency}%</div>
                  <div className="text-xs text-slate-500 mt-1">
                    {dailyLoaded.toFixed(1)}h / {dailyRunning.toFixed(1)}h
                  </div>
                </div>
                <Badge className={`${efficiencyStatus.color} ${efficiencyStatus.bg}`}>
                  {efficiencyStatus.label}
                </Badge>
              </div>
              <Progress value={efficiency} className="mt-3 h-2" />
            </div>
          )}

          {/* Additional Parameters */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Pressure (psi)</Label>
              <div className="relative">
                <Input
                  value={inputs.pressure || ''}
                  onChange={(e) => setCompressorInputs(prev => ({
                    ...prev,
                    [compressor.id]: {
                      ...prev[compressor.id],
                      pressure: e.target.value
                    }
                  }))}
                  placeholder="0.0"
                  type="number"
                  step="0.1"
                  className={`h-8 text-xs pr-8 ${settings.darkMode ? 'bg-slate-700 border-slate-600' : ''}`}
                  disabled={isSaving.id === compressor.id}
                />
                <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-slate-500">
                  psi
                </span>
              </div>
            </div>
            <div>
              <Label className="text-xs">Temperature (°C)</Label>
              <div className="relative">
                <Input
                  value={inputs.temperature || ''}
                  onChange={(e) => setCompressorInputs(prev => ({
                    ...prev,
                    [compressor.id]: {
                      ...prev[compressor.id],
                      temperature: e.target.value
                    }
                  }))}
                  placeholder="0.0"
                  type="number"
                  step="0.1"
                  className={`h-8 text-xs pr-8 ${settings.darkMode ? 'bg-slate-700 border-slate-600' : ''}`}
                  disabled={isSaving.id === compressor.id}
                />
                <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-slate-500">
                  °C
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label className="text-xs">Notes</Label>
            <Input
              value={inputs.notes || ''}
              onChange={(e) => setCompressorInputs(prev => ({
                ...prev,
                [compressor.id]: {
                  ...prev[compressor.id],
                  notes: e.target.value
                }
              }))}
              placeholder="Add notes..."
              className={`h-8 text-xs ${settings.darkMode ? 'bg-slate-700 border-slate-600' : ''}`}
              disabled={isSaving.id === compressor.id}
            />
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSave}
            disabled={isSaving.id === compressor.id}
            className="w-full"
          >
            {isSaving.id === compressor.id ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Entry'
            )}
          </Button>
        </CardContent>
      </Card>
    );
  });

  CompressorCard.displayName = 'CompressorCard';

  // Add Compressor Form Component
  const AddCompressorForm = () => {
    const [formData, setFormData] = useState<AddCompressorFormData>({
      name: '',
      model: '',
      capacity: '',
      location: 'Main Plant',
      status: STATUS_TYPES.STANDBY,
      total_running_hours: 0,
      total_loaded_hours: 0,
      color: 'bg-blue-500'
    });

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!formData.name || !formData.model || !formData.capacity) {
        toast.error('Please fill in all required fields');
        return;
      }

      try {
        await addCompressor(formData);
        setFormData({
          name: '',
          model: '',
          capacity: '',
          location: 'Main Plant',
          status: STATUS_TYPES.STANDBY,
          total_running_hours: 0,
          total_loaded_hours: 0,
          color: 'bg-blue-500'
        });
      } catch (error) {
        // Error handled in function
      }
    };

    return (
      <DialogContent className={settings.darkMode ? 'bg-slate-800' : ''}>
        <DialogHeader>
          <DialogTitle>Add New Compressor</DialogTitle>
          <DialogDescription>
            Enter the compressor details below.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Compressor Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Compressor #1"
                required
                className={settings.darkMode ? 'bg-slate-700 border-slate-600' : ''}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="model">Model *</Label>
              <Input
                id="model"
                value={formData.model}
                onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                placeholder="e.g., Atlas Copco GA37"
                required
                className={settings.darkMode ? 'bg-slate-700 border-slate-600' : ''}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="capacity">Capacity *</Label>
              <Input
                id="capacity"
                value={formData.capacity}
                onChange={(e) => setFormData(prev => ({ ...prev, capacity: e.target.value }))}
                placeholder="e.g., 37 kW"
                required
                className={settings.darkMode ? 'bg-slate-700 border-slate-600' : ''}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Select 
                value={formData.location} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, location: value }))}
              >
                <SelectTrigger className={settings.darkMode ? 'bg-slate-700 border-slate-600' : ''}>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {LOCATIONS.map(location => (
                    <SelectItem key={location} value={location}>{location}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="total_running_hours">Total Running Hours</Label>
              <Input
                id="total_running_hours"
                type="number"
                value={formData.total_running_hours}
                onChange={(e) => setFormData(prev => ({ ...prev, total_running_hours: parseFloat(e.target.value) || 0 }))}
                placeholder="0"
                className={settings.darkMode ? 'bg-slate-700 border-slate-600' : ''}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="total_loaded_hours">Total Loaded Hours</Label>
              <Input
                id="total_loaded_hours"
                type="number"
                value={formData.total_loaded_hours}
                onChange={(e) => setFormData(prev => ({ ...prev, total_loaded_hours: parseFloat(e.target.value) || 0 }))}
                placeholder="0"
                className={settings.darkMode ? 'bg-slate-700 border-slate-600' : ''}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Initial Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger className={settings.darkMode ? 'bg-slate-700 border-slate-600' : ''}>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONFIG).map(([statusKey, config]) => (
                    <SelectItem key={statusKey} value={statusKey}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="color">Color Theme</Label>
              <Select 
                value={formData.color} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, color: value }))}
              >
                <SelectTrigger className={settings.darkMode ? 'bg-slate-700 border-slate-600' : ''}>
                  <SelectValue placeholder="Select color" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bg-blue-500">Blue</SelectItem>
                  <SelectItem value="bg-green-500">Green</SelectItem>
                  <SelectItem value="bg-red-500">Red</SelectItem>
                  <SelectItem value="bg-yellow-500">Yellow</SelectItem>
                  <SelectItem value="bg-purple-500">Purple</SelectItem>
                  <SelectItem value="bg-pink-500">Pink</SelectItem>
                  <SelectItem value="bg-indigo-500">Indigo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowAddCompressor(false)} disabled={isSaving.type === 'add'}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving.type === 'add'}>
              {isSaving.type === 'add' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Compressor'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    );
  };

  // Status Update Dialog
  const StatusUpdateDialog = () => {
    const [selectedStatus, setSelectedStatus] = useState<string>(statusUpdateDialog.currentStatus);

    const handleSubmit = async () => {
      if (selectedStatus === statusUpdateDialog.currentStatus) {
        toast.info('Status is already set to this value');
        return;
      }

      await updateCompressorStatus(statusUpdateDialog.compressorId, selectedStatus);
    };

    return (
      <Dialog open={statusUpdateDialog.open} onOpenChange={(open) => setStatusUpdateDialog(prev => ({ ...prev, open }))}>
        <DialogContent className={settings.darkMode ? 'bg-slate-800' : ''}>
          <DialogHeader>
            <DialogTitle>Update Compressor Status</DialogTitle>
            <DialogDescription>
              Change the operational status of the compressor.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(STATUS_CONFIG).map(([statusKey, config]) => {
                const IconComponent = config.icon;
                return (
                  <Button
                    key={statusKey}
                    variant={selectedStatus === statusKey ? "default" : "outline"}
                    className={`h-20 flex flex-col items-center justify-center ${
                      selectedStatus === statusKey ? config.color : ''
                    }`}
                    onClick={() => setSelectedStatus(statusKey)}
                  >
                    <IconComponent className="w-6 h-6 mb-2" />
                    <span>{config.label}</span>
                  </Button>
                );
              })}
            </div>
            <div className="text-sm text-slate-500">
              Current status: <span className="font-semibold">{STATUS_CONFIG[statusUpdateDialog.currentStatus]?.label || 'Unknown'}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusUpdateDialog({ open: false, compressorId: null, currentStatus: '' })}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={isSaving.type === 'status' || selectedStatus === statusUpdateDialog.currentStatus}
            >
              {isSaving.type === 'status' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Status'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // Filtered compressors based on search and filters
  const filteredCompressors = useMemo(() => {
    return compressors.filter(compressor => {
      if (filters.location !== 'all' && compressor.location !== filters.location) return false;
      if (filters.status !== 'all' && compressor.status !== filters.status) return false;
      if (filters.search && !compressor.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
      if (!settings.showInactive && compressor.status === STATUS_TYPES.OFFLINE) return false;
      
      // Filter by maintenance/service due
      if (filters.showMaintenance) {
        const serviceInfo = calculateNextService(compressor.total_running_hours);
        if (!serviceInfo || !serviceInfo.isUrgent) return false;
      }
      
      return true;
    });
  }, [compressors, filters, settings.showInactive, calculateNextService]);

  if (connectionError) {
    return (
      <div className={`min-h-screen p-4 md:p-6 transition-colors ${
        settings.darkMode 
          ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white' 
          : 'bg-gradient-to-br from-slate-50 via-blue-50/20 to-emerald-50/20'
      }`}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-600 mb-2">Connection Error</h3>
              <p className="text-slate-500 mb-4">Cannot connect to the backend server at {API_BASE_URL}</p>
              <div className="space-y-2">
                <p className="text-sm text-slate-500">Please ensure:</p>
                <ul className="text-sm text-slate-500 text-left max-w-md mx-auto">
                  <li>1. Backend server is running on port 8000</li>
                  <li>2. CORS is properly configured</li>
                  <li>3. No firewall is blocking the connection</li>
                </ul>
              </div>
              <Button onClick={loadAllData} className="mt-4">
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry Connection
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`min-h-screen p-4 md:p-6 transition-colors ${
        settings.darkMode 
          ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white' 
          : 'bg-gradient-to-br from-slate-50 via-blue-50/20 to-emerald-50/20'
      }`}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-600">Loading Compressor Tracking System...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PageShell>
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <nav className="flex items-center gap-1.5 text-xs text-[#6B7B8E] mb-2">
              <span>Home</span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-[#2A4D69] font-medium">Compressors</span>
            </nav>
            <h1 className="text-3xl font-bold text-[#2A4D69] font-heading tracking-tight">Compressor Tracking</h1>
            <p className="text-[#6B7B8E] mt-1">Daily readings, maintenance scheduling & efficiency tracking.</p>
          </div>
          <div className="flex items-center gap-2 self-start">
            <Button variant="outline" size="sm" onClick={loadAllData} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto">
          
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
              <Card className={settings.darkMode ? 'bg-slate-800 border-slate-700' : ''}>
                <CardContent className="p-3 text-center">
                  <div className="text-lg md:text-xl font-bold text-blue-600">
                    {stats.total_compressors}
                  </div>
                  <div className={`text-xs ${settings.darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Total Units</div>
                </CardContent>
              </Card>
              <Card className={settings.darkMode ? 'bg-slate-800 border-slate-700' : ''}>
                <CardContent className="p-3 text-center">
                  <div className="text-lg md:text-xl font-bold text-green-600">
                    {stats.total_running_hours?.toFixed(1)}h
                  </div>
                  <div className={`text-xs ${settings.darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Total Running</div>
                </CardContent>
              </Card>
              <Card className={settings.darkMode ? 'bg-slate-800 border-slate-700' : ''}>
                <CardContent className="p-3 text-center">
                  <div className="text-lg md:text-xl font-bold text-purple-600">
                    {stats.avg_efficiency}%
                  </div>
                  <div className={`text-xs ${settings.darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Avg Efficiency</div>
                </CardContent>
              </Card>
              <Card className={settings.darkMode ? 'bg-slate-800 border-slate-700' : ''}>
                <CardContent className="p-3 text-center">
                  <div className="text-lg md:text-xl font-bold text-orange-600">
                    {stats.upcoming_services}
                  </div>
                  <div className={`text-xs ${settings.darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Upcoming Services</div>
                </CardContent>
              </Card>
              <Card className={settings.darkMode ? 'bg-slate-800 border-slate-700' : ''}>
                <CardContent className="p-3 text-center">
                  <div className="text-lg md:text-xl font-bold text-red-600">
                    {stats.urgent_alerts}
                  </div>
                  <div className={`text-xs ${settings.darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Urgent Alerts</div>
                </CardContent>
              </Card>
              <Card className={settings.darkMode ? 'bg-slate-800 border-slate-700' : ''}>
                <CardContent className="p-3 text-center">
                  <div className="text-lg md:text-xl font-bold text-indigo-600">
                    {stats.active_compressors}
                  </div>
                  <div className={`text-xs ${settings.darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Active</div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className={`grid w-full grid-cols-4 p-1 rounded-lg ${
            settings.darkMode ? 'bg-slate-800' : 'bg-slate-100'
          }`}>
            <TabsTrigger value="daily-view" className="rounded-md">
              <Calendar className="w-4 h-4 mr-2" />
              Daily View
            </TabsTrigger>
            <TabsTrigger value="services" className="rounded-md">
              <Wrench className="w-4 h-4 mr-2" />
              Services
            </TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-md">
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="management" className="rounded-md">
              <Settings className="w-4 h-4 mr-2" />
              Management
            </TabsTrigger>
          </TabsList>

          {/* Daily View Tab */}
          <TabsContent value="daily-view">
            <Card className={settings.darkMode ? 'bg-slate-800 border-slate-700' : ''}>
              <CardHeader>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={previousDay}>
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <CardTitle className="text-lg">{currentDate.toLocaleDateString()}</CardTitle>
                      <Button variant="outline" size="sm" onClick={nextDay}>
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={goToToday}>
                        Today
                      </Button>
                      <Badge variant="secondary" className={settings.darkMode ? 'bg-slate-700' : ''}>
                        {getCurrentDateStr()}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Search className="w-4 h-4 text-slate-400" />
                      <Input
                        placeholder="Search compressors..."
                        value={filters.search}
                        onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                        className={`w-32 md:w-48 ${settings.darkMode ? 'bg-slate-700 border-slate-600' : ''}`}
                      />
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Select 
                        value={filters.location} 
                        onValueChange={(value) => setFilters(prev => ({ ...prev, location: value }))}
                      >
                        <SelectTrigger className={`w-28 ${settings.darkMode ? 'bg-slate-700 border-slate-600' : ''}`}>
                          <SelectValue placeholder="Location" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Locations</SelectItem>
                          {LOCATIONS.map(location => (
                            <SelectItem key={location} value={location}>{location}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Select 
                        value={filters.status} 
                        onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                      >
                        <SelectTrigger className={`w-28 ${settings.darkMode ? 'bg-slate-700 border-slate-600' : ''}`}>
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          {Object.entries(STATUS_CONFIG).map(([statusKey, config]) => (
                            <SelectItem key={statusKey} value={statusKey}>{config.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant={viewMode === 'card' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode('card')}
                      >
                        <Grid className="w-4 h-4" />
                      </Button>
                      <Button
                        variant={viewMode === 'list' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode('list')}
                      >
                        <List className="w-4 h-4" />
                      </Button>
                      
                      <Dialog open={showAddCompressor} onOpenChange={setShowAddCompressor}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Compressor
                          </Button>
                        </DialogTrigger>
                        <AddCompressorForm />
                      </Dialog>
                    </div>
                  </div>
                </div>
                
                {/* Settings Toggle */}
                <div className="mt-4 flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="show-inactive"
                      checked={settings.showInactive}
                      onCheckedChange={(checked) => setSettings(prev => ({ ...prev, showInactive: checked }))}
                    />
                    <Label htmlFor="show-inactive" className="text-sm">Show Inactive</Label>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Switch
                      id="show-daily-hours"
                      checked={settings.showDailyHours}
                      onCheckedChange={(checked) => setSettings(prev => ({ ...prev, showDailyHours: checked }))}
                    />
                    <Label htmlFor="show-daily-hours" className="text-sm">Show Daily Hours</Label>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Switch
                      id="show-maintenance"
                      checked={filters.showMaintenance}
                      onCheckedChange={(checked) => setFilters(prev => ({ ...prev, showMaintenance: checked }))}
                    />
                    <Label htmlFor="show-maintenance" className="text-sm">Show Only Urgent Maintenance</Label>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {viewMode === 'card' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredCompressors.map(compressor => (
                      <CompressorCard
                        key={compressor.id}
                        compressor={compressor}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Compressor</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Total Running</TableHead>
                          <TableHead>Total Loaded</TableHead>
                          <TableHead>Next Service</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCompressors.map(compressor => {
                          const serviceInfo = calculateNextService(compressor.total_running_hours);
                          const isExpanded = expandedCompressor === compressor.id;
                          const previousReadingInfo = getPreviousReadingInfo(compressor.id);
                          
                          return (
                            <React.Fragment key={compressor.id}>
                              <TableRow className={settings.darkMode ? 'hover:bg-slate-800' : ''}>
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 ${compressor.color || 'bg-blue-500'} rounded-full flex items-center justify-center text-white text-xs font-medium`}>
                                      <Gauge className="w-4 h-4" />
                                    </div>
                                    <div>
                                      <div className="font-medium">{compressor.name}</div>
                                      <div className={`text-xs ${settings.darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{compressor.model}</div>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <StatusBadge status={compressor.status} onClick={() => setStatusUpdateDialog({
                                    open: true,
                                    compressorId: compressor.id,
                                    currentStatus: compressor.status
                                  })} />
                                </TableCell>
                                <TableCell className="text-sm">{compressor.location}</TableCell>
                                <TableCell>
                                  <div className="text-sm font-semibold">{compressor.total_running_hours?.toFixed(1)}h</div>
                                  <div className={`text-xs ${settings.darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                    Prev: {previousReadingInfo.running.toFixed(1)}h
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm font-semibold">{compressor.total_loaded_hours?.toFixed(1)}h</div>
                                  <div className={`text-xs ${settings.darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                    Prev: {previousReadingInfo.loaded.toFixed(1)}h
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {serviceInfo ? (
                                    <div className={`text-sm font-semibold ${serviceInfo.color.split(' ')[0]}`}>
                                      {serviceInfo.interval}h in {serviceInfo.daysRemaining}d
                                    </div>
                                  ) : (
                                    <div className="text-sm text-slate-500">-</div>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setExpandedCompressor(isExpanded ? null : compressor.id)}
                                  >
                                    {isExpanded ? (
                                      <ChevronUp className="w-4 h-4" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4" />
                                    )}
                                  </Button>
                                </TableCell>
                              </TableRow>
                              {isExpanded && (
                                <TableRow>
                                  <TableCell colSpan={7} className="p-0">
                                    <div className={`p-4 ${settings.darkMode ? 'bg-slate-800' : 'bg-slate-50'} border-t`}>
                                      <CompressorCard compressor={compressor} />
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
                
                {filteredCompressors.length === 0 && (
                  <div className="text-center py-12">
                    <Gauge className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-600 mb-2">No compressors found</h3>
                    <p className="text-slate-500 mb-4">Try adjusting your filters or add a new compressor.</p>
                    <Dialog open={showAddCompressor} onOpenChange={setShowAddCompressor}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="w-4 h-4 mr-2" />
                          Add First Compressor
                        </Button>
                      </DialogTrigger>
                      <AddCompressorForm />
                    </Dialog>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Services Tab */}
          <TabsContent value="services">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Upcoming Services */}
              <div className="lg:col-span-2">
                <Card className={settings.darkMode ? 'bg-slate-800 border-slate-700' : ''}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Wrench className="w-5 h-5" />
                      Upcoming Services
                    </CardTitle>
                    <CardDescription className={settings.darkMode ? 'text-slate-400' : ''}>
                      Maintenance schedule based on running hours
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {upcomingServices.map((service, index) => (
                        <div 
                          key={`${service.compressor_id}-${service.service_interval}`}
                          className={`p-4 rounded-lg border ${
                            service.urgency === 'critical' || service.urgency === 'high'
                              ? 'border-red-200 bg-red-50 dark:bg-red-900/20' 
                              : 'border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium`}>
                                <Gauge className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="font-semibold">{service.compressor_name}</div>
                                <div className={`text-sm ${settings.darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                  Current: {service.current_hours}h • Next: {service.next_service_hours}h
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`text-lg font-bold ${
                                service.urgency === 'critical' ? 'text-red-600' :
                                service.urgency === 'high' ? 'text-orange-600' :
                                service.urgency === 'medium' ? 'text-yellow-600' : 'text-green-600'
                              }`}>
                                {service.service_interval}h
                              </div>
                              <div className={`text-sm ${settings.darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                {service.hours_remaining}h remaining
                              </div>
                            </div>
                          </div>
                          
                          <div className="mt-4 grid grid-cols-3 gap-4">
                            <div>
                              <div className={`text-xs ${settings.darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Current Hours</div>
                              <div className="font-semibold">{service.current_hours}h</div>
                            </div>
                            <div>
                              <div className={`text-xs ${settings.darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Days Until</div>
                              <div className="font-semibold">{service.days_remaining}d</div>
                            </div>
                            <div>
                              <div className={`text-xs ${settings.darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Urgency</div>
                              <Badge className={`
                                ${service.urgency === 'critical' ? 'bg-red-100 text-red-800' :
                                  service.urgency === 'high' ? 'bg-orange-100 text-orange-800' :
                                  service.urgency === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-green-100 text-green-800'}
                              `}>
                                {service.urgency}
                              </Badge>
                            </div>
                          </div>
                          
                          <Progress 
                            value={(service.current_hours / service.next_service_hours) * 100} 
                            className="mt-4 h-2"
                          />
                          
                          <div className="mt-4 flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => markServiceCompleted(service.compressor_id, service.service_interval)}
                              disabled={isSaving.id === service.compressor_id}
                            >
                              {isSaving.id === service.compressor_id ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Processing...
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-4 h-4 mr-2" />
                                  Mark as Done
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      ))}
                      
                      {upcomingServices.length === 0 && (
                        <div className="text-center py-8">
                          <CheckCheck className="w-12 h-12 text-green-500 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold text-slate-600 mb-2">No upcoming services</h3>
                          <p className="text-slate-500">All compressors are up-to-date with their maintenance schedule.</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Service History & Info */}
              <div className="space-y-6">
                <Card className={settings.darkMode ? 'bg-slate-800 border-slate-700' : ''}>
                  <CardHeader>
                    <CardTitle>Service Intervals</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {SERVICE_INTERVALS.map(interval => (
                      <div 
                        key={interval}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          settings.darkMode ? 'border-slate-700' : 'border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                            <Timer className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <div className="font-semibold">{interval} Hours</div>
                            <div className={`text-xs ${settings.darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Service Interval</div>
                          </div>
                        </div>
                        <Badge variant="outline">
                          {compressors.filter(c => {
                            const serviceInfo = calculateNextService(c.total_running_hours);
                            return serviceInfo?.interval === interval;
                          }).length} due
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className={settings.darkMode ? 'bg-slate-800 border-slate-700' : ''}>
                  <CardHeader>
                    <CardTitle>Export Data</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button onClick={generateCSVReport} className="w-full justify-start" variant="outline">
                      <FileText className="w-4 h-4 mr-2" />
                      Export to CSV
                    </Button>
                    
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button className="w-full justify-start" variant="outline">
                          <Upload className="w-4 h-4 mr-2" />
                          Import from CSV
                        </Button>
                      </DialogTrigger>
                      <DialogContent className={settings.darkMode ? 'bg-slate-800' : ''}>
                        <DialogHeader>
                          <DialogTitle>Import Data from CSV</DialogTitle>
                          <DialogDescription>
                            Upload a CSV file with compressor data. The file should have columns: Name, Model, Capacity, Location, Status, Total Running Hours, Total Loaded Hours.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <Input
                            type="file"
                            accept=".csv"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                try {
                                  await importData(file);
                                } catch (error) {
                                  // Error handled in function
                                }
                              }
                            }}
                            className={settings.darkMode ? 'bg-slate-700 border-slate-600' : ''}
                          />
                          <div className="text-sm text-slate-500">
                            <p>CSV format should include:</p>
                            <ul className="list-disc list-inside mt-2">
                              <li>Name (required)</li>
                              <li>Model (required)</li>
                              <li>Capacity (required)</li>
                              <li>Location</li>
                              <li>Status (running, standby, maintenance, offline)</li>
                              <li>Total Running Hours</li>
                              <li>Total Loaded Hours</li>
                            </ul>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {/* Performance Metrics */}
                <Card className={settings.darkMode ? 'bg-slate-800 border-slate-700' : ''}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Performance Metrics</CardTitle>
                      <Select value={analyticsPeriod} onValueChange={(value) => {
                        setAnalyticsPeriod(value);
                        fetchPerformanceMetrics(value === 'weekly' ? 7 : value === 'monthly' ? 30 : 90);
                      }}>
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Period" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekly">Last 7 Days</SelectItem>
                          <SelectItem value="monthly">Last 30 Days</SelectItem>
                          <SelectItem value="quarterly">Last 90 Days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <CardDescription className={settings.darkMode ? 'text-slate-400' : ''}>
                      Detailed performance analysis by compressor
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {analyticsData.performanceMetrics.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Compressor</TableHead>
                            <TableHead>Avg Efficiency</TableHead>
                            <TableHead>Avg Daily Hours</TableHead>
                            <TableHead>Total Hours</TableHead>
                            <TableHead>Downtime</TableHead>
                            <TableHead>Services</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {analyticsData.performanceMetrics.map((metric) => (
                            <TableRow key={metric.compressor_id} className={settings.darkMode ? 'hover:bg-slate-800' : ''}>
                              <TableCell className="font-medium">{metric.compressor_name}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${
                                    metric.avg_efficiency >= 80 ? 'bg-green-500' :
                                    metric.avg_efficiency >= 60 ? 'bg-blue-500' :
                                    metric.avg_efficiency >= 40 ? 'bg-orange-500' : 'bg-red-500'
                                  }`} />
                                  <span>{metric.avg_efficiency}%</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                {metric.avg_daily_running_hours.toFixed(1)}h /
                                {metric.avg_daily_loaded_hours.toFixed(1)}h
                              </TableCell>
                              <TableCell>
                                {metric.total_running_hours.toFixed(1)}h /
                                {metric.total_loaded_hours.toFixed(1)}h
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className="w-16 bg-gray-200 rounded-full h-2">
                                    <div 
                                      className="bg-red-500 h-2 rounded-full" 
                                      style={{ width: `${metric.downtime_percentage}%` }}
                                    />
                                  </div>
                                  <span>{metric.downtime_percentage.toFixed(1)}%</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{metric.service_count}</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-8">
                        <BarChart3 className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                        <p className="text-slate-500">No performance data available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Trend Analysis */}
                <Card className={settings.darkMode ? 'bg-slate-800 border-slate-700' : ''}>
                  <CardHeader>
                    <CardTitle>Trend Analysis</CardTitle>
                    <CardDescription className={settings.darkMode ? 'text-slate-400' : ''}>
                      Performance trends over time
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {analyticsData.trends.success && analyticsData.trends.data && analyticsData.trends.data.length > 0 ? (
                      <div className="space-y-4">
                        {analyticsData.trends.data.slice(0, 5).map((trend, index) => (
                          <div key={index} className={`p-4 border rounded-lg ${
                            settings.darkMode ? 'border-slate-700' : ''
                          }`}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="font-medium">{trend.compressor_name}</div>
                              <Badge className={
                                trend.efficiency_trend === 'improving' ? 'bg-green-100 text-green-800' :
                                trend.efficiency_trend === 'declining' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }>
                                {trend.efficiency_trend === 'improving' ? '↑ Improving' :
                                 trend.efficiency_trend === 'declining' ? '↓ Declining' : '→ Stable'}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <div className={`text-xs ${settings.darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Efficiency</div>
                                <div className="font-semibold">{trend.avg_efficiency}%</div>
                              </div>
                              <div>
                                <div className={`text-xs ${settings.darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Running Hours</div>
                                <div className="font-semibold">{trend.total_running_hours?.toFixed(1) || 0}h</div>
                              </div>
                              <div>
                                <div className={`text-xs ${settings.darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Loaded Hours</div>
                                <div className="font-semibold">{trend.total_loaded_hours?.toFixed(1) || 0}h</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <TrendingUp className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                        <p className="text-slate-500">
                          {analyticsData.trends.message || 
                            "No trend data available yet. Add daily readings for at least 7 days to see trends."}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Comparison and Insights */}
              <div className="space-y-6">
                {/* Comparison Analytics */}
                <Card className={settings.darkMode ? 'bg-slate-800 border-slate-700' : ''}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Comparison</CardTitle>
                      <Select value={analyticsMetric} onValueChange={(value) => {
                        setAnalyticsMetric(value);
                        fetchComparisonAnalytics(value);
                      }}>
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Metric" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="efficiency">Efficiency</SelectItem>
                          <SelectItem value="running_hours">Running Hours</SelectItem>
                          <SelectItem value="loaded_hours">Loaded Hours</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {analyticsData.comparison.success && analyticsData.comparison.data && analyticsData.comparison.data.length > 0 ? (
                      analyticsData.comparison.data.slice(0, 5).map((item, index) => (
                        <div key={item.compressor_id} className={`flex items-center justify-between p-3 border rounded-lg ${
                          settings.darkMode ? 'border-slate-700' : ''
                        }`}>
                          <div>
                            <div className="font-medium">{item.compressor_name}</div>
                            <div className={`text-xs ${settings.darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{item.location}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">{item.value}{analyticsMetric === 'efficiency' ? '%' : 'h'}</div>
                            <Badge variant="outline" className={
                              item.rating === 'Excellent' ? 'bg-green-100 text-green-800' :
                              item.rating === 'Good' ? 'bg-blue-100 text-blue-800' :
                              item.rating === 'Fair' ? 'bg-orange-100 text-orange-800' :
                              'bg-red-100 text-red-800'
                            }>
                              {item.rating}
                            </Badge>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-slate-500">{analyticsData.comparison.message || 'No comparison data available'}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Key Insights */}
                <Card className={settings.darkMode ? 'bg-slate-800 border-slate-700' : ''}>
                  <CardHeader>
                    <CardTitle>Key Insights</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {analyticsData.performanceMetrics.length > 0 && (
                      <>
                        {/* Best Performer */}
                        {(() => {
                          const best = [...analyticsData.performanceMetrics]
                            .sort((a, b) => b.avg_efficiency - a.avg_efficiency)[0];
                          if (best) return (
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-200 dark:border-green-800">
                              <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                              <div>
                                <div className="font-semibold text-green-600 dark:text-green-400">Best Performer</div>
                                <div className="text-sm text-slate-600 dark:text-slate-400">
                                  {best.compressor_name} ({best.avg_efficiency}% efficiency)
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Most Active */}
                        {(() => {
                          const mostActive = [...analyticsData.performanceMetrics]
                            .sort((a, b) => b.total_running_hours - a.total_running_hours)[0];
                          if (mostActive) return (
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-200 dark:border-blue-800">
                              <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                              <div>
                                <div className="font-semibold text-blue-600 dark:text-blue-400">Most Active</div>
                                <div className="text-sm text-slate-600 dark:text-slate-400">
                                  {mostActive.compressor_name} ({mostActive.total_running_hours}h total)
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Needs Attention */}
                        {(() => {
                          const needsAttention = analyticsData.performanceMetrics
                            .filter(m => m.downtime_percentage > 20 || m.avg_efficiency < 40);
                          if (needsAttention.length > 0) return (
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-500/10 border border-orange-200 dark:border-orange-800">
                              <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                              <div>
                                <div className="font-semibold text-orange-600 dark:text-orange-400">Needs Attention</div>
                                <div className="text-sm text-slate-600 dark:text-slate-400">
                                  {needsAttention.length} compressor{needsAttention.length > 1 ? 's' : ''} need maintenance
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Export Options */}
                <Card className={settings.darkMode ? 'bg-slate-800 border-slate-700' : ''}>
                  <CardHeader>
                    <CardTitle>Export Analytics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button onClick={generateCSVReport} className="w-full justify-start" variant="outline">
                      <FileText className="w-4 h-4 mr-2" />
                      Export to CSV
                    </Button>
                    <Button 
                      onClick={() => {
                        const data = {
                          performanceMetrics: analyticsData.performanceMetrics,
                          trends: analyticsData.trends,
                          comparison: analyticsData.comparison,
                          exportDate: new Date().toISOString()
                        };
                        const dataStr = JSON.stringify(data, null, 2);
                        const blob = new Blob([dataStr], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `analytics-export-${new Date().toISOString().split('T')[0]}.json`;
                        link.click();
                        toast.success('Analytics data exported');
                      }}
                      className="w-full justify-start" 
                      variant="outline"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export to JSON
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Management Tab */}
          <TabsContent value="management">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* System Summary */}
              <Card className={settings.darkMode ? 'bg-slate-800 border-slate-700' : ''}>
                <CardHeader>
                  <CardTitle>System Summary</CardTitle>
                  <CardDescription className={settings.darkMode ? 'text-slate-400' : ''}>
                    Overall system status and statistics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {managementData.summary ? (
                    <div className="space-y-6">
                      {/* Status Distribution */}
                      <div>
                        <h4 className="font-semibold mb-3">Status Distribution</h4>
                        <div className="grid grid-cols-2 gap-3">
                          {Object.entries(managementData.summary.status_distribution).map(([status, count]) => {
                            const config = STATUS_CONFIG[status];
                            if (!config) return null;
                            const IconComponent = config.icon;
                            return (
                              <div key={status} className={`p-3 rounded-lg ${config.color}`}>
                                <div className="flex items-center gap-2">
                                  <IconComponent className="w-5 h-5" />
                                  <div>
                                    <div className="text-xl font-bold">{count}</div>
                                    <div className="text-sm">{config.label}</div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Location Distribution */}
                      <div>
                        <h4 className="font-semibold mb-3">Location Distribution</h4>
                        <div className="space-y-2">
                          {Object.entries(managementData.summary.location_distribution).map(([location, count]) => (
                            <div key={location} className="flex items-center justify-between">
                              <span className="text-sm">{location}</span>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">{count}</span>
                                <div className="w-32 bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="bg-blue-500 h-2 rounded-full" 
                                    style={{ width: `${(count / (managementData.summary?.total_compressors ?? 1)) * 100}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Age Distribution */}
                      <div>
                        <h4 className="font-semibold mb-3">Age Distribution</h4>
                        <div className="grid grid-cols-4 gap-2">
                          <div className="text-center">
                            <div className="text-lg font-bold">{managementData.summary.age_distribution.less_than_year || 0}</div>
                            <div className={`text-xs ${settings.darkMode ? 'text-slate-400' : 'text-slate-500'}`}>&lt; 1 year</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold">{managementData.summary.age_distribution["1_3_years"] || 0}</div>
                            <div className={`text-xs ${settings.darkMode ? 'text-slate-400' : 'text-slate-500'}`}>1-3 years</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold">{managementData.summary.age_distribution["3_5_years"] || 0}</div>
                            <div className={`text-xs ${settings.darkMode ? 'text-slate-400' : 'text-slate-500'}`}>3-5 years</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold">{managementData.summary.age_distribution.more_than_5 || 0}</div>
                            <div className={`text-xs ${settings.darkMode ? 'text-slate-400' : 'text-slate-500'}`}>&gt; 5 years</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Settings className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-500">Loading management data...</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <div className="space-y-6">
                {/* Recent Alerts */}
                <Card className={settings.darkMode ? 'bg-slate-800 border-slate-700' : ''}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Recent Alerts</CardTitle>
                      <Badge variant="outline" className={
                        (managementData.summary?.unread_alerts ?? 0) > 0 ? 'bg-red-100 text-red-800' : ''
                      }>
                        {managementData.summary?.unread_alerts || 0} unread
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {managementData.summary?.recent_alerts && managementData.summary.recent_alerts.length > 0 ? (
                      <div className="space-y-3">
                        {managementData.summary.recent_alerts.slice(0, 5).map((alert) => (
                          <div key={alert.id} className={`p-3 rounded-lg border ${
                            alert.severity === 'critical' ? 'border-red-200 bg-red-50 dark:bg-red-900/20' :
                            alert.severity === 'error' ? 'border-orange-200 bg-orange-50 dark:bg-orange-900/20' :
                            'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20'
                          }`}>
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="font-medium">{alert.title}</div>
                                <div className="text-sm text-slate-600">{alert.message}</div>
                              </div>
                              {!alert.is_read && (
                                <Badge variant="outline" className="bg-red-100 text-red-800">New</Badge>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 mt-2">
                              {new Date(alert.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                        <p className="text-slate-500">No recent alerts</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Recent Services */}
                <Card className={settings.darkMode ? 'bg-slate-800 border-slate-700' : ''}>
                  <CardHeader>
                    <CardTitle>Recent Services</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {managementData.summary?.recent_services && managementData.summary.recent_services.length > 0 ? (
                      <div className="space-y-3">
                        {managementData.summary.recent_services.slice(0, 5).map((service) => (
                          <div key={service.id} className={`p-3 border rounded-lg ${
                            settings.darkMode ? 'border-slate-700' : ''
                          }`}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="font-medium">{service.service_type}</div>
                              <Badge variant="outline" className="bg-green-100 text-green-800">
                                Completed
                              </Badge>
                            </div>
                            <div className="text-sm text-slate-600 mb-1">{service.description}</div>
                            <div className="flex items-center justify-between text-xs text-slate-500">
                              <span>{service.service_date}</span>
                              <span>{service.running_hours_at_service}h</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <Wrench className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <p className="text-slate-500">No recent services</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* System Actions */}
                <Card className={settings.darkMode ? 'bg-slate-800 border-slate-700' : ''}>
                  <CardHeader>
                    <CardTitle>System Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button onClick={loadAllData} className="w-full justify-start" variant="outline">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh All Data
                    </Button>
                    <Button onClick={generateCSVReport} className="w-full justify-start" variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Export System Report
                    </Button>
                    <Button 
                      onClick={() => {
                        const data = {
                          compressors,
                          stats,
                          upcomingServices,
                          analytics: analyticsData,
                          management: managementData,
                          exportDate: new Date().toISOString()
                        };
                        const dataStr = JSON.stringify(data, null, 2);
                        const blob = new Blob([dataStr], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `system-backup-${new Date().toISOString().split('T')[0]}.json`;
                        link.click();
                        toast.success('System backup exported');
                      }}
                      className="w-full justify-start" 
                      variant="outline"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Backup System Data
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className={`mt-8 text-center text-sm ${settings.darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          <p>Connected to backend API at {API_BASE_URL}</p>
          <p className="mt-1">Total Compressors: {compressors.length} • Last Updated: {new Date().toLocaleTimeString()}</p>
        </div>

      {/* Status Update Dialog */}
      <StatusUpdateDialog />
      </main>
    </PageShell>
  );
};

export default CompressorReadingsSystem;
