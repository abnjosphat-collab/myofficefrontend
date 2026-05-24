// app/breakdowns/page.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback, Fragment } from 'react';
import { PageShell } from "@/components/PageShell";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  Edit,
  Filter,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  TrendingUp,
  Wrench,
  X,
  Calendar,
  Eye,
  AlertTriangle,
  Activity,
  Grid,
  List,
  Package,
  Timer,
  MapPin,
  Building,
  Zap,
  ChevronDown,
  ChevronUp,
  User,
  Clock4,
  Printer,
  TrendingDown,
  Maximize2,
  Minimize2,
  PlayCircle,
  PauseCircle,
  CheckCheck,
  Clock as ClockIcon,
  Calendar as CalendarIcon,
  Building as BuildingIcon,
  User as UserIcon,
  TimerOff,
  Shield,
  ToolCase,
  Wind,
  EyeOff,
  FilterX,
  LayoutGrid,
  Table as TableIcon,
  ChevronRight,
} from 'lucide-react';

// shadcn/ui imports
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast, Toaster } from 'sonner';
import { format } from "date-fns";

// API Configuration
const getApiBase = (): string => {
  return process.env.NEXT_PUBLIC_API_URL || 'https://myofficebackend.onrender.com';
};

const API_BASE = getApiBase();
const BREAKDOWN_API = `${API_BASE}/api/breakdowns`;

