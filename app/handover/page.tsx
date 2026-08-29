// FILE: app/handover/page.tsx
'use client';

import { useState } from 'react';
import { AppShell } from '@/components/app-shell';
import { PredictiveInput } from '@/components/shared/PredictiveInput';
import { ClipboardList, ChevronDown, ChevronUp, Plus, X, Moon, Sun, Clock, RefreshCw } from '@/components/shared/theme';
import { useModuleData } from '@/lib/useModuleData';
import { useTheme, PageHero, StatTile, StatusBadge, FormField, PrimaryButton, SelectField } from '@/components/shared/theme';
import { DownloadButton, type DLColumn } from '@/components/shared/DownloadButton';
import { exportFilename } from '@/lib/exportUtils';
import { formatDate } from '@/lib/format';
import { SHIFTS, type Shift, type EquipmentItem, type Handover } from './types';

const SHIFT_ICON: Record<Shift, React.ElementType> = { Night: Moon, Day: Sun, Afternoon: Clock };
const SHIFT_HEX: Record<Shift, string> = { Night: '#818cf8', Day: '#f59e0b', Afternoon: '#fb923c' };
const EQ_HEX: Record<string, string> = { Running: '#34d399', Standby: '#38bdf8', Monitor: '#f59e0b', Breakdown: '#f43f5e' };

const defaultEq: EquipmentItem[] = [{ name: '', status: 'Running' }];

