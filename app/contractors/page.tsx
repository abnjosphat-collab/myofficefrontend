// FILE: app/contractors/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageShell } from '@/components/PageShell';
import { HardHat, Star, ChevronDown, ChevronUp, Plus, X, RefreshCw } from 'lucide-react';

const _API = (process.env.NEXT_PUBLIC_API_URL || 'https://myofficebackend.onrender.com').replace(/\/$/, '');
const CONT_URL = `${_API}/api/contractors`;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fromContAPI = (d: any): Contractor => ({
  id: d.id, company: d.company_name || '', trade: d.trade || '',
  contact: d.contact_name || '', phone: d.phone || '',
  status: (d.status as CStatus) || 'active', rating: d.performance_rating || 3,
  contractExpiry: d.contract_end || '', insuranceExpiry: d.insurance_expiry || '',
  jobs: (d.jobs || []).map((j: any) => ({ title: j.job_title, location: j.equipment_name || '', startDate: j.start_date || '', progress: j.status === 'completed' ? 100 : j.status === 'in_progress' ? 50 : 0 })),
});

type CStatus = 'active' | 'inactive';

interface Job { title: string; location: string; startDate: string; progress: number; }
interface Contractor {
  id: number; company: string; trade: string; contact: string; phone: string;
  status: CStatus; rating: number; contractExpiry: string; insuranceExpiry: string;
  jobs: Job[];
}

const TRADES = ['Mechanical', 'Electrical', 'Civil', 'OEM Specialist', 'Instrumentation', 'Scaffolding'];

const DEMO: Contractor[] = [
  { id: 1, company: 'Zimtech Engineering', trade: 'Mechanical', contact: 'R. Banda', phone: '+263 77 123 4567', status: 'active', rating: 4, contractExpiry: '2026-12-31', insuranceExpiry: '2026-09-30',
    jobs: [{ title: 'SAG Mill Liner Change-out', location: 'Milling', startDate: '2026-06-01', progress: 35 }, { title: 'Conveyor Belt Replacement CV03', location: 'Crushing', startDate: '2026-05-28', progress: 70 }] },
  { id: 2, company: 'PowerElec Solutions', trade: 'Electrical', contact: 'B. Sithole', phone: '+263 71 234 5678', status: 'active', rating: 5, contractExpiry: '2027-03-31', insuranceExpiry: '2026-11-30',
    jobs: [{ title: 'MCC Panel Upgrade Block B', location: 'Electrical Room', startDate: '2026-05-20', progress: 60 }] },
  { id: 3, company: 'Groundworks Civil Ltd', trade: 'Civil', contact: 'C. Mhanga', phone: '+263 73 345 6789', status: 'active', rating: 3, contractExpiry: '2026-08-15', insuranceExpiry: '2026-07-31',
    jobs: [{ title: 'Tailings Line Concrete Works', location: 'Tailings', startDate: '2026-06-02', progress: 10 }] },
  { id: 4, company: 'Metso OEM Services', trade: 'OEM Specialist', contact: 'A. Pretorius', phone: '+27 82 456 7890', status: 'active', rating: 5, contractExpiry: '2026-10-31', insuranceExpiry: '2026-10-31',
    jobs: [{ title: 'Jaw Crusher Toggle Seat Overhaul', location: 'Primary Crushing', startDate: '2026-06-05', progress: 0 }, { title: 'Hydrocyclone Vortex Finder Replacement', location: 'Classification', startDate: '2026-05-30', progress: 100 }] },
  { id: 5, company: 'Vaalco Instrumentation', trade: 'Instrumentation', contact: 'D. Ncube', phone: '+263 77 567 8901', status: 'inactive', rating: 2, contractExpiry: '2025-12-31', insuranceExpiry: '2025-11-30',
    jobs: [] },
  { id: 6, company: 'SafeScaff Zimbabwe', trade: 'Scaffolding', contact: 'K. Dube', phone: '+263 71 678 9012', status: 'active', rating: 4, contractExpiry: '2026-09-30', insuranceExpiry: '2026-09-30',
    jobs: [{ title: 'Thickener Scaffold Erection', location: 'Leaching Circuit', startDate: '2026-06-03', progress: 20 }] },
];

