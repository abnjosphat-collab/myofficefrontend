import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
//import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Search, 
  Filter, 
  Plus, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Download,
  Grid,
  List,
  Kanban,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  X,
  ChevronDown,
  ChevronUp,
  Building,
  User,
  Wrench,
  AlertCircle,
  CheckSquare,
  PlayCircle,
  PauseCircle,
  FileText,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Tool,
  FileCheck,
  ClipboardList,
  DollarSign,
  MapPin,
  Mail,
  Zap,
  Shield,
  Star,
  Printer,
  Copy,
  QrCode,
  CalendarDays,
  Users,
  FileUp,
  Send,
  BatteryCharging,
  Timer,
  Sparkles,
  Lightbulb,
  Rocket,
  Crown,
  Settings,
  MoreHorizontal,
  ArrowUpDown,
  Filter as FilterIcon
} from '@/components/shared/theme';
import { format, addDays, isBefore, startOfWeek, addWeeks } from 'date-fns';
import { toast } from 'sonner';

// Predefined routine maintenance templates
const ROUTINE_MAINTENANCE_TEMPLATES = [
  {
    title: "Weekly HVAC System Check",
    description: "Routine inspection and maintenance of HVAC systems across all buildings",
    category: "hvac",
    priority: "medium",
    estimatedHours: 2,
    location: "All Buildings",
    recurring: true,
    frequency: "weekly"
  },
  {
    title: "Emergency Lighting Test",
    description: "Weekly test of all emergency exit lights and backup power systems",
    category: "electrical",
    priority: "high",
    estimatedHours: 1,
    location: "All Floors",
    recurring: true,
    frequency: "weekly"
  },
  {
    title: "Plumbing System Inspection",
    description: "Weekly check of main water lines, pressure valves, and drainage systems",
    category: "plumbing",
    priority: "medium",
    estimatedHours: 3,
    location: "Main Building",
    recurring: true,
    frequency: "weekly"
  },
  {
    title: "Safety Equipment Audit",
    description: "Inspection of fire extinguishers, first aid kits, and emergency equipment",
    category: "safety",
    priority: "high",
    estimatedHours: 2,
    location: "All Locations",
    recurring: true,
    frequency: "weekly"
  },
  {
    title: "Elevator Maintenance Check",
    description: "Weekly safety and operational check of all elevator systems",
    category: "general",
    priority: "high",
    estimatedHours: 4,
    location: "Elevator Shafts",
    recurring: true,
    frequency: "weekly"
  }
];

