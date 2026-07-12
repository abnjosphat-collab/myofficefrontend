"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Calendar, Clock, AlertCircle } from "@/components/shared/theme";
import { toast } from "sonner";

export default function QuickCreateDialog({ onCreate }) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    equipment: '',
    location: '',
    type: 'preventive',
    priority: 'medium',
    assignedTo: '',
    dueDate: '',
    description: '',
    estimatedHours: 2
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!formData.title.trim()) {
        toast.error("Please enter a work order title");
        return;
      }

      const workOrder = {
        ...formData,
        title: formData.title.trim(),
        equipment: formData.equipment.trim() || 'To be specified',
        location: formData.location.trim() || 'To be specified',
        assignedTo: formData.assignedTo.trim() || 'Unassigned',
        dueDate: formData.dueDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        description: formData.description.trim() || 'Quick work order created from dashboard',
        estimatedHours: parseInt(formData.estimatedHours) || 2,
        status: 'pending',
        checklist: [],
        materials: [],
        tags: ['quick-create'],
        costEstimate: 0,
        actualCost: null,
        actualHours: null,
        feedback: [],
        attachments: [],
        starred: false,
        recurring: false,
        safetyNotes: '',
        completionRate: 0,
        lastUpdated: new Date().toISOString()
      };

      onCreate(workOrder);
      setOpen(false);
      setFormData({
        title: '',
        equipment: '',
        location: '',
        type: 'preventive',
        priority: 'medium',
        assignedTo: '',
        dueDate: '',
        description: '',
        estimatedHours: 2
      });
      toast.success("Work order created successfully!");
    } catch (error) {
      console.error('Error creating work order:', error);
      toast.error("Failed to create work order");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const quickTemplates = [
    {
      name: "Quick Inspection",
      data: {
        title: "Quick Safety Inspection",
        type: "safety",
        priority: "medium",
        estimatedHours: 1,
        description: "Routine safety inspection and verification"
      }
    },
    {
      name: "Routine Maintenance",
      data: {
        title: "Routine Maintenance Check",
        type: "preventive",
        priority: "medium",
        estimatedHours: 2,
        description: "Scheduled preventive maintenance task"
      }
    },
    {
      name: "Emergency Repair",
      data: {
        title: "Emergency Repair Request",
        type: "emergency",
        priority: "high",
        estimatedHours: 4,
        description: "Urgent repair needed for equipment failure"
      }
    }
  ];

  const applyTemplate = (template) => {
    setFormData(prev => ({
      ...prev,
      ...template.data
    }));
    toast.success(`Applied ${template.name} template`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm gap-2">
          <Plus className="h-4 w-4" />
          Quick Create
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Quick Create Work Order
          </DialogTitle>
          <DialogDescription>
            Quickly create a new work order. You can add detailed information later in the full editor.
          </DialogDescription>
        </DialogHeader>

        {/* Quick Templates */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Quick Templates</Label>
          <div className="grid grid-cols-3 gap-2">
            {quickTemplates.map((template, index) => (
              <Button
                key={index}
                type="button"
                variant="outline"
                size="sm"
                className="h-auto py-2 px-3 text-xs"
                onClick={() => applyTemplate(template)}
              >
                <div className="text-left">
                  <div className="font-medium">{template.name}</div>
                  <div className="text-slate-500">{template.data.estimatedHours}h</div>
                </div>
              </Button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium flex items-center gap-2">
                <AlertCircle className="h-3 w-3" />
                Title *
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="Enter work order title"
                required
                className="border-slate-300 dark:border-slate-600"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="equipment" className="text-sm font-medium">
                Equipment
              </Label>
              <Input
                id="equipment"
                value={formData.equipment}
                onChange={(e) => handleChange('equipment', e.target.value)}
                placeholder="Enter equipment name"
                className="border-slate-300 dark:border-slate-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location" className="text-sm font-medium">
                Location
              </Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleChange('location', e.target.value)}
                placeholder="Enter location"
                className="border-slate-300 dark:border-slate-600"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignedTo" className="text-sm font-medium">
                Assigned To
              </Label>
              <Input
                id="assignedTo"
                value={formData.assignedTo}
                onChange={(e) => handleChange('assignedTo', e.target.value)}
                placeholder="Enter assignee name"
                className="border-slate-300 dark:border-slate-600"
              />
            </div>
          </div>

          {/* Type, Priority and Due Date */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type" className="text-sm font-medium">
                Type
              </Label>
              <Select value={formData.type} onValueChange={(value) => handleChange('type', value)}>
                <SelectTrigger className="border-slate-300 dark:border-slate-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="preventive">Preventive</SelectItem>
                  <SelectItem value="corrective">Corrective</SelectItem>
                  <SelectItem value="safety">Safety</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority" className="text-sm font-medium">
                Priority
              </Label>
              <Select value={formData.priority} onValueChange={(value) => handleChange('priority', value)}>
                <SelectTrigger className="border-slate-300 dark:border-slate-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate" className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                Due Date
              </Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => handleChange('dueDate', e.target.value)}
                className="border-slate-300 dark:border-slate-600"
              />
            </div>
          </div>

          {/* Estimated Hours */}
          <div className="space-y-2">
            <Label htmlFor="estimatedHours" className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-3 w-3" />
              Estimated Hours
            </Label>
            <Input
              id="estimatedHours"
              type="number"
              step="0.5"
              min="0.5"
              max="24"
              value={formData.estimatedHours}
              onChange={(e) => handleChange('estimatedHours', e.target.value)}
              placeholder="Enter estimated hours"
              className="border-slate-300 dark:border-slate-600"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Description
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Describe the work to be performed..."
              rows={3}
              className="border-slate-300 dark:border-slate-600 resize-none"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm gap-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Create Work Order
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}