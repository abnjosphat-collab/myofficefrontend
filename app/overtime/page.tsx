// app/overtime/page.tsx
'use client';

import React, { useState, useMemo, useEffect } from "react";
import {
  Calendar,
  Plus,
  Search,
  RefreshCw,
  Filter,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  XCircle,
  User,
  FileText,
  Eye,
  Loader2,
  Clock,
  AlertCircle,
  Trash2,
  MoreVertical,
  Edit,
  X,
  ArrowUpRight,
  TrendingUp,
  Users,
  Briefcase,
  Download,
  Grid,
  Home,
  Activity,
  Phone,
  MessageSquare,
  Heart,
  Info,
  Target,
  Flag,
  Database,
  FilterX,
  Table as TableIcon,
  ArrowUpDown,
  Sun,
  Moon,
  Sparkles,
  Zap,
  Award,
  Star,
  Shield,
  Lock,
  Unlock,
  Gift,
  Package,
  Truck,
  Warehouse,
  ShoppingBag,
  Coffee,
  Music,
  Film,
  Camera,
  Mic,
  Headphones,
  Gamepad,
  Tv,
  Wifi,
  Bluetooth,
  Battery,
  Cpu,
  HardDrive,
  Monitor,
  Printer,
  Scan,
  QrCode,
  Barcode,
  Ticket,
  CreditCard,
  Wallet,
  Banknote,
  Coins,
  Receipt,
  Building,
  Factory,
  Store,
  Globe,
  MapPin,
  Compass,
  Medal,
  Crown,
  Shield as ShieldIcon,
  AlertTriangle,
  Check,
  DollarSign,
  Eye as EyeIcon,
  EyeOff,
  Mail,
  Share2,
  Bookmark,
  ThumbsUp,
  ThumbsDown,
  Settings,
  Sliders,
  Upload,
  Copy,
  Delete,
  ExternalLink,
  HelpCircle,
  Key,
  Layers,
  LayoutDashboard,
  LayoutGrid,
  LayoutList,
  Link as LinkIcon,
  List,
  LogIn,
  LogOut,
  Map,
  Maximize,
  Menu,
  MessageCircle,
  Minimize,
  Minus,
  MoreHorizontal,
  Move,
  Navigation,
  Network,
  Newspaper,
  Notebook,
  NotepadText,
  Octagon,
  Option,
  Paintbrush,
  Palette,
  Paperclip,
  Pause,
  Pencil,
  Percent,
  PieChart,
  Play,
  Pocket,
  Power,
  Quote,
  Radio,
  Repeat,
  Reply,
  Rewind,
  Rocket,
  RotateCcw,
  RotateCw,
  Rss,
  Save,
  Scissors,
  Send,
  Server,
  Share,
  ShoppingCart,
  Shuffle,
  SkipBack,
  SkipForward,
  Smartphone,
  Smile,
  Snowflake,
  Speaker,
  Split,
  Square,
  SwitchCamera,
  Tablet,
  Tag,
  Terminal,
  Timer,
  ToggleLeft,
  ToggleRight,
  TrendingDown,
  Triangle,
  Trophy,
  Twitter,
  Type,
  Umbrella,
  Underline,
  Undo,
  Unlink,
  Upload as UploadIcon,
  User as UserIcon,
  UserCheck,
  UserCog,
  UserMinus,
  UserPlus,
  UserX,
  Users as UsersIcon,
  Video as VideoIcon,
  Voicemail,
  Volume,
  Volume1,
  Volume2,
  VolumeX,
  Wand,
  Watch,
  Wind,
  Youtube,
  ZoomIn,
  ZoomOut,
  ChevronsUp,
  ChevronsDown,
  FileSpreadsheet,
  FileDown,
} from "lucide-react";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTip,
  ResponsiveContainer,
  PieChart as RPieChart,
  Pie, Cell,
  AreaChart, Area,
  Legend,
} from "recharts";

// Import Header and Footer
import { PageShell } from '@/components/PageShell';
import { fmtDate as formatDate, initials as getInitials } from '@/components/shared';

// shadcn/ui imports
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table as ShadcnTable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

// Animation styles defined in globals.css



// API Configuration
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://myofficebackend.onrender.com';
const OVERTIME_API = `${API_BASE}/api/overtime`;
const EMPLOYEES_API = `${API_BASE}/api/employees`;

// Overtime Types with enhanced styling
const OVERTIME_TYPES = {
  regular: {
    name: 'Regular Overtime',
    shortName: 'Regular',
    icon: Clock,
    variant: 'default',
    gradient: 'from-blue-500 to-blue-600',
    badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    color: 'blue',
    description: 'Standard overtime after regular work hours'
  },
  weekend: {
    name: 'Weekend Overtime',
    shortName: 'Weekend',
    icon: Calendar,
    variant: 'secondary',
    gradient: 'from-purple-500 to-purple-600',
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    color: 'purple',
    description: 'Overtime work on Saturdays or Sundays'
  },
  emergency: {
    name: 'Emergency Overtime',
    shortName: 'Emergency',
    icon: AlertCircle,
    variant: 'destructive',
    gradient: 'from-red-500 to-red-600',
    badge: 'bg-red-500/20 text-red-300 border-red-500/30',
    color: 'red',
    description: 'Urgent overtime for critical situations'
  },
  project: {
    name: 'Project Overtime',
    shortName: 'Project',
    icon: Briefcase,
    variant: 'outline',
    gradient: 'from-green-500 to-green-600',
    badge: 'bg-green-500/20 text-green-300 border-green-500/30',
    color: 'green',
    description: 'Overtime for specific project deadlines'
  },
  holiday: {
    name: 'Holiday Overtime',
    shortName: 'Holiday',
    icon: Sun,
    variant: 'outline',
    gradient: 'from-amber-500 to-amber-600',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    color: 'amber',
    description: 'Work on public holidays'
  },
  night: {
    name: 'Night Shift Overtime',
    shortName: 'Night',
    icon: Moon,
    variant: 'outline',
    gradient: 'from-indigo-500 to-indigo-600',
    badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    color: 'indigo',
    description: 'Overtime during night hours'
  }
};

// Status configurations
const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    variant: 'secondary',
    icon: Clock,
    gradient: 'from-yellow-500 to-yellow-600',
    badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    color: 'yellow'
  },
  approved: {
    label: 'Approved',
    variant: 'success',
    icon: CheckCircle2,
    gradient: 'from-green-500 to-green-600',
    badge: 'bg-green-500/20 text-green-300 border-green-500/30',
    color: 'green'
  },
  rejected: {
    label: 'Rejected',
    variant: 'destructive',
    icon: XCircle,
    gradient: 'from-red-500 to-red-600',
    badge: 'bg-red-500/20 text-red-300 border-red-500/30',
    color: 'red'
  },
  paid: {
    label: 'Paid',
    variant: 'default',
    icon: TrendingUp,
    gradient: 'from-emerald-500 to-emerald-600',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    color: 'emerald'
  },
  cancelled: {
    label: 'Cancelled',
    variant: 'outline',
    icon: X,
    gradient: 'from-gray-500 to-gray-600',
    badge: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
    color: 'gray'
  }
};

// Month names for dropdown
const MONTHS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

// Year options
const getYearOptions = () => {
  const currentYear = new Date().getFullYear();
  return [
    currentYear - 2,
    currentYear - 1,
    currentYear,
    currentYear + 1,
  ].map(year => ({ value: year.toString(), label: year.toString() }));
};

// ── TypeScript interfaces ───────────────────────────────────────────────────

interface OvertimeRecord {
  id: number | string;
  employee_name: string;
  employee_id: string;
  position: string;
  overtime_type: string;
  date: string;
  start_time: string;
  end_time: string;
  reason: string;
  contact_number?: string;
  emergency_contact?: string;
  status: string;
  applied_date?: string;
  notes?: string;
  created_at?: string;
  department?: string;
}

interface FormData {
  employee_name: string;
  employee_id: string;
  position: string;
  overtime_type: string;
  date: string;
  start_time: string;
  end_time: string;
  reason: string;
  contact_number: string;
  emergency_contact: string;
  id?: number | string;
}

interface EmployeeOption {
  id: string;          // employee number e.g. "C1165"
  name: string;
  designation: string;
  phone: string;
  supervisor: string;
  department: string;
  section: string;
}

interface EmployeeSummaryItem {
  employee_name: string;
  employee_id: string;
  count: number;
  totalHours: number;
}

interface UniqueEmployee {
  name: string;
  id: string;
}

interface OvertimeFilters {
  status?: string | null;
  overtime_type?: string | null;
  employee_id?: string | null;
  date_from?: string | null;
  date_to?: string | null;
  month?: string | null;
  year?: string | null;
}

interface ValidationErrors {
  [key: string]: string;
}

// ── End of interfaces ───────────────────────────────────────────────────────

// Get unique employees for quick filters
const getUniqueEmployees = (data: OvertimeRecord[]): UniqueEmployee[] => {
  const employeeMap: Record<string, UniqueEmployee> = {};
  data.forEach((item) => {
    if (item && item.employee_name && !employeeMap[item.employee_name]) {
      employeeMap[item.employee_name] = {
        name: item.employee_name,
        id: item.employee_id
      };
    }
  });
  return (Object.values(employeeMap) as UniqueEmployee[]).sort((a, b) => a.name.localeCompare(b.name));
};

// Utility Functions

const formatTime = (timeString: string | undefined): string => {
  if (!timeString) return '';
  try {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return timeString;
  }
};

const calculateHours = (startTime: string | undefined, endTime: string | undefined, date: string | undefined): number => {
  if (!startTime || !endTime || !date) return 0;
  try {
    const start = new Date(`${date}T${startTime}`);
    const end = new Date(`${date}T${endTime}`);
    if (end < start) end.setDate(end.getDate() + 1);
    const diffMs = end.getTime() - start.getTime();
    return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
  } catch {
    return 0;
  }
};


const preparePayload = (data: Partial<FormData>): Partial<FormData> => {
  const payload = { ...data };
  if (payload.contact_number === '') payload.contact_number = ' ';
  if (payload.emergency_contact === '') payload.emergency_contact = ' ';
  return payload;
};

// API Functions
const fetchOvertime = async (filters: OvertimeFilters = {}): Promise<OvertimeRecord[]> => {
  const params = new URLSearchParams();
  if (filters.status && filters.status !== 'all') params.append('status', filters.status);
  if (filters.overtime_type && filters.overtime_type !== 'all') params.append('overtime_type', filters.overtime_type);
  if (filters.employee_id && filters.employee_id !== 'all') params.append('employee_id', filters.employee_id);
  if (filters.date_from) params.append('date_from', filters.date_from);
  if (filters.date_to) params.append('date_to', filters.date_to);
  if (filters.month) params.append('month', filters.month);
  if (filters.year) params.append('year', filters.year);

  const url = params.toString() ? `${OVERTIME_API}?${params.toString()}` : OVERTIME_API;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch overtime');
  return res.json();
};