const INPUT = 'bg-white/[0.07] border border-white/12 text-white placeholder:text-white/30 focus:outline-none focus:border-[#86BBD8]/50 rounded-xl px-3 py-2 text-sm w-full';

const daysUntil = (d: string) => Math.round((new Date(d).getTime() - Date.now()) / 86400000);

function Stars({ n }: { n: number }) {
  return <div className="flex gap-0.5">{[1,2,3,4,5].map(i => <Star key={i} className={`w-3.5 h-3.5 ${i <= n ? 'text-amber-400 fill-amber-400' : 'text-white/20'}`} />)}</div>;
}

export default function ContractorsPage() {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContractors = useCallback(async () => {
    setLoading(true);
    try { const r = await fetch(CONT_URL); if (r.ok) setContractors((await r.json()).map(fromContAPI)); }
    catch { /* network */ } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchContractors(); }, [fetchContractors]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [tradeFilter, setTradeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | CStatus>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ company: '', trade: 'Mechanical', contact: '', phone: '', contractExpiry: '', insuranceExpiry: '' });

  const displayed = contractors
    .filter(c => tradeFilter === 'all' || c.trade === tradeFilter)
    .filter(c => statusFilter === 'all' || c.status === statusFilter);

  const submit = async () => {
    if (!form.company) return;
    try {
      const body = { company_name: form.company, trade: form.trade, contact_name: form.contact, phone: form.phone, contract_end: form.contractExpiry || null, insurance_expiry: form.insuranceExpiry || null, status: 'active', performance_rating: 3 };
      const r = await fetch(CONT_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (r.ok) fetchContractors();
    } catch { /* ignore */ }
    setForm({ company: '', trade: 'Mechanical', contact: '', phone: '', contractExpiry: '', insuranceExpiry: '' });
    setShowAdd(false);
  };

  const stats = { total: contractors.length, active: contractors.filter(c => c.status === 'active').length, inactive: contractors.filter(c => c.status === 'inactive').length, jobs: contractors.reduce((s, c) => s + c.jobs.length, 0) };

  return (
    <PageShell>
      <section className="relative text-white">
        <div className="container mx-auto px-4 pt-6 pb-3">
          <div className="oz-glass-dark rounded-2xl overflow-hidden p-6">
            <div className="flex items-center justify-between flex-wrap gap-4 mb-5">
              <div className="flex items-center gap-3">
                <HardHat className="w-7 h-7 text-[#86BBD8]" />
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Contractor Management</h1>
                  <p className="text-white/50 text-sm mt-0.5">Third-party contractor register and job tracking</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowAdd(s => !s)} className="flex items-center gap-2 bg-[#86BBD8]/25 hover:bg-[#86BBD8]/40 border border-[#86BBD8]/35 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors">
                <Plus className="w-4 h-4" /> Add Contractor
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[['Total', stats.total, 'text-white'], ['Active', stats.active, 'text-emerald-300'], ['Inactive', stats.inactive, 'text-white/50'], ['Current Jobs', stats.jobs, 'text-[#86BBD8]']].map(([l, v, c]) => (
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
              <h2 className="text-white font-semibold">New Contractor</h2>
              <button type="button" aria-label="Close" onClick={() => setShowAdd(false)} className="text-white/40 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              <input placeholder="Company Name" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} className={INPUT} />
              <select aria-label="Trade" title="Trade" value={form.trade} onChange={e => setForm(f => ({ ...f, trade: e.target.value }))} className={INPUT}>
                {TRADES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <input placeholder="Contact Person" value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} className={INPUT} />
              <input placeholder="Phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={INPUT} />
              <div><label htmlFor="contract-expiry" className="text-white/40 text-xs mb-1 block">Contract Expiry</label><input id="contract-expiry" type="date" title="Contract expiry date" value={form.contractExpiry} onChange={e => setForm(f => ({ ...f, contractExpiry: e.target.value }))} className={INPUT} /></div>
              <div><label htmlFor="insurance-expiry" className="text-white/40 text-xs mb-1 block">Insurance Expiry</label><input id="insurance-expiry" type="date" title="Insurance expiry date" value={form.insuranceExpiry} onChange={e => setForm(f => ({ ...f, insuranceExpiry: e.target.value }))} className={INPUT} /></div>
            </div>
            <button type="button" onClick={submit} className="bg-[#86BBD8]/25 hover:bg-[#86BBD8]/40 border border-[#86BBD8]/35 text-white font-semibold px-5 py-2 rounded-xl text-sm transition-colors">Save Contractor</button>
          </div>
        </section>
      )}

      <section className="container mx-auto px-4 pb-8">
        <div className="oz-glass-panel rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-white/10 flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-white font-semibold">Contractor Register</h2>
            <div className="flex gap-2 flex-wrap">
              <select aria-label="Filter by trade" value={tradeFilter} onChange={e => setTradeFilter(e.target.value)} className="bg-white/[0.07] border border-white/12 text-white text-xs rounded-lg px-2 py-1 focus:outline-none">
                <option value="all">All Trades</option>
                {TRADES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              {(['all', 'active', 'inactive'] as const).map(s => (
                <button type="button" key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${statusFilter === s ? 'bg-[#86BBD8]/25 border-[#86BBD8]/40 text-white' : 'bg-white/[0.05] border-white/10 text-white/50 hover:text-white'}`}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="divide-y divide-white/[0.06]">
            {loading ? (
              <div className="flex items-center justify-center py-12 gap-2 text-white/30 text-sm">
                <RefreshCw className="h-5 w-5 animate-spin" /> Loading…
              </div>
            ) : displayed.map(c => {
              const cDays = daysUntil(c.contractExpiry);
              const iDays = daysUntil(c.insuranceExpiry);
              return (
                <div key={c.id}>
                  <button type="button" onClick={() => setExpanded(prev => prev === c.id ? null : c.id)} className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/[0.03] transition-colors text-left">
                    <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-x-4 items-center">
                      <div>
                        <div className="text-white font-medium text-sm">{c.company}</div>
                        <div className="text-white/40 text-xs">{c.contact} · {c.phone}</div>
                      </div>
                      <span className="bg-[#2A4D69]/40 border border-[#86BBD8]/20 text-[#86BBD8] px-2 py-0.5 rounded-full text-[10px] font-semibold w-fit">{c.trade}</span>
                      <Stars n={c.rating} />
                      <div className="hidden md:block">
                        <div className="text-white/40 text-xs">Contract: <span className={cDays < 30 ? 'text-amber-400' : 'text-white/60'}>{c.contractExpiry}</span></div>
                        <div className="text-white/40 text-xs">Insurance: <span className={iDays < 30 ? 'text-amber-400' : 'text-white/60'}>{c.insuranceExpiry}</span></div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${c.status === 'active' ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300' : 'bg-white/10 border-white/20 text-white/50'}`}>{c.status}</span>
                        <span className="text-white/40 text-xs">{c.jobs.length} job{c.jobs.length !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    {expanded === c.id ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
                  </button>
                  {expanded === c.id && (
                    <div className="px-5 pb-5 bg-white/[0.02]">
                      {c.jobs.length === 0 ? <div className="text-white/30 text-sm">No active jobs.</div> : (
                        <div className="space-y-3">
                          {c.jobs.map((j, i) => (
                            <div key={i} className="bg-white/[0.04] rounded-xl p-3">
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <div className="text-white text-sm font-medium">{j.title}</div>
                                  <div className="text-white/40 text-xs">{j.location} · Started {j.startDate}</div>
                                </div>
                                <span className="text-white/60 text-sm font-semibold">{j.progress}%</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                                <div className="h-full rounded-full bg-[#86BBD8] oz-progress-fill" style={{ '--oz-pct': `${j.progress}%` } as React.CSSProperties} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div> {/* end loading ternary */}
        </div>
      </section>
    </PageShell>
  );
}
