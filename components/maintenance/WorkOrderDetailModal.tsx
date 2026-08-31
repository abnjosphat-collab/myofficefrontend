'use client';
// frontend/components/maintenance/WorkOrderDetailModal.tsx
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  useTheme, FormField, CenterModal, StatusBadge, useConfirm, InfoRow, TYPE_SCALE, RADIUS,
} from "@/components/shared/theme";
import {
  FileText, HardHat, ShieldCheck, Layers, Settings2, Zap, Timer, Package, Signature, Save, Trash2, X,
} from "@/components/shared/theme";
import type { WorkOrder, SpareItem, WOClassification, Discipline, Trade } from "../../app/maintenance/types";
import { updateWorkOrder } from "../../app/maintenance/api";
import { statusCfg, priorityCfg, isOverdue } from "../../app/maintenance/helpers";
import { ThemedInput, NAToggle, PredictiveArea, PersonAutocomplete, SpareAutocomplete } from "./formFields";
import { lineTotal } from "@/components/shared/utils";

const FAILURE_MODES = [
  'Bearing failure', 'Seal / gasket failure', 'Motor failure', 'Belt / chain failure',
  'Shaft failure', 'Coupling failure', 'Gearbox failure', 'Pump failure', 'Valve failure',
  'Electrical fault', 'Lubrication failure', 'Structural failure / cracking',
  'Overheating', 'Blockage / fouling', 'Corrosion', 'Wear & tear', 'Operator error',
  'Foreign object damage', 'Calibration drift', 'Other',
];
const MECHANICAL_TRADES: Trade[] = ['Fitter', 'Boilermaker', 'Rigger', 'Plumber', 'Carpenter'];

