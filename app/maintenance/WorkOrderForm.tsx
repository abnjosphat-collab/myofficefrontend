// app/maintenance/WorkOrderForm.tsx — raise a work order (one for each machine chosen) or edit the request on an existing one: what
// to do, who does it, who asked, who authorised it, when it is due. The artisan and foreman fill in the rest from the work order.
// A machine the server refuses stays in the list with its reason, and the ones that were raised are not repeated on a retry. People and
// tools are picked from the registers (see RegisterField); someone on leave cannot be put on the job, here or on the server.
'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Field, FormDialog, Input, Segmented, Select, Textarea } from '@/components/ui-system';
import { todayLocal } from '@/lib/dates';
import { conflictOf, createWorkOrder, getWorkOrderTools, saveWorkOrderTools, updateWorkOrder } from './api';
import { editOrderBody, machinesOf, newOrderBody, nextWONumber, type RequestForm } from './helpers';
import { MachinePicker } from './MachinePicker';
import { CLASSIFICATIONS, PRIORITY } from './meta';
import { RegisterField } from './RegisterField';
import { PermitsField } from './PermitsField';
import { ToolsNeeded } from './ToolsNeeded';
import { usePersonOptions } from './useRegisters';
import type { WorkOrder, WorkOrderPriority, WorkOrderTool } from './types';

const blank = (): RequestForm => ({ equipment_info: '', to_department: 'Engineering', allocated_to: '', priority: 'medium', estimated_hours: '2', job_request_details: '', requested_by: '', authorising_foreman: '', job_instructions: '', date_raised: todayLocal(), due_date: '', classification: '', permits: {} });
const fromOrder = (w: WorkOrder): RequestForm => ({
  equipment_info: w.equipment_info || '', to_department: w.to_department || 'Engineering', allocated_to: w.allocated_to || w.artisan_name || '', priority: w.priority || 'medium', estimated_hours: w.estimated_hours || '2',
  job_request_details: w.job_request_details || '', requested_by: w.requested_by || '', authorising_foreman: w.authorising_foreman || w.responsible_foreman || '', job_instructions: w.job_instructions || '',
  date_raised: w.date_raised || todayLocal(), due_date: w.due_date || '', classification: w.classification || '', permits: w.permits ?? {},
});
const sameTools = (a: WorkOrderTool[], b: WorkOrderTool[]) => JSON.stringify(a.map(t => [t.tool_register_number, t.tool_name])) === JSON.stringify(b.map(t => [t.tool_register_number, t.tool_name]));
const PRIORITIES = (Object.keys(PRIORITY) as WorkOrderPriority[]).map(value => ({ value, label: PRIORITY[value].label }));
const CLASSES = [{ value: '', label: 'Not set' }, ...CLASSIFICATIONS.map(c => ({ value: c.value as string, label: c.label }))];

