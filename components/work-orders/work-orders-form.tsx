// components/work-orders/work-orders-form.tsx
'use client';
import React from 'react'
import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  Download,
  Printer,
  Save,
  FileText,
  Plus,
  Trash2,
  Calculator,
  ArrowLeft,
  Settings,
  Workflow,
  FileCheck,
  Clock,
  Calendar,
  User,
  Building,
  HardHat,
  AlertCircle,
  CheckCircle,
  Watch,
  TrendingUp,
  CalendarDays,
  FileSignature,
  Shield,
  ToolCase,
  Wrench,
  Cog,
  CheckSquare,
  FileBarChart,
  BarChart3,
  LineChart,
  ClipboardCheck,
  ClipboardList,
  FileEdit,
  Layers
} from "lucide-react";

// Simple toast hook for notifications
const useToast = () => {
  const showToast = (title: string, description?: string, type: 'success' | 'error' | 'info' = 'info') => {
    // Using alert as a fallback - you can replace this with a proper toast library
    if (type === 'error') {
      alert(`❌ ${title}: ${description || ''}`);
    } else if (type === 'success') {
      alert(`✅ ${title}: ${description || ''}`);
    } else {
      alert(`ℹ️ ${title}: ${description || ''}`);
    }
  };

  return {
    toast: ({ title, description, variant }: { title: string; description?: string; variant?: 'destructive' | 'default' }) => {
      showToast(
        title, 
        description, 
        variant === 'destructive' ? 'error' : 'success'
      );
    }
  };
};

// Types - Updated to match backend
interface JobType {
  operational: boolean;
  maintenance: boolean;
  mining: boolean;
}

interface ManpowerRow {
  id: string;
  grade: string;
  requiredNumber: string;
  requiredUnitTime: string;
  totalManHours: string;
}

interface WorkOrderFormData {
  toDepartment: string;
  toSection: string;
  dateRaised: string;
  workOrderNumber: string;
  fromDepartment: string;
  fromSection: string;
  timeRaised: string;
  accountNumber: string;
  equipmentInfo: string;
  userLabToday: string;
  jobType: JobType;
  jobRequestDetails: string;
  requestedBy: string;
  authorisingForeman: string;
  authorisingEngineer: string;
  allocatedTo: string;
  estimatedHours: string;
  responsibleForeman: string;
  jobInstructions: string;
  manpower: ManpowerRow[];
  workDoneDetails: string;
  causeOfFailure: string;
  delayDetails: string;
  artisanName: string;
  artisanSign: string;
  artisanDate: string;
  foremanName: string;
  foremanSign: string;
  foremanDate: string;
  timeWorkStarted: string;
  timeWorkFinished: string;
  totalTimeWorked: string;
  overtimeStartTime: string;
  overtimeEndTime: string;
  overtimeHours: string;
  delayFromTime: string;
  delayToTime: string;
  totalDelayHours: string;
}

const INITIAL_FORM_DATA: WorkOrderFormData = {
  toDepartment: '',
  toSection: '',
  dateRaised: new Date().toISOString().split('T')[0],
  workOrderNumber: `WO-${Date.now().toString().slice(-6)}`,
  fromDepartment: '',
  fromSection: '',
  timeRaised: new Date().toTimeString().slice(0, 5),
  accountNumber: '',
  equipmentInfo: '',
  userLabToday: '',
  jobType: {
    operational: false,
    maintenance: false,
    mining: false,
  },
  jobRequestDetails: '',
  requestedBy: '',
  authorisingForeman: '',
  authorisingEngineer: '',
  allocatedTo: '',
  estimatedHours: '',
  responsibleForeman: '',
  jobInstructions: '',
  manpower: [{ id: '1', grade: '', requiredNumber: '', requiredUnitTime: '', totalManHours: '' }],
  workDoneDetails: '',
  causeOfFailure: '',
  delayDetails: '',
  artisanName: '',
  artisanSign: '',
  artisanDate: '',
  foremanName: '',
  foremanSign: '',
  foremanDate: '',
  timeWorkStarted: '',
  timeWorkFinished: '',
  totalTimeWorked: '',
  overtimeStartTime: '',
  overtimeEndTime: '',
  overtimeHours: '',
  delayFromTime: '',
  delayToTime: '',
  totalDelayHours: '',
};

// Enhanced FormSection with elegant styling
const FormSection = ({ 
  title, 
  children, 
  className = "",
  compact = false,
  icon: Icon = FileText
}: { 
  title: string; 
  children: React.ReactNode; 
  className?: string;
  compact?: boolean;
  icon?: React.ComponentType<any>;
}) => {
  return (
    <Card className={`border border-gray-200/80 bg-white/95 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-300 
      print:border print:border-gray-300 print:bg-white print:shadow-none 
      ${compact ? 'print:mb-1' : 'print:mb-2'} ${className}`}>
      <CardHeader className={`${compact ? 'pb-2 print:pb-0' : 'pb-3 print:pb-0'} print:px-3 print:pt-1`}>
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-blue-600 print:hidden" />}
          <CardTitle className={`${compact ? 'text-sm' : 'text-base'} font-semibold text-gray-800 tracking-wide 
            print:text-sm print:text-gray-900 print:font-bold font-sans print:leading-tight`}>
            {title}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className={`space-y-4 print:space-y-1 print:px-3 ${compact ? 'print:pb-0' : 'print:pb-1'}`}>
        {children}
      </CardContent>
    </Card>
  );
};

// Enhanced LinedTextarea with improved styling
const LinedTextarea = ({ 
  value, 
  onChange, 
  className = "",
  rows = 6,
  placeholder = "",
  expanded = false
}: { 
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  className?: string;
  rows?: number;
  placeholder?: string;
  expanded?: boolean;
}) => {
  return (
    <div className="relative group">
      <Textarea
        value={value}
        onChange={onChange}
        className={`bg-white/50 border-gray-300/80 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all duration-200
          print:border print:border-gray-300 print:bg-white font-sans resize-none print:text-xs print:leading-tight
          ${expanded ? 'min-h-[300px] print:min-h-[180px]' : ''} 
          group-hover:border-gray-400/60 ${className}`}
        rows={rows}
        placeholder={placeholder}
      />
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: rows }).map((_, i) => (
          <div 
            key={i}
            className="border-b border-dotted border-gray-300/60 print:border-gray-400"
            style={{ 
              height: `${100/rows}%`,
              borderBottomWidth: i === rows - 1 ? '0px' : '1px'
            }}
          />
        ))}
      </div>
    </div>
  );
};

// Function to calculate overtime hours
const calculateOvertimeHours = (startTime: string, endTime: string): string => {
  if (!startTime || !endTime) return '0';
  
  const [startHours, startMinutes] = startTime.split(':').map(Number);
  const [endHours, endMinutes] = endTime.split(':').map(Number);
  
  let totalMinutes = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);
  
  // Handle overnight overtime
  if (totalMinutes < 0) {
    totalMinutes += 24 * 60;
  }
  
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  return `${hours}.${Math.round(minutes / 60 * 100)}`;
};

// Function to calculate delay hours
const calculateDelayHours = (startTime: string, endTime: string): string => {
  if (!startTime || !endTime) return '0';
  
  const [startHours, startMinutes] = startTime.split(':').map(Number);
  const [endHours, endMinutes] = endTime.split(':').map(Number);
  
  let totalMinutes = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);
  
  // Handle overnight delays
  if (totalMinutes < 0) {
    totalMinutes += 24 * 60;
  }
  
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  return `${hours}.${Math.round(minutes / 60 * 100)}`;
};

// Function to calculate total time worked
const calculateTotalTimeWorked = (startTime: string, endTime: string): string => {
  if (!startTime || !endTime) return '0';
  
  const [startHours, startMinutes] = startTime.split(':').map(Number);
  const [endHours, endMinutes] = endTime.split(':').map(Number);
  
  let totalMinutes = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);
  
  // Handle overnight work
  if (totalMinutes < 0) {
    totalMinutes += 24 * 60;
  }
  
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  return `${hours}.${Math.round(minutes / 60 * 100)}`;
};