// Utility function to test if backend is available
const isBackendAvailable = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${BREAKDOWN_API}/health/check`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      mode: 'cors',
      signal: AbortSignal.timeout(3000)
    });
    return response.ok;
  } catch {
    return false;
  }
};

// Type Definitions
interface StatusType {
  name: string;
  color: string;
  icon: React.ElementType;
  gradient: string;
  bgColor: string;
  textColor: string;
  iconColor: string;
}

interface PriorityType {
  name: string;
  color: string;
  icon: React.ElementType;
  gradient: string;
  bgColor: string;
  textColor: string;
  iconColor: string;
}

interface BreakdownType {
  name: string;
  color: string;
  icon: React.ElementType;
  gradient: string;
  bgColor: string;
  textColor: string;
  iconColor: string;
}

interface SparePart {
  name: string;
  quantity: number;
  part_number?: string;
  unit_price: number;
  total_cost: number;
}

interface SpareUsed {
  part_number?: string;
  description?: string;
  qty?: number;
  unit?: string;
  cost?: number;
  name?: string;
  quantity?: number;
  unit_price?: number;
  total_cost?: number;
}

interface Breakdown {
  id: number;
  breakdown_uid?: string;
  machine_id: string;
  machine_name: string;
  machine_description?: string;
  artisan_name: string;
  department: string;
  location: string;
  breakdown_date: string;
  breakdown_type: string;
  work_done?: string;
  artisan_recommendations?: string;
  status: string;
  priority: string;
  breakdown_start?: string;
  breakdown_end?: string;
  work_start?: string;
  work_end?: string;
  response_time_minutes?: number;
  repair_time_minutes?: number;
  downtime_minutes?: number;
  net_downtime_minutes?: number;
  total_spare_cost?: number;
  created_at?: string;
  updated_at?: string;
  breakdown_description?: string;
  spares_used?: SparePart[] | string;
}

interface BreakdownFormData {
  machine_id: string;
  machine_name: string;
  breakdown_description: string;
  machine_description?: string;
  artisan_name: string;
  breakdown_date: string;
  location: string;
  department: string;
  breakdown_type: string;
  work_done: string;
  artisan_recommendations: string;
  status: string;
  priority: string;
  breakdown_start: string;
  breakdown_end: string;
  work_start: string;
  work_end: string;
  spares_used: SparePart[];
}

interface Filters {
  status: string;
  breakdown_type: string;
  priority: string;
  department: string;
  location: string;
  artisan_name: string;
  machine_name: string;
}

interface Metrics {
  total_breakdowns: number;
  active_breakdowns: number;
  avg_resolution_hours: number;
  total_cost: number;
  trend_total: number;
  critical_priority: number;
  week_breakdowns: number;
  open_breakdowns: number;
  total_downtime_hours: number;
  avg_downtime_hours: number;
  efficiency_score: number;
  resolved_this_week: number;
}

// Enhanced Configuration constants
const STATUS_TYPES: Record<string, StatusType> = {
  logged: { 
    name: 'Logged', 
    color: 'bg-blue-50 text-blue-700 border-blue-200', 
    icon: ClockIcon,
    gradient: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-500',
    textColor: 'text-blue-700',
    iconColor: 'text-blue-500'
  },
  in_progress: { 
    name: 'In Progress', 
    color: 'bg-amber-50 text-amber-700 border-amber-200', 
    icon: PlayCircle,
    gradient: 'from-amber-500 to-amber-600',
    bgColor: 'bg-amber-500',
    textColor: 'text-amber-700',
    iconColor: 'text-amber-500'
  },
  resolved: { 
    name: 'Resolved', 
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200', 
    icon: CheckCheck,
    gradient: 'from-emerald-500 to-emerald-600',
    bgColor: 'bg-emerald-500',
    textColor: 'text-emerald-700',
    iconColor: 'text-emerald-500'
  },
  closed: { 
    name: 'Closed', 
    color: 'bg-slate-50 text-slate-700 border-slate-200', 
    icon: CheckCircle,
    gradient: 'from-slate-500 to-slate-600',
    bgColor: 'bg-slate-500',
    textColor: 'text-slate-700',
    iconColor: 'text-slate-500'
  },
  cancelled: { 
    name: 'Cancelled', 
    color: 'bg-rose-50 text-rose-700 border-rose-200', 
    icon: X,
    gradient: 'from-rose-500 to-rose-600',
    bgColor: 'bg-rose-500',
    textColor: 'text-rose-700',
    iconColor: 'text-rose-500'
  }
};

const PRIORITY_TYPES: Record<string, PriorityType> = {
  critical: { 
    name: 'Critical', 
    color: 'bg-rose-50 text-rose-700 border-rose-200', 
    icon: AlertCircle,
    gradient: 'from-rose-500 to-rose-600',
    bgColor: 'bg-rose-500',
    textColor: 'text-rose-700',
    iconColor: 'text-rose-500'
  },
  high: { 
    name: 'High', 
    color: 'bg-orange-50 text-orange-700 border-orange-200', 
    icon: AlertTriangle,
    gradient: 'from-orange-500 to-orange-600',
    bgColor: 'bg-orange-500',
    textColor: 'text-orange-700',
    iconColor: 'text-orange-500'
  },
  medium: { 
    name: 'Medium', 
    color: 'bg-amber-50 text-amber-700 border-amber-200', 
    icon: Clock,
    gradient: 'from-amber-500 to-amber-600',
    bgColor: 'bg-amber-500',
    textColor: 'text-amber-700',
    iconColor: 'text-amber-500'
  },
  low: { 
    name: 'Low', 
    color: 'bg-blue-50 text-blue-700 border-blue-200', 
    icon: Clock4,
    gradient: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-500',
    textColor: 'text-blue-700',
    iconColor: 'text-blue-500'
  }
};

const BREAKDOWN_TYPES: Record<string, BreakdownType> = {
  mechanical: { 
    name: 'Mechanical', 
    color: 'bg-slate-50 text-slate-700 border-slate-200', 
    icon: Wrench,
    gradient: 'from-slate-500 to-slate-600',
    bgColor: 'bg-slate-500',
    textColor: 'text-slate-700',
    iconColor: 'text-slate-500'
  },
  electrical: { 
    name: 'Electrical', 
    color: 'bg-yellow-50 text-yellow-700 border-yellow-200', 
    icon: Zap,
    gradient: 'from-yellow-500 to-yellow-600',
    bgColor: 'bg-yellow-500',
    textColor: 'text-yellow-700',
    iconColor: 'text-yellow-500'
  },
  hydraulic: { 
    name: 'Hydraulic', 
    color: 'bg-blue-50 text-blue-700 border-blue-200', 
    icon: Activity,
    gradient: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-500',
    textColor: 'text-blue-700',
    iconColor: 'text-blue-500'
  },
  pneumatic: { 
    name: 'Pneumatic', 
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200', 
    icon: Wind,
    gradient: 'from-indigo-500 to-indigo-600',
    bgColor: 'bg-indigo-500',
    textColor: 'text-indigo-700',
    iconColor: 'text-indigo-500'
  },
  electronic: { 
    name: 'Electronic', 
    color: 'bg-purple-50 text-purple-700 border-purple-200', 
    icon: Shield,
    gradient: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-500',
    textColor: 'text-purple-700',
    iconColor: 'text-purple-500'
  },
  other: { 
    name: 'Other', 
    color: 'bg-gray-50 text-gray-700 border-gray-200', 
    icon: ToolCase,
    gradient: 'from-gray-500 to-gray-600',
    bgColor: 'bg-gray-500',
    textColor: 'text-gray-700',
    iconColor: 'text-gray-500'
  }
};

const DEPARTMENTS: string[] = ['Maintenance', 'Production', 'Engineering', 'Quality', 'Safety', 'Operations'];
const ARTISANS: string[] = ['John Doe', 'Jane Smith', 'Mike Johnson', 'Sarah Williams', 'Robert Brown', 'Emily Davis', 'David Wilson', 'Lisa Anderson', 'James Taylor', 'Patricia Martinez'];
const MACHINES: string[] = ['CNC Machine', 'Conveyor Belt', 'Compressor', 'Pump', 'Forklift', 'Generator', 'Mixer', 'Dryer', 'Press', 'Extruder'];

// Helper Functions
const timeToMinutes = (timeStr: string): number => {
  if (!timeStr) return 0;
  try {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  } catch {
    return 0;
  }
};

const minutesToDisplay = (minutes: number): { minutes: number; hours: number; display: string; decimal: number } => {
  if (!minutes && minutes !== 0) return { minutes: 0, hours: 0, display: '0m', decimal: 0.0 };
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const decimal = parseFloat((minutes / 60).toFixed(2));
  
  let display = '';
  if (hours > 0) {
    display = `${hours}h ${mins > 0 ? `${mins}m` : ''}`.trim();
  } else {
    display = `${mins}m`;
  }
  
  return {
    minutes,
    hours,
    display,
    decimal
  };
};

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A';
  try {
    return format(new Date(dateString), 'MMM dd, yyyy');
  } catch {
    return 'Invalid Date';
  }
};

const formatTime = (timeString: string | null | undefined): string => {
  if (!timeString) return '—';
  if (timeString.includes(':')) {
    const parts = timeString.split(':');
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  }
  return timeString;
};

const calculateDowntime = (breakdownStart: string | undefined, breakdownEnd: string | undefined): number => {
  if (!breakdownStart || !breakdownEnd) return 0;
  try {
    const startTime = timeToMinutes(breakdownStart);
    const endTime = timeToMinutes(breakdownEnd);
    const downtime = endTime >= startTime ? endTime - startTime : (endTime + 1440) - startTime;
    return Math.max(0, downtime);
  } catch {
    return 0;
  }
};

const calculateTimeDifference = (startTime: string | undefined, endTime: string | undefined): number => {
  if (!startTime || !endTime) return 0;
  try {
    const start = timeToMinutes(startTime);
    const end = timeToMinutes(endTime);
    return end >= start ? end - start : (end + 1440) - start;
  } catch {
    return 0;
  }
};

const calculateTotalDowntime = (breakdowns: Breakdown[]): number => {
  if (!breakdowns || !Array.isArray(breakdowns)) return 0;
  return breakdowns.reduce((total, breakdown) => {
    const downtime = calculateDowntime(breakdown.breakdown_start, breakdown.breakdown_end);
    return total + downtime;
  }, 0);
};

// Get the numeric ID from breakdown
const getBreakdownId = (breakdown: Breakdown): number => {
  if (!breakdown) {
    console.warn('getBreakdownId called with null/undefined breakdown');
    return 0;
  }
  
  if (breakdown.id && typeof breakdown.id === 'number') {
    return breakdown.id;
  }
  
  if (breakdown.id && typeof breakdown.id === 'string' && /^\d+$/.test(breakdown.id)) {
    return parseInt(breakdown.id, 10);
  }
  
  console.error('Could not find numeric ID in breakdown:', breakdown);
  return 0;
};

// API Functions
const fetchBreakdowns = async (filters: Record<string, string> = {}): Promise<Breakdown[]> => {
  try {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'all' && value !== '') {
        params.append(key, String(value));
      }
    });

    const url = `${BREAKDOWN_API}/get-breakdowns?${params.toString()}`;
    console.log('Fetching breakdowns from:', url);
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      mode: 'cors',
      cache: 'no-cache'
    });
    
    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    console.log('Raw API response:', data);
    
    let breakdowns = [];
    if (Array.isArray(data)) {
      breakdowns = data;
    } else if (data.data && Array.isArray(data.data)) {
      breakdowns = data.data;
    } else if (data.breakdowns && Array.isArray(data.breakdowns)) {
      breakdowns = data.breakdowns;
    } else if (data.results && Array.isArray(data.results)) {
      breakdowns = data.results;
    } else {
      console.warn('Unexpected API response format:', data);
      breakdowns = [];
    }
    
    if (breakdowns.length > 0) {
      console.log('First breakdown:', breakdowns[0]);
    }
    
    return breakdowns;
  } catch (error) {
    console.error('Error fetching breakdowns:', error);
    return [];
  }
};

const calculateMetricsFromBreakdowns = (breakdowns: Breakdown[]): Metrics => {
  if (!breakdowns || !Array.isArray(breakdowns)) {
    return {
      total_breakdowns: 0,
      active_breakdowns: 0,
      avg_resolution_hours: 0,
      total_cost: 0,
      trend_total: 0,
      critical_priority: 0,
      week_breakdowns: 0,
      open_breakdowns: 0,
      total_downtime_hours: 0,
      avg_downtime_hours: 0,
      efficiency_score: 0,
      resolved_this_week: 0
    };
  }

  const total_breakdowns = breakdowns.length;
  const active_breakdowns = breakdowns.filter(b => b.status === 'logged' || b.status === 'in_progress').length;
  const critical_priority = breakdowns.filter(b => b.priority === 'critical').length;
  
  const total_cost = breakdowns.reduce((total, b) => {
    if (b.spares_used && Array.isArray(b.spares_used)) {
      const spareCost = (b.spares_used as SparePart[]).reduce((sum: number, spare: SparePart) => {
        return sum + (parseFloat(spare.total_cost.toString()) || 0);
      }, 0);
      return total + spareCost;
    }
    return total;
  }, 0);
  
  const total_downtime_minutes = calculateTotalDowntime(breakdowns);
  const total_downtime_hours = total_downtime_minutes / 60;
  
  const resolvedBreakdowns = breakdowns.filter(b => b.status === 'resolved' || b.status === 'closed');
  let avg_resolution_hours = 0;
  let avg_downtime_hours = 0;
  
  if (resolvedBreakdowns.length > 0) {
    const resolvedDowntime = calculateTotalDowntime(resolvedBreakdowns);
    avg_resolution_hours = parseFloat((resolvedDowntime / 60 / resolvedBreakdowns.length).toFixed(1));
    avg_downtime_hours = parseFloat((total_downtime_hours / breakdowns.length).toFixed(1));
  }
  
  const today = new Date();
  const oneWeekAgo = new Date(today);
  oneWeekAgo.setDate(today.getDate() - 7);
  
  const thisWeekBreakdowns = breakdowns.filter(b => {
    if (!b.breakdown_date) return false;
    const breakdownDate = new Date(b.breakdown_date);
    return breakdownDate >= oneWeekAgo && breakdownDate <= today;
  });
  
  const resolved_this_week = thisWeekBreakdowns.filter(b => b.status === 'resolved' || b.status === 'closed').length;
  
  const lastWeekBreakdowns = breakdowns.filter(b => {
    if (!b.breakdown_date) return false;
    const twoWeeksAgo = new Date(oneWeekAgo);
    twoWeeksAgo.setDate(oneWeekAgo.getDate() - 7);
    const breakdownDate = new Date(b.breakdown_date);
    return breakdownDate >= twoWeeksAgo && breakdownDate < oneWeekAgo;
  }).length;
  
  const trend_total = lastWeekBreakdowns > 0 ? Math.round(((thisWeekBreakdowns.length - lastWeekBreakdowns) / lastWeekBreakdowns) * 100) : 0;
  const efficiency_score = resolvedBreakdowns.length > 0 ? Math.min(100, Math.round((100 - (avg_resolution_hours / 24 * 10)))) : 100;

  return {
    total_breakdowns,
    active_breakdowns,
    critical_priority,
    total_cost,
    avg_resolution_hours,
    trend_total,
    week_breakdowns: thisWeekBreakdowns.length,
    open_breakdowns: active_breakdowns,
    total_downtime_hours: parseFloat(total_downtime_hours.toFixed(1)),
    avg_downtime_hours: parseFloat(avg_downtime_hours.toFixed(1)),
    efficiency_score,
    resolved_this_week
  };
};

const createBreakdown = async (breakdownData: BreakdownFormData): Promise<any> => {
  try {
    const cleanData = { 
      machine_id: breakdownData.machine_id || '',
      machine_name: breakdownData.machine_name || '',
      breakdown_description: breakdownData.breakdown_description || '',
      machine_description: breakdownData.breakdown_description || '',
      artisan_name: breakdownData.artisan_name || '',
      breakdown_date: breakdownData.breakdown_date || new Date().toISOString().split('T')[0],
      location: breakdownData.location || '',
      department: breakdownData.department || '',
      breakdown_type: breakdownData.breakdown_type || 'mechanical',
      work_done: breakdownData.work_done || '',
      artisan_recommendations: breakdownData.artisan_recommendations || '',
      status: breakdownData.status || 'logged',
      priority: breakdownData.priority || 'medium',
      breakdown_start: breakdownData.breakdown_start || '',
      breakdown_end: breakdownData.breakdown_end || '',
      work_start: breakdownData.work_start || '',
      work_end: breakdownData.work_end || '',
      spares_used: breakdownData.spares_used || []
    };
    
    if (!Array.isArray(cleanData.spares_used)) {
      cleanData.spares_used = [];
    }
    
    cleanData.spares_used = cleanData.spares_used.map((spare: SpareUsed) => ({
      name: spare.name || '',
      quantity: spare.quantity || 1,
      part_number: spare.part_number || '',
      unit_price: spare.unit_price || 0,
      total_cost: (spare.quantity || 1) * (spare.unit_price || 0)
    }));
    
    const response = await fetch(`${BREAKDOWN_API}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cleanData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating breakdown:', error);
    throw error;
  }
};

