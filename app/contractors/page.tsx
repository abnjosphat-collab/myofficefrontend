// FILE: app/contractors/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { AppShell } from '@/components/app-shell';
import { HardHat, Star, ChevronDown, ChevronUp, Plus, X, RefreshCw } from 'lucide-react';
import { useTheme, PageHero, StatTile, StatusBadge, ProgressBar, FormField, PrimaryButton, GlowCard, SelectField } from '@/components/shared/theme';

const _API = (process.env.NEXT_PUBLIC_API_URL || 'https://myofficebackend.onrender.com').replace(/\/$/, '');
const CONT_URL = `${_API}/api/contractors`;

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
  status: CStatus; rating: number; contractExpiry: string; insuranceExpiry: string; jobs: Job[];
}

const TRADES = ['Mechanical', 'Electrical', 'Civil', 'OEM Specialist', 'Instrumentation', 'Scaffolding'];
const daysUntil = (d: string) => Math.round((new Date(d).getTime() - Date.now()) / 86400000);

function Stars({ n }: { n: number }) {
  return <div className="flex gap-0.5">{[1, 2, 3, 4, 5].map(i => <Star key={i} className={`w-3.5 h-3.5 ${i <= n ? 'text-amber-400 fill-amber-400' : 'text-slate-400/40'}`} />)}</div>;
}

function ContractorsContent() {
  const t = useTheme();
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

  const displayed = contractors.filter(c => tradeFilter === 'all' || c.trade === tradeFilter).filter(c => statusFilter === 'all' || c.status === statusFilter);

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
  const inputCls = `w-full h-9 px-3 rounded-lg text-sm outline-none transition-colors ${t.inputBg}`;

  return (
    <main className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <PageHero
        icon={HardHat}
        accent="violet"
        crumbs={['Core Management', 'Contractors']}
        title="Contractor Management"
        description="Third-party contractor register and job tracking"
        statsOpen
        actions={<PrimaryButton icon={Plus} accent="violet" onClick={() => setShowAdd(s => !s)}>Add Contractor</PrimaryButton>}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatTile icon={HardHat} color="#86BBD8" label="Total" value={stats.total} />
          <StatTile icon={HardHat} color="#34d399" label="Active" value={stats.active} />
          <StatTile icon={HardHat} color="#94a3b8" label="Inactive" value={stats.inactive} />
          <StatTile icon={HardHat} color="#86BBD8" label="Current Jobs" value={stats.jobs} />
        </div>
      </PageHero>

      {showAdd && (
        <div className={`${t.glass} rounded-2xl ${t.shadow} p-6`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`font-semibold ${t.textPrimary}`}>New Contractor</h2>
            <button type="button" aria-label="Close" onClick={() => setShowAdd(false)} className={`${t.textFaint} ${t.hoverText} transition-colors`}><X className="w-5 h-5" /></button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            <FormField label="Company Name"><input placeholder="Company Name" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} className={inputCls} /></FormField>
            <FormField label="Trade">
              <SelectField size="form" title="Trade" value={form.trade} onChange={v => setForm(f => ({ ...f, trade: v }))}
                options={TRADES.map(tr => ({ value: tr, label: tr }))} />
            </FormField>
            <FormField label="Contact Person"><input placeholder="Contact Person" value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} className={inputCls} /></FormField>
            <FormField label="Phone"><input placeholder="Phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={inputCls} /></FormField>
            <FormField label="Contract Expiry"><input type="date" title="Contract expiry date" value={form.contractExpiry} onChange={e => setForm(f => ({ ...f, contractExpiry: e.target.value }))} className={inputCls} /></FormField>
            <FormField label="Insurance Expiry"><input type="date" title="Insurance expiry date" value={form.insuranceExpiry} onChange={e => setForm(f => ({ ...f, insuranceExpiry: e.target.value }))} className={inputCls} /></FormField>
          </div>
          <PrimaryButton accent="violet" size="md" onClick={submit}>Save Contractor</PrimaryButton>
        </div>
      )}

      <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
        <div className={`p-4 border-b ${t.border} flex items-center justify-between flex-wrap gap-3`}>
          <h2 className={`font-semibold ${t.textPrimary}`}>Contractor Register</h2>
          <div className="flex gap-2 flex-wrap">
            <SelectField size="filter" title="Filter by trade" value={tradeFilter} onChange={setTradeFilter}
              options={[{ value: 'all', label: 'All Trades' }, ...TRADES.map(tr => ({ value: tr, label: tr }))]} />
            {(['all', 'active', 'inactive'] as const).map(s => (
              <button type="button" key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${statusFilter === s ? 'bg-blue-500/20 text-blue-500' : `${t.chipBg} ${t.textFaint} ${t.hoverText}`}`}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className={`divide-y ${t.divide}`}>
          {loading ? (
            <div className={`flex items-center justify-center py-12 gap-2 ${t.textFaint} text-sm`}><RefreshCw className="h-5 w-5 animate-spin" /> Loading…</div>
          ) : displayed.map(c => {
            const cDays = daysUntil(c.contractExpiry);
            const iDays = daysUntil(c.insuranceExpiry);
            return (
              <div key={c.id}>
                <button type="button" onClick={() => setExpanded(prev => prev === c.id ? null : c.id)} className={`w-full flex items-center gap-4 px-5 py-4 ${t.hoverBg} transition-colors text-left`}>
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-x-4 items-center">
                    <div>
                      <div className={`font-medium text-sm ${t.textPrimary}`}>{c.company}</div>
                      <div className={`text-xs ${t.textFaint}`}>{c.contact} · {c.phone}</div>
                    </div>
                    <span className="w-fit"><StatusBadge color="#86BBD8" label={c.trade} /></span>
                    <Stars n={c.rating} />
                    <div className="hidden md:block">
                      <div className={`text-xs ${t.textFaint}`}>Contract: <span className={cDays < 30 ? 'text-amber-500' : t.textMuted}>{c.contractExpiry}</span></div>
                      <div className={`text-xs ${t.textFaint}`}>Insurance: <span className={iDays < 30 ? 'text-amber-500' : t.textMuted}>{c.insuranceExpiry}</span></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge color={c.status === 'active' ? '#34d399' : '#94a3b8'} label={c.status} />
                      <span className={`text-xs ${t.textFaint}`}>{c.jobs.length} job{c.jobs.length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  {expanded === c.id ? <ChevronUp className={`w-4 h-4 ${t.textFaint}`} /> : <ChevronDown className={`w-4 h-4 ${t.textFaint}`} />}
                </button>
                {expanded === c.id && (
                  <div className={`px-5 pb-5 ${t.chipBg}`}>
                    {c.jobs.length === 0 ? <div className={`text-sm ${t.textFaint}`}>No active jobs.</div> : (
                      <div className="space-y-3">
                        {c.jobs.map((j, i) => (
                          <GlowCard key={i} color="#86BBD8" surface={`${t.glass} rounded-xl`} className="p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div><div className={`text-sm font-medium ${t.textPrimary}`}>{j.title}</div><div className={`text-xs ${t.textFaint}`}>{j.location} · Started {j.startDate}</div></div>
                              <span className={`text-sm font-semibold ${t.textMuted}`}>{j.progress}%</span>
                            </div>
                            <ProgressBar value={j.progress} color="#86BBD8" showValue={false} />
                          </GlowCard>
                        ))}
                      </div>
                    )}
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

export default function ContractorsPage() {
  return <AppShell><ContractorsContent /></AppShell>;
}
