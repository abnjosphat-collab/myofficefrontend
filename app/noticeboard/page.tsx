// app/noticeboard/page.tsx
"use client";

import React, { useState, useEffect } from 'react';

// ==================== TYPES ====================

interface Notice {
  id: string;
  title: string;
  content: string;
  date: string;
  category: string;
  priority: string;
  status: string;
  is_pinned: boolean;
  requires_acknowledgment: boolean;
  author?: string | null;
  department?: string | null;
  expires_at?: string | null;
  target_audience?: string | null;
  notification_type?: string | null;
  attachment_name?: string | null;
  attachment_url?: string | null;
  attachment_size?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface NoticeFormData {
  title: string;
  content: string;
  date: string;
  category: string;
  priority: string;
  status: string;
  is_pinned: boolean;
  requires_acknowledgment: boolean;
  author: string;
  department: string;
  expires_at: string;
  target_audience: string;
  notification_type: string;
  attachment_name: string;
  attachment_url: string;
  attachment_size: string;
}

interface NoticeFilters {
  category: string;
  priority: string;
  status: string;
  department: string;
  is_pinned: boolean | null;
}

interface ApiFilters {
  category?: string;
  priority?: string;
  status?: string;
  department?: string;
  is_pinned?: boolean | string | undefined;
  search?: string;
}

interface CalculatedStats {
  total_notices: number;
  status_breakdown: Record<string, number>;
  priority_breakdown: Record<string, number>;
  category_breakdown: Record<string, number>;
  pinned_count: number;
  expired_count: number;
  expiring_soon_count: number;
}

interface FormErrors {
  title?: string;
  content?: string;
  date?: string;
  category?: string;
}

// ==================== END TYPES ====================

import {
  Bell, Plus, Search, Trash2, Edit,
  FileText, AlertTriangle, Loader, Filter,
  Calendar, Tag, RefreshCw, MoreVertical,
  Paperclip, Download, AlertCircle, CheckCircle,
  Eye, ChevronDown, ChevronUp, X, User, Building,
  Archive, ChevronRight, ChevronLeft, Settings,
  Save, Upload, Link, Clock, Share2, Copy,
  ArrowUpRight, Info, File, Users, Zap, Megaphone,
  Printer, EyeOff, Pin, PinOff, Clock4, BarChart,
  ExternalLink, Mail, Smartphone, Globe, FileUp,
  ThumbsUp, ThumbsDown, MessageCircle, Activity,
  Grid, List, DownloadCloud, FileText as FileTextIcon,
  Image, Film, Music, Archive as ArchiveIcon
} from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { fmtDate as formatDate, fmtDateTime as formatDateTime } from '@/components/shared';

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
  DialogTrigger,
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

const API_BASE_URL = 'http://localhost:8000/api/notices';

// API Service - Updated to match SQL schema
const noticeboardApi = {
  async getAllNotices(filters: ApiFilters = {}) {
    try {
      const params = new URLSearchParams();

      if (filters.category && filters.category !== 'all') {
        params.append('category', filters.category);
      }
      if (filters.priority && filters.priority !== 'all') {
        params.append('priority', filters.priority);
      }
      if (filters.status && filters.status !== 'all') {
        params.append('status', filters.status);
      }
      if (filters.department && filters.department !== 'all') {
        params.append('department', filters.department);
      }
      if (filters.is_pinned !== undefined && filters.is_pinned !== null) {
        params.append('is_pinned', String(filters.is_pinned));
      }
      if (filters.search) {
        params.append('search', filters.search);
      }

      const url = `${API_BASE_URL}${params.toString() ? `?${params.toString()}` : ''}`;
      console.log('Fetching notices from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error fetching notices:', error);
      throw error;
    }
  },

  async createNotice(data: NoticeFormData) {
    try {
      const sqlFormattedData = {
        title: data.title,
        content: data.content,
        date: data.date || new Date().toISOString().split('T')[0],
        category: data.category,
        priority: data.priority,
        status: data.status,
        is_pinned: data.is_pinned || false,
        requires_acknowledgment: data.requires_acknowledgment || false,
        author: data.author || null,
        department: data.department || null,
        expires_at: data.expires_at || null,
        target_audience: data.target_audience || null,
        notification_type: data.notification_type || null,
        attachment_name: data.attachment_name || null,
        attachment_url: data.attachment_url || null,
        attachment_size: data.attachment_size || null
      };

      console.log('Sending to backend:', sqlFormattedData);

      const response = await fetch(`${API_BASE_URL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sqlFormattedData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Create error:', error);
      throw error;
    }
  },

  async updateNotice(id: string, data: NoticeFormData) {
    try {
      const sqlFormattedData = {
        title: data.title,
        content: data.content,
        date: data.date,
        category: data.category,
        priority: data.priority,
        status: data.status,
        is_pinned: data.is_pinned || false,
        requires_acknowledgment: data.requires_acknowledgment || false,
        author: data.author || null,
        department: data.department || null,
        expires_at: data.expires_at || null,
        target_audience: data.target_audience || null,
        notification_type: data.notification_type || null,
        attachment_name: data.attachment_name || null,
        attachment_url: data.attachment_url || null,
        attachment_size: data.attachment_size || null
      };

      const response = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sqlFormattedData)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Update error:', error);
      throw error;
    }
  },

  async deleteNotice(id: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return { success: true, message: 'Notice deleted successfully' };
    } catch (error) {
      console.error('Delete error:', error);
      throw error;
    }
  },

  async getStats() {
    try {
      const response = await fetch(`${API_BASE_URL}/stats/summary`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Stats error:', error instanceof Error ? error.message : String(error));
      return null;
    }
  },

  async togglePin(id: string, currentPinState: boolean) {
    try {
      const response = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_pinned: !currentPinState })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Toggle pin error:', error);
      throw error;
    }
  }
};

// Constants matching SQL database
const CATEGORIES = ["HR", "Safety", "IT", "General", "Operations", "Finance"];
const PRIORITIES = ["Critical", "High", "Medium", "Low"];
const STATUSES = ["Draft", "Active", "Archived"];
const DEPARTMENTS = ["HR", "IT", "Operations", "Finance", "Marketing", "Sales", "General"];
const TARGET_AUDIENCE = ["All Employees", "Management Only", "Department Specific", "Remote Workers", "New Hires"];
const NOTIFICATION_TYPES = ["General Announcement", "System Alert", "Training", "Policy Update", "Event", "Reminder"];

// Helper functions
const getPriorityStyle = (priority: string) => {
  switch (priority) {
    case 'Critical': return {
      badge: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300',
      icon: <AlertTriangle className="h-3 w-3" />,
      color: 'text-red-600'
    };
    case 'High': return {
      badge: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300',
      icon: <AlertTriangle className="h-3 w-3" />,
      color: 'text-orange-600'
    };
    case 'Medium': return {
      badge: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300',
      icon: <AlertCircle className="h-3 w-3" />,
      color: 'text-blue-600'
    };
    case 'Low': return {
      badge: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300',
      icon: <AlertCircle className="h-3 w-3" />,
      color: 'text-gray-600'
    };
    default: return {
      badge: 'bg-gray-100 text-gray-800 border-gray-200',
      icon: <AlertCircle className="h-3 w-3" />,
      color: 'text-gray-600'
    };
  }
};

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'Active': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300';
    case 'Draft': return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300';
    case 'Archived': return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};


const formatShortDate = (dateString: string | null | undefined) => {
  if (!dateString || dateString === '') return 'N/A';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString;
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateString;
  }
};

const truncateText = (text: string | null | undefined, maxLength = 100) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

const calculateClientSideStats = (notices: Notice[]): CalculatedStats => {
  if (!notices || notices.length === 0) {
    return {
      total_notices: 0,
      status_breakdown: { Active: 0, Draft: 0, Archived: 0 },
      priority_breakdown: { Critical: 0, High: 0, Medium: 0, Low: 0 },
      category_breakdown: {},
      pinned_count: 0,
      expired_count: 0,
      expiring_soon_count: 0
    };
  }

  const statusBreakdown: Record<string, number> = {};
  const priorityBreakdown: Record<string, number> = {};
  const categoryBreakdown: Record<string, number> = {};

  let pinnedCount = 0;
  let expiredCount = 0;
  let expiringSoonCount = 0;
  const today = new Date();

  notices.forEach(notice => {
    const status = notice.status || 'Draft';
    statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;

    const priority = notice.priority || 'Medium';
    priorityBreakdown[priority] = (priorityBreakdown[priority] || 0) + 1;

    const category = notice.category || 'General';
    categoryBreakdown[category] = (categoryBreakdown[category] || 0) + 1;

    if (notice.is_pinned) pinnedCount++;

    if (notice.expires_at) {
      try {
        const expiryDate = new Date(notice.expires_at);
        if (!isNaN(expiryDate.getTime())) {
          if (expiryDate < today) {
            expiredCount++;
          } else {
            const daysUntilExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            if (daysUntilExpiry <= 7 && daysUntilExpiry >= 0) {
              expiringSoonCount++;
            }
          }
        }
      } catch (error) {
        console.warn('Invalid expiry date:', notice.expires_at);
      }
    }
  });

  return {
    total_notices: notices.length,
    status_breakdown: statusBreakdown,
    priority_breakdown: priorityBreakdown,
    category_breakdown: categoryBreakdown,
    pinned_count: pinnedCount,
    expired_count: expiredCount,
    expiring_soon_count: expiringSoonCount
  };
};

// ==================== NOTICE DETAILS MODAL ====================
interface NoticeDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notice: Notice | null;
  onDelete: (id: string) => void;
  onEdit: (notice: Notice) => void;
  onTogglePin: (id: string, newPinState: boolean) => void;
}

const NoticeDetailsModal = ({ isOpen, onClose, notice, onDelete, onEdit, onTogglePin }: NoticeDetailsModalProps) => {
  if (!notice) return null;

  const priorityStyle = getPriorityStyle(notice.priority);
  const isExpired = notice.expires_at && new Date(notice.expires_at) < new Date();
  const expiresSoon = notice.expires_at &&
    new Date(notice.expires_at) > new Date() &&
    new Date(notice.expires_at) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const getFileIcon = () => {
    if (!notice.attachment_name && !notice.attachment_url) return <FileTextIcon className="h-5 w-5" />;
    const name = notice.attachment_name || notice.attachment_url || '';
    const ext = name.split('.').pop()?.toLowerCase();
    if (ext && ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg'].includes(ext)) return <Image className="h-5 w-5" />;
    if (ext && ['mp4', 'webm', 'ogg', 'mov'].includes(ext)) return <Film className="h-5 w-5" />;
    if (ext && ['mp3', 'wav', 'ogg'].includes(ext)) return <Music className="h-5 w-5" />;
    if (ext && ['pdf'].includes(ext)) return <FileText className="h-5 w-5" />;
    if (ext && ['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return <ArchiveIcon className="h-5 w-5" />;
    return <FileTextIcon className="h-5 w-5" />;
  };

  const handleDownloadAttachment = async () => {
    if (!notice.attachment_url && !notice.attachment_name) {
      alert('No attachment available');
      return;
    }

    let url = notice.attachment_url;
    let filename = notice.attachment_name || 'download';

    if (url) {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');
        const blob = await response.blob();
        const contentDisposition = response.headers.get('Content-Disposition');
        if (contentDisposition) {
          const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
          if (match && match[1]) filename = match[1].replace(/['"]/g, '');
        }
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
      } catch (error) {
        console.error('Download error:', error);
        window.open(url, '_blank');
      }
    } else if (notice.attachment_name) {
      const assumedUrl = `${API_BASE_URL.replace('/api/notices', '')}/uploads/${encodeURIComponent(notice.attachment_name)}`;
      window.open(assumedUrl, '_blank');
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: notice.title,
        text: truncateText(notice.content, 200),
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(`${notice.title}\n\n${notice.content}`);
      alert('Notice copied to clipboard!');
    }
  };

  const handleTogglePin = async () => {
    try {
      await noticeboardApi.togglePin(notice.id, notice.is_pinned);
      onTogglePin(notice.id, !notice.is_pinned);
    } catch (error) {
      alert('Failed to toggle pin: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden p-0">
        {/* Header */}
        <DialogHeader className="sticky top-0 z-10 bg-background border-b px-8 py-6">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <DialogTitle className="text-2xl font-bold break-words">
                  {notice.title}
                </DialogTitle>
                {notice.is_pinned && (
                  <Badge variant="outline" className="bg-amber-50 border-amber-200 shrink-0">
                    <Pin className="h-3 w-3 mr-1" />
                    Pinned
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <span>{notice.author || 'Unknown'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(notice.date)}</span>
                </div>
                {notice.department && (
                  <div className="flex items-center gap-1">
                    <Building className="h-4 w-4" />
                    <span>{notice.department}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 ml-auto">
                  <Badge className={priorityStyle.badge}>
                    {priorityStyle.icon}
                    {notice.priority}
                  </Badge>
                  <Badge className={getStatusStyle(notice.status)}>
                    {notice.status}
                  </Badge>
                </div>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="ml-4 shrink-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Tabs */}
        <Tabs defaultValue="content" className="w-full h-full">
          <div className="sticky top-[6.5rem] z-10 bg-background border-b px-8">
            <TabsList className="grid w-full grid-cols-4 h-12">
              <TabsTrigger value="content" className="gap-2">
                <FileText className="h-4 w-4" />
                Content
              </TabsTrigger>
              <TabsTrigger value="details" className="gap-2">
                <Info className="h-4 w-4" />
                Details
              </TabsTrigger>
              <TabsTrigger value="attachment" className="gap-2">
                <Paperclip className="h-4 w-4" />
                Attachment
              </TabsTrigger>
              <TabsTrigger value="actions" className="gap-2">
                <Settings className="h-4 w-4" />
                Actions
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="h-[calc(95vh-14rem)] px-8">
            <div className="py-6">
              {/* Content Tab */}
              <TabsContent value="content" className="m-0">
                <Card className="border-0 shadow-none">
                  <CardHeader className="px-0 pt-0">
                    <CardTitle className="text-lg">Notice Content</CardTitle>
                  </CardHeader>
                  <CardContent className="px-0">
                    <div className="border rounded-lg bg-muted/5 p-6">
                      <div className="whitespace-pre-wrap leading-relaxed text-base max-w-none">
                        {notice.content}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Details Tab */}
              <TabsContent value="details" className="m-0">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column – Metadata */}
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Info className="h-5 w-5" />
                        Notice Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Category</p>
                          <Badge variant="outline" className="mt-1">
                            {notice.category}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Priority</p>
                          <Badge className={`mt-1 ${priorityStyle.badge}`}>
                            {priorityStyle.icon}
                            {notice.priority}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Status</p>
                          <Badge className={`mt-1 ${getStatusStyle(notice.status)}`}>
                            {notice.status}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Target Audience</p>
                          <p className="text-sm font-medium mt-1">{notice.target_audience || 'All Employees'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Notification Type</p>
                          <p className="text-sm font-medium mt-1">{notice.notification_type || 'General'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Acknowledgment</p>
                          <Badge
                            variant={notice.requires_acknowledgment ? "default" : "outline"}
                            className={`mt-1 ${notice.requires_acknowledgment ? 'bg-green-100 text-green-800 border-green-200' : ''}`}
                          >
                            {notice.requires_acknowledgment ? 'Required' : 'Not Required'}
                          </Badge>
                        </div>
                      </div>
                      <Separator />
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Author</p>
                          <p className="text-base font-medium">{notice.author || 'Not specified'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Department</p>
                          <p className="text-base font-medium">{notice.department || 'General'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Right Column – Timeline */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Timeline
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Published</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Calendar className="h-5 w-5 text-blue-500" />
                          <p className="font-medium">{formatDate(notice.date)}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Expires</p>
                        <div className="flex items-center gap-2 mt-1">
                          {isExpired ? (
                            <Clock4 className="h-5 w-5 text-red-500" />
                          ) : expiresSoon ? (
                            <Clock className="h-5 w-5 text-amber-500" />
                          ) : (
                            <Clock className="h-5 w-5 text-gray-400" />
                          )}
                          <p className={`font-medium ${isExpired ? 'text-red-600' : expiresSoon ? 'text-amber-600' : ''}`}>
                            {notice.expires_at ? formatDate(notice.expires_at) : 'Never'}
                            {isExpired && ' (Expired)'}
                            {expiresSoon && !isExpired && ' (Soon)'}
                          </p>
                        </div>
                      </div>
                      <Separator />
                      {notice.created_at && (
                        <div>
                          <p className="text-sm text-muted-foreground">Created</p>
                          <p className="text-sm font-medium">{formatDateTime(notice.created_at)}</p>
                        </div>
                      )}
                      {notice.updated_at && (
                        <div>
                          <p className="text-sm text-muted-foreground">Last Updated</p>
                          <p className="text-sm font-medium">{formatDateTime(notice.updated_at)}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Attachment Tab */}
              <TabsContent value="attachment" className="m-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Paperclip className="h-5 w-5" />
                      Attachment
                    </CardTitle>
                    <CardDescription>
                      {notice.attachment_name
                        ? 'Download or view the attached file'
                        : 'No attachment for this notice'}
                    </CardDescription>
                  </CardHeader>
                  {notice.attachment_name || notice.attachment_url ? (
                    <CardContent>
                      <div className="border rounded-lg p-6 bg-muted/10">
                        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                          <div className="flex items-start gap-4 flex-1 min-w-0">
                            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                              {getFileIcon()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-lg mb-1 break-words">
                                {notice.attachment_name || 'Unnamed file'}
                              </p>
                              {notice.attachment_size && (
                                <p className="text-sm text-muted-foreground mb-2">
                                  Size: {notice.attachment_size}
                                </p>
                              )}
                              {notice.attachment_url && (
                                <div className="flex items-center gap-2 text-sm text-blue-600 break-all">
                                  <Link className="h-4 w-4 shrink-0" />
                                  <a href={notice.attachment_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                    {notice.attachment_url}
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                          <Button onClick={handleDownloadAttachment} className="gap-2 shrink-0">
                            <Download className="h-4 w-4" />
                            Download
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  ) : (
                    <CardContent>
                      <div className="border-2 border-dashed rounded-lg p-12 text-center">
                        <Paperclip className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No attachment available</p>
                      </div>
                    </CardContent>
                  )}
                </Card>
              </TabsContent>

              {/* Actions Tab – REORGANIZED */}
              <TabsContent value="actions" className="m-0">
                <div className="space-y-6">
                  {/* General Actions */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">General Actions</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Card>
                        <CardContent className="p-4 flex items-start gap-3">
                          <Share2 className="h-5 w-5 text-muted-foreground shrink-0" />
                          <div className="flex-1">
                            <p className="font-medium">Share Notice</p>
                            <p className="text-sm text-muted-foreground">Share with others via link or copy</p>
                            <Button variant="outline" size="sm" onClick={handleShare} className="mt-2 w-full">
                              Share
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 flex items-start gap-3">
                          <Copy className="h-5 w-5 text-muted-foreground shrink-0" />
                          <div className="flex-1">
                            <p className="font-medium">Copy Content</p>
                            <p className="text-sm text-muted-foreground">Copy full notice to clipboard</p>
                            <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(`${notice.title}\n\n${notice.content}`); alert('Copied!'); }} className="mt-2 w-full">
                              Copy
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 flex items-start gap-3">
                          <Edit className="h-5 w-5 text-muted-foreground shrink-0" />
                          <div className="flex-1">
                            <p className="font-medium">Edit Notice</p>
                            <p className="text-sm text-muted-foreground">Modify details and content</p>
                            <Button variant="outline" size="sm" onClick={() => { onEdit(notice); onClose(); }} className="mt-2 w-full">
                              Edit
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 flex items-start gap-3">
                          {notice.is_pinned ? <PinOff className="h-5 w-5 text-muted-foreground shrink-0" /> : <Pin className="h-5 w-5 text-muted-foreground shrink-0" />}
                          <div className="flex-1">
                            <p className="font-medium">{notice.is_pinned ? 'Unpin Notice' : 'Pin Notice'}</p>
                            <p className="text-sm text-muted-foreground">{notice.is_pinned ? 'Remove from top' : 'Keep at top'}</p>
                            <Button variant="outline" size="sm" onClick={handleTogglePin} className="mt-2 w-full">
                              {notice.is_pinned ? 'Unpin' : 'Pin'}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  {/* Acknowledgments (if required) */}
                  {notice.requires_acknowledgment && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="text-lg font-semibold mb-3">Acknowledgments</h3>
                        <Card>
                          <CardContent className="p-4 flex items-start gap-3">
                            <ThumbsUp className="h-5 w-5 text-muted-foreground shrink-0" />
                            <div className="flex-1">
                              <p className="font-medium">View Acknowledgments</p>
                              <p className="text-sm text-muted-foreground">See who has read and acknowledged this notice</p>
                              <Button variant="outline" size="sm" className="mt-2 w-full">
                                View Report
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </>
                  )}

                  {/* Danger Zone */}
                  <div>
                    <Separator className="mb-3" />
                    <h3 className="text-lg font-semibold text-destructive mb-3">Danger Zone</h3>
                    <Card className="border-destructive/20">
                      <CardContent className="p-4 flex items-start gap-3">
                        <Trash2 className="h-5 w-5 text-destructive shrink-0" />
                        <div className="flex-1">
                          <p className="font-medium text-destructive">Delete Notice</p>
                          <p className="text-sm text-muted-foreground">Permanently remove this notice. This action cannot be undone.</p>
                          <Button variant="destructive" size="sm" onClick={() => { if (window.confirm('Delete this notice?')) { onDelete(notice.id); onClose(); } }} className="mt-2 w-full">
                            Delete
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Technical Information */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Technical Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Notice ID</span>
                          <code className="text-xs bg-muted px-2 py-1 rounded">{notice.id}</code>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(notice.id); alert('ID copied!'); }} className="w-full">
                          <Copy className="h-3 w-3 mr-2" /> Copy ID
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>

        {/* Footer */}
        <DialogFooter className="sticky bottom-0 bg-background border-t px-8 py-4">
          <div className="flex w-full justify-between items-center">
            <div className="text-sm text-muted-foreground">
              Last updated: {notice.updated_at ? formatDateTime(notice.updated_at) : 'Never'}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>Close</Button>
              <Button onClick={() => {
                onEdit(notice);
                onClose();
              }}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Notice
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ==================== END OF NOTICE DETAILS MODAL ====================

// Notice Card Component – with expand/collapse functionality
interface NoticeCardProps {
  notice: Notice;
  onView: (notice: Notice) => void;
  onEdit: (notice: Notice) => void;
  onDelete: (id: string) => void;
  viewMode?: string;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
}

const NoticeCard = ({ notice, onView, onEdit, onDelete, viewMode = 'grid', isExpanded, onToggleExpand }: NoticeCardProps) => {
  const priorityStyle = getPriorityStyle(notice.priority);
  const statusStyle = getStatusStyle(notice.status);
  const isExpired = notice.expires_at && new Date(notice.expires_at) < new Date();
  const expiresSoon = notice.expires_at &&
    new Date(notice.expires_at) > new Date() &&
    new Date(notice.expires_at) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  if (viewMode === 'table') {
    return (
      <>
        <TableRow className="hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors">
          <TableCell>
            <div className="flex items-center gap-3">
              {notice.is_pinned && <Pin className="h-4 w-4 text-amber-500" />}
              <div>
                <div className="font-medium">{notice.title}</div>
                <div className="text-sm text-muted-foreground">
                  {truncateText(notice.content, 60)}
                </div>
              </div>
            </div>
          </TableCell>
          <TableCell>
            <Badge variant="outline">{notice.category}</Badge>
          </TableCell>
          <TableCell>
            <Badge className={priorityStyle.badge}>
              {priorityStyle.icon}
              {notice.priority}
            </Badge>
          </TableCell>
          <TableCell>
            <Badge className={statusStyle}>{notice.status}</Badge>
          </TableCell>
          <TableCell>{notice.author || '-'}</TableCell>
          <TableCell>{formatShortDate(notice.date)}</TableCell>
          <TableCell>
            <div className="flex gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={() => onToggleExpand(notice.id)} className="h-8 w-8 p-0">
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isExpanded ? 'Collapse' : 'Expand to view details'}</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={() => onView(notice)} className="h-8 w-8 p-0">
                    <Eye className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Open details modal</p>
                </TooltipContent>
              </Tooltip>
              <Button variant="ghost" size="sm" onClick={() => onEdit(notice)} className="h-8 w-8 p-0">
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { if (window.confirm('Delete this notice?')) onDelete(notice.id); }} className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
        {isExpanded && (
          <TableRow className="bg-muted/30">
            <TableCell colSpan={7} className="p-4">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Full Content</h4>
                  <div className="text-sm whitespace-pre-wrap border rounded-lg p-3 bg-background">
                    {notice.content}
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Target Audience</p>
                    <p className="text-sm">{notice.target_audience || 'All Employees'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Notification Type</p>
                    <p className="text-sm">{notice.notification_type || 'General'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Acknowledgment</p>
                    <p className="text-sm">{notice.requires_acknowledgment ? 'Required' : 'Not Required'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Expires</p>
                    <p className="text-sm">{notice.expires_at ? formatDate(notice.expires_at) : 'Never'}</p>
                  </div>
                </div>
                {notice.attachment_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <Paperclip className="h-4 w-4 text-blue-500" />
                    <span>{notice.attachment_name}</span>
                    {notice.attachment_size && <span className="text-muted-foreground">({notice.attachment_size})</span>}
                  </div>
                )}
              </div>
            </TableCell>
          </TableRow>
        )}
      </>
    );
  }

  return (
    <Card className={`hover:shadow-md transition-shadow ${notice.is_pinned ? 'border-amber-200 border-2' : ''}`}>
      {notice.is_pinned && (
        <div className="absolute top-2 right-2">
          <Badge variant="outline" className="bg-amber-50 border-amber-200">
            <Pin className="h-3 w-3 mr-1" />
            Pinned
          </Badge>
        </div>
      )}

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1 pr-8">
            <CardTitle className="text-lg line-clamp-1">{notice.title}</CardTitle>
            <CardDescription className="flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {notice.author || 'Not specified'}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatShortDate(notice.date)}
              </span>
              {notice.department && (
                <span className="flex items-center gap-1">
                  <Building className="h-3 w-3" />
                  {notice.department}
                </span>
              )}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {notice.content}
        </p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              <Tag className="h-3 w-3 mr-1" />
              {notice.category}
            </Badge>
            {isExpired && (
              <Badge variant="destructive" className="text-xs">
                <Clock4 className="h-3 w-3 mr-1" />
                Expired
              </Badge>
            )}
            {expiresSoon && !isExpired && (
              <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                <Clock className="h-3 w-3 mr-1" />
                Expires Soon
              </Badge>
            )}
            {notice.attachment_name && (
              <Paperclip className="h-4 w-4 text-blue-500" />
            )}
          </div>

          <div className="text-xs text-muted-foreground">
            {notice.notification_type || 'General Announcement'}
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-2 border-t">
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge className={priorityStyle.badge}>
              {priorityStyle.icon}
              {notice.priority}
            </Badge>
            <Badge className={statusStyle}>
              {notice.status}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={() => onToggleExpand(notice.id)} className="h-8 w-8 p-0">
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isExpanded ? 'Collapse' : 'Expand to view details'}</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={() => onView(notice)} className="h-8 w-8 p-0">
                  <Eye className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Open details modal</p>
              </TooltipContent>
            </Tooltip>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onView(notice)}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Details Modal
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(notice)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Notice
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600"
                  onClick={() => { if (window.confirm('Delete this notice?')) onDelete(notice.id); }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Notice
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardFooter>

      {/* Expanded content section */}
      {isExpanded && (
        <div className="border-t p-4 bg-muted/30 space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-2">Full Content</h4>
            <div className="text-sm whitespace-pre-wrap border rounded-lg p-3 bg-background">
              {notice.content}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Target Audience</p>
              <p className="text-sm">{notice.target_audience || 'All Employees'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Notification Type</p>
              <p className="text-sm">{notice.notification_type || 'General'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Acknowledgment</p>
              <p className="text-sm">{notice.requires_acknowledgment ? 'Required' : 'Not Required'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Expires</p>
              <p className="text-sm">{notice.expires_at ? formatDate(notice.expires_at) : 'Never'}</p>
            </div>
          </div>
          {notice.attachment_name && (
            <div className="flex items-center gap-2 text-sm">
              <Paperclip className="h-4 w-4 text-blue-500" />
              <span>{notice.attachment_name}</span>
              {notice.attachment_size && <span className="text-muted-foreground">({notice.attachment_size})</span>}
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

// Statistics Card Component – unchanged
interface StatisticsCardProps {
  title: string;
  value: number;
  icon?: React.ElementType;
  trend?: string;
  description?: string;
  className?: string;
}

const StatisticsCard = ({ title, value, icon: Icon, trend, description, className = '' }: StatisticsCardProps) => (
  <Card className={className}>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value || 0}</div>
      {trend && (
        <p className="text-xs text-muted-foreground">
          {trend} {description && <span className="font-medium">{description}</span>}
        </p>
      )}
    </CardContent>
  </Card>
);

// Edit Notice Modal Component – unchanged
interface EditNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  notice: Notice | null;
  onSave: (data: NoticeFormData) => Promise<void>;
  isLoading: boolean;
}

const EditNoticeModal = ({ isOpen, onClose, notice, onSave, isLoading }: EditNoticeModalProps) => {
  const [formData, setFormData] = useState<NoticeFormData>({
    title: '',
    content: '',
    date: new Date().toISOString().split('T')[0],
    category: "General",
    priority: "Medium",
    status: "Draft",
    is_pinned: false,
    requires_acknowledgment: false,
    author: "",
    department: "General",
    expires_at: "",
    target_audience: "All Employees",
    notification_type: "General Announcement",
    attachment_name: "",
    attachment_url: "",
    attachment_size: ""
  });

  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (notice) {
      setFormData({
        title: notice.title || '',
        content: notice.content || '',
        date: notice.date ? notice.date.split('T')[0] : new Date().toISOString().split('T')[0],
        category: notice.category || "General",
        priority: notice.priority || "Medium",
        status: notice.status || "Draft",
        is_pinned: notice.is_pinned || false,
        author: notice.author || "",
        department: notice.department || "General",
        expires_at: notice.expires_at ? notice.expires_at.split('T')[0] : "",
        target_audience: notice.target_audience || "All Employees",
        notification_type: notice.notification_type || "General Announcement",
        requires_acknowledgment: notice.requires_acknowledgment || false,
        attachment_name: notice.attachment_name || "",
        attachment_url: notice.attachment_url || "",
        attachment_size: notice.attachment_size || ""
      });
    } else {
      setFormData({
        title: '',
        content: '',
        date: new Date().toISOString().split('T')[0],
        category: "General",
        priority: "Medium",
        status: "Draft",
        is_pinned: false,
        author: "",
        department: "General",
        expires_at: "",
        target_audience: "All Employees",
        notification_type: "General Announcement",
        requires_acknowledgment: false,
        attachment_name: "",
        attachment_url: "",
        attachment_size: ""
      });
    }
    setErrors({});
  }, [notice]);

  const validateForm = (): FormErrors => {
    const newErrors: FormErrors = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.content.trim()) newErrors.content = 'Content is required';
    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.category) newErrors.category = 'Category is required';
    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    await onSave(formData);
  };

  const handleAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        attachment_name: file.name,
        attachment_size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`
      }));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {notice ? <Edit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            {notice ? 'Edit Notice' : 'Create New Notice'}
          </DialogTitle>
          <DialogDescription>
            {notice ? 'Update the notice details below.' : 'Fill in the details to create a new notice.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 py-4">
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Required Information</h3>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="title" className="flex items-center gap-1">
                    Title <span className="text-red-500">*</span>
                    {errors.title && <span className="text-red-500 text-xs">({errors.title})</span>}
                  </Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    required
                    placeholder="Enter notice title"
                    className={errors.title ? 'border-red-500' : ''}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="content" className="flex items-center gap-1">
                    Content <span className="text-red-500">*</span>
                    {errors.content && <span className="text-red-500 text-xs">({errors.content})</span>}
                  </Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    required
                    placeholder="Enter notice content"
                    className={`min-h-[150px] ${errors.content ? 'border-red-500' : ''}`}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="date" className="flex items-center gap-1">
                      Publish Date <span className="text-red-500">*</span>
                      {errors.date && <span className="text-red-500 text-xs">({errors.date})</span>}
                    </Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                      required
                      className={errors.date ? 'border-red-500' : ''}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="category" className="flex items-center gap-1">
                      Category <span className="text-red-500">*</span>
                      {errors.category && <span className="text-red-500 text-xs">({errors.category})</span>}
                    </Label>
                    <Select
                      value={formData.category}
                      onValueChange={(val) => setFormData(prev => ({ ...prev, category: val }))}
                    >
                      <SelectTrigger className={errors.category ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Priority & Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(val) => setFormData(prev => ({ ...prev, priority: val }))}
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

                <div className="grid gap-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(val) => setFormData(prev => ({ ...prev, status: val }))}
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

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Additional Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="author">Author</Label>
                  <Input
                    id="author"
                    value={formData.author}
                    onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value }))}
                    placeholder="Enter author name"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="department">Department</Label>
                  <Select
                    value={formData.department}
                    onValueChange={(val) => setFormData(prev => ({ ...prev, department: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map(dept => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="target_audience">Target Audience</Label>
                  <Select
                    value={formData.target_audience}
                    onValueChange={(val) => setFormData(prev => ({ ...prev, target_audience: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select audience" />
                    </SelectTrigger>
                    <SelectContent>
                      {TARGET_AUDIENCE.map(audience => (
                        <SelectItem key={audience} value={audience}>{audience}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="notification_type">Notification Type</Label>
                  <Select
                    value={formData.notification_type}
                    onValueChange={(val) => setFormData(prev => ({ ...prev, notification_type: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {NOTIFICATION_TYPES.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Timeline</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="expires_at">Expiry Date</Label>
                  <Input
                    id="expires_at"
                    type="date"
                    value={formData.expires_at}
                    onChange={(e) => setFormData(prev => ({ ...prev, expires_at: e.target.value }))}
                    min={formData.date}
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Attachment</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="attachment_name">File Name</Label>
                  <Input
                    id="attachment_name"
                    value={formData.attachment_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, attachment_name: e.target.value }))}
                    placeholder="e.g., policy.pdf"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="attachment_url">File URL</Label>
                  <Input
                    id="attachment_url"
                    value={formData.attachment_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, attachment_url: e.target.value }))}
                    placeholder="https://example.com/file.pdf"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="attachment_size">File Size</Label>
                  <Input
                    id="attachment_size"
                    value={formData.attachment_size}
                    onChange={(e) => setFormData(prev => ({ ...prev, attachment_size: e.target.value }))}
                    placeholder="e.g., 2.5 MB"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <Label htmlFor="attachment-upload" className="cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-muted transition-colors">
                    <Upload className="h-4 w-4" />
                    Upload File
                  </div>
                  <input
                    id="attachment-upload"
                    type="file"
                    className="hidden"
                    title="Upload attachment file"
                    onChange={handleAttachmentUpload}
                  />
                </Label>
                {formData.attachment_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <Paperclip className="h-4 w-4" />
                    <span>{formData.attachment_name}</span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Settings</h3>
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_pinned"
                    checked={formData.is_pinned}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_pinned: checked }))}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="is_pinned" className="cursor-pointer flex items-center gap-2">
                      <Pin className="h-4 w-4" />
                      Pin to top
                    </Label>
                    <p className="text-xs text-muted-foreground">Keep this notice at the top of the list</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="requires_acknowledgment"
                    checked={formData.requires_acknowledgment}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requires_acknowledgment: checked }))}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="requires_acknowledgment" className="cursor-pointer flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Require acknowledgment
                    </Label>
                    <p className="text-xs text-muted-foreground">Users must acknowledge reading this notice</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="min-w-[120px]">
              {isLoading ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {notice ? 'Save Changes' : 'Create Notice'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Main Component
export default function NoticeboardManagement() {
  const [data, setData] = useState<Notice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState<CalculatedStats | null>(null);
  const [viewMode, setViewMode] = useState('grid');
  const [expandedNotices, setExpandedNotices] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<NoticeFilters>({
    category: 'all',
    priority: 'all',
    status: 'all',
    department: 'all',
    is_pinned: null
  });

  useEffect(() => {
    fetchNotices();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchNotices();
    }, 300);

    return () => clearTimeout(timer);
  }, [filters, search]);

  const fetchNotices = async () => {
    setIsLoading(true);
    try {
      const apiFilters = {
        ...filters,
        search: search || undefined,
        is_pinned: filters.is_pinned !== null ? filters.is_pinned : undefined
      };

      const notices = await noticeboardApi.getAllNotices(apiFilters);
      setData(Array.isArray(notices) ? notices : []);
    } catch (err) {
      console.error('Error fetching notices:', err);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const statsData = await noticeboardApi.getStats();
      setStats(statsData);
    } catch (err) {
      console.error('Error fetching stats:', err);
      setStats(null);
    }
  };

  const handleSaveNotice = async (noticeData: NoticeFormData) => {
    setIsLoading(true);
    try {
      console.log('Saving notice with data:', noticeData);

      let result;
      if (editingNotice) {
        result = await noticeboardApi.updateNotice(editingNotice.id, noticeData);
      } else {
        result = await noticeboardApi.createNotice(noticeData);
      }

      console.log('Save result:', result);

      await fetchNotices();
      setIsModalOpen(false);
      setEditingNotice(null);

      alert(`Notice ${editingNotice ? 'updated' : 'created'} successfully!`);

    } catch (error) {
      console.error('Save error:', error);
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('405')) {
        alert('Error: Method Not Allowed. Please check the API endpoint and method.');
      } else if (msg.includes('400')) {
        alert('Error: Bad Request. Please check the data format and required fields.');
      } else if (msg.includes('500')) {
        alert('Error: Internal Server Error. Please check backend logs.');
      } else if (msg.includes('Network Error')) {
        alert('Error: Cannot connect to backend. Make sure the server is running on http://localhost:8000');
      } else {
        alert(`Error: ${msg}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteNotice = async (id: string) => {
    try {
      await noticeboardApi.deleteNotice(id);
      setData(prev => prev.filter(n => n.id !== id));
      if (selectedNotice?.id === id) {
        setIsDetailsModalOpen(false);
        setSelectedNotice(null);
      }
      // Remove from expanded set if deleted
      setExpandedNotices(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
      alert('Notice deleted successfully!');
    } catch (error) {
      console.error('Delete error:', error);
      alert(`Error deleting notice: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleViewDetails = (notice: Notice) => {
    setSelectedNotice(notice);
    setIsDetailsModalOpen(true);
  };

  const handleEditNotice = (notice: Notice) => {
    setEditingNotice(notice);
    setIsModalOpen(true);
  };

  const handleTogglePin = (id: string, newPinState: boolean) => {
    setData(prev => prev.map(n => n.id === id ? { ...n, is_pinned: newPinState } : n));
    if (selectedNotice && selectedNotice.id === id) {
      setSelectedNotice(prev => prev ? { ...prev, is_pinned: newPinState } : prev);
    }
  };

  const handleToggleExpand = (id: string) => {
    setExpandedNotices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const calculatedStats = calculateClientSideStats(data);

  const pinnedNotices = data.filter(notice => notice.is_pinned);
  const regularNotices = data.filter(notice => !notice.is_pinned);
  const expiredNotices = data.filter(notice =>
    notice.expires_at && new Date(notice.expires_at) < new Date()
  );

  return (
    <PageShell>
      <TooltipProvider>
      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <nav className="flex items-center gap-1.5 text-xs text-[#6B7B8E] mb-2">
              <span>Home</span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-[#2A4D69] font-medium">Noticeboard</span>
            </nav>
            <h1 className="text-3xl font-bold text-[#2A4D69] font-heading tracking-tight">Noticeboard</h1>
            <p className="text-[#6B7B8E] mt-1">Create, manage, and monitor all company notices and announcements.</p>
          </div>
          <div className="flex items-center gap-2 self-start">
            <Button onClick={() => { setEditingNotice(null); setIsModalOpen(true); }} className="gap-2 bg-[#2A4D69] hover:bg-[#1e3a52] text-white shadow-md">
              <Plus className="h-4 w-4" />
              Create Notice
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatisticsCard
            title="Total Notices"
            value={data.length}
            icon={FileText}
            trend={`${calculatedStats.total_notices} total`}
          />
          <StatisticsCard
            title="Active"
            value={data.filter(n => n.status === 'Active').length}
            icon={CheckCircle}
            trend={`${calculatedStats.status_breakdown.Active || 0} active`}
            className="border-green-200 dark:border-green-800"
          />
          <StatisticsCard
            title="Pinned"
            value={pinnedNotices.length}
            icon={Pin}
            trend={`${calculatedStats.pinned_count} pinned`}
            className="border-amber-200 dark:border-amber-800"
          />
          <StatisticsCard
            title="Expired"
            value={expiredNotices.length}
            icon={Clock4}
            trend={`${calculatedStats.expired_count} expired`}
            className="border-red-200 dark:border-red-800"
          />
        </div>

        {calculatedStats.priority_breakdown && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart className="h-4 w-4" />
                Priority Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {PRIORITIES.map(priority => {
                  const count = calculatedStats.priority_breakdown[priority] || 0;
                  const percentage = data.length > 0 ? (count / data.length * 100) : 0;

                  return (
                    <div key={priority} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getPriorityStyle(priority).icon}
                        <span className="text-sm">{priority}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-32">
                          <Progress
                            value={percentage}
                            className={`h-2 ${priority === 'Critical' ? 'bg-red-100' :
                                priority === 'High' ? 'bg-orange-100' :
                                  priority === 'Medium' ? 'bg-blue-100' :
                                    'bg-gray-100'
                              }`}
                          />
                        </div>
                        <span className="text-sm font-medium w-8 text-right">
                          {count}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filters & Search
                </CardTitle>
                <CardDescription>Filter notices by various criteria</CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <Tabs value={viewMode} onValueChange={setViewMode} className="w-auto">
                  <TabsList>
                    <TabsTrigger value="grid" className="gap-2">
                      <div className="grid grid-cols-2 gap-0.5">
                        <div className="h-2 w-2 bg-current rounded-sm"></div>
                        <div className="h-2 w-2 bg-current rounded-sm"></div>
                        <div className="h-2 w-2 bg-current rounded-sm"></div>
                        <div className="h-2 w-2 bg-current rounded-sm"></div>
                      </div>
                      Grid
                    </TabsTrigger>
                    <TabsTrigger value="table" className="gap-2">
                      <Table className="h-4 w-4" />
                      Table
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search notices by title or content..."
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
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
                  <Label htmlFor="filter-category" className="text-xs">Category</Label>
                  <Select
                    value={filters.category}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger id="filter-category">
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="filter-priority" className="text-xs">Priority</Label>
                  <Select
                    value={filters.priority}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, priority: value }))}
                  >
                    <SelectTrigger id="filter-priority">
                      <SelectValue placeholder="All priorities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
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

                <div className="space-y-2">
                  <Label htmlFor="filter-status" className="text-xs">Status</Label>
                  <Select
                    value={filters.status}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger id="filter-status">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
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

                <div className="space-y-2">
                  <Label htmlFor="filter-department" className="text-xs">Department</Label>
                  <Select
                    value={filters.department}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, department: value }))}
                  >
                    <SelectTrigger id="filter-department">
                      <SelectValue placeholder="All departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {DEPARTMENTS.map(dept => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="filter-pinned" className="text-xs">Pinned Status</Label>
                  <Select
                    value={filters.is_pinned === null ? 'all' : filters.is_pinned.toString()}
                    onValueChange={(value) => {
                      if (value === 'all') {
                        setFilters(prev => ({ ...prev, is_pinned: null }));
                      } else {
                        setFilters(prev => ({ ...prev, is_pinned: value === 'true' }));
                      }
                    }}
                  >
                    <SelectTrigger id="filter-pinned">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Notices</SelectItem>
                      <SelectItem value="true">Pinned Only</SelectItem>
                      <SelectItem value="false">Not Pinned</SelectItem>
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
                      category: 'all',
                      priority: 'all',
                      status: 'all',
                      department: 'all',
                      is_pinned: null
                    });
                    setSearch('');
                  }}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Clear Filters
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchNotices}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div>
                <CardTitle>Notices ({data.length})</CardTitle>
                <CardDescription>
                  {isLoading ? 'Loading...' : `Showing ${data.length} notice${data.length !== 1 ? 's' : ''}`}
                </CardDescription>
              </div>

              <div className="text-sm text-muted-foreground">
                {pinnedNotices.length > 0 && `${pinnedNotices.length} pinned, `}
                {regularNotices.length} regular
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Loading notices...</p>
              </div>
            ) : data.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No notices found</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {search || Object.values(filters).some(f => f !== 'all' && f !== null)
                    ? 'Try adjusting your search or filters'
                    : 'Get started by creating your first notice'}
                </p>
                {(!search && Object.values(filters).every(f => f === 'all' || f === null)) && (
                  <Button onClick={() => {
                    setEditingNotice(null);
                    setIsModalOpen(true);
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Notice
                  </Button>
                )}
              </div>
            ) : viewMode === 'table' ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Author</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pinnedNotices.map(notice => (
                      <NoticeCard
                        key={notice.id}
                        notice={notice}
                        onView={handleViewDetails}
                        onEdit={handleEditNotice}
                        onDelete={handleDeleteNotice}
                        viewMode="table"
                        isExpanded={expandedNotices.has(notice.id)}
                        onToggleExpand={handleToggleExpand}
                      />
                    ))}
                    {regularNotices.map(notice => (
                      <NoticeCard
                        key={notice.id}
                        notice={notice}
                        onView={handleViewDetails}
                        onEdit={handleEditNotice}
                        onDelete={handleDeleteNotice}
                        viewMode="table"
                        isExpanded={expandedNotices.has(notice.id)}
                        onToggleExpand={handleToggleExpand}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="space-y-6">
                {pinnedNotices.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Bell className="h-5 w-5 text-amber-500" />
                      <h3 className="text-lg font-semibold">Pinned Notices</h3>
                      <Badge variant="outline" className="ml-2">
                        {pinnedNotices.length}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {pinnedNotices.map(notice => (
                        <NoticeCard
                          key={notice.id}
                          notice={notice}
                          onView={handleViewDetails}
                          onEdit={handleEditNotice}
                          onDelete={handleDeleteNotice}
                          viewMode={viewMode}
                          isExpanded={expandedNotices.has(notice.id)}
                          onToggleExpand={handleToggleExpand}
                        />
                      ))}
                    </div>
                    <Separator className="my-6" />
                  </div>
                )}

                <div>
                  <h3 className="text-lg font-semibold mb-4">
                    All Notices ({regularNotices.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {regularNotices.map(notice => (
                      <NoticeCard
                        key={notice.id}
                        notice={notice}
                        onView={handleViewDetails}
                        onEdit={handleEditNotice}
                        onDelete={handleDeleteNotice}
                        viewMode={viewMode}
                        isExpanded={expandedNotices.has(notice.id)}
                        onToggleExpand={handleToggleExpand}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>

          {data.length > 0 && !isLoading && (
            <CardFooter className="flex justify-between border-t pt-6">
              <div className="text-sm text-muted-foreground">
                {expiredNotices.length > 0 && (
                  <span className="text-red-600 mr-3">
                    {expiredNotices.length} expired notice{expiredNotices.length !== 1 ? 's' : ''}
                  </span>
                )}
                Showing {data.length} notice{data.length !== 1 ? 's' : ''}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
              </div>
            </CardFooter>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common actions for notice management
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="gap-2">
                <Archive className="h-4 w-4" />
                Archive All Expired
              </Button>
              <Button variant="outline" className="gap-2">
                <EyeOff className="h-4 w-4" />
                Hide Expired Notices
              </Button>
              <Button variant="outline" className="gap-2">
                <PinOff className="h-4 w-4" />
                Unpin All
              </Button>
              <Button variant="outline" className="gap-2">
                <Users className="h-4 w-4" />
                View Acknowledgment Reports
              </Button>
            </div>
          </CardContent>
        </Card>

        <EditNoticeModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingNotice(null);
          }}
          notice={editingNotice}
          onSave={handleSaveNotice}
          isLoading={isLoading}
        />

        <NoticeDetailsModal
          isOpen={isDetailsModalOpen}
          onClose={() => {
            setIsDetailsModalOpen(false);
            setSelectedNotice(null);
          }}
          notice={selectedNotice}
          onDelete={handleDeleteNotice}
          onEdit={(notice) => {
            setIsDetailsModalOpen(false);
            handleEditNotice(notice);
          }}
          onTogglePin={handleTogglePin}
        />
      </main>
      </TooltipProvider>
    </PageShell>
  );
}
