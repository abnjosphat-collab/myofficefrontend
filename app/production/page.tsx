// FILE: app/production/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageShell } from '@/components/PageShell';
import { BarChart2, Plus, X, RefreshCw } from 'lucide-react';

const _API = (process.env.NEXT_PUBLIC_API_URL || 'https://myofficebackend.onrender.com').replace(/\/$/, '');
const PROD_URL = `${_API}/api/production`;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fromProdAPI = (d: any): ProductionRecord => ({
  id: d.id, date: d.prod_date || '', shift: d.shift || '',
  tonnesMilled: d.tonnes_milled || 0, feedRate: d.feed_rate_tph || 0, grade: d.grade_gpt || 0,
  recovery: d.recovery_pct || 0, goldOz: d.gold_produced_oz || 0, millAvail: d.mill_availability || 0,
  powerKwh: d.power_kwh || 0, downtimeHrs: d.downtime_hours || 0,
  downtimeReason: d.downtime_reason || '', comments: d.comments || '',
});
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface ProductionRecord {
  id: number; date: string; shift: string; tonnesMilled: number; feedRate: number; grade: number;
  recovery: number; goldOz: number; millAvail: number; powerKwh: number; downtimeHrs: number;
  downtimeReason: string; comments: string;
}

const TARGETS = { tonnesMilled: 1900, grade: 3.0, recovery: 92.0, goldOz: 165 };
const INPUT = 'bg-white/[0.07] border border-white/12 text-white placeholder:text-white/30 focus:outline-none focus:border-[#86BBD8]/50 rounded-xl px-3 py-2 text-sm w-full';
const TOOLTIP_STYLE = { backgroundColor: '#0f1e2e', border: '1px solid rgba(134,187,216,0.2)', borderRadius: 12, color: '#fff', fontSize: 12 };