const updateBreakdown = async (breakdownId: number, breakdownData: BreakdownFormData): Promise<any> => {
  try {
    if (!breakdownId || breakdownId === 0) {
      throw new Error('Invalid breakdown ID: ID must be a positive number');
    }
    
    const cleanData = { 
      machine_id: breakdownData.machine_id || '',
      machine_name: breakdownData.machine_name || '',
      breakdown_description: breakdownData.breakdown_description || '',
      machine_description: breakdownData.breakdown_description || '',
      artisan_name: breakdownData.artisan_name || '',
      breakdown_date: breakdownData.breakdown_date || '',
      location: breakdownData.location || '',
      department: breakdownData.department || '',
      breakdown_type: breakdownData.breakdown_type || 'mechanical',
      work_done: breakdownData.work_done || '',
      artisan_recommendations: breakdownData.artisan_recommendations || '',
      status: breakdownData.status || 'logged',
      priority: breakdownData.priority || 'medium',
      breakdown_start: breakdownData.breakdown_start || '',
      breakdown_end: breakdownData.breakdown_end || '',
      work_start: breakdownData.work_start || '',
      work_end: breakdownData.work_end || '',
      spares_used: breakdownData.spares_used || []
    };
    
    if (!Array.isArray(cleanData.spares_used)) {
      cleanData.spares_used = [];
    }
    
    cleanData.spares_used = cleanData.spares_used.map((spare: SpareUsed) => ({
      name: spare.name || '',
      quantity: spare.quantity || 1,
      part_number: spare.part_number || '',
      unit_price: spare.unit_price || 0,
      total_cost: (spare.quantity || 1) * (spare.unit_price || 0)
    }));
    
    const url = `${BREAKDOWN_API}/${breakdownId}`;
    console.log('Updating breakdown at:', url, 'with ID:', breakdownId);
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cleanData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `Failed to update breakdown: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error updating breakdown:', error);
    throw error;
  }
};

const deleteBreakdown = async (breakdownId: number): Promise<any> => {
  try {
    if (!breakdownId || breakdownId === 0) {
      throw new Error('Invalid breakdown ID: ID must be a positive number');
    }
    
    const url = `${BREAKDOWN_API}/${breakdownId}`;
    console.log('Attempting DELETE at:', url);
    console.log('Using numeric ID:', breakdownId, 'type:', typeof breakdownId);
    
    const response = await fetch(url, { 
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('Delete response status:', response.status);
    
    if (response.status === 204) {
      return { success: true };
    }
    
    if (response.ok) {
      const text = await response.text();
      if (text) {
        try {
          return JSON.parse(text);
        } catch {
          return { success: true };
        }
      }
      return { success: true };
    }
    
    const errorText = await response.text();
    throw new Error(errorText || `Delete failed with status: ${response.status}`);
  } catch (error) {
    console.error('Error deleting breakdown:', error);
    throw error;
  }
};

// Status Badge Component
const StatusBadge = ({ status, size = 'sm' }: { status: string; size?: 'xs' | 'sm' }) => {
  const statusConfig = STATUS_TYPES[status] || STATUS_TYPES.logged;
  const Icon = statusConfig.icon;
  const sizeClasses = size === 'xs' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';
  
  return (
    <Badge className={`${sizeClasses} font-medium border ${statusConfig.color} bg-opacity-100`}>
      <Icon className="h-3 w-3 mr-1" />
      {statusConfig.name}
    </Badge>
  );
};

const PriorityBadge = ({ priority, size = 'sm' }: { priority: string; size?: 'xs' | 'sm' }) => {
  const priorityConfig = PRIORITY_TYPES[priority] || PRIORITY_TYPES.medium;
  const Icon = priorityConfig.icon;
  const sizeClasses = size === 'xs' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';
  
  return (
    <Badge className={`${sizeClasses} font-medium border ${priorityConfig.color} bg-opacity-100`}>
      <Icon className="h-3 w-3 mr-1" />
      {priorityConfig.name}
    </Badge>
  );
};

const TypeBadge = ({ type, size = 'sm' }: { type: string; size?: 'xs' | 'sm' }) => {
  const typeConfig = BREAKDOWN_TYPES[type] || BREAKDOWN_TYPES.other;
  const Icon = typeConfig.icon;
  const sizeClasses = size === 'xs' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';
  
  return (
    <Badge variant="outline" className={`${sizeClasses} font-medium border ${typeConfig.color} bg-opacity-100`}>
      <Icon className="h-3 w-3 mr-1" />
      {typeConfig.name}
    </Badge>
  );
};

// Metric Card Component
const MetricCard = ({ 
  title, 
  value, 
  icon: Icon, 
  color, 
  description, 
  loading, 
  trend, 
  change 
}: { 
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  description?: string;
  loading?: boolean;
  trend?: number;
  change?: number;
}) => {
  const colorMap: Record<string, string> = {
    blue: 'from-blue-500 to-blue-600',
    amber: 'from-amber-500 to-amber-600',
    emerald: 'from-emerald-500 to-emerald-600',
    purple: 'from-purple-500 to-purple-600',
    rose: 'from-rose-500 to-rose-600',
    gray: 'from-gray-500 to-gray-600'
  };
  const gradient = colorMap[color] || colorMap.blue;

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6">
          <div className="h-8 w-8 bg-gray-200 rounded-lg mb-3"></div>
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-lg transition-all duration-200">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div className={`p-2 rounded-lg bg-gradient-to-br ${gradient} text-white`}>
            <Icon className="h-5 w-5" />
          </div>
          {trend !== undefined && (
            <div className={`px-2 py-1 rounded text-xs font-medium ${trend > 0 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
              {trend > 0 ? '+' : ''}{trend}%
            </div>
          )}
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm font-medium text-gray-600 mt-1">{title}</p>
          {description && <p className="text-xs text-gray-500 mt-2">{description}</p>}
          {change !== undefined && (
            <div className={`mt-2 text-xs flex items-center gap-1 ${change > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {change > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              <span>{Math.abs(change)}% from last week</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Dashboard Metrics Component
const DashboardMetrics = ({ breakdowns, loading, filterDescription }: { breakdowns: Breakdown[]; loading: boolean; filterDescription: string }) => {
  const metrics = useMemo(() => calculateMetricsFromBreakdowns(breakdowns), [breakdowns]);

  const weekChanges = useMemo(() => {
    const today = new Date();
    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(today.getDate() - 7);
    const twoWeeksAgo = new Date(oneWeekAgo);
    twoWeeksAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const thisWeek = breakdowns?.filter(b => {
      if (!b.breakdown_date) return false;
      const date = new Date(b.breakdown_date);
      return date >= oneWeekAgo && date <= today;
    }).length || 0;
    
    const lastWeek = breakdowns?.filter(b => {
      if (!b.breakdown_date) return false;
      const date = new Date(b.breakdown_date);
      return date >= twoWeeksAgo && date < oneWeekAgo;
    }).length || 0;
    
    return {
      breakdowns_change: lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : 0,
    };
  }, [breakdowns]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Overview Statistics</h3>
          <p className="text-sm text-gray-500">{filterDescription}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Breakdowns"
          value={metrics.total_breakdowns || 0}
          icon={AlertTriangle}
          color="blue"
          description="All recorded breakdowns"
          loading={loading}
          trend={weekChanges.breakdowns_change}
          change={weekChanges.breakdowns_change}
        />
        <MetricCard
          title="Active Issues"
          value={metrics.active_breakdowns || 0}
          icon={Clock}
          color="amber"
          description="Requiring attention"
          loading={loading}
        />
        <MetricCard
          title="Avg. Resolution"
          value={metrics.avg_resolution_hours ? `${metrics.avg_resolution_hours}h` : '0h'}
          icon={Timer}
          color="emerald"
          description="Mean time to repair"
          loading={loading}
        />
        <MetricCard
          title="Total Downtime"
          value={metrics.total_downtime_hours ? `${metrics.total_downtime_hours}h` : '0h'}
          icon={TimerOff}
          color="purple"
          description="Total equipment downtime"
          loading={loading}
        />
      </div>
    </div>
  );
};

// Filter Bar Component
const FilterBar = ({ 
  filters, 
  onFilterChange, 
  onRefresh, 
  loading, 
  searchTerm, 
  onSearchChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  showDateRange,
  onToggleDateRange,
  onClearFilters,
  activeFilterCount
}: { 
  filters: Filters; 
  onFilterChange: (name: string, value: string) => void; 
  onRefresh: () => void; 
  loading: boolean; 
  searchTerm: string; 
  onSearchChange: (value: string) => void;
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  showDateRange: boolean;
  onToggleDateRange: () => void;
  onClearFilters: () => void;
  activeFilterCount: number;
}) => {
  return (
    <div className="space-y-3">
      {/* Search + Date Range — always visible */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#6B7B8E]" />
          <Input
            type="text"
            placeholder="Search by machine, artisan, location…"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 text-sm bg-white"
          />
        </div>
        <Button
          variant={showDateRange ? "default" : "outline"}
          size="sm"
          onClick={onToggleDateRange}
          title="Toggle date range filter"
          className={showDateRange ? 'bg-[#2A4D69] text-white' : ''}
        >
          <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
          Date Range
        </Button>
        <Button onClick={onRefresh} disabled={loading} variant="outline" size="sm" title="Refresh breakdown records">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
          Refresh
        </Button>
      </div>

      {/* Date Range Picker */}
      {showDateRange && (
        <div className="rounded-lg border bg-white p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <Label className="text-xs text-[#6B7B8E]">Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => onStartDateChange(e.target.value)} className="mt-1" />
            </div>
            <div className="flex-1">
              <Label className="text-xs text-[#6B7B8E]">End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => onEndDateChange(e.target.value)} className="mt-1" />
            </div>
            <Button variant="ghost" size="sm" onClick={() => {
              const today = new Date();
              const monthAgo = new Date();
              monthAgo.setDate(today.getDate() - 30);
              onStartDateChange(monthAgo.toISOString().split('T')[0]);
              onEndDateChange(today.toISOString().split('T')[0]);
            }}>Last 30 days</Button>
          </div>
        </div>
      )}

      {/* Advanced Filters — collapsed by default */}
      <CollapsibleSection
        title="Advanced Filters"
        description="Filter by status, type, priority, department, artisan, or machine"
        badge={
          activeFilterCount > 0 ? (
            <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#2A4D69] text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          ) : null
        }
      >
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          <div>
            <Label className="text-xs font-medium text-[#6B7B8E]">Status</Label>
            <Select value={filters.status} onValueChange={(v) => onFilterChange('status', v)}>
              <SelectTrigger className="mt-1 h-9 bg-[#F0F5F9]"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.entries(STATUS_TYPES).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-medium text-[#6B7B8E]">Type</Label>
            <Select value={filters.breakdown_type} onValueChange={(v) => onFilterChange('breakdown_type', v)}>
              <SelectTrigger className="mt-1 h-9 bg-[#F0F5F9]"><SelectValue placeholder="All Types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(BREAKDOWN_TYPES).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-medium text-[#6B7B8E]">Priority</Label>
            <Select value={filters.priority} onValueChange={(v) => onFilterChange('priority', v)}>
              <SelectTrigger className="mt-1 h-9 bg-[#F0F5F9]"><SelectValue placeholder="All Priorities" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                {Object.entries(PRIORITY_TYPES).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-medium text-[#6B7B8E]">Department</Label>
            <Select value={filters.department} onValueChange={(v) => onFilterChange('department', v)}>
              <SelectTrigger className="mt-1 h-9 bg-[#F0F5F9]"><SelectValue placeholder="All Depts" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {DEPARTMENTS.map(dept => (<SelectItem key={dept} value={dept}>{dept}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-medium text-[#6B7B8E]">Location</Label>
            <Input
              placeholder="Type location…"
              value={filters.location !== 'all' ? filters.location : ''}
              onChange={(e) => onFilterChange('location', e.target.value || 'all')}
              className="mt-1 h-9 bg-[#F0F5F9]"
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-[#6B7B8E]">Artisan</Label>
            <Select value={filters.artisan_name} onValueChange={(v) => onFilterChange('artisan_name', v)}>
              <SelectTrigger className="mt-1 h-9 bg-[#F0F5F9]"><SelectValue placeholder="All Artisans" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Artisans</SelectItem>
                {ARTISANS.map(art => (<SelectItem key={art} value={art}>{art}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-medium text-[#6B7B8E]">Machine</Label>
            <Select value={filters.machine_name} onValueChange={(v) => onFilterChange('machine_name', v)}>
              <SelectTrigger className="mt-1 h-9 bg-[#F0F5F9]"><SelectValue placeholder="All Machines" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Machines</SelectItem>
                {MACHINES.map(machine => (<SelectItem key={machine} value={machine}>{machine}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {activeFilterCount > 0 && (
          <div className="mt-3 flex justify-end">
            <Button variant="ghost" size="sm" onClick={onClearFilters} className="text-[#6B7B8E] hover:text-[#2A4D69] gap-1">
              <FilterX className="h-3.5 w-3.5" />Clear all filters
            </Button>
          </div>
        )}
      </CollapsibleSection>
    </div>
  );
};

// Breakdown Card Component (Grid View)
const BreakdownCard = ({ 
  breakdown, 
  onView, 
  onEdit, 
  onDelete,
  isExpanded,
  onToggleExpand
}: { 
  breakdown: Breakdown; 
  onView: (breakdown: Breakdown) => void; 
  onEdit: (breakdown: Breakdown) => void; 
  onDelete: (breakdown: Breakdown) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) => {
  const downtime = minutesToDisplay(
    calculateDowntime(breakdown.breakdown_start, breakdown.breakdown_end)
  );
  
  const totalSparesCost = (breakdown.spares_used && Array.isArray(breakdown.spares_used)) 
    ? breakdown.spares_used.reduce((total: number, spare: SpareUsed) => {
        return total + (parseFloat(spare.total_cost?.toString() || '0') || 0);
      }, 0)
    : 0;
  
  const typeConfig = BREAKDOWN_TYPES[breakdown.breakdown_type] || BREAKDOWN_TYPES.other;
  
  return (
    <Card className="group hover:shadow-lg transition-all duration-200 border border-gray-200">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-gray-50 rounded border border-gray-200 group-hover:bg-blue-50 group-hover:border-blue-200 transition-colors">
              <typeConfig.icon className={`h-4 w-4 ${typeConfig.iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-base font-semibold text-gray-900 truncate">{breakdown.machine_name}</h4>
              <p className="text-xs text-gray-500">ID: {breakdown.machine_id}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onToggleExpand}
            title={isExpanded ? "Collapse details" : "Click to view details"}
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
        
        <div className="mb-3">
          <p className="text-sm text-gray-700 line-clamp-2 leading-snug">
            {breakdown.breakdown_description || 'No description available'}
          </p>
        </div>

        <div className="space-y-2 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            <PriorityBadge priority={breakdown.priority} size="xs" />
            <TypeBadge type={breakdown.breakdown_type} size="xs" />
            <StatusBadge status={breakdown.status} size="xs" />
          </div>
          
          <div className="flex flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-gray-600">
              <MapPin className="h-3 w-3" />
              <span className="truncate">{breakdown.location}</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-600">
              <UserIcon className="h-3 w-3" />
              <span className="truncate">{breakdown.artisan_name || 'Unassigned'}</span>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-gray-50 rounded p-2 text-center">
            <div className="text-sm font-semibold text-gray-900">{downtime.display}</div>
            <div className="text-xs text-gray-500">Downtime</div>
          </div>
          <div className="bg-gray-50 rounded p-2 text-center">
            <div className="text-sm font-semibold text-gray-900">${totalSparesCost.toFixed(0)}</div>
            <div className="text-xs text-gray-500">Cost</div>
          </div>
        </div>
        
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-500">Breakdown Start:</span>
                <span className="ml-1 font-medium">{formatTime(breakdown.breakdown_start)}</span>
              </div>
              <div>
                <span className="text-gray-500">Breakdown End:</span>
                <span className="ml-1 font-medium">{formatTime(breakdown.breakdown_end)}</span>
              </div>
              <div>
                <span className="text-gray-500">Work Start:</span>
                <span className="ml-1 font-medium">{formatTime(breakdown.work_start)}</span>
              </div>
              <div>
                <span className="text-gray-500">Work End:</span>
                <span className="ml-1 font-medium">{formatTime(breakdown.work_end)}</span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-500">Department:</span>
                <span className="ml-1 font-medium">{breakdown.department}</span>
              </div>
              {breakdown.work_done && (
                <div className="col-span-2">
                  <span className="text-gray-500">Work Done:</span>
                  <span className="ml-1 font-medium line-clamp-2">{breakdown.work_done}</span>
                </div>
              )}
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-2">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <CalendarIcon className="h-3 w-3" />
            <span>{formatDate(breakdown.breakdown_date)}</span>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-gray-500 hover:text-blue-600"
              onClick={() => onView(breakdown)}
              title="View full details"
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-gray-500 hover:text-amber-600"
              onClick={() => onEdit(breakdown)}
              title="Edit breakdown"
            >
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-gray-500 hover:text-rose-600"
              onClick={() => onDelete(breakdown)}
              title="Delete breakdown"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Breakdown Table Component (List View with Expand)
const BreakdownTable = ({ 
  breakdowns, 
  onView, 
  onEdit, 
  onDelete, 
  sortField, 
  sortDirection, 
  onSort,
  expandedItems,
  onToggleExpand
}: { 
  breakdowns: Breakdown[]; 
  onView: (breakdown: Breakdown) => void; 
  onEdit: (breakdown: Breakdown) => void; 
  onDelete: (breakdown: Breakdown) => void; 
  sortField: string; 
  sortDirection: string; 
  onSort: (field: string) => void;
  expandedItems: Set<string>;
  onToggleExpand: (id: string) => void;
}) => {
  const SortableHeader = ({ field, label }: { field: string; label: string }) => {
    const isActive = sortField === field;
    return (
      <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => onSort(field)}>
        <div className="flex items-center gap-1">
          {label}
          <div className="flex flex-col">
            <ChevronUp className={`h-3 w-3 -mb-1 ${isActive && sortDirection === 'asc' ? 'text-blue-600' : 'text-gray-300'}`} />
            <ChevronDown className={`h-3 w-3 ${isActive && sortDirection === 'desc' ? 'text-blue-600' : 'text-gray-300'}`} />
          </div>
        </div>
      </TableHead>
    );
  };

  if (!breakdowns.length) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-16 h-16 bg-[#F0F5F9] rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="h-8 w-8 text-[#2A4D69]" />
        </div>
        <h3 className="text-lg font-semibold text-[#2A4D69] mb-2">No breakdowns found</h3>
        <p className="text-sm text-[#6B7B8E] mb-4">
          No records match your current search or filters.<br />Try clearing filters, or log a new breakdown using the button above.
        </p>
      </div>
    );
  }

  return (
    <Card className="border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <SortableHeader field="machine_name" label="Machine" />
              <SortableHeader field="breakdown_date" label="Date" />
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Artisan</TableHead>
              <TableHead>Downtime</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {breakdowns.map((breakdown) => {
              const downtime = minutesToDisplay(
                calculateDowntime(breakdown.breakdown_start, breakdown.breakdown_end)
              );
              
              const totalSparesCost = (breakdown.spares_used && Array.isArray(breakdown.spares_used)) 
                ? breakdown.spares_used.reduce((total: number, spare: SpareUsed) => {
                    return total + (parseFloat(spare.total_cost?.toString() || '0') || 0);
                  }, 0)
                : 0;

              const breakdownId = String(breakdown.id);
              const isExpanded = expandedItems.has(breakdownId);

              return (
                <Fragment key={breakdownId}>
                  <TableRow className="hover:bg-gray-50 transition-colors">
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => onToggleExpand(breakdownId)}
                        title="Click to view details"
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {breakdown.machine_name}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {breakdown.machine_id}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-900">{formatDate(breakdown.breakdown_date)}</TableCell>
                    <TableCell><StatusBadge status={breakdown.status} size="xs" /></TableCell>
                    <TableCell><PriorityBadge priority={breakdown.priority} size="xs" /></TableCell>
                    <TableCell><TypeBadge type={breakdown.breakdown_type} size="xs" /></TableCell>
                    <TableCell className="text-sm">{breakdown.artisan_name || '—'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <ClockIcon className="h-3.5 w-3.5 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">{downtime.display}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-medium">${totalSparesCost.toFixed(0)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => onView(breakdown)}
                          title="View details"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => onEdit(breakdown)}
                          title="Edit"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => onDelete(breakdown)}
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  
                  {isExpanded && (
                    <TableRow className="bg-gray-50/50">
                      <TableCell colSpan={10} className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <h5 className="text-sm font-semibold text-gray-700">Breakdown Details</h5>
                            <p className="text-sm text-gray-600 break-words"><span className="text-gray-500">Description:</span> {breakdown.breakdown_description || '—'}</p>
                            <p className="text-sm text-gray-600"><span className="text-gray-500">Location:</span> {breakdown.location}</p>
                            <p className="text-sm text-gray-600"><span className="text-gray-500">Department:</span> {breakdown.department}</p>
                          </div>
                          <div className="space-y-1">
                            <h5 className="text-sm font-semibold text-gray-700">Timing</h5>
                            <p className="text-sm text-gray-600"><span className="text-gray-500">Breakdown:</span> {formatTime(breakdown.breakdown_start)} - {formatTime(breakdown.breakdown_end)}</p>
                            <p className="text-sm text-gray-600"><span className="text-gray-500">Work:</span> {formatTime(breakdown.work_start)} - {formatTime(breakdown.work_end)}</p>
                            <p className="text-sm text-gray-600"><span className="text-gray-500">Total Downtime:</span> {downtime.display}</p>
                          </div>
                          <div className="space-y-1">
                            <h5 className="text-sm font-semibold text-gray-700">Work & Recommendations</h5>
                            <p className="text-sm text-gray-600 break-words"><span className="text-gray-500">Work Done:</span> {breakdown.work_done || '—'}</p>
                            <p className="text-sm text-gray-600 break-words"><span className="text-gray-500">Recommendations:</span> {breakdown.artisan_recommendations || '—'}</p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
};

// Breakdown Details Modal Component
const BreakdownDetailsModal = ({ 
  breakdown, 
  isOpen, 
  onClose, 
  onEdit, 
  onDelete 
}: { 
  breakdown: Breakdown | null; 
  isOpen: boolean; 
  onClose: () => void; 
  onEdit: (breakdown: Breakdown) => void; 
  onDelete: (breakdown: Breakdown) => void;
}) => {
  if (!isOpen || !breakdown) return null;

  const downtime = minutesToDisplay(
    calculateDowntime(breakdown.breakdown_start, breakdown.breakdown_end)
  );
  
  const totalSparesCost = (breakdown.spares_used && Array.isArray(breakdown.spares_used)) 
    ? breakdown.spares_used.reduce((total: number, spare: SpareUsed) => {
        return total + (parseFloat(spare.total_cost?.toString() || '0') || 0);
      }, 0)
    : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{breakdown.machine_name}</DialogTitle>
          <DialogDescription>
            Breakdown ID: {breakdown.id}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={breakdown.status} />
            <PriorityBadge priority={breakdown.priority} />
            <TypeBadge type={breakdown.breakdown_type} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-gray-500">Machine ID</Label>
              <p className="text-sm font-medium">{breakdown.machine_id || '—'}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Artisan</Label>
              <p className="text-sm font-medium">{breakdown.artisan_name || 'Unassigned'}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Location</Label>
              <p className="text-sm font-medium">{breakdown.location || '—'}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Department</Label>
              <p className="text-sm font-medium">{breakdown.department || '—'}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Breakdown Date</Label>
              <p className="text-sm font-medium">{formatDate(breakdown.breakdown_date)}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Total Downtime</Label>
              <p className="text-sm font-medium">{downtime.display}</p>
            </div>
          </div>

          <div>
            <Label className="text-xs text-gray-500">Description</Label>
            <div className="text-sm bg-gray-50 p-3 rounded-md mt-1 whitespace-pre-wrap break-words">
              {breakdown.breakdown_description || 'No description'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-gray-500">Breakdown Start</Label>
              <p className="text-sm font-medium">{formatTime(breakdown.breakdown_start)}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Breakdown End</Label>
              <p className="text-sm font-medium">{formatTime(breakdown.breakdown_end)}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Work Start</Label>
              <p className="text-sm font-medium">{formatTime(breakdown.work_start)}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Work End</Label>
              <p className="text-sm font-medium">{formatTime(breakdown.work_end)}</p>
            </div>
          </div>

          {breakdown.work_done && (
            <div>
              <Label className="text-xs text-gray-500">Work Performed</Label>
              <div className="text-sm bg-gray-50 p-3 rounded-md mt-1 whitespace-pre-wrap break-words">
                {breakdown.work_done}
              </div>
            </div>
          )}

          {breakdown.artisan_recommendations && (
            <div>
              <Label className="text-xs text-gray-500">Recommendations</Label>
              <div className="text-sm bg-gray-50 p-3 rounded-md mt-1 whitespace-pre-wrap break-words">
                {breakdown.artisan_recommendations}
              </div>
            </div>
          )}

          {breakdown.spares_used && Array.isArray(breakdown.spares_used) && breakdown.spares_used.length > 0 && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label className="text-xs text-gray-500">Spare Parts Used</Label>
                <span className="text-sm font-semibold">Total: ${totalSparesCost.toFixed(2)}</span>
              </div>
              <div className="space-y-2">
                {breakdown.spares_used.map((spare: SpareUsed, idx: number) => (
                  <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded-md text-sm">
                    <span>{spare.name} x{spare.quantity}</span>
                    <span className="font-medium">${spare.total_cost?.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button variant="outline" onClick={() => { onEdit(breakdown); onClose(); }}>Edit</Button>
          <Button variant="destructive" onClick={() => { onDelete(breakdown); onClose(); }}>Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Breakdown Form Modal
const BreakdownFormModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  initialData, 
  mode = 'create' 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSubmit: (formData: BreakdownFormData) => Promise<void>; 
  initialData: Breakdown | null; 
  mode?: 'create' | 'edit';
}) => {
  const [formData, setFormData] = useState<BreakdownFormData>({
    machine_id: '',
    machine_name: '',
    breakdown_description: '',
    artisan_name: '',
    breakdown_date: new Date().toISOString().split('T')[0],
    location: '',
    department: '',
    breakdown_type: 'mechanical',
    work_done: '',
    artisan_recommendations: '',
    status: 'logged',
    priority: 'medium',
    breakdown_start: '',
    breakdown_end: '',
    work_start: '',
    work_end: '',
    spares_used: []
  });

  const [spareForm, setSpareForm] = useState({
    name: '',
    part_number: '',
    quantity: 1,
    unit_price: 0
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState('basic');

  useEffect(() => {
    if (initialData) {
      setFormData({
        machine_id: initialData.machine_id || '',
        machine_name: initialData.machine_name || '',
        breakdown_description: initialData.breakdown_description || '',
        artisan_name: initialData.artisan_name || '',
        breakdown_date: initialData.breakdown_date
          ? new Date(initialData.breakdown_date).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        location: initialData.location || '',
        department: initialData.department || '',
        breakdown_type: initialData.breakdown_type || 'mechanical',
        work_done: initialData.work_done || '',
        artisan_recommendations: initialData.artisan_recommendations || '',
        status: initialData.status || 'logged',
        priority: initialData.priority || 'medium',
        breakdown_start: initialData.breakdown_start ?? '',
        breakdown_end: initialData.breakdown_end ?? '',
        work_start: initialData.work_start ?? '',
        work_end: initialData.work_end ?? '',
        spares_used: Array.isArray(initialData.spares_used) ? initialData.spares_used : []
      });
    }
  }, [initialData]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.machine_name.trim()) newErrors.machine_name = 'Machine name is required';
    if (!formData.breakdown_description.trim()) newErrors.breakdown_description = 'Description is required';
    if (!formData.artisan_name.trim()) newErrors.artisan_name = 'Artisan name is required';
    if (!formData.location.trim()) newErrors.location = 'Location is required';
    if (!formData.department) newErrors.department = 'Department is required';
    
    if (formData.breakdown_start && formData.breakdown_end) {
      const start = timeToMinutes(formData.breakdown_start);
      const end = timeToMinutes(formData.breakdown_end);
      if (end < start) {
        newErrors.breakdown_end = 'End time must be after start time';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      await onSubmit(formData);
      onClose();
      toast.success(mode === 'create' ? 'Breakdown created successfully' : 'Breakdown updated successfully');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to save breakdown');
    } finally {
      setLoading(false);
    }
  };

  const addSpare = () => {
    if (!spareForm.name.trim()) {
      setErrors({ ...errors, spare: 'Spare part name is required' });
      return;
    }
    
    const totalCost = spareForm.quantity * spareForm.unit_price;
    const newSpare: SparePart = {
      ...spareForm,
      total_cost: totalCost
    };
    
    setFormData(prev => ({
      ...prev,
      spares_used: [...prev.spares_used, newSpare]
    }));
    
    setSpareForm({ name: '', part_number: '', quantity: 1, unit_price: 0 });
    setErrors({ ...errors, spare: '' });
  };

  const removeSpare = (index: number) => {
    setFormData(prev => ({
      ...prev,
      spares_used: prev.spares_used.filter((_, i) => i !== index)
    }));
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {mode === 'create' ? 'Create New Breakdown' : 'Edit Breakdown'}
          </DialogTitle>
          <DialogDescription>
            Fill in the details below to {mode === 'create' ? 'create a new' : 'update the'} breakdown record.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-4 mb-4">
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="spares">Spares</TabsTrigger>
              <TabsTrigger value="timing">Timing</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Machine Name *</Label>
                  <Input
                    value={formData.machine_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, machine_name: e.target.value }))}
                    className={errors.machine_name ? "border-rose-500" : ""}
                    placeholder="e.g., CNC Machine, Conveyor Belt"
                  />
                  {errors.machine_name && <p className="text-xs text-rose-600 mt-1">{errors.machine_name}</p>}
                </div>
                <div>
                  <Label>Machine ID</Label>
                  <Input
                    value={formData.machine_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, machine_id: e.target.value }))}
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <Label>Artisan Name *</Label>
                  <Input
                    value={formData.artisan_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, artisan_name: e.target.value }))}
                    className={errors.artisan_name ? "border-rose-500" : ""}
                    placeholder="e.g., John Doe"
                  />
                  {errors.artisan_name && <p className="text-xs text-rose-600 mt-1">{errors.artisan_name}</p>}
                </div>
                <div>
                  <Label>Breakdown Date *</Label>
                  <Input
                    type="date"
                    value={formData.breakdown_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, breakdown_date: e.target.value }))}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Description *</Label>
                  <Textarea
                    value={formData.breakdown_description}
                    onChange={(e) => setFormData(prev => ({ ...prev, breakdown_description: e.target.value }))}
                    rows={3}
                    className={errors.breakdown_description ? "border-rose-500" : ""}
                    placeholder="Describe what happened, symptoms, and initial observations"
                  />
                  {errors.breakdown_description && <p className="text-xs text-rose-600 mt-1">{errors.breakdown_description}</p>}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="details" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_TYPES).map(([key, config]) => (
                        <SelectItem key={key} value={key}>{config.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select value={formData.priority} onValueChange={(v) => setFormData(prev => ({ ...prev, priority: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRIORITY_TYPES).map(([key, config]) => (
                        <SelectItem key={key} value={key}>{config.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Breakdown Type</Label>
                  <Select value={formData.breakdown_type} onValueChange={(v) => setFormData(prev => ({ ...prev, breakdown_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(BREAKDOWN_TYPES).map(([key, config]) => (
                        <SelectItem key={key} value={key}>{config.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Location *</Label>
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    className={errors.location ? "border-rose-500" : ""}
                    placeholder="e.g., Production Line A, Warehouse, Workshop"
                  />
                  {errors.location && <p className="text-xs text-rose-600 mt-1">{errors.location}</p>}
                </div>
                <div>
                  <Label>Department *</Label>
                  <Select value={formData.department} onValueChange={(v) => setFormData(prev => ({ ...prev, department: v }))}>
                    <SelectTrigger className={errors.department ? "border-rose-500" : ""}><SelectValue placeholder="Select department" /></SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map(dept => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.department && <p className="text-xs text-rose-600 mt-1">{errors.department}</p>}
                </div>
              </div>
              <div>
                <Label>Work Done</Label>
                <Textarea
                  value={formData.work_done}
                  onChange={(e) => setFormData(prev => ({ ...prev, work_done: e.target.value }))}
                  rows={2}
                  placeholder="Describe the work performed to resolve the breakdown"
                />
              </div>
              <div>
                <Label>Recommendations</Label>
                <Textarea
                  value={formData.artisan_recommendations}
                  onChange={(e) => setFormData(prev => ({ ...prev, artisan_recommendations: e.target.value }))}
                  rows={2}
                  placeholder="Enter recommendations for preventing future breakdowns"
                />
              </div>
            </TabsContent>

            <TabsContent value="spares" className="space-y-4">
              <Card>
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                    <Input placeholder="Part Name" value={spareForm.name} onChange={(e) => setSpareForm(prev => ({ ...prev, name: e.target.value }))} />
                    <Input placeholder="Part Number" value={spareForm.part_number} onChange={(e) => setSpareForm(prev => ({ ...prev, part_number: e.target.value }))} />
                    <Input type="number" placeholder="Quantity" value={spareForm.quantity} onChange={(e) => setSpareForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))} />
                    <Input type="number" placeholder="Unit Price" value={spareForm.unit_price} onChange={(e) => setSpareForm(prev => ({ ...prev, unit_price: parseFloat(e.target.value) || 0 }))} />
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addSpare} className="gap-1">
                    <Plus className="h-3.5 w-3.5" /> Add Spare
                  </Button>
                  {errors.spare && <p className="text-xs text-rose-600 mt-2">{errors.spare}</p>}
                </CardContent>
              </Card>

              {formData.spares_used.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Spare Parts Used</h4>
                  <div className="space-y-2">
                    {formData.spares_used.map((spare, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded-md">
                        <div>
                          <span className="font-medium">{spare.name}</span>
                          {spare.part_number && <span className="text-xs text-gray-500 ml-2">({spare.part_number})</span>}
                          <span className="text-xs text-gray-500 ml-2">{spare.quantity} × ${spare.unit_price}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">${(spare.quantity * spare.unit_price).toFixed(2)}</span>
                          <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeSpare(idx)}>
                            <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="timing" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Breakdown Start Time</Label>
                  <Input type="time" value={formData.breakdown_start} onChange={(e) => setFormData(prev => ({ ...prev, breakdown_start: e.target.value }))} />
                </div>
                <div>
                  <Label>Breakdown End Time</Label>
                  <Input type="time" value={formData.breakdown_end} onChange={(e) => setFormData(prev => ({ ...prev, breakdown_end: e.target.value }))} />
                  {errors.breakdown_end && <p className="text-xs text-rose-600 mt-1">{errors.breakdown_end}</p>}
                </div>
                <div>
                  <Label>Work Start Time</Label>
                  <Input type="time" value={formData.work_start} onChange={(e) => setFormData(prev => ({ ...prev, work_start: e.target.value }))} />
                </div>
                <div>
                  <Label>Work End Time</Label>
                  <Input type="time" value={formData.work_end} onChange={(e) => setFormData(prev => ({ ...prev, work_end: e.target.value }))} />
                </div>
              </div>
              {(formData.breakdown_start && formData.breakdown_end) && (
                <Card className="bg-blue-50">
                  <CardContent className="p-3">
                    <p className="text-sm"><span className="font-medium">Calculated Downtime:</span> {minutesToDisplay(calculateTimeDifference(formData.breakdown_start, formData.breakdown_end)).display}</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {mode === 'create' ? 'Create Breakdown' : 'Update Breakdown'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Main Breakdowns Page Component
const BreakdownsPage = () => {
  const [breakdowns, setBreakdowns] = useState<Breakdown[]>([]);
  const [filteredBreakdowns, setFilteredBreakdowns] = useState<Breakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [sortField, setSortField] = useState('breakdown_date');
  const [sortDirection, setSortDirection] = useState('desc');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  
  // Filter states
  const [filters, setFilters] = useState<Filters>({
    status: 'all',
    breakdown_type: 'all',
    priority: 'all',
    department: 'all',
    location: 'all',
    artisan_name: 'all',
    machine_name: 'all'
  });
  const [searchTerm, setSearchTerm] = useState('');
  
  // Date range states
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [showDateRange, setShowDateRange] = useState(false);
  
  // Modal states
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [selectedBreakdown, setSelectedBreakdown] = useState<Breakdown | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  
  // Backend availability
  const [backendAvailable, setBackendAvailable] = useState(true);

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.status !== 'all') count++;
    if (filters.breakdown_type !== 'all') count++;
    if (filters.priority !== 'all') count++;
    if (filters.department !== 'all') count++;
    if (filters.location !== 'all' && filters.location !== '') count++;
    if (filters.artisan_name !== 'all') count++;
    if (filters.machine_name !== 'all') count++;
    if (searchTerm) count++;
    if (showDateRange && (startDate !== endDate)) count++;
    return count;
  }, [filters, searchTerm, showDateRange, startDate, endDate]);

  // Filter description for metrics
  const filterDescription = useMemo(() => {
    const activeFilters: string[] = [];
    if (filters.status !== 'all') activeFilters.push(`Status: ${STATUS_TYPES[filters.status]?.name}`);
    if (filters.breakdown_type !== 'all') activeFilters.push(`Type: ${BREAKDOWN_TYPES[filters.breakdown_type]?.name}`);
    if (filters.priority !== 'all') activeFilters.push(`Priority: ${PRIORITY_TYPES[filters.priority]?.name}`);
    if (filters.department !== 'all') activeFilters.push(`Dept: ${filters.department}`);
    if (filters.location !== 'all' && filters.location !== '') activeFilters.push(`Location: ${filters.location}`);
    if (filters.artisan_name !== 'all') activeFilters.push(`Artisan: ${filters.artisan_name}`);
    if (filters.machine_name !== 'all') activeFilters.push(`Machine: ${filters.machine_name}`);
    if (searchTerm) activeFilters.push(`Search: "${searchTerm}"`);
    if (showDateRange && startDate && endDate) activeFilters.push(`Date: ${formatDate(startDate)} - ${formatDate(endDate)}`);
    
    if (activeFilters.length === 0) return "All breakdowns";
    return `Filtered by: ${activeFilters.join(', ')}`;
  }, [filters, searchTerm, showDateRange, startDate, endDate]);

  const loadBreakdowns = useCallback(async () => {
    setLoading(true);
    try {
      const available = await isBackendAvailable();
      setBackendAvailable(available);
      
      if (!available) {
        setBreakdowns([]);
        setFilteredBreakdowns([]);
        setLoading(false);
        return;
      }
      
      const queryFilters: Record<string, string> = {};
      if (filters.status !== 'all') queryFilters.status = filters.status;
      if (filters.breakdown_type !== 'all') queryFilters.breakdown_type = filters.breakdown_type;
      if (filters.priority !== 'all') queryFilters.priority = filters.priority;
      if (filters.department !== 'all') queryFilters.department = filters.department;
      if (filters.location !== 'all' && filters.location !== '') queryFilters.location = filters.location;
      if (filters.artisan_name !== 'all') queryFilters.artisan_name = filters.artisan_name;
      if (filters.machine_name !== 'all') queryFilters.machine_name = filters.machine_name;
      if (startDate && endDate) {
        queryFilters.start_date = startDate;
        queryFilters.end_date = endDate;
      }
      
      const data = await fetchBreakdowns(queryFilters);
      setBreakdowns(data);
    } catch (err) {
      console.error('Failed to load breakdowns:', err);
      toast.error('Failed to load breakdowns');
      setBreakdowns([]);
    } finally {
      setLoading(false);
    }
  }, [filters, startDate, endDate]);

  // Apply local filters and search - FIXED SORTING LOGIC
  useEffect(() => {
    let result = [...breakdowns];
    
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(breakdown =>
        breakdown.machine_name?.toLowerCase().includes(term) ||
        breakdown.machine_id?.toLowerCase().includes(term) ||
        breakdown.breakdown_description?.toLowerCase().includes(term) ||
        breakdown.artisan_name?.toLowerCase().includes(term) ||
        breakdown.location?.toLowerCase().includes(term)
      );
    }
    
    // FIXED: Proper sorting that handles both strings and numbers
    result.sort((a, b) => {
      let aVal = a[sortField as keyof Breakdown];
      let bVal = b[sortField as keyof Breakdown];

      // Special handling for date field
      if (sortField === 'breakdown_date') {
        const aDate = new Date(aVal as string);
        const bDate = new Date(bVal as string);
        const comparison = aDate.getTime() - bDate.getTime();
        return sortDirection === 'asc' ? comparison : -comparison;
      }

      // Safely convert values to strings for comparison
      const aStr = aVal == null ? '' : String(aVal);
      const bStr = bVal == null ? '' : String(bVal);
      
      const comparison = aStr.localeCompare(bStr);
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    setFilteredBreakdowns(result);
  }, [breakdowns, searchTerm, sortField, sortDirection]);

  useEffect(() => {
    loadBreakdowns();
  }, [loadBreakdowns]);

  const handleFilterChange = (filterName: string, value: string) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const clearAllFilters = () => {
    setFilters({
      status: 'all',
      breakdown_type: 'all',
      priority: 'all',
      department: 'all',
      location: 'all',
      artisan_name: 'all',
      machine_name: 'all'
    });
    setSearchTerm('');
    const today = new Date();
    const monthAgo = new Date();
    monthAgo.setDate(today.getDate() - 30);
    setStartDate(monthAgo.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
    setShowDateRange(false);
    toast.success('All filters cleared');
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const expandAll = () => {
    const allIds = filteredBreakdowns.map(b => String(b.id));
    setExpandedItems(new Set(allIds));
    toast.info(`Expanded ${allIds.length} items`);
  };

  const collapseAll = () => {
    setExpandedItems(new Set());
    toast.info('Collapsed all items');
  };

  const handleView = (breakdown: Breakdown) => {
    setSelectedBreakdown(breakdown);
    setDetailsModalOpen(true);
  };

  const handleEdit = (breakdown: Breakdown) => {
    if (!breakdown.id || breakdown.id === 0) {
      console.error('Invalid breakdown ID:', breakdown);
      toast.error('Cannot edit: Invalid breakdown ID. Please refresh and try again.');
      return;
    }
    setSelectedBreakdown(breakdown);
    setFormMode('edit');
    setFormModalOpen(true);
  };

  const handleDelete = async (breakdown: Breakdown) => {
    if (!breakdown.id || breakdown.id === 0) {
      console.error('Invalid breakdown ID:', breakdown);
      toast.error('Cannot delete: Invalid breakdown ID. Please refresh and try again.');
      return;
    }
    
    if (window.confirm(`Are you sure you want to delete breakdown for "${breakdown.machine_name}"? This action cannot be undone.`)) {
      try {
        console.log('Deleting breakdown with ID:', breakdown.id);
        await deleteBreakdown(breakdown.id);
        toast.success('Breakdown deleted successfully');
        await loadBreakdowns();
      } catch (err: unknown) {
        console.error('Delete error:', err);
        toast.error(err instanceof Error ? err.message : 'Failed to delete breakdown. Please check the console for details.');
      }
    }
  };

  const handleCreate = () => {
    setSelectedBreakdown(null);
    setFormMode('create');
    setFormModalOpen(true);
  };

  const handleFormSubmit = async (formData: BreakdownFormData) => {
    try {
      if (formMode === 'create') {
        await createBreakdown(formData);
        toast.success('Breakdown created successfully');
      } else {
        if (!selectedBreakdown?.id) {
          throw new Error('Invalid breakdown ID');
        }
        await updateBreakdown(selectedBreakdown.id, formData);
        toast.success('Breakdown updated successfully');
      }
      await loadBreakdowns();
    } catch (err: unknown) {
      console.error('Failed to save breakdown:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to save breakdown');
      throw err;
    }
  };

  const exportToCSV = () => {
    const headers = ['Machine Name', 'Machine ID', 'Description', 'Status', 'Priority', 'Type', 'Location', 'Department', 'Artisan', 'Date', 'Downtime', 'Cost', 'Work Done', 'Recommendations'];
    const csvRows = [
      headers.join(','),
      ...filteredBreakdowns.map(breakdown => {
        const downtime = minutesToDisplay(calculateDowntime(breakdown.breakdown_start, breakdown.breakdown_end));
        const totalSparesCost = (breakdown.spares_used && Array.isArray(breakdown.spares_used)) 
          ? breakdown.spares_used.reduce((total: number, spare: SpareUsed) => total + (parseFloat(spare.total_cost?.toString() || '0') || 0), 0) : 0;
        const row = [
          `"${(breakdown.machine_name || '').replace(/"/g, '""')}"`,
          `"${(breakdown.machine_id || '').replace(/"/g, '""')}"`,
          `"${(breakdown.breakdown_description || '').replace(/"/g, '""')}"`,
          `"${STATUS_TYPES[breakdown.status]?.name || ''}"`,
          `"${PRIORITY_TYPES[breakdown.priority]?.name || ''}"`,
          `"${BREAKDOWN_TYPES[breakdown.breakdown_type]?.name || ''}"`,
          `"${(breakdown.location || '').replace(/"/g, '""')}"`,
          `"${(breakdown.department || '').replace(/"/g, '""')}"`,
          `"${(breakdown.artisan_name || '').replace(/"/g, '""')}"`,
          `"${formatDate(breakdown.breakdown_date)}"`,
          `"${downtime.display}"`,
          `"${totalSparesCost.toFixed(2)}"`,
          `"${(breakdown.work_done || '').replace(/"/g, '""')}"`,
          `"${(breakdown.artisan_recommendations || '').replace(/"/g, '""')}"`
        ];
        return row.join(',');
      })
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `breakdowns_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredBreakdowns.length} breakdowns`);
  };

  if (!backendAvailable && !loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <Card className="max-w-md mx-auto text-center p-8">
          <AlertCircle className="h-12 w-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Backend Unavailable</h2>
          <p className="text-gray-500 mb-6">Unable to connect to the backend server. Please ensure it's running at {API_BASE}</p>
          <Button onClick={loadBreakdowns} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Retry Connection
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <PageShell>
      <Toaster position="top-right" richColors />
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Ozech Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <nav className="flex items-center gap-1.5 text-xs text-[#6B7B8E] mb-2">
              <span>Home</span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-[#2A4D69] font-medium">Breakdowns</span>
            </nav>
            <h1 className="text-3xl font-bold text-[#2A4D69] font-heading tracking-tight">Equipment Breakdowns</h1>
            <p className="text-[#6B7B8E] mt-1">Log, track, and resolve equipment failures. Click any record to view full details.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start">
            <Button variant="outline" size="sm" onClick={exportToCSV} className="gap-1 border-[#2A4D69]/20 text-[#2A4D69]">
              <Download className="h-4 w-4" /> Export
            </Button>
            <Button variant="outline" size="sm" onClick={expandAll} className="gap-1 border-[#2A4D69]/20 text-[#2A4D69]">
              <Maximize2 className="h-4 w-4" /> Expand All
            </Button>
            <Button onClick={handleCreate} className="gap-1 bg-[#2A4D69] hover:bg-[#1e3a52] text-white">
              <Plus className="h-4 w-4" /> New Breakdown
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Dashboard Metrics */}
          <DashboardMetrics 
            breakdowns={filteredBreakdowns} 
            loading={loading} 
            filterDescription={filterDescription}
          />

          {/* Filters */}
          <FilterBar
            filters={filters}
            onFilterChange={handleFilterChange}
            onRefresh={loadBreakdowns}
            loading={loading}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            showDateRange={showDateRange}
            onToggleDateRange={() => setShowDateRange(!showDateRange)}
            onClearFilters={clearAllFilters}
            activeFilterCount={activeFilterCount}
          />

          {/* View Toggle & Results Count */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing <span className="font-semibold text-gray-900">{filteredBreakdowns.length}</span> of{" "}
              <span className="font-semibold text-gray-900">{breakdowns.length}</span> breakdowns
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="gap-1"
              >
                <LayoutGrid className="h-4 w-4" /> Grid
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="gap-1"
              >
                <TableIcon className="h-4 w-4" /> List
              </Button>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBreakdowns.map((breakdown) => {
                const id = String(breakdown.id);
                return (
                  <BreakdownCard
                    key={id}
                    breakdown={breakdown}
                    onView={handleView}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    isExpanded={expandedItems.has(id)}
                    onToggleExpand={() => toggleExpand(id)}
                  />
                );
              })}
            </div>
          ) : (
            <BreakdownTable
              breakdowns={filteredBreakdowns}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
              expandedItems={expandedItems}
              onToggleExpand={toggleExpand}
            />
          )}

          {/* Empty State */}
          {!loading && filteredBreakdowns.length === 0 && (
            <Card className="text-center py-12">
              <CardContent>
                <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-500 mb-2">No breakdowns found</h3>
                <p className="text-gray-400 mb-6">Try adjusting your filters or create a new breakdown record</p>
                <Button onClick={handleCreate}>Create First Breakdown</Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Modals */}
      <BreakdownDetailsModal
        breakdown={selectedBreakdown}
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <BreakdownFormModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={selectedBreakdown}
        mode={formMode}
      />
    </PageShell>
  );
};

export default BreakdownsPage;