// FILE: app/condition-monitoring/page.tsx
'use client';

import { useState } from 'react';
import { AppShell } from '@/components/app-shell';
import { PredictiveInput } from '@/components/shared/PredictiveInput';
import { Radar, Plus, X, RefreshCw } from '@/components/shared/theme';
import { useTheme, PageHero, StatTile, StatusBadge, FormField, PrimaryButton, ACCENT_HEX, SelectField } from '@/components/shared/theme';
import { DownloadButton, type DLColumn } from '@/components/shared/DownloadButton';
import { exportFilename } from '@/lib/exportUtils';
import { formatDate } from '@/lib/format';
import type { CMResult, CMType } from './types';
import { useConditionMonitoringData, createCMReading } from './useConditionMonitoringData';

const typeHex: Record<CMType, string> = { 'Oil Analysis': '#fbbf24', 'Vibration': ACCENT_HEX.blue, 'Thermography': '#fb923c' };
const resultHex: Record<CMResult, string> = { normal: '#34d399', caution: '#fbbf24', critical: '#fb7185' };

const CM_TYPES: CMType[] = ['Oil Analysis', 'Vibration', 'Thermography'];

function ConditionMonitoringContent() {
  const t = useTheme();
  const { readings, loading, fetchReadings } = useConditionMonitoringData();
  const [tab, setTab] = useState<'All' | CMType>('All');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ equipment: '', component: '', type: 'Vibration' as CMType, date: '', value: '', unit: '', result: 'normal' as CMResult, technician: '', notes: '' });

  const displayed = tab === 'All' ? readings : readings.filter(r => r.type === tab);
  const counts = { total: readings.length, critical: readings.filter(r => r.result === 'critical').length, caution: readings.filter(r => r.result === 'caution').length, normal: readings.filter(r => r.result === 'normal').length };

  const exportColumns: DLColumn[] = [
    { key: 'equipment', label: 'Equipment', width: 24 },
    { key: 'component', label: 'Component', width: 20 },
    { key: 'type', label: 'Type', width: 16 },
    { key: 'date', label: 'Date', width: 14, format: v => v ? formatDate(v as string) : '' },
    { key: 'value', label: 'Value', width: 14, format: (_v, row) => `${row.value ?? ''}${row.unit ? ` ${row.unit}` : ''}` },
    { key: 'result', label: 'Result', width: 12, format: v => (v as string).charAt(0).toUpperCase() + (v as string).slice(1) },
    { key: 'technician', label: 'Technician', width: 18 },
    { key: 'notes', label: 'Notes', width: 30 },
  ];

  const submit = async () => {
    if (!form.equipment || !form.date) return;
    const body = { equipment_name: form.equipment, component: form.component, monitoring_type: form.type, sampled_date: form.date, value: parseFloat(form.value) || null, unit: form.unit, result: form.result, technician: form.technician, notes: form.notes };
    try { await createCMReading(body); fetchReadings(); }
    catch { /* ignore */ }
    setForm({ equipment: '', component: '', type: 'Vibration', date: '', value: '', unit: '', result: 'normal', technician: '', notes: '' });
    setShowAdd(false);
  };

  const inputCls = `w-full rounded-xl px-3 py-2 text-sm outline-none transition-colors ${t.inputBg}`;

  return (
    <main className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <PageHero
        icon={Radar}
        accent="violet"
        crumbs={['Safety & Compliance', 'Condition Monitoring']}
        title="Condition Monitoring"
        description="Oil analysis, vibration and thermography records"
        statsOpen
        actions={
          <>
            <button type="button" onClick={fetchReadings} title="Refresh" className={`h-8 w-8 flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} ${t.hoverText}`}><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
            {displayed.length > 0 && (
              <DownloadButton
                data={displayed as unknown as Record<string, unknown>[]}
                columns={exportColumns}
                filename={exportFilename('Condition_Monitoring')}
                title="Condition Monitoring"
                statusColumn="result"
                statusColor={(_v, row) => resultHex[row.result as CMResult]?.replace('#', '')}
              />
            )}
            <PrimaryButton icon={Plus} onClick={() => setShowAdd(s => !s)}>Add Reading</PrimaryButton>
          </>
        }
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatTile icon={Radar} color={ACCENT_HEX.blue} label="Total Readings" value={counts.total} />
          <StatTile icon={Radar} color="#fb7185" label="Critical" value={counts.critical} />
          <StatTile icon={Radar} color="#fbbf24" label="Caution" value={counts.caution} />
          <StatTile icon={Radar} color="#34d399" label="Normal" value={counts.normal} />
        </div>
      </PageHero>

      {showAdd && (
        <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden p-6`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`font-semibold ${t.textPrimary}`}>New Reading</h2>
            <button type="button" onClick={() => setShowAdd(false)} title="Close" aria-label="Close" className={`h-9 w-9 flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} ${t.hoverText}`}><X className="w-5 h-5" /></button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <FormField label="Equipment"><PredictiveInput historyKey="cm_equipment" placeholder="Equipment" value={form.equipment} onChange={v => setForm(f => ({ ...f, equipment: v }))} inputClassName={inputCls} /></FormField>
            <FormField label="Component"><PredictiveInput historyKey="cm_component" placeholder="Component" value={form.component} onChange={v => setForm(f => ({ ...f, component: v }))} inputClassName={inputCls} /></FormField>
            <FormField label="Type">
              <SelectField size="form" title="Type" value={form.type} onChange={v => setForm(f => ({ ...f, type: v as CMType }))}
                options={CM_TYPES.map(ty => ({ value: ty, label: ty }))} />
            </FormField>
            <FormField label="Date"><input type="date" title="Date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className={inputCls} /></FormField>
            <FormField label="Value"><input placeholder="Value" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} className={inputCls} /></FormField>
            <FormField label="Unit"><input placeholder="Unit" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} className={inputCls} /></FormField>
            <FormField label="Result">
              <SelectField size="form" title="Result" value={form.result} onChange={v => setForm(f => ({ ...f, result: v as CMResult }))}
                options={(['normal', 'caution', 'critical'] as CMResult[]).map(r => ({ value: r, label: r }))} />
            </FormField>
            <FormField label="Technician"><input placeholder="Technician" value={form.technician} onChange={e => setForm(f => ({ ...f, technician: e.target.value }))} className={inputCls} /></FormField>
          </div>
          <FormField label="Notes"><textarea rows={2} placeholder="Notes..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className={`${inputCls} resize-none mb-3`} /></FormField>
          <PrimaryButton onClick={submit}>Save Reading</PrimaryButton>
        </div>
      )}

      <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
        <div className={`p-4 border-b ${t.border} flex items-center justify-between flex-wrap gap-3`}>
          <h2 className={`font-semibold ${t.textPrimary}`}>Monitoring Records</h2>
          <div className="flex gap-1">
            {(['All', ...CM_TYPES] as const).map(ty => (
              <button key={ty} type="button" onClick={() => setTab(ty)} className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${tab === ty ? 'bg-brand-500/20 text-brand-400' : `${t.textFaint} ${t.hoverText}`}`}>{ty}</button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={`border-b ${t.border}`}>
                {['Equipment', 'Component', 'Type', 'Date', 'Value', 'Result', 'Technician', 'Notes'].map(h => (
                  <th key={h} className={`px-4 py-3 text-left text-xs font-medium ${t.textFaint}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-10"><RefreshCw className={`h-5 w-5 animate-spin mx-auto ${t.textFaint}`} /></td></tr>
              ) : displayed.map(r => (
                <tr key={r.id} className={`border-b ${t.border} last:border-0 ${t.hoverBgSoft} transition-colors`}>
                  <td className={`px-4 py-3 font-medium ${t.textPrimary}`}>{r.equipment}</td>
                  <td className={`px-4 py-3 ${t.textMuted}`}>{r.component}</td>
                  <td className="px-4 py-3"><StatusBadge color={typeHex[r.type]} label={r.type} /></td>
                  <td className={`px-4 py-3 ${t.textMuted}`}>{r.date}</td>
                  <td className={`px-4 py-3 font-mono ${t.textMuted}`}>{r.value} <span className={`text-xs ${t.textFaint}`}>{r.unit}</span></td>
                  <td className="px-4 py-3"><StatusBadge color={resultHex[r.result]} label={r.result.charAt(0).toUpperCase() + r.result.slice(1)} dot={r.result === 'critical'} /></td>
                  <td className={`px-4 py-3 ${t.textMuted}`}>{r.technician}</td>
                  <td className={`px-4 py-3 text-xs max-w-xs truncate ${t.textFaint}`}>{r.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

export default function ConditionMonitoringPage() {
  return (
    <AppShell>
      <ConditionMonitoringContent />
    </AppShell>
  );
}