export default function ProductionPage() {
  const [records, setRecords] = useState<ProductionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try { const r = await fetch(PROD_URL); if (r.ok) setRecords((await r.json()).map(fromProdAPI)); }
    catch { /* network */ } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchRecords(); }, [fetchRecords]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ date: '', shift: 'Day', tonnesMilled: '', feedRate: '', grade: '', recovery: '', goldOz: '', millAvail: '', powerKwh: '', downtimeHrs: '', downtimeReason: '', comments: '' });

  const chartData = [...records].reverse().map(r => ({ date: `${r.date.slice(5)} ${r.shift[0]}`, tonnes: r.tonnesMilled, grade: r.grade }));

  const submit = async () => {
    if (!form.date || !form.tonnesMilled) return;
    try {
      const body = { prod_date: form.date, shift: form.shift, tonnes_milled: +form.tonnesMilled, feed_rate_tph: +form.feedRate, grade_gpt: +form.grade, recovery_pct: +form.recovery, gold_produced_oz: +form.goldOz, mill_availability: +form.millAvail, power_kwh: +form.powerKwh, downtime_hours: +form.downtimeHrs, downtime_reason: form.downtimeReason, comments: form.comments };
      const r = await fetch(PROD_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (r.ok) fetchRecords();
    } catch { /* ignore */ }
    setShowForm(false);
  };

  const today = records[0];
  const kpiCards = today ? [
    { label: "Today's Tonnes", actual: today.tonnesMilled, target: TARGETS.tonnesMilled, unit: 't' },
    { label: 'Grade', actual: today.grade, target: TARGETS.grade, unit: 'g/t' },
    { label: 'Recovery', actual: today.recovery, target: TARGETS.recovery, unit: '%' },
    { label: 'Gold Produced', actual: today.goldOz, target: TARGETS.goldOz, unit: 'oz' },
  ] : [];

  return (
    <PageShell>
      <section className="relative text-white">
        <div className="container mx-auto px-4 pt-6 pb-3">
          <div className="oz-glass-dark rounded-2xl overflow-hidden p-6">
            <div className="flex items-center justify-between flex-wrap gap-4 mb-5">
              <div className="flex items-center gap-3">
                <BarChart2 className="w-7 h-7 text-[#86BBD8]" />
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Production Interface</h1>
                  <p className="text-white/50 text-sm mt-0.5">Daily milling and gold production tracking</p>
                </div>
              </div>
              <button onClick={() => setShowForm(s => !s)} className="flex items-center gap-2 bg-[#86BBD8]/25 hover:bg-[#86BBD8]/40 border border-[#86BBD8]/35 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors">
                <Plus className="w-4 h-4" /> Log Production
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {kpiCards.map(k => {
                const pct = k.actual / k.target * 100;
                const good = pct >= 95;
                return (
                  <div key={k.label} className="bg-white/[0.06] rounded-xl p-3">
                    <div className="text-white/50 text-xs mb-1">{k.label}</div>
                    <div className={`text-2xl font-bold ${good ? 'text-emerald-300' : 'text-amber-300'}`}>{k.actual}{k.unit}</div>
                    <div className="text-white/30 text-xs mt-0.5">Target: {k.target}{k.unit}</div>
                    <div className="h-1 rounded-full bg-white/[0.08] overflow-hidden mt-2">
                      <div className={`h-full rounded-full ${good ? 'bg-emerald-400' : 'bg-amber-400'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {showForm && (
        <section className="container mx-auto px-4 pb-2">
          <div className="oz-glass-panel rounded-2xl overflow-hidden p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold">Log Production Data</h2>
              <button onClick={() => setShowForm(false)} className="text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <input type="date" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))} className={INPUT} />
              <select value={form.shift} onChange={e => setForm(f => ({...f, shift: e.target.value}))} className={INPUT}>
                {['Day','Night','Afternoon'].map(s => <option key={s}>{s}</option>)}
              </select>
              <input placeholder="Tonnes Milled" type="number" value={form.tonnesMilled} onChange={e => setForm(f => ({...f, tonnesMilled: e.target.value}))} className={INPUT} />
              <input placeholder="Feed Rate (tph)" type="number" value={form.feedRate} onChange={e => setForm(f => ({...f, feedRate: e.target.value}))} className={INPUT} />
              <input placeholder="Grade (g/t)" type="number" step="0.1" value={form.grade} onChange={e => setForm(f => ({...f, grade: e.target.value}))} className={INPUT} />
              <input placeholder="Recovery %" type="number" step="0.1" value={form.recovery} onChange={e => setForm(f => ({...f, recovery: e.target.value}))} className={INPUT} />
              <input placeholder="Gold Oz" type="number" value={form.goldOz} onChange={e => setForm(f => ({...f, goldOz: e.target.value}))} className={INPUT} />
              <input placeholder="Mill Avail %" type="number" value={form.millAvail} onChange={e => setForm(f => ({...f, millAvail: e.target.value}))} className={INPUT} />
              <input placeholder="Power kWh" type="number" value={form.powerKwh} onChange={e => setForm(f => ({...f, powerKwh: e.target.value}))} className={INPUT} />
              <input placeholder="Downtime Hrs" type="number" step="0.1" value={form.downtimeHrs} onChange={e => setForm(f => ({...f, downtimeHrs: e.target.value}))} className={INPUT} />
              <input placeholder="Downtime Reason" value={form.downtimeReason} onChange={e => setForm(f => ({...f, downtimeReason: e.target.value}))} className={INPUT} />
              <input placeholder="Comments" value={form.comments} onChange={e => setForm(f => ({...f, comments: e.target.value}))} className={INPUT} />
            </div>
            <button type="button" onClick={submit} className="bg-[#86BBD8]/25 hover:bg-[#86BBD8]/40 border border-[#86BBD8]/35 text-white font-semibold px-5 py-2 rounded-xl text-sm transition-colors">Save Record</button>
          </div>
        </section>
      )}

      <section className="container mx-auto px-4 pb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="oz-glass-panel rounded-2xl p-5">
            <h2 className="text-white font-semibold mb-4">Tonnes Milled Trend</h2>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} interval={1} />
                <YAxis domain={[1700, 2000]} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <ReferenceLine y={TARGETS.tonnesMilled} stroke="rgba(134,187,216,0.4)" strokeDasharray="4 4" label={{ value: 'Target', fill: 'rgba(134,187,216,0.6)', fontSize: 10 }} />
                <Line type="monotone" dataKey="tonnes" name="Tonnes" stroke="#86BBD8" strokeWidth={2} dot={{ r: 2, fill: '#86BBD8' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="oz-glass-panel rounded-2xl p-5">
            <h2 className="text-white font-semibold mb-4">Grade Trend (g/t)</h2>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} interval={1} />
                <YAxis domain={[2.3, 3.5]} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <ReferenceLine y={TARGETS.grade} stroke="rgba(251,191,36,0.4)" strokeDasharray="4 4" label={{ value: 'Target', fill: 'rgba(251,191,36,0.6)', fontSize: 10 }} />
                <Line type="monotone" dataKey="grade" name="Grade g/t" stroke="#fbbf24" strokeWidth={2} dot={{ r: 2, fill: '#fbbf24' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 pb-8">
        <div className="oz-glass-panel rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-white/10"><h2 className="text-white font-semibold">Production Records — Last 14 Shifts</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {['Date','Shift','Tonnes','Grade','Recovery','Gold Oz','Avail%','Downtime','Reason'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-white/40 text-xs font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {records.slice(0, 14).map(r => (
                  <tr key={r.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="px-4 py-2.5 text-white/80">{r.date}</td>
                    <td className="px-4 py-2.5 text-white/60">{r.shift}</td>
                    <td className={`px-4 py-2.5 font-semibold ${r.tonnesMilled >= TARGETS.tonnesMilled ? 'text-emerald-400' : 'text-amber-400'}`}>{r.tonnesMilled}</td>
                    <td className={`px-4 py-2.5 font-semibold ${r.grade >= TARGETS.grade ? 'text-emerald-400' : 'text-amber-400'}`}>{r.grade}</td>
                    <td className={`px-4 py-2.5 ${r.recovery >= TARGETS.recovery ? 'text-emerald-400' : 'text-amber-400'}`}>{r.recovery}%</td>
                    <td className={`px-4 py-2.5 font-semibold ${r.goldOz >= TARGETS.goldOz ? 'text-emerald-400' : 'text-amber-400'}`}>{r.goldOz}</td>
                    <td className="px-4 py-2.5 text-white/70">{r.millAvail}%</td>
                    <td className="px-4 py-2.5 text-white/60">{r.downtimeHrs}h</td>
                    <td className="px-4 py-2.5 text-white/40 text-xs">{r.downtimeReason || '—'}</td>
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
