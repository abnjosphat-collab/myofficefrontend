// FILE: app/compliance-register/page.tsx
'use client';

import { useState } from 'react';
import { AppShell } from '@/components/app-shell';
import { ShieldCheck, Plus, X, RefreshCw } from '@/components/shared/theme';
import { useModuleData } from '@/lib/useModuleData';
import { useTheme, PageHero, StatTile, StatusBadge, FormField, PrimaryButton, ACCENT_HEX } from '@/components/shared/theme';

type Status = 'current' | 'due_soon' | 'overdue';

interface ComplianceItem {
  id: number; equipment_name: string; inspection_type: string; regulatory_body: string;
  certificate_no: string; expiry_date: string; status: Status; responsible: string; notes: string;
}

const statusHex: Record<Status, string> = { current: '#34d399', due_soon: '#fbbf24', overdue: '#fb7185' };
const statusLabel: Record<Status, string> = { current: 'Current', due_soon: 'Due Soon', overdue: 'Overdue' };

const daysUntil = (d: string) => Math.round((new Date(d).getTime() - Date.now()) / 86400000);

function ComplianceRegisterContent() {
  const t = useTheme();
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

  const inputCls = `w-full rounded-xl px-3 py-2 text-sm outline-none transition-colors ${t.inputBg}`;

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 gap-3">
      <RefreshCw className={`h-5 w-5 animate-spin ${t.textFaint}`} />
      <span className={`text-sm ${t.textFaint}`}>Loading...</span>
    </div>
  );

  if (error) return (
    <main className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8">
      <div className="rounded-xl bg-rose-500/15 text-rose-400 px-5 py-4 text-sm">{error}</div>
    </main>
  );

  return (
    <main className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <PageHero
        icon={ShieldCheck}
        accent="violet"
        crumbs={['Safety & Compliance', 'Compliance Register']}
        title="Statutory Compliance Register"
        description="Regulatory certificates and inspection tracking"
        statsOpen
        actions={
          <>
            <button type="button" onClick={() => refetch()} title="Refresh" className={`h-8 w-8 flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} ${t.hoverText}`}><RefreshCw className="h-4 w-4" /></button>
            <PrimaryButton icon={Plus} onClick={() => setShowAdd(s => !s)}>Add Item</PrimaryButton>
          </>
        }
      >
        <div className="grid grid-cols-3 gap-3">
          <StatTile icon={ShieldCheck} color="#34d399" label="Current" value={counts.current} />
          <StatTile icon={ShieldCheck} color="#fbbf24" label="Due Soon" value={counts.due_soon} />
          <StatTile icon={ShieldCheck} color="#fb7185" label="Overdue" value={counts.overdue} />
        </div>
      </PageHero>

      {showAdd && (
        <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden p-6`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`font-semibold ${t.textPrimary}`}>New Compliance Item</h2>
            <button type="button" onClick={() => setShowAdd(false)} title="Close" className={`${t.textFaint} ${t.hoverText} transition-colors`}><X className="w-5 h-5" /></button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            <FormField label="Equipment Name"><input placeholder="Equipment Name" value={form.equipment_name} onChange={e => setForm(f => ({ ...f, equipment_name: e.target.value }))} className={inputCls} /></FormField>
            <FormField label="Inspection Type"><input placeholder="Inspection Type" value={form.inspection_type} onChange={e => setForm(f => ({ ...f, inspection_type: e.target.value }))} className={inputCls} /></FormField>
            <FormField label="Regulatory Body"><input placeholder="Regulatory Body" value={form.regulatory_body} onChange={e => setForm(f => ({ ...f, regulatory_body: e.target.value }))} className={inputCls} /></FormField>
            <FormField label="Certificate No."><input placeholder="Certificate No." value={form.certificate_no} onChange={e => setForm(f => ({ ...f, certificate_no: e.target.value }))} className={inputCls} /></FormField>
            <FormField label="Expiry Date"><input type="date" title="Expiry date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} className={inputCls} /></FormField>
            <FormField label="Responsible Person"><input placeholder="Responsible Person" value={form.responsible} onChange={e => setForm(f => ({ ...f, responsible: e.target.value }))} className={inputCls} /></FormField>
          </div>
          <PrimaryButton onClick={submit}>Add to Register</PrimaryButton>
        </div>
      )}

      <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
        <div className={`p-4 border-b ${t.border} flex items-center justify-between flex-wrap gap-3`}>
          <h2 className={`font-semibold ${t.textPrimary}`}>Compliance Items</h2>
          <div className="flex gap-2 flex-wrap">
            {(['all', 'current', 'due_soon', 'overdue'] as const).map(s => (
              <button key={s} type="button" onClick={() => setFilter(s)} className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${filter === s ? 'bg-brand-500/20 text-brand-400' : `${t.chipBg} ${t.textFaint} ${t.hoverText}`}`}>
                {s === 'all' ? 'All' : s === 'due_soon' ? 'Due Soon' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={`border-b ${t.border}`}>
                {['Equipment', 'Inspection Type', 'Reg. Body', 'Cert. No.', 'Expiry', 'Days', 'Status', 'Responsible'].map(h => (
                  <th key={h} className={`px-4 py-3 text-left text-xs font-medium ${t.textFaint}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayed.map(item => {
                const days = daysUntil(item.expiry_date);
                return (
                  <tr key={item.id} className={`border-b ${t.border} last:border-0 ${t.hoverBgSoft} transition-colors`}>
                    <td className={`px-4 py-3 font-medium ${t.textPrimary}`}>{item.equipment_name}</td>
                    <td className={`px-4 py-3 ${t.textMuted}`}>{item.inspection_type}</td>
                    <td className="px-4 py-3"><StatusBadge color={ACCENT_HEX.blue} label={item.regulatory_body} /></td>
                    <td className={`px-4 py-3 font-mono text-xs ${t.textFaint}`}>{item.certificate_no}</td>
                    <td className={`px-4 py-3 ${t.textMuted}`}>{item.expiry_date}</td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold text-xs ${days < 0 ? 'text-rose-400' : days <= 30 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {days < 0 ? `${Math.abs(days)}d ago` : `${days}d`}
                      </span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge color={statusHex[item.status]} label={statusLabel[item.status]} /></td>
                    <td className={`px-4 py-3 ${t.textMuted}`}>{item.responsible}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

export default function ComplianceRegisterPage() {
  return (
    <AppShell>
      <ComplianceRegisterContent />
    </AppShell>
  );
}