// Premium Work Order Form Component
const WorkOrderForm = ({ isOpen, onClose, onSubmit, workOrder, mode = 'create' }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    status: 'pending',
    assignedTo: '',
    dueDate: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
    category: 'general',
    location: '',
    estimatedHours: '',
    costEstimate: '',
    department: 'Maintenance',
    contact: '',
    notes: '',
    safetyRequirements: '',
    requiredTools: '',
    isRecurring: false,
    recurrencePattern: 'weekly'
  });

  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;

  // Pre-fill form if editing
  useEffect(() => {
    if (workOrder && mode === 'edit') {
      setFormData({
        title: workOrder.title || '',
        description: workOrder.description || '',
        priority: workOrder.priority || 'medium',
        status: workOrder.status || 'pending',
        assignedTo: workOrder.assignedTo || '',
        dueDate: workOrder.dueDate ? format(new Date(workOrder.dueDate), 'yyyy-MM-dd') : format(addDays(new Date(), 7), 'yyyy-MM-dd'),
        category: workOrder.category || 'general',
        location: workOrder.location || '',
        estimatedHours: workOrder.estimatedHours || '',
        costEstimate: workOrder.costEstimate || '',
        department: workOrder.department || 'Maintenance',
        contact: workOrder.contact || '',
        notes: workOrder.notes || '',
        safetyRequirements: workOrder.safetyRequirements || '',
        requiredTools: workOrder.requiredTools || '',
        isRecurring: workOrder.isRecurring || false,
        recurrencePattern: workOrder.recurrencePattern || 'weekly'
      });
    }
  }, [workOrder, mode]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const enhancedData = {
      ...formData,
      id: mode === 'edit' ? workOrder.id : `WO-${Date.now()}`,
      createdAt: mode === 'edit' ? workOrder.createdAt : new Date(),
      updatedAt: new Date(),
      progress: mode === 'edit' ? workOrder.progress : 0,
      efficiency: mode === 'edit' ? workOrder.efficiency : 85
    };
    onSubmit(enhancedData);
    onClose();
    toast.success(`Work order ${mode === 'edit' ? 'updated' : 'created'} successfully`, {
      description: `Work order "${formData.title}" has been ${mode === 'edit' ? 'updated' : 'created'}.`
    });
  };

  const nextStep = () => {
    if (currentStep < totalSteps) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const quickCreateFromTemplate = (template) => {
    setFormData({
      ...formData,
      title: template.title,
      description: template.description,
      category: template.category,
      priority: template.priority,
      estimatedHours: template.estimatedHours,
      location: template.location,
      isRecurring: template.recurring,
      recurrencePattern: template.frequency
    });
    setCurrentStep(2); // Skip to assignment step
    toast.success("Template applied", {
      description: `"${template.title}" template loaded.`
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-slate-900 p-6 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-semibold flex items-center gap-3">
                <FileText className="w-6 h-6 text-blue-400" />
                {mode === 'edit' ? 'Edit Work Order' : 'Create Work Order'}
              </h2>
              <p className="text-slate-300 mt-1 text-sm">
                {mode === 'edit' ? 'Update work order details' : 'Complete the form below to create a new maintenance work order'}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-slate-300 hover:bg-slate-800 hover:text-white">
              <X className="w-5 h-5" />
            </Button>
          </div>
          
          {/* Progress Steps */}
          <div className="flex items-center justify-between mt-6">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  step <= currentStep 
                    ? 'bg-blue-500 border-blue-500 text-white' 
                    : 'border-slate-500 text-slate-400'
                } font-semibold text-sm`}>
                  {step}
                </div>
                {step < 3 && (
                  <div className={`w-16 h-1 mx-2 ${
                    step < currentStep ? 'bg-blue-500' : 'bg-slate-600'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Quick Templates */}
          {currentStep === 1 && mode === 'create' && (
            <div className="mb-6">
              <Label className="text-sm font-medium text-slate-700 mb-3 block">Quick Start Templates</Label>
              <div className="grid grid-cols-1 gap-2">
                {ROUTINE_MAINTENANCE_TEMPLATES.slice(0, 3).map((template, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => quickCreateFromTemplate(template)}
                    className="text-left p-3 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                  >
                    <div className="font-medium text-slate-800">{template.title}</div>
                    <div className="text-sm text-slate-600 mt-1">{template.description}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-sm font-medium text-slate-700">
                    Work Order Title *
                  </Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter work order title"
                    className="focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category" className="text-sm font-medium text-slate-700">
                    Category *
                  </Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                    <SelectTrigger className="focus:ring-2 focus:ring-blue-500">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="electrical">Electrical</SelectItem>
                      <SelectItem value="plumbing">Plumbing</SelectItem>
                      <SelectItem value="hvac">HVAC</SelectItem>
                      <SelectItem value="general">General Maintenance</SelectItem>
                      <SelectItem value="safety">Safety</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority" className="text-sm font-medium text-slate-700">
                    Priority Level *
                  </Label>
                  <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                    <SelectTrigger className="focus:ring-2 focus:ring-blue-500">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low Priority</SelectItem>
                      <SelectItem value="medium">Medium Priority</SelectItem>
                      <SelectItem value="high">High Priority</SelectItem>
                      <SelectItem value="urgent">Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dueDate" className="text-sm font-medium text-slate-700">
                    Due Date *
                  </Label>
                  <Input
                    type="date"
                    id="dueDate"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium text-slate-700">
                  Detailed Description *
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Provide detailed description of work required..."
                  className="min-h-[120px] focus:ring-2 focus:ring-blue-500 resize-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="location" className="text-sm font-medium text-slate-700">
                    Location *
                  </Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Building, floor, room number..."
                    className="focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estimatedHours" className="text-sm font-medium text-slate-700">
                    Estimated Hours
                  </Label>
                  <Input
                    type="number"
                    id="estimatedHours"
                    value={formData.estimatedHours}
                    onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
                    placeholder="Enter estimated time required"
                    className="focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Assignment & Details */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="assignedTo" className="text-sm font-medium text-slate-700">
                    Assign To *
                  </Label>
                  <Select value={formData.assignedTo} onValueChange={(value) => setFormData({ ...formData, assignedTo: value })}>
                    <SelectTrigger className="focus:ring-2 focus:ring-blue-500">
                      <SelectValue placeholder="Select technician" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="John Technician">John Technician</SelectItem>
                      <SelectItem value="Sarah Engineer">Sarah Engineer</SelectItem>
                      <SelectItem value="Mike Electrician">Mike Electrician</SelectItem>
                      <SelectItem value="Lisa Plumber">Lisa Plumber</SelectItem>
                      <SelectItem value="David HVAC">David HVAC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department" className="text-sm font-medium text-slate-700">
                    Department
                  </Label>
                  <Input
                    id="department"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="Maintenance department"
                    className="focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact" className="text-sm font-medium text-slate-700">
                    Contact Information
                  </Label>
                  <Input
                    id="contact"
                    value={formData.contact}
                    onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                    placeholder="Email or phone number"
                    className="focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="costEstimate" className="text-sm font-medium text-slate-700">
                    Cost Estimate
                  </Label>
                  <Input
                    type="number"
                    id="costEstimate"
                    value={formData.costEstimate}
                    onChange={(e) => setFormData({ ...formData, costEstimate: e.target.value })}
                    placeholder="Estimated cost"
                    className="focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="requiredTools" className="text-sm font-medium text-slate-700">
                  Required Tools & Equipment
                </Label>
                <Textarea
                  id="requiredTools"
                  value={formData.requiredTools}
                  onChange={(e) => setFormData({ ...formData, requiredTools: e.target.value })}
                  placeholder="List any special tools or equipment needed..."
                  className="min-h-[80px] focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="safetyRequirements" className="text-sm font-medium text-slate-700">
                  Safety Requirements
                </Label>
                <Textarea
                  id="safetyRequirements"
                  value={formData.safetyRequirements}
                  onChange={(e) => setFormData({ ...formData, safetyRequirements: e.target.value })}
                  placeholder="List safety equipment and procedures..."
                  className="min-h-[80px] focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch 
                  id="recurring" 
                  checked={formData.isRecurring}
                  onCheckedChange={(checked) => setFormData({ ...formData, isRecurring: checked })}
                />
                <Label htmlFor="recurring" className="text-sm font-medium text-slate-700">
                  Recurring Maintenance
                </Label>
              </div>

              {formData.isRecurring && (
                <div className="space-y-2">
                  <Label htmlFor="recurrencePattern" className="text-sm font-medium text-slate-700">
                    Recurrence Pattern
                  </Label>
                  <Select 
                    value={formData.recurrencePattern} 
                    onValueChange={(value) => setFormData({ ...formData, recurrencePattern: value })}
                  >
                    <SelectTrigger className="focus:ring-2 focus:ring-blue-500">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Review & Additional Notes */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <h4 className="font-semibold text-slate-800 mb-3">Work Order Summary</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Title:</span>
                      <span className="font-semibold">{formData.title}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Category:</span>
                      <span className="font-semibold capitalize">{formData.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Priority:</span>
                      <Badge variant={
                        formData.priority === 'urgent' ? 'destructive' :
                        formData.priority === 'high' ? 'default' :
                        formData.priority === 'medium' ? 'secondary' : 'outline'
                      }>
                        {formData.priority}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Assigned To:</span>
                      <span className="font-semibold">{formData.assignedTo}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Due Date:</span>
                      <span className="font-semibold">{formData.dueDate ? format(new Date(formData.dueDate), 'MMM dd, yyyy') : 'Not set'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Location:</span>
                      <span className="font-semibold">{formData.location}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm font-medium text-slate-700">
                  Additional Notes & Instructions
                </Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any additional instructions or notes..."
                  className="min-h-[100px] focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="flex items-center gap-2"
            >
              <ChevronUp className="w-4 h-4 rotate-90" />
              Previous
            </Button>

            {currentStep < totalSteps ? (
              <Button
                type="button"
                onClick={nextStep}
                className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
              >
                Next Step
                <ChevronUp className="w-4 h-4 -rotate-90" />
              </Button>
            ) : (
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                {mode === 'edit' ? 'Update Work Order' : 'Create Work Order'}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

// Work Order Card Component for Grid View
const WorkOrderCard = ({ workOrder, onEdit, onDownload, onToggleDetails, isExpanded }) => {
  const efficiencyScore = workOrder.efficiency || 75;

  return (
    <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 group">
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors text-base leading-tight truncate">
                {workOrder.title}
              </h3>
              <p className="text-sm text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                {workOrder.description}
              </p>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => onDownload(workOrder, true)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Download Blank Form</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => onToggleDetails(workOrder.id)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>View Details</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant={
              workOrder.priority === 'urgent' ? 'destructive' :
              workOrder.priority === 'high' ? 'default' :
              workOrder.priority === 'medium' ? 'secondary' : 'outline'
            }>
              {workOrder.priority}
            </Badge>
            <Badge variant={
              workOrder.status === 'completed' ? 'success' :
              workOrder.status === 'in-progress' ? 'default' :
              workOrder.status === 'on-hold' ? 'secondary' : 'outline'
            }>
              {workOrder.status}
            </Badge>
          </div>

          {/* Progress & Efficiency */}
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Progress</span>
                <span>{workOrder.progress}%</span>
              </div>
              <Progress value={workOrder.progress} className="h-1.5" />
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <BatteryCharging className="w-3 h-3 text-green-600" />
                <span className="text-xs font-semibold text-slate-600">Efficiency</span>
              </div>
              <span className="text-sm font-bold text-green-600">
                {efficiencyScore}%
              </span>
            </div>
          </div>
          
          {/* Footer */}
          <div className="flex justify-between items-center text-sm border-t pt-3">
            <span className="flex items-center gap-1 text-slate-600 text-xs">
              <User className="w-3 h-3" />
              {workOrder.assignedTo}
            </span>
            {workOrder.dueDate && (
              <span className={`flex items-center gap-1 text-xs ${
                isBefore(new Date(workOrder.dueDate), new Date()) 
                  ? 'text-red-600' 
                  : 'text-slate-500'
              }`}>
                <Calendar className="w-3 h-3" />
                {format(new Date(workOrder.dueDate), 'MMM dd')}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onEdit(workOrder)}
              className="flex-1 flex items-center gap-1 text-xs"
            >
              <Edit className="w-3 h-3" />
              Edit
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onDownload(workOrder)}
              className="flex-1 flex items-center gap-1 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100"
            >
              <Printer className="w-3 h-3" />
              Print
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Enhanced Stats Cards
const StatCard = ({ title, value, icon: Icon, trend, description, color = 'blue' }) => {
  const colorConfig = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-700', icon: 'text-blue-600', border: 'border-blue-200' },
    green: { bg: 'bg-green-50', text: 'text-green-700', icon: 'text-green-600', border: 'border-green-200' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-700', icon: 'text-orange-600', border: 'border-orange-200' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-700', icon: 'text-purple-600', border: 'border-purple-200' }
  };

  const config = colorConfig[color];
  const trendIcons = {
    up: <TrendingUp className="w-4 h-4 text-green-600" />,
    down: <TrendingDown className="w-4 h-4 text-red-600" />,
    stable: <Minus className="w-4 h-4 text-slate-600" />
  };

  return (
    <Card className={`${config.bg} ${config.border} border shadow-sm hover:shadow-md transition-all duration-300`}>
      <CardContent className="pt-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium mb-1 text-slate-600">{title}</p>
            <p className={`text-2xl font-bold ${config.text}`}>{value}</p>
            <p className="text-xs text-slate-500 mt-1">{description}</p>
          </div>
          <div className="flex flex-col items-end">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <Icon className={`w-6 h-6 ${config.icon}`} />
            </div>
            {trend && (
              <div className="flex items-center gap-1 text-xs mt-2">
                {trendIcons[trend]}
                <span className="text-slate-600">{trend}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Function to generate premium PDF
const generatePremiumPDF = (workOrder, isBlank = false) => {
  const printWindow = window.open('', '_blank');
  const today = new Date();
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Work Order - ${isBlank ? 'Blank Form' : workOrder.title}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        * { 
          margin: 0; 
          padding: 0; 
          box-sizing: border-box; 
        }
        
        body { 
          font-family: 'Inter', sans-serif;
          background: #f8fafc;
          color: #1e293b;
          line-height: 1.6;
          padding: 2rem;
        }
        
        .document {
          max-width: 210mm;
          margin: 0 auto;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          overflow: hidden;
        }
        
        .header {
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
          color: white;
          padding: 3rem 2rem;
          text-align: center;
          position: relative;
        }
        
        .header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="white" opacity="0.05"><circle cx="50" cy="50" r="2"/></svg>');
          background-size: 20px 20px;
        }
        
        .header h1 {
          font-size: 2.5rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
          position: relative;
        }
        
        .header p {
          font-size: 1.1rem;
          opacity: 0.9;
          position: relative;
        }
        
        .content {
          padding: 3rem;
        }
        
        .section {
          margin-bottom: 2.5rem;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          overflow: hidden;
        }
        
        .section-header {
          background: #f8fafc;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid #e2e8f0;
          font-weight: 600;
          color: #1e293b;
          font-size: 1.1rem;
        }
        
        .section-content {
          padding: 1.5rem;
          background: white;
        }
        
        .grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }
        
        .grid-3 {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 1.5rem;
        }
        
        .field {
          margin-bottom: 1.25rem;
        }
        
        .field-label {
          font-weight: 600;
          color: #475569;
          margin-bottom: 0.5rem;
          font-size: 0.9rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        
        .field-value {
          padding: 0.75rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 0.95rem;
        }
        
        .field-input {
          border-bottom: 2px dashed #cbd5e1;
          padding: 0.75rem 0;
          min-height: 1.5rem;
        }
        
        .badge {
          display: inline-flex;
          align-items: center;
          padding: 0.375rem 0.75rem;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 600;
        }
        
        .badge-urgent { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
        .badge-high { background: #fffbeb; color: #d97706; border: 1px solid #fed7aa; }
        .badge-medium { background: #f0f9ff; color: #0369a1; border: 1px solid #bae6fd; }
        .badge-low { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
        
        .signature-area {
          border: 2px dashed #cbd5e1;
          height: 80px;
          border-radius: 6px;
          margin-top: 0.5rem;
          background: #f8fafc;
        }
        
        .footer {
          text-align: center;
          padding: 2rem;
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
          color: #64748b;
          font-size: 0.9rem;
        }
        
        .watermark {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
          font-size: 6rem;
          color: #f1f5f9;
          font-weight: 800;
          opacity: 0.03;
          pointer-events: none;
          z-index: -1;
        }
        
        @media print {
          body { background: white; padding: 0; }
          .document { box-shadow: none; border-radius: 0; }
          .header { background: #1e293b !important; -webkit-print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      <div class="watermark">WORK ORDER</div>
      <div class="document">
        <div class="header">
          <h1>MAINTENANCE WORK ORDER</h1>
          <p>Professional Maintenance Management System</p>
        </div>
        
        <div class="content">
          ${isBlank ? `
          <!-- Blank Work Order Form -->
          <div class="section">
            <div class="section-header">Basic Information</div>
            <div class="section-content">
              <div class="grid-2">
                <div class="field">
                  <div class="field-label">Work Order Number</div>
                  <div class="field-input">WO-${today.getFullYear()}-______</div>
                </div>
                <div class="field">
                  <div class="field-label">Date Submitted</div>
                  <div class="field-value">${today.toLocaleDateString()}</div>
                </div>
              </div>
              <div class="field">
                <div class="field-label">Requested By</div>
                <div class="field-input"></div>
              </div>
              <div class="grid-2">
                <div class="field">
                  <div class="field-label">Department</div>
                  <div class="field-input"></div>
                </div>
                <div class="field">
                  <div class="field-label">Contact Information</div>
                  <div class="field-input">Phone: __________________ Email: __________________</div>
                </div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-header">Work Details</div>
            <div class="section-content">
              <div class="field">
                <div class="field-label">Description of Problem/Request</div>
                <div class="field-input" style="min-height: 80px;"></div>
              </div>
              <div class="grid-2">
                <div class="field">
                  <div class="field-label">Location/Building</div>
                  <div class="field-input"></div>
                </div>
                <div class="field">
                  <div class="field-label">Room/Area</div>
                  <div class="field-input"></div>
                </div>
              </div>
              <div class="grid-3">
                <div class="field">
                  <div class="field-label">Priority</div>
                  <div class="field-input">□ Low □ Medium □ High □ Emergency</div>
                </div>
                <div class="field">
                  <div class="field-label">Category</div>
                  <div class="field-input">□ Electrical □ Plumbing □ HVAC □ General □ Safety</div>
                </div>
                <div class="field">
                  <div class="field-label">Required Completion Date</div>
                  <div class="field-input"></div>
                </div>
              </div>
            </div>
          </div>
          ` : `
          <!-- Filled Work Order -->
          <div class="section">
            <div class="section-header">Work Order Details</div>
            <div class="section-content">
              <div class="grid-3">
                <div class="field">
                  <div class="field-label">Work Order ID</div>
                  <div class="field-value">${workOrder.id}</div>
                </div>
                <div class="field">
                  <div class="field-label">Status</div>
                  <div class="field-value">${workOrder.status}</div>
                </div>
                <div class="field">
                  <div class="field-label">Priority</div>
                  <div class="badge badge-${workOrder.priority}">${workOrder.priority}</div>
                </div>
              </div>
              <div class="field">
                <div class="field-label">Title</div>
                <div class="field-value" style="font-weight: 600; font-size: 1.1em;">${workOrder.title}</div>
              </div>
              <div class="field">
                <div class="field-label">Description</div>
                <div class="field-value">${workOrder.description}</div>
              </div>
              <div class="grid-2">
                <div class="field">
                  <div class="field-label">Assigned To</div>
                  <div class="field-value">${workOrder.assignedTo}</div>
                </div>
                <div class="field">
                  <div class="field-label">Due Date</div>
                  <div class="field-value">${workOrder.dueDate ? format(new Date(workOrder.dueDate), 'MMM dd, yyyy') : 'Not set'}</div>
                </div>
              </div>
            </div>
          </div>
          `}
        </div>
        
        <div class="footer">
          <p>Generated on ${today.toLocaleDateString()} • Maintenance Management System</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  
  setTimeout(() => {
    printWindow.print();
  }, 500);
};

const MaintenanceContent = ({
  workOrders = [],
  dashboardData,
  preferences = {},
  filters = {},
  sortConfig,
  onCreateWorkOrder,
  onUpdateWorkOrder,
  onDeleteWorkOrder,
  onUpdatePreference,
  onUpdateFilter,
  onClearFilters,
  onSort,
  loading = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredWorkOrders, setFilteredWorkOrders] = useState([]);
  const [viewMode, setViewMode] = useState(preferences.viewMode || 'grid');
  const [showWorkOrderForm, setShowWorkOrderForm] = useState(false);
  const [editingWorkOrder, setEditingWorkOrder] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedWorkOrders, setExpandedWorkOrders] = useState(new Set());
  const [sortField, setSortField] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState('desc');

  // Initialize with routine maintenance work orders
  const initialWorkOrders = useMemo(() => {
    const routineWorkOrders = ROUTINE_MAINTENANCE_TEMPLATES.map((template, index) => ({
      id: `ROUTINE-${index + 1}`,
      title: template.title,
      description: template.description,
      category: template.category,
      priority: template.priority,
      status: 'pending',
      assignedTo: 'Maintenance Team',
      dueDate: addWeeks(startOfWeek(new Date()), 1).toISOString(),
      location: template.location,
      estimatedHours: template.estimatedHours,
      costEstimate: template.estimatedHours * 75, // $75/hour estimate
      department: 'Maintenance',
      contact: 'maintenance@company.com',
      notes: 'Routine weekly maintenance task',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      progress: 0,
      efficiency: 85,
      isRecurring: template.recurring,
      recurrencePattern: template.frequency
    }));

    return [...routineWorkOrders, ...workOrders];
  }, [workOrders]);

  // Enhanced work orders
  const enhancedWorkOrders = useMemo(() => {
    return initialWorkOrders.map(wo => ({
      ...wo,
      category: wo.category || 'general',
      location: wo.location || 'Multiple Locations',
      estimatedHours: wo.estimatedHours || 2,
      costEstimate: wo.costEstimate || 150,
      department: wo.department || 'Maintenance',
      contact: wo.contact || 'maintenance@company.com',
      notes: wo.notes || 'Standard maintenance procedure.',
      updatedAt: wo.updatedAt || wo.createdAt,
      progress: wo.progress || (wo.status === 'completed' ? 100 : wo.status === 'in-progress' ? 65 : wo.status === 'on-hold' ? 30 : 0),
      efficiency: wo.efficiency || Math.floor(Math.random() * 40) + 60
    }));
  }, [initialWorkOrders]);

  // Apply search, filters, and sorting
  useEffect(() => {
    let filtered = enhancedWorkOrders;
    
    // Search
    if (searchTerm) {
      filtered = filtered.filter(wo => 
        wo.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wo.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wo.assignedTo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wo.location?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filters
    if (filters.status) {
      filtered = filtered.filter(wo => wo.status === filters.status);
    }
    
    if (filters.priority) {
      filtered = filtered.filter(wo => wo.priority === filters.priority);
    }

    if (filters.category) {
      filtered = filtered.filter(wo => wo.category === filters.category);
    }

    // Sorting
    filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      if (sortField === 'dueDate' || sortField === 'createdAt') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }
      
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredWorkOrders(filtered);
  }, [searchTerm, enhancedWorkOrders, filters, sortField, sortDirection]);

  const toggleWorkOrderDetails = (workOrderId) => {
    const newExpanded = new Set(expandedWorkOrders);
    if (newExpanded.has(workOrderId)) {
      newExpanded.delete(workOrderId);
    } else {
      newExpanded.add(workOrderId);
    }
    setExpandedWorkOrders(newExpanded);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleCreateWorkOrder = (workOrderData) => {
    onCreateWorkOrder(workOrderData);
    setShowWorkOrderForm(false);
  };

  const handleEditWorkOrder = (workOrder) => {
    setEditingWorkOrder(workOrder);
    setShowWorkOrderForm(true);
  };

  const handleUpdateWorkOrder = (workOrderId, updates) => {
    onUpdateWorkOrder(workOrderId, updates);
  };

  const handleDownloadWorkOrderPDF = (workOrder, isBlank = false) => {
    generatePremiumPDF(workOrder, isBlank);
    toast.success(isBlank ? 'Blank work order form generated' : 'Work order PDF generated');
  };

  const handleUpdateViewMode = (mode) => {
    setViewMode(mode);
    onUpdatePreference('viewMode', mode);
  };

  // View mode rendering
  const renderWorkOrders = () => {
    switch (viewMode) {
      case 'list':
        return (
          <div className="space-y-4">
            {filteredWorkOrders.map((workOrder) => (
              <div key={workOrder.id} className="space-y-3">
                <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300">
                  <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="space-y-3 flex-1">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-slate-800 text-lg">
                              {workOrder.title}
                            </h3>
                            <p className="text-sm text-slate-600 mt-2">
                              {workOrder.description}
                            </p>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDownloadWorkOrderPDF(workOrder, true)}
                              title="Download Blank Form"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => toggleWorkOrderDetails(workOrder.id)}
                              title={expandedWorkOrders.has(workOrder.id) ? "Hide Details" : "View Details"}
                            >
                              {expandedWorkOrders.has(workOrder.id) ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                          <Badge variant={
                            workOrder.priority === 'urgent' ? 'destructive' :
                            workOrder.priority === 'high' ? 'default' :
                            workOrder.priority === 'medium' ? 'secondary' : 'outline'
                          }>
                            {workOrder.priority}
                          </Badge>
                          <Badge variant={
                            workOrder.status === 'completed' ? 'success' :
                            workOrder.status === 'in-progress' ? 'default' :
                            workOrder.status === 'on-hold' ? 'secondary' : 'outline'
                          }>
                            {workOrder.status}
                          </Badge>
                          <Badge variant="outline" className="bg-white">
                            <MapPin className="w-3 h-3 mr-1" />
                            {workOrder.location}
                          </Badge>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm text-slate-600">
                            <span>Progress</span>
                            <span>{workOrder.progress}%</span>
                          </div>
                          <Progress value={workOrder.progress} className="h-2" />
                        </div>

                        <div className="flex justify-between items-center text-sm">
                          <span className="flex items-center gap-1 text-slate-600">
                            <User className="w-3 h-3" />
                            {workOrder.assignedTo}
                          </span>
                          {workOrder.dueDate && (
                            <span className={`flex items-center gap-1 ${
                              isBefore(new Date(workOrder.dueDate), new Date()) 
                                ? 'text-red-600' 
                                : 'text-slate-500'
                            }`}>
                              <Calendar className="w-3 h-3" />
                              {format(new Date(workOrder.dueDate), 'MMM dd, yyyy')}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right space-y-3">
                        <div className="flex gap-2 justify-end">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditWorkOrder(workOrder)}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDownloadWorkOrderPDF(workOrder)}
                            className="bg-blue-50 text-blue-600 hover:bg-blue-100"
                          >
                            <Printer className="w-4 h-4 mr-1" />
                            Print
                          </Button>
                        </div>
                        
                        {/* Efficiency Score */}
                        <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-3 border border-green-200">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-600">Efficiency</span>
                            <BatteryCharging className="w-4 h-4 text-green-600" />
                          </div>
                          <div className="text-lg font-bold text-green-600">
                            {workOrder.efficiency}%
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        );

      case 'kanban':
        const statusColumns = {
          pending: filteredWorkOrders.filter(wo => wo.status === 'pending'),
          'in-progress': filteredWorkOrders.filter(wo => wo.status === 'in-progress'),
          completed: filteredWorkOrders.filter(wo => wo.status === 'completed'),
          'on-hold': filteredWorkOrders.filter(wo => wo.status === 'on-hold')
        };

        return (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {Object.entries(statusColumns).map(([status, orders]) => (
              <div key={status} className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <h3 className="font-semibold capitalize text-slate-700">
                    {status} ({orders.length})
                  </h3>
                </div>
                <div className="space-y-4">
                  {orders.map((workOrder) => (
                    <Card key={workOrder.id} className="cursor-pointer hover:shadow-lg transition-all duration-300 border border-slate-200">
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="font-medium text-sm text-slate-800">
                            {workOrder.title}
                          </h4>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDownloadWorkOrderPDF(workOrder, true)}
                            title="Download Blank Form"
                          >
                            <Download className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                          <Badge variant={
                            workOrder.priority === 'urgent' ? 'destructive' :
                            workOrder.priority === 'high' ? 'default' :
                            workOrder.priority === 'medium' ? 'secondary' : 'outline'
                          }>
                            {workOrder.priority}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-600 mb-2">
                          {workOrder.assignedTo}
                        </p>
                        {workOrder.dueDate && (
                          <p className="text-xs text-slate-500">
                            Due: {format(new Date(workOrder.dueDate), 'MMM dd')}
                          </p>
                        )}
                        <div className="mt-3">
                          <Progress value={workOrder.progress} className="h-1" />
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditWorkOrder(workOrder)}
                            className="flex-1 text-xs"
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => toggleWorkOrderDetails(workOrder.id)}
                            className="flex-1 text-xs"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );

      default: // grid view
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredWorkOrders.map((workOrder) => (
              <WorkOrderCard
                key={workOrder.id}
                workOrder={workOrder}
                onEdit={handleEditWorkOrder}
                onDownload={handleDownloadWorkOrderPDF}
                onToggleDetails={toggleWorkOrderDetails}
                isExpanded={expandedWorkOrders.has(workOrder.id)}
              />
            ))}
          </div>
        );
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Work Order Form Modal */}
      <WorkOrderForm
        isOpen={showWorkOrderForm}
        onClose={() => {
          setShowWorkOrderForm(false);
          setEditingWorkOrder(null);
        }}
        onSubmit={editingWorkOrder ? handleUpdateWorkOrder : handleCreateWorkOrder}
        workOrder={editingWorkOrder}
        mode={editingWorkOrder ? 'edit' : 'create'}
      />

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Maintenance Work Orders
          </h1>
          <p className="text-slate-600 mt-2">
            Manage and track maintenance tasks efficiently
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => handleDownloadWorkOrderPDF(null, true)}
          >
            <Download className="w-4 h-4" />
            Blank Form
          </Button>
          <Button 
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            onClick={() => setShowWorkOrderForm(true)}
          >
            <Plus className="w-4 h-4" />
            New Work Order
          </Button>
        </div>
      </div>

      {/* Enhanced Quick Stats */}
      {dashboardData && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
          <StatCard
            title="Total Work Orders"
            value={enhancedWorkOrders.length}
            icon={FileText}
            description="All work orders"
            color="blue"
          />
          <StatCard
            title="Completed"
            value={enhancedWorkOrders.filter(wo => wo.status === 'completed').length}
            icon={CheckSquare}
            trend="up"
            description="Completed tasks"
            color="green"
          />
          <StatCard
            title="In Progress"
            value={enhancedWorkOrders.filter(wo => wo.status === 'in-progress').length}
            icon={PlayCircle}
            description="Active tasks"
            color="orange"
          />
          <StatCard
            title="Pending"
            value={enhancedWorkOrders.filter(wo => wo.status === 'pending').length}
            icon={Clock}
            description="Awaiting action"
            color="purple"
          />
          <StatCard
            title="Efficiency"
            value={`${Math.round(enhancedWorkOrders.reduce((acc, wo) => acc + wo.efficiency, 0) / enhancedWorkOrders.length)}%`}
            icon={Rocket}
            trend="up"
            description="System efficiency"
            color="blue"
          />
        </div>
      )}

      {/* Search and Filter Section */}
      <Card className="border border-slate-200">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search work orders..."
                className="pl-10 border-slate-300 focus:border-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex border border-slate-300 rounded-lg bg-white">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleUpdateViewMode('grid')}
                className="rounded-r-none border-0"
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleUpdateViewMode('list')}
                className="rounded-none border-0 border-l border-slate-300"
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleUpdateViewMode('kanban')}
                className="rounded-l-none border-0 border-l border-slate-300"
              >
                <Kanban className="w-4 h-4" />
              </Button>
            </div>

            <Button 
              variant="outline" 
              className="flex items-center gap-2 border-slate-300 hover:bg-white"
              onClick={() => setShowFilters(!showFilters)}
            >
              <FilterIcon className="w-4 h-4" />
              Filters
            </Button>

            {/* Sort Dropdown */}
            <Select value={sortField} onValueChange={handleSort}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt">Date Created</SelectItem>
                <SelectItem value="dueDate">Due Date</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="title">Title</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Active Filters Display */}
          {(filters.status || filters.priority || filters.category) && (
            <div className="flex flex-wrap gap-2 mt-4">
              {filters.status && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Status: {filters.status}
                  <X 
                    className="w-3 h-3 cursor-pointer" 
                    onClick={() => onUpdateFilter('status', '')}
                  />
                </Badge>
              )}
              {filters.priority && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Priority: {filters.priority}
                  <X 
                    className="w-3 h-3 cursor-pointer" 
                    onClick={() => onUpdateFilter('priority', '')}
                  />
                </Badge>
              )}
              {filters.category && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Category: {filters.category}
                  <X 
                    className="w-3 h-3 cursor-pointer" 
                    onClick={() => onUpdateFilter('category', '')}
                  />
                </Badge>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onClearFilters}
                className="text-xs h-6"
              >
                Clear All
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Work Orders Display */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 bg-slate-100 p-1">
          <TabsTrigger value="all">All ({enhancedWorkOrders.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({enhancedWorkOrders.filter(wo => wo.status === 'pending').length})</TabsTrigger>
          <TabsTrigger value="in-progress">In Progress ({enhancedWorkOrders.filter(wo => wo.status === 'in-progress').length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({enhancedWorkOrders.filter(wo => wo.status === 'completed').length})</TabsTrigger>
          <TabsTrigger value="high">High Priority ({enhancedWorkOrders.filter(wo => wo.priority === 'high' || wo.priority === 'urgent').length})</TabsTrigger>
          <TabsTrigger value="routine">Routine ({enhancedWorkOrders.filter(wo => wo.id.startsWith('ROUTINE')).length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          {filteredWorkOrders.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center py-12">
                <FileText className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-600">No work orders found</p>
                <Button 
                  className="mt-4"
                  onClick={() => setShowWorkOrderForm(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Work Order
                </Button>
              </CardContent>
            </Card>
          ) : (
            renderWorkOrders()
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MaintenanceContent;