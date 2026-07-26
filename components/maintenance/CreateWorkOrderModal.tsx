'use client';
// frontend/components/maintenance/CreateWorkOrderModal.tsx
import { useState, useEffect, type FormEvent } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme, FormField, FormActions, CenterModal } from "@/components/shared/theme";
import type { WorkOrder, WorkOrderPriority, WOClassification } from "../../app/maintenance/types";
import { createWorkOrder, updateWorkOrder } from "../../app/maintenance/api";
import { nextWONumber } from "../../app/maintenance/helpers";
import { EquipmentAutocomplete, PersonAutocomplete } from "./formFields";

interface CreateModalProps { isOpen: boolean; onClose: () => void; onCreated: (newOrder: WorkOrder) => void; editingOrder?: WorkOrder; allOrders?: WorkOrder[]; }

export function CreateWorkOrderModal({ isOpen, onClose, onCreated, editingOrder, allOrders = [] }: CreateModalProps) {
  const t = useTheme();
  const blankForm = () => ({
    equipment_info: '', to_department: 'Engineering', allocated_to: '', priority: 'medium' as WorkOrderPriority,
    estimated_hours: '2', job_request_details: '', requested_by: '', authorising_foreman: '', job_instructions: '',
    date_raised: new Date().toISOString().split('T')[0], due_date: '', classification: '' as WOClassification | '',
  });
  const fromOrder = (wo: WorkOrder) => ({
    equipment_info: wo.equipment_info || '', to_department: wo.to_department || 'Engineering',
    allocated_to: wo.allocated_to || wo.artisan_name || '', priority: wo.priority || 'medium' as WorkOrderPriority,
    estimated_hours: wo.estimated_hours || '2', job_request_details: wo.job_request_details || '',
    requested_by: wo.requested_by || '', authorising_foreman: wo.authorising_foreman || wo.responsible_foreman || '',
    job_instructions: wo.job_instructions || '', date_raised: wo.date_raised || new Date().toISOString().split('T')[0],
    due_date: wo.due_date || '', classification: (wo.classification || '') as WOClassification | '',
  });

  const [form, setForm] = useState(editingOrder ? fromOrder(editingOrder) : blankForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (isOpen) setForm(editingOrder ? fromOrder(editingOrder) : blankForm()); }, [isOpen, editingOrder?.id]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const isEditing = !!editingOrder;
  const machines = form.equipment_info.split(',').map(s => s.trim()).filter(Boolean);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.equipment_info.trim() || !form.job_request_details.trim() || !form.allocated_to.trim()) { toast.error('Machine, artisan name and job request are required'); return; }
    setSaving(true);

    if (isEditing && editingOrder) {
      const updates = {
        equipment_info: form.equipment_info.trim(), to_department: form.to_department, allocated_to: form.allocated_to,
        artisan_name: form.allocated_to, priority: form.priority, estimated_hours: form.estimated_hours,
        job_request_details: form.job_request_details, requested_by: form.requested_by,
        authorising_foreman: form.authorising_foreman, responsible_foreman: form.authorising_foreman,
        job_instructions: form.job_instructions, date_raised: form.date_raised,
        // Explicit null (not '' — the API rejects that for a date column, and not
        // omitted — that would silently keep the old date) so clearing works.
        due_date: form.due_date || null,
        ...(form.classification ? { classification: form.classification } : {}),
      };
      try {
        await updateWorkOrder(editingOrder.id, updates);
        toast.success('Work order updated');
        onCreated({ ...editingOrder, ...updates } as WorkOrder);
        onClose();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to update work order');
      } finally {
        setSaving(false);
      }
      return;
    }

    const created: WorkOrder[] = [];
    const failed: string[] = [];
    for (let i = 0; i < machines.length; i++) {
      try {
        const wo = await createWorkOrder({
        work_order_number: nextWONumber(allOrders, created.length), equipment_info: machines[i],
        to_department: form.to_department, allocated_to: form.allocated_to, priority: form.priority,
        estimated_hours: form.estimated_hours, job_request_details: form.job_request_details,
        requested_by: form.requested_by, authorising_foreman: form.authorising_foreman,
        job_instructions: form.job_instructions, date_raised: form.date_raised,
        to_section: '', from_department: '', from_section: '', account_number: '', user_lab_today: '',
        time_raised: new Date().toTimeString().slice(0, 5),
        job_type: { operational: false, maintenance: true, mining: false },
        authorising_engineer: '', responsible_foreman: form.authorising_foreman, manpower: [],
        work_done_details: '', cause_of_failure: '', delay_details: '',
        artisan_name: form.allocated_to, artisan_sign: '', artisan_date: '',
        foreman_name: '', foreman_sign: '', foreman_date: '',
        time_work_started: '', time_work_finished: '', total_time_worked: '',
        overtime_start_time: '', overtime_end_time: '', overtime_hours: '',
        delay_from_time: '', delay_to_time: '', total_delay_hours: '',
          status: 'pending', progress: 0,
          // Omitted when blank — '' fails date validation on the API.
          ...(form.due_date ? { due_date: form.due_date } : {}),
          ...(form.classification ? { classification: form.classification } : {}),
        });
        created.push(wo);
      } catch (e) {
        failed.push(machines[i]);
        console.error('createWorkOrder failed for', machines[i], e);
      }
    }
    setSaving(false);
    if (failed.length > 0) {
      // Say which machines did not get a work order. This used to report
      // success and quietly keep them in localStorage.
      toast.error(`Could not create work order${failed.length === 1 ? '' : 's'} for: ${failed.join(', ')}`);
    }
    if (created.length > 0) {
      toast.success(created.length > 1 ? `${created.length} work orders created` : 'Work order created');
      setForm(blankForm());
      created.forEach(wo => onCreated(wo));
      if (failed.length === 0) onClose();
    } else toast.error('Failed to create work order');
  };

  return (
    <CenterModal open={isOpen} onClose={onClose} title={isEditing ? `Edit Work Order — ${editingOrder?.work_order_number}` : 'New Work Order'} accent="violet" width="max-w-2xl">
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <FormField label={<>Machine / Equipment <span className={`ml-1.5 font-normal ${t.textFaint}`}>— comma-separate for multiple</span></> as unknown as string} required>
          <EquipmentAutocomplete value={form.equipment_info} onChange={v => set('equipment_info', v)} />
        </FormField>
        <FormField label="Department"><Input value={form.to_department} onChange={e => set('to_department', e.target.value)} placeholder="Engineering" className={`h-9 ${t.inputBg}`} /></FormField>
        <PersonAutocomplete label="Allocated To (Artisan)" value={form.allocated_to} onChange={v => set('allocated_to', v)} />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <FormField label="Priority">
            <Select value={form.priority} onValueChange={v => set('priority', v)}>
              <SelectTrigger className={`h-9 ${t.inputBg}`}><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="urgent">Urgent</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent>
            </Select>
          </FormField>
          <FormField label="Est. Hours"><Input type="number" min="0.5" step="0.5" value={form.estimated_hours} onChange={e => set('estimated_hours', e.target.value)} className={`h-9 ${t.inputBg}`} /></FormField>
          <FormField label="Date Raised"><Input type="date" title="Date raised" value={form.date_raised} onChange={e => set('date_raised', e.target.value)} className={`h-9 ${t.inputBg}`} /></FormField>
          {/* Drives the Overdue KPI and the overdue badge on each row. Optional —
              blank means "no deadline", not "due today". */}
          <FormField label="Due Date"><Input type="date" title="Due date — when this work must be complete" min={form.date_raised} value={form.due_date} onChange={e => set('due_date', e.target.value)} className={`h-9 ${t.inputBg}`} /></FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <PersonAutocomplete label="Requested By" value={form.requested_by} onChange={v => set('requested_by', v)} placeholder="Who is requesting this work?" />
          <PersonAutocomplete label="Authorising Foreman" value={form.authorising_foreman} onChange={v => set('authorising_foreman', v)} />
        </div>
        <FormField label="Job Request — What to Do" required><Textarea value={form.job_request_details} onChange={e => set('job_request_details', e.target.value)} placeholder="Describe exactly what the artisan needs to do…" rows={4} className={`resize-none ${t.inputBg}`} /></FormField>
        <FormField label="Special Instructions (optional)"><Textarea value={form.job_instructions} onChange={e => set('job_instructions', e.target.value)} placeholder="Safety notes, special tools, access requirements…" rows={2} className={`resize-none ${t.inputBg}`} /></FormField>
        <FormField label={<>Work Order Classification <span className={`font-normal ${t.textFaint}`}>(optional — artisan can update later)</span></> as unknown as string}>
          <div className="flex flex-wrap gap-2">
            {([{ key: 'planned_maintenance', label: 'Planned Maint.' }, { key: 'project', label: 'Project' }, { key: 'breakdown', label: 'Breakdown' }, { key: 'custom', label: 'Other / Custom' }] as { key: WOClassification; label: string }[]).map(opt => (
              <button key={opt.key} type="button" onClick={() => set('classification', form.classification === opt.key ? '' : opt.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${form.classification === opt.key ? 'bg-brand-500/20 text-brand-400' : `${t.chipBg} ${t.textFaint} ${t.hoverBg}`}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </FormField>
        <FormActions onCancel={onClose} submitting={saving} submitLabel={isEditing ? 'Save Changes' : machines.length > 1 ? `Create ${machines.length} Work Orders` : 'Create Work Order'} accent="violet" />
      </form>
    </CenterModal>
  );
}
