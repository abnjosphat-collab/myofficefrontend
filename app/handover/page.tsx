// FILE: app/handover/page.tsx
'use client';

import { useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { ClipboardList, ChevronDown, ChevronUp, Plus, X, Moon, Sun, Clock, RefreshCw } from 'lucide-react';
import { useModuleData } from '@/lib/useModuleData';

const SHIFTS = ['Day', 'Night', 'Afternoon'] as const;
type Shift = typeof SHIFTS[number];

interface EquipmentItem { name: string; status: string; }
interface Handover {
  id: number; handover_date: string; shift: Shift; section: string;
  outgoing_supervisor: string; incoming_supervisor: string;
  completed_work: string; outstanding_work: string; safety_concerns: string;
  equipment_summary: EquipmentItem[];
}

const shiftIcon = (s: Shift) => s === 'Night' ? <Moon className="w-3 h-3" /> : s === 'Day' ? <Sun className="w-3 h-3" /> : <Clock className="w-3 h-3" />;
const shiftColor = (s: Shift) => s === 'Night' ? 'bg-indigo-500/20 border-indigo-400/40 text-indigo-300' : s === 'Day' ? 'bg-amber-500/20 border-amber-400/40 text-amber-300' : 'bg-orange-500/20 border-orange-400/40 text-orange-300';
const eqColor = (s: string) => s === 'Running' ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300' : s === 'Standby' ? 'bg-sky-500/20 border-sky-400/40 text-sky-300' : s === 'Monitor' ? 'bg-amber-500/20 border-amber-400/40 text-amber-300' : 'bg-rose-500/20 border-rose-400/40 text-rose-300';

const INPUT = 'bg-white/[0.07] border border-white/12 text-white placeholder:text-white/30 focus:outline-none focus:border-[#86BBD8]/50 rounded-xl px-3 py-2 text-sm w-full';
const TEXTAREA = INPUT + ' resize-none';

const defaultEq: EquipmentItem[] = [{ name: '', status: 'Running' }];

export default function HandoverPage() {
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

  if (loading) return (
    <PageShell>
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <RefreshCw className="h-5 w-5 animate-spin text-white/40" />
        <span className="text-white/40 text-sm">Loading...</span>
      </div>
    </PageShell>
  );

  if (error) return (
    <PageShell>
      <div className="container mx-auto px-4 pt-6">
        <div className="rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 px-5 py-4 text-sm">{error}</div>
      </div>
    </PageShell>
  );

  return (
    <PageShell>
      {/* Hero */}
      <section className="relative text-white">
        <div className="container mx-auto px-4 pt-6 pb-3">
          <div className="oz-glass-dark rounded-2xl overflow-hidden p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <ClipboardList className="w-7 h-7 text-[#86BBD8]" />
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Shift Handover Reports</h1>
                  <p className="text-white/50 text-sm mt-0.5">End-of-shift transfer documentation</p>
                </div>
              </div>
              <button onClick={() => setShowForm(s => !s)} className="flex items-center gap-2 bg-[#86BBD8]/25 hover:bg-[#86BBD8]/40 border border-[#86BBD8]/35 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors">
                <Plus className="w-4 h-4" /> New Handover
              </button>
            </div>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mt-5">
              {[['Total Reports', records.length], ['This Week', records.filter(h => h.handover_date >= '2026-05-26').length], ['Sections', [...new Set(records.map(h => h.section))].length]].map(([l, v]) => (
                <div key={String(l)} className="bg-white/[0.06] rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-[#86BBD8]">{v}</div>
                  <div className="text-white/50 text-xs mt-0.5">{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* New Handover Form */}
      {showForm && (
        <section className="container mx-auto px-4 pb-2">
          <div className="oz-glass-panel rounded-2xl overflow-hidden p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold">New Handover Report</h2>
              <button onClick={() => setShowForm(false)} className="text-white/40 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
              <input type="date" value={form.handover_date} onChange={e => setForm(f => ({ ...f, handover_date: e.target.value }))} className={INPUT} />
              <select value={form.shift} onChange={e => setForm(f => ({ ...f, shift: e.target.value as Shift }))} className={INPUT}>
                {SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <input placeholder="Section" value={form.section} onChange={e => setForm(f => ({ ...f, section: e.target.value }))} className={INPUT} />
              <input placeholder="Outgoing Supervisor" value={form.outgoing_supervisor} onChange={e => setForm(f => ({ ...f, outgoing_supervisor: e.target.value }))} className={INPUT} />
              <input placeholder="Incoming Supervisor" value={form.incoming_supervisor} onChange={e => setForm(f => ({ ...f, incoming_supervisor: e.target.value }))} className={INPUT} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <textarea rows={3} placeholder="Completed work..." value={form.completed_work} onChange={e => setForm(f => ({ ...f, completed_work: e.target.value }))} className={TEXTAREA} />
              <textarea rows={3} placeholder="Outstanding work..." value={form.outstanding_work} onChange={e => setForm(f => ({ ...f, outstanding_work: e.target.value }))} className={TEXTAREA} />
              <textarea rows={3} placeholder="Safety concerns..." value={form.safety_concerns} onChange={e => setForm(f => ({ ...f, safety_concerns: e.target.value }))} className={TEXTAREA} />
            </div>
            <div className="mb-3">
              <div className="text-white/50 text-xs mb-2">Equipment Summary</div>
              {form.equipment_summary.map((eq, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input placeholder="Equipment name" value={eq.name} onChange={e => updateEq(i, 'name', e.target.value)} className={INPUT} />
                  <select value={eq.status} onChange={e => updateEq(i, 'status', e.target.value)} className="bg-white/[0.07] border border-white/12 text-white focus:outline-none focus:border-[#86BBD8]/50 rounded-xl px-3 py-2 text-sm min-w-[130px]">
                    {['Running', 'Standby', 'Monitor', 'Breakdown'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button onClick={() => removeEq(i)} className="text-white/40 hover:text-rose-400 transition-colors px-1"><X className="w-4 h-4" /></button>
                </div>
              ))}
              <button onClick={addEq} className="text-[#86BBD8] text-xs hover:text-white transition-colors flex items-center gap-1"><Plus className="w-3 h-3" /> Add Equipment</button>
            </div>
            <button onClick={submit} className="bg-[#86BBD8]/25 hover:bg-[#86BBD8]/40 border border-[#86BBD8]/35 text-white font-semibold px-5 py-2 rounded-xl text-sm transition-colors">Submit Handover</button>
          </div>
        </section>
      )}

      {/* List */}
      <section className="container mx-auto px-4 pb-8">
        <div className="oz-glass-panel rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <h2 className="text-white font-semibold">Handover History</h2>
          </div>
          <div className="divide-y divide-white/[0.06]">
            {records.map(h => (
              <div key={h.id}>
                <button onClick={() => toggle(h.id)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.03] transition-colors text-left">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-white font-medium text-sm">{h.handover_date}</span>
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${shiftColor(h.shift)}`}>{shiftIcon(h.shift)} {h.shift}</span>
                    <span className="text-white/50 text-sm">{h.section}</span>
                    <span className="text-white/40 text-xs">{h.outgoing_supervisor} → {h.incoming_supervisor}</span>
                  </div>
                  {expanded === h.id ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
                </button>
                {expanded === h.id && (
                  <div className="px-5 pb-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-[#86BBD8] text-xs font-semibold mb-1 uppercase tracking-wider">Completed Work</div>
                      <p className="text-white/70 text-sm leading-relaxed">{h.completed_work}</p>
                    </div>
                    <div>
                      <div className="text-amber-400 text-xs font-semibold mb-1 uppercase tracking-wider">Outstanding Work</div>
                      <p className="text-white/70 text-sm leading-relaxed">{h.outstanding_work}</p>
                    </div>
                    <div>
                      <div className="text-rose-400 text-xs font-semibold mb-1 uppercase tracking-wider">Safety Concerns</div>
                      <p className="text-white/70 text-sm leading-relaxed">{h.safety_concerns}</p>
                    </div>
                    <div>
                      <div className="text-white/50 text-xs font-semibold mb-2 uppercase tracking-wider">Equipment Status</div>
                      <div className="flex flex-wrap gap-2">
                        {(h.equipment_summary ?? []).map((eq, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <span className="text-white/70 text-xs">{eq.name}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${eqColor(eq.status)}`}>{eq.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