export function WorkOrderForm({ open, order, allOrders, onOpenChange, onChanged }: {
  open: boolean; order: WorkOrder | null; allOrders: WorkOrder[]; onOpenChange: (open: boolean) => void; onChanged: (updated?: WorkOrder) => void;
}) {
  const [form, setForm] = useState<RequestForm>(blank);
  const [touched, setTouched] = useState(false);
  const [knownVersion, setKnownVersion] = useState<number | undefined>(undefined);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [tools, setTools] = useState<WorkOrderTool[]>([]);
  const [savedTools, setSavedTools] = useState<WorkOrderTool[]>([]);
  const [toolsState, setToolsState] = useState<{ loaded: boolean; error: string | null }>({ loaded: true, error: null });
  const people = usePersonOptions();
  const key = open ? String(order?.id ?? 'new') : null;
  if (key !== loadedFor) { setLoadedFor(key); if (key !== null) { setTouched(false); setKnownVersion(undefined); setForm(order ? fromOrder(order) : blank()); setTools([]); setSavedTools([]); setToolsState({ loaded: !order, error: null }); } }
  const orderId = order?.id;
  useEffect(() => {
    if (!open || !orderId) return;
    let live = true;
    getWorkOrderTools(orderId).then(t => { if (live) { setTools(t); setSavedTools(t); setToolsState({ loaded: true, error: null }); } })
      .catch(e => { if (live) setToolsState({ loaded: false, error: e instanceof Error ? e.message : 'Not loaded.' }); });
    return () => { live = false; };
  }, [open, orderId]);
  const editing = !!order;
  const set = (patch: Partial<RequestForm>) => setForm(f => ({ ...f, ...patch }));
  const machines = machinesOf(form.equipment_info);
  const missing = { machine: machines.length === 0, person: !form.allocated_to.trim(), job: !form.job_request_details.trim() };
  const err = (bad: boolean, msg: string) => (touched && bad ? msg : undefined);

  const submit = async () => {
    setTouched(true);
    if (Object.values(missing).some(Boolean)) return false;
    if (editing && order) {
      let updated: WorkOrder;
      try {
        updated = await updateWorkOrder(order.id, editOrderBody({ ...form, equipment_info: machines[0] }), knownVersion ?? order.version);
      } catch (e) {
        // Someone saved first. Keep what was typed (the dialog stays open); the next Save replaces their change in the same fields.
        const theirs = conflictOf(e);
        if (!theirs) throw e;
        setKnownVersion(theirs.version);
        throw new Error('Someone else saved this work order first. Your changes are still here. Press Save changes again to replace theirs, or close this window to keep theirs.');
      }
      let toolsNote = '';
      if (toolsState.loaded && !sameTools(tools, savedTools)) {
        try { await saveWorkOrderTools(order.id, tools); setSavedTools(tools); }
        catch (e) { toolsNote = ` Its tools were not saved: ${e instanceof Error ? e.message : 'try again.'}`; }
      }
      onChanged(updated);
      if (toolsNote) toast.warning(`Work order updated.${toolsNote}`); else toast.success('Work order updated.');
      return;
    }
    const failed: { machine: string; reason: string }[] = [];
    let raised = 0;
    let toolsLost = 0;
    for (const machine of machines) {
      try {
        const created = await createWorkOrder(newOrderBody(form, machine, nextWONumber(allOrders, raised)));
        raised += 1;
        if (tools.length && created.id) { try { await saveWorkOrderTools(created.id, tools); } catch { toolsLost += 1; } }
      } catch (e) { failed.push({ machine, reason: e instanceof Error ? e.message : 'Not saved.' }); }
    }
    if (raised) {
      onChanged();
      const base = raised > 1 ? `${raised} work orders raised.` : 'Work order raised.';
      if (toolsLost) toast.warning(`${base} The tools list was not saved on ${toolsLost}: open ${toolsLost > 1 ? 'them' : 'it'} and add the tools again.`); else toast.success(base);
    }
    if (failed.length) {
      set({ equipment_info: failed.map(f => f.machine).join(', ') });
      throw new Error(`${raised} raised, ${failed.length} not. ${failed.map(f => `${f.machine}: ${f.reason}`).join(' ')}`);
    }
    return undefined;
  };

  return (
    <FormDialog
      open={open} onOpenChange={onOpenChange} size="lg" title={editing ? `Edit work order ${order.work_order_number}` : 'New work order'} description={editing ? order.equipment_info : 'The machine, the job and who does it are required.'}
      submitLabel={editing ? 'Save changes' : machines.length > 1 ? `Raise ${machines.length} work orders` : 'Raise work order'} onSubmit={submit}
    >
      <div className="flex flex-col gap-5">
        {editing
          ? <Field label="Machine" required error={err(missing.machine, 'Enter the machine.')}><Input value={form.equipment_info} onChange={e => set({ equipment_info: e.target.value })} /></Field>
          : <MachinePicker value={form.equipment_info} onChange={v => set({ equipment_info: v })} error={err(missing.machine, 'Add at least one machine.')} />}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Department"><Input value={form.to_department} onChange={e => set({ to_department: e.target.value })} placeholder="Engineering" /></Field>
          <Field label="Allocated to (artisan)" required error={err(missing.person, 'Enter who will do the job.')}><RegisterField value={form.allocated_to} onChange={v => set({ allocated_to: v })} options={people.assignable} registerName="employees register" placeholder="Type to search employees" note={people.leaveError ? 'Leave could not be checked here; the server will refuse anyone on leave.' : null} /></Field>
          <Field label="Priority"><Select aria-label="Priority" value={form.priority} onValueChange={v => set({ priority: v as WorkOrderPriority })} options={PRIORITIES} /></Field>
          <Field label="Estimated hours"><Input type="number" min={0.5} step={0.5} value={form.estimated_hours} onChange={e => set({ estimated_hours: e.target.value })} /></Field>
          <Field label="Date raised"><Input type="date" value={form.date_raised} onChange={e => set({ date_raised: e.target.value })} /></Field>
          <Field label="Due date" optional description="Blank means no deadline, not due today."><Input type="date" min={form.date_raised} value={form.due_date} onChange={e => set({ due_date: e.target.value })} /></Field>
          <Field label="Requested by" optional><RegisterField value={form.requested_by} onChange={v => set({ requested_by: v })} options={people.anyone} registerName="employees register" placeholder="Who is asking for this work?" /></Field>
          <Field label="Authorising foreman" optional><RegisterField value={form.authorising_foreman} onChange={v => set({ authorising_foreman: v })} options={people.assignable} registerName="employees register" placeholder="Type to search employees" /></Field>
        </div>
        <Field label="Job request: what to do" required error={err(missing.job, 'Describe what the artisan should do.')}><Textarea rows={3} value={form.job_request_details} onChange={e => set({ job_request_details: e.target.value })} placeholder="Describe exactly what the artisan has to do" /></Field>
        <ToolsNeeded tools={tools} onChange={setTools} loadError={editing && !toolsState.loaded ? toolsState.error : null} locked={editing && !toolsState.loaded} />
        <PermitsField value={form.permits} onChange={permits => set({ permits })} />
        <Field label="Special instructions" optional><Textarea rows={2} value={form.job_instructions} onChange={e => set({ job_instructions: e.target.value })} placeholder="Safety notes, special tools, access needed" /></Field>
        <div className="flex flex-col gap-1.5"><span className="font-sans text-label font-medium text-ink">Classification <span className="font-normal text-ink-muted">Optional, the artisan can set it later</span></span><Segmented label="Classification" value={form.classification} onValueChange={v => set({ classification: v as RequestForm['classification'] })} options={CLASSES} /></div>
      </div>
    </FormDialog>
  );
}