const createOvertime = async (data: Partial<FormData>): Promise<OvertimeRecord> => {
  const payload = preparePayload(data);
  const res = await fetch(OVERTIME_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to create overtime: ${res.status} - ${errorText}`);
  }
  return res.json();
};

const updateOvertime = async (id: number | string, data: Partial<FormData> & { status?: string }): Promise<OvertimeRecord> => {
  const payload = preparePayload(data);
  const res = await fetch(`${OVERTIME_API}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to update overtime: ${res.status} - ${errorText}`);
  }
  return res.json();
};

const updateOvertimeStatus = async (id: number | string, status: string): Promise<OvertimeRecord> => {
  return updateOvertime(id, { status });
};

const deleteOvertime = async (id: number | string): Promise<unknown> => {
  const res = await fetch(`${OVERTIME_API}/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete overtime');
  return res.json();
};

// Export to Excel (CSV)
const exportToExcel = (data: OvertimeRecord[], filename = `overtime-${new Date().toISOString().split('T')[0]}.csv`) => {
  if (!data || data.length === 0) {
    toast.warning('No data to export');
    return;
  }

  const headers = [
    'ID', 'Employee Name', 'Employee ID', 'Position', 'Overtime Type',
    'Date', 'Start Time', 'End Time', 'Hours', 'Reason',
    'Contact Number', 'Emergency Contact', 'Status', 'Applied Date',
    'Notes', 'Created At',
  ];

  const rows = data.map((item) => {
    const hours = calculateHours(item.start_time, item.end_time, item.date);
    return [
      item.id,
      item.employee_name,
      item.employee_id,
      item.position,
      item.overtime_type,
      item.date,
      item.start_time,
      item.end_time,
      hours.toFixed(2),
      item.reason,
      item.contact_number?.trim() ? item.contact_number : '',
      item.emergency_contact?.trim() ? item.emergency_contact : '',
      item.status,
      item.applied_date || '',
      item.notes || '',
      item.created_at || '',
    ];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row
        .map((cell) => {
          if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"'))) {
            return `"${cell.replace(/"/g, '""')}"`;
          }
          return cell;
        })
        .join(',')
    ),
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
  toast.success(`Exported ${data.length} records`);
};

// Status Badge Component
const StatusBadge = ({ status }: { status: string }) => {
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
  const Icon = config.icon;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={`${config.badge} border gap-1 px-2 py-1 whitespace-nowrap font-medium cursor-help`}>
            <Icon className="h-3 w-3" />
            {config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Current status: {config.label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Type Badge Component
const TypeBadge = ({ type }: { type: string }) => {
  const config = OVERTIME_TYPES[type as keyof typeof OVERTIME_TYPES] || OVERTIME_TYPES.regular;
  const Icon = config.icon;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={`${config.badge} border gap-1 px-2 py-1 whitespace-nowrap font-medium cursor-help`}>
            <Icon className="h-3 w-3" />
            {config.shortName}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{config.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Stat Card Component
const StatCard = ({ title, value, icon: Icon, onClick, tooltip, gradient = 'from-primary/10 to-primary/5' }: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  onClick?: (() => void) | null;
  tooltip?: string;
  gradient?: string;
}) => {
  const CardWrapper = onClick ? (
    <Card
      className={`cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 overflow-hidden relative group hover:border-primary bg-white`}
      onClick={onClick}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-50 group-hover:opacity-70 transition-opacity`} />
      <CardContent className="p-6 relative z-10">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              {title}
              {tooltip && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground/50" />
                    </TooltipTrigger>
                    <TooltipContent>{tooltip}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
          </div>
          <div className="rounded-full bg-primary/10 p-3 text-primary group-hover:scale-110 transition-transform duration-300">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  ) : (
    <Card className="overflow-hidden relative group bg-white">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-50`} />
      <CardContent className="p-6 relative z-10">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              {title}
              {tooltip && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground/50" />
                    </TooltipTrigger>
                    <TooltipContent>{tooltip}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
          </div>
          <div className="rounded-full bg-primary/10 p-3 text-primary">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return CardWrapper;
};

// Overtime Card Component (Grid View)
const OvertimeCard = ({ overtime, onView, onEdit, onDelete }: {
  overtime: OvertimeRecord;
  onView: (ot: OvertimeRecord) => void;
  onEdit: (ot: OvertimeRecord) => void;
  onDelete: (id: number | string) => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const typeConfig = OVERTIME_TYPES[overtime.overtime_type as keyof typeof OVERTIME_TYPES] || OVERTIME_TYPES.regular;
  const Icon = typeConfig.icon;
  const hours = calculateHours(overtime.start_time, overtime.end_time, overtime.date);

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  const colorHex: Record<string, string> = { blue: '#3b82f6', purple: '#a855f7', red: '#ef4444', green: '#22c55e', amber: '#f59e0b', indigo: '#6366f1' };
  const topColor = colorHex[typeConfig.color] || '#86BBD8';

  return (
    <Card className="group relative hover:shadow-xl transition-all duration-300 overflow-hidden"
      style={{
        background: 'rgba(5,15,28,0.75)',
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderTop: `4px solid ${topColor}`
      }}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Avatar className="h-10 w-10 border-2 border-white/20">
              <AvatarFallback className="bg-white/10 text-white text-sm font-bold">
                {getInitials(overtime.employee_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-semibold truncate flex items-center gap-1 text-white">
                {overtime.employee_name}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-white/35 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Employee ID: {overtime.employee_id}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardTitle>
              <CardDescription className="text-xs truncate flex items-center gap-1 text-white/55">
                <Briefcase className="h-3 w-3 inline" />
                {overtime.position || 'No position'}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1"
                    onClick={handleExpandClick}
                  >
                    {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{expanded ? 'Hide details' : 'Click to expand and view more details'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <DropdownMenu>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Actions menu</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(overtime); }}>
                  <Eye className="h-4 w-4 mr-2" /> View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(overtime); }}>
                  <Edit className="h-4 w-4 mr-2" /> Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={(e) => { e.stopPropagation(); onDelete(overtime.id); }}
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="space-y-1 cursor-help">
                  <p className="text-xs text-white/50 flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Date
                  </p>
                  <p className="font-medium text-white">{formatDate(overtime.date)}</p>
                </div>
              </TooltipTrigger>
              <TooltipContent>Date of overtime work</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="space-y-1 cursor-help">
                  <p className="text-xs text-white/50 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Time
                  </p>
                  <p className="font-medium text-white text-xs">
                    {formatTime(overtime.start_time)} – {formatTime(overtime.end_time)}
                  </p>
                </div>
              </TooltipTrigger>
              <TooltipContent>Start and end time of overtime</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="space-y-1 cursor-help">
                  <p className="text-xs text-white/50 flex items-center gap-1">
                    <Activity className="h-3 w-3" /> Hours
                  </p>
                  <p className="font-bold text-white">{hours} h</p>
                </div>
              </TooltipTrigger>
              <TooltipContent>Total overtime hours calculated</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="space-y-1">
            <p className="text-xs text-white/50 flex items-center gap-1">
              <Flag className="h-3 w-3" /> Type
            </p>
            <TypeBadge type={overtime.overtime_type} />
          </div>

          <div className="space-y-1 col-span-2">
            <p className="text-xs text-white/50 flex items-center gap-1">
              <Target className="h-3 w-3" /> Status
            </p>
            <StatusBadge status={overtime.status} />
          </div>
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t border-white/10 space-y-3 w-full">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <p className="text-xs font-medium text-white/50 mb-1 flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" /> Reason
                    </p>
                    <p className="text-sm bg-white/[0.06] border border-white/10 text-white/80 p-3 rounded-lg break-words whitespace-pre-wrap">{overtime.reason || 'No reason provided'}</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Reason for overtime request</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <p className="text-xs text-white/50 mb-1 flex items-center gap-1">
                        <Phone className="h-3 w-3" /> Contact
                      </p>
                      <p className="font-medium text-white break-words">
                        {overtime.contact_number && overtime.contact_number.trim() ? overtime.contact_number : 'Not provided'}
                      </p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Employee contact number</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {overtime.emergency_contact && overtime.emergency_contact.trim() && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <p className="text-xs text-white/50 mb-1 flex items-center gap-1">
                          <Heart className="h-3 w-3" /> Emergency
                        </p>
                        <p className="font-medium text-white break-words">{overtime.emergency_contact}</p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>Emergency contact number</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-2 border-t border-white/10 bg-white/[0.04]">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full gap-2 text-white/70 hover:text-white hover:bg-white/[0.10]" onClick={() => onView(overtime)}>
                <Eye className="h-4 w-4" />
                <span>View full details</span>
                <ChevronRight className="h-4 w-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Click here to see complete overtime information</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </CardFooter>
    </Card>
  );
};

// Overtime Application Form
const OvertimeApplicationForm = ({ onClose, onSuccess, editData, onUpdate }: {
  onClose: () => void;
  onSuccess: () => void;
  editData: OvertimeRecord | null;
  onUpdate: (id: number | string, data: Partial<FormData>) => Promise<void>;
}) => {
  const [formData, setFormData] = useState<FormData>(
    editData ? {
      employee_name: editData.employee_name,
      employee_id: editData.employee_id,
      position: editData.position,
      overtime_type: editData.overtime_type,
      date: editData.date,
      start_time: editData.start_time,
      end_time: editData.end_time,
      reason: editData.reason,
      contact_number: editData.contact_number ?? '',
      emergency_contact: editData.emergency_contact ?? '',
      id: editData.id,
    } : {
      employee_name: '',
      employee_id: '',
      position: '',
      overtime_type: 'regular',
      date: new Date().toISOString().split('T')[0],
      start_time: '18:00',
      end_time: '20:00',
      reason: '',
      contact_number: '',
      emergency_contact: '',
    }
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeeSelectOpen, setEmployeeSelectOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  // Fetch employees on mount
  useEffect(() => {
    const fetchEmployees = async () => {
      setLoadingEmployees(true);
      try {
        const response = await fetch(EMPLOYEES_API);
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Employee API error:', errorText);
          toast.error(`Failed to load employees: ${response.status}`);
          return;
        }
        const data = await response.json();
        const employeeList: Record<string, unknown>[] = Array.isArray(data) ? data : [];
        const normalized: EmployeeOption[] = employeeList.map((emp) => {
          // Prefer the string employee_id (e.g. "C1165") over numeric DB row id
          const id = String(emp.employee_id || emp.id || '');
          let fullName = '';
          if (emp.first_name && emp.last_name) {
            fullName = `${emp.first_name} ${emp.last_name}`;
          } else {
            fullName = String(emp.name || emp.employee_name || emp.full_name || emp.Name || '');
          }
          return {
            id,
            name: fullName,
            designation: String(emp.designation || emp.position || emp.job_title || ''),
            phone:       String(emp.phone || emp.contact_number || emp.mobile || ''),
            supervisor:  String(emp.supervisor || emp.manager_name || emp.manager || ''),
            department:  String(emp.department || emp.dept || ''),
            section:     String(emp.section || emp.mine_section || ''),
          };
        });
        setEmployees(normalized);
      } catch (_err) {
        console.error('Error fetching employees:', _err);
        toast.error('Could not load employee list');
      } finally {
        setLoadingEmployees(false);
      }
    };
    fetchEmployees();
  }, []);

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const { [field]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleEmployeeSelect = (employee: EmployeeOption) => {
    setFormData({
      ...formData,
      employee_id:       employee.id,                           // "C1165" style
      employee_name:     employee.name || `Employee ${employee.id}`,
      position:          employee.designation || '',
      contact_number:    employee.phone || '',
      emergency_contact: employee.supervisor || '',
    });
    setEmployeeSelectOpen(false);
  };

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};
    if (!formData.employee_name?.trim()) errors.employee_name = 'Full name is required';
    if (!formData.position?.trim()) errors.position = 'Position is required';
    if (!formData.date) errors.date = 'Date is required';
    if (!formData.reason?.trim()) errors.reason = 'Reason is required';

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (editData) {
        await onUpdate(editData.id, formData);
        toast.success('Overtime application updated');
      } else {
        await createOvertime(formData);
        toast.success('Overtime application submitted');
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Submit error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const hours = calculateHours(formData.start_time, formData.end_time, formData.date);

  const filteredEmployees = useMemo(() => {
    if (!employeeSearch.trim()) return employees;
    const term = employeeSearch.toLowerCase();
    return employees.filter(emp =>
      emp.name.toLowerCase().includes(term) ||
      emp.id.toLowerCase().includes(term) ||        // matches "C1165", "C116…"
      emp.designation.toLowerCase().includes(term) ||
      emp.department.toLowerCase().includes(term)
    );
  }, [employees, employeeSearch]);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-sm border-white/30">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            {editData ? 'Edit' : 'New'} Overtime Request
          </DialogTitle>
          <DialogDescription>
            Fill in the details below. All fields marked * are required.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Employee selection dropdown */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-1">
              Employee *
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground/50 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>Select an employee from the list</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <Popover open={employeeSelectOpen} onOpenChange={setEmployeeSelectOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between h-auto py-3 bg-white"
                  disabled={!!editData}
                >
                  {formData.employee_name ? (
                    <div className="flex items-center gap-3 truncate">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {getInitials(formData.employee_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-left truncate">
                        <div className="truncate font-medium">{formData.employee_name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {formData.position} • {formData.employee_id}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Select employee...</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-white/95 backdrop-blur-sm" align="start">
                <Command>
                  <CommandInput 
                    placeholder="Search employees..." 
                    value={employeeSearch}
                    onValueChange={setEmployeeSearch}
                  />
                  <CommandEmpty>No employee found.</CommandEmpty>
                  <CommandGroup className="max-h-64 overflow-y-auto">
                    {loadingEmployees ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : (
                      filteredEmployees.map((emp) => (
                        <CommandItem
                          key={emp.id}
                          value={`${emp.name} ${emp.id}`}
                          onSelect={() => handleEmployeeSelect(emp)}
                          className="flex items-center gap-3 py-3"
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {getInitials(emp.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium truncate">{emp.name}</p>
                              <span className="text-xs font-mono font-bold text-primary shrink-0">{emp.id}</span>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {emp.designation}{emp.department ? ` • ${emp.department}` : ''}
                            </p>
                          </div>
                        </CommandItem>
                      ))
                    )}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Auto-filled employee fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employee_id" className="text-sm font-medium">Employee ID *</Label>
              <Input
                id="employee_id"
                required
                value={formData.employee_id}
                onChange={(e) => handleChange('employee_id', e.target.value)}
                placeholder="e.g., C1165"
                disabled={!!editData}
                className="h-10 bg-white"
              />
              {validationErrors.employee_id && (
                <p className="text-sm text-destructive">{validationErrors.employee_id}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="position" className="text-sm font-medium">Position</Label>
              <Input
                id="position"
                value={formData.position}
                readOnly
                disabled
                className="bg-muted/50 h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_number" className="text-sm font-medium">Contact Number</Label>
              <Input
                id="contact_number"
                value={formData.contact_number}
                readOnly
                disabled
                className="bg-muted/50 h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergency_contact" className="text-sm font-medium">Emergency Contact</Label>
              <Input
                id="emergency_contact"
                value={formData.emergency_contact}
                readOnly
                disabled
                className="bg-muted/50 h-10"
              />
            </div>
          </div>

          {/* Other fields (editable) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1">
                Overtime Type *
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground/50 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>Select the type of overtime work</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Select
                value={formData.overtime_type}
                onValueChange={(val) => handleChange('overtime_type', val)}
              >
                <SelectTrigger className="h-10 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(OVERTIME_TYPES).map(([key, type]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        {React.createElement(type.icon, { className: "h-4 w-4" })}
                        {type.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Date *</Label>
              <Input
                type="date"
                required
                value={formData.date}
                onChange={(e) => handleChange('date', e.target.value)}
                className="h-10 bg-white"
              />
              {validationErrors.date && (
                <p className="text-sm text-destructive">{validationErrors.date}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Start Time *</Label>
              <Input
                type="time"
                required
                value={formData.start_time}
                onChange={(e) => handleChange('start_time', e.target.value)}
                className="h-10 bg-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">End Time *</Label>
              <Input
                type="time"
                required
                value={formData.end_time}
                onChange={(e) => handleChange('end_time', e.target.value)}
                className="h-10 bg-white"
              />
            </div>
          </div>

          {hours > 0 && (
            <div className="rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 p-4 text-center border">
              <p className="text-sm text-muted-foreground mb-1">Total Hours</p>
              <p className="text-3xl font-bold text-primary">{hours} h</p>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-medium">Reason for Overtime *</Label>
            <Textarea
              required
              rows={4}
              value={formData.reason}
              onChange={(e) => handleChange('reason', e.target.value)}
              placeholder="Please provide details about why overtime is required..."
              className="resize-none bg-white"
            />
            {validationErrors.reason && (
              <p className="text-sm text-destructive">{validationErrors.reason}</p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="min-w-[100px]">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editData ? 'Update' : 'Submit'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Overtime Details Modal
const OvertimeDetailsModal = ({ overtime, onClose, onStatusUpdate, onDelete, onEdit }: {
  overtime: OvertimeRecord;
  onClose: () => void;
  onStatusUpdate: (id: number | string, status: string) => Promise<void>;
  onDelete: (id: number | string) => Promise<void>;
  onEdit: (ot: OvertimeRecord) => void;
}) => {
  const [updating, setUpdating] = useState(false);
  const typeConfig = OVERTIME_TYPES[overtime.overtime_type as keyof typeof OVERTIME_TYPES] || OVERTIME_TYPES.regular;
  const hours = calculateHours(overtime.start_time, overtime.end_time, overtime.date);

  const displayId = overtime.id ? (typeof overtime.id === 'string' ? overtime.id.slice(0, 8) : String(overtime.id).slice(0, 8)) : 'N/A';

  const handleStatusChange = async (newStatus: string) => {
    setUpdating(true);
    try {
      await onStatusUpdate(overtime.id, newStatus);
      toast.success(`Status updated to ${newStatus}`);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this overtime request?')) return;
    setUpdating(true);
    try {
      await onDelete(overtime.id);
      toast.success('Request deleted');
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-sm border-white/30">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              {React.createElement(typeConfig.icon, { className: "h-5 w-5 text-primary" })}
            </div>
            Overtime Request #{displayId}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Employee Card */}
            <Card className="border-0 shadow-none bg-gradient-to-br from-primary/5 to-transparent bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" /> Employee
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials(overtime.employee_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{overtime.employee_name}</p>
                    <p className="text-xs text-muted-foreground">{overtime.position}</p>
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="cursor-help">
                          <p className="text-xs text-muted-foreground">ID</p>
                          <p className="font-mono text-xs">{overtime.employee_id}</p>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>Employee identification number</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="cursor-help">
                          <p className="text-xs text-muted-foreground">Contact</p>
                          <p className="text-xs">{overtime.contact_number || 'Not provided'}</p>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>Primary contact number</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </CardContent>
            </Card>

            {/* Details Card */}
            <Card className="border-0 shadow-none bg-gradient-to-br from-primary/5 to-transparent bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" /> Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Type</span>
                  <TypeBadge type={overtime.overtime_type} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Status</span>
                  <StatusBadge status={overtime.status} />
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="cursor-help">
                          <p className="text-xs text-muted-foreground">Date</p>
                          <p className="font-medium">{formatDate(overtime.date)}</p>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>Date of overtime work</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="cursor-help">
                          <p className="text-xs text-muted-foreground">Hours</p>
                          <p className="font-medium">{hours} h</p>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>Total hours worked</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="cursor-help">
                          <p className="text-xs text-muted-foreground">Start</p>
                          <p className="font-medium">{formatTime(overtime.start_time)}</p>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>Start time of overtime</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="cursor-help">
                          <p className="text-xs text-muted-foreground">End</p>
                          <p className="font-medium">{formatTime(overtime.end_time)}</p>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>End time of overtime</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Reason Card */}
          <Card className="border-0 shadow-none bg-gradient-to-br from-primary/5 to-transparent bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" /> Reason
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-background rounded-lg p-4 border">
                <p className="whitespace-pre-wrap text-sm">{overtime.reason}</p>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 justify-end">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" onClick={() => { onEdit(overtime); onClose(); }} className="gap-2">
                    <Edit className="h-4 w-4" /> Edit
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit this overtime request</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <DropdownMenu>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="gap-2">
                        Update Status <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Change the status of this request</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleStatusChange('approved')}>
                  <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" /> Approve
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusChange('rejected')}>
                  <XCircle className="h-4 w-4 mr-2 text-destructive" /> Reject
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusChange('pending')}>
                  <Clock className="h-4 w-4 mr-2 text-muted-foreground" /> Mark Pending
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusChange('paid')}>
                  <TrendingUp className="h-4 w-4 mr-2 text-emerald-600" /> Mark Paid
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusChange('cancelled')}>
                  <X className="h-4 w-4 mr-2 text-gray-600" /> Cancel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="destructive" onClick={handleDelete} disabled={updating} className="gap-2">
                    {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Delete
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete this overtime request (cannot be undone)</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Employee Summary Component
const EmployeeSummary = ({ data, show, onToggle, onEmployeeSelect }: {
  data: OvertimeRecord[];
  show: boolean;
  onToggle: (val: boolean) => void;
  onEmployeeSelect: (id: string) => void;
}) => {
  const summary = useMemo(() => {
    const employeeMap: Record<string, EmployeeSummaryItem> = {};
    
    data.forEach((item) => {
      const id = item.employee_id;
      if (!employeeMap[id]) {
        employeeMap[id] = {
          employee_name: item.employee_name,
          employee_id: id,
          count: 0,
          totalHours: 0,
        };
      }
      const entry = employeeMap[id];
      entry.count += 1;
      const hours = calculateHours(item.start_time, item.end_time, item.date);
      entry.totalHours += hours;
    });

    return Object.values(employeeMap).sort((a, b) => b.totalHours - a.totalHours);
  }, [data]);

  if (summary.length === 0) return null;

  const totalHours = summary.reduce((sum, emp) => sum + emp.totalHours, 0);

  return (
    <ScrollArea className="h-[280px]">
      <div className="space-y-1 p-4">
        {summary.map((emp) => {
          const percentage = totalHours > 0 ? (emp.totalHours / totalHours) * 100 : 0;
          return (
            <div
              key={emp.employee_id}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-white/[0.07] cursor-pointer transition-all group"
              onClick={() => onEmployeeSelect(emp.employee_id)}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-[#2A4D69]/60 text-white text-xs font-semibold">
                    {getInitials(emp.employee_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{emp.employee_name}</p>
                  <p className="text-xs text-white/45">{emp.employee_id}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm font-bold text-white">{Math.round(emp.totalHours * 100) / 100} h</p>
                  <p className="text-xs text-white/45">{emp.count} requests</p>
                </div>
                <div className="w-16">
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full bg-[#86BBD8]/60 rounded-full" style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
};

// Type Summary Component
const TypeSummary = ({ data, onTypeSelect }: {
  data: OvertimeRecord[];
  onTypeSelect: (type: string) => void;
}) => {
  const summary = useMemo(() => {
    const result: Record<string, { count: number; hours: number }> = {};
    data.forEach((item) => {
      const type = item.overtime_type;
      if (!result[type]) {
        result[type] = {
          count: 0,
          hours: 0,
        };
      }
      const hours = calculateHours(item.start_time, item.end_time, item.date);
      result[type].count += 1;
      result[type].hours += hours;
    });
    return result;
  }, [data]);

  if (Object.keys(summary).length === 0) return null;

  const totalHours = Object.values(summary).reduce((sum, t) => sum + t.hours, 0);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 p-4">
      {Object.entries(OVERTIME_TYPES).map(([key, config]) => {
        const stats = summary[key] || { count: 0, hours: 0 };
        const percentage = totalHours > 0 ? (stats.hours / totalHours) * 100 : 0;
        const Icon = config.icon;

        return (
          <TooltipProvider key={key}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="group relative rounded-xl overflow-hidden text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg border border-white/10 hover:border-white/20 bg-white/[0.06] hover:bg-white/[0.10] p-4 cursor-pointer"
                  onClick={() => onTypeSelect(key)}
                >
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className={`p-1.5 rounded-lg bg-gradient-to-br ${config.gradient} text-white shadow-sm`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-sm font-semibold text-white">{config.shortName}</span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-white/50">Requests</span>
                      <span className="font-bold text-white">{stats.count}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-white/50">Hours</span>
                      <span className="font-bold text-white">{Math.round(stats.hours * 100) / 100}h</span>
                    </div>
                    <div className="h-1 rounded-full bg-white/10 overflow-hidden mt-1">
                      <div className={`h-full bg-gradient-to-r ${config.gradient} rounded-full transition-all`} style={{ width: `${percentage}%` }} />
                    </div>
                    <p className="text-[10px] text-white/40 text-right">{Math.round(percentage)}% of total</p>
                  </div>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Click to filter by {config.name}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </div>
  );
};

// Advanced Filter Component
const AdvancedFilters = ({
  searchTerm,
  onSearchChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  minHours,
  onMinHoursChange,
  maxHours,
  onMaxHoursChange,
  selectedTypes,
  onTypeToggle,
  selectedStatuses,
  onStatusToggle,
  onClearFilters,
  activeFilterCount,
  selectedMonth,
  onMonthChange,
  selectedYear,
  onYearChange,
  selectedEmployee,
  onEmployeeChange,
  availableEmployees,
}: {
  searchTerm: string;
  onSearchChange: (v: string) => void;
  dateFrom: string;
  onDateFromChange: (v: string) => void;
  dateTo: string;
  onDateToChange: (v: string) => void;
  minHours: string;
  onMinHoursChange: (v: string) => void;
  maxHours: string;
  onMaxHoursChange: (v: string) => void;
  selectedTypes: string[];
  onTypeToggle: (v: string) => void;
  selectedStatuses: string[];
  onStatusToggle: (v: string) => void;
  onClearFilters: () => void;
  activeFilterCount: number;
  selectedMonth: string;
  onMonthChange: (v: string) => void;
  selectedYear: string;
  onYearChange: (v: string) => void;
  selectedEmployee: string;
  onEmployeeChange: (v: string) => void;
  availableEmployees: UniqueEmployee[];
}) => {
  const glassInput = "h-10 bg-white/[0.07] border-white/12 text-white placeholder:text-white/30 focus-visible:border-white/30 focus-visible:bg-white/[0.11]";
  const glassLabel = "text-xs font-medium text-white/65 flex items-center gap-1";
  const activeBadge = "cursor-pointer gap-1 px-3 py-1.5 transition-all hover:scale-105 bg-[#86BBD8]/30 border-[#86BBD8]/45 text-white font-semibold";
  const inactiveBadge = "cursor-pointer gap-1 px-3 py-1.5 transition-all hover:scale-105 bg-white/[0.05] border-white/12 text-white/60 hover:bg-white/[0.12] hover:text-white/90";

  return (
    <div className="space-y-4">
      {/* Quick Filter Buttons */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs font-medium text-white/50">Month:</span>
        <Badge
          variant="outline"
          className={selectedMonth === '' ? activeBadge : inactiveBadge}
          onClick={() => onMonthChange('')}
        >
          All
        </Badge>
        {MONTHS.map(month => (
          <Badge
            key={month.value}
            variant="outline"
            className={selectedMonth === month.value ? activeBadge : inactiveBadge}
            onClick={() => onMonthChange(month.value)}
          >
            {month.label.slice(0, 3)}
          </Badge>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs font-medium text-white/50">Employee:</span>
        <Badge
          variant="outline"
          className={selectedEmployee === '' ? activeBadge : inactiveBadge}
          onClick={() => onEmployeeChange('')}
        >
          All
        </Badge>
        {availableEmployees.slice(0, 8).map(emp => (
          <Badge
            key={emp.name}
            variant="outline"
            className={selectedEmployee === emp.name ? activeBadge : inactiveBadge}
            onClick={() => onEmployeeChange(emp.name)}
          >
            {emp.name.split(' ')[0]}
          </Badge>
        ))}
        {availableEmployees.length > 8 && (
          <Popover>
            <PopoverTrigger asChild>
              <Badge variant="outline" className={inactiveBadge}>
                +{availableEmployees.length - 8} more
              </Badge>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2 bg-[rgba(5,15,28,0.95)] border-white/15">
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {availableEmployees.slice(8).map(emp => (
                  <div
                    key={emp.name}
                    className="p-2 text-sm text-white/75 hover:bg-white/[0.10] hover:text-white cursor-pointer rounded transition-colors"
                    onClick={() => onEmployeeChange(emp.name)}
                  >
                    {emp.name}
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* Search */}
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
        <Input
          placeholder="Search by name, ID, position, or reason..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className={`pl-9 ${glassInput}`}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Date Range */}
        <div className="space-y-2">
          <Label className={glassLabel}>
            Date From
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-white/30 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>Filter overtime from this date onwards</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>
          <Input type="date" value={dateFrom} onChange={(e) => onDateFromChange(e.target.value)} className={glassInput} />
        </div>
        <div className="space-y-2">
          <Label className={glassLabel}>
            Date To
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-white/30 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>Filter overtime up to this date</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>
          <Input type="date" value={dateTo} onChange={(e) => onDateToChange(e.target.value)} className={glassInput} />
        </div>

        {/* Hours Range */}
        <div className="space-y-2">
          <Label className={glassLabel}>
            Min Hours
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-white/30 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>Minimum overtime hours</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>
          <Input type="number" step="0.5" value={minHours} onChange={(e) => onMinHoursChange(e.target.value)} placeholder="e.g., 2" className={glassInput} />
        </div>
        <div className="space-y-2">
          <Label className={glassLabel}>
            Max Hours
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-white/30 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>Maximum overtime hours</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>
          <Input type="number" step="0.5" value={maxHours} onChange={(e) => onMaxHoursChange(e.target.value)} placeholder="e.g., 8" className={glassInput} />
        </div>
      </div>

      {/* Type Filters */}
      <div className="space-y-2">
        <Label className={glassLabel}>
          Overtime Types
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-white/30 cursor-help" />
              </TooltipTrigger>
              <TooltipContent>Select one or more overtime types to filter</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Label>
        <div className="flex flex-wrap gap-2">
          {Object.entries(OVERTIME_TYPES).map(([key, type]) => {
            const Icon = type.icon;
            const isSelected = selectedTypes.includes(key);
            return (
              <Badge
                key={key}
                variant="outline"
                className={isSelected ? `${activeBadge} ${type.badge}` : inactiveBadge}
                onClick={() => onTypeToggle(key)}
              >
                <Icon className="h-3 w-3" />
                {type.shortName}
                {isSelected && <X className="h-3 w-3 ml-1" />}
              </Badge>
            );
          })}
        </div>
      </div>

      {/* Status Filters */}
      <div className="space-y-2">
        <Label className={glassLabel}>
          Status
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-white/30 cursor-help" />
              </TooltipTrigger>
              <TooltipContent>Select one or more statuses to filter</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Label>
        <div className="flex flex-wrap gap-2">
          {Object.entries(STATUS_CONFIG).map(([key, status]) => {
            const Icon = status.icon;
            const isSelected = selectedStatuses.includes(key);
            return (
              <Badge
                key={key}
                variant="outline"
                className={isSelected ? `${activeBadge} ${status.badge}` : inactiveBadge}
                onClick={() => onStatusToggle(key)}
              >
                <Icon className="h-3 w-3" />
                {status.label}
                {isSelected && <X className="h-3 w-3 ml-1" />}
              </Badge>
            );
          })}
        </div>
      </div>

      {/* Active Filters Summary */}
      {activeFilterCount > 0 && (
        <div className="flex items-center justify-between pt-2 border-t border-white/[0.07]">
          <span className="text-xs text-white/45">
            {activeFilterCount} active filter{activeFilterCount !== 1 ? 's' : ''}
          </span>
          <button onClick={onClearFilters} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-white/[0.07] hover:bg-white/[0.14] text-white/60 hover:text-white border border-white/10 transition-all">
            <FilterX className="h-3 w-3" />
            Clear all
          </button>
        </div>
      )}
    </div>
  );
};

// Pagination Component
const Pagination = ({ currentPage, totalPages, onPageChange }: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) => {
  const getPageNumbers = (): (number | string)[] => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="gap-1"
      >
        <ChevronLeft className="h-4 w-4" /> Previous
      </Button>
      
      <div className="flex gap-1">
        {getPageNumbers().map((page, idx) => (
          page === '...' ? (
            <span key={idx} className="px-3 py-2 text-sm text-muted-foreground">...</span>
          ) : (
            <Button
              key={idx}
              variant={currentPage === page ? 'default' : 'outline'}
              size="sm"
              onClick={() => onPageChange(page as number)}
              className="min-w-[2.5rem]"
            >
              {page}
            </Button>
          )
        ))}
      </div>
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="gap-1"
      >
        Next <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

// ── Analytics helpers ──────────────────────────────────────────────────────
const MACHINE_KEYWORDS = [
  'crusher', 'mill', 'pump', 'conveyor', 'compressor', 'boiler', 'generator',
  'press', 'grinder', 'screen', 'feeder', 'crane', 'forklift', 'agitator',
  'mixer', 'dryer', 'filter', 'blower', 'fan', 'reactor', 'centrifuge',
  'separator', 'valve', 'motor', 'gearbox', 'bearing', 'hopper', 'belt',
  'silo', 'tank', 'vessel', 'kiln', 'furnace', 'transformer', 'cable',
];

function categorizeReason(reason: string) {
  if (!reason) return 'Other';
  const r = reason.toLowerCase();
  if (r.includes('daily check') || r.includes('routine check') || r.includes('daily inspection') || r.includes('routine inspect')) return 'Daily Checks';
  if (r.includes('breakdown') || r.includes('break down') || r.includes('broke down') || r.includes('fault') || r.includes('failure') || r.includes('tripped') || r.includes('seized')) return 'Breakdown';
  if (r.includes('preventive') || r.includes('preventative') || r.includes('planned maintenance') || r.includes('scheduled maintenance')) return 'Preventive Maint.';
  if (r.includes('electrical') || r.includes('wiring') || r.includes('earthing') || r.includes('switching') || r.includes('electric')) return 'Electrical';
  if (r.includes('mechanical') || r.includes('gearbox') || r.includes('bearing') || r.includes('shaft') || r.includes('alignment') || r.includes('coupling')) return 'Mechanical';
  if (r.includes('emergency') || r.includes('urgent') || r.includes('critical')) return 'Emergency';
  if (r.includes('safety') || r.includes('hazard') || r.includes('risk') || r.includes('incident')) return 'Safety';
  if (r.includes('clean') || r.includes('housekeeping') || r.includes('wash')) return 'Cleaning';
  if (r.includes('install') || r.includes('commission') || r.includes('setup') || r.includes('erect')) return 'Installation';
  if (r.includes('project') || r.includes('upgrade') || r.includes('modification') || r.includes('capital')) return 'Project/Upgrade';
  if (r.includes('production') || r.includes('tonnage') || r.includes('output') || r.includes('target')) return 'Production';
  return 'Other';
}

const A_TYPE_COLORS = {
  regular: '#86BBD8', weekend: '#A78BFA', emergency: '#F87171',
  project: '#4ADE80', holiday: '#FBBF24', night: '#818CF8',
};
const A_PIE_COLORS = ['#86BBD8', '#A78BFA', '#F87171', '#4ADE80', '#FBBF24', '#818CF8', '#F97316', '#EC4899'];
const A_CAT_COLORS = ['#86BBD8', '#F59E0B', '#EF4444', '#10B981', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16'];
const chartStyle = { backgroundColor: '#0d1829', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#fff' };

const ChartCard = ({ title, subtitle, icon: Icon, children, className = '' }: {
  title: string;
  subtitle?: string;
  icon?: React.ElementType;
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={`oz-glass-panel rounded-2xl overflow-hidden ${className}`}>
    <div className="flex items-center gap-2 px-5 py-3 border-b border-white/[0.07]">
      {Icon && <Icon className="h-3.5 w-3.5 text-[#86BBD8] shrink-0" />}
      <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">{title}</span>
      {subtitle && <span className="text-[11px] text-white/35">{subtitle}</span>}
    </div>
    <div className="p-4">{children}</div>
  </div>
);

const NoData = ({ icon: Icon = Activity, msg = 'No data available' }: {
  icon?: React.ElementType;
  msg?: string;
}) => (
  <div className="flex flex-col items-center justify-center h-40 gap-2">
    <Icon className="h-8 w-8 text-white/20" />
    <span className="text-xs text-white/30">{msg}</span>
  </div>
);

interface TooltipPayloadEntry {
  color?: string;
  fill?: string;
  name?: string;
  value?: number | string;
  unit?: string;
}

const AnalyticsTip = ({ active, payload, label }: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={chartStyle} className="px-3 py-2 text-xs">
      {label && <p className="text-white/60 mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.fill || '#86BBD8' }}>
          {p.name}: <strong>{p.value}{p.unit || ''}</strong>
        </p>
      ))}
    </div>
  );
};

const OvertimeAnalytics = ({ data }: { data: OvertimeRecord[] }) => {
  const [aFrom, setAFrom] = useState('');
  const [aTo, setATo] = useState('');
  const [aEmp, setAEmp] = useState('all');
  const [aType, setAType] = useState('all');

  const filtered = useMemo(() => {
    let d = data;
    if (aFrom) d = d.filter(x => x.date && new Date(x.date) >= new Date(aFrom));
    if (aTo) d = d.filter(x => x.date && new Date(x.date) <= new Date(aTo));
    if (aEmp !== 'all') d = d.filter(x => x.employee_name === aEmp);
    if (aType !== 'all') d = d.filter(x => x.overtime_type === aType);
    return d;
  }, [data, aFrom, aTo, aEmp, aType]);

  const totalHrs = useMemo(() =>
    Math.round(filtered.reduce((s, x) => s + calculateHours(x.start_time, x.end_time, x.date), 0) * 10) / 10,
    [filtered]);
  const avgHrs = filtered.length > 0 ? Math.round((totalHrs / filtered.length) * 10) / 10 : 0;
  const empCount = new Set(filtered.map(x => x.employee_name)).size;

  const employeeData = useMemo(() => {
    const m: Record<string, number> = {};
    filtered.forEach(x => {
      if (!x.employee_name) return;
      m[x.employee_name] = (m[x.employee_name] || 0) + calculateHours(x.start_time, x.end_time, x.date);
    });
    return Object.entries(m)
      .map(([name, hrs]) => ({ name: name.split(' ').slice(0, 2).join(' '), full: name, hours: Math.round(hrs * 10) / 10 }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 12);
  }, [filtered]);

  const typeData = useMemo(() => {
    const m: Record<string, number> = {};
    filtered.forEach(x => { m[x.overtime_type] = (m[x.overtime_type] || 0) + 1; });
    return Object.entries(m).map(([t, n]) => ({
      name: OVERTIME_TYPES[t as keyof typeof OVERTIME_TYPES]?.shortName || t, value: n, color: A_TYPE_COLORS[t as keyof typeof A_TYPE_COLORS] || '#86BBD8',
    }));
  }, [filtered]);

  const monthlyData = useMemo(() => {
    const m: Record<string, { month: string; hours: number; count: number }> = {};
    filtered.forEach(x => {
      if (!x.date) return;
      const d = new Date(x.date);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      if (!m[k]) m[k] = { month: label, hours: 0, count: 0 };
      m[k].hours += calculateHours(x.start_time, x.end_time, x.date);
      m[k].count++;
    });
    return Object.entries(m)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => ({ ...v, hours: Math.round(v.hours * 10) / 10 }));
  }, [filtered]);

  const dowData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const m = Object.fromEntries(days.map(d => [d, 0]));
    filtered.forEach(x => {
      if (!x.date) return;
      m[days[new Date(x.date).getDay()]] += calculateHours(x.start_time, x.end_time, x.date);
    });
    return days.map(d => ({ day: d, hours: Math.round(m[d] * 10) / 10 }));
  }, [filtered]);

  const categoryData = useMemo(() => {
    const m: Record<string, { category: string; hours: number; count: number }> = {};
    filtered.forEach(x => {
      const cat = categorizeReason(x.reason);
      if (!m[cat]) m[cat] = { category: cat, hours: 0, count: 0 };
      m[cat].hours += calculateHours(x.start_time, x.end_time, x.date);
      m[cat].count++;
    });
    return Object.values(m)
      .sort((a, b) => b.hours - a.hours)
      .map(x => ({ ...x, hours: Math.round(x.hours * 10) / 10 }));
  }, [filtered]);

  const machineData = useMemo(() => {
    const m: Record<string, { machine: string; hours: number; count: number }> = {};
    filtered.forEach(x => {
      if (!x.reason) return;
      const lower = x.reason.toLowerCase();
      const hrs = calculateHours(x.start_time, x.end_time, x.date);
      MACHINE_KEYWORDS.forEach(kw => {
        if (lower.includes(kw)) {
          if (!m[kw]) m[kw] = { machine: kw[0].toUpperCase() + kw.slice(1), hours: 0, count: 0 };
          m[kw].hours += hrs;
          m[kw].count++;
        }
      });
    });
    return Object.values(m).sort((a, b) => b.count - a.count).slice(0, 10)
      .map(x => ({ ...x, hours: Math.round(x.hours * 10) / 10 }));
  }, [filtered]);

  const sectionData = useMemo(() => {
    const m: Record<string, { name: string; value: number }> = {};
    filtered.forEach(x => {
      const sec = ((x.position || x.department || 'Unknown').split(/[,\/\-]/)[0].trim()) || 'Unknown';
      if (!m[sec]) m[sec] = { name: sec, value: 0 };
      m[sec].value += calculateHours(x.start_time, x.end_time, x.date);
    });
    return Object.values(m).sort((a, b) => b.value - a.value).slice(0, 8)
      .map(x => ({ ...x, value: Math.round(x.value * 10) / 10 }));
  }, [filtered]);

  const empList = useMemo(() => [...new Set(data.map(x => x.employee_name).filter(Boolean))].sort(), [data]);
  const peakDay = [...dowData].sort((a, b) => b.hours - a.hours)[0];
  const hasFilters = aFrom || aTo || aEmp !== 'all' || aType !== 'all';

  return (
    <div className="space-y-4">
      {/* Scope filters */}
      <div className="oz-glass-panel rounded-2xl px-5 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <Sliders className="h-3.5 w-3.5 text-[#86BBD8]" />
            <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">Analytics Scope</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <input type="date" value={aFrom} onChange={e => setAFrom(e.target.value)}
              className="px-2 py-1.5 text-[11px] rounded-lg bg-white/[0.07] border border-white/12 text-white focus:outline-none focus:border-white/26 transition-all" />
            <span className="text-white/30 self-center text-xs">to</span>
            <input type="date" value={aTo} onChange={e => setATo(e.target.value)}
              className="px-2 py-1.5 text-[11px] rounded-lg bg-white/[0.07] border border-white/12 text-white focus:outline-none focus:border-white/26 transition-all" />
            <select value={aEmp} onChange={e => setAEmp(e.target.value)}
              className="px-2 py-1.5 text-[11px] rounded-lg bg-white/[0.07] border border-white/12 text-white focus:outline-none focus:border-white/26 transition-all" style={{ backgroundColor: '#0d1829' }}>
              <option value="all">All Employees</option>
              {empList.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <select value={aType} onChange={e => setAType(e.target.value)}
              className="px-2 py-1.5 text-[11px] rounded-lg bg-white/[0.07] border border-white/12 text-white focus:outline-none focus:border-white/26 transition-all" style={{ backgroundColor: '#0d1829' }}>
              <option value="all">All Types</option>
              {Object.entries(OVERTIME_TYPES).map(([k, v]) => <option key={k} value={k}>{v.shortName}</option>)}
            </select>
            {hasFilters && (
              <button onClick={() => { setAFrom(''); setATo(''); setAEmp('all'); setAType('all'); }}
                className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.13] text-white/55 border border-white/10 transition-all">
                <FilterX className="h-3 w-3" /> Reset
              </button>
            )}
          </div>
          <span className="text-[11px] text-white/35 ml-auto">{filtered.length} records in scope</span>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Records', value: filtered.length, icon: FileText, color: 'text-[#86BBD8]' },
          { label: 'Total Hours', value: `${totalHrs}h`, icon: Clock, color: 'text-emerald-400' },
          { label: 'Avg / Record', value: `${avgHrs}h`, icon: TrendingUp, color: 'text-amber-400' },
          { label: 'Employees', value: empCount, icon: Users, color: 'text-purple-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="oz-glass-panel rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-white/[0.06] flex items-center justify-center shrink-0">
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <div>
              <p className="text-lg font-bold text-white leading-tight">{value}</p>
              <p className="text-[11px] text-white/45">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="oz-glass-panel rounded-2xl py-16 flex flex-col items-center gap-3">
          <Activity className="h-10 w-10 text-white/20" />
          <p className="text-sm text-white/40">No overtime records match the selected scope.</p>
        </div>
      ) : (
        <>
          {/* Row 1: Employee bar + Type pie */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <ChartCard title="Top Employees by OT Hours" subtitle="sorted by total hours" icon={Users} className="lg:col-span-2">
              {employeeData.length === 0 ? <NoData /> : (
                <ResponsiveContainer width="100%" height={Math.min(340, Math.max(160, employeeData.length * 30))}>
                  <BarChart data={employeeData} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 10 }} axisLine={false} tickLine={false} unit="h" />
                    <YAxis dataKey="name" type="category" tick={{ fill: 'rgba(255,255,255,0.70)', fontSize: 10 }} axisLine={false} tickLine={false} width={110} />
                    <RechartsTip content={<AnalyticsTip />} />
                    <Bar dataKey="hours" fill="#86BBD8" radius={[0, 4, 4, 0]} name="hours" unit="h" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
            <ChartCard title="By Overtime Type" subtitle="% of records" icon={PieChart}>
              {typeData.length === 0 ? <NoData /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <RPieChart>
                    <Pie data={typeData} cx="50%" cy="45%" innerRadius={52} outerRadius={88}
                      dataKey="value" nameKey="name" paddingAngle={3}>
                      {typeData.map((e, i) => <Cell key={i} fill={e.color} stroke="rgba(0,0,0,0.25)" />)}
                    </Pie>
                    <RechartsTip content={<AnalyticsTip />} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px', color: 'rgba(255,255,255,0.55)' }} />
                  </RPieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          {/* Row 2: Monthly trend — full width */}
          <ChartCard title="Monthly OT Trend" subtitle="total hours per month" icon={TrendingUp}>
            {monthlyData.length === 0 ? <NoData msg="No date data available" /> : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={monthlyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="aGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#86BBD8" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#86BBD8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 10 }} axisLine={false} tickLine={false} unit="h" />
                  <RechartsTip content={<AnalyticsTip />} />
                  <Area type="monotone" dataKey="hours" stroke="#86BBD8" strokeWidth={2} fill="url(#aGrad)" name="hours" unit="h" dot={{ fill: '#86BBD8', r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Row 3: Day-of-week + Work category */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Day-of-Week Pattern" subtitle="total OT hours per weekday" icon={Calendar}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dowData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 10 }} axisLine={false} tickLine={false} unit="h" />
                  <RechartsTip content={<AnalyticsTip />} />
                  <Bar dataKey="hours" radius={[4, 4, 0, 0]} name="hours" unit="h">
                    {dowData.map((e, i) => <Cell key={i} fill={e.day === 'Sat' || e.day === 'Sun' ? '#FBBF24' : '#86BBD8'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Work Category Breakdown" subtitle="OT hours by activity type" icon={Activity}>
              {categoryData.length === 0 ? <NoData /> : (
                <ResponsiveContainer width="100%" height={Math.min(300, Math.max(180, categoryData.length * 30))}>
                  <BarChart data={categoryData} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 10 }} axisLine={false} tickLine={false} unit="h" />
                    <YAxis dataKey="category" type="category" tick={{ fill: 'rgba(255,255,255,0.65)', fontSize: 10 }} axisLine={false} tickLine={false} width={115} />
                    <RechartsTip content={<AnalyticsTip />} />
                    <Bar dataKey="hours" radius={[0, 4, 4, 0]} name="hours" unit="h">
                      {categoryData.map((_, i) => <Cell key={i} fill={A_CAT_COLORS[i % A_CAT_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          {/* Row 4: Machine ranking + Section pie */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Equipment Problem Ranking" subtitle="keyword mentions in OT reasons" icon={Cpu}>
              {machineData.length === 0 ? (
                <NoData icon={Cpu} msg="No equipment keywords found in reasons yet" />
              ) : (
                <ResponsiveContainer width="100%" height={Math.min(320, Math.max(160, machineData.length * 34))}>
                  <BarChart data={machineData} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="machine" type="category" tick={{ fill: 'rgba(255,255,255,0.65)', fontSize: 10 }} axisLine={false} tickLine={false} width={80} />
                    <RechartsTip content={<AnalyticsTip />} />
                    <Bar dataKey="count" fill="#F87171" radius={[0, 4, 4, 0]} name="incidents" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
            <ChartCard title="OT Hours by Section / Role" subtitle="position group breakdown" icon={Briefcase}>
              {sectionData.length === 0 ? <NoData /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <RPieChart>
                    <Pie data={sectionData} cx="50%" cy="45%" innerRadius={52} outerRadius={88}
                      dataKey="value" nameKey="name" paddingAngle={3}>
                      {sectionData.map((_, i) => <Cell key={i} fill={A_PIE_COLORS[i % A_PIE_COLORS.length]} stroke="rgba(0,0,0,0.25)" />)}
                    </Pie>
                    <RechartsTip formatter={(v) => [`${v}h`, 'Hours']} contentStyle={chartStyle} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px', color: 'rgba(255,255,255,0.55)' }} />
                  </RPieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          {/* Root-cause insight cards */}
          {categoryData.length > 0 && (
            <div className="oz-glass-panel rounded-2xl px-5 py-4">
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-3.5 w-3.5 text-[#86BBD8]" />
                <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">Root-Cause Insights</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-white/[0.04] rounded-xl p-3 border border-white/[0.07]">
                  <p className="text-[10px] text-white/40 mb-1 uppercase tracking-wide">Highest OT Category</p>
                  <p className="text-sm font-bold text-white">{categoryData[0].category}</p>
                  <p className="text-xs text-white/50">{categoryData[0].hours}h · {categoryData[0].count} records</p>
                </div>
                <div className="bg-white/[0.04] rounded-xl p-3 border border-white/[0.07]">
                  <p className="text-[10px] text-white/40 mb-1 uppercase tracking-wide">Peak Day</p>
                  <p className="text-sm font-bold text-white">{peakDay?.day} ({peakDay?.hours}h total)</p>
                  <p className="text-xs text-white/50">{peakDay?.day === 'Sat' || peakDay?.day === 'Sun' ? 'Weekend OT — review shift scheduling' : 'Weekday peak — check workload distribution'}</p>
                </div>
                <div className="bg-white/[0.04] rounded-xl p-3 border border-white/[0.07]">
                  <p className="text-[10px] text-white/40 mb-1 uppercase tracking-wide">Top OT Employee</p>
                  <p className="text-sm font-bold text-white">{employeeData[0]?.full || '—'}</p>
                  <p className="text-xs text-white/50">{employeeData[0]?.hours}h total OT logged</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ============= Main Page =============
export default function OvertimeManagementPage() {
  const [overtime, setOvertime] = useState<OvertimeRecord[]>([]);
  const [selectedOvertime, setSelectedOvertime] = useState<OvertimeRecord | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState<OvertimeRecord | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  
  // Basic Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  
  // Advanced Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [minHours, setMinHours] = useState('');
  const [maxHours, setMaxHours] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedEmployeeName, setSelectedEmployeeName] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('table');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showTypeSummary, setShowTypeSummary] = useState(false);

  // Sorting
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

  // Expanded rows in table view
  const [expandedRows, setExpandedRows] = useState<Set<number | string>>(new Set());

  // Panel visibility
  const [showHeroStats, setShowHeroStats] = useState(false);
  const [recordsPanelMinimized, setRecordsPanelMinimized] = useState(false);

  // Main tab: 'records' | 'analytics'
  const [activeMainTab, setActiveMainTab] = useState('records');


  const fetchAllData = async () => {
    setLoading(true);
    try {
      const apiFilters = {
        status: statusFilter === 'all' ? null : statusFilter,
        overtime_type: typeFilter === 'all' ? null : typeFilter,
        employee_id: employeeFilter === 'all' ? null : employeeFilter,
        date_from: dateFrom || null,
        date_to: dateTo || null,
        month: monthFilter || null,
        year: yearFilter || null,
      };
      const data = await fetchOvertime(apiFilters);
      setOvertime(data);
      toast.success(`Loaded ${data.length} overtime requests`);
    } catch (_err) {
      toast.error('Failed to load overtime data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [statusFilter, typeFilter, employeeFilter, dateFrom, dateTo, monthFilter, yearFilter]);

  const handleCreate = async (data: Partial<FormData>) => {
    const newItem = await createOvertime(data);
    setOvertime((prev) => [newItem, ...prev]);
  };

  const handleUpdate = async (id: number | string, data: Partial<FormData>) => {
    const updated = await updateOvertime(id, data);
    setOvertime((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updated } : item))
    );
  };

  const handleStatusUpdate = async (id: number | string, status: string) => {
    await updateOvertimeStatus(id, status);
    setOvertime((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status } : item))
    );
  };

  const handleDelete = async (id: number | string) => {
    await deleteOvertime(id);
    setOvertime((prev) => prev.filter((item) => item.id !== id));
  };

  const toggleRowExpanded = (id: number | string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const [showDlMenu, setShowDlMenu] = useState(false);

  const downloadOvertimeExcel = async () => {
    setShowDlMenu(false);
    if (!overtime.length) { toast.warning('No data to export'); return; }
    try {
      const ExcelJS = (await import('exceljs')).default;
      const { saveAs } = await import('file-saver');
      const wb = new ExcelJS.Workbook();
      wb.creator = 'Ozech MyOffice';
      const ws = wb.addWorksheet('Overtime Register');
      ws.columns = [
        { header: 'Employee Name', key: 'name',    width: 24 },
        { header: 'Employee ID',   key: 'id',      width: 14 },
        { header: 'Position',      key: 'pos',     width: 22 },
        { header: 'Department',    key: 'dept',    width: 18 },
        { header: 'OT Type',       key: 'type',    width: 18 },
        { header: 'Date',          key: 'date',    width: 14 },
        { header: 'Start Time',    key: 'start',   width: 12 },
        { header: 'End Time',      key: 'end',     width: 12 },
        { header: 'Reason',        key: 'reason',  width: 34 },
        { header: 'Status',        key: 'status',  width: 14 },
        { header: 'Applied Date',  key: 'applied', width: 14 },
        { header: 'Notes',         key: 'notes',   width: 28 },
      ];
      const hdr = ws.getRow(1);
      hdr.eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2A4D69' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });
      hdr.height = 18;
      overtime.forEach((r, i) => {
        const row = ws.addRow({
          name: r.employee_name, id: r.employee_id, pos: r.position || '',
          dept: r.department || '', type: r.overtime_type || '',
          date: r.date ? new Date(r.date).toLocaleDateString('en-GB') : '',
          start: r.start_time || '', end: r.end_time || '',
          reason: r.reason || '', status: r.status || '',
          applied: r.applied_date ? new Date(r.applied_date).toLocaleDateString('en-GB') : '',
          notes: r.notes || '',
        });
        if (i % 2 === 1) row.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4F8' } }; });
        const sc = row.getCell('status');
        if (r.status === 'approved')  sc.font = { color: { argb: 'FF34D399' }, bold: true };
        else if (r.status === 'rejected') sc.font = { color: { argb: 'FFF43F5E' }, bold: true };
        else if (r.status === 'pending')  sc.font = { color: { argb: 'FFF59E0B' }, bold: true };
      });
      ws.autoFilter = { from: 'A1', to: 'L1' };
      ws.views = [{ state: 'frozen', ySplit: 1 }];
      const buf = await wb.xlsx.writeBuffer();
      saveAs(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        `Overtime_Register_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success(`Excel exported — ${overtime.length} records`);
    } catch (err: any) { toast.error(`Export failed: ${err.message}`); }
  };

  const downloadOvertimePDF = async () => {
    setShowDlMenu(false);
    if (!overtime.length) { toast.warning('No data to export'); return; }
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      doc.setFontSize(14); doc.setTextColor(42, 77, 105);
      doc.text('Overtime Register', 14, 14);
      doc.setFontSize(8); doc.setTextColor(100, 100, 100);
      doc.text(`Generated ${new Date().toLocaleDateString('en-GB')}  ·  ${overtime.length} records`, 14, 20);
      autoTable(doc, {
        startY: 25,
        head: [['Employee', 'ID', 'Position', 'OT Type', 'Date', 'Start', 'End', 'Reason', 'Status', 'Applied']],
        body: overtime.map(r => [
          r.employee_name, r.employee_id, r.position || '',
          r.overtime_type || '',
          r.date ? new Date(r.date).toLocaleDateString('en-GB') : '',
          r.start_time || '', r.end_time || '',
          r.reason || '', r.status || '',
          r.applied_date ? new Date(r.applied_date).toLocaleDateString('en-GB') : '',
        ]),
        headStyles: { fillColor: [42, 77, 105], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
        bodyStyles: { fontSize: 7.5 },
        alternateRowStyles: { fillColor: [240, 244, 248] },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 8) {
            const val = String(data.cell.raw);
            if (val === 'approved')  data.cell.styles.textColor = [52, 211, 153];
            if (val === 'rejected')  data.cell.styles.textColor = [244, 63, 94];
            if (val === 'pending')   data.cell.styles.textColor = [245, 158, 11];
          }
        },
        styles: { cellPadding: 1.5 },
        margin: { left: 10, right: 10 },
      });
      doc.save(`Overtime_Register_${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success(`PDF exported — ${overtime.length} records`);
    } catch (err: any) { toast.error(`Export failed: ${err.message}`); }
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setTypeFilter('all');
    setEmployeeFilter('all');
    setDateFrom('');
    setDateTo('');
    setMonthFilter('');
    setYearFilter('');
    setMinHours('');
    setMaxHours('');
    setSearchTerm('');
    setSelectedTypes([]);
    setSelectedStatuses([]);
    setSelectedEmployeeName('');
    setCurrentPage(1);
    toast.success('All filters cleared');
  };

  const handleTypeSelect = (type: string) => {
    setTypeFilter(type);
    setSelectedTypes([type]);
    setShowAdvancedFilters(true);
  };

  const handleTypeToggle = (type: string) => {
    setSelectedTypes(prev => {
      const newTypes = prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type];
      
      if (newTypes.length === 1) {
        setTypeFilter(newTypes[0]);
      } else if (newTypes.length === 0) {
        setTypeFilter('all');
      } else {
        setTypeFilter('all');
      }
      
      return newTypes;
    });
  };

  const handleStatusToggle = (status: string) => {
    setSelectedStatuses(prev => {
      const newStatuses = prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status];
      
      if (newStatuses.length === 1) {
        setStatusFilter(newStatuses[0]);
      } else if (newStatuses.length === 0) {
        setStatusFilter('all');
      } else {
        setStatusFilter('all');
      }
      
      return newStatuses;
    });
  };

  const handleMonthChange = (month: string) => {
    setMonthFilter(month);
    setCurrentPage(1);
  };

  const handleYearChange = (year: string) => {
    setYearFilter(year);
    setCurrentPage(1);
  };

  const handleEmployeeQuickFilter = (employeeName: string) => {
    setSelectedEmployeeName(employeeName);
    setCurrentPage(1);
  };

  // Apply all filters to the data
  const processedOvertime = useMemo(() => {
    let filtered = overtime;

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (ot) =>
          ot.employee_name?.toLowerCase().includes(term) ||
          ot.employee_id?.toLowerCase().includes(term) ||
          ot.position?.toLowerCase().includes(term) ||
          ot.reason?.toLowerCase().includes(term)
      );
    }

    // Apply employee name filter (quick filter)
    if (selectedEmployeeName) {
      filtered = filtered.filter(ot => ot.employee_name === selectedEmployeeName);
    }

    // Apply date range filter
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter((ot) => {
        const otDate = new Date(ot.date);
        otDate.setHours(0, 0, 0, 0);
        return otDate >= fromDate;
      });
    }

    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((ot) => {
        const otDate = new Date(ot.date);
        otDate.setHours(0, 0, 0, 0);
        return otDate <= toDate;
      });
    }

    // Apply month filter
    if (monthFilter) {
      filtered = filtered.filter((ot) => {
        const otDate = new Date(ot.date);
        const otMonth = (otDate.getMonth() + 1).toString().padStart(2, '0');
        return otMonth === monthFilter;
      });
    }

    // Apply year filter
    if (yearFilter) {
      filtered = filtered.filter((ot) => {
        const otDate = new Date(ot.date);
        return otDate.getFullYear().toString() === yearFilter;
      });
    }

    // Apply hours range filter
    if (minHours || maxHours) {
      filtered = filtered.filter((ot) => {
        const hours = calculateHours(ot.start_time, ot.end_time, ot.date);
        if (minHours && hours < parseFloat(minHours)) return false;
        if (maxHours && hours > parseFloat(maxHours)) return false;
        return true;
      });
    }

    // Apply multiple type filter
    if (selectedTypes.length > 0) {
      filtered = filtered.filter(ot => selectedTypes.includes(ot.overtime_type));
    }

    // Apply multiple status filter
    if (selectedStatuses.length > 0) {
      filtered = filtered.filter(ot => selectedStatuses.includes(ot.status));
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let compare = 0;
      if (sortBy === 'date') {
        compare = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortBy === 'name') {
        compare = (a.employee_name || '').localeCompare(b.employee_name || '');
      } else if (sortBy === 'hours') {
        const hoursA = calculateHours(a.start_time, a.end_time, a.date);
        const hoursB = calculateHours(b.start_time, b.end_time, b.date);
        compare = hoursA - hoursB;
      } else if (sortBy === 'type') {
        compare = (a.overtime_type || '').localeCompare(b.overtime_type || '');
      } else if (sortBy === 'status') {
        compare = (a.status || '').localeCompare(b.status || '');
      }
      return sortOrder === 'asc' ? compare : -compare;
    });

    return sorted;
  }, [overtime, searchTerm, dateFrom, dateTo, sortBy, sortOrder, minHours, maxHours, selectedTypes, selectedStatuses, monthFilter, yearFilter, selectedEmployeeName]);

  // Get unique employees for quick filters
  const availableEmployees = useMemo(() => {
    return getUniqueEmployees(overtime);
  }, [overtime]);

  // Paginate the data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return processedOvertime.slice(startIndex, endIndex);
  }, [processedOvertime, currentPage]);

  const totalPages = Math.ceil(processedOvertime.length / itemsPerPage);

  const stats = useMemo(() => {
    const total = processedOvertime.length;
    const pending = processedOvertime.filter((ot) => ot.status === 'pending').length;
    const approved = processedOvertime.filter((ot) => ot.status === 'approved').length;
    const rejected = processedOvertime.filter((ot) => ot.status === 'rejected').length;
    
    let totalHours = 0;
    
    processedOvertime.forEach((ot) => {
      const hours = calculateHours(ot.start_time, ot.end_time, ot.date);
      totalHours += hours;
    });
    
    return { 
      total, 
      pending, 
      approved, 
      rejected,
      totalHours: Math.round(totalHours * 100) / 100,
      averageHours: total > 0 ? Math.round((totalHours / total) * 100) / 100 : 0,
    };
  }, [processedOvertime]);

  const handleEmployeeSelect = (employeeId: string) => {
    setEmployeeFilter(employeeId);
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchTerm) count++;
    if (dateFrom) count++;
    if (dateTo) count++;
    if (monthFilter) count++;
    if (yearFilter) count++;
    if (minHours) count++;
    if (maxHours) count++;
    if (selectedTypes.length > 0) count++;
    if (selectedStatuses.length > 0) count++;
    if (statusFilter !== 'all') count++;
    if (typeFilter !== 'all') count++;
    if (employeeFilter !== 'all') count++;
    if (selectedEmployeeName) count++;
    return count;
  }, [searchTerm, dateFrom, dateTo, monthFilter, yearFilter, minHours, maxHours, selectedTypes, selectedStatuses, statusFilter, typeFilter, employeeFilter, selectedEmployeeName]);

  return (
    <PageShell>

      {/* ── Hero ── */}
      <section className="relative text-white">
        <div className="container mx-auto px-4 pt-6 pb-3">
          <div className="oz-glass-dark rounded-2xl overflow-hidden">

            {/* Top bar: title + actions */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 py-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#2A4D69] to-[#86BBD8] flex items-center justify-center shrink-0 shadow-lg">
                  <Clock className="h-4 w-4 text-white" />
                </div>
                <div className="min-w-0">
                  <nav className="flex items-center gap-1 text-[10px] text-white/40 mb-0.5">
                    <span>Home</span>
                    <ChevronRight className="h-2.5 w-2.5" />
                    <span className="text-white/65">Overtime</span>
                  </nav>
                  <h1 className="text-xl md:text-2xl font-extrabold font-heading text-white tracking-tight leading-tight">Overtime Management</h1>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setShowHeroStats(v => !v)}
                        className="h-7 w-7 flex items-center justify-center rounded-lg bg-white/[0.08] hover:bg-white/[0.16] text-white/55 border border-white/12 transition-all"
                      >
                        {showHeroStats ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>{showHeroStats ? 'Hide stats' : 'Show stats'}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={fetchAllData}
                        disabled={loading}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.16] text-white/80 border border-white/15 transition-all disabled:opacity-40"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">Refresh</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Reload overtime data</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {/* Download dropdown */}
                <div className="relative">
                  <button type="button" onClick={() => setShowDlMenu(p => !p)} disabled={overtime.length === 0}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.16] text-white/80 border border-white/15 transition-all disabled:opacity-40">
                    <Download className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Download</span>
                  </button>
                  {showDlMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowDlMenu(false)} />
                      <div className="absolute right-0 top-full mt-1 z-50 rounded-xl shadow-2xl overflow-hidden w-48"
                        style={{ background: 'rgba(4,12,24,0.97)', border: '1px solid rgba(255,255,255,0.14)' }}>
                        <button type="button" onClick={downloadOvertimeExcel}
                          className="w-full flex items-center gap-2.5 px-4 py-3 text-xs text-white/85 hover:bg-white/[0.10] transition-all border-b border-white/[0.07]">
                          <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" /> Export Excel (.xlsx)
                        </button>
                        <button type="button" onClick={downloadOvertimePDF}
                          className="w-full flex items-center gap-2.5 px-4 py-3 text-xs text-white/85 hover:bg-white/[0.10] transition-all">
                          <FileDown className="h-3.5 w-3.5 text-rose-400" /> Export PDF
                        </button>
                      </div>
                    </>
                  )}
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setShowForm(true)}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#86BBD8]/25 hover:bg-[#86BBD8]/40 text-white font-semibold border border-[#86BBD8]/35 transition-all"
                      >
                        <Plus className="h-3.5 w-3.5" /> New OT Request
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Create a new overtime request</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            {/* Expandable stats */}
            {showHeroStats && (
              <div className="border-t border-white/10 px-6 py-3 flex flex-wrap items-center gap-x-1 gap-y-2">
                {(([
                  { icon: FileText, color: 'text-[#86BBD8]', val: stats.total, label: 'Total requests', valColor: 'text-white', onClick: undefined as (() => void) | undefined },
                  { icon: Clock, color: 'text-emerald-400', val: `${stats.totalHours}h`, label: 'Total hours', valColor: 'text-white', onClick: undefined as (() => void) | undefined },
                  { icon: Clock, color: 'text-amber-400', val: stats.pending, label: 'Pending', valColor: 'text-amber-300', onClick: (() => { setStatusFilter('pending'); handleStatusToggle('pending'); }) as (() => void) | undefined },
                  { icon: CheckCircle2, color: 'text-emerald-400', val: stats.approved, label: 'Approved', valColor: 'text-emerald-300', onClick: (() => { setStatusFilter('approved'); handleStatusToggle('approved'); }) as (() => void) | undefined },
                  ...(stats.rejected > 0 ? [{ icon: XCircle, color: 'text-rose-400', val: stats.rejected, label: 'Rejected', valColor: 'text-rose-300', onClick: undefined as (() => void) | undefined }] : []),
                ] as { icon: React.ElementType; color: string; val: string | number; label: string; valColor: string; onClick: (() => void) | undefined }[])).map((item, i, arr) => (
                  <React.Fragment key={i}>
                    <button
                      onClick={item.onClick}
                      disabled={!item.onClick}
                      className="flex items-center gap-1.5 group px-3 py-1.5 rounded-lg hover:bg-white/[0.07] transition-all disabled:cursor-default"
                    >
                      <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
                      <span className={`text-base font-bold ${item.valColor || 'text-white'}`}>{item.val}</span>
                      <span className="text-xs text-white/50 group-hover:text-white/70 transition-colors">{item.label}</span>
                    </button>
                    {i < arr.length - 1 && <span className="text-white/15 hidden sm:block select-none">|</span>}
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 pb-8 space-y-3 mt-3">
            {/* Main tab bar */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.05] border border-white/[0.10] w-fit">
              {[
                { id: 'records', label: 'Records', icon: FileText },
                { id: 'analytics', label: 'Analytics', icon: Activity },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveMainTab(id)}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeMainTab === id
                      ? 'bg-white/[0.15] text-white shadow-sm'
                      : 'text-white/45 hover:text-white/70 hover:bg-white/[0.05]'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" /> {label}
                </button>
              ))}
            </div>

            {activeMainTab === 'analytics' ? (
              <OvertimeAnalytics data={processedOvertime} />
            ) : (
            <>
            {/* Type Summary */}
            {processedOvertime.length > 0 && (
              <div className="oz-glass-panel rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.07]">
                  <div className="flex items-center gap-2">
                    <Activity className="h-3.5 w-3.5 text-[#86BBD8]" />
                    <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">Type Breakdown</span>
                    <span className="text-[11px] text-white/35">click a type to filter</span>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => setShowTypeSummary(v => !v)}
                          className="h-6 w-6 flex items-center justify-center rounded-md bg-white/[0.07] hover:bg-white/[0.15] text-white/50 border border-white/12 transition-all"
                        >
                          {showTypeSummary ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>{showTypeSummary ? 'Minimise type breakdown' : 'Show type breakdown'}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                {showTypeSummary && <TypeSummary data={processedOvertime} onTypeSelect={handleTypeSelect} />}
              </div>
            )}

            {/* Employee Summary */}
            {processedOvertime.length > 0 && (
              <div className="oz-glass-panel rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.07]">
                  <div className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 text-[#86BBD8]" />
                    <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">Employee Summary</span>
                    <span className="text-[11px] text-white/35">{processedOvertime.length > 0 && `${new Set(processedOvertime.map(o => o.employee_id)).size} employees`}</span>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => setShowSummary(v => !v)}
                          className="h-6 w-6 flex items-center justify-center rounded-md bg-white/[0.07] hover:bg-white/[0.15] text-white/50 border border-white/12 transition-all"
                        >
                          {showSummary ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>{showSummary ? 'Minimise employee summary' : 'Show employee summary'}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                {showSummary && (
                  <EmployeeSummary
                    data={processedOvertime}
                    show={showSummary}
                    onToggle={setShowSummary}
                    onEmployeeSelect={handleEmployeeSelect}
                  />
                )}
              </div>
            )}

            {/* Filter Panel */}
            <div className="oz-glass-panel rounded-2xl overflow-hidden">
              <Collapsible open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
                <div className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Filter className="h-3.5 w-3.5 text-[#86BBD8] shrink-0" />
                    <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">Filters</span>
                    {activeFilterCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#86BBD8]/25 text-[#86BBD8] border border-[#86BBD8]/30">{activeFilterCount} active</span>
                    )}
                    <span className="text-[11px] text-white/35">{processedOvertime.length} of {overtime.length} records</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {activeFilterCount > 0 && (
                      <button onClick={clearFilters} className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.13] text-white/55 border border-white/10 transition-all">
                        <FilterX className="h-3 w-3" /> Clear
                      </button>
                    )}
                    <CollapsibleTrigger asChild>
                      <button className="h-6 w-6 flex items-center justify-center rounded-md bg-white/[0.07] hover:bg-white/[0.15] text-white/50 border border-white/12 transition-all">
                        {showAdvancedFilters ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>
                    </CollapsibleTrigger>
                  </div>
                </div>

                <CollapsibleContent>
                  <div className="px-5 pb-5 border-t border-white/[0.07] pt-4">
                    <AdvancedFilters
                      searchTerm={searchTerm}
                      onSearchChange={setSearchTerm}
                      dateFrom={dateFrom}
                      onDateFromChange={setDateFrom}
                      dateTo={dateTo}
                      onDateToChange={setDateTo}
                      minHours={minHours}
                      onMinHoursChange={setMinHours}
                      maxHours={maxHours}
                      onMaxHoursChange={setMaxHours}
                      selectedTypes={selectedTypes}
                      onTypeToggle={handleTypeToggle}
                      selectedStatuses={selectedStatuses}
                      onStatusToggle={handleStatusToggle}
                      onClearFilters={clearFilters}
                      activeFilterCount={activeFilterCount}
                      selectedMonth={monthFilter}
                      onMonthChange={handleMonthChange}
                      selectedYear={yearFilter}
                      onYearChange={handleYearChange}
                      selectedEmployee={selectedEmployeeName}
                      onEmployeeChange={handleEmployeeQuickFilter}
                      availableEmployees={availableEmployees}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            {/* Records Panel: title bar with minimize + view toggle + sort */}
            <div className="oz-glass-panel rounded-2xl overflow-hidden">

            {/* Records toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-5 py-3 border-b border-white/[0.07]">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-semibold text-white/70 uppercase tracking-wider shrink-0">Records</span>
                <div className="w-px h-4 bg-white/12 shrink-0 hidden sm:block" />
                {/* View toggle */}
                <div className="flex rounded-lg bg-white/[0.07] border border-white/12 p-0.5">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => setViewMode('table')}
                          className={`px-2.5 py-1 rounded-md transition-all ${viewMode === 'table' ? 'bg-white/20 text-white shadow-sm' : 'text-white/45 hover:text-white/70'}`}
                        >
                          <TableIcon className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Table view</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => setViewMode('grid')}
                          className={`px-2.5 py-1 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white/20 text-white shadow-sm' : 'text-white/45 hover:text-white/70'}`}
                        >
                          <Grid className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Card view</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-white/35" />
                  <input
                    placeholder="Search…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-7 pr-3 py-1.5 text-[11px] rounded-lg bg-white/[0.07] border border-white/12 text-white placeholder:text-white/30 focus:outline-none focus:border-white/26 focus:bg-white/[0.11] transition-all w-36"
                  />
                </div>
                <span className="text-[11px] text-white/35 hidden md:block">
                  {paginatedData.length} of {processedOvertime.length}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <Select value={`${sortBy}-${sortOrder}`} onValueChange={(val) => {
                  const [by, order] = val.split('-');
                  setSortBy(by);
                  setSortOrder(order);
                }}>
                  <SelectTrigger className="w-[150px] h-7 text-[11px] bg-white/[0.07] border-white/12 text-white">
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date-desc">Date (Newest)</SelectItem>
                    <SelectItem value="date-asc">Date (Oldest)</SelectItem>
                    <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                    <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                    <SelectItem value="hours-desc">Hours (High→Low)</SelectItem>
                    <SelectItem value="hours-asc">Hours (Low→High)</SelectItem>
                    <SelectItem value="status-asc">Status</SelectItem>
                  </SelectContent>
                </Select>
                <div className="w-px h-4 bg-white/12 hidden sm:block" />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setRecordsPanelMinimized(v => !v)}
                        className="h-7 w-7 flex items-center justify-center rounded-lg bg-white/[0.07] hover:bg-white/[0.15] text-white/45 border border-white/10 transition-all"
                      >
                        {recordsPanelMinimized ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>{recordsPanelMinimized ? 'Expand records' : 'Minimise records'}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>


            {/* Records content — hidden when minimized */}
            {!recordsPanelMinimized && (
            <div className="p-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-14 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-[#86BBD8]/60" />
                <span className="text-xs text-white/40">Loading overtime records…</span>
              </div>
            ) : paginatedData.length === 0 ? (
              <div className="text-center py-14 rounded-xl bg-white/[0.03] border border-white/[0.07]">
                <div className="h-14 w-14 mx-auto rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center mb-4">
                  <Clock className="h-7 w-7 text-white/30" />
                </div>
                <h3 className="text-sm font-semibold text-white/75 mb-1">No overtime requests found</h3>
                <p className="text-xs text-white/40 mb-5">
                  {overtime.length === 0 ? 'Get started by creating your first request.' : 'No records match your current filters.'}
                </p>
                {overtime.length === 0 ? (
                  <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg bg-[#86BBD8]/25 hover:bg-[#86BBD8]/40 text-white border border-[#86BBD8]/30 transition-all font-medium">
                    <Plus className="h-3.5 w-3.5" /> New Request
                  </button>
                ) : (
                  <button onClick={clearFilters} className="inline-flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg bg-white/[0.08] hover:bg-white/[0.16] text-white/70 border border-white/15 transition-all">
                    <FilterX className="h-3.5 w-3.5" /> Clear Filters
                  </button>
                )}
              </div>
            ) : viewMode === 'grid' ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {paginatedData.map((ot) => (
                    <OvertimeCard
                      key={ot.id}
                      overtime={ot}
                      onView={setSelectedOvertime}
                      onEdit={(ot) => { setEditData(ot); setShowForm(true); }}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </>
            ) : (
              <>
                <div className="rounded-xl overflow-hidden border border-white/[0.07]">
                  <div className="overflow-x-auto">
                    <ShadcnTable>
                      <TableHeader className="bg-white/5">
                        <TableRow className="border-white/10">
                          <TableHead className="w-10 text-white/50"></TableHead>
                          <TableHead className="text-white/50">Employee</TableHead>
                          <TableHead className="text-white/50">Type</TableHead>
                          <TableHead className="text-white/50">Date</TableHead>
                          <TableHead className="text-white/50">Time</TableHead>
                          <TableHead className="text-right text-white/50">Hours</TableHead>
                          <TableHead className="text-white/50">Status</TableHead>
                          <TableHead className="text-right text-white/50">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedData.map((ot) => {
                          const hours = calculateHours(ot.start_time, ot.end_time, ot.date);
                          const isExpanded = expandedRows.has(ot.id);
                          return (
                            <React.Fragment key={ot.id}>
                              <TableRow
                                className="cursor-pointer hover:bg-white/5 transition-colors border-white/10"
                                onClick={() => setSelectedOvertime(ot)}
                              >
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 w-7 p-0"
                                          onClick={(e) => toggleRowExpanded(ot.id, e)}
                                        >
                                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        {isExpanded ? 'Hide details' : 'Click to expand and view reason'}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8">
                                      <AvatarFallback className="bg-[#2A4D69]/60 text-white text-xs">
                                        {getInitials(ot.employee_name)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <div className="font-medium text-white">{ot.employee_name}</div>
                                      <div className="text-xs text-white/45">{ot.employee_id}</div>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <TypeBadge type={ot.overtime_type} />
                                </TableCell>
                                <TableCell className="whitespace-nowrap text-white/75">{formatDate(ot.date)}</TableCell>
                                <TableCell className="whitespace-nowrap text-xs text-white/75">
                                  {formatTime(ot.start_time)} – {formatTime(ot.end_time)}
                                </TableCell>
                                <TableCell className="text-right font-bold text-white">{hours} h</TableCell>
                                <TableCell>
                                  <StatusBadge status={ot.status} />
                                </TableCell>
                                <TableCell className="text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 w-8 p-0"
                                          onClick={() => setSelectedOvertime(ot)}
                                        >
                                          <Eye className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>View details</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 w-8 p-0"
                                          onClick={() => { setEditData(ot); setShowForm(true); }}
                                        >
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Edit</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </TableCell>
                              </TableRow>
                              {isExpanded && (
                                <TableRow className="bg-white/[0.04] border-white/10">
                                  <TableCell colSpan={8} className="p-4">
                                    <div className="space-y-3 max-w-3xl">
                                      <div>
                                        <p className="text-xs font-medium text-white/45 mb-1 flex items-center gap-1">
                                          <MessageSquare className="h-3 w-3" /> Reason
                                        </p>
                                        <p className="text-sm bg-white/[0.06] text-white/75 p-3 rounded-lg border border-white/10">
                                          {ot.reason || 'No reason provided'}
                                        </p>
                                      </div>
                                      <div className="flex gap-4 text-xs text-white/40">
                                        <span>Contact: {ot.contact_number || 'Not provided'}</span>
                                        {ot.emergency_contact && (
                                          <span>Emergency: {ot.emergency_contact}</span>
                                        )}
                                      </div>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </TableBody>
                    </ShadcnTable>
                  </div>
                </div>
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </>
            )}
            </div>
            )}
            </div>
            </>
            )}
      </main>

      {/* Modals */}
      {showForm && (
        <OvertimeApplicationForm
          onClose={() => {
            setShowForm(false);
            setEditData(null);
          }}
          onSuccess={() => {
            fetchAllData();
            setShowForm(false);
            setEditData(null);
          }}
          editData={editData}
          onUpdate={handleUpdate}
        />
      )}

      {selectedOvertime && (
        <OvertimeDetailsModal
          overtime={selectedOvertime}
          onClose={() => setSelectedOvertime(null)}
          onStatusUpdate={handleStatusUpdate}
          onDelete={handleDelete}
          onEdit={(ot) => { setEditData(ot); setShowForm(true); }}
        />
      )}
    </PageShell>
  );
}