// Transform frontend data to backend format
const transformToBackendFormat = (formData: WorkOrderFormData) => {
  return {
    work_order_number: formData.workOrderNumber,
    title: formData.jobRequestDetails.substring(0, 50) || 'Work Order',
    description: formData.jobRequestDetails,
    status: 'pending',
    priority: 'medium',
    to_department: formData.toDepartment,
    to_section: formData.toSection,
    from_department: formData.fromDepartment,
    from_section: formData.fromSection,
    date_raised: formData.dateRaised,
    time_raised: formData.timeRaised,
    account_number: formData.accountNumber,
    equipment_info: formData.equipmentInfo,
    user_lab_today: formData.userLabToday,
    job_type: formData.jobType,
    job_request_details: formData.jobRequestDetails,
    requested_by: formData.requestedBy,
    authorising_foreman: formData.authorisingForeman,
    authorising_engineer: formData.authorisingEngineer,
    allocated_to: formData.allocatedTo,
    estimated_hours: formData.estimatedHours,
    responsible_foreman: formData.responsibleForeman,
    job_instructions: formData.jobInstructions,
    manpower: formData.manpower.map(man => ({
      grade: man.grade,
      required_number: man.requiredNumber,
      required_unit_time: man.requiredUnitTime,
      total_man_hours: man.totalManHours,
    })),
    work_done_details: formData.workDoneDetails,
    cause_of_failure: formData.causeOfFailure,
    delay_details: formData.delayDetails,
    artisan_name: formData.artisanName,
    artisan_sign: formData.artisanSign,
    artisan_date: formData.artisanDate,
    foreman_name: formData.foremanName,
    foreman_sign: formData.foremanSign,
    foreman_date: formData.foremanDate,
    time_work_started: formData.timeWorkStarted,
    time_work_finished: formData.timeWorkFinished,
    total_time_worked: formData.totalTimeWorked,
    overtime_start_time: formData.overtimeStartTime,
    overtime_end_time: formData.overtimeEndTime,
    overtime_hours: formData.overtimeHours,
    delay_from_time: formData.delayFromTime,
    delay_to_time: formData.delayToTime,
    total_delay_hours: formData.totalDelayHours,
  };
};