function HandoverContent() {
  const t = useTheme();
  const { data: records, loading, error, create, refetch } = useModuleData<Handover>('handover');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ handover_date: '', shift: 'Day' as Shift, section: '', outgoing_supervisor: '', incoming_supervisor: '', completed_work: '', outstanding_work: '', safety_concerns: '', equipment_summary: defaultEq });

  const toggle = (id: number) => setExpanded(prev => prev === id ? null : id);
  const addEq = () => setForm(f => ({ ...f, equipment_summary: [...f.equipment_summary, { name: '', status: 'Running' }] }));
  const removeEq = (i: number) => setForm(f => ({ ...f, equipment_summary: f.equipment_summary.filter((_, idx) => idx !== i) }));
  const updateEq = (i: number, field: keyof EquipmentItem, val: string) =>
    setForm(f => ({ ...f, equipment_summary: f.equipment_summary.map((e, idx) => idx === i ? { ...e, [field]: val } : e) }));

  const submit = async () => {
    if (!form.handover_date || !form.section || !form.outgoing_supervisor || !form.incoming_supervisor) return;
    await create(form);
    refetch();
    setForm({ handover_date: '', shift: 'Day', section: '', outgoing_supervisor: '', incoming_supervisor: '', completed_work: '', outstanding_work: '', safety_concerns: '', equipment_summary: defaultEq });
    setShowForm(false);
  };

  const inputCls = `w-full h-9 px-3 rounded-lg text-sm outline-none transition-colors ${t.inputBg}`;

  if (loading) return (
    <main className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8">
      <div className={`flex flex-col items-center justify-center py-32 gap-3 ${t.textFaint}`}><RefreshCw className="h-5 w-5 animate-spin" /><span className="text-sm">Loading...</span></div>
    </main>
  );

  if (error) return (
    <main className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8">
      <div className="rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-500 px-5 py-4 text-sm">{error}</div>
    </main>
  );

  const exportColumns: DLColumn[] = [
    { key: 'handover_date', label: 'Date', width: 14, format: v => v ? formatDate(v as string) : '' },
    { key: 'shift', label: 'Shift', width: 12 },
    { key: 'section', label: 'Section', width: 16 },
    { key: 'outgoing_supervisor', label: 'Outgoing Supervisor', width: 20 },
    { key: 'incoming_supervisor', label: 'Incoming Supervisor', width: 20 },
    { key: 'completed_work', label: 'Completed Work', width: 30 },
    { key: 'outstanding_work', label: 'Outstanding Work', width: 30 },
    { key: 'safety_concerns', label: 'Safety Concerns', width: 26 },
    { key: 'equipment_summary', label: 'Equipment Summary', width: 34, format: v => (v as EquipmentItem[] ?? []).map(e => `${e.name}: ${e.status}`).join('; ') },
  ];

  return (
    <main className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <PageHero
        icon={ClipboardList}
        accent="violet"
        crumbs={['Operations & Maintenance', 'Shift Handover']}
        title="Shift Handover Reports"
        description="End-of-shift transfer documentation"
        statsOpen
        actions={
          <>
            {records.length > 0 && (
              <DownloadButton
                data={records as unknown as Record<string, unknown>[]}
                columns={exportColumns}
                filename={exportFilename('Shift_Handover_Reports')}
                title="Shift Handover Reports"
              />
            )}
            <PrimaryButton icon={Plus} accent="violet" onClick={() => setShowForm(s => !s)}>New Handover</PrimaryButton>
          </>
        }
      >
        <div className="grid grid-cols-3 gap-3">
          <StatTile icon={ClipboardList} color="#86BBD8" label="Total Reports" value={records.length} />
          <StatTile icon={ClipboardList} color="#86BBD8" label="This Week" value={records.filter(h => h.handover_date >= '2026-05-26').length} />
          <StatTile icon={ClipboardList} color="#86BBD8" label="Sections" value={[...new Set(records.map(h => h.section))].length} />
        </div>
      </PageHero>

      {showForm && (
        <div className={`${t.glass} rounded-2xl ${t.shadow} p-6`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`font-semibold ${t.textPrimary}`}>New Handover Report</h2>
            <button type="button" onClick={() => setShowForm(false)} className={`${t.textFaint} ${t.hoverText} transition-colors`}><X className="w-5 h-5" /></button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
            <FormField label="Date"><input type="date" title="Handover date" value={form.handover_date} onChange={e => setForm(f => ({ ...f, handover_date: e.target.value }))} className={inputCls} /></FormField>
            <FormField label="Shift">
              <SelectField size="form" title="Shift" value={form.shift} onChange={v => setForm(f => ({ ...f, shift: v as Shift }))}
                options={SHIFTS.map(s => ({ value: s, label: s }))} />
            </FormField>
            <FormField label="Section"><PredictiveInput historyKey="handover_section" placeholder="Section" value={form.section} onChange={v => setForm(f => ({ ...f, section: v }))} inputClassName={inputCls} /></FormField>
            <FormField label="Outgoing Supervisor"><PredictiveInput historyKey="handover_supervisor" placeholder="Outgoing Supervisor" value={form.outgoing_supervisor} onChange={v => setForm(f => ({ ...f, outgoing_supervisor: v }))} inputClassName={inputCls} /></FormField>
            <FormField label="Incoming Supervisor"><PredictiveInput historyKey="handover_supervisor" placeholder="Incoming Supervisor" value={form.incoming_supervisor} onChange={v => setForm(f => ({ ...f, incoming_supervisor: v }))} inputClassName={inputCls} /></FormField>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <FormField label="Completed Work"><textarea rows={3} placeholder="Completed work..." value={form.completed_work} onChange={e => setForm(f => ({ ...f, completed_work: e.target.value }))} className={`${inputCls} resize-none h-auto py-2`} /></FormField>
            <FormField label="Outstanding Work"><textarea rows={3} placeholder="Outstanding work..." value={form.outstanding_work} onChange={e => setForm(f => ({ ...f, outstanding_work: e.target.value }))} className={`${inputCls} resize-none h-auto py-2`} /></FormField>
            <FormField label="Safety Concerns"><textarea rows={3} placeholder="Safety concerns..." value={form.safety_concerns} onChange={e => setForm(f => ({ ...f, safety_concerns: e.target.value }))} className={`${inputCls} resize-none h-auto py-2`} /></FormField>
          </div>
          <div className="mb-3">
            <div className={`text-xs mb-2 ${t.textFaint}`}>Equipment Summary</div>
            {form.equipment_summary.map((eq, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input placeholder="Equipment name" value={eq.name} onChange={e => updateEq(i, 'name', e.target.value)} className={inputCls} />
                <SelectField size="form" title="Equipment status" value={eq.status} onChange={v => updateEq(i, 'status', v)} className="min-w-[130px]"
                  options={['Running', 'Standby', 'Monitor', 'Breakdown']} />
                <button type="button" title="Remove equipment" onClick={() => removeEq(i)} className={`${t.textFaint} hover:text-rose-500 transition-colors px-1`}><X className="w-4 h-4" /></button>
              </div>
            ))}
            <button type="button" onClick={addEq} className="text-brand-500 text-xs hover:opacity-80 transition-colors flex items-center gap-1"><Plus className="w-3 h-3" /> Add Equipment</button>
          </div>
          <PrimaryButton accent="violet" size="md" onClick={submit}>Submit Handover</PrimaryButton>
        </div>
      )}

      <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
        <div className={`p-4 border-b ${t.border}`}><h2 className={`font-semibold ${t.textPrimary}`}>Handover History</h2></div>
        <div className={`divide-y ${t.divide}`}>
          {records.map(h => {
            // ?? fallback: an unrecognized shift value (legacy/malformed data)
            // otherwise makes ShiftIcon undefined and crashes the page — same bug
            // class found and fixed on overtime.tsx's TypeBadge (2026-08-29 UI
            // audit, audit/07-ui-polish-findings.md).
            const ShiftIcon = SHIFT_ICON[h.shift] ?? Clock;
            return (
              <div key={h.id}>
                <button type="button" onClick={() => toggle(h.id)} className={`w-full flex items-center justify-between px-5 py-4 ${t.hoverBg} transition-colors text-left`}>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`font-medium text-sm ${t.textPrimary}`}>{h.handover_date}</span>
                    <StatusBadge color={SHIFT_HEX[h.shift]} label={h.shift} />
                    <span className={`text-sm ${t.textFaint}`}>{h.section}</span>
                    <span className={`text-xs ${t.textFaint}`}>{h.outgoing_supervisor} → {h.incoming_supervisor}</span>
                  </div>
                  {expanded === h.id ? <ChevronUp className={`w-4 h-4 ${t.textFaint}`} /> : <ChevronDown className={`w-4 h-4 ${t.textFaint}`} />}
                </button>
                {expanded === h.id && (
                  <div className="px-5 pb-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><div className="text-brand-500 text-xs font-semibold mb-1 uppercase tracking-wider">Completed Work</div><p className={`text-sm leading-relaxed ${t.textMuted}`}>{h.completed_work}</p></div>
                    <div><div className="text-amber-500 text-xs font-semibold mb-1 uppercase tracking-wider">Outstanding Work</div><p className={`text-sm leading-relaxed ${t.textMuted}`}>{h.outstanding_work}</p></div>
                    <div><div className="text-rose-500 text-xs font-semibold mb-1 uppercase tracking-wider">Safety Concerns</div><p className={`text-sm leading-relaxed ${t.textMuted}`}>{h.safety_concerns}</p></div>
                    <div>
                      <div className={`text-xs font-semibold mb-2 uppercase tracking-wider ${t.textFaint}`}>Equipment Status</div>
                      <div className="flex flex-wrap gap-2">
                        {(h.equipment_summary ?? []).map((eq, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <span className={`text-xs ${t.textMuted}`}>{eq.name}</span>
                            <StatusBadge color={EQ_HEX[eq.status] ?? '#94a3b8'} label={eq.status} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}

export default function HandoverPage() {
  return <AppShell><HandoverContent /></AppShell>;
}
