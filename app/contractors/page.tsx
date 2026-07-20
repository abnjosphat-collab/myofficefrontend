// FILE: app/contractors/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/apiClient';
import { motion } from 'framer-motion';
import { AppShell } from '@/components/app-shell';
import { HardHat, Star, ChevronDown, ChevronUp, Plus, X, RefreshCw, LayoutGrid, List } from '@/components/shared/theme';
import {
  useTheme, PageHero, StatTile, StatusBadge, ProgressBar, FormField, PrimaryButton, GlowCard, SelectField,
  ViewToggle, GroupSection, RecordCard, ACCENT_HEX, staggerContainer, fadeUp, InfoRow,
} from '@/components/shared/theme';


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

// Palette for trades — drawn from the shared ACCENT_HEX brand palette (not
// arbitrary hexes), hashed so each distinct trade gets a stable color.
const GROUP_PALETTE = [ACCENT_HEX.blue, ACCENT_HEX.amber, ACCENT_HEX.emerald, ACCENT_HEX.violet, ACCENT_HEX.cyan, ACCENT_HEX.indigo];
function tradeColor(trade?: string) {
  if (!trade) return '#94a3b8';
  let h = 0;
  for (let i = 0; i < trade.length; i++) h = (h * 31 + trade.charCodeAt(i)) >>> 0;
  return GROUP_PALETTE[h % GROUP_PALETTE.length];
}

// InfoRow now comes from the shared design system (promoted from this page's
// own local version — see the design-system migration).

function JobsList({ jobs }: { jobs: Job[] }) {
  const t = useTheme();
  if (jobs.length === 0) return <p className={`text-xs ${t.textFaint}`}>No active jobs.</p>;
  return (
    <div className="space-y-2">
      <p className={`text-[10px] font-semibold ${t.textTertiary} uppercase tracking-wider`}>Active Jobs</p>
      {jobs.map((j, i) => (
        <div key={i} className={`p-2.5 rounded-lg ${t.chipBg}`}>
          <div className="flex items-center justify-between mb-1.5">
            <div><div className={`text-xs font-medium ${t.textPrimary}`}>{j.title}</div><div className={`text-[11px] ${t.textFaint}`}>{j.location} · Started {j.startDate}</div></div>
            <span className={`text-xs font-semibold ${t.textMuted}`}>{j.progress}%</span>
          </div>
          <ProgressBar value={j.progress} color={ACCENT_HEX.blue} showValue={false} />
        </div>
      ))}
    </div>
  );
}

