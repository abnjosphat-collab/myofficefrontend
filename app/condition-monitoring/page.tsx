// FILE: app/condition-monitoring/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageShell } from '@/components/PageShell';
import { Radar, Plus, X, RefreshCw } from 'lucide-react';

const _API = (process.env.NEXT_PUBLIC_API_URL || 'https://myofficebackend.onrender.com').replace(/\/$/, '');
const CM_URL = `${_API}/api/condition-monitoring`;

type CMResult = 'normal' | 'caution' | 'critical';
type CMType = 'Oil Analysis' | 'Vibration' | 'Thermography';

interface CMReading {
  id: number; equipment: string; component: string; type: CMType;
  date: string; value: string; unit: string; result: CMResult; technician: string; notes: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fromCMAPI = (d: any): CMReading => ({
  id: d.id, equipment: d.equipment_name || '', component: d.component || '',
  type: (d.monitoring_type as CMType) || 'Vibration', date: d.sampled_date || '',
  value: String(d.value ?? ''), unit: d.unit || '', result: (d.result as CMResult) || 'normal',
  technician: d.technician || '', notes: d.notes || '',
});

const typeStyle: Record<CMType, string> = {
  'Oil Analysis': 'bg-amber-500/20 border-amber-400/40 text-amber-300',
  'Vibration': 'bg-[#86BBD8]/20 border-[#86BBD8]/40 text-[#86BBD8]',
  'Thermography': 'bg-orange-500/20 border-orange-400/40 text-orange-300',
};
const resultStyle: Record<CMResult, string> = {
  normal: 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300',
  caution: 'bg-amber-500/20 border-amber-400/40 text-amber-300',
  critical: 'bg-rose-500/20 border-rose-400/40 text-rose-300',
};

const CM_TYPES: CMType[] = ['Oil Analysis', 'Vibration', 'Thermography'];
const INPUT = 'bg-white/[0.07] border border-white/12 text-white placeholder:text-white/30 focus:outline-none focus:border-[#86BBD8]/50 rounded-xl px-3 py-2 text-sm w-full';

export default function ConditionMonitoringPage() {
  const [readings, setReadings] = useState<CMReading[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReadings = useCallback(async () => {
    setLoading(true);
    try { const r = await fetch(CM_URL); if (r.ok) setReadings((await r.json()).map(fromCMAPI)); }
    catch { /* network error */ } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchReadings(); }, [fetchReadings]);
  const [tab, setTab] = useState<'All' | CMType>('All');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ equipment: '', component: '', type: 'Vibration' as CMType, date: '', value: '', unit: '', result: 'normal' as CMResult, technician: '', notes: '' });

  const displayed = tab === 'All' ? readings : readings.filter(r => r.type === tab);
  const counts = { total: readings.length, critical: readings.filter(r => r.result === 'critical').length, caution: readings.filter(r => r.result === 'caution').length, normal: readings.filter(r => r.result === 'normal').length };

  const submit = async () => {
    if (!form.equipment || !form.date) return;
    const body = { equipment_name: form.equipment, component: form.component, monitoring_type: form.type, sampled_date: form.date, value: parseFloat(form.value) || null, unit: form.unit, result: form.result, technician: form.technician, notes: form.notes };
    try { const r = await fetch(CM_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); if (r.ok) fetchReadings(); }
    catch { /* ignore */ }
    setForm({ equipment: '', component: '', type: 'Vibration', date: '', value: '', unit: '', result: 'normal', technician: '', notes: '' });
    setShowAdd(false);
  };

