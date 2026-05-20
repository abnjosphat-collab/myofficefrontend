"use client";

import React, { useState, useEffect } from 'react';
import {
  Plus, Search, Trash2, Edit, FileText,
  Filter, Calendar, Tag, RefreshCw, MoreVertical,
  Paperclip, Download, CheckCircle, Eye,
  ChevronDown, X, User, Building, Save,
  Upload, Clock, Share2, Copy, Info,
  Archive, DollarSign,
  Package, Hash, Flag, FileSpreadsheet,
  Calculator, CalendarDays, BarChart3,
  Receipt, ClipboardCheck, ShoppingCart,
  TrendingUp, Package2, AlertCircle,
  HelpCircle, Briefcase, Users, Zap,
  Wrench, LayoutGrid, Table as TableIcon,
  CalendarRange, HardDrive, ChevronUp,
  ChevronRight, ChevronLeft, Database,
  Maximize2, Minimize2
} from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { formatCurrency, fmtDate as formatDate, fmtDateTime as formatDateTime } from '@/components/shared';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// ============= Type Definitions (match SQL) =============
export interface RequisitionItem {
  description: string;
  costPerUnit: number;
  quantity: number;
  reason: string;
}

export interface Requisition {
  id: string;
  date: string;
  requester: string;
  section: 'Electrical' | 'Mechanical';
  required_for: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  status: 'Draft' | 'Pending' | 'Approved' | 'Rejected' | 'Processing' | 'Completed';
  requisitionNumber: string;
  items: RequisitionItem[];
  notes?: string;
  attachments?: Attachment[];
  lineNumber: number;
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  name: string;
  size: string;
  uploaded: string;
  url?: string;
}

export interface Filters {
  status: string;
  priority: string;
  section: string;
  dateRange: {
    from: Date | null;
    to: Date | null;
  };
  requester: string;
  search?: string;
}

export type ViewMode = 'grid' | 'list';

// ============= Constants (match SQL check constraints) =============
const STATUSES: Array<Requisition['status']> = ["Draft", "Pending", "Approved", "Rejected", "Processing", "Completed"];
const PRIORITIES: Array<Requisition['priority']> = ["Critical", "High", "Medium", "Low"];
const SECTIONS: Array<Requisition['section']> = ["Electrical", "Mechanical"];

// ============= API Service - Fixed Base URL Handling =============
const SERVER_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_BASE_URL = `${SERVER_URL}/api/requisitions`;

console.log('🔍 SERVER_URL:', SERVER_URL);
console.log('🔍 API_BASE_URL (requisitions):', API_BASE_URL);

const buildUrl = (path: string = ''): string => {
  if (!path) return API_BASE_URL;
  return `${API_BASE_URL}/${path}`;
};

const requisitionsApi = {
  async getAllRequisitions(filters: Partial<Filters> = {}): Promise<Requisition[]> {
    try {
      const params = new URLSearchParams();
      if (filters.status && filters.status !== 'all') params.append('status', filters.status);
      if (filters.priority && filters.priority !== 'all') params.append('priority', filters.priority);
      if (filters.section && filters.section !== 'all') params.append('section', filters.section);
      if (filters.requester && filters.requester !== 'all') params.append('requester', filters.requester);
      if (filters.dateRange?.from) params.append('date_from', filters.dateRange.from.toISOString().split('T')[0]);
      if (filters.dateRange?.to) params.append('date_to', filters.dateRange.to.toISOString().split('T')[0]);
      if (filters.search) params.append('search', filters.search);

      const url = params.toString() ? `${API_BASE_URL}?${params.toString()}` : API_BASE_URL;
      console.log('📋 Fetching requisitions from:', url);

      const response = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      const data = await response.json();
      return Array.isArray(data) ? data.map(transformRequisitionFromBackend) : [];
    } catch (error) {
      console.error('❌ Error fetching requisitions:', error);
      throw error;
    }
  },

  async createRequisition(data: Omit<Requisition, 'id' | 'lineNumber' | 'createdAt' | 'updatedAt'>): Promise<Requisition> {
    try {
      const formattedData = {
        date: data.date,
        requester: data.requester,
        section: data.section,
        required_for: data.required_for || null,
        priority: data.priority,
        status: data.status,
        requisition_number: data.requisitionNumber,
        notes: data.notes || null,
        items: data.items.map(item => ({
          description: item.description,
          cost_per_unit: item.costPerUnit,
          quantity: item.quantity,
          reason: item.reason || null
        }))
      };

      console.log('📝 Creating requisition at:', API_BASE_URL);
      console.log('📦 Request data:', formattedData);

      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formattedData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Response not OK:', response.status, response.statusText);
        console.error('❌ Error response body:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Create result:', result);
      return transformRequisitionFromBackend(result);
    } catch (error) {
      console.error('❌ Create error:', error);
      throw error;
    }
  },

  async updateRequisition(id: string, data: Partial<Omit<Requisition, 'id' | 'lineNumber' | 'createdAt' | 'updatedAt'>>): Promise<Requisition> {
    try {
      const formattedData: any = {};
      if (data.date) formattedData.date = data.date;
      if (data.requester) formattedData.requester = data.requester;
      if (data.section) formattedData.section = data.section;
      if (data.required_for !== undefined) formattedData.required_for = data.required_for;
      if (data.priority) formattedData.priority = data.priority;
      if (data.status) formattedData.status = data.status;
      if (data.requisitionNumber) formattedData.requisition_number = data.requisitionNumber;
      if (data.notes !== undefined) formattedData.notes = data.notes;
      if (data.items) {
        formattedData.items = data.items.map(item => ({
          description: item.description,
          cost_per_unit: item.costPerUnit,
          quantity: item.quantity,
          reason: item.reason || null
        }));
      }

      const url = buildUrl(id);
      console.log('✏️ Updating requisition at:', url);
      console.log('📦 Update payload:', JSON.stringify(formattedData, null, 2));

      const response = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formattedData)
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Update response error:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      const result = await response.json();
      return transformRequisitionFromBackend(result);
    } catch (error) {
      console.error('❌ Update error:', error);
      throw error;
    }
  },

  async deleteRequisition(id: string): Promise<{ success: boolean }> {
    try {
      const url = buildUrl(id);
      console.log('🗑️ Deleting requisition at:', url);
      const response = await fetch(url, { method: 'DELETE' });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      return await response.json();
    } catch (error) {
      console.error('❌ Delete error:', error);
      throw error;
    }
  },

  async getDailyTotal(date: string): Promise<number> {
    try {
      const url = buildUrl(`daily-total/${date}`);
      console.log('💰 Fetching daily total from:', url);
      const response = await fetch(url);
      if (!response.ok) return 0;
      const data = await response.json();
      return data.total || 0;
    } catch (error) {
      console.error('❌ Daily total error:', error);
      return 0;
    }
  },

  async getStats(): Promise<any> {
    try {
      const url = buildUrl('stats/summary');
      console.log('📊 Fetching stats from:', url);
      const response = await fetch(url);
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      return await response.json();
    } catch (error) {
      console.error('❌ Stats error:', error);
      return null;
    }
  },

  async testConnection(): Promise<any> {
    try {
      const url = buildUrl('health');
      console.log('🧪 Testing health endpoint at:', url);
      const response = await fetch(url);
      if (response.ok) return await response.json();
      throw new Error(`Health check failed: ${response.status}`);
    } catch (error) {
      console.error('❌ Connection test error:', error);
      return null;
    }
  }
};

