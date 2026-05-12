// app/leaves/page.tsx
'use client';

import { PageShell } from '@/components/PageShell';

import React, { useState, useMemo, useEffect } from "react";
import {
  Calendar, Plus, Search, RefreshCw, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, User, FileText, Eye, Loader2,
  Clock, AlertCircle, Send, Phone, Trash2, MoreVertical,
  Download, List, LayoutGrid, X, Edit, ArrowUpRight,
  Stethoscope, Shield, Heart, Users, GraduationCap,
  CalendarDays, BookOpen, Database, Layers, Server, Home as HomeIcon,
  BarChart3, PieChart, Mail, ExternalLink, Filter, FilterX,
  ArrowUpDown, SortAsc, SortDesc, EyeOff, ChevronRight
} from "lucide-react";
import Link from "next/link";

// Shadcn/ui imports
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

// Animation styles defined in globals.css



// ============= Employee search result type =============
interface EmployeeSearchResult {
  id: number;
  employee_id: string;
  name: string;
  designation: string;
  phone: string;
  supervisor: string;
  department: string;
}

const COMMON_REASONS = [
  "Annual leave",
  "Sick leave",
  "Family emergency",
  "Medical appointment",
  "Personal reasons",
  "Bereavement",
  "Study leave",
  "Maternity leave",
  "Paternity leave",
  "Unpaid leave"
];

// ---------- Leave Types ----------
interface LeaveType {
  name: string;
  shortName: string;
  color: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  icon: React.ComponentType<any>;
  description: string;
}

const LEAVE_TYPES: Record<string, LeaveType> = {
  annual: { 
    name: 'Annual Leave', 
    shortName: 'Annual', 
    color: '#2563eb', 
    bgColor: 'bg-blue-50', 
    textColor: 'text-blue-700', 
    borderColor: 'border-blue-200',
    icon: CalendarDays,
    description: 'Paid vacation time for rest and relaxation'
  },
  sick: { 
    name: 'Sick Leave', 
    shortName: 'Sick', 
    color: '#dc2626', 
    bgColor: 'bg-red-50', 
    textColor: 'text-red-700', 
    borderColor: 'border-red-200',
    icon: Stethoscope,
    description: 'Medical and health-related absences'
  },
  emergency: { 
    name: 'Emergency Leave', 
    shortName: 'Emergency', 
    color: '#d97706', 
    bgColor: 'bg-amber-50', 
    textColor: 'text-amber-700', 
    borderColor: 'border-amber-200',
    icon: Shield,
    description: 'Urgent personal or family matters'
  },
  compassionate: { 
    name: 'Compassionate Leave', 
    shortName: 'Compassionate', 
    color: '#7c3aed', 
    bgColor: 'bg-purple-50', 
    textColor: 'text-purple-700', 
    borderColor: 'border-purple-200',
    icon: Heart,
    description: 'Bereavement and family emergencies'
  },
  maternity: { 
    name: 'Maternity Leave', 
    shortName: 'Maternity', 
    color: '#db2777', 
    bgColor: 'bg-pink-50', 
    textColor: 'text-pink-700', 
    borderColor: 'border-pink-200',
    icon: Users,
    description: 'Parental leave for childbirth'
  },
  study: { 
    name: 'Study Leave', 
    shortName: 'Study', 
    color: '#059669', 
    bgColor: 'bg-emerald-50', 
    textColor: 'text-emerald-700', 
    borderColor: 'border-emerald-200',
    icon: GraduationCap,
    description: 'Professional development and education'
  }
};

// ---------- Types ----------
interface Leave {
  id: string;
  employee_id: string;
  employee_name: string;
  position: string;
  leave_type: keyof typeof LEAVE_TYPES;
  start_date: string;
  end_date: string;
  reason: string;
  contact_number: string;
  emergency_contact?: string;
  handover_to?: string;
  status: 'pending' | 'approved' | 'rejected';
  total_days: number;
  applied_date: string;
  updated_at?: string;
  department?: string;
  manager_name?: string;
  manager_approval?: 'pending' | 'approved' | 'rejected';
  hr_approval?: 'pending' | 'approved' | 'rejected';
  supporting_docs?: string[];
}

interface Stats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  on_leave_now: number;
  approvalRate: number;
  total_days_requested: number;
  average_days: number;
}

// API Configuration
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const LEAVES_API = `${API_BASE}/api/leaves`;
const EMPLOYEES_API = `${API_BASE}/api/employees`;

// ---------- Utility Functions ----------
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'Not specified';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  } catch {
    return 'Invalid date';
  }
};

const formatDateTime = (dateString: string | null | undefined): string => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  } catch {
    return '';
  }
};

const calculateDays = (startDate: string | undefined, endDate: string | undefined): number => {
  if (!startDate || !endDate) return 0;
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  } catch {
    return 0;
  }
};

const formatDays = (days: number): string => {
  if (days === 1) return '1 day';
  return `${days} days`;
};

const getInitials = (name: string): string => {
  if (!name || typeof name !== 'string') return '??';
  const names = name.trim().split(' ');
  const first = names[0]?.[0] || '';
  const last = names.length > 1 ? names[names.length - 1]?.[0] || '' : '';
  return (first + last).toUpperCase();
};

// ---------- API Functions ----------
const fetchLeaves = async (filters: Record<string, string> = {}): Promise<Leave[]> => {
  try {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'all') params.append(key, value);
    });

    const url = params.toString() ? `${LEAVES_API}?${params.toString()}` : LEAVES_API;
    const response = await fetch(url, {
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server error (leaves):', errorText);
      throw new Error(`Failed to fetch leaves: ${response.status} - ${errorText}`);
    }
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching leaves:', error);
    toast.error('Could not load leave requests');
    return [];
  }
};

const createLeave = async (leaveData: Partial<Leave>): Promise<Leave> => {
  const response = await fetch(LEAVES_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...leaveData,
      applied_date: new Date().toISOString(),
      status: 'pending',
      total_days: calculateDays(leaveData.start_date, leaveData.end_date)
    }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create leave: ${response.status} - ${errorText}`);
  }
  return await response.json();
};

const updateLeave = async (leaveId: string, leaveData: Partial<Leave>): Promise<Leave> => {
  const response = await fetch(`${LEAVES_API}/${leaveId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...leaveData,
      total_days: calculateDays(leaveData.start_date, leaveData.end_date)
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update leave: ${response.status} - ${errorText}`);
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    const data = await response.json();
    return data;
  } else {
    return {
      ...leaveData,
      id: leaveId,
      total_days: calculateDays(leaveData.start_date, leaveData.end_date),
    } as Leave;
  }
};

const updateLeaveStatus = async (leaveId: string, status: Leave['status'], notes?: string): Promise<Leave> => {
  const response = await fetch(`${LEAVES_API}/${leaveId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, notes }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update status: ${response.status} - ${errorText}`);
  }
  return await response.json();
};

const deleteLeave = async (leaveId: string): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(`${LEAVES_API}/${leaveId}`, { method: 'DELETE' });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to delete leave: ${response.status} - ${errorText}`);
  }
  return await response.json();
};