// CORRECTED createWorkOrder function with proper endpoint
const createWorkOrder = async (workOrderData: any) => {
  try {
    console.log('📤 Sending work order to backend...', workOrderData);
    
    // CORRECTED ENDPOINT: Use the maintenance endpoint instead of direct work-orders
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://myofficebackend.onrender.com';
    const response = await fetch(`${API_BASE}/api/maintenance/work-orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(workOrderData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend error response:', errorText);
      throw new Error(`Failed to create work order: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Work order created successfully in database:', result);
    return result;
    
  } catch (error) {
    console.error('💥 Network error, saving to localStorage:', error);
    
    // Fallback to localStorage
    const existingWorkOrders = JSON.parse(localStorage.getItem('workOrders') || '[]');
    const newWorkOrder = {
      ...workOrderData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    
    const updatedWorkOrders = [...existingWorkOrders, newWorkOrder];
    localStorage.setItem('workOrders', JSON.stringify(updatedWorkOrders));
    
    return {
      ...newWorkOrder,
      savedLocally: true
    };
  }
};

// Test backend connection function
const testBackendConnection = async () => {
  try {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://myofficebackend.onrender.com';
    const response = await fetch(`${API_BASE}/api/maintenance/health`);
    const result = await response.json();
    console.log('🔧 Backend connection test:', result);
    return result;
  } catch (error) {
    console.error('🔧 Backend connection failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { status: 'error', error: errorMessage };
  }
};

const HeaderSection = ({ formData, onInputChange }: { formData: WorkOrderFormData; onInputChange: (field: string, value: string) => void }) => (
  <div className="space-y-6 print:space-y-2">
    {/* Main Header Grid */}
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 print:gap-2 print:grid-cols-4">
      {/* Column 1: TO Department */}
      <div className="space-y-4 print:space-y-1">
        <div className="space-y-2 print:space-y-0">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-blue-600 print:hidden" />
            <Label className="text-sm font-semibold text-gray-800 tracking-wide print:text-xs print:text-gray-900 print:font-semibold font-sans print:leading-tight">
              TO DEPARTMENT
            </Label>
          </div>
          <div className="grid grid-cols-2 gap-3 print:gap-1">
            <div className="space-y-1 print:space-y-0">
              <Label className="text-xs font-medium text-gray-600 print:text-[9px] print:text-gray-700 font-sans print:leading-tight">DEPT</Label>
              <Input
                value={formData.toDepartment}
                onChange={(e) => onInputChange('toDepartment', e.target.value)}
                className="bg-white/50 border-gray-300/80 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all duration-200
                  print:text-xs print:py-0 print:h-5 print:bg-white print:border-gray-300 font-sans"
              />
            </div>
            <div className="space-y-1 print:space-y-0">
              <Label className="text-xs font-medium text-gray-600 print:text-[9px] print:text-gray-700 font-sans print:leading-tight">SECTION</Label>
              <Input
                value={formData.toSection}
                onChange={(e) => onInputChange('toSection', e.target.value)}
                className="bg-white/50 border-gray-300/80 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all duration-200
                  print:text-xs print:py-0 print:h-5 print:bg-white print:border-gray-300 font-sans"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Column 2: FROM Department */}
      <div className="space-y-4 print:space-y-1">
        <div className="space-y-2 print:space-y-0">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-blue-600 print:hidden" />
            <Label className="text-sm font-semibold text-gray-800 tracking-wide print:text-xs print:text-gray-900 print:font-semibold font-sans print:leading-tight">
              FROM DEPARTMENT
            </Label>
          </div>
          <div className="grid grid-cols-2 gap-3 print:gap-1">
            <div className="space-y-1 print:space-y-0">
              <Label className="text-xs font-medium text-gray-600 print:text-[9px] print:text-gray-700 font-sans print:leading-tight">DEPT</Label>
              <Input
                value={formData.fromDepartment}
                onChange={(e) => onInputChange('fromDepartment', e.target.value)}
                className="bg-white/50 border-gray-300/80 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all duration-200
                  print:text-xs print:py-0 print:h-5 print:bg-white print:border-gray-300 font-sans"
              />
            </div>
            <div className="space-y-1 print:space-y-0">
              <Label className="text-xs font-medium text-gray-600 print:text-[9px] print:text-gray-700 font-sans print:leading-tight">SECTION</Label>
              <Input
                value={formData.fromSection}
                onChange={(e) => onInputChange('fromSection', e.target.value)}
                className="bg-white/50 border-gray-300/80 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all duration-200
                  print:text-xs print:py-0 print:h-5 print:bg-white print:border-gray-300 font-sans"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Column 3: Dates & Times */}
      <div className="space-y-4 print:space-y-1">
        <div className="space-y-2 print:space-y-0">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600 print:hidden" />
            <Label className="text-sm font-semibold text-gray-800 tracking-wide print:text-xs print:text-gray-900 print:font-semibold font-sans print:leading-tight">
              DATE & TIME
            </Label>
          </div>
          <div className="grid grid-cols-2 gap-3 print:gap-1">
            <div className="space-y-1 print:space-y-0">
              <Label className="text-xs font-medium text-gray-600 print:text-xs print:text-gray-700 font-sans print:leading-tight">DATE RAISED</Label>
              <Input
                type="date"
                value={formData.dateRaised}
                onChange={(e) => onInputChange('dateRaised', e.target.value)}
                className="bg-white/50 border-gray-300/80 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all duration-200
                  print:text-xs print:py-0 print:h-5 print:bg-white print:border-gray-300 font-sans"
              />
            </div>
            <div className="space-y-1 print:space-y-0">
              <Label className="text-xs font-medium text-gray-600 print:text-xs print:text-gray-700 font-sans print:leading-tight">TIME RAISED</Label>
              <Input
                type="time"
                value={formData.timeRaised}
                onChange={(e) => onInputChange('timeRaised', e.target.value)}
                className="bg-white/50 border-gray-300/80 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all duration-200
                  print:text-xs print:py-0 print:h-5 print:bg-white print:border-gray-300 font-sans"
              />
            </div>
          </div>
          <div className="space-y-1 print:space-y-0">
            <Label className="text-xs font-medium text-gray-600 print:text-xs print:text-gray-700 font-sans print:leading-tight">WORK ORDER NO.</Label>
            <Input
              value={formData.workOrderNumber}
              onChange={(e) => onInputChange('workOrderNumber', e.target.value)}
              className="bg-white/50 border-gray-300/80 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all duration-200
                font-mono print:text-xs print:py-0 print:h-5 print:bg-white print:border-gray-300"
            />
          </div>
        </div>
      </div>

      {/* Column 4: Account & User Lab */}
      <div className="space-y-4 print:space-y-1">
        <div className="space-y-2 print:space-y-0">
          <div className="flex items-center gap-2">
            <FileBarChart className="w-4 h-4 text-blue-600 print:hidden" />
            <Label className="text-sm font-semibold text-gray-800 tracking-wide print:text-xs print:text-gray-900 font-sans print:leading-tight">ACCOUNT INFORMATION</Label>
          </div>
          <div className="space-y-3 print:space-y-1">
            <div className="space-y-1 print:space-y-0">
              <Label className="text-xs font-medium text-gray-600 print:text-xs print:text-gray-700 font-sans print:leading-tight">ACCOUNT NUMBER</Label>
              <Input
                value={formData.accountNumber}
                onChange={(e) => onInputChange('accountNumber', e.target.value)}
                className="bg-white/50 border-gray-300/80 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all duration-200
                  print:text-xs print:py-0 print:h-5 print:bg-white print:border-gray-300 font-sans"
                placeholder=""
              />
            </div>
            <div className="space-y-1 print:space-y-0">
              <Label className="text-xs font-medium text-gray-600 print:text-xs print:text-gray-700 font-sans print:leading-tight">USER LAB TODAY</Label>
              <Input
                value={formData.userLabToday}
                onChange={(e) => onInputChange('userLabToday', e.target.value)}
                className="bg-white/50 border-gray-300/80 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all duration-200
                  print:text-xs print:py-0 print:h-5 print:bg-white print:border-gray-300 font-sans"
                placeholder=""
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Equipment Information */}
    <div className="space-y-2 print:space-y-0">
      <div className="flex items-center gap-2">
        <ToolCase className="w-4 h-4 text-blue-600 print:hidden" />
        <Label className="text-sm font-semibold text-gray-800 tracking-wide print:text-xs print:text-gray-900 font-sans print:leading-tight">EQUIPMENT INFORMATION</Label>
      </div>
      <LinedTextarea
        value={formData.equipmentInfo}
        onChange={(e) => onInputChange('equipmentInfo', e.target.value)}
        rows={3}
        className="print:text-xs w-full"
        placeholder=""
      />
    </div>
  </div>
);

const JobRequestDetailsSection = ({ formData, onInputChange }: { 
  formData: WorkOrderFormData; 
  onInputChange: (field: string, value: string) => void;
}) => (
  <div className="space-y-6 print:space-y-1">
    <div className="space-y-2 print:space-y-0">
      <div className="flex items-center gap-2">
        <ClipboardList className="w-4 h-4 text-blue-600 print:hidden" />
        <Label className="text-sm font-semibold text-gray-800 tracking-wide print:text-xs print:text-gray-900 font-sans print:leading-tight">
          JOB REQUEST DETAILS
        </Label>
      </div>
      <LinedTextarea
        value={formData.jobRequestDetails}
        onChange={(e) => onInputChange('jobRequestDetails', e.target.value)}
        rows={10}
        expanded={true}
        className="print:text-xs"
        placeholder=""
      />
    </div>
    
    <Separator className="my-4 print:my-2" />
    
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:gap-1 print:grid-cols-3">
      <div className="space-y-1 print:space-y-0">
        <div className="flex items-center gap-2 mb-1 print:hidden">
          <User className="w-3 h-3 text-gray-500" />
          <Label className="text-xs font-medium text-gray-600 print:text-xs print:text-gray-700 font-sans print:leading-tight">REQUESTED BY</Label>
        </div>
        <Input
          value={formData.requestedBy}
          onChange={(e) => onInputChange('requestedBy', e.target.value)}
          className="bg-white/50 border-gray-300/80 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all duration-200
            print:text-xs print:py-0 print:h-5 print:bg-white print:border-gray-300 font-sans"
          placeholder=""
        />
      </div>
      <div className="space-y-1 print:space-y-0">
        <div className="flex items-center gap-2 mb-1 print:hidden">
          <HardHat className="w-3 h-3 text-gray-500" />
          <Label className="text-xs font-medium text-gray-600 print:text-xs print:text-gray-700 font-sans print:leading-tight">AUTHORISING FOREMAN</Label>
        </div>
        <Input
          value={formData.authorisingForeman}
          onChange={(e) => onInputChange('authorisingForeman', e.target.value)}
          className="bg-white/50 border-gray-300/80 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all duration-200
            print:text-xs print:py-0 print:h-5 print:bg-white print:border-gray-300 font-sans"
          placeholder=""
        />
      </div>
      <div className="space-y-1 print:space-y-0">
        <div className="flex items-center gap-2 mb-1 print:hidden">
          <Cog className="w-3 h-3 text-gray-500" />
          <Label className="text-xs font-medium text-gray-600 print:text-xs print:text-gray-700 font-sans print:leading-tight">AUTHORISING ENGINEER</Label>
        </div>
        <Input
          value={formData.authorisingEngineer}
          onChange={(e) => onInputChange('authorisingEngineer', e.target.value)}
          className="bg-white/50 border-gray-300/80 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all duration-200
            print:text-xs print:py-0 print:h-5 print:bg-white print:border-gray-300 font-sans"
          placeholder=""
        />
      </div>
    </div>

    <Separator className="my-4 print:my-2" />

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:gap-1 print:grid-cols-2">
      <div className="space-y-1 print:space-y-0">
        <div className="flex items-center gap-2 mb-1 print:hidden">
          <CheckSquare className="w-3 h-3 text-gray-500" />
          <Label className="text-xs font-medium text-gray-600 print:text-xs print:text-gray-700 font-sans print:leading-tight">ALLOCATED TO</Label>
        </div>
        <Input
          value={formData.allocatedTo}
          onChange={(e) => onInputChange('allocatedTo', e.target.value)}
          className="bg-white/50 border-gray-300/80 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all duration-200
            print:text-xs print:py-0 print:h-5 print:bg-white print:border-gray-300 font-sans"
          placeholder=""
        />
      </div>
      <div className="space-y-1 print:space-y-0">
        <div className="flex items-center gap-2 mb-1 print:hidden">
          <Clock className="w-3 h-3 text-gray-500" />
          <Label className="text-xs font-medium text-gray-600 print:text-xs print:text-gray-700 font-sans print:leading-tight">ESTIMATED HOURS</Label>
        </div>
        <Input
          value={formData.estimatedHours}
          onChange={(e) => onInputChange('estimatedHours', e.target.value)}
          className="bg-white/50 border-gray-300/80 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all duration-200
            print:text-xs print:py-0 print:h-5 print:bg-white print:border-gray-300 font-sans"
          placeholder=""
        />
      </div>
    </div>
  </div>
);

const JobClassificationSection = ({ formData, onJobTypeChange, onInputChange, onCalculateOvertime, onCalculateTotalTime }: { 
  formData: WorkOrderFormData; 
  onJobTypeChange: (field: keyof JobType) => void;
  onInputChange: (field: string, value: string) => void;
  onCalculateOvertime: () => void;
  onCalculateTotalTime: () => void;
}) => (
  <div className="space-y-6 print:space-y-1">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:gap-2 print:grid-cols-2">
      <div className="space-y-3 print:space-y-1">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-600 print:hidden" />
          <Label className="text-sm font-semibold text-gray-800 tracking-wide print:text-xs print:text-gray-900 font-sans print:leading-tight">JOB TYPE CLASSIFICATION</Label>
        </div>
        <div className="grid grid-cols-1 gap-2 print:gap-0">
          {[
            { key: 'operational' as const, label: 'Operational Related', code: 'OP', description: 'Daily operations, production activities', icon: TrendingUp },
            { key: 'maintenance' as const, label: 'Maintenance Related', code: 'MT', description: 'Equipment repair, preventive maintenance', icon: Wrench },
            { key: 'mining' as const, label: 'Mining Related', code: 'MN', description: 'Mining operations, pit activities', icon: HardHat },
          ].map(({ key, label, code, description, icon: Icon }) => (
            <div 
              key={key} 
              className={`flex items-center space-x-3 p-3 rounded-lg border transition-all duration-300 cursor-pointer hover:shadow-sm print:p-1 print:rounded print:space-x-1 print:border print:text-xs ${
                formData.jobType[key] 
                  ? 'border-blue-500 bg-blue-50/80 print:bg-gray-100 print:border-gray-400' 
                  : 'border-gray-200 bg-white/50 hover:bg-gray-50/50 print:bg-white'
              }`}
              onClick={() => onJobTypeChange(key)}
            >
              <div className={`flex-shrink-0 flex items-center justify-center h-5 w-5 rounded-md border transition-all duration-300 print:h-3 print:w-3 print:rounded ${
                formData.jobType[key] 
                  ? 'bg-blue-500 border-blue-500 text-white print:bg-gray-600 print:border-gray-600' 
                  : 'border-gray-300 bg-white print:bg-white print:border-gray-400'
              }`}>
                {formData.jobType[key] && (
                  <CheckCircle className="h-3 w-3 print:h-2 print:w-2" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-gray-500 print:hidden" />
                  <Label className="text-sm font-medium cursor-pointer text-gray-800 truncate print:text-xs print:font-medium font-sans print:leading-tight">{label}</Label>
                </div>
                <p className="text-xs text-gray-600 mt-0.5 print:text-[9px] print:leading-tight font-sans truncate">{description}</p>
              </div>
              <Badge 
                variant={formData.jobType[key] ? "default" : "outline"}
                className={`font-mono text-xs print:text-[9px] print:px-1 print:py-0 ${
                  formData.jobType[key] 
                    ? 'bg-blue-100 text-blue-800 border-blue-200' 
                    : 'bg-gray-100 text-gray-700 border-gray-200'
                }`}
              >
                {code}
              </Badge>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-6 print:space-y-1">
        {/* Time Tracking Section */}
        <div className="space-y-3 print:space-y-1">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600 print:hidden" />
            <Label className="text-sm font-semibold text-gray-800 tracking-wide print:text-xs print:text-gray-900 font-sans print:leading-tight">WORK TIME TRACKING</Label>
          </div>
          <div className="grid grid-cols-3 gap-3 print:gap-1 print:grid-cols-3">
            <div className="space-y-1 print:space-y-0">
              <Label className="text-xs font-medium text-gray-600 print:text-[9px] print:text-gray-700 font-sans print:leading-tight">TIME STARTED</Label>
              <Input
                type="time"
                value={formData.timeWorkStarted}
                onChange={(e) => onInputChange('timeWorkStarted', e.target.value)}
                className="bg-white/50 border-gray-300/80 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all duration-200
                  print:text-xs print:py-0 print:h-5 print:bg-white print:border-gray-300 font-sans"
              />
            </div>
            <div className="space-y-1 print:space-y-0">
              <Label className="text-xs font-medium text-gray-600 print:text-[9px] print:text-gray-700 font-sans print:leading-tight">TIME FINISHED</Label>
              <Input
                type="time"
                value={formData.timeWorkFinished}
                onChange={(e) => onInputChange('timeWorkFinished', e.target.value)}
                className="bg-white/50 border-gray-300/80 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all duration-200
                  print:text-xs print:py-0 print:h-5 print:bg-white print:border-gray-300 font-sans"
              />
            </div>
            <div className="space-y-1 print:space-y-0">
              <Label className="text-xs font-medium text-gray-600 print:text-[9px] print:text-gray-700 font-sans print:leading-tight">TOTAL TIME</Label>
              <div className="flex items-end gap-1 print:gap-0">
                <Input
                  value={formData.totalTimeWorked}
                  onChange={(e) => onInputChange('totalTimeWorked', e.target.value)}
                  className="bg-white/50 border-gray-300/80 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all duration-200
                    print:text-xs print:py-0 print:h-5 print:bg-white print:border-gray-300 font-sans font-mono"
                  placeholder="0.00"
                />
                <Button 
                  type="button" 
                  size="sm" 
                  onClick={onCalculateTotalTime}
                  className="print:hidden bg-green-500 hover:bg-green-600 text-white print:py-0 print:px-1 print:text-[8px] print:h-4"
                >
                  <Calculator className="h-3 w-3 print:h-2 print:w-2" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Overtime Section */}
        <div className="space-y-3 print:space-y-1 pt-4 print:pt-1 border-t border-gray-200 print:border-gray-300">
          <div className="flex items-center gap-2">
            <Watch className="w-4 h-4 text-blue-600 print:hidden" />
            <Label className="text-sm font-semibold text-gray-800 tracking-wide print:text-xs print:text-gray-900 font-sans print:leading-tight">OVERTIME TRACKING</Label>
          </div>
          <div className="grid grid-cols-2 gap-3 print:gap-1 print:grid-cols-2">
            <div className="space-y-1 print:space-y-0">
              <Label className="text-xs font-medium text-gray-600 print:text-[9px] print:text-gray-700 font-sans print:leading-tight">OVERTIME START</Label>
              <Input
                type="time"
                value={formData.overtimeStartTime}
                onChange={(e) => onInputChange('overtimeStartTime', e.target.value)}
                className="bg-white/50 border-gray-300/80 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all duration-200
                  print:text-xs print:py-0 print:h-5 print:bg-white print:border-gray-300 font-sans"
              />
            </div>
            <div className="space-y-1 print:space-y-0">
              <Label className="text-xs font-medium text-gray-600 print:text-[9px] print:text-gray-700 font-sans print:leading-tight">OVERTIME END</Label>
              <Input
                type="time"
                value={formData.overtimeEndTime}
                onChange={(e) => onInputChange('overtimeEndTime', e.target.value)}
                className="bg-white/50 border-gray-300/80 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all duration-200
                  print:text-xs print:py-0 print:h-5 print:bg-white print:border-gray-300 font-sans"
              />
            </div>
          </div>
          <div className="space-y-1 print:space-y-0">
            <Label className="text-xs font-medium text-gray-600 print:text-[9px] print:text-gray-700 font-sans print:leading-tight">TOTAL OVERTIME HOURS</Label>
            <div className="flex items-end gap-1 print:gap-0">
              <Input
                value={formData.overtimeHours}
                onChange={(e) => onInputChange('overtimeHours', e.target.value)}
                className="bg-white/50 border-gray-300/80 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all duration-200
                  print:text-xs print:py-0 print:h-5 print:bg-white print:border-gray-300 font-sans font-mono"
                placeholder="0.00"
              />
              <Button 
                type="button" 
                size="sm" 
                onClick={onCalculateOvertime}
                className="print:hidden bg-blue-500 hover:bg-blue-600 text-white print:py-0 print:px-1 print:text-[8px] print:h-4"
              >
                <Calculator className="h-3 w-3 print:h-2 print:w-2" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const WorkAnalysisSection = ({ formData, onInputChange }: { 
  formData: WorkOrderFormData; 
  onInputChange: (field: string, value: string) => void;
}) => (
  <div className="space-y-6 print:space-y-1">
    <div className="space-y-2 print:space-y-0">
      <div className="flex items-center gap-2">
        <ClipboardCheck className="w-4 h-4 text-blue-600 print:hidden" />
        <Label className="text-sm font-semibold text-gray-800 tracking-wide print:text-xs print:text-gray-900 font-sans print:leading-tight">
          WORK PERFORMED
        </Label>
      </div>
      <LinedTextarea
        value={formData.workDoneDetails}
        onChange={(e) => onInputChange('workDoneDetails', e.target.value)}
        rows={8}
        expanded={true}
        className="print:text-xs"
        placeholder=""
      />
    </div>
    
    <Separator className="my-4 print:my-2" />
    
    <div className="space-y-2 print:space-y-0">
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-blue-600 print:hidden" />
        <Label className="text-sm font-semibold text-gray-800 tracking-wide print:text-xs print:text-gray-900 font-sans print:leading-tight">JOB INSTRUCTIONS & SAFETY</Label>
      </div>
      <LinedTextarea
        value={formData.jobInstructions}
        onChange={(e) => onInputChange('jobInstructions', e.target.value)}
        rows={2}
        className="print:text-xs"
        placeholder=""
      />
    </div>

    <Separator className="my-4 print:my-2" />

    <div className="space-y-2 print:space-y-0">
      <div className="flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-blue-600 print:hidden" />
        <Label className="text-sm font-semibold text-gray-800 tracking-wide print:text-xs print:text-gray-900 font-sans print:leading-tight">
          CAUSE OF FAILURE ANALYSIS
        </Label>
      </div>
      <LinedTextarea
        value={formData.causeOfFailure}
        onChange={(e) => onInputChange('causeOfFailure', e.target.value)}
        rows={2}
        className="print:text-xs"
        placeholder=""
      />
    </div>
  </div>
);

const DelaysSection = ({ formData, onInputChange, onCalculateDelay }: {
  formData: WorkOrderFormData;
  onInputChange: (field: string, value: string) => void;
  onCalculateDelay: () => void;
}) => (
  <div className="space-y-4 print:space-y-1">
    <div className="space-y-2 print:space-y-0">
      <div className="flex items-center gap-2">
        <LineChart className="w-4 h-4 text-blue-600 print:hidden" />
        <Label className="text-sm font-semibold text-gray-800 tracking-wide print:text-xs print:text-gray-900 font-sans print:leading-tight">DELAY DETAILS</Label>
      </div>
      <LinedTextarea
        value={formData.delayDetails}
        onChange={(e) => onInputChange('delayDetails', e.target.value)}
        rows={2}
        className="print:text-xs"
        placeholder=""
      />
    </div>

    {/* Delay Time Tracking Section */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 print:gap-1 print:grid-cols-3 pt-4 print:pt-1 border-t border-gray-200 print:border-gray-300">
      <div className="space-y-1 print:space-y-0">
        <Label className="text-xs font-medium text-gray-600 print:text-[9px] print:text-gray-700 font-sans print:leading-tight">DELAY FROM</Label>
        <Input
          type="time"
          value={formData.delayFromTime}
          onChange={(e) => onInputChange('delayFromTime', e.target.value)}
          className="bg-white/50 border-gray-300/80 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all duration-200
            print:text-xs print:py-0 print:h-5 print:bg-white print:border-gray-300 font-sans"
        />
      </div>
      <div className="space-y-1 print:space-y-0">
        <Label className="text-xs font-medium text-gray-600 print:text-[9px] print:text-gray-700 font-sans print:leading-tight">DELAY TO</Label>
        <Input
          type="time"
          value={formData.delayToTime}
          onChange={(e) => onInputChange('delayToTime', e.target.value)}
          className="bg-white/50 border-gray-300/80 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all duration-200
            print:text-xs print:py-0 print:h-5 print:bg-white print:border-gray-300 font-sans"
        />
      </div>
      <div className="space-y-1 print:space-y-0">
        <Label className="text-xs font-medium text-gray-600 print:text-[9px] print:text-gray-700 font-sans print:leading-tight">TOTAL DELAY HOURS</Label>
        <div className="flex items-end gap-1 print:gap-0">
          <Input
            value={formData.totalDelayHours}
            onChange={(e) => onInputChange('totalDelayHours', e.target.value)}
            className="bg-white/50 border-gray-300/80 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all duration-200
              print:text-xs print:py-0 print:h-5 print:bg-white print:border-gray-300 font-sans font-mono"
            placeholder="0.00"
          />
          <Button 
            type="button" 
            size="sm" 
            onClick={onCalculateDelay}
            className="print:hidden bg-blue-500 hover:bg-blue-600 text-white print:py-0 print:px-1 print:text-[8px] print:h-4"
          >
            <Calculator className="h-3 w-3 print:h-2 print:w-2" />
          </Button>
        </div>
      </div>
    </div>
    
    <div className="text-xs text-gray-600 print:text-[9px] font-sans print:leading-tight pt-2 print:pt-1 border-t border-gray-200 print:border-gray-300">
      <div className="flex items-center gap-2 mb-1 print:hidden">
        <BarChart3 className="w-3 h-3 text-gray-500" />
        <p className="font-semibold text-gray-700 mb-0 print:mb-0">Common Delay Types:</p>
      </div>
      <div className="grid grid-cols-2 gap-1 print:grid-cols-2 print:gap-0">
        <div className="flex items-center gap-1"><div className="w-1 h-1 bg-gray-400 rounded-full"></div> Travelling to location</div>
        <div className="flex items-center gap-1"><div className="w-1 h-1 bg-gray-400 rounded-full"></div> Collecting spares/parts</div>
        <div className="flex items-center gap-1"><div className="w-1 h-1 bg-gray-400 rounded-full"></div> Machine not available</div>
        <div className="flex items-center gap-1"><div className="w-1 h-1 bg-gray-400 rounded-full"></div> Collecting tools/equipment</div>
        <div className="flex items-center gap-1"><div className="w-1 h-1 bg-gray-400 rounded-full"></div> Labour not available</div>
        <div className="flex items-center gap-1"><div className="w-1 h-1 bg-gray-400 rounded-full"></div> Waiting for another skill</div>
        <div className="flex items-center gap-1"><div className="w-1 h-1 bg-gray-400 rounded-full"></div> Operator not available</div>
        <div className="flex items-center gap-1"><div className="w-1 h-1 bg-gray-400 rounded-full"></div> Waiting for transport</div>
        <div className="flex items-center gap-1"><div className="w-1 h-1 bg-gray-400 rounded-full"></div> Safety clearance required</div>
        <div className="flex items-center gap-1"><div className="w-1 h-1 bg-gray-400 rounded-full"></div> Power/utility isolation</div>
      </div>
    </div>
  </div>
);

const SignOffSection = ({ formData, onInputChange }: { 
  formData: WorkOrderFormData; 
  onInputChange: (field: string, value: string) => void;
}) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:gap-2 print:grid-cols-2">
    <div className="space-y-3 print:space-y-1">
      <div className="flex items-center gap-2">
        <FileSignature className="w-4 h-4 text-blue-600 print:hidden" />
        <Label className="text-sm font-semibold text-gray-800 tracking-wide print:text-xs print:text-gray-900 font-sans print:leading-tight">ARTISAN SIGN-OFF</Label>
      </div>
      <div className="space-y-3 print:space-y-0">
        <div className="grid grid-cols-1 gap-3 print:gap-0">
          <div>
            <Label className="text-xs font-medium text-gray-600 print:text-[9px] print:text-gray-700 font-sans print:leading-tight">NAME</Label>
            <Input
              value={formData.artisanName}
              onChange={(e) => onInputChange('artisanName', e.target.value)}
              className="bg-white/50 border-gray-300/80 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all duration-200
                print:text-xs print:py-0 print:h-5 print:bg-white print:border-gray-300 font-sans"
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-600 print:text-[9px] print:text-gray-700 font-sans print:leading-tight">SIGNATURE</Label>
            <Input
              value={formData.artisanSign}
              onChange={(e) => onInputChange('artisanSign', e.target.value)}
              className="bg-white/50 border-gray-300/80 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all duration-200
                print:text-xs print:py-0 print:h-5 print:bg-white print:border-gray-300 font-sans"
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-600 print:text-[9px] print:text-gray-700 font-sans print:leading-tight">DATE</Label>
            <Input
              type="date"
              value={formData.artisanDate}
              onChange={(e) => onInputChange('artisanDate', e.target.value)}
              className="bg-white/50 border-gray-300/80 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all duration-200
                print:text-xs print:py-0 print:h-5 print:bg-white print:border-gray-300 font-sans"
            />
          </div>
        </div>
      </div>
    </div>
    <div className="space-y-3 print:space-y-1">
      <div className="flex items-center gap-2">
        <FileEdit className="w-4 h-4 text-blue-600 print:hidden" />
        <Label className="text-sm font-semibold text-gray-800 tracking-wide print:text-xs print:text-gray-900 font-sans print:leading-tight">FOREMAN SIGN-OFF</Label>
      </div>
      <div className="space-y-3 print:space-y-0">
        <div className="grid grid-cols-1 gap-3 print:gap-0">
          <div>
            <Label className="text-xs font-medium text-gray-600 print:text-[9px] print:text-gray-700 font-sans print:leading-tight">NAME</Label>
            <Input
              value={formData.foremanName}
              onChange={(e) => onInputChange('foremanName', e.target.value)}
              className="bg-white/50 border-gray-300/80 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all duration-200
                print:text-xs print:py-0 print:h-5 print:bg-white print:border-gray-300 font-sans"
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-600 print:text-[9px] print:text-gray-700 font-sans print:leading-tight">SIGNATURE</Label>
            <Input
              value={formData.foremanSign}
              onChange={(e) => onInputChange('foremanSign', e.target.value)}
              className="bg-white/50 border-gray-300/80 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all duration-200
                print:text-xs print:py-0 print:h-5 print:bg-white print:border-gray-300 font-sans"
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-600 print:text-[9px] print:text-gray-700 font-sans print:leading-tight">DATE</Label>
            <Input
              type="date"
              value={formData.foremanDate}
              onChange={(e) => onInputChange('foremanDate', e.target.value)}
              className="bg-white/50 border-gray-300/80 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all duration-200
                print:text-xs print:py-0 print:h-5 print:bg-white print:border-gray-300 font-sans"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
);

interface WorkOrderFormProps {
  onBack?: () => void;
  onSave?: (data: WorkOrderFormData) => void;
}

export function WorkOrderForm({ onBack, onSave }: WorkOrderFormProps) {
  const [formData, setFormData] = useState<WorkOrderFormData>(INITIAL_FORM_DATA);
  const [activeTab, setActiveTab] = useState("basic");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const { toast } = useToast();

  // Scroll to top when tab changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  const handleInputChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleJobTypeChange = useCallback((field: keyof JobType) => {
    setFormData(prev => ({
      ...prev,
      jobType: {
        ...prev.jobType,
        [field]: !prev.jobType[field]
      }
    }));
  }, []);

  // Test backend connection on component mount
  useEffect(() => {
    const checkBackend = async () => {
      const result = await testBackendConnection();
      setBackendStatus(result.status === 'healthy' ? 'connected' : 'disconnected');
    };
    checkBackend();
  }, []);

  // Calculate total time worked automatically when work times change
  useEffect(() => {
    if (formData.timeWorkStarted && formData.timeWorkFinished) {
      const calculatedHours = calculateTotalTimeWorked(formData.timeWorkStarted, formData.timeWorkFinished);
      setFormData(prev => ({
        ...prev,
        totalTimeWorked: calculatedHours
      }));
    }
  }, [formData.timeWorkStarted, formData.timeWorkFinished]);

  // Calculate overtime hours automatically when overtime times change
  useEffect(() => {
    if (formData.overtimeStartTime && formData.overtimeEndTime) {
      const calculatedHours = calculateOvertimeHours(formData.overtimeStartTime, formData.overtimeEndTime);
      setFormData(prev => ({
        ...prev,
        overtimeHours: calculatedHours
      }));
    }
  }, [formData.overtimeStartTime, formData.overtimeEndTime]);

  // Calculate delay hours automatically when delay times change
  useEffect(() => {
    if (formData.delayFromTime && formData.delayToTime) {
      const calculatedHours = calculateDelayHours(formData.delayFromTime, formData.delayToTime);
      setFormData(prev => ({
        ...prev,
        totalDelayHours: calculatedHours
      }));
    }
  }, [formData.delayFromTime, formData.delayToTime]);

  const handleCalculateTotalTime = useCallback(() => {
    if (formData.timeWorkStarted && formData.timeWorkFinished) {
      const calculatedHours = calculateTotalTimeWorked(formData.timeWorkStarted, formData.timeWorkFinished);
      setFormData(prev => ({
        ...prev,
        totalTimeWorked: calculatedHours
      }));
    }
  }, [formData.timeWorkStarted, formData.timeWorkFinished]);

  const handleCalculateOvertime = useCallback(() => {
    if (formData.overtimeStartTime && formData.overtimeEndTime) {
      const calculatedHours = calculateOvertimeHours(formData.overtimeStartTime, formData.overtimeEndTime);
      setFormData(prev => ({
        ...prev,
        overtimeHours: calculatedHours
      }));
    }
  }, [formData.overtimeStartTime, formData.overtimeEndTime]);

  const handleCalculateDelay = useCallback(() => {
    if (formData.delayFromTime && formData.delayToTime) {
      const calculatedHours = calculateDelayHours(formData.delayFromTime, formData.delayToTime);
      setFormData(prev => ({
        ...prev,
        totalDelayHours: calculatedHours
      }));
    }
  }, [formData.delayFromTime, formData.delayToTime]);

  const generatePDF = useCallback(() => {
    console.log('Generating PDF with data:', formData);
    window.print();
  }, [formData]);

  const printForm = useCallback(() => {
    window.print();
  }, []);

  // CORRECTED SUBMISSION HANDLER - Uses proper endpoint
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.jobRequestDetails || !formData.requestedBy) {
      toast({
        title: "Validation Error",
        description: "Please fill in required fields: Job Request Details and Requested By",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      console.log('📝 Submitting work order...', formData);
      
      // Transform data to backend format
      const backendData = transformToBackendFormat(formData);
      console.log('📤 Transformed data for backend:', backendData);
      
      // Use the CORRECTED createWorkOrder function
      const response = await createWorkOrder(backendData);
      console.log('✅ Submission response:', response);
      
      if (response.savedLocally) {
        toast({
          title: "Saved Locally",
          description: "Work order saved locally (backend unavailable)",
        });
      } else {
        toast({
          title: "Success",
          description: "Work order saved successfully to database!",
        });
      }
      
      // Call the onSave prop to notify parent component
      if (onSave) {
        onSave(formData);
      }
      
      // Reset form after successful submission
      setFormData(INITIAL_FORM_DATA);
      
    } catch (error) {
      console.error('💥 Error saving work order:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('saved locally')) {
          toast({
            title: "Saved Locally",
            description: "Work order saved locally for now.",
          });
        } else if (error.message.includes('Network error') || error.message.includes('Failed to fetch')) {
          toast({
            title: "Network Error",
            description: "Cannot connect to server. Work order saved locally.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: `Error: ${error.message}`,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Error",
          description: "Unknown error occurred while saving work order",
          variant: "destructive",
        });
      }
      
      // Final fallback and notify parent
      if (onSave) {
        onSave(formData);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, onSave, toast]);

  const saveDraft = useCallback(() => {
    const savedDrafts = JSON.parse(localStorage.getItem('workOrderDrafts') || '[]');
    const draft = {
      ...formData,
      id: Date.now().toString(),
      status: 'draft',
      createdAt: new Date().toISOString()
    };
    savedDrafts.push(draft);
    localStorage.setItem('workOrderDrafts', JSON.stringify(savedDrafts));
    
    toast({
      title: "Success",
      description: "Work order draft saved successfully!",
    });
  }, [formData, toast]);

  const resetForm = useCallback(() => {
    if (confirm('Are you sure you want to reset the form? All data will be lost.')) {
      setFormData(INITIAL_FORM_DATA);
      
      toast({
        title: "Form Reset",
        description: "Work order form reset successfully",
      });
    }
  }, [toast]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30 p-4 print:p-0 font-sans">
      <div className="max-w-7xl mx-auto print:max-w-none print:mx-0">
        {/* Enhanced Header */}
        <div className="mb-8 print:hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl shadow-lg">
                <ClipboardCheck className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-700 to-blue-900 bg-clip-text text-transparent tracking-tight">
                  Work Order Management
                </h1>
                <p className="text-gray-600 mt-1 font-medium">
                  Create and manage maintenance work orders with precision
                </p>
                <div className="flex items-center gap-3 mt-2">
                  <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                    backendStatus === 'connected' ? 'bg-green-100 text-green-800' : 
                    backendStatus === 'disconnected' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${
                      backendStatus === 'connected' ? 'bg-green-500' : 
                      backendStatus === 'disconnected' ? 'bg-orange-500' : 'bg-blue-500'
                    }`} />
                    {backendStatus === 'connected' ? 'Database Connected' : 
                     backendStatus === 'disconnected' ? 'Using Local Storage' : 'Checking Connection...'}
                  </div>
                  <Badge variant="outline" className="font-mono text-xs bg-blue-50 text-blue-700 border-blue-200">
                    Ref: {formData.workOrderNumber}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {onBack && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onBack} 
                  className="gap-2 hover:bg-gray-100 transition-all duration-300 border-gray-300"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              )}
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={generatePDF} 
                  className="gap-2 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-all duration-300"
                >
                  <Download className="h-4 w-4" />
                  Export PDF
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={printForm} 
                  className="gap-2 hover:bg-gray-100 hover:text-gray-800 transition-all duration-300"
                >
                  <Printer className="h-4 w-4" />
                  Print
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Form Container */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200/80 shadow-xl overflow-hidden print:shadow-none print:border-0 print:bg-transparent">
          {/* Form Header */}
          <div className="border-b border-gray-200/80 bg-gradient-to-r from-blue-50/80 to-white p-6 print:hidden">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                  New Work Order
                </h2>
                <p className="text-gray-600 mt-1">
                  Complete all sections for comprehensive work order documentation
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-700">Status</div>
                  <div className="text-xs text-gray-500">Ready for submission</div>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-md">
                  <FileText className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 print:p-2">
            {/* Screen Layout with Enhanced Tabs */}
            <div className="screen-only">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
                {/* Mobile Progress Indicator */}
                <div className="lg:hidden mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-600">Step {['basic', 'details', 'work', 'signoff'].indexOf(activeTab) + 1} of 4</span>
                    <span className="text-xs font-medium text-blue-600">
                      {activeTab === 'basic' && 'Basic Info'}
                      {activeTab === 'details' && 'Job Details'}
                      {activeTab === 'work' && 'Work Analysis'}
                      {activeTab === 'signoff' && 'Sign-off'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-blue-600 to-blue-800 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${((['basic', 'details', 'work', 'signoff'].indexOf(activeTab) + 1) / 4) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Desktop Horizontal Tabs */}
                <div className="hidden lg:block border-b border-gray-200/60 pb-4">
                  <TabsList className="grid grid-cols-4 w-full bg-gray-100/80 p-1 rounded-xl backdrop-blur-sm">
                    {[
                      { value: "basic", label: "Basic Info", icon: FileText },
                      { value: "details", label: "Job Details", icon: Settings },
                      { value: "work", label: "Work Analysis", icon: Workflow },
                      { value: "signoff", label: "Sign-off", icon: FileCheck },
                    ].map(({ value, label, icon: Icon }) => (
                      <TabsTrigger 
                        key={value}
                        value={value} 
                        className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm 
                          data-[state=active]:border data-[state=active]:border-gray-300/50 rounded-lg transition-all duration-300 
                          text-gray-700 data-[state=active]:text-gray-900 font-medium hover:bg-gray-200/50"
                      >
                        <Icon className="h-4 w-4" />
                        {label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>

                {/* Mobile Horizontal Scrollable Tabs */}
                <div className="lg:hidden">
                  <div className="relative">
                    <div className="flex overflow-x-auto scrollbar-hide border-b border-gray-200/60 pb-0 -mx-1 px-1">
                      <div className="flex w-full min-w-max gap-1">
                        {[
                          { value: "basic", label: "Basic Info", icon: FileText, step: "1" },
                          { value: "details", label: "Job Details", icon: Settings, step: "2" },
                          { value: "work", label: "Work Analysis", icon: Workflow, step: "3" },
                          { value: "signoff", label: "Sign-off", icon: FileCheck, step: "4" },
                        ].map(({ value, label, icon: Icon, step }) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setActiveTab(value)}
                            className={`flex items-center gap-2 px-4 py-3 rounded-t-lg border-b-2 transition-all duration-300 whitespace-nowrap min-w-[120px] justify-center
                              ${activeTab === value 
                                ? 'border-blue-600 bg-blue-50/50 text-blue-900 font-semibold' 
                                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                              }`}
                          >
                            <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold
                              ${activeTab === value 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-gray-200 text-gray-600'
                              }`}
                            >
                              {step}
                            </span>
                            <Icon className="h-4 w-4" />
                            <span className="text-sm">{label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mobile Quick Navigation Buttons */}
                <div className="lg:hidden flex justify-between items-center mt-4 pt-4 border-t border-gray-200/60">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const currentIndex = ['basic', 'details', 'work', 'signoff'].indexOf(activeTab);
                      if (currentIndex > 0) {
                        setActiveTab(['basic', 'details', 'work', 'signoff'][currentIndex - 1]);
                      }
                    }}
                    disabled={['basic', 'details', 'work', 'signoff'].indexOf(activeTab) === 0}
                    className="gap-2 hover:bg-gray-100 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={() => {
                      const currentIndex = ['basic', 'details', 'work', 'signoff'].indexOf(activeTab);
                      if (currentIndex < 3) {
                        setActiveTab(['basic', 'details', 'work', 'signoff'][currentIndex + 1]);
                      }
                    }}
                    disabled={['basic', 'details', 'work', 'signoff'].indexOf(activeTab) === 3}
                    className="gap-2 bg-blue-600 hover:bg-blue-700 text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                    <ArrowLeft className="h-4 w-4 rotate-180" />
                  </Button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                  <TabsContent value="basic" className="space-y-8 animate-in fade-in duration-500">
                    <FormSection title="Header Information" icon={Building}>
                      <HeaderSection formData={formData} onInputChange={handleInputChange} />
                    </FormSection>

                    <FormSection title="Job Classification & Equipment" icon={Layers}>
                      <JobClassificationSection 
                        formData={formData} 
                        onJobTypeChange={handleJobTypeChange}
                        onInputChange={handleInputChange}
                        onCalculateOvertime={handleCalculateOvertime}
                        onCalculateTotalTime={handleCalculateTotalTime}
                      />
                    </FormSection>
                  </TabsContent>

                  <TabsContent value="details" className="space-y-8 animate-in fade-in duration-500">
                    <FormSection title="Job Request Details" icon={ClipboardList}>
                      <JobRequestDetailsSection formData={formData} onInputChange={handleInputChange} />
                    </FormSection>
                  </TabsContent>

                  <TabsContent value="work" className="space-y-8 animate-in fade-in duration-500">
                    <FormSection title="Work Details & Analysis" icon={ClipboardCheck}>
                      <WorkAnalysisSection formData={formData} onInputChange={handleInputChange} />
                    </FormSection>

                    <FormSection title="Delay Tracking" icon={LineChart} compact={true}>
                      <DelaysSection 
                        formData={formData} 
                        onInputChange={handleInputChange}
                        onCalculateDelay={handleCalculateDelay}
                      />
                    </FormSection>
                  </TabsContent>

                  <TabsContent value="signoff" className="space-y-8 animate-in fade-in duration-500">
                    <FormSection title="Sign-off & Authorization" icon={FileSignature} compact={true}>
                      <SignOffSection formData={formData} onInputChange={handleInputChange} />
                    </FormSection>
                  </TabsContent>

                  {/* Enhanced Form Buttons */}
                  <div className="flex justify-between items-center pt-8 border-t border-gray-300/60 print:hidden">
                    <div className="flex gap-3">
                      <Button 
                        variant="outline" 
                        type="button" 
                        onClick={resetForm} 
                        className="gap-2 hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-all duration-300"
                        disabled={isSubmitting}
                      >
                        Reset Form
                      </Button>
                      <Button 
                        variant="outline" 
                        type="button" 
                        onClick={saveDraft} 
                        className="gap-2 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-all duration-300"
                        disabled={isSubmitting}
                      >
                        Save Draft
                      </Button>
                    </div>
                    <Button 
                      type="submit" 
                      className="gap-2 bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 
                        shadow-lg hover:shadow-xl transition-all duration-300 text-white"
                      disabled={isSubmitting}
                    >
                      <Save className="h-4 w-4" />
                      {isSubmitting ? 'Saving Work Order...' : 'Submit Work Order'}
                    </Button>
                  </div>
                </form>
              </Tabs>
            </div>

            {/* Optimized Print Layout */}
            <div className="print-only">
              {/* Page 1 */}
              <div className="print-page">
                {/* Print Header */}
                <div className="print-header mb-3 pb-2 border-b border-gray-900">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-blue-900 rounded print:bg-black"></div>
                        <h1 className="text-base font-bold text-gray-900 font-sans">MAINTENANCE WORK ORDER</h1>
                      </div>
                      <p className="text-sm text-gray-700 font-sans mt-1">WORK ORDER DOCUMENTATION</p>
                    </div>
                    <div className="text-right">
                      <div className="px-3 py-1 bg-gray-100 rounded border border-gray-300 inline-block">
                        <p className="text-xs font-bold text-gray-900 font-sans">Ref: {formData.workOrderNumber}</p>
                      </div>
                      <p className="text-[10px] text-gray-600 font-sans mt-1">Date: {formData.dateRaised}</p>
                    </div>
                  </div>
                </div>

                {/* 1. HEADER INFORMATION */}
                <FormSection title="HEADER INFORMATION" compact={true}>
                  <HeaderSection formData={formData} onInputChange={handleInputChange} />
                </FormSection>

                {/* 2. JOB REQUEST DETAILS */}
                <FormSection title="JOB REQUEST DETAILS">
                  <JobRequestDetailsSection formData={formData} onInputChange={handleInputChange} />
                </FormSection>

                {/* Page 1 Footer */}
                <div className="print-footer mt-2 pt-2 border-t border-gray-300 text-center text-[10px] text-gray-600 font-sans">
                  <p>Work Order Reference: {formData.workOrderNumber} | Page 1 of 2</p>
                </div>
              </div>

              {/* Page 2 */}
              <div className="print-page">
                {/* Page 2 Header */}
                <div className="print-header mb-3 pb-2 border-b border-gray-900">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-blue-900 rounded print:bg-black"></div>
                        <h1 className="text-base font-bold text-gray-900 font-sans">MAINTENANCE WORK ORDER</h1>
                      </div>
                      <p className="text-sm text-gray-700 font-sans mt-1">CONTINUED - COMPLETION & SIGN-OFF</p>
                    </div>
                    <div className="text-right">
                      <div className="px-3 py-1 bg-gray-100 rounded border border-gray-300 inline-block">
                        <p className="text-xs font-bold text-gray-900 font-sans">Ref: {formData.workOrderNumber}</p>
                      </div>
                      <p className="text-[10px] text-gray-600 font-sans mt-1">Page 2 of 2</p>
                    </div>
                  </div>
                </div>

                {/* 3. JOB CLASSIFICATION & EQUIPMENT */}
                <FormSection title="JOB CLASSIFICATION & EQUIPMENT" compact={true}>
                  <JobClassificationSection 
                    formData={formData} 
                    onJobTypeChange={handleJobTypeChange}
                    onInputChange={handleInputChange}
                    onCalculateOvertime={handleCalculateOvertime}
                    onCalculateTotalTime={handleCalculateTotalTime}
                  />
                </FormSection>

                {/* 4. WORK DETAILS & ANALYSIS */}
                <FormSection title="WORK DETAILS & ANALYSIS">
                  <WorkAnalysisSection formData={formData} onInputChange={handleInputChange} />
                </FormSection>

                {/* 5. DELAY TRACKING */}
                <FormSection title="DELAY TRACKING" compact={true}>
                  <DelaysSection 
                    formData={formData} 
                    onInputChange={handleInputChange}
                    onCalculateDelay={handleCalculateDelay}
                  />
                </FormSection>

                {/* 6. SIGN-OFF & AUTHORIZATION */}
                <FormSection title="SIGN-OFF & AUTHORIZATION" compact={true}>
                  <SignOffSection formData={formData} onInputChange={handleInputChange} />
                </FormSection>

                {/* Page 2 Footer */}
                <div className="print-footer mt-2 pt-2 border-t border-gray-300 text-center text-[10px] text-gray-600 font-sans">
                  <div className="grid grid-cols-3 gap-2 text-[8px]">
                    <div>Work Order: {formData.workOrderNumber}</div>
                    <div>Date: {new Date().toLocaleDateString()}</div>
                    <div>Page 2 of 2</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 0.4in 0.5in;
          }
          
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            background: white !important;
            margin: 0;
            padding: 0;
            font-size: 11px;
            line-height: 1.3;
            font-family: 'Inter', 'Segoe UI', sans-serif !important;
          }
          
          .print-only {
            display: block !important;
          }
          
          .screen-only {
            display: none !important;
          }
          
          .print-page {
            min-height: calc(100vh - 0.8in);
            page-break-after: always;
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          
          .print-page:last-child {
            page-break-after: avoid;
          }
          
          .print-header {
            margin-bottom: 0.2in;
            padding-bottom: 0.1in;
          }
          
          .print-footer {
            margin-top: 0.2in;
            padding-top: 0.1in;
            text-align: center;
          }
          
          /* Typography improvements for print */
          * {
            font-family: 'Inter', 'Segoe UI', sans-serif !important;
          }
          
          /* Enhanced form elements for print */
          .print-page input,
          .print-page textarea {
            border: 1px solid #666 !important;
            background: white !important;
            padding: 0.1rem 0.2rem !important;
            margin: 0 !important;
            font-size: 10px;
            line-height: 1.2;
            height: auto !important;
          }
          
          /* Print-specific spacing */
          .print-page .space-y-1 > * + * {
            margin-top: 0.15rem !important;
          }
          
          .print-page .space-y-2 > * + * {
            margin-top: 0.25rem !important;
          }
          
          .print-page .space-y-3 > * + * {
            margin-top: 0.35rem !important;
          }
          
          .print-page .gap-1 {
            gap: 0.15rem !important;
          }
          
          .print-page .gap-2 {
            gap: 0.25rem !important;
          }
          
          .print-page .gap-3 {
            gap: 0.35rem !important;
          }
          
          /* Elegant borders for print */
          .print-page .border {
            border-width: 1px !important;
            border-color: #666 !important;
          }
          
          .print-page .border-b {
            border-bottom-width: 1px !important;
            border-color: #666 !important;
          }
          
          .print-page .border-t {
            border-top-width: 1px !important;
            border-color: #666 !important;
          }

          /* Hide non-print elements */
          .print-page button,
          .print-page .print-hidden {
            display: none !important;
          }
          
          /* Enhanced textareas for better writing space */
          .print-page textarea[rows="10"] {
            min-height: 160px !important;
          }
          
          .print-page textarea[rows="8"] {
            min-height: 130px !important;
          }
          
          .print-page textarea[rows="3"] {
            min-height: 60px !important;
          }
          
          /* Remove background effects for clean print */
          .print-page * {
            background: white !important;
            box-shadow: none !important;
          }
          
          /* Better font sizes for print */
          .print-page .text-sm {
            font-size: 10px !important;
          }
          
          .print-page .text-xs {
            font-size: 9px !important;
          }
          
          .print-page .text-base {
            font-size: 12px !important;
          }
          
          .print-page .text-lg {
            font-size: 13px !important;
          }
          
          /* Clean dotted lines */
          .print-page .border-dotted {
            border-style: dotted !important;
            border-color: #999 !important;
          }

          /* Hide placeholders in print */
          .print-page textarea::placeholder,
          .print-page input::placeholder {
            color: transparent !important;
          }
        }
        
        /* Screen styles */
        @media screen {
          .print-only {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}