function transformRequisitionFromBackend(data: any): Requisition {
  return {
    id: data.id.toString(),
    date: data.date,
    requester: data.requester,
    section: data.section,
    required_for: data.required_for || '',
    priority: data.priority,
    status: data.status,
    requisitionNumber: data.requisition_number,
    notes: data.notes || '',
    items: (data.requisition_items || []).map((item: any) => ({
      description: item.description,
      costPerUnit: item.cost_per_unit,
      quantity: item.quantity,
      reason: item.reason || ''
    })),
    attachments: [],
    lineNumber: data.line_number || 0,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
}

// ============= Helper Functions =============
interface PriorityStyle {
  badge: string;
  icon: React.ReactNode;
  color: string;
}

const getPriorityStyle = (priority: Requisition['priority']): PriorityStyle => {
  switch (priority) {
    case 'Critical': return { 
      badge: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300',
      icon: <Flag className="h-3 w-3" />,
      color: 'text-red-600'
    };
    case 'High': return { 
      badge: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300',
      icon: <Flag className="h-3 w-3" />,
      color: 'text-orange-600'
    };
    case 'Medium': return { 
      badge: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300',
      icon: <Flag className="h-3 w-3" />,
      color: 'text-blue-600'
    };
    case 'Low': return { 
      badge: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300',
      icon: <Flag className="h-3 w-3" />,
      color: 'text-gray-600'
    };
    default: return { 
      badge: 'bg-gray-100 text-gray-800 border-gray-200',
      icon: <Flag className="h-3 w-3" />,
      color: 'text-gray-600'
    };
  }
};

const getStatusStyle = (status: Requisition['status']): string => {
  switch (status) {
    case 'Approved': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300';
    case 'Pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300';
    case 'Processing': return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300';
    case 'Completed': return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300';
    case 'Rejected': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300';
    case 'Draft': return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};




// ============= Component Props Types =============
interface RequisitionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  requisition: Requisition | null;
  onDelete: (id: string) => Promise<void>;
  onEdit: (requisition: Requisition) => void;
}

interface RequisitionCardProps {
  requisition: Requisition;
  onView: (requisition: Requisition) => void;
  onEdit: (requisition: Requisition) => void;
  onDelete: (id: string) => Promise<void>;
}

interface RequisitionTableRowProps {
  requisition: Requisition;
  index: number;
  onView: (requisition: Requisition) => void;
  onEdit: (requisition: Requisition) => void;
  onDelete: (id: string) => Promise<void>;
  expanded: boolean;
  onExpandChange: (id: string, expanded: boolean) => void;
}

interface EditRequisitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  requisition: Requisition | null;
  onSave: (data: Omit<Requisition, 'id' | 'lineNumber' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  isLoading: boolean;
}

interface StatisticsCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: string;
  description?: string;
  className?: string;
}