// ─── ContractorCard — built on the shared RecordCard so it inherits the exact
// homepage module-card treatment (bare accent icon, Montserrat title, GlowCard
// lift/glow). Key summary always visible; the rest expands in place. ──
function ContractorCard({ c }: { c: Contractor }) {
  const t = useTheme();
  const color = tradeColor(c.trade);
  const cDays = daysUntil(c.contractExpiry);
  const iDays = daysUntil(c.insuranceExpiry);

  return (
    <RecordCard
      icon={HardHat}
      accentHex={color}
      title={c.company}
      subtitle={c.contact}
      badges={<>
        <StatusBadge color={color} label={c.trade} />
        <StatusBadge color={c.status === 'active' ? '#34d399' : '#94a3b8'} label={c.status} />
      </>}
      summary={
        <div className="flex items-center justify-between">
          <Stars n={c.rating} />
          <span className={`text-xs ${t.textFaint}`}>{c.jobs.length} job{c.jobs.length !== 1 ? 's' : ''}</span>
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
        <InfoRow label="Phone" value={c.phone} />
        <InfoRow label="Rating" value={`${c.rating}/5`} />
        <InfoRow label="Contract Expiry" value={c.contractExpiry && <span className={cDays < 30 ? 'text-amber-500' : undefined}>{c.contractExpiry}</span>} />
        <InfoRow label="Insurance Expiry" value={c.insuranceExpiry && <span className={iDays < 30 ? 'text-amber-500' : undefined}>{c.insuranceExpiry}</span>} />
      </div>
      <JobsList jobs={c.jobs} />
    </RecordCard>
  );
}

// ─── ContractorRow — compact list-view row, mirroring EmployeeRow's pattern. ──
function ContractorRow({ c }: { c: Contractor }) {
  const t = useTheme();
  const [expanded, setExpanded] = useState(false);
  const color = tradeColor(c.trade);
  const cDays = daysUntil(c.contractExpiry);
  const iDays = daysUntil(c.insuranceExpiry);

  return (
    <div className={`border-b ${t.border}`}>
      <div className={`flex items-center gap-3.5 px-4 py-3 ${t.hoverBgSoft} transition-colors group`}>
        <div className="shrink-0"><HardHat className="h-5 w-5" style={{ color }} /></div>

        <button type="button" onClick={() => setExpanded(o => !o)} className="flex-1 min-w-0 text-left">
          <div className={`font-semibold text-sm ${t.textPrimary}`}>{c.company}</div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className={`text-xs ${t.textFaint}`}>{c.contact} · {c.phone}</span>
            <StatusBadge color={c.status === 'active' ? '#34d399' : '#94a3b8'} label={c.status} />
          </div>
        </button>

        <div className="flex items-center gap-3 shrink-0">
          <Stars n={c.rating} />
          <span className={`hidden sm:block text-[11px] ${t.textFaint}`}>{c.jobs.length} job{c.jobs.length !== 1 ? 's' : ''}</span>
        </div>

        <button type="button" title={expanded ? 'Collapse' : 'Expand'} onClick={() => setExpanded(o => !o)}
          className={`h-7 w-7 flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} ${t.hoverText} transition-all`}>
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      {expanded && (
        <div className={`px-4 pb-4 pt-3 border-t ${t.border} ${t.hoverBgSoft} space-y-3`}>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
            <InfoRow label="Contract Expiry" value={c.contractExpiry && <span className={cDays < 30 ? 'text-amber-500' : undefined}>{c.contractExpiry}</span>} />
            <InfoRow label="Insurance Expiry" value={c.insuranceExpiry && <span className={iDays < 30 ? 'text-amber-500' : undefined}>{c.insuranceExpiry}</span>} />
          </div>
          <JobsList jobs={c.jobs} />
        </div>
      )}
    </div>
  );
}

function ContractorsContent() {
  const t = useTheme();
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContractors = useCallback(async () => {
    setLoading(true);
    try { setContractors((await api.get<any[]>('/api/contractors')).map(fromContAPI)); }
    catch { /* network */ } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchContractors(); }, [fetchContractors]);
  const [tradeFilter, setTradeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | CStatus>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ company: '', trade: 'Mechanical', contact: '', phone: '', contractExpiry: '', insuranceExpiry: '' });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  // Records are grouped by trade (homepage category-accordion vocabulary); this
  // tracks which trade groups the user has collapsed (default: all open).
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const displayed = contractors.filter(c => tradeFilter === 'all' || c.trade === tradeFilter).filter(c => statusFilter === 'all' || c.status === statusFilter);

  // Group by trade — alphabetically, "Unspecified" last.
  const grouped = (() => {
    const map = new Map<string, Contractor[]>();
    for (const c of displayed) {
      const key = c.trade || 'Unspecified';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    return [...map.keys()]
      .sort((a, b) => (a === 'Unspecified' ? 1 : b === 'Unspecified' ? -1 : a.localeCompare(b)))
      .map(trade => ({ trade, color: tradeColor(trade === 'Unspecified' ? undefined : trade), contractors: map.get(trade)! }));
  })();
  const isGroupOpen = (trade: string) => !collapsedGroups.has(trade);
  const toggleGroup = (trade: string) => setCollapsedGroups(prev => {
    const next = new Set(prev);
    next.has(trade) ? next.delete(trade) : next.add(trade);
    return next;
  });

  const submit = async () => {
    if (!form.company) return;
    try {
      const body = { company_name: form.company, trade: form.trade, contact_name: form.contact, phone: form.phone, contract_end: form.contractExpiry || null, insurance_expiry: form.insuranceExpiry || null, status: 'active', performance_rating: 3 };
      await api.post('/api/contractors', body);
      fetchContractors();
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
            <button type="button" aria-label="Close" title="Close" onClick={() => setShowAdd(false)} className={`h-9 w-9 flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} ${t.hoverText} transition-colors`}><X className="w-5 h-5" /></button>
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
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${statusFilter === s ? 'bg-brand-500/20 text-brand-500' : `${t.chipBg} ${t.textFaint} ${t.hoverText}`}`}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
            <ViewToggle value={viewMode} onChange={setViewMode} options={[{ value: 'grid', icon: LayoutGrid, label: 'Grid view' }, { value: 'list', icon: List, label: 'List view' }]} />
          </div>
        </div>
        <div className="p-4">
          {loading ? (
            <div className={`flex items-center justify-center py-12 gap-2 ${t.textFaint} text-sm`}><RefreshCw className="h-5 w-5 animate-spin" /> Loading…</div>
          ) : (
            <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-3">
              {grouped.map(g => (
                <GroupSection
                  key={g.trade}
                  icon={HardHat}
                  accentHex={g.color}
                  title={g.trade}
                  count={g.contractors.length}
                  countLabel={g.contractors.length === 1 ? 'contractor' : 'contractors'}
                  open={isGroupOpen(g.trade)}
                  onToggle={() => toggleGroup(g.trade)}
                  gridClassName={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4' : 'grid grid-cols-1 gap-0 -mx-4'}
                >
                  {g.contractors.map(c => (
                    <motion.div key={c.id} variants={fadeUp}>
                      {viewMode === 'grid' ? <ContractorCard c={c} /> : <ContractorRow c={c} />}
                    </motion.div>
                  ))}
                </GroupSection>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function ContractorsPage() {
  return <AppShell><ContractorsContent /></AppShell>;
}