// ---------- StatusBadge component ----------
const StatusBadge = ({ status }: { status: Leave['status'] }) => {
  const config = {
    pending: { icon: Clock, label: 'Pending', className: 'bg-amber-400/20 border-amber-400/30 text-amber-300' },
    approved: { icon: CheckCircle2, label: 'Approved', className: 'bg-emerald-400/20 border-emerald-400/30 text-emerald-300' },
    rejected: { icon: XCircle, label: 'Rejected', className: 'bg-rose-400/20 border-rose-400/30 text-rose-300' }
  }[status] || { icon: Clock, label: 'Unknown', className: 'bg-white/10 border-white/20 text-white/60' };

  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${config.className}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
};

// Stat Card Component
const StatCard = ({ title, value, icon: Icon, color, onClick, subtitle }: {
  title: string;
  value: number | string;
  icon: React.ComponentType<any>;
  color?: string;
  onClick?: () => void;
  subtitle?: string;
}) => {
  const colorMap: Record<string, string> = {
    slate: 'from-slate-600 to-slate-700',
    amber: 'from-amber-600 to-amber-700',
    emerald: 'from-emerald-600 to-emerald-700',
    purple: 'from-purple-600 to-purple-700',
    blue: 'from-blue-600 to-blue-700',
    red: 'from-red-600 to-red-700',
    green: 'from-green-600 to-green-700',
  };
  const gradient = color && colorMap[color] ? colorMap[color] : 'from-slate-600 to-slate-700';

  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-lg ${onClick ? 'hover:scale-[1.02]' : ''} bg-white`}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl bg-gradient-to-br ${gradient} text-white shadow-lg`}>
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">{title}</span>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold tracking-tight">{value}</p>
              {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
          {onClick && (
            <ArrowUpRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Leave Card Component
const LeaveCard = ({ leave, onView, onEdit, onDelete }: {
  leave: Leave;
  onView: (leave: Leave) => void;
  onEdit: (leave: Leave) => void;
  onDelete: (leaveId: string) => Promise<void>;
}) => {
  const leaveType = LEAVE_TYPES[leave.leave_type] || LEAVE_TYPES.annual;
  const Icon = leaveType.icon;
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Delete this leave request?')) return;
    setDeleting(true);
    try { await onDelete(leave.id); } catch (error) { console.error(error); } finally { setDeleting(false); }
  };

  return (
    <div
      className="group relative hover:shadow-xl transition-all duration-300 overflow-hidden rounded-xl cursor-pointer oz-glass-dark border border-white/[0.09] hover:border-white/[0.16]"
      onClick={() => onView(leave)}
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="p-2 rounded-xl bg-white/[0.08] border border-white/10 group-hover:scale-110 transition-transform flex-shrink-0">
              <Icon className="h-4 w-4" style={{ color: leaveType.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-base font-semibold truncate text-white">{leave.employee_name}</div>
              <div className="text-xs truncate text-white/55">{leave.position} • {leave.employee_id}</div>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" title="More options" className="h-7 w-7 flex items-center justify-center rounded-lg bg-white/[0.06] hover:bg-white/[0.15] border border-white/10 text-white/50 transition-all">
                  <MoreVertical className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[rgba(5,15,28,0.95)] border-white/[0.15]">
                <DropdownMenuItem className="text-white/75 focus:bg-white/[0.10] focus:text-white cursor-pointer" onClick={() => onView(leave)}>
                  <Eye className="h-4 w-4 mr-2" /> View Details
                </DropdownMenuItem>
                <DropdownMenuItem className="text-white/75 focus:bg-white/[0.10] focus:text-white cursor-pointer" onClick={() => onEdit(leave)}>
                  <Edit className="h-4 w-4 mr-2" /> Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem className="text-rose-400 focus:bg-rose-500/20 focus:text-rose-300 cursor-pointer" onClick={handleDelete} disabled={deleting}>
                  {deleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs border border-white/[0.08] bg-white/[0.05] text-white/65">
            <Icon className="h-3 w-3" style={{ color: leaveType.color }} />
            {leaveType.shortName}
          </span>
          <StatusBadge status={leave.status} />
        </div>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-white/50">Duration</span>
            <span className="font-semibold text-white">{formatDays(leave.total_days)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-white/50">Dates</span>
            <span className="font-medium text-white text-xs">{formatDate(leave.start_date)} – {formatDate(leave.end_date)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-white/50">Applied</span>
            <span className="font-medium text-white/70 text-xs">{formatDateTime(leave.applied_date)}</span>
          </div>
        </div>

        {leave.reason && (
          <div className="mt-3 rounded-lg bg-white/[0.06] border border-white/[0.08] p-2 text-xs text-white/60 line-clamp-2">
            {leave.reason}
          </div>
        )}
      </div>
      <div className="px-4 py-2.5 bg-white/[0.03] border-t border-white/[0.07]">
        <button type="button" className="w-full inline-flex items-center justify-center gap-2 text-xs text-white/50 hover:text-white/80 transition-colors" onClick={(e) => { e.stopPropagation(); onView(leave); }}>
          <Eye className="h-3.5 w-3.5" /> View Details
        </button>
      </div>
    </div>
  );
};

// ============= Leave Application Form =============
const LeaveApplicationForm = ({ onClose, onSuccess, editData }: {
  onClose: () => void;
  onSuccess: (message: string, leave?: Leave) => void;
  editData?: Leave | null;
}) => {
  const [formData, setFormData] = useState<Partial<Leave>>(
    editData ? {
      employee_id: editData.employee_id || '',
      employee_name: editData.employee_name || '',
      position: editData.position || '',
      leave_type: editData.leave_type || 'annual',
      start_date: editData.start_date || '',
      end_date: editData.end_date || '',
      reason: editData.reason || '',
      contact_number: editData.contact_number || '',
      emergency_contact: editData.emergency_contact || '',
      handover_to: editData.handover_to || '',
      department: editData.department || '',
      manager_name: editData.manager_name || '',
      applied_date: editData.applied_date
    } : {
      employee_id: '',
      employee_name: '',
      position: '',
      leave_type: 'annual',
      start_date: '',
      end_date: '',
      reason: 'Annual leave',
      contact_number: '',
      emergency_contact: '',
      handover_to: '',
      department: '',
      manager_name: ''
    }
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [employees, setEmployees] = useState<EmployeeSearchResult[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeeSelectOpen, setEmployeeSelectOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Check auth on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

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
        const employeeList = Array.isArray(data) ? data : [];
        
        // Normalize field names – combine first_name and last_name
        const normalized = employeeList.map((emp: any) => {
          const id = typeof emp.id === 'number' ? emp.id : parseInt(emp.id) || 0;
          const employeeId = emp.employee_id || '';
          let fullName = '';
          if (emp.first_name && emp.last_name) {
            fullName = `${emp.first_name} ${emp.last_name}`;
          } else {
            fullName = emp.name || emp.employee_name || emp.full_name || emp.Name || '';
          }

          const designation = emp.designation || emp.position || emp.job_title || '';
          const phone = emp.phone || emp.contact_number || emp.mobile || '';
          const supervisor = emp.supervisor || emp.manager_name || emp.manager || '';
          const department = emp.department || emp.dept || '';

          return {
            id,
            employee_id: employeeId,
            name: fullName,
            designation,
            phone,
            supervisor,
            department,
          };
        });
        
        setEmployees(normalized);
      } catch (error) {
        console.error('Error fetching employees:', error);
        toast.error('Could not load employee list');
      } finally {
        setLoadingEmployees(false);
      }
    };
    fetchEmployees();
  }, []);

  // Reason autocomplete
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);

  const handleReasonChange = (value: string) => {
    setFormData(prev => ({ ...prev, reason: value }));
    if (value.trim()) {
      const filtered = COMMON_REASONS.filter(r => 
        r.toLowerCase().startsWith(value.toLowerCase()) && r.toLowerCase() !== value.toLowerCase()
      );
      setSuggestions(filtered);
      setSelectedSuggestionIndex(-1);
    } else {
      setSuggestions([]);
    }
  };

  const handleReasonKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (suggestions.length > 0 && e.key === 'Tab') {
      e.preventDefault();
      const suggestion = suggestions[selectedSuggestionIndex === -1 ? 0 : selectedSuggestionIndex];
      setFormData(prev => ({ ...prev, reason: suggestion }));
      setSuggestions([]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => 
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => (prev > -1 ? prev - 1 : -1));
    } else if (e.key === 'Escape') {
      setSuggestions([]);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.employee_name?.trim()) errors.employee_name = 'Please select an employee';
    if (!formData.start_date) errors.start_date = 'Start date is required';
    if (!formData.end_date) errors.end_date = 'End date is required';
    if (!formData.reason?.trim()) errors.reason = 'Reason is required';
    if (!formData.contact_number?.trim()) errors.contact_number = 'Contact number is required';
    
    if (formData.start_date && formData.end_date) {
      const start = new Date(formData.start_date);
      const end = new Date(formData.end_date);
      if (end < start) errors.end_date = 'End date must be after start date';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (field: keyof Leave, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors(prev => { const { [field]: _, ...rest } = prev; return rest; });
    }
  };

  const handleEmployeeSelect = (employee: EmployeeSearchResult) => {
    setFormData({
      ...formData,
      employee_id: employee.employee_id || employee.id.toString(),
      employee_name: employee.name || `Employee ${employee.id}`,
      position: employee.designation || '',
      contact_number: employee.phone || '',
      manager_name: employee.supervisor || '',
      department: employee.department || '',
    });
    setEmployeeSelectOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setLoading(true);
    setError('');

    try {
      let result: Leave;
      if (editData && editData.id) {
        result = await updateLeave(editData.id, formData);
      } else {
        result = await createLeave(formData);
      }
      
      onSuccess(editData ? 'Leave application updated successfully!' : 'Leave application submitted successfully!', result);
      onClose();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const calculatedDays = calculateDays(formData.start_date, formData.end_date);
  const selectedLeaveType = LEAVE_TYPES[formData.leave_type || 'annual'];

  const filteredEmployees = useMemo(() => {
    if (!employeeSearch.trim()) return employees;
    const term = employeeSearch.toLowerCase();
    return employees.filter(emp =>
      emp.name.toLowerCase().includes(term) ||
      emp.employee_id.toLowerCase().includes(term) ||
      emp.id.toString().includes(term) ||
      (emp.designation && emp.designation.toLowerCase().includes(term)) ||
      (emp.department && emp.department.toLowerCase().includes(term))
    );
  }, [employees, employeeSearch]);

  const GIN = "bg-white/[0.07] border-white/[0.12] text-white placeholder:text-white/30 focus:border-[#86BBD8]/50 focus:bg-white/[0.10] h-9 text-sm rounded-lg px-3 w-full focus:outline-none transition-all [color-scheme:dark]";
  const LBL = "text-white/55 text-xs font-medium block mb-1";

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-2xl bg-[rgba(5,15,28,0.97)] backdrop-blur-2xl border border-white/10 text-white">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-white/[0.08]">
          <DialogTitle className="flex items-center gap-2.5 text-white text-lg font-bold">
            <div className="bg-[#86BBD8]/20 p-2 rounded-lg border border-[#86BBD8]/25">
              <CalendarDays className="h-4 w-4 text-[#86BBD8]" />
            </div>
            {editData ? 'Edit Leave Request' : 'New Leave Request'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-6 pb-6 pt-4 space-y-5">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/25 rounded-lg flex items-center gap-2 text-rose-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Employee picker */}
          <div>
            <span className={LBL}>Employee *</span>
            <Popover open={employeeSelectOpen} onOpenChange={setEmployeeSelectOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  disabled={!!editData}
                  className="w-full h-9 flex items-center justify-between gap-2 px-3 rounded-lg bg-white/[0.07] border border-white/[0.12] text-sm hover:bg-white/[0.10] hover:border-[#86BBD8]/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {formData.employee_name ? (
                    <div className="flex items-center gap-2 truncate">
                      <div className="h-5 w-5 rounded-full bg-gradient-to-br from-[#2A4D69] to-[#86BBD8] flex items-center justify-center text-[9px] font-bold text-white shrink-0">
                        {getInitials(formData.employee_name)}
                      </div>
                      <span className="text-white font-medium truncate">{formData.employee_name}</span>
                      <span className="text-white/40 text-xs shrink-0">• {formData.employee_id}</span>
                    </div>
                  ) : (
                    <span className="text-white/35">Select employee...</span>
                  )}
                  <ChevronDown className="h-3.5 w-3.5 text-white/35 shrink-0" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0 rounded-xl bg-[rgba(5,15,28,0.97)] backdrop-blur-xl border border-white/[0.12]" align="start">
                <Command shouldFilter={false} className="bg-transparent">
                  <CommandInput
                    placeholder="Search by name or ID..."
                    value={employeeSearch}
                    onValueChange={setEmployeeSearch}
                    className="border-b border-white/[0.08] text-white placeholder:text-white/30 h-9 text-sm"
                  />
                  <CommandEmpty className="text-white/40 text-sm py-6 text-center">No employee found.</CommandEmpty>
                  <CommandGroup className="max-h-56 overflow-y-auto p-1.5">
                    {loadingEmployees ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-white/40" />
                      </div>
                    ) : (
                      filteredEmployees.map((emp) => (
                        <CommandItem
                          key={emp.id}
                          onSelect={() => handleEmployeeSelect(emp)}
                          className="flex items-center gap-2.5 rounded-lg px-2 py-2 cursor-pointer text-white/75 data-[selected=true]:bg-white/[0.10] hover:bg-white/[0.07] hover:text-white"
                        >
                          <div className="h-6 w-6 rounded-full bg-gradient-to-br from-[#2A4D69] to-[#86BBD8] flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                            {getInitials(emp.name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{emp.name}</p>
                            <p className="text-xs text-white/40 truncate">
                              <span className="font-mono text-[#86BBD8]">{emp.employee_id}</span>
                              {emp.designation ? ` · ${emp.designation}` : ''}
                              {emp.department ? ` · ${emp.department}` : ''}
                            </p>
                          </div>
                        </CommandItem>
                      ))
                    )}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
            {validationErrors.employee_name && (
              <p className="text-rose-400 text-xs mt-1">{validationErrors.employee_name}</p>
            )}
          </div>

          {/* Auto-filled employee info — shown once employee selected */}
          {formData.employee_name && (
            <div className="bg-white/[0.04] rounded-xl border border-white/[0.06] p-3 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2.5">
              <div>
                <div className="text-white/35 text-[10px] uppercase tracking-wide mb-0.5">Employee ID</div>
                <div className="text-white/80 text-sm font-mono">{formData.employee_id || '—'}</div>
              </div>
              <div>
                <div className="text-white/35 text-[10px] uppercase tracking-wide mb-0.5">Position</div>
                <div className="text-white/80 text-sm">{formData.position || '—'}</div>
              </div>
              <div>
                <div className="text-white/35 text-[10px] uppercase tracking-wide mb-0.5">Department</div>
                <div className="text-white/80 text-sm">{formData.department || '—'}</div>
              </div>
              <div>
                <div className="text-white/35 text-[10px] uppercase tracking-wide mb-0.5">Supervisor</div>
                <div className="text-white/80 text-sm">{formData.manager_name || '—'}</div>
              </div>
            </div>
          )}

          {/* Leave Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className={LBL}>Leave Type *</span>
              <Select
                value={formData.leave_type || 'annual'}
                onValueChange={(val) => handleChange('leave_type', val)}
              >
                <SelectTrigger className="bg-white/[0.07] border-white/[0.12] text-white focus:border-[#86BBD8]/50 h-9 text-sm focus:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[rgba(5,15,28,0.97)] border-white/[0.12] text-white">
                  {Object.entries(LEAVE_TYPES).map(([key, type]) => {
                    const Icon = type.icon;
                    return (
                      <SelectItem key={key} value={key} className="text-white/80 focus:bg-white/[0.10] focus:text-white">
                        <div className="flex items-center gap-2">
                          <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: type.color }} />
                          {type.name}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <div className="flex items-center gap-2 w-full p-2.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                {React.createElement(selectedLeaveType.icon, { className: 'h-4 w-4 shrink-0', style: { color: selectedLeaveType.color } })}
                <p className="text-xs text-white/55">{selectedLeaveType.description}</p>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className={LBL}>Start Date *</span>
              <input
                type="date"
                title="Start date"
                required
                value={formData.start_date || ''}
                onChange={(e) => handleChange('start_date', e.target.value)}
                className={GIN}
              />
              {validationErrors.start_date && <p className="text-rose-400 text-xs mt-1">{validationErrors.start_date}</p>}
            </div>
            <div>
              <span className={LBL}>End Date *</span>
              <input
                type="date"
                title="End date"
                required
                value={formData.end_date || ''}
                onChange={(e) => handleChange('end_date', e.target.value)}
                min={formData.start_date}
                className={GIN}
              />
              {validationErrors.end_date && <p className="text-rose-400 text-xs mt-1">{validationErrors.end_date}</p>}
            </div>
          </div>

          {calculatedDays > 0 && (
            <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] px-4 py-3 flex items-center justify-between">
              <span className="text-white/50 text-sm">Total leave days</span>
              <span className="text-2xl font-bold text-white">{calculatedDays}<span className="text-sm text-white/50 ml-1">days</span></span>
            </div>
          )}

          {/* Contact number (editable) */}
          <div>
            <span className={LBL}>Contact Number During Leave *</span>
            <input
              type="text"
              value={formData.contact_number || ''}
              onChange={(e) => handleChange('contact_number', e.target.value)}
              placeholder="Phone number to reach you"
              className={GIN}
            />
            {validationErrors.contact_number && <p className="text-rose-400 text-xs mt-1">{validationErrors.contact_number}</p>}
          </div>

          {/* Reason with autocomplete */}
          <div className="relative">
            <span className={LBL}>Reason for Leave *</span>
            <textarea
              rows={3}
              required
              value={formData.reason || ''}
              onChange={(e) => handleReasonChange(e.target.value)}
              onKeyDown={handleReasonKeyDown}
              placeholder="Type a reason or choose from suggestions..."
              className="w-full px-3 py-2 rounded-lg bg-white/[0.07] border border-white/[0.12] text-white placeholder:text-white/30 focus:border-[#86BBD8]/50 focus:bg-white/[0.10] text-sm resize-none focus:outline-none transition-all"
            />
            {validationErrors.reason && <p className="text-rose-400 text-xs mt-1">{validationErrors.reason}</p>}
            {suggestions.length > 0 && (
              <div className="absolute z-20 w-full mt-1 rounded-xl bg-[rgba(5,15,28,0.97)] border border-white/[0.12] backdrop-blur-xl overflow-hidden shadow-xl">
                {suggestions.map((s, index) => (
                  <div
                    key={s}
                    className={`px-3 py-2 cursor-pointer text-sm transition-all ${index === selectedSuggestionIndex ? 'bg-white/[0.12] text-white' : 'text-white/65 hover:bg-white/[0.07] hover:text-white'}`}
                    onClick={() => { setFormData(prev => ({ ...prev, reason: s })); setSuggestions([]); }}
                  >
                    {s}
                  </div>
                ))}
              </div>
            )}
            <p className="text-[11px] text-white/30 mt-1">Tab to accept suggestion · Esc to dismiss</p>
          </div>

          {/* Emergency contact and handover */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className={LBL}>Emergency Contact</span>
              <input
                type="text"
                value={formData.emergency_contact || ''}
                onChange={(e) => handleChange('emergency_contact', e.target.value)}
                placeholder="Name and phone number"
                className={GIN}
              />
            </div>
            <div>
              <span className={LBL}>Handover To</span>
              <input
                type="text"
                value={formData.handover_to || ''}
                onChange={(e) => handleChange('handover_to', e.target.value)}
                placeholder="Colleague's name"
                className={GIN}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium bg-white/[0.07] hover:bg-white/[0.14] text-white/70 border border-white/[0.12] transition-all">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white border border-[#86BBD8]/35 hover:-translate-y-0.5 disabled:opacity-50 transition-all bg-gradient-to-br from-[#2A4D69] to-[#1e3a52]"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {editData ? 'Update Request' : 'Submit Request'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Leave Details Modal
const LeaveDetailsModal = ({ leave, onClose, onEdit, onDelete, onStatusUpdate }: {
  leave: Leave;
  onClose: () => void;
  onEdit: (leave: Leave) => void;
  onDelete: (leaveId: string) => Promise<void>;
  onStatusUpdate: (leaveId: string, status: Leave['status']) => Promise<void>;
}) => {
  const selectedLeaveType = LEAVE_TYPES[leave.leave_type] || LEAVE_TYPES.annual;
  const [updating, setUpdating] = useState(false);
  const [showStatusActions, setShowStatusActions] = useState(false);

  const handleStatusChange = async (newStatus: Leave['status']) => {
    setUpdating(true);
    try {
      await onStatusUpdate(leave.id, newStatus);
      setShowStatusActions(false);
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this leave request?')) return;
    setUpdating(true);
    try {
      await onDelete(leave.id);
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setUpdating(false);
    }
  };

  const IF = ({ label, value }: { label: string; value?: string | null }) => (
    <div>
      <div className="text-white/35 text-[10px] uppercase tracking-wide mb-0.5">{label}</div>
      <div className="text-white/80 text-sm">{value || '—'}</div>
    </div>
  );

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-2xl bg-[rgba(5,15,28,0.97)] backdrop-blur-2xl border border-white/10 text-white">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-white/[0.08]">
          <DialogTitle className="flex items-center gap-2.5 text-white text-lg font-bold">
            <div className="p-2 rounded-lg bg-white/[0.07] border border-white/10">
              {React.createElement(selectedLeaveType.icon, { className: 'h-4 w-4', style: { color: selectedLeaveType.color } })}
            </div>
            Leave Request #{leave.id}
            <StatusBadge status={leave.status} />
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-5 space-y-4">
          {updating && (
            <div className="flex items-center gap-2 p-3 bg-white/[0.05] rounded-lg text-white/60">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Updating...</span>
            </div>
          )}

          {/* Employee section */}
          <div className="bg-white/[0.04] rounded-xl border border-white/[0.06] overflow-hidden">
            <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-white/[0.05]">
              <User className="h-3.5 w-3.5 text-[#86BBD8]" />
              <span className="text-xs font-semibold text-white/75 uppercase tracking-wider">Employee</span>
            </div>
            <div className="px-3.5 py-3 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2.5">
              <IF label="Name" value={leave.employee_name} />
              <IF label="Employee ID" value={leave.employee_id} />
              <IF label="Position" value={leave.position} />
              <IF label="Department" value={leave.department} />
              <IF label="Contact" value={leave.contact_number} />
              {leave.emergency_contact && <IF label="Emergency Contact" value={leave.emergency_contact} />}
            </div>
          </div>

          {/* Leave details section */}
          <div className="bg-white/[0.04] rounded-xl border border-white/[0.06] overflow-hidden">
            <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-white/[0.05]">
              <CalendarDays className="h-3.5 w-3.5 text-[#86BBD8]" />
              <span className="text-xs font-semibold text-white/75 uppercase tracking-wider">Leave Details</span>
            </div>
            <div className="px-3.5 py-3 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2.5">
              <IF label="Type" value={selectedLeaveType.name} />
              <IF label="Start Date" value={formatDate(leave.start_date)} />
              <IF label="End Date" value={formatDate(leave.end_date)} />
              <div>
                <div className="text-white/35 text-[10px] uppercase tracking-wide mb-0.5">Duration</div>
                <div className="text-white font-semibold text-sm">{formatDays(leave.total_days)}</div>
              </div>
              <IF label="Applied" value={formatDateTime(leave.applied_date)} />
              {leave.handover_to && <IF label="Handover To" value={leave.handover_to} />}
            </div>
          </div>

          {/* Reason */}
          {leave.reason && (
            <div className="bg-white/[0.04] rounded-xl border border-white/[0.06] overflow-hidden">
              <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-white/[0.05]">
                <FileText className="h-3.5 w-3.5 text-[#86BBD8]" />
                <span className="text-xs font-semibold text-white/75 uppercase tracking-wider">Reason</span>
              </div>
              <p className="px-3.5 py-3 text-sm text-white/70 whitespace-pre-wrap">{leave.reason}</p>
            </div>
          )}

          {/* Approval status */}
          {(leave.manager_approval || leave.hr_approval) && (
            <div className="bg-white/[0.04] rounded-xl border border-white/[0.06] overflow-hidden">
              <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-white/[0.05]">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#86BBD8]" />
                <span className="text-xs font-semibold text-white/75 uppercase tracking-wider">Approvals</span>
              </div>
              <div className="px-3.5 py-3 flex gap-6">
                {leave.manager_approval && <IF label="Manager" value={leave.manager_approval} />}
                {leave.hr_approval && <IF label="HR" value={leave.hr_approval} />}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 justify-between pt-1">
            <button
              type="button"
              onClick={handleDelete}
              disabled={updating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { onEdit(leave); onClose(); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.07] hover:bg-white/[0.14] text-white/70 border border-white/[0.12] transition-all"
              >
                <Edit className="h-3.5 w-3.5" /> Edit
              </button>
              <DropdownMenu open={showStatusActions} onOpenChange={setShowStatusActions}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white border border-[#86BBD8]/35 transition-all hover:-translate-y-0.5 bg-gradient-to-br from-[#2A4D69] to-[#1e3a52]"
                  >
                    Update Status <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-[rgba(5,15,28,0.97)] border-white/[0.12] text-white">
                  <DropdownMenuItem className="text-emerald-400 focus:bg-white/[0.10] focus:text-emerald-300 cursor-pointer" onClick={() => handleStatusChange('approved')}>
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Approve
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-rose-400 focus:bg-white/[0.10] focus:text-rose-300 cursor-pointer" onClick={() => handleStatusChange('rejected')}>
                    <XCircle className="h-4 w-4 mr-2" /> Reject
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem className="text-white/65 focus:bg-white/[0.10] focus:text-white cursor-pointer" onClick={() => handleStatusChange('pending')}>
                    <Clock className="h-4 w-4 mr-2" /> Mark Pending
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ============= Main Component =============
export default function LeaveManagementPage() {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [selectedLeave, setSelectedLeave] = useState<Leave | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState<Leave | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date-desc');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState({ leaves: true });
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    on_leave_now: 0,
    approvalRate: 0,
    total_days_requested: 0,
    average_days: 0
  });
  const [showHeroStats, setShowHeroStats] = useState(true);
  const [showTypeSummary, setShowTypeSummary] = useState(true);
  const [showEmployeeSummary, setShowEmployeeSummary] = useState(true);
  const [filterPanelMinimized, setFilterPanelMinimized] = useState(false);
  const [recordsPanelMinimized, setRecordsPanelMinimized] = useState(false);


  const fetchAllData = async () => {
    try {
      setError(null);
      setLoading(prev => ({ ...prev, leaves: true }));
      
      const leavesData = await fetchLeaves();
      
      setLeaves(leavesData);
      
      const today = new Date().toISOString().split('T')[0];
      const approvedLeaves = leavesData.filter(l => l.status === 'approved');
      const rejectedLeaves = leavesData.filter(l => l.status === 'rejected');
      const decided = approvedLeaves.length + rejectedLeaves.length;
      const approvalRate = decided > 0 ? Math.round((approvedLeaves.length / decided) * 100) : 0;
      const totalDays = leavesData.reduce((sum, l) => sum + (l.total_days || 0), 0);
      const avgDays = leavesData.length > 0 ? Math.round(totalDays / leavesData.length) : 0;
      
      setStats({
        total: leavesData.length,
        pending: leavesData.filter(l => l.status === 'pending').length,
        approved: approvedLeaves.length,
        rejected: rejectedLeaves.length,
        on_leave_now: approvedLeaves.filter(l => l.start_date <= today && l.end_date >= today).length,
        approvalRate,
        total_days_requested: totalDays,
        average_days: avgDays
      });
      
      setLoading(prev => ({ ...prev, leaves: false }));
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
      setLoading(prev => ({ ...prev, leaves: false }));
    }
  };

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleFormSuccess = (message: string) => {
    toast.success(message);
    fetchAllData();
  };

  const handleStatusUpdate = async (id: string, status: Leave['status']) => {
    try {
      await updateLeaveStatus(id, status);
      toast.success(`Status updated to ${status}`);
      fetchAllData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteLeave(id);
      toast.success('Leave deleted');
      fetchAllData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const filteredLeaves = useMemo(() => {
    let filtered = leaves;

    if (filter !== 'all') filtered = filtered.filter(l => l.status === filter);
    if (typeFilter !== 'all') filtered = filtered.filter(l => l.leave_type === typeFilter);
    if (dateFrom) filtered = filtered.filter(l => l.start_date >= dateFrom);
    if (dateTo) filtered = filtered.filter(l => l.end_date <= dateTo);

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(l =>
        l.employee_name?.toLowerCase().includes(term) ||
        l.employee_id?.toLowerCase().includes(term) ||
        l.position?.toLowerCase().includes(term) ||
        l.department?.toLowerCase().includes(term)
      );
    }

    const [sortField, sortDirection] = sortBy.split('-');
    filtered.sort((a, b) => {
      if (sortField === 'date') {
        const aVal = new Date(a.applied_date).getTime();
        const bVal = new Date(b.applied_date).getTime();
        return sortDirection === 'desc' ? bVal - aVal : aVal - bVal;
      } else if (sortField === 'days') {
        return sortDirection === 'desc' ? b.total_days - a.total_days : a.total_days - b.total_days;
      } else if (sortField === 'name') {
        const compare = a.employee_name.localeCompare(b.employee_name);
        return sortDirection === 'desc' ? -compare : compare;
      }
      return 0;
    });

    return filtered;
  }, [leaves, filter, typeFilter, dateFrom, dateTo, searchTerm, sortBy]);

  const clearFilters = () => {
    setFilter('all');
    setTypeFilter('all');
    setDateFrom('');
    setDateTo('');
    setSearchTerm('');
    setSortBy('date-desc');
  };

  const typeSummary = useMemo(() => {
    return Object.entries(LEAVE_TYPES).map(([key, type]) => {
      const typeLeaves = leaves.filter(l => l.leave_type === key);
      const totalDays = typeLeaves.reduce((sum, l) => sum + (l.total_days || 0), 0);
      return {
        key, type, count: typeLeaves.length, totalDays,
        percentage: leaves.length > 0 ? Math.round((typeLeaves.length / leaves.length) * 100) : 0
      };
    }).filter(t => t.count > 0);
  }, [leaves]);

  const employeeSummary = useMemo(() => {
    const empMap: Record<string, { name: string; total_days: number; pending: number; approved: number; rejected: number }> = {};
    leaves.forEach(l => {
      if (!empMap[l.employee_id]) empMap[l.employee_id] = { name: l.employee_name, total_days: 0, pending: 0, approved: 0, rejected: 0 };
      empMap[l.employee_id].total_days += l.total_days || 0;
      empMap[l.employee_id][l.status]++;
    });
    return Object.entries(empMap)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.total_days - a.total_days);
  }, [leaves]);

  const activeFilterCount = [filter !== 'all', typeFilter !== 'all', !!dateFrom, !!dateTo, !!searchTerm].filter(Boolean).length;

  return (
    <PageShell>
      <main className="container mx-auto px-4 py-8 space-y-4">

        {/* PANEL 1: Hero */}
        <div className="oz-glass-dark rounded-2xl overflow-hidden">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#2A4D69]/50 border border-[#86BBD8]/20">
                <CalendarDays className="h-5 w-5 text-[#86BBD8]" />
              </div>
              <div>
                <nav className="flex items-center gap-1.5 text-xs text-white/40 mb-0.5">
                  <span>Home</span>
                  <ChevronRight className="h-3 w-3" />
                  <span className="text-white/70 font-medium">Leaves</span>
                </nav>
                <h1 className="text-xl font-bold text-white font-heading tracking-tight">Leave Management</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={fetchAllData} title="Refresh" className="h-8 w-8 flex items-center justify-center rounded-lg bg-white/[0.07] hover:bg-white/[0.15] border border-white/12 text-white/50 transition-all">
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg bg-gradient-to-br from-[#2A4D69] to-[#1e3a52] border border-[#86BBD8]/25"
              >
                <Plus className="h-4 w-4" /> New Leave Request
              </button>
              <button type="button" title={showHeroStats ? 'Collapse stats' : 'Expand stats'} onClick={() => setShowHeroStats(v => !v)} className="h-8 w-8 flex items-center justify-center rounded-lg bg-white/[0.07] hover:bg-white/[0.15] border border-white/12 text-white/50 transition-all">
                {showHeroStats ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
          {showHeroStats && (
            <div className="px-6 pb-4 pt-3 border-t border-white/[0.07] grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: 'Total', value: stats.total, color: '#86BBD8', onClick: () => setFilter('all') },
                { label: 'Total Days', value: stats.total_days_requested, color: '#a78bfa', onClick: undefined },
                { label: 'Pending', value: stats.pending, color: '#fbbf24', onClick: () => setFilter('pending') },
                { label: 'Approved', value: stats.approved, color: '#34d399', onClick: () => setFilter('approved') },
                { label: 'On Leave Now', value: stats.on_leave_now, color: '#60a5fa', onClick: undefined },
                { label: 'Approval Rate', value: `${stats.approvalRate}%`, color: '#86BBD8', onClick: undefined },
              ].map(stat => (
                <button
                  key={stat.label}
                  onClick={stat.onClick}
                  className={`rounded-xl p-3 text-left border border-white/[0.08] bg-white/[0.05] transition-all ${stat.onClick ? 'hover:bg-white/[0.10] cursor-pointer' : 'cursor-default'}`}
                >
                  <div className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
                  <div className="text-xs text-white/50 mt-0.5">{stat.label}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* PANEL 2: Leave Type Breakdown */}
        {typeSummary.length > 0 && (
          <div className="oz-glass-panel rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.07]">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-3.5 w-3.5 text-[#86BBD8]" />
                <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">Leave Type Breakdown</span>
                <span className="text-[11px] text-white/35">click to filter</span>
              </div>
              <button type="button" title={showTypeSummary ? 'Collapse' : 'Expand'} onClick={() => setShowTypeSummary(v => !v)} className="h-6 w-6 flex items-center justify-center rounded-md bg-white/[0.07] hover:bg-white/[0.15] text-white/50 border border-white/12 transition-all">
                {showTypeSummary ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            </div>
            {showTypeSummary && (
              <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {typeSummary.map(({ key, type, count, totalDays, percentage }) => {
                  const Icon = type.icon;
                  const isActive = typeFilter === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setTypeFilter(isActive ? 'all' : key)}
                      className={`group relative rounded-xl overflow-hidden text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg border p-4 cursor-pointer ${isActive ? 'border-white/30 bg-white/[0.12]' : 'border-white/10 hover:border-white/20 bg-white/[0.06] hover:bg-white/[0.10]'}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Icon className="h-4 w-4" style={{ color: type.color }} />
                        <span className="text-xs font-bold text-white">{count}</span>
                      </div>
                      <div className="text-xs font-semibold text-white/80 mb-0.5">{type.shortName}</div>
                      <div className="text-[11px] text-white/45">{totalDays}d total</div>
                      <div className="mt-2 h-1 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${percentage}%`, backgroundColor: type.color, opacity: 0.7 }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* PANEL 3: Employee Summary */}
        {employeeSummary.length > 0 && (
          <div className="oz-glass-panel rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.07]">
              <div className="flex items-center gap-2">
                <Users className="h-3.5 w-3.5 text-[#86BBD8]" />
                <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">Employee Summary</span>
                <span className="text-[11px] text-white/35">{employeeSummary.length} employees</span>
              </div>
              <button type="button" title={showEmployeeSummary ? 'Collapse' : 'Expand'} onClick={() => setShowEmployeeSummary(v => !v)} className="h-6 w-6 flex items-center justify-center rounded-md bg-white/[0.07] hover:bg-white/[0.15] text-white/50 border border-white/12 transition-all">
                {showEmployeeSummary ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            </div>
            {showEmployeeSummary && (
              <ScrollArea className="h-[260px]">
                <div className="space-y-1 p-4">
                  {employeeSummary.map(emp => {
                    const maxDays = employeeSummary[0]?.total_days || 1;
                    const percentage = Math.round((emp.total_days / maxDays) * 100);
                    return (
                      <div
                        key={emp.id}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/[0.07] cursor-pointer transition-all group"
                        onClick={() => { setSearchTerm(emp.name); setFilter('all'); }}
                      >
                        <div className="h-8 w-8 rounded-full bg-[#2A4D69]/60 border border-[#86BBD8]/20 flex items-center justify-center text-xs font-semibold text-white flex-shrink-0">
                          {getInitials(emp.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-white truncate">{emp.name}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden flex-1">
                              <div className="h-full bg-[#86BBD8]/60 rounded-full" style={{ width: `${percentage}%` }} />
                            </div>
                            <span className="text-[11px] text-white/40 flex-shrink-0">{emp.total_days}d</span>
                          </div>
                        </div>
                        <div className="flex gap-1.5 flex-shrink-0">
                          {emp.pending > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/25">{emp.pending}p</span>}
                          {emp.approved > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-400/20 text-emerald-300 border border-emerald-400/25">{emp.approved}a</span>}
                          {emp.rejected > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-400/20 text-rose-300 border border-rose-400/25">{emp.rejected}r</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
        )}

        {/* PANEL 4: Filter Panel */}
        <div className="oz-glass-panel rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.07]">
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-[#86BBD8]" />
              <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">Filters</span>
              {activeFilterCount > 0 && (
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-[#86BBD8]/20 text-[#86BBD8] border border-[#86BBD8]/30">{activeFilterCount} active</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {activeFilterCount > 0 && (
                <button type="button" onClick={clearFilters} className="h-6 px-2 flex items-center gap-1 rounded-md bg-white/[0.07] hover:bg-white/[0.15] text-white/50 text-[11px] border border-white/12 transition-all">
                  <X className="h-2.5 w-2.5" /> Clear
                </button>
              )}
              <button type="button" title={filterPanelMinimized ? 'Expand filters' : 'Collapse filters'} onClick={() => setFilterPanelMinimized(v => !v)} className="h-6 w-6 flex items-center justify-center rounded-md bg-white/[0.07] hover:bg-white/[0.15] text-white/50 border border-white/12 transition-all">
                {filterPanelMinimized ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
              </button>
            </div>
          </div>
          {!filterPanelMinimized && (
            <div className="px-5 pb-4 pt-3 space-y-3">
              <div>
                <div className="text-[11px] text-white/45 mb-1.5">Status</div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { key: 'all', label: 'All' },
                    { key: 'pending', label: 'Pending' },
                    { key: 'approved', label: 'Approved' },
                    { key: 'rejected', label: 'Rejected' },
                  ].map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => setFilter(opt.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${filter === opt.key ? 'bg-[#86BBD8]/30 border-[#86BBD8]/45 text-white font-semibold' : 'bg-white/[0.05] border-white/12 text-white/60 hover:bg-white/[0.12] hover:text-white/90'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-white/45 mb-1.5">Leave Type</div>
                <div className="flex flex-wrap gap-1.5">
                  <button onClick={() => setTypeFilter('all')} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${typeFilter === 'all' ? 'bg-[#86BBD8]/30 border-[#86BBD8]/45 text-white font-semibold' : 'bg-white/[0.05] border-white/12 text-white/60 hover:bg-white/[0.12] hover:text-white/90'}`}>
                    All Types
                  </button>
                  {Object.entries(LEAVE_TYPES).map(([key, type]) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={key}
                        onClick={() => setTypeFilter(typeFilter === key ? 'all' : key)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${typeFilter === key ? 'bg-[#86BBD8]/30 border-[#86BBD8]/45 text-white font-semibold' : 'bg-white/[0.05] border-white/12 text-white/60 hover:bg-white/[0.12] hover:text-white/90'}`}
                      >
                        <Icon className="h-3 w-3" />
                        {type.shortName}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
                  <input
                    type="text"
                    placeholder="Search employee..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 pr-3 py-2 w-full text-sm rounded-lg bg-white/[0.07] border border-white/12 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 focus:bg-white/[0.11] transition-all"
                  />
                </div>
                <div>
                  <input
                    type="date"
                    title="Filter from date"
                    placeholder="From date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="px-3 py-2 w-full text-sm rounded-lg bg-white/[0.07] border border-white/12 text-white focus:outline-none focus:border-white/30 focus:bg-white/[0.11] transition-all [color-scheme:dark]"
                  />
                  <div className="text-[10px] text-white/35 mt-0.5">From date</div>
                </div>
                <div>
                  <input
                    type="date"
                    title="Filter to date"
                    placeholder="To date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="px-3 py-2 w-full text-sm rounded-lg bg-white/[0.07] border border-white/12 text-white focus:outline-none focus:border-white/30 focus:bg-white/[0.11] transition-all [color-scheme:dark]"
                  />
                  <div className="text-[10px] text-white/35 mt-0.5">To date</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* PANEL 5: Records */}
        <div className="oz-glass-panel rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.07]">
            <div className="flex items-center gap-2 shrink-0">
              <FileText className="h-3.5 w-3.5 text-[#86BBD8]" />
              <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">Records</span>
              <span className="text-[11px] text-white/35">{filteredLeaves.length} of {leaves.length}</span>
            </div>
            {/* Inline search */}
            <div className="flex-1 relative min-w-0 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-white/30 pointer-events-none" />
              <input
                type="text"
                placeholder="Search employee…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-7 pr-3 h-7 w-full text-xs rounded-lg bg-white/[0.07] border border-white/[0.12] text-white placeholder:text-white/30 focus:outline-none focus:border-[#86BBD8]/40 focus:bg-white/[0.11] transition-all"
              />
            </div>
            <div className="flex items-center gap-1.5 shrink-0 ml-auto">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-7 w-[120px] text-[11px] bg-white/[0.07] border-white/[0.12] text-white/75 focus:ring-0 focus:border-white/30 px-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[rgba(5,15,28,0.97)] border-white/[0.12] text-white">
                  <SelectItem value="date-desc" className="text-xs text-white/80 focus:bg-white/[0.10] focus:text-white">Newest First</SelectItem>
                  <SelectItem value="date-asc" className="text-xs text-white/80 focus:bg-white/[0.10] focus:text-white">Oldest First</SelectItem>
                  <SelectItem value="days-desc" className="text-xs text-white/80 focus:bg-white/[0.10] focus:text-white">Days (High→Low)</SelectItem>
                  <SelectItem value="days-asc" className="text-xs text-white/80 focus:bg-white/[0.10] focus:text-white">Days (Low→High)</SelectItem>
                  <SelectItem value="name-asc" className="text-xs text-white/80 focus:bg-white/[0.10] focus:text-white">Name A→Z</SelectItem>
                  <SelectItem value="name-desc" className="text-xs text-white/80 focus:bg-white/[0.10] focus:text-white">Name Z→A</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex rounded-lg border border-white/12 overflow-hidden">
                <button type="button" title="Grid view" onClick={() => setViewMode('grid')} className={`h-7 w-7 flex items-center justify-center transition-all ${viewMode === 'grid' ? 'bg-[#86BBD8]/30 text-white' : 'bg-white/[0.05] text-white/50 hover:bg-white/[0.12]'}`}>
                  <LayoutGrid className="h-3 w-3" />
                </button>
                <button type="button" title="Table view" onClick={() => setViewMode('table')} className={`h-7 w-7 flex items-center justify-center border-l border-white/12 transition-all ${viewMode === 'table' ? 'bg-[#86BBD8]/30 text-white' : 'bg-white/[0.05] text-white/50 hover:bg-white/[0.12]'}`}>
                  <List className="h-3 w-3" />
                </button>
              </div>
              <button type="button" title={recordsPanelMinimized ? 'Expand records' : 'Collapse records'} onClick={() => setRecordsPanelMinimized(v => !v)} className="h-6 w-6 flex items-center justify-center rounded-md bg-white/[0.07] hover:bg-white/[0.15] text-white/50 border border-white/12 transition-all">
                {recordsPanelMinimized ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
              </button>
            </div>
          </div>
          {!recordsPanelMinimized && (
            <div className="p-4">
              {loading.leaves ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-white/30" />
                </div>
              ) : filteredLeaves.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 mx-auto text-white/20 mb-4" />
                  <h3 className="text-base font-medium text-white/60 mb-2">No leave requests found</h3>
                  <p className="text-sm text-white/35 mb-6">
                    {leaves.length === 0 ? 'Create your first request.' : 'Try adjusting your filters.'}
                  </p>
                  {leaves.length === 0 && (
                    <button
                      type="button"
                      onClick={() => setShowForm(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5 bg-[#2A4D69]/60 border border-[#86BBD8]/25"
                    >
                      <Plus className="h-4 w-4" /> New Leave
                    </button>
                  )}
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredLeaves.map((leave) => (
                    <LeaveCard
                      key={leave.id}
                      leave={leave}
                      onView={setSelectedLeave}
                      onEdit={(l) => { setEditData(l); setShowForm(true); }}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl overflow-hidden border border-white/[0.07]">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/[0.07] hover:bg-transparent">
                        <TableHead className="text-white/55 bg-white/[0.05]">Employee</TableHead>
                        <TableHead className="text-white/55 bg-white/[0.05]">Type</TableHead>
                        <TableHead className="text-white/55 bg-white/[0.05]">Dates</TableHead>
                        <TableHead className="text-white/55 bg-white/[0.05]">Days</TableHead>
                        <TableHead className="text-white/55 bg-white/[0.05]">Status</TableHead>
                        <TableHead className="text-white/55 bg-white/[0.05]">Applied</TableHead>
                        <TableHead className="text-white/55 bg-white/[0.05] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLeaves.map((leave) => (
                        <TableRow
                          key={leave.id}
                          className="cursor-pointer border-white/[0.06] hover:bg-white/[0.06]"
                          onClick={() => setSelectedLeave(leave)}
                        >
                          <TableCell>
                            <div className="font-medium text-white">{leave.employee_name}</div>
                            <div className="text-xs text-white/45">{leave.employee_id}</div>
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border border-white/10 bg-white/[0.06] text-white/75">
                              {React.createElement(LEAVE_TYPES[leave.leave_type]?.icon || FileText, { className: "h-3 w-3" })}
                              {LEAVE_TYPES[leave.leave_type]?.shortName || leave.leave_type}
                            </span>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm text-white/75">
                            {formatDate(leave.start_date)} – {formatDate(leave.end_date)}
                          </TableCell>
                          <TableCell className="text-white/75">{formatDays(leave.total_days)}</TableCell>
                          <TableCell><StatusBadge status={leave.status} /></TableCell>
                          <TableCell className="text-xs text-white/45">{formatDateTime(leave.applied_date)}</TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <button type="button" title="View details" className="h-7 w-7 inline-flex items-center justify-center rounded-lg bg-white/[0.06] hover:bg-white/[0.15] text-white/50 transition-all mr-1" onClick={() => setSelectedLeave(leave)}>
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            <button type="button" title="Edit leave" className="h-7 w-7 inline-flex items-center justify-center rounded-lg bg-white/[0.06] hover:bg-white/[0.15] text-white/50 transition-all" onClick={() => { setEditData(leave); setShowForm(true); }}>
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </div>

      </main>

      {showForm && (
        <LeaveApplicationForm
          onClose={() => { setShowForm(false); setEditData(null); }}
          onSuccess={handleFormSuccess}
          editData={editData}
        />
      )}

      {selectedLeave && (
        <LeaveDetailsModal
          leave={selectedLeave}
          onClose={() => setSelectedLeave(null)}
          onEdit={(l) => { setEditData(l); setShowForm(true); setSelectedLeave(null); }}
          onDelete={handleDelete}
          onStatusUpdate={handleStatusUpdate}
        />
      )}
    </PageShell>
  );
}