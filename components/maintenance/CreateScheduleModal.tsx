'use client';
// frontend/components/maintenance/CreateScheduleModal.tsx
import { useState, useEffect, type FormEvent } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme, FormField, FormActions, CenterModal, Repeat2, X } from "@/components/shared/theme";
import type { MaintenanceSchedule, WorkOrderPriority, RecurrenceType } from "../../app/maintenance/types";
import { DOW, MON } from "../../app/maintenance/helpers";
import { EquipmentAutocomplete, PersonAutocomplete } from "./formFields";

interface CreateScheduleModalProps { isOpen: boolean; initial: MaintenanceSchedule | null; onClose: () => void; onSave: (s: MaintenanceSchedule) => void; }

export function CreateScheduleModal({ isOpen, initial, onClose, onSave }: CreateScheduleModalProps) {
  const t = useTheme();
  const today = new Date().toISOString().split('T')[0];

  const blankForm = () => ({
    name: '', equipment_info: '', to_department: '',
    allocated_to: typeof window !== 'undefined' ? localStorage.getItem('maint_artisan_name') || '' : '',
    authorising_foreman: typeof window !== 'undefined' ? localStorage.getItem('maint_foreman_name') || '' : '',
    estimated_hours: '2', job_request_details: '', job_instructions: '', priority: 'medium' as WorkOrderPriority,
    recurrence_type: 'weekly' as RecurrenceType, recurrence_dow: 1, recurrence_dom: 1,
    recurrence_months: [0, 3, 6, 9] as number[], specific_dates: [] as string[], advance_days: 1, start_date: today,
  });

  const [form, setForm] = useState(blankForm);
  const [newDate, setNewDate] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (initial) {
      setForm({
        name: initial.name, equipment_info: initial.equipment_info, to_department: initial.to_department,
        allocated_to: initial.allocated_to, authorising_foreman: initial.authorising_foreman,
        estimated_hours: initial.estimated_hours, job_request_details: initial.job_request_details,
        job_instructions: initial.job_instructions, priority: initial.priority, recurrence_type: initial.recurrence_type,
        recurrence_dow: initial.recurrence_dow, recurrence_dom: initial.recurrence_dom,
        recurrence_months: initial.recurrence_months ?? [], specific_dates: initial.specific_dates ?? [],
        advance_days: initial.advance_days ?? 1, start_date: initial.next_due_date || today,
      });
    } else setForm(blankForm());
  }, [isOpen, initial]);

  const set = <K extends keyof ReturnType<typeof blankForm>>(k: K, v: ReturnType<typeof blankForm>[K]) => setForm(f => ({ ...f, [k]: v }));
  const toggleMonth = (m: number) => setForm(f => ({ ...f, recurrence_months: f.recurrence_months.includes(m) ? f.recurrence_months.filter(x => x !== m) : [...f.recurrence_months, m].sort((a, b) => a - b) }));
  const addDate = () => { if (!newDate || form.specific_dates.includes(newDate)) return; setForm(f => ({ ...f, specific_dates: [...f.specific_dates, newDate].sort() })); setNewDate(''); };
  const removeDate = (d: string) => setForm(f => ({ ...f, specific_dates: f.specific_dates.filter(x => x !== d) }));

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.equipment_info.trim() || !form.job_request_details.trim()) { toast.error('Schedule name, equipment, and job request are required'); return; }
    if (form.recurrence_type === 'custom' && form.specific_dates.length === 0) { toast.error('Add at least one date for a custom schedule'); return; }
    const schedule: MaintenanceSchedule = {
      id: initial?.id || Date.now().toString(), name: form.name.trim(), equipment_info: form.equipment_info.trim(),
      to_department: form.to_department, allocated_to: form.allocated_to, authorising_foreman: form.authorising_foreman,
      estimated_hours: form.estimated_hours, job_request_details: form.job_request_details.trim(),
      job_instructions: form.job_instructions, priority: form.priority, recurrence_type: form.recurrence_type,
      recurrence_dow: form.recurrence_dow, recurrence_dom: form.recurrence_dom, recurrence_months: form.recurrence_months,
      specific_dates: form.specific_dates, advance_days: form.advance_days, active: initial?.active ?? true,
      next_due_date: form.start_date, last_generated: initial?.last_generated || '', created_at: initial?.created_at || new Date().toISOString(),
    };
    onSave(schedule);
    onClose();
  };

  return (
    <CenterModal open={isOpen} onClose={onClose} title={initial ? 'Edit Recurring Schedule' : 'New Recurring Schedule'} accent="violet" width="max-w-2xl">
      <form onSubmit={handleSave} className="p-5 space-y-4">
        <FormField label="Schedule Name" required><Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Weekly Compressor Check" className={`h-9 ${t.inputBg}`} /></FormField>
        <FormField label="Machine / Equipment" required><EquipmentAutocomplete value={form.equipment_info} onChange={v => set('equipment_info', v)} /></FormField>
        <FormField label="Department"><Input value={form.to_department} onChange={e => set('to_department', e.target.value)} placeholder="Engineering…" className={`h-9 ${t.inputBg}`} /></FormField>
        <div className="grid grid-cols-2 gap-3">
          <PersonAutocomplete label="Allocated To" value={form.allocated_to} onChange={v => set('allocated_to', v)} />
          <PersonAutocomplete label="Authorising Foreman" value={form.authorising_foreman} onChange={v => set('authorising_foreman', v)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Est. Hours"><Input type="number" min="0.5" step="0.5" value={form.estimated_hours} onChange={e => set('estimated_hours', e.target.value)} className={`h-9 ${t.inputBg}`} /></FormField>
          <FormField label="Priority">
            <Select value={form.priority} onValueChange={v => set('priority', v as WorkOrderPriority)}>
              <SelectTrigger className={`h-9 ${t.inputBg}`}><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="urgent">Urgent</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent>
            </Select>
          </FormField>
        </div>

        <div className={`space-y-3 border ${t.border} rounded-xl p-4`}>
          <div className={`flex items-center gap-2 text-sm font-medium ${t.textMuted}`}><Repeat2 className="h-4 w-4 text-brand-400" /> Recurrence</div>
          <div className="flex flex-wrap gap-1.5">
            {(['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly', 'custom'] as RecurrenceType[]).map(rt => (
              <button key={rt} type="button" onClick={() => set('recurrence_type', rt)} className={`px-3 py-1 rounded-lg text-xs transition-colors capitalize ${form.recurrence_type === rt ? 'bg-brand-500/20 text-brand-400 font-medium' : `${t.chipBg} ${t.textFaint} ${t.hoverBg}`}`}>{rt}</button>
            ))}
          </div>
          {(form.recurrence_type === 'weekly' || form.recurrence_type === 'biweekly') && (
            <FormField label="Day of Week">
              <div className="flex gap-1">{DOW.map((d, i) => <button key={d} type="button" onClick={() => set('recurrence_dow', i)} className={`flex-1 py-1.5 rounded text-[11px] transition-colors ${form.recurrence_dow === i ? 'bg-brand-500/20 text-brand-400' : `${t.chipBg} ${t.textFaint} ${t.hoverBg}`}`}>{d.slice(0, 3)}</button>)}</div>
            </FormField>
          )}
          {(form.recurrence_type === 'monthly' || form.recurrence_type === 'quarterly' || form.recurrence_type === 'yearly') && (
            <FormField label="Day of Month (1–28)"><Input type="number" min="1" max="28" value={form.recurrence_dom} onChange={e => set('recurrence_dom', Math.min(28, Math.max(1, parseInt(e.target.value) || 1)))} className={`h-9 ${t.inputBg}`} /></FormField>
          )}
          {form.recurrence_type === 'quarterly' && (
            <FormField label="Which months"><div className="flex flex-wrap gap-1.5">{MON.map((m, i) => <button key={m} type="button" onClick={() => toggleMonth(i)} className={`px-2.5 py-1 rounded text-[11px] transition-colors ${form.recurrence_months.includes(i) ? 'bg-brand-500/20 text-brand-400' : `${t.chipBg} ${t.textFaint} ${t.hoverBg}`}`}>{m}</button>)}</div></FormField>
          )}
          {form.recurrence_type === 'yearly' && (
            <FormField label="Month of Year">
              <Select value={String(form.recurrence_months[0] ?? 0)} onValueChange={v => set('recurrence_months', [parseInt(v)])}>
                <SelectTrigger className={`h-9 ${t.inputBg}`}><SelectValue /></SelectTrigger>
                <SelectContent>{MON.map((m, i) => <SelectItem key={m} value={String(i)}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
          )}
          {form.recurrence_type === 'custom' && (
            <FormField label="Specific Dates">
              <div className="flex gap-2">
                <Input type="date" title="Add date" value={newDate} onChange={e => setNewDate(e.target.value)} className={`flex-1 h-9 ${t.inputBg}`} />
                <Button type="button" onClick={addDate} size="sm" className="bg-brand-500/15 hover:bg-brand-500/25 text-brand-400">Add</Button>
              </div>
              {form.specific_dates.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {form.specific_dates.map(d => <span key={d} className={`flex items-center gap-1 ${t.chipBg} rounded px-2 py-0.5 text-xs ${t.textMuted}`}>{d}<button type="button" onClick={() => removeDate(d)} title={`Remove ${d}`} className={`${t.textFaint} hover:text-rose-500 ml-0.5`}><X className="h-2.5 w-2.5" /></button></span>)}
                </div>
              )}
            </FormField>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField label={initial ? 'Next Due Date' : 'First Occurrence Date'}><Input type="date" title="Start date" value={form.start_date} onChange={e => set('start_date', e.target.value)} className={`h-9 ${t.inputBg}`} /></FormField>
          <FormField label="Generate work order ___ days early"><Input type="number" min="0" max="14" value={form.advance_days} onChange={e => set('advance_days', Math.max(0, parseInt(e.target.value) || 0))} className={`h-9 ${t.inputBg}`} /></FormField>
        </div>
        <FormField label="Job Request — What to Do" required><Textarea value={form.job_request_details} onChange={e => set('job_request_details', e.target.value)} placeholder="Describe exactly what the artisan needs to do on each occurrence…" rows={3} className={`resize-none ${t.inputBg}`} /></FormField>
        <FormField label="Special Instructions (optional)"><Textarea value={form.job_instructions} onChange={e => set('job_instructions', e.target.value)} placeholder="Safety notes, tools, access…" rows={2} className={`resize-none ${t.inputBg}`} /></FormField>
        <FormActions onCancel={onClose} submitLabel={initial ? 'Update Schedule' : 'Create Schedule'} accent="violet" />
      </form>
    </CenterModal>
  );
}