// ============= Statistics Card Component =============
const StatisticsCard: React.FC<StatisticsCardProps> = ({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  description, 
  className = '' 
}) => {
  const displayValue = value ?? '-';
  
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{displayValue}</div>
        {trend && (
          <p className="text-xs text-muted-foreground mt-1">
            {trend} {description && <span className="font-medium">{description}</span>}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

// ============= Requisition Details Modal Component =============
const RequisitionDetailsModal: React.FC<RequisitionDetailsModalProps> = ({ 
  isOpen, 
  onClose, 
  requisition, 
  onDelete, 
  onEdit 
}) => {
  if (!requisition) return null;

  const priorityStyle = getPriorityStyle(requisition.priority);
  const totalCost = requisition.items?.reduce((sum, item) => {
    return sum + (item.costPerUnit * item.quantity);
  }, 0) || 0;

  const sectionIcon = requisition.section === 'Electrical' ? <Zap className="h-4 w-4" /> : <Wrench className="h-4 w-4" />;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="sticky top-0 z-10 bg-background border-b px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-3">
                <Badge variant="outline" className="text-sm">
                  #{requisition.lineNumber}
                </Badge>
                <DialogTitle className="text-2xl font-bold break-words">
                  Requisition #{requisition.requisitionNumber}
                </DialogTitle>
                <Badge className={`${getStatusStyle(requisition.status)}`}>
                  {requisition.status}
                </Badge>
              </div>
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span className="font-medium">{requisition.requester || 'Not specified'}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(requisition.date)}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  {sectionIcon}
                  <span className="font-medium">{requisition.section}</span>
                </div>
                
                <div className="flex items-center gap-2 ml-auto">
                  <Badge className={`${priorityStyle.badge} shrink-0`}>
                    {priorityStyle.icon}
                    {requisition.priority}
                  </Badge>
                  <Badge variant="outline" className="shrink-0">
                    <DollarSign className="h-3 w-3 mr-1" />
                    {formatCurrency(totalCost)}
                  </Badge>
                </div>
              </div>
              
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span>Created: {formatDateTime(requisition.createdAt)}</span>
                <span>Updated: {formatDateTime(requisition.updatedAt)}</span>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="absolute right-4 top-4 lg:relative lg:right-0 lg:top-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <Tabs defaultValue="items" className="w-full h-full">
          <div className="sticky top-[4.5rem] z-10 bg-background border-b px-8">
            <TabsList className="grid w-full grid-cols-4 h-12">
              <TabsTrigger value="items" className="gap-2">
                <Package className="h-4 w-4" />
                Items
              </TabsTrigger>
              <TabsTrigger value="details" className="gap-2">
                <Info className="h-4 w-4" />
                Details
              </TabsTrigger>
              <TabsTrigger value="attachments" className="gap-2">
                <Paperclip className="h-4 w-4" />
                Attachments
              </TabsTrigger>
              <TabsTrigger value="actions" className="gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Actions
              </TabsTrigger>
            </TabsList>
          </div>
          
          <ScrollArea className="h-[calc(90vh-14rem)] px-8">
            <div className="py-6">
              <TabsContent value="items" className="space-y-6 m-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Requisition Items</CardTitle>
                    <CardDescription>{requisition.items?.length || 0} items in this requisition</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">#</TableHead>
                            <TableHead>Item Description</TableHead>
                            <TableHead className="text-right">Cost/Unit</TableHead>
                            <TableHead className="text-right">Quantity</TableHead>
                            <TableHead className="text-right">Total Cost</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {requisition.items?.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{index + 1}</TableCell>
                              <TableCell>
                                <div className="font-medium">{item.description}</div>
                                {item.reason && (
                                  <div className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap break-words">
                                    <span className="font-medium">Reason:</span> {item.reason}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(item.costPerUnit)}
                              </TableCell>
                              <TableCell className="text-right">
                                <Badge variant="outline">{item.quantity}</Badge>
                              </TableCell>
                              <TableCell className="text-right font-bold">
                                {formatCurrency(item.costPerUnit * item.quantity)}
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="bg-muted/50">
                            <TableCell colSpan={4} className="text-right font-bold text-lg">
                              Grand Total:
                            </TableCell>
                            <TableCell className="text-right font-bold text-xl text-primary">
                              {formatCurrency(totalCost)}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="details" className="space-y-6 m-0">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle>Requisition Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm text-muted-foreground">Line #</Label>
                          <div className="flex items-center gap-2">
                            <Hash className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{requisition.lineNumber}</span>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-sm text-muted-foreground">Requisition Number</Label>
                          <div className="flex items-center gap-2">
                            <Hash className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium break-all">{requisition.requisitionNumber}</span>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-sm text-muted-foreground">Status</Label>
                          <Badge className={getStatusStyle(requisition.status)}>
                            {requisition.status}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-sm text-muted-foreground">Priority</Label>
                          <Badge className={priorityStyle.badge}>
                            {priorityStyle.icon}
                            {requisition.priority}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-sm text-muted-foreground">Requester</Label>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{requisition.requester}</span>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-sm text-muted-foreground">Section</Label>
                          <div className="flex items-center gap-2">
                            {sectionIcon}
                            <span className="font-medium">{requisition.section}</span>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-sm text-muted-foreground">Date</Label>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{formatDate(requisition.date)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div>
                        <Label className="text-sm text-muted-foreground mb-2">Required For (Overall Reason)</Label>
                        <div className="border rounded-lg p-4 bg-muted/5 whitespace-pre-wrap break-words">
                          {requisition.required_for || 'No specific reason provided'}
                        </div>
                      </div>
                      
                      {requisition.notes && (
                        <>
                          <Separator />
                          <div>
                            <Label className="text-sm text-muted-foreground mb-2">Additional Notes</Label>
                            <div className="border rounded-lg p-4 bg-muted/5 whitespace-pre-wrap break-words">
                              {requisition.notes}
                            </div>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Financial Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Subtotal</span>
                          <span className="font-medium">{formatCurrency(totalCost)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Tax (Estimated 10%)</span>
                          <span className="font-medium">{formatCurrency(totalCost * 0.1)}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between">
                          <span className="text-lg font-bold">Total (Est.)</span>
                          <span className="text-lg font-bold text-primary">
                            {formatCurrency(totalCost * 1.1)}
                          </span>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">Item Summary</Label>
                        <div className="text-sm">
                          <span className="font-medium">{requisition.items?.length || 0}</span> items
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">{requisition.items?.reduce((sum, item) => sum + item.quantity, 0) || 0}</span> total units
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="attachments" className="space-y-6 m-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Requisition Attachments</CardTitle>
                    <CardDescription>
                      {requisition.attachments?.length || 0} attachments
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {requisition.attachments && requisition.attachments.length > 0 ? (
                      <div className="space-y-4">
                        {requisition.attachments.map((attachment, index) => (
                          <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-4">
                              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div>
                                <p className="font-medium">{attachment.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {attachment.size} • {formatDate(attachment.uploaded)}
                                </p>
                              </div>
                            </div>
                            <Button variant="outline" size="sm">
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Paperclip className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No attachments available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="actions" className="space-y-6 m-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Requisition Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          onEdit(requisition);
                          onClose();
                        }}
                        className="gap-3 h-auto py-4 justify-start"
                      >
                        <Edit className="h-5 w-5" />
                        <div className="text-left">
                          <div className="font-semibold">Edit Requisition</div>
                          <div className="text-sm text-muted-foreground">Modify this requisition</div>
                        </div>
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          navigator.clipboard.writeText(JSON.stringify(requisition, null, 2));
                          alert('Requisition details copied to clipboard!');
                        }}
                        className="gap-3 h-auto py-4 justify-start"
                      >
                        <Copy className="h-5 w-5" />
                        <div className="text-left">
                          <div className="font-semibold">Copy Details</div>
                          <div className="text-sm text-muted-foreground">Copy to clipboard</div>
                        </div>
                      </Button>
                      
                      <Button 
                        variant="destructive" 
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this requisition?')) {
                            onDelete(requisition.id);
                            onClose();
                          }
                        }}
                        className="gap-3 h-auto py-4 justify-start"
                      >
                        <Trash2 className="h-5 w-5" />
                        <div className="text-left">
                          <div className="font-semibold">Delete</div>
                          <div className="text-sm">Permanently remove</div>
                        </div>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </ScrollArea>
          
          <DialogFooter className="sticky bottom-0 bg-background border-t px-8 py-4">
            <div className="flex w-full justify-between items-center">
              <div className="text-sm text-muted-foreground">
                <span className="font-bold">{formatCurrency(totalCost)}</span> • {requisition.items?.length || 0} items • {requisition.items?.reduce((sum, item) => sum + item.quantity, 0) || 0} units
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
                <Button onClick={() => {
                  onEdit(requisition);
                  onClose();
                }}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Requisition
                </Button>
              </div>
            </div>
          </DialogFooter>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

// ============= Requisition Card Component (Grid View) =============
const RequisitionCard: React.FC<RequisitionCardProps> = ({ requisition, onView, onEdit, onDelete }) => {
  const priorityStyle = getPriorityStyle(requisition.priority);
  const statusStyle = getStatusStyle(requisition.status);
  const totalCost = requisition.items?.reduce((sum, item) => {
    return sum + (item.costPerUnit * item.quantity);
  }, 0) || 0;
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFullDetails, setShowFullDetails] = useState(false);

  const sectionIcon = requisition.section === 'Electrical' ? 
    <Zap className="h-3 w-3" /> : 
    <Wrench className="h-3 w-3" />;

  const visibleItems = isExpanded ? requisition.items : requisition.items?.slice(0, 2);
  const hasMoreItems = requisition.items?.length > 2;

  return (
    <Card className="hover:shadow-md transition-shadow relative">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1 pr-8">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                #{requisition.lineNumber}
              </Badge>
              <CardTitle className="text-lg line-clamp-1">
                #{requisition.requisitionNumber}
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                {requisition.items?.length || 0} items
              </Badge>
            </div>
            <CardDescription className="flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {requisition.requester}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(requisition.date)}
              </span>
              <span className="flex items-center gap-1">
                {sectionIcon}
                {requisition.section}
              </span>
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="mb-4">
          <p className="text-sm text-muted-foreground line-clamp-2">
            {requisition.required_for || 'No reason specified'}
          </p>
        </div>
        
        <div className="space-y-2">
          {visibleItems?.map((item, index) => (
            <div key={index} className="flex justify-between items-center py-2 border-b last:border-0">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.description}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{item.quantity} × {formatCurrency(item.costPerUnit)}</span>
                  {item.reason && (
                    <span className="truncate max-w-[150px]" title={item.reason}>
                      • {item.reason}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-sm font-bold">
                {formatCurrency(item.costPerUnit * item.quantity)}
              </div>
            </div>
          ))}
        </div>
        
        {hasMoreItems && (
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded} className="mt-2">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full gap-2 text-xs">
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-3 w-3" />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3" />
                    +{requisition.items.length - 2} more items
                  </>
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              {/* Additional items are shown when expanded */}
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
      
      <CardFooter className="pt-2 border-t flex flex-col">
        <div className="flex w-full items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Badge className={statusStyle}>
              {requisition.status}
            </Badge>
            <Badge className={priorityStyle.badge}>
              {priorityStyle.icon}
              {requisition.priority}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-bold">
              {formatCurrency(totalCost)}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onView(requisition)}
              className="h-8 w-8 p-0"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onView(requisition)}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(requisition)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Requisition
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-red-600"
                  onClick={() => {
                    if (window.confirm('Delete this requisition?')) onDelete(requisition.id);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Requisition
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Expandable full details button */}
        <Button
          variant="outline"
          size="sm"
          className="w-full mt-1 gap-2 text-xs"
          onClick={() => setShowFullDetails(!showFullDetails)}
        >
          {showFullDetails ? (
            <>
              <ChevronUp className="h-3 w-3" />
              Hide Details
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" />
              Show Details
            </>
          )}
        </Button>

        {showFullDetails && (
          <div className="mt-4 pt-4 border-t space-y-4">
            {/* Full description / required_for */}
            {requisition.required_for && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Required For</p>
                <p className="text-sm whitespace-pre-wrap break-words">{requisition.required_for}</p>
              </div>
            )}
            {/* All items (full list) */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">All Items ({requisition.items.length})</p>
              <div className="space-y-2">
                {requisition.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start py-1 text-sm border-b border-dashed last:border-0">
                    <div className="flex-1">
                      <span className="font-medium">{idx + 1}. {item.description}</span>
                      {item.reason && <p className="text-xs text-muted-foreground mt-0.5">{item.reason}</p>}
                    </div>
                    <div className="text-right">
                      <span className="font-medium">{item.quantity} × {formatCurrency(item.costPerUnit)}</span>
                      <p className="text-xs text-muted-foreground">= {formatCurrency(item.costPerUnit * item.quantity)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Notes */}
            {requisition.notes && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
                <p className="text-sm whitespace-pre-wrap break-words">{requisition.notes}</p>
              </div>
            )}
          </div>
        )}
      </CardFooter>
    </Card>
  );
};

// ============= Requisition Table Row Component (List View) =============
const RequisitionTableRow: React.FC<RequisitionTableRowProps> = ({ 
  requisition, 
  index, 
  onView, 
  onEdit, 
  onDelete,
  expanded,
  onExpandChange
}) => {
  const priorityStyle = getPriorityStyle(requisition.priority);
  const statusStyle = getStatusStyle(requisition.status);
  const totalCost = requisition.items?.reduce((sum, item) => 
    sum + (item.costPerUnit * item.quantity), 0) || 0;
  
  const sectionIcon = requisition.section === 'Electrical' ? 
    <Zap className="h-3 w-3" /> : 
    <Wrench className="h-3 w-3" />;

  const toggleExpand = () => {
    onExpandChange(requisition.id, !expanded);
  };

  return (
    <>
      <TableRow className="hover:bg-muted/50">
        <TableCell className="font-medium">{requisition.lineNumber}</TableCell>
        <TableCell>
          <div className="font-medium">{requisition.requisitionNumber}</div>
          <div className="text-xs text-muted-foreground">{formatDate(requisition.date)}</div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1">
            {sectionIcon}
            <span>{requisition.section}</span>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span>{requisition.requester}</span>
          </div>
        </TableCell>
        <TableCell>
          <Badge className={priorityStyle.badge}>
            {priorityStyle.icon}
            {requisition.priority}
          </Badge>
        </TableCell>
        <TableCell>
          <Badge className={statusStyle}>
            {requisition.status}
          </Badge>
        </TableCell>
        <TableCell className="text-right font-medium">
          {formatCurrency(totalCost)}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1">
            {/* Always show expand/collapse button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleExpand}
              className="h-8 w-8 p-0"
              title={expanded ? "Hide items" : "Show all items"}
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onView(requisition)}
              className="h-8 w-8 p-0"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(requisition)}
              className="h-8 w-8 p-0"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (window.confirm('Delete this requisition?')) onDelete(requisition.id);
              }}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow className="bg-muted/30">
          <TableCell colSpan={8} className="p-0">
            <div className="px-6 py-4">
              <div className="text-sm font-medium mb-2">All Items:</div>
              <div className="space-y-2">
                {requisition.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm border-b border-muted pb-2 last:border-0">
                    <div className="flex-1">
                      <span className="font-medium">{idx + 1}. {item.description}</span>
                      {item.reason && (
                        <span className="text-xs text-muted-foreground ml-2">
                          ({item.reason})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-muted-foreground">
                        {item.quantity} × {formatCurrency(item.costPerUnit)}
                      </span>
                      <span className="font-medium">
                        {formatCurrency(item.costPerUnit * item.quantity)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
};

// ============= Edit Requisition Modal Component =============
const EditRequisitionModal: React.FC<EditRequisitionModalProps> = ({ 
  isOpen, 
  onClose, 
  requisition, 
  onSave, 
  isLoading 
}) => {
  const [formData, setFormData] = useState<Omit<Requisition, 'id' | 'lineNumber' | 'createdAt' | 'updatedAt'>>({
    date: new Date().toISOString().split('T')[0],
    requester: "",
    section: "Electrical",
    required_for: "",
    priority: "Medium",
    status: "Draft",
    requisitionNumber: "",
    items: [
      {
        description: "",
        costPerUnit: 0,
        quantity: 1,
        reason: ""
      }
    ],
    notes: "",
    attachments: []
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (requisition) {
      setFormData({
        date: requisition.date ? requisition.date.split('T')[0] : new Date().toISOString().split('T')[0],
        requester: requisition.requester,
        section: requisition.section,
        required_for: requisition.required_for,
        priority: requisition.priority,
        status: requisition.status,
        requisitionNumber: requisition.requisitionNumber,
        items: requisition.items?.length ? requisition.items : [{
          description: "",
          costPerUnit: 0,
          quantity: 1,
          reason: ""
        }],
        notes: requisition.notes || "",
        attachments: requisition.attachments || []
      });
    } else {
      setFormData({
        date: new Date().toISOString().split('T')[0],
        requester: "",
        section: "Electrical",
        required_for: "",
        priority: "Medium",
        status: "Draft",
        requisitionNumber: "",
        items: [
          {
            description: "",
            costPerUnit: 0,
            quantity: 1,
            reason: ""
          }
        ],
        notes: "",
        attachments: []
      });
    }
    setErrors({});
  }, [requisition]);

  const validateForm = (): Record<string, string> => {
    const newErrors: Record<string, string> = {};
    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.requester?.trim()) newErrors.requester = 'Requester is required';
    if (!formData.requisitionNumber?.trim()) newErrors.requisitionNumber = 'Requisition Number is required';
    if (!formData.items || formData.items.length === 0) {
      newErrors.items = 'At least one item is required';
    } else {
      formData.items.forEach((item, index) => {
        if (!item.description?.trim()) {
          newErrors[`item_${index}_description`] = `Item ${index + 1} description is required`;
        }
        if (!item.costPerUnit || item.costPerUnit <= 0) {
          newErrors[`item_${index}_cost`] = `Item ${index + 1} cost must be greater than 0`;
        }
        if (!item.quantity || item.quantity <= 0) {
          newErrors[`item_${index}_quantity`] = `Item ${index + 1} quantity must be greater than 0`;
        }
      });
    }
    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    await onSave(formData);
  };

  const handleItemChange = (index: number, field: keyof RequisitionItem, value: string | number) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData(prev => ({ ...prev, items: newItems }));
    
    if (errors[`item_${index}_${field}`]) {
      setErrors(prev => ({ ...prev, [`item_${index}_${field}`]: '' }));
    }
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        description: "",
        costPerUnit: 0,
        quantity: 1,
        reason: ""
      }]
    }));
  };

  const removeItem = (index: number) => {
    if (formData.items.length > 1) {
      const newItems = formData.items.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, items: newItems }));
    }
  };

  const calculateItemTotal = (item: RequisitionItem): number => {
    return (item.costPerUnit || 0) * (item.quantity || 0);
  };

  const calculateTotalCost = (): number => {
    return formData.items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  };

  const getSectionIcon = (section: string) => {
    return section === 'Electrical' ? <Zap className="h-4 w-4" /> : <Wrench className="h-4 w-4" />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="sticky top-0 z-10 bg-background border-b px-8 py-6">
          <DialogTitle className="flex items-center gap-2 text-2xl">
            {requisition ? <Edit className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
            {requisition ? 'Edit Requisition' : 'Create New Requisition'}
          </DialogTitle>
          <DialogDescription className="text-base">
            {requisition 
              ? 'Update the requisition details below. All changes will be saved to the database.' 
              : 'Fill in the details below to create a new purchase requisition. Data is saved to the database.'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <ScrollArea className="h-[calc(90vh-180px)]">
            <div className="px-8 py-6 space-y-8">
              {/* Basic Information Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Info className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Basic Information</h3>
                    <p className="text-sm text-muted-foreground">General details about this requisition</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Requisition Number Field - EDITABLE */}
                  <div className="space-y-2">
                    <Label htmlFor="requisitionNumber" className="text-sm font-medium flex items-center gap-1">
                      <Hash className="h-4 w-4 text-muted-foreground" />
                      Requisition Number <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="requisitionNumber"
                      value={formData.requisitionNumber}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, requisitionNumber: e.target.value }));
                        if (errors.requisitionNumber) setErrors(prev => ({ ...prev, requisitionNumber: '' }));
                      }}
                      placeholder="Enter requisition number (e.g., REQ-2024-001)"
                      className={errors.requisitionNumber ? 'border-red-500' : ''}
                    />
                    {errors.requisitionNumber && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.requisitionNumber}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">Enter your own requisition number</p>
                  </div>
                  
                  {/* Date Field - Can pick any date */}
                  <div className="space-y-2">
                    <Label htmlFor="date" className="text-sm font-medium flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      Date <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, date: e.target.value }));
                        if (errors.date) setErrors(prev => ({ ...prev, date: '' }));
                      }}
                      className={errors.date ? 'border-red-500 focus-visible:ring-red-500' : ''}
                    />
                    {errors.date && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.date}
                      </p>
                    )}
                  </div>
                  
                  {/* Requester Field - Free text input */}
                  <div className="space-y-2">
                    <Label htmlFor="requester" className="text-sm font-medium flex items-center gap-1">
                      <User className="h-4 w-4 text-muted-foreground" />
                      Requester <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="requester"
                      value={formData.requester}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, requester: e.target.value }));
                        if (errors.requester) setErrors(prev => ({ ...prev, requester: '' }));
                      }}
                      placeholder="Enter requester name"
                      className={errors.requester ? 'border-red-500' : ''}
                    />
                    {errors.requester && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.requester}
                      </p>
                    )}
                  </div>
                  
                  {/* Section Field - Electrical/Mechanical only */}
                  <div className="space-y-2">
                    <Label htmlFor="section" className="text-sm font-medium flex items-center gap-1">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      Section <span className="text-red-500">*</span>
                    </Label>
                    <Select 
                      value={formData.section} 
                      onValueChange={(val: Requisition['section']) => setFormData(prev => ({ ...prev, section: val }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select section" />
                      </SelectTrigger>
                      <SelectContent>
                        {SECTIONS.map(section => (
                          <SelectItem key={section} value={section}>
                            <div className="flex items-center gap-2">
                              {getSectionIcon(section)}
                              {section}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Priority Field */}
                  <div className="space-y-2">
                    <Label htmlFor="priority" className="text-sm font-medium flex items-center gap-1">
                      <Flag className="h-4 w-4 text-muted-foreground" />
                      Priority
                    </Label>
                    <Select 
                      value={formData.priority} 
                      onValueChange={(val: Requisition['priority']) => setFormData(prev => ({ ...prev, priority: val }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map(p => (
                          <SelectItem key={p} value={p}>
                            <div className="flex items-center gap-2">
                              {getPriorityStyle(p).icon}
                              {p}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Status Field */}
                  <div className="space-y-2">
                    <Label htmlFor="status" className="text-sm font-medium flex items-center gap-1">
                      <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                      Status
                    </Label>
                    <Select 
                      value={formData.status} 
                      onValueChange={(val: Requisition['status']) => setFormData(prev => ({ ...prev, status: val }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map(s => (
                          <SelectItem key={s} value={s}>
                            <Badge className={getStatusStyle(s)}>
                              {s}
                            </Badge>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              {/* Items Section */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Requisition Items</h3>
                      <p className="text-sm text-muted-foreground">Add items to this requisition</p>
                    </div>
                  </div>
                  <Button 
                    type="button" 
                    onClick={addItem} 
                    variant="outline"
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Item
                  </Button>
                </div>
                
                {errors.items && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{errors.items}</AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-6">
                  {formData.items.map((item, index) => (
                    <Card key={index} className="relative border-l-4 border-l-primary/50">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-primary/5">
                              Item {index + 1}
                            </Badge>
                            {item.description && (
                              <span className="text-sm text-muted-foreground line-clamp-1">
                                {item.description}
                              </span>
                            )}
                          </div>
                          {formData.items.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(index)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Item Description */}
                          <div className="space-y-2 md:col-span-2">
                            <Label htmlFor={`item-${index}-description`} className="flex items-center gap-1">
                              <FileText className="h-3 w-3 text-muted-foreground" />
                              Item Description <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id={`item-${index}-description`}
                              value={item.description}
                              onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                              placeholder="e.g., Circuit Breakers, Conveyor Rollers, Electrical Wire"
                              className={errors[`item_${index}_description`] ? 'border-red-500' : ''}
                            />
                            {errors[`item_${index}_description`] && (
                              <p className="text-xs text-red-500">{errors[`item_${index}_description`]}</p>
                            )}
                          </div>
                          
                          {/* Cost Per Unit */}
                          <div className="space-y-2">
                            <Label htmlFor={`item-${index}-cost`} className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3 text-muted-foreground" />
                              Cost per Unit <span className="text-red-500">*</span>
                            </Label>
                            <div className="relative">
                              <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                              <Input
                                id={`item-${index}-cost`}
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.costPerUnit || ''}
                                onChange={(e) => handleItemChange(index, 'costPerUnit', parseFloat(e.target.value) || 0)}
                                placeholder="0.00"
                                className={`pl-9 ${errors[`item_${index}_cost`] ? 'border-red-500' : ''}`}
                              />
                            </div>
                            {errors[`item_${index}_cost`] && (
                              <p className="text-xs text-red-500">{errors[`item_${index}_cost`]}</p>
                            )}
                          </div>
                          
                          {/* Quantity */}
                          <div className="space-y-2">
                            <Label htmlFor={`item-${index}-quantity`} className="flex items-center gap-1">
                              <Package2 className="h-3 w-3 text-muted-foreground" />
                              Quantity <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id={`item-${index}-quantity`}
                              type="number"
                              min="1"
                              value={item.quantity || ''}
                              onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                              placeholder="1"
                              className={errors[`item_${index}_quantity`] ? 'border-red-500' : ''}
                            />
                            {errors[`item_${index}_quantity`] && (
                              <p className="text-xs text-red-500">{errors[`item_${index}_quantity`]}</p>
                            )}
                          </div>
                          
                          {/* Reason (Required For) */}
                          <div className="space-y-2 md:col-span-2">
                            <Label htmlFor={`item-${index}-reason`} className="flex items-center gap-1">
                              <HelpCircle className="h-3 w-3 text-muted-foreground" />
                              Required For (Reason)
                            </Label>
                            <Input
                              id={`item-${index}-reason`}
                              value={item.reason}
                              onChange={(e) => handleItemChange(index, 'reason', e.target.value)}
                              placeholder="Why is this item needed? e.g., Replace failing equipment, New installation"
                            />
                          </div>
                        </div>
                        
                        {/* Item Total */}
                        <div className="flex justify-between items-center p-4 bg-muted/30 rounded-lg border">
                          <div className="flex items-center gap-2">
                            <Calculator className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Item Total:</span>
                          </div>
                          <div className="text-lg font-bold text-primary">
                            {formatCurrency(calculateItemTotal(item))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                {/* Grand Total */}
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Total Items</p>
                        <p className="text-2xl font-bold">{formData.items.length}</p>
                        <p className="text-xs text-muted-foreground">
                          {formData.items.reduce((sum, item) => sum + item.quantity, 0)} total units
                        </p>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Grand Total</p>
                        <p className="text-3xl font-bold text-primary">
                          {formatCurrency(calculateTotalCost())}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <Separator />
              
              {/* Additional Information Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Additional Information</h3>
                    <p className="text-sm text-muted-foreground">Reason, notes, and attachments</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-6">
                  {/* Overall Reason */}
                  <div className="space-y-2">
                    <Label htmlFor="required_for" className="text-sm font-medium flex items-center gap-1">
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      Required For (Overall Reason)
                    </Label>
                    <Textarea
                      id="required_for"
                      value={formData.required_for}
                      onChange={(e) => setFormData(prev => ({ ...prev, required_for: e.target.value }))}
                      placeholder="Provide an overall explanation for this requisition..."
                      rows={3}
                      className="resize-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      Brief description of why this requisition is needed
                    </p>
                  </div>
                  
                  {/* Additional Notes */}
                  <div className="space-y-2">
                    <Label htmlFor="notes" className="text-sm font-medium flex items-center gap-1">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      Additional Notes
                    </Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Any additional notes, special instructions, or comments..."
                      rows={2}
                      className="resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
          
          <DialogFooter className="sticky bottom-0 bg-background border-t px-8 py-4 gap-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={isLoading}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
              className="min-w-[140px] gap-2"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                  {requisition ? 'Saving...' : 'Creating...'}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {requisition ? 'Save Changes' : 'Create Requisition'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ============= Main Component =============
export default function RequisitionsManagement() {
  const [data, setData] = useState<Requisition[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState<boolean>(false);
  const [selectedRequisition, setSelectedRequisition] = useState<Requisition | null>(null);
  const [editingRequisition, setEditingRequisition] = useState<Requisition | null>(null);
  const [search, setSearch] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>('list'); // Default to list view
  const [filters, setFilters] = useState<Filters>({
    status: 'all',
    priority: 'all',
    section: 'all',
    dateRange: { from: null, to: null },
    requester: 'all'
  });
  const [dailyTotal, setDailyTotal] = useState<number>(0);
  const [selectedDateForTotal, setSelectedDateForTotal] = useState<string>('');
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [stats, setStats] = useState<any>({
    totalRequisitions: 0,
    totalCost: 0,
    pendingCount: 0,
    approvedCount: 0,
    draftCount: 0,
    electricalCount: 0,
    mechanicalCount: 0
  });
  // State for expanded rows in list view
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  // Test connection on mount
  useEffect(() => {
    requisitionsApi.testConnection().then(result => {
      if (result) console.log('✅ API connection successful:', result);
      else console.warn('⚠️ API connection failed');
    });
  }, []);

  useEffect(() => {
    setIsMounted(true);
    setSelectedDateForTotal(new Date().toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (isMounted) {
      fetchRequisitions();
      fetchStats();
    }
  }, [isMounted]);

  useEffect(() => {
    if (!isMounted) return;
    const timer = setTimeout(() => fetchRequisitions(), 300);
    return () => clearTimeout(timer);
  }, [filters, search, isMounted]);

  useEffect(() => {
    if (!isMounted || !selectedDateForTotal) return;
    fetchDailyTotal();
  }, [selectedDateForTotal, isMounted]);

  const fetchRequisitions = async () => {
    setIsLoading(true);
    try {
      const requisitions = await requisitionsApi.getAllRequisitions({ ...filters, search: search || undefined });
      setData(requisitions);
    } catch (error) {
      console.error(error);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const statsData = await requisitionsApi.getStats();
      if (statsData) {
        setStats({
          totalRequisitions: statsData.total_requisitions || 0,
          totalCost: statsData.total_cost || 0,
          pendingCount: statsData.status_breakdown?.Pending || 0,
          approvedCount: statsData.status_breakdown?.Approved || 0,
          draftCount: statsData.status_breakdown?.Draft || 0,
          electricalCount: statsData.section_breakdown?.Electrical || 0,
          mechanicalCount: statsData.section_breakdown?.Mechanical || 0
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchDailyTotal = async () => {
    try {
      const total = await requisitionsApi.getDailyTotal(selectedDateForTotal);
      setDailyTotal(total);
    } catch (error) {
      console.error('Error fetching daily total:', error);
      setDailyTotal(0);
    }
  };

  const handleSaveRequisition = async (formData: Omit<Requisition, 'id' | 'lineNumber' | 'createdAt' | 'updatedAt'>) => {
    setIsLoading(true);
    try {
      if (editingRequisition) {
        // Only send changed fields
        const changedData: Partial<typeof formData> = {};
        
        if (formData.date !== editingRequisition.date) changedData.date = formData.date;
        if (formData.requester !== editingRequisition.requester) changedData.requester = formData.requester;
        if (formData.section !== editingRequisition.section) changedData.section = formData.section;
        if (formData.required_for !== editingRequisition.required_for) changedData.required_for = formData.required_for;
        if (formData.priority !== editingRequisition.priority) changedData.priority = formData.priority;
        if (formData.status !== editingRequisition.status) changedData.status = formData.status;
        if (formData.requisitionNumber !== editingRequisition.requisitionNumber) changedData.requisitionNumber = formData.requisitionNumber;
        if (formData.notes !== editingRequisition.notes) changedData.notes = formData.notes;
        
        // Compare items (simple JSON stringify for demo – for production use a deep equality check)
        if (JSON.stringify(formData.items) !== JSON.stringify(editingRequisition.items)) {
          changedData.items = formData.items;
        }
        
        await requisitionsApi.updateRequisition(editingRequisition.id, changedData);
      } else {
        await requisitionsApi.createRequisition(formData);
      }
      await fetchRequisitions();
      await fetchStats();
      await fetchDailyTotal();
      setIsModalOpen(false);
      setEditingRequisition(null);
      alert(`Requisition ${editingRequisition ? 'updated' : 'created'} successfully!`);
    } catch (error) {
      console.error('Save error:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRequisition = async (id: string) => {
    try {
      await requisitionsApi.deleteRequisition(id);
      await fetchRequisitions();
      await fetchStats();
      await fetchDailyTotal();
      if (selectedRequisition?.id === id) {
        setIsDetailsModalOpen(false);
        setSelectedRequisition(null);
      }
      alert('Requisition deleted successfully!');
    } catch (error) {
      console.error('Delete error:', error);
      alert(`Error deleting requisition: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleViewDetails = (requisition: Requisition) => {
    setSelectedRequisition(requisition);
    setIsDetailsModalOpen(true);
  };

  const handleEditRequisition = (requisition: Requisition) => {
    setEditingRequisition(requisition);
    setIsModalOpen(true);
  };

  const handleDateChangeForTotal = (date: string) => setSelectedDateForTotal(date);
  const clearDateRange = () => setFilters(prev => ({ ...prev, dateRange: { from: null, to: null } }));

  const handleExportToCSV = () => {
    const headers = ['Line #', 'Requisition #', 'Date', 'Requester', 'Section', 'Priority', 'Status', 'Total'];
    const rows = data.map(req => [
      req.lineNumber,
      req.requisitionNumber,
      req.date,
      req.requester,
      req.section,
      req.priority,
      req.status,
      formatCurrency(req.items.reduce((sum, item) => sum + (item.costPerUnit * item.quantity), 0))
    ]);
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `requisitions-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const uniqueRequesters = [...new Set(data.map(req => req.requester))];

  // Handlers for expand/collapse all in list view
  const handleExpandAll = () => {
    const allExpanded: Record<string, boolean> = {};
    data.forEach(req => {
      allExpanded[req.id] = true;
    });
    setExpandedRows(allExpanded);
  };

  const handleCollapseAll = () => {
    setExpandedRows({});
  };

  const handleRowExpandChange = (id: string, expanded: boolean) => {
    setExpandedRows(prev => ({
      ...prev,
      [id]: expanded
    }));
  };

  if (!isMounted) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <ShoppingCart className="h-8 w-8 text-primary" />
              Requisitions Management
            </h1>
            <p className="text-muted-foreground mt-1 flex items-center gap-2">
              <Database className="h-4 w-4" />
              Loading...
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button disabled className="gap-2">
              <Database className="h-4 w-4" />
              Connecting...
            </Button>
            <Button disabled className="gap-2">
              <Plus className="h-4 w-4" />
              New Requisition
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Loading...</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">-</div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filters & Search
                </CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <PageShell>
      <main className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <nav className="flex items-center gap-1.5 text-xs text-[#6B7B8E] mb-2">
            <span>Home</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-[#2A4D69] font-medium">Requisitions</span>
          </nav>
          <h1 className="text-3xl font-bold text-[#2A4D69] font-heading tracking-tight">Requisitions Management</h1>
          <p className="text-[#6B7B8E] mt-1">Manage purchase requisitions, approvals, and procurement workflows.</p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <Button variant="outline" className="gap-2" onClick={fetchRequisitions} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => { setEditingRequisition(null); setIsModalOpen(true); }} className="gap-2 bg-[#2A4D69] hover:bg-[#1e3a52] text-white shadow-md">
            <Plus className="h-4 w-4" />
            New Requisition
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <StatisticsCard title="Total Value" value={formatCurrency(stats.totalCost)} icon={DollarSign} trend={`${stats.totalRequisitions} requisitions`} />
        <StatisticsCard title="Pending" value={stats.pendingCount} icon={Clock} trend="Awaiting approval" className="border-yellow-200 dark:border-yellow-800" />
        <StatisticsCard title="Approved" value={stats.approvedCount} icon={CheckCircle} trend="Ready for processing" className="border-green-200 dark:border-green-800" />
        <StatisticsCard title="Draft" value={stats.draftCount} icon={FileText} trend="In preparation" className="border-gray-200 dark:border-gray-800" />
        <StatisticsCard title="Electrical" value={stats.electricalCount} icon={Zap} trend="Section total" className="border-blue-200 dark:border-blue-800" />
        <StatisticsCard title="Mechanical" value={stats.mechanicalCount} icon={Wrench} trend="Section total" className="border-purple-200 dark:border-purple-800" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5" /> Filters & Search</CardTitle>
              <CardDescription>Filter requisitions by various criteria</CardDescription>
            </div>
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="w-auto">
              <TabsList>
                <TabsTrigger value="list" className="gap-2"><TableIcon className="h-4 w-4" /> List View</TabsTrigger>
                <TabsTrigger value="grid" className="gap-2"><LayoutGrid className="h-4 w-4" /> Grid</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search requisitions by number, requester, or item..."
                className="pl-10"
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              />
              {search && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-2 h-6 w-6 p-0"
                  onClick={() => setSearch('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Status</Label>
                <Select
                  value={filters.status}
                  onValueChange={(value: string) => setFilters(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger><SelectValue placeholder="All statuses" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {STATUSES.map(s => <SelectItem key={s} value={s}><Badge className={getStatusStyle(s)}>{s}</Badge></SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs">Priority</Label>
                <Select
                  value={filters.priority}
                  onValueChange={(value: string) => setFilters(prev => ({ ...prev, priority: value }))}
                >
                  <SelectTrigger><SelectValue placeholder="All priorities" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    {PRIORITIES.map(p => <SelectItem key={p} value={p}><div className="flex items-center gap-2">{getPriorityStyle(p).icon}{p}</div></SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs">Section</Label>
                <Select
                  value={filters.section}
                  onValueChange={(value: string) => setFilters(prev => ({ ...prev, section: value }))}
                >
                  <SelectTrigger><SelectValue placeholder="All sections" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sections</SelectItem>
                    {SECTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs">Date Range</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarRange className="mr-2 h-4 w-4" />
                      {filters.dateRange.from ? (filters.dateRange.to ? `${formatDate(filters.dateRange.from.toISOString())} - ${formatDate(filters.dateRange.to.toISOString())}` : formatDate(filters.dateRange.from.toISOString())) : "Select date range"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="range"
                      selected={{ from: filters.dateRange.from || undefined, to: filters.dateRange.to || undefined }}
                      onSelect={(range) => setFilters(prev => ({ ...prev, dateRange: { from: range?.from || null, to: range?.to || null } }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs">Requester</Label>
                <Select
                  value={filters.requester}
                  onValueChange={(value: string) => setFilters(prev => ({ ...prev, requester: value }))}
                >
                  <SelectTrigger><SelectValue placeholder="All requesters" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Requesters</SelectItem>
                    {uniqueRequesters.filter(Boolean).map(req => <SelectItem key={req} value={req}>{req}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilters({
                    status: 'all',
                    priority: 'all',
                    section: 'all',
                    dateRange: { from: null, to: null },
                    requester: 'all'
                  });
                  setSearch('');
                }}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Clear Filters
              </Button>
              
              {filters.dateRange.from && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearDateRange}
                  className="gap-2"
                >
                  <CalendarRange className="h-4 w-4" />
                  Clear Date Range
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Total Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5" /> Daily Requisition Total</CardTitle>
            <CardDescription>View total cost for any selected date</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="space-y-2 flex-1">
              <Label htmlFor="daily-date" className="text-sm font-medium">Select Date</Label>
              <Input id="daily-date" type="date" value={selectedDateForTotal} onChange={(e) => handleDateChangeForTotal(e.target.value)} className="max-w-xs" />
            </div>
            <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
              <div className="p-2 bg-primary/10 rounded-full"><DollarSign className="h-6 w-6 text-primary" /></div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total for {selectedDateForTotal ? formatDate(selectedDateForTotal) : 'selected date'}</p>
                <p className="text-3xl font-bold text-primary">{formatCurrency(dailyTotal)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <CardTitle>Requisitions ({data.length})</CardTitle>
              <CardDescription>
                {isLoading ? 'Loading...' : `Showing ${data.length} requisition${data.length !== 1 ? 's' : ''}`}
              </CardDescription>
            </div>
            
            <div className="text-sm text-muted-foreground">
              Total Value: {formatCurrency(stats.totalCost)}
            </div>
          </div>
          {/* Expand/Collapse All buttons for list view */}
          {viewMode === 'list' && data.length > 0 && (
            <div className="flex gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={handleExpandAll} className="gap-2">
                <Maximize2 className="h-4 w-4" />
                Expand All
              </Button>
              <Button variant="outline" size="sm" onClick={handleCollapseAll} className="gap-2">
                <Minimize2 className="h-4 w-4" />
                Collapse All
              </Button>
            </div>
          )}
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4" />
              <p className="text-muted-foreground">Loading requisitions...</p>
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No requisitions found</h3>
              <p className="text-muted-foreground text-center mb-4">
                {search || Object.values(filters).some(f => {
                  if (typeof f === 'object' && f !== null) {
                    return f.from !== null || f.to !== null;
                  }
                  return f !== 'all';
                }) 
                  ? 'Try adjusting your search or filters'
                  : 'Get started by creating your first requisition'}
              </p>
              <Button onClick={() => { setEditingRequisition(null); setIsModalOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Requisition
              </Button>
            </div>
          ) : (
            <>
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {data.map(requisition => (
                    <RequisitionCard
                      key={requisition.id}
                      requisition={requisition}
                      onView={handleViewDetails}
                      onEdit={handleEditRequisition}
                      onDelete={handleDeleteRequisition}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">#</TableHead>
                        <TableHead>Requisition #</TableHead>
                        <TableHead>Section</TableHead>
                        <TableHead>Requester</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="w-32">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.map((requisition) => (
                        <RequisitionTableRow
                          key={requisition.id}
                          requisition={requisition}
                          index={requisition.lineNumber}
                          onView={handleViewDetails}
                          onEdit={handleEditRequisition}
                          onDelete={handleDeleteRequisition}
                          expanded={expandedRows[requisition.id] || false}
                          onExpandChange={handleRowExpandChange}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          )}
        </CardContent>
        
        {data.length > 0 && !isLoading && (
          <CardFooter className="flex justify-between border-t pt-6">
            <div className="text-sm text-muted-foreground">
              Showing {data.length} requisition{data.length !== 1 ? 's' : ''} • 
              Total Items: {data.reduce((sum, req) => sum + req.items.length, 0)} • 
              Total Units: {data.reduce((sum, req) => sum + req.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0)}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={handleExportToCSV}>
                <Download className="h-4 w-4" />
                Export to CSV
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>

      <EditRequisitionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingRequisition(null);
        }}
        requisition={editingRequisition}
        onSave={handleSaveRequisition}
        isLoading={isLoading}
      />
      
      <RequisitionDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedRequisition(null);
        }}
        requisition={selectedRequisition}
        onDelete={handleDeleteRequisition}
        onEdit={(requisition) => {
          setIsDetailsModalOpen(false);
          handleEditRequisition(requisition);
        }}
      />
      </main>
    </PageShell>
  );
}