function calcTotal(start: string, end: string): string {
  if (!start || !end) return '';
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins < 0) mins += 1440;
  return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m`;
}

interface DetailModalProps { workOrder: WorkOrder; onClose: () => void; onRefresh: () => void; onDelete: (id: string) => void; }

export function WorkOrderDetailModal({ workOrder, onClose, onRefresh, onDelete }: DetailModalProps) {
  const t = useTheme();
  const confirm = useConfirm();
  // Light-mode crisping. The modal is white (t.glass), but the accents/labels below
  // were tuned for dark glass: -400 shades and textFaint (gray-500) wash out on white.
  // Bump accents to -600 and give the primary buttons a solid fill in light mode.
  const light = t.light;
  const ic = {
    brand: light ? 'text-brand-600' : 'text-brand-400',
    cyan: light ? 'text-cyan-600' : 'text-cyan-400',
    violet: light ? 'text-violet-600' : 'text-violet-400',
    amber: light ? 'text-amber-600' : 'text-amber-400',
  };
  const subLabel = light ? 'text-gray-600' : t.textFaint;   // section sub-headers / field-group labels
  const btnCyan = light ? 'bg-cyan-600 hover:bg-cyan-700 text-white shadow-sm' : 'bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400';
  const btnViolet = light ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-sm' : 'bg-violet-500/15 hover:bg-violet-500/25 text-violet-400';
  const [activeTab, setActiveTab] = useState<'request' | 'artisan' | 'foreman'>('artisan');
  const [savingA, setSavingA] = useState(false);
  const [savingF, setSavingF] = useState(false);
  const [otNA, setOtNA] = useState(false);
  const [delayNA, setDelayNA] = useState(false);
  const today = new Date().toISOString().split('T')[0];
  const [artisanSpares, setArtisanSpares] = useState<SpareItem[]>(workOrder.spares_used || []);
  const [newSpare, setNewSpare] = useState({ name: '', quantity: '1', unit_cost: '0' });

  const [artisan, setArtisan] = useState(() => {
    const savedName = typeof window !== 'undefined' ? localStorage.getItem('maint_artisan_name') || '' : '';
    return {
      work_done_details: workOrder.work_done_details || '', cause_of_failure: workOrder.cause_of_failure || '',
      delay_details: workOrder.delay_details || '', time_work_started: workOrder.time_work_started || '',
      time_work_finished: workOrder.time_work_finished || '', total_time_worked: workOrder.total_time_worked || '',
      overtime_start_time: workOrder.overtime_start_time || '', overtime_end_time: workOrder.overtime_end_time || '',
      overtime_hours: workOrder.overtime_hours || '', delay_from_time: workOrder.delay_from_time || '',
      delay_to_time: workOrder.delay_to_time || '', total_delay_hours: workOrder.total_delay_hours || '',
      artisan_name: workOrder.artisan_name || workOrder.allocated_to || savedName,
      artisan_sign: workOrder.artisan_sign || '', artisan_date: workOrder.artisan_date || today,
      status: workOrder.status, progress: workOrder.progress,
      classification: workOrder.classification || '' as WOClassification | '',
      classification_custom: workOrder.classification_custom || '', failure_mode: workOrder.failure_mode || '',
      discipline: workOrder.discipline || '' as Discipline | '', trade: workOrder.trade || '' as Trade | '',
    };
  });

  const [foreman, setForeman] = useState(() => {
    const savedName = typeof window !== 'undefined' ? localStorage.getItem('maint_foreman_name') || '' : '';
    return { foreman_name: workOrder.foreman_name || savedName, foreman_sign: workOrder.foreman_sign || '', foreman_date: workOrder.foreman_date || today, notes: workOrder.notes || '', status: workOrder.status, progress: workOrder.progress };
  });

  const setA = (k: string, v: string | number) => setArtisan(f => ({ ...f, [k]: v }));
  const setF = (k: string, v: string | number) => setForeman(f => ({ ...f, [k]: v }));

  useEffect(() => { const tt = calcTotal(artisan.time_work_started, artisan.time_work_finished); setArtisan(f => ({ ...f, total_time_worked: tt })); }, [artisan.time_work_started, artisan.time_work_finished]);
  useEffect(() => { const tt = calcTotal(artisan.overtime_start_time, artisan.overtime_end_time); setArtisan(f => ({ ...f, overtime_hours: tt })); }, [artisan.overtime_start_time, artisan.overtime_end_time]);
  useEffect(() => { const tt = calcTotal(artisan.delay_from_time, artisan.delay_to_time); setArtisan(f => ({ ...f, total_delay_hours: tt })); }, [artisan.delay_from_time, artisan.delay_to_time]);
  useEffect(() => { if (otNA) setArtisan(f => ({ ...f, overtime_start_time: '', overtime_end_time: '', overtime_hours: '' })); }, [otNA]);
  useEffect(() => { if (delayNA) setArtisan(f => ({ ...f, delay_from_time: '', delay_to_time: '', total_delay_hours: '' })); }, [delayNA]);

  const addArtisanSpare = () => {
    const name = newSpare.name.trim(); if (!name) return;
    setArtisanSpares(prev => [...prev, { id: Date.now().toString(), name, quantity: parseFloat(newSpare.quantity) || 1, unit_cost: parseFloat(newSpare.unit_cost) || 0 }]);
    setNewSpare({ name: '', quantity: '1', unit_cost: '0' });
  };

  const saveArtisan = async () => {
    setSavingA(true);
    if (artisan.artisan_name) localStorage.setItem('maint_artisan_name', artisan.artisan_name);
    const payload = {
      ...artisan,
      classification: artisan.classification || undefined,
      classification_custom: artisan.classification === 'custom' ? artisan.classification_custom : undefined,
      failure_mode: artisan.classification === 'breakdown' ? artisan.failure_mode || undefined : undefined,
      discipline: artisan.discipline || undefined,
      trade: artisan.discipline === 'Mechanical' ? artisan.trade || undefined : undefined,
      spares_used: artisanSpares.length > 0 ? artisanSpares : undefined,
    };
    try {
      await updateWorkOrder(workOrder.id, payload);
      toast.success('Artisan report saved');
      await onRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save artisan report');
    } finally {
      setSavingA(false);
    }
  };

  const saveForeman = async () => {
    setSavingF(true);
    if (foreman.foreman_name) localStorage.setItem('maint_foreman_name', foreman.foreman_name);
    try {
      await updateWorkOrder(workOrder.id, foreman);
      toast.success('Foreman sign-off saved');
      await onRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save foreman sign-off');
    } finally {
      setSavingF(false);
    }
  };

  const scfg = statusCfg(workOrder.status);
  const pcfg = priorityCfg(workOrder.priority);
  const overdue = isOverdue(workOrder);

  return (
    <CenterModal open onClose={onClose} title={`#${workOrder.work_order_number}`} subtitle={workOrder.equipment_info} accent="violet" width="max-w-3xl">
      <div className="px-5 pt-3">
        <div className="flex items-center gap-2 pb-3">
          <StatusBadge color={scfg.color} label={scfg.label} dot />
          <StatusBadge color={pcfg.color} label={pcfg.label} />
        </div>
      </div>
      <div className="px-5 pb-5">
        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as typeof activeTab)}>
          <TabsList className={`w-full ${t.chipBg} p-[3px] h-auto ${RADIUS.tile} mb-4`}>
            <TabsTrigger value="request" className={`flex-1 gap-1.5 py-1.5 ${TYPE_SCALE.body} font-medium tracking-tight data-[state=active]:bg-brand-500/15 ${light ? 'data-[state=active]:text-brand-700' : 'data-[state=active]:text-brand-400'} data-[state=active]:shadow-sm ${subLabel}`}>
              <FileText className="h-3.5 w-3.5" /> Work Request
            </TabsTrigger>
            <TabsTrigger value="artisan" className={`flex-1 gap-1.5 py-1.5 ${TYPE_SCALE.body} font-medium tracking-tight data-[state=active]:bg-cyan-500/15 ${light ? 'data-[state=active]:text-cyan-700' : 'data-[state=active]:text-cyan-400'} data-[state=active]:shadow-sm ${subLabel}`}>
              <HardHat className="h-3.5 w-3.5" /> Artisan Report
            </TabsTrigger>
            <TabsTrigger value="foreman" className={`flex-1 gap-1.5 py-1.5 ${TYPE_SCALE.body} font-medium tracking-tight data-[state=active]:bg-violet-500/15 ${light ? 'data-[state=active]:text-violet-700' : 'data-[state=active]:text-violet-400'} data-[state=active]:shadow-sm ${subLabel}`}>
              <ShieldCheck className="h-3.5 w-3.5" /> Foreman Sign-off
            </TabsTrigger>
          </TabsList>

          {/* TAB: Work Request */}
          <TabsContent value="request">
            <div className={`${t.glassSoft} ${t.shadow} rounded-xl overflow-hidden`}>
              <div className={`flex items-center gap-2 px-4 py-3 border-b ${t.border}`}>
                <FileText className={`h-3.5 w-3.5 ${ic.brand}`} />
                <span className={`font-semibold ${TYPE_SCALE.body} tracking-tight ${t.textPrimary}`}>Work Request</span>
                <span className={`ml-auto text-xs ${t.textFaint}`}>supervisor-issued · read-only</span>
              </div>
              <div className="px-4 pt-3 pb-3 grid grid-cols-3 gap-x-6 gap-y-2">
                <InfoRow label="Machine" value={workOrder.equipment_info} />
                <InfoRow label="Allocated To" value={workOrder.allocated_to || workOrder.artisan_name} />
                <InfoRow label="Date Raised" value={workOrder.date_raised} />
                <InfoRow label="Due Date" value={workOrder.due_date
                  ? <span className={overdue ? 'text-rose-600 font-semibold' : ''}>{workOrder.due_date}{overdue && ' — overdue'}</span>
                  : undefined} />
                {workOrder.job_request_details && (
                  <div className="col-span-3 mt-1">
                    <div className={`text-[10px] uppercase tracking-wide mb-0.5 ${t.textFaint}`}>Job</div>
                    <div className={`text-xs leading-relaxed ${t.textPrimary}`}>{workOrder.job_request_details}</div>
                  </div>
                )}
              </div>
              <div className={`px-4 pb-4 pt-2 border-t ${t.border} grid grid-cols-2 gap-x-8 gap-y-3 mt-1`}>
                <InfoRow label="Department" value={workOrder.to_department} />
                <InfoRow label="Estimated Hours" value={workOrder.estimated_hours ? `${workOrder.estimated_hours} h` : ''} />
                <InfoRow label="Requested By" value={workOrder.requested_by} />
                <InfoRow label="Authorising Foreman" value={workOrder.authorising_foreman} />
                {workOrder.job_instructions && <div className="col-span-2"><InfoRow label="Special Instructions" value={workOrder.job_instructions} /></div>}
              </div>
            </div>
          </TabsContent>

          {/* TAB: Artisan Report */}
          <TabsContent value="artisan">
            <div className="space-y-4">
              <div className={`border ${t.border} rounded-lg p-3 space-y-3`}>
                <div className={`flex items-center gap-1.5 text-xs font-medium ${subLabel}`}><Layers className={`h-3.5 w-3.5 ${ic.brand}`} /> Work Order Classification</div>
                <div className="flex flex-wrap gap-1.5">
                  {([{ v: 'planned_maintenance', label: 'Planned Maintenance' }, { v: 'project', label: 'Project' }, { v: 'breakdown', label: 'Breakdown' }, { v: 'custom', label: 'Other / Custom' }] as { v: WOClassification; label: string }[]).map(opt => (
                    <button key={opt.v} type="button" onClick={() => setA('classification', opt.v)}
                      className={`px-2.5 py-1 rounded text-xs transition-colors ${artisan.classification === opt.v ? (light ? 'bg-brand-500/15 text-brand-700 font-semibold' : 'bg-brand-500/20 text-brand-400 font-medium') : `${t.hoverBg} ${subLabel}`}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
                {artisan.classification === 'custom' && (
                  <FormField label="Specify Type"><input value={artisan.classification_custom} onChange={e => setA('classification_custom', e.target.value)} placeholder="e.g. Commissioning, Shutdown work…" aria-label="Specify Type" className={`w-full rounded px-2.5 py-1.5 text-xs outline-none transition-colors ${t.inputBg}`} /></FormField>
                )}
                {artisan.classification === 'breakdown' && (
                  <FormField label="Failure Mode">
                    <input value={artisan.failure_mode} onChange={e => setA('failure_mode', e.target.value)} list="failure-mode-list" placeholder="Select or type failure mode…" aria-label="Failure Mode" className={`w-full rounded px-2.5 py-1.5 text-xs outline-none transition-colors ${t.inputBg}`} />
                    <datalist id="failure-mode-list" aria-label="Failure mode suggestions">{FAILURE_MODES.map(m => <option key={m} value={m}>{m}</option>)}</datalist>
                  </FormField>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Discipline">
                    <div className="flex gap-1.5">
                      {(['Mechanical', 'Electrical'] as Discipline[]).map(d => (
                        <button key={d} type="button" onClick={() => { setA('discipline', d); if (d === 'Electrical') setA('trade', ''); }}
                          className={`flex-1 flex items-center justify-center gap-1 py-1 rounded text-xs transition-colors ${artisan.discipline === d ? (light ? 'bg-brand-500/15 text-brand-700 font-semibold' : 'bg-brand-500/20 text-brand-400 font-medium') : `${t.hoverBg} ${subLabel}`}`}>
                          {d === 'Mechanical' ? <Settings2 className="h-3 w-3" /> : <Zap className="h-3 w-3" />}{d}
                        </button>
                      ))}
                    </div>
                  </FormField>
                  {artisan.discipline === 'Mechanical' && (
                    <FormField label="Trade">
                      <input value={artisan.trade} onChange={e => setA('trade', e.target.value)} list="trade-list" placeholder="Select or type trade…" aria-label="Trade" className={`w-full rounded px-2.5 py-1.5 text-xs outline-none transition-colors ${t.inputBg}`} />
                      <datalist id="trade-list" aria-label="Trade suggestions">{MECHANICAL_TRADES.map(tr => <option key={tr} value={tr}>{tr}</option>)}</datalist>
                    </FormField>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Status">
                  <Select value={artisan.status} onValueChange={v => setA('status', v)}>
                    <SelectTrigger className={`h-8 text-sm ${t.inputBg}`}><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="in-progress">In Progress</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="on-hold">On Hold</SelectItem><SelectItem value="not-done">Not Done</SelectItem></SelectContent>
                  </Select>
                </FormField>
                <FormField label={`Progress: ${artisan.progress}%`}>
                  <input type="range" min="0" max="100" value={artisan.progress} title={`Artisan progress: ${artisan.progress}%`} aria-label={`Artisan progress: ${artisan.progress}%`} onChange={e => setA('progress', parseInt(e.target.value))} className="w-full mt-2 accent-cyan-400" />
                </FormField>
              </div>

              <PredictiveArea id="a-work-done" label="Work Done — what was carried out" value={artisan.work_done_details} onChange={v => setA('work_done_details', v)} placeholder="Describe exactly what was done…" rows={4} autoComplete="on" />

              <div className="grid grid-cols-2 gap-3">
                <PredictiveArea id="a-cause" label="Cause of Failure" value={artisan.cause_of_failure} onChange={v => setA('cause_of_failure', v)} placeholder="What caused the issue…" rows={3} autoComplete="on" />
                <PredictiveArea id="a-delay-desc" label="Delay Details" value={artisan.delay_details} onChange={v => setA('delay_details', v)} placeholder="Any delays encountered…" rows={3} autoComplete="on" />
              </div>

              <div className={`border ${t.border} rounded-lg p-3 space-y-3`}>
                <div className={`flex items-center gap-1.5 text-xs font-medium ${subLabel}`}><Timer className={`h-3.5 w-3.5 ${ic.cyan}`} /> Time Tracking</div>
                <div className="grid grid-cols-3 gap-3">
                  <ThemedInput id="a-t-start" label="Time Started" type="time" value={artisan.time_work_started} onChange={v => setA('time_work_started', v)} />
                  <ThemedInput id="a-t-finish" label="Time Finished" type="time" value={artisan.time_work_finished} onChange={v => setA('time_work_finished', v)} />
                  <ThemedInput id="a-t-total" label="Total Time (auto)" value={artisan.total_time_worked} onChange={v => setA('total_time_worked', v)} placeholder="auto" readOnly={!!(artisan.time_work_started && artisan.time_work_finished)} />
                </div>
                <div className={`border-t ${t.border} pt-3 space-y-2`}>
                  <div className="flex items-center gap-2"><span className={`text-xs font-medium ${subLabel}`}>Overtime</span><NAToggle checked={otNA} onChange={setOtNA} label={otNA ? '↩ Undo N/A' : 'Mark as N/A'} /></div>
                  {otNA ? <p className="text-orange-400/60 text-xs italic px-0.5">No overtime for this job.</p> : (
                    <div className="grid grid-cols-3 gap-3">
                      <ThemedInput id="a-ot-start" label="OT Start" type="time" value={artisan.overtime_start_time} onChange={v => setA('overtime_start_time', v)} />
                      <ThemedInput id="a-ot-end" label="OT End" type="time" value={artisan.overtime_end_time} onChange={v => setA('overtime_end_time', v)} />
                      <ThemedInput id="a-ot-hrs" label="OT Hours (auto)" value={artisan.overtime_hours} onChange={v => setA('overtime_hours', v)} placeholder="auto" readOnly={!!(artisan.overtime_start_time && artisan.overtime_end_time)} />
                    </div>
                  )}
                </div>
                <div className={`border-t ${t.border} pt-3 space-y-2`}>
                  <div className="flex items-center gap-2"><span className={`text-xs font-medium ${subLabel}`}>Delays</span><NAToggle checked={delayNA} onChange={setDelayNA} label={delayNA ? '↩ Undo N/A' : 'Mark as N/A'} /></div>
                  {delayNA ? <p className="text-orange-400/60 text-xs italic px-0.5">No delays for this job.</p> : (
                    <div className="grid grid-cols-3 gap-3">
                      <ThemedInput id="a-d-from" label="Delay From" type="time" value={artisan.delay_from_time} onChange={v => setA('delay_from_time', v)} />
                      <ThemedInput id="a-d-to" label="Delay To" type="time" value={artisan.delay_to_time} onChange={v => setA('delay_to_time', v)} />
                      <ThemedInput id="a-d-total" label="Delay Hours (auto)" value={artisan.total_delay_hours} onChange={v => setA('total_delay_hours', v)} placeholder="auto" readOnly={!!(artisan.delay_from_time && artisan.delay_to_time)} />
                    </div>
                  )}
                </div>
              </div>

              <div className={`border ${t.border} rounded-lg p-3 space-y-3`}>
                <div className={`flex items-center gap-1.5 text-xs font-medium ${subLabel}`}><Package className={`h-3.5 w-3.5 ${ic.amber}`} /> Spares Used</div>
                <div className="grid grid-cols-[1fr_70px_80px_auto] gap-2 items-end">
                  <FormField label="Spare / Part"><SpareAutocomplete value={newSpare.name} onChange={v => setNewSpare(s => ({ ...s, name: v }))} onSelect={item => setNewSpare(s => ({ ...s, name: item.description ?? '', unit_cost: String(item.unit_price ?? 0) }))} placeholder="Search spares register or type…" /></FormField>
                  <FormField label="Qty"><input type="number" min="0.01" step="0.01" value={newSpare.quantity} onChange={e => setNewSpare(s => ({ ...s, quantity: e.target.value }))} aria-label="Quantity" className={`w-full rounded px-2 py-1.5 text-xs outline-none transition-colors ${t.inputBg}`} /></FormField>
                  <FormField label="Unit Cost (R)"><input type="number" min="0" step="0.01" value={newSpare.unit_cost} onChange={e => setNewSpare(s => ({ ...s, unit_cost: e.target.value }))} aria-label="Unit Cost (R)" className={`w-full rounded px-2 py-1.5 text-xs outline-none transition-colors ${t.inputBg}`} /></FormField>
                  <button type="button" onClick={addArtisanSpare} className={`h-[30px] px-3 rounded text-xs font-semibold transition-colors ${light ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm' : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-400'}`}>Add</button>
                </div>
                {artisanSpares.length > 0 && (
                  <div className="space-y-1.5">
                    {artisanSpares.map(s => (
                      <div key={s.id} className={`flex items-center gap-2 ${t.hoverBgSoft} rounded px-2.5 py-1.5`}>
                        <Package className={`h-3 w-3 ${ic.amber} flex-shrink-0`} />
                        <span className={`flex-1 text-xs truncate ${t.textPrimary}`}>{s.name}</span>
                        <span className={`text-xs ${subLabel}`}>×{s.quantity}</span>
                        <span className={`text-xs font-mono font-semibold ${light ? 'text-amber-700' : 'text-amber-400/80'}`}>R {lineTotal(s.quantity, s.unit_cost).toFixed(2)}</span>
                        <button type="button" onClick={() => setArtisanSpares(p => p.filter(x => x.id !== s.id))} className={`${t.textFaint} hover:text-rose-500 transition-colors ml-0.5`}><X className="h-3 w-3" /></button>
                      </div>
                    ))}
                    <div className="flex justify-end"><span className={`text-xs font-mono font-semibold ${light ? 'text-amber-700' : 'text-amber-400/90'}`}>Total: R {artisanSpares.reduce((a, s) => a + lineTotal(s.quantity, s.unit_cost), 0).toFixed(2)}</span></div>
                  </div>
                )}
              </div>

              <div className={`border ${t.border} rounded-lg p-3 space-y-3`}>
                <div className={`flex items-center gap-1.5 text-xs font-medium ${subLabel}`}><Signature className={`h-3.5 w-3.5 ${ic.cyan}`} /> Artisan Sign-off</div>
                <div className="grid grid-cols-3 gap-3">
                  <PersonAutocomplete label="Artisan Name" value={artisan.artisan_name} onChange={v => setA('artisan_name', v)} placeholder="Type to search employees…" />
                  <ThemedInput id="a-sign" label="Signature (type name)" value={artisan.artisan_sign} onChange={v => setA('artisan_sign', v)} placeholder="Type name" autoComplete="name" />
                  <ThemedInput id="a-date" label="Date" type="date" value={artisan.artisan_date} onChange={v => setA('artisan_date', v)} />
                </div>
              </div>

              <Button onClick={saveArtisan} disabled={savingA} className={`w-full ${btnCyan}`}><Save className="h-3.5 w-3.5 mr-2" />{savingA ? 'Saving…' : 'Save Artisan Report'}</Button>
            </div>
          </TabsContent>

          {/* TAB: Foreman Sign-off */}
          <TabsContent value="foreman">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Final Status">
                  <Select value={foreman.status} onValueChange={v => setF('status', v)}>
                    <SelectTrigger className={`h-8 text-sm ${t.inputBg}`}><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="in-progress">In Progress</SelectItem><SelectItem value="completed">Completed ✓</SelectItem><SelectItem value="on-hold">On Hold</SelectItem><SelectItem value="not-done">Not Done</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent>
                  </Select>
                </FormField>
                <FormField label={`Confirmed Progress: ${foreman.progress}%`}>
                  <input type="range" min="0" max="100" value={foreman.progress} title={`Foreman confirmed progress: ${foreman.progress}%`} aria-label={`Foreman confirmed progress: ${foreman.progress}%`} onChange={e => setF('progress', parseInt(e.target.value))} className="w-full mt-2 accent-violet-400" />
                </FormField>
              </div>
              <PredictiveArea id="f-notes" label="Foreman Comments" value={foreman.notes} onChange={v => setF('notes', v)} placeholder="Comments on work done, observations, follow-up required…" rows={3} autoComplete="on" />
              <div className={`border ${t.border} rounded-lg p-3 space-y-3`}>
                <div className={`flex items-center gap-1.5 text-xs font-medium ${subLabel}`}><Signature className={`h-3.5 w-3.5 ${ic.violet}`} /> Foreman Sign-off</div>
                <div className="grid grid-cols-3 gap-3">
                  <PersonAutocomplete label="Foreman Name" value={foreman.foreman_name} onChange={v => setF('foreman_name', v)} placeholder="Type to search employees…" />
                  <ThemedInput id="f-sign" label="Signature (type name)" value={foreman.foreman_sign} onChange={v => setF('foreman_sign', v)} placeholder="Type name" autoComplete="name" />
                  <ThemedInput id="f-date" label="Date" type="date" value={foreman.foreman_date} onChange={v => setF('foreman_date', v)} />
                </div>
              </div>
              <Button onClick={saveForeman} disabled={savingF} className={`w-full ${btnViolet}`}><Save className="h-3.5 w-3.5 mr-2" />{savingF ? 'Saving…' : 'Save Foreman Sign-off'}</Button>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-4">
          <button type="button" onClick={async () => { if (await confirm({ title: 'Delete this work order?', message: 'This cannot be undone.', destructive: true })) { onDelete(workOrder.id); onClose(); } }} className="flex items-center gap-1.5 text-rose-500/70 hover:text-rose-500 text-xs transition-colors">
            <Trash2 className="h-3 w-3" /> Delete work order
          </button>
        </div>
      </div>
    </CenterModal>
  );
}