  return (
    <PageShell>
      <section className="relative text-white">
        <div className="container mx-auto px-4 pt-6 pb-3">
          <div className="oz-glass-dark rounded-2xl overflow-hidden p-6">
            <div className="flex items-center justify-between flex-wrap gap-4 mb-5">
              <div className="flex items-center gap-3">
                <Radar className="w-7 h-7 text-[#86BBD8]" />
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Condition Monitoring</h1>
                  <p className="text-white/50 text-sm mt-0.5">Oil analysis, vibration and thermography records</p>
                </div>
              </div>
              <button onClick={() => setShowAdd(s => !s)} className="flex items-center gap-2 bg-[#86BBD8]/25 hover:bg-[#86BBD8]/40 border border-[#86BBD8]/35 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors">
                <Plus className="w-4 h-4" /> Add Reading
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[['Total Readings', counts.total, 'text-white'], ['Critical', counts.critical, 'text-rose-300'], ['Caution', counts.caution, 'text-amber-300'], ['Normal', counts.normal, 'text-emerald-300']].map(([l, v, c]) => (
                <div key={String(l)} className="bg-white/[0.06] rounded-xl p-3 text-center">
                  <div className={`text-2xl font-bold ${c}`}>{v}</div>
                  <div className="text-white/50 text-xs mt-0.5">{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {showAdd && (
        <section className="container mx-auto px-4 pb-2">
          <div className="oz-glass-panel rounded-2xl overflow-hidden p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold">New Reading</h2>
              <button onClick={() => setShowAdd(false)} className="text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <input placeholder="Equipment" value={form.equipment} onChange={e => setForm(f => ({...f, equipment: e.target.value}))} className={INPUT} />
              <input placeholder="Component" value={form.component} onChange={e => setForm(f => ({...f, component: e.target.value}))} className={INPUT} />
              <select value={form.type} onChange={e => setForm(f => ({...f, type: e.target.value as CMType}))} className={INPUT}>
                {CM_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
              <input type="date" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))} className={INPUT} />
              <input placeholder="Value" value={form.value} onChange={e => setForm(f => ({...f, value: e.target.value}))} className={INPUT} />
              <input placeholder="Unit" value={form.unit} onChange={e => setForm(f => ({...f, unit: e.target.value}))} className={INPUT} />
              <select value={form.result} onChange={e => setForm(f => ({...f, result: e.target.value as CMResult}))} className={INPUT}>
                {(['normal','caution','critical'] as CMResult[]).map(r => <option key={r}>{r}</option>)}
              </select>
              <input placeholder="Technician" value={form.technician} onChange={e => setForm(f => ({...f, technician: e.target.value}))} className={INPUT} />
            </div>
            <textarea rows={2} placeholder="Notes..." value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} className={`${INPUT} resize-none mb-3`} />
            <button onClick={submit} className="bg-[#86BBD8]/25 hover:bg-[#86BBD8]/40 border border-[#86BBD8]/35 text-white font-semibold px-5 py-2 rounded-xl text-sm transition-colors">Save Reading</button>
          </div>
        </section>
      )}

      <section className="container mx-auto px-4 pb-8">
        <div className="oz-glass-panel rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-white/10 flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-white font-semibold">Monitoring Records</h2>
            <div className="flex gap-1">
              {(['All', ...CM_TYPES] as const).map(t => (
                <button key={t} onClick={() => setTab(t)} className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${tab === t ? 'bg-[#86BBD8]/20 text-[#86BBD8]' : 'text-white/50 hover:text-white'}`}>{t}</button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {['Equipment','Component','Type','Date','Value','Result','Technician','Notes'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-white/40 text-xs font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-10"><RefreshCw className="h-5 w-5 animate-spin text-white/30 mx-auto" /></td></tr>
                ) : displayed.map(r => (
                  <tr key={r.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="px-4 py-3 text-white font-medium">{r.equipment}</td>
                    <td className="px-4 py-3 text-white/60">{r.component}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${typeStyle[r.type]}`}>{r.type}</span></td>
                    <td className="px-4 py-3 text-white/60">{r.date}</td>
                    <td className="px-4 py-3 text-white/80 font-mono">{r.value} <span className="text-white/40 text-xs">{r.unit}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {r.result === 'critical' && <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${resultStyle[r.result]}`}>{r.result.charAt(0).toUpperCase() + r.result.slice(1)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-white/60">{r.technician}</td>
                    <td className="px-4 py-3 text-white/40 text-xs max-w-xs truncate">{r.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
