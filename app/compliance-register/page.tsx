// FILE: app/compliance-register/page.tsx
'use client';

import { useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { ShieldCheck, AlertTriangle, Plus, X, RefreshCw } from 'lucide-react';
import { useModuleData } from '@/lib/useModuleData';

type Status = 'current' | 'due_soon' | 'overdue';

interface ComplianceItem {
  id: number; equipment_name: string; inspection_type: string; regulatory_body: string;
  certificate_no: string; expiry_date: string; status: Status; responsible: string; notes: string;
}

const statusStyle: Record<Status, string> = {
  current: 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300',
  due_soon: 'bg-amber-500/20 border-amber-400/40 text-amber-300',
  overdue: 'bg-rose-500/20 border-rose-400/40 text-rose-300',
};
const statusLabel: Record<Status, string> = { current: 'Current', due_soon: 'Due Soon', overdue: 'Overdue' };

const daysUntil = (d: string) => Math.round((new Date(d).getTime() - Date.now()) / 86400000);

const INPUT = 'bg-white/[0.07] border border-white/12 text-white placeholder:text-white/30 focus:outline-none focus:border-[#86BBD8]/50 rounded-xl px-3 py-2 text-sm w-full';

export default function ComplianceRegisterPage() {
  const { data: records, loading, error, create, refetch } = useModuleData<ComplianceItem>('compliance');
  const [filter, setFilter] = useState<Status | 'all'>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ equipment_name: '', inspection_type: '', regulatory_body: '', certificate_no: '', expiry_date: '', responsible: '', notes: '' });

  const displayed = filter === 'all' ? records : records.filter(i => i.status === filter);

  const counts = { current: records.filter(i => i.status === 'current').length, due_soon: records.filter(i => i.status === 'due_soon').length, overdue: records.filter(i => i.status === 'overdue').length };

  const submit = async () => {
    if (!form.equipment_name || !form.expiry_date) return;
    await create(form);
    refetch();
    setForm({ equipment_name: '', inspection_type: '', regulatory_body: '', certificate_no: '', expiry_date: '', responsible: '', notes: '' });
    setShowAdd(false);
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
      <section className="relative text-white">
        <div className="container mx-auto px-4 pt-6 pb-3">
          <div className="oz-glass-dark rounded-2xl overflow-hidden p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-7 h-7 text-[#86BBD8]" />
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Statutory Compliance Register</h1>
                  <p className="text-white/50 text-sm mt-0.5">Regulatory certificates and inspection tracking</p>
                </div>
              </div>
              <button onClick={() => setShowAdd(s => !s)} className="flex items-center gap-2 bg-[#86BBD8]/25 hover:bg-[#86BBD8]/40 border border-[#86BBD8]/35 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors">
                <Plus className="w-4 h-4" /> Add Item
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-5">
              {([['Current', counts.current, 'text-emerald-300'], ['Due Soon', counts.due_soon, 'text-amber-300'], ['Overdue', counts.overdue, 'text-rose-300']] as const).map(([l, v, c]) => (
                <div key={l} className="bg-white/[0.06] rounded-xl p-3 text-center">
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
              <h2 className="text-white font-semibold">New Compliance Item</h2>
              <button onClick={() => setShowAdd(false)} className="text-white/40 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              <input placeholder="Equipment Name" value={form.equipment_name} onChange={e => setForm(f => ({ ...f, equipment_name: e.target.value }))} className={INPUT} />
              <input placeholder="Inspection Type" value={form.inspection_type} onChange={e => setForm(f => ({ ...f, inspection_type: e.target.value }))} className={INPUT} />
              <input placeholder="Regulatory Body" value={form.regulatory_body} onChange={e => setForm(f => ({ ...f, regulatory_body: e.target.value }))} className={INPUT} />
              <input placeholder="Certificate No." value={form.certificate_no} onChange={e => setForm(f => ({ ...f, certificate_no: e.target.value }))} className={INPUT} />
              <input type="date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} className={INPUT} />
              <input placeholder="Responsible Person" value={form.responsible} onChange={e => setForm(f => ({ ...f, responsible: e.target.value }))} className={INPUT} />
            </div>
            <button onClick={submit} className="bg-[#86BBD8]/25 hover:bg-[#86BBD8]/40 border border-[#86BBD8]/35 text-white font-semibold px-5 py-2 rounded-xl text-sm transition-colors">Add to Register</button>
          </div>
        </section>
      )}

      <section className="container mx-auto px-4 pb-8">
        <div className="oz-glass-panel rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-white/10 flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-white font-semibold">Compliance Items</h2>
            <div className="flex gap-2">
              {(['all', 'current', 'due_soon', 'overdue'] as const).map(s => (
                <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${filter === s ? 'bg-[#86BBD8]/25 border-[#86BBD8]/40 text-white' : 'bg-white/[0.05] border-white/10 text-white/50 hover:text-white'}`}>
                  {s === 'all' ? 'All' : s === 'due_soon' ? 'Due Soon' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {['Equipment', 'Inspection Type', 'Reg. Body', 'Cert. No.', 'Expiry', 'Days', 'Status', 'Responsible'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-white/40 text-xs font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {displayed.map(item => {
                  const days = daysUntil(item.expiry_date);
                  return (
                    <tr key={item.id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="px-4 py-3 text-white font-medium">{item.equipment_name}</td>
                      <td className="px-4 py-3 text-white/70">{item.inspection_type}</td>
                      <td className="px-4 py-3"><span className="bg-[#2A4D69]/40 border border-[#86BBD8]/20 text-[#86BBD8] px-2 py-0.5 rounded-full text-[10px] font-semibold">{item.regulatory_body}</span></td>
                      <td className="px-4 py-3 text-white/50 font-mono text-xs">{item.certificate_no}</td>
                      <td className="px-4 py-3 text-white/70">{item.expiry_date}</td>
                      <td className="px-4 py-3">
                        <span className={`font-semibold text-xs ${days < 0 ? 'text-rose-400' : days <= 30 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {days < 0 ? `${Math.abs(days)}d ago` : `${days}d`}
                        </span>
                      </td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusStyle[item.status]}`}>{statusLabel[item.status]}</span></td>
                      <td className="px-4 py-3 text-white/60">{item.responsible}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
