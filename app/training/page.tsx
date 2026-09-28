// app/training/page.tsx — Training & Certification Register
'use client';

import { useState, useMemo, useId } from 'react';
import {
  AlertTriangle, Award, BarChart3, BookOpen, Calendar, CheckCircle,
  FileText, Percent, Plus, RefreshCw, Search,
  Shield, UploadCloud, XCircle,
} from '@/components/shared/theme';
import { AppShell } from '@/components/app-shell';
import { formatDate } from '@/lib/format';
import { DownloadButton, type DLColumn } from '@/components/shared/DownloadButton';
import { PillTabs } from '@/components/shared/PillTabs';
import {
  useTheme, PageHero, StatTile, StatusBadge, ProgressBar, FormField, FormActions,
  SearchInput, CenterModal, PrimaryButton, EmptyState, SelectField, TYPE_WEIGHT, Button, IconAction, IconLink, ListItemCard,
} from '@/components/shared/theme';
import type { Certification, FormState } from './types';
import { useTrainingData, createCertification, updateCertification, deleteCertification } from './useTrainingData';

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const STATUS_ORDER: Record<string, number> = { Expired: 3, 'Due Soon': 2, Valid: 1 };
const STATUS_HEX: Record<string, string> = { Valid: '#34d399', 'Due Soon': '#f59e0b', Expired: '#f43f5e' };

const fmtDate = (d: string) => formatDate(d); // standardized on the shared formatter
// A cert missing/with a malformed expiry_date otherwise leaked the literal
// text "NaNd remaining" onto the register — new Date(bad).getTime() is NaN,
// and NaN propagates silently through the arithmetic without throwing
// (found live, 2026-08-29 UI audit).
function daysUntilExpiry(d: string): number {
  if (!d) return 0;
  const t = new Date(d).getTime();
  if (isNaN(t)) return 0;
  return Math.ceil((t - Date.now()) / 86400000);
}

const EMPTY_FORM: FormState = { employee_name: '', employee_id: '', department: '', certification_name: '', expiry_date: '', required_refresher: '', certificate_file: null };
const TABS = [
  { key: 'register', label: 'Certification Register', icon: FileText, meaning: 'training' as const },
  { key: 'refreshers', label: 'Refreshers Due', icon: RefreshCw, meaning: 'due-soon' as const },
  { key: 'analytics', label: 'Analytics', icon: BarChart3, meaning: 'analytics' as const },
] as const;

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

function TrainingContent() {
  const t = useTheme();
  const certFileInputId = useId();
  const [activeTab, setActiveTab] = useState<typeof TABS[number]['key']>('register');

  const { certs, refreshers, compliance, loading, refreshing, error, setError, registerUnavailable, complianceUnavailable, refreshersUnavailable, fetchAll } = useTrainingData();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [editCert, setEditCert] = useState<Certification | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Certification | null>(null);
  const [deleting, setDeleting] = useState(false);

  const depts = useMemo(() => [...new Set(certs.map(c => c.department).filter(Boolean))], [certs]);

  const filtered = useMemo(() => certs
    .filter(c => statusFilter === 'all' || c.status === statusFilter)
    .filter(c => deptFilter === 'all' || c.department === deptFilter)
    .filter(c => {
      if (!search) return true;
      const q = search.toLowerCase();
      return c.employee_name.toLowerCase().includes(q) || c.certification_name.toLowerCase().includes(q) || c.employee_id.toLowerCase().includes(q);
    })
    .sort((a, b) => (STATUS_ORDER[b.status] ?? 0) - (STATUS_ORDER[a.status] ?? 0)),
  [certs, statusFilter, deptFilter, search]);

  const counts = useMemo(() => ({
    total: certs.length, valid: certs.filter(c => c.status === 'Valid').length,
    expired: certs.filter(c => c.status === 'Expired').length, dueSoon: certs.filter(c => c.status === 'Due Soon').length,
  }), [certs]);

  function openNew() { setEditCert(null); setForm(EMPTY_FORM); setModalOpen(true); }
  function openEdit(c: Certification) {
    setEditCert(c);
    setForm({ employee_name: c.employee_name, employee_id: c.employee_id, department: c.department, certification_name: c.certification_name, expiry_date: c.expiry_date, required_refresher: c.required_refresher, certificate_file: null });
    setModalOpen(true);
  }

  async function saveRecord(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('employee_name', form.employee_name);
      fd.append('employee_id', form.employee_id);
      fd.append('department', form.department);
      fd.append('certification_name', form.certification_name);
      fd.append('expiry_date', form.expiry_date);
      fd.append('required_refresher', form.required_refresher);
      if (form.certificate_file) fd.append('certificate_file', form.certificate_file);

      if (editCert) await updateCertification(editCert.id, fd);
      else await createCertification(fd);
      setModalOpen(false);
      fetchAll(true);
    } catch (e) { setError(`Save failed: ${(e as Error).message}`); }
    finally { setSaving(false); }
  }

  async function doDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCertification(deleteTarget.id);
      setDeleteTarget(null);
      fetchAll(true);
    } catch (e) { setError(`Delete failed: ${(e as Error).message}`); }
    finally { setDeleting(false); }
  }

  const dlCols: DLColumn[] = [
    { key: 'employee_id', label: 'Employee ID' }, { key: 'employee_name', label: 'Employee Name' },
    { key: 'department', label: 'Department' }, { key: 'certification_name', label: 'Certification' },
    { key: 'required_refresher', label: 'Refresher Required' }, { key: 'expiry_date', label: 'Expiry Date' },
    { key: 'status', label: 'Status' },
  ];

  const deptCompliance = useMemo(() => {
    const map = new Map<string, { total: number; expired: number }>();
    certs.forEach(c => {
      const d = c.department || 'Unknown';
      const ex = map.get(d) ?? { total: 0, expired: 0 };
      map.set(d, { total: ex.total + 1, expired: ex.expired + (c.status === 'Expired' ? 1 : 0) });
    });
    return Array.from(map.entries())
      .map(([dept, { total, expired }]) => ({ dept, total, expired, pct: total > 0 ? Math.round(((total - expired) / total) * 100) : 100 }))
      .sort((a, b) => a.pct - b.pct);
  }, [certs]);

  const inputCls = `w-full h-9 px-3 rounded-lg text-sm outline-none transition-colors ${t.inputBg}`;

  return (
    <main className={`${t.design === 'dallaglio' ? 'w-full' : 'max-w-[1400px] mx-auto'} p-4 sm:p-6 lg:p-8 space-y-6`}>
      <PageHero
        icon={Award}
        accent="violet"
        crumbs={['Safety & Compliance', 'Training']}
        title="Training & Certification"
        description="Manage employee qualifications, track expiry dates, and maintain compliance."
        statsOpen
        actions={
          <>
            <IconAction meaning="refresh" title="Refresh training records" spinning={refreshing} disabled={refreshing} onClick={() => fetchAll(true)} />
            <DownloadButton data={certs as unknown as Record<string, unknown>[]} columns={dlCols} filename={`Training_Register_${new Date().toISOString().slice(0, 10)}`} title="Training & Certification Register" />
            <PrimaryButton icon={Plus} onClick={openNew}>Add Certification</PrimaryButton>
          </>
        }
      >
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <StatTile icon={FileText} color="#86BBD8" label="Certifications" value={loading || registerUnavailable ? '—' : counts.total} />
          <StatTile icon={Percent} color={compliance.compliance_rate >= 90 ? '#34d399' : compliance.compliance_rate >= 70 ? '#f59e0b' : '#f43f5e'} label="Compliance" value={loading || complianceUnavailable ? '—' : `${compliance.compliance_rate}%`} />
          <StatTile icon={CheckCircle} color="#34d399" label="Valid" value={loading || registerUnavailable ? '—' : counts.valid} />
          <StatTile icon={Calendar} color="#f59e0b" label="Due Soon" value={loading || registerUnavailable ? '—' : counts.dueSoon} />
          <StatTile icon={XCircle} color="#f43f5e" label="Expired" value={loading || registerUnavailable ? '—' : counts.expired} />
        </div>
      </PageHero>

      {error && (
        <div className={`${t.glass} rounded-2xl p-4 flex items-center gap-3 border border-rose-500/30`}>
          <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0" />
          <p className="text-sm text-rose-500">{error}</p>
          <span className="ml-auto"><IconAction meaning="close" title="Dismiss error" onClick={() => setError('')} /></span>
        </div>
      )}

      <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
        <div className={`px-5 py-3 border-b ${t.border} flex items-center gap-2`}>
          <Search className={`h-3.5 w-3.5 ${t.textFaint}`} />
          <span className={`${TYPE_WEIGHT.semibold} text-sm ${t.textPrimary}`}>Filters</span>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Search employee, certification, ID…" />
          <SelectField size="filter" value={statusFilter} title="Status filter" onChange={setStatusFilter}
            options={[{ value: 'all', label: 'All Statuses' }, { value: 'Valid', label: 'Valid' }, { value: 'Due Soon', label: 'Due Soon' }, { value: 'Expired', label: 'Expired' }]} />
          <SelectField size="filter" value={deptFilter} title="Department filter" onChange={setDeptFilter}
            options={[{ value: 'all', label: 'All Departments' }, ...depts.map(d => ({ value: d, label: d }))]} />
        </div>
        <p className={`px-5 pb-3 text-xs ${t.textFaint}`}>{registerUnavailable ? 'Certification records unavailable' : `${filtered.length} of ${certs.length} certifications`}</p>
      </div>

      <PillTabs tabs={[...TABS]} value={activeTab} onChange={setActiveTab} wrap="scroll" />

      {loading ? (
        <div className={`flex items-center justify-center py-16 ${t.textFaint}`}><RefreshCw className="h-5 w-5 animate-spin mr-2" /> Loading certification records…</div>
      ) : activeTab === 'register' && registerUnavailable ? (
        <div role="alert" className={`${t.glass} rounded-2xl p-8 text-center ${t.textMuted}`}>
          <AlertTriangle className="h-8 w-8 mx-auto mb-3" />
          <p className="text-sm mb-4">Could not load certifications</p>
          <Button variant="secondary" icon={RefreshCw} onClick={() => fetchAll()}>Try again</Button>
        </div>
      ) : activeTab === 'register' ? (
        <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
          <div className={`px-5 py-3 border-b ${t.border} flex items-center justify-between`}>
            <span className={`${TYPE_WEIGHT.semibold} text-sm ${t.textPrimary}`}>Certifications ({filtered.length})</span>
            <DownloadButton data={filtered as unknown as Record<string, unknown>[]} columns={dlCols} filename={`Training_Register_${new Date().toISOString().slice(0, 10)}`} title="Training & Certification Register" />
          </div>
          {filtered.length === 0 ? (
            <EmptyState icon={BookOpen} title="No Records Found" message="No certifications match the current filters." action={{ label: 'Add Certification', onClick: openNew }} />
          ) : (
            <>
              <div className="sm:hidden p-3 space-y-3">
              {filtered.map(c => (
                <ListItemCard
                  key={c.id}
                  color={STATUS_HEX[c.status] ?? '#94a3b8'}
                  icon={Award}
                  title={c.certification_name}
                  subtitle={`${c.employee_name} · ${c.employee_id}`}
                  rows={[
                    { label: 'Department', value: c.department || '—' },
                    { label: 'Expiry', value: fmtDate(c.expiry_date) },
                    { label: 'Refresher', value: c.required_refresher || '—' },
                  ]}
                  badges={<><StatusBadge color={STATUS_HEX[c.status] ?? '#94a3b8'} label={c.status} />{c.certificate_url && <IconLink meaning="download" href={c.certificate_url} title={`Open certificate for ${c.employee_name}`} label="Certificate" />}</>}
                  onEdit={() => openEdit(c)}
                  onDelete={() => setDeleteTarget(c)}
                />
              ))}
              </div>
              <div className="hidden sm:block overflow-x-auto max-h-[480px] overflow-y-auto">
              <table className="w-full">
                <thead><tr className={`border-b ${t.border} sticky top-0 ${t.glass}`}>
                  {['Employee', 'Certification', 'Expiry', 'Status', 'Certificate', ''].map((h, i) => (
                    <th key={h} className={`px-4 py-2.5 text-[10px] ${TYPE_WEIGHT.semibold} uppercase tracking-wider ${i > 2 ? 'text-center' : 'text-left'} ${t.textFaint}`}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {filtered.map(c => {
                    const days = daysUntilExpiry(c.expiry_date);
                    return (
                      <tr key={c.id} className={`border-b ${t.border} ${t.hoverBg} transition-colors`}>
                        <td className="px-4 py-3"><p className={`${TYPE_WEIGHT.medium} text-sm ${t.textPrimary}`}>{c.employee_name}</p><p className={`text-xs ${t.textFaint}`}>{c.department} · {c.employee_id}</p></td>
                        <td className="px-4 py-3"><p className={`text-sm ${t.textMuted}`}>{c.certification_name}</p><p className={`text-xs ${t.textFaint}`}>Refresher: {c.required_refresher}</p></td>
                        <td className="px-4 py-3"><p className={`text-sm ${t.textMuted}`}>{fmtDate(c.expiry_date)}</p><p className={`text-xs ${days < 0 ? 'text-rose-500' : days <= 90 ? 'text-amber-500' : t.textFaint}`}>{days < 0 ? `${Math.abs(days)}d overdue` : `${days}d remaining`}</p></td>
                        <td className="px-4 py-3 text-center"><StatusBadge color={STATUS_HEX[c.status] ?? '#94a3b8'} label={c.status} /></td>
                        <td className="px-4 py-3 text-center">
                          {c.certificate_url ? (
                            <IconLink meaning="download" href={c.certificate_url} title={`Open certificate for ${c.employee_name}`} />
                          ) : <span className={`text-xs ${t.textFaint}`}>—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 justify-end">
                            <IconAction meaning="edit" title={`Edit ${c.certification_name}`} onClick={() => openEdit(c)} />
                            <IconAction meaning="danger" title={`Delete ${c.certification_name}`} onClick={() => setDeleteTarget(c)} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </>
          )}
        </div>
      ) : activeTab === 'refreshers' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
            <div className={`px-5 py-3 border-b ${t.border} flex items-center gap-2`}><RefreshCw className={`h-3.5 w-3.5 ${t.textFaint}`} /><span className={`${TYPE_WEIGHT.semibold} text-sm ${t.textPrimary}`}>Refresher Courses Required</span></div>
            <div className="p-5 space-y-3">
              {refreshersUnavailable ? (
                <p role="alert" className={`text-center py-8 text-sm ${t.textFaint}`}>Refresher data unavailable</p>
              ) : refreshers.length === 0 ? (
                <div className="text-center py-8"><CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2" /><p className={`text-sm text-emerald-500 ${TYPE_WEIGHT.semibold}`}>No refreshers overdue</p></div>
              ) : refreshers.map(({ refresher, employees_due }) => (
                <div key={refresher}>
                  <div className="flex justify-between mb-1">
                    <span className={`text-sm ${t.textMuted}`}>{refresher}</span>
                    <StatusBadge color={employees_due > 5 ? '#f43f5e' : employees_due > 2 ? '#f59e0b' : '#94a3b8'} label={`${employees_due} employee${employees_due !== 1 ? 's' : ''}`} />
                  </div>
                  <ProgressBar value={Math.min(employees_due * 10, 100)} color={employees_due > 5 ? '#f43f5e' : employees_due > 2 ? '#f59e0b' : '#94a3b8'} showValue={false} />
                </div>
              ))}
            </div>
          </div>

          <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
            <div className={`px-5 py-3 border-b ${t.border} flex items-center gap-2`}><Calendar className={`h-3.5 w-3.5 ${t.textFaint}`} /><span className={`${TYPE_WEIGHT.semibold} text-sm ${t.textPrimary}`}>Expiring in 90 Days</span></div>
            <div className={`divide-y ${t.divide}`}>
              {registerUnavailable && <p role="alert" className={`text-center py-8 text-sm ${t.textFaint}`}>Certification data unavailable</p>}
              {certs.filter(c => { const d = daysUntilExpiry(c.expiry_date); return d >= 0 && d <= 90; }).sort((a, b) => daysUntilExpiry(a.expiry_date) - daysUntilExpiry(b.expiry_date)).slice(0, 8).map(c => (
                <div key={String(c.id)} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0"><span className={`text-xs ${TYPE_WEIGHT.bold} text-amber-500`}>{daysUntilExpiry(c.expiry_date)}d</span></div>
                  <div className="flex-1 min-w-0"><p className={`text-sm ${TYPE_WEIGHT.medium} truncate ${t.textPrimary}`}>{c.employee_name}</p><p className={`text-xs truncate ${t.textFaint}`}>{c.certification_name}</p></div>
                  <span className={`text-xs shrink-0 ${t.textFaint}`}>{fmtDate(c.expiry_date)}</span>
                </div>
              ))}
              {!registerUnavailable && certs.filter(c => { const d = daysUntilExpiry(c.expiry_date); return d >= 0 && d <= 90; }).length === 0 && (
                <div className="text-center py-8"><CheckCircle className="h-6 w-6 text-emerald-500 mx-auto mb-2" /><p className="text-sm text-emerald-500">Nothing expiring in the next 90 days</p></div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
            <div className={`px-5 py-3 border-b ${t.border} flex items-center gap-2`}><BarChart3 className={`h-3.5 w-3.5 ${t.textFaint}`} /><span className={`${TYPE_WEIGHT.semibold} text-sm ${t.textPrimary}`}>Compliance by Department</span></div>
            <div className="p-5 space-y-3">
              {registerUnavailable ? <p role="alert" className={`text-sm text-center py-8 ${t.textFaint}`}>Certification data unavailable</p> : deptCompliance.length === 0 ? <p className={`text-sm text-center py-8 ${t.textFaint}`}>No data — add certifications first</p> : deptCompliance.map(({ dept, pct, total, expired }) => (
                <div key={dept}>
                  <div className="flex justify-between mb-1">
                    <span className={`text-xs ${t.textMuted}`}>{dept}</span>
                    <span className={`text-xs ${t.textFaint}`}>{expired > 0 ? <span className="text-rose-500">{expired} expired / </span> : null}{total} total — <span className={`${TYPE_WEIGHT.bold} ${pct >= 90 ? 'text-emerald-500' : pct >= 70 ? 'text-amber-500' : 'text-rose-500'}`}>{pct}%</span></span>
                  </div>
                  <ProgressBar value={pct} color={pct >= 90 ? '#34d399' : pct >= 70 ? '#f59e0b' : '#f43f5e'} showValue={false} />
                </div>
              ))}
            </div>
          </div>

          <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
            <div className={`px-5 py-3 border-b ${t.border} flex items-center gap-2`}><Shield className={`h-3.5 w-3.5 ${t.textFaint}`} /><span className={`${TYPE_WEIGHT.semibold} text-sm ${t.textPrimary}`}>Status Distribution</span></div>
            <div className="p-5 space-y-4">
              {registerUnavailable ? <p role="alert" className={`text-sm text-center py-8 ${t.textFaint}`}>Certification data unavailable</p> : <>
              {[
                { label: 'Valid', count: counts.valid, hex: '#10b981' },
                { label: 'Due Soon', count: counts.dueSoon, hex: '#f59e0b' },
                { label: 'Expired', count: counts.expired, hex: '#ef4444' },
              ].map(({ label, count, hex }) => (
                <div key={label} className={`rounded-xl border p-4 flex items-center justify-between ${t.border} ${t.glassSoft}`}>
                  <span className={`text-sm ${TYPE_WEIGHT.medium} ${t.textMuted}`}>{label}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-semibold tabular-nums" style={{ color: hex }}>{count}</span>
                    <span className={`text-xs ${t.textFaint}`}>{counts.total > 0 ? `${Math.round((count / counts.total) * 100)}%` : '—'}</span>
                  </div>
                </div>
              ))}
              {complianceUnavailable ? <p role="alert" className={`text-sm ${t.textFaint}`}>Compliance report unavailable</p> : <div className="flex items-center gap-4 pt-2">
                <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                  <svg viewBox="0 0 100 100" className="w-24 h-24 -rotate-90">
                    <circle cx="50" cy="50" r="40" fill="none" stroke={t.light ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.06)'} strokeWidth="14" />
                    <circle cx="50" cy="50" r="40" fill="none" stroke={compliance.compliance_rate >= 90 ? '#10b981' : compliance.compliance_rate >= 70 ? '#f59e0b' : '#ef4444'} strokeWidth="14" strokeDasharray={`${(compliance.compliance_rate / 100) * 251} 251`} strokeLinecap="round" />
                  </svg>
                  <div className="absolute text-center"><p className="text-lg font-semibold tabular-nums leading-none" style={{ color: compliance.compliance_rate >= 90 ? '#10b981' : compliance.compliance_rate >= 70 ? '#f59e0b' : '#ef4444' }}>{compliance.compliance_rate}%</p></div>
                </div>
                <div>
                  <p className={`text-sm ${TYPE_WEIGHT.bold} ${t.textPrimary}`}>Overall Compliance</p>
                  <p className={`text-xs mt-0.5 ${t.textFaint}`}>{compliance.total_tracked} certifications tracked</p>
                  <p className="text-xs text-rose-500 mt-0.5">{compliance.non_compliant} expired</p>
                </div>
              </div>
              }
              </>}
            </div>
          </div>
        </div>
      )}

      <CenterModal open={modalOpen} onClose={() => setModalOpen(false)} title={editCert ? 'Edit Certification Record' : 'Add Certification Record'} width="max-w-2xl">
        <form onSubmit={saveRecord}>
          <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Employee Name" required><input value={form.employee_name} onChange={e => setForm(f => ({ ...f, employee_name: e.target.value }))} placeholder="Full name" aria-label="Employee Name" className={inputCls} /></FormField>
            <FormField label="Employee ID" required><input value={form.employee_id} onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))} placeholder="e.g. E001" aria-label="Employee ID" className={inputCls} /></FormField>
            <FormField label="Department"><input value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} placeholder="e.g. Safety" aria-label="Department" className={inputCls} /></FormField>
            <FormField label="Certification Name" required><input value={form.certification_name} onChange={e => setForm(f => ({ ...f, certification_name: e.target.value }))} placeholder="e.g. First Aid & CPR" aria-label="Certification Name" className={inputCls} /></FormField>
            <FormField label="Expiry Date" required><input type="date" title="Expiry date" aria-label="Expiry date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} className={inputCls} /></FormField>
            <FormField label="Required Refresher"><input value={form.required_refresher} onChange={e => setForm(f => ({ ...f, required_refresher: e.target.value }))} placeholder="e.g. BLS Refresher" aria-label="Required Refresher" className={inputCls} /></FormField>

            <div className="sm:col-span-2">
              <FormField label="Certificate Document (PDF / Image)">
                <label htmlFor={certFileInputId} className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-colors ${t.inputBg}`}>
                  <UploadCloud className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span className={`text-sm truncate ${t.textMuted}`}>{form.certificate_file ? form.certificate_file.name : editCert?.certificate_url ? 'Replace existing file…' : 'Choose file…'}</span>
                  <input id={certFileInputId} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" title="Certificate document" aria-label="Certificate document" onChange={e => setForm(f => ({ ...f, certificate_file: e.target.files?.[0] ?? null }))} />
                </label>
              </FormField>
              {form.certificate_file && <p className="text-xs text-emerald-500 mt-1.5 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> {form.certificate_file.name} selected</p>}
            </div>

            {form.expiry_date && (
              <div className={`sm:col-span-2 flex items-center gap-3 rounded-xl ${t.chipBg} border ${t.border} p-3`}>
                <Calendar className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className={`text-xs ${t.textMuted}`}>Expiry status preview:</span>
                {(() => {
                  const days = daysUntilExpiry(form.expiry_date);
                  const status = days < 0 ? 'Expired' : days <= 90 ? 'Due Soon' : 'Valid';
                  return (
                    <div className="flex items-center gap-2">
                      <StatusBadge color={STATUS_HEX[status]} label={status} />
                      <span className="text-xs" style={{ color: STATUS_HEX[status] }}>{days < 0 ? `${Math.abs(days)} days overdue` : `${days} days remaining`}</span>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
          <FormActions onCancel={() => setModalOpen(false)} submitting={saving} submitLabel={editCert ? 'Update' : 'Save Record'} accent="emerald" />
        </form>
      </CenterModal>

      <CenterModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Certification" width="max-w-sm">
        <div className="px-5 py-4">
          <p className={`text-sm ${t.textMuted}`}>Delete the &quot;{deleteTarget?.certification_name}&quot; certification for {deleteTarget?.employee_name}? This cannot be undone.</p>
        </div>
        <div className={`flex justify-end gap-2 px-5 py-4 border-t ${t.border}`}>
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="danger" submitting={deleting} onClick={doDelete}>Delete</Button>
        </div>
      </CenterModal>
    </main>
  );
}

export default function TrainingPage() {
  return <AppShell><TrainingContent /></AppShell>;
}
