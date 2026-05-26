// app/training/page.tsx — Training & Certification Register
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  AlertTriangle, Award, BarChart3, BookOpen, Calendar, CheckCircle,
  Download, FileText, Pencil, Percent, Plus, RefreshCw, Search,
  Shield, Trash2, UploadCloud, Users, XCircle,
} from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import {
  HeroPanel, GlassPanel, GlassStatCard, GlassBadge, GlassButton,
  GlassInput, GlassSelect, GlassTextarea, GlassTable, GlassTabs, GlassProgress,
  GlassModal, LoadingPane, MasterCollapseButton, DownloadButton, DeleteDialog,
  usePageCollapse, EmptyState,
  type StatItem, type GlassColumn, type GlassTab, type DLColumn,
} from '@/components/shared';

const API = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/$/, '');

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface Certification {
  id: string | number;
  employee_name: string;
  employee_id: string;
  department: string;
  certification_name: string;
  expiry_date: string;
  required_refresher: string;
  status: 'Valid' | 'Due Soon' | 'Expired';
  certificate_url?: string | null;
}

interface RefresherItem {
  refresher: string;
  employees_due: number;
}

interface ComplianceReport {
  compliance_rate: number;
  total_tracked: number;
  non_compliant: number;
}

interface FormState {
  employee_name: string;
  employee_id: string;
  department: string;
  certification_name: string;
  expiry_date: string;
  required_refresher: string;
  certificate_file: File | null;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const STATUS_ORDER: Record<string, number> = { Expired: 3, 'Due Soon': 2, Valid: 1 };

function statusBadge(status: string) {
  switch (status) {
    case 'Valid':    return <GlassBadge variant="success">Valid</GlassBadge>;
    case 'Due Soon': return <GlassBadge variant="warning">Due Soon</GlassBadge>;
    case 'Expired':  return <GlassBadge variant="danger">Expired</GlassBadge>;
    default:         return <GlassBadge variant="neutral">{status}</GlassBadge>;
  }
}

function statusColor(status: string) {
  if (status === 'Valid')    return 'text-emerald-400';
  if (status === 'Due Soon') return 'text-amber-400';
  return 'text-red-400';
}

function fmtDate(d: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daysUntilExpiry(d: string): number {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}

const EMPTY_FORM: FormState = {
  employee_name: '', employee_id: '', department: '',
  certification_name: '', expiry_date: '', required_refresher: '',
  certificate_file: null,
};

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function TrainingPage() {
  const sections = usePageCollapse({ hero: false, filters: false });

  const [certs, setCerts]             = useState<Certification[]>([]);
  const [refreshers, setRefreshers]   = useState<RefresherItem[]>([]);
  const [compliance, setCompliance]   = useState<ComplianceReport>({ compliance_rate: 0, total_tracked: 0, non_compliant: 0 });
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [error, setError]             = useState('');

  // Filters
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deptFilter, setDeptFilter]   = useState('all');

  // Modal
  const [modalOpen, setModalOpen]     = useState(false);
  const [editCert, setEditCert]       = useState<Certification | null>(null);
  const [form, setForm]               = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving]           = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Certification | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setRefreshing(true);
    try {
      const [certsRes, rateRes, refreshRes] = await Promise.all([
        fetch(`${API}/api/training`).catch(() => null),
        fetch(`${API}/api/training/reports/compliance_rate`).catch(() => null),
        fetch(`${API}/api/training/reports/due_refreshers`).catch(() => null),
      ]);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (certsRes?.ok)    setCerts(await certsRes.json());
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (rateRes?.ok)     setCompliance(await rateRes.json());
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (refreshRes?.ok)  setRefreshers(await refreshRes.json());
    } catch (e) {
      setError(`Failed to load: ${(e as Error).message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Derived data ───────────────────────────────────────────────────────────

  const depts = useMemo(() => [...new Set(certs.map(c => c.department).filter(Boolean))], [certs]);

  const filtered = useMemo(() => certs
    .filter(c => statusFilter === 'all' || c.status === statusFilter)
    .filter(c => deptFilter  === 'all' || c.department === deptFilter)
    .filter(c => {
      if (!search) return true;
      const q = search.toLowerCase();
      return c.employee_name.toLowerCase().includes(q) || c.certification_name.toLowerCase().includes(q) || c.employee_id.toLowerCase().includes(q);
    })
    .sort((a, b) => (STATUS_ORDER[b.status] ?? 0) - (STATUS_ORDER[a.status] ?? 0)),
  [certs, statusFilter, deptFilter, search]);

  const counts = useMemo(() => ({
    total:    certs.length,
    valid:    certs.filter(c => c.status === 'Valid').length,
    expired:  certs.filter(c => c.status === 'Expired').length,
    dueSoon:  certs.filter(c => c.status === 'Due Soon').length,
  }), [certs]);

  // ── Hero stats ─────────────────────────────────────────────────────────────

  const heroStats: StatItem[] = [
    { label: 'Certifications', value: counts.total },
    { label: 'Compliance',     value: `${compliance.compliance_rate}%`, textClass: compliance.compliance_rate >= 90 ? 'text-emerald-400' : compliance.compliance_rate >= 70 ? 'text-amber-400' : 'text-red-400' },
    { label: 'Valid',          value: counts.valid,   textClass: 'text-emerald-400' },
    { label: 'Due Soon',       value: counts.dueSoon, textClass: 'text-amber-400' },
    { label: 'Expired',        value: counts.expired, textClass: 'text-red-400' },
  ];

  // ── CRUD ───────────────────────────────────────────────────────────────────

  function openNew() { setEditCert(null); setForm(EMPTY_FORM); setModalOpen(true); }

  function openEdit(c: Certification) {
    setEditCert(c);
    setForm({ employee_name: c.employee_name, employee_id: c.employee_id, department: c.department, certification_name: c.certification_name, expiry_date: c.expiry_date, required_refresher: c.required_refresher, certificate_file: null });
    setModalOpen(true);
  }

  async function saveRecord() {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('employee_name',     form.employee_name);
      fd.append('employee_id',       form.employee_id);
      fd.append('department',        form.department);
      fd.append('certification_name', form.certification_name);
      fd.append('expiry_date',       form.expiry_date);
      fd.append('required_refresher', form.required_refresher);
      if (form.certificate_file) fd.append('certificate_file', form.certificate_file);

      const url    = editCert ? `${API}/api/training/${editCert.id}` : `${API}/api/training`;
      const method = editCert ? 'PUT' : 'POST';
      const res = await fetch(url, { method, body: fd });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail ?? `HTTP ${res.status}`); }
      setModalOpen(false);
      fetchAll(true);
    } catch (e) {
      setError(`Save failed: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  async function doDelete() {
    if (!deleteTarget) return;
    const res = await fetch(`${API}/api/training/${deleteTarget.id}`, { method: 'DELETE' });
    if (!res.ok && res.status !== 204) throw new Error(`HTTP ${res.status}`);
    setDeleteTarget(null);
    fetchAll(true);
  }

  // ── Table columns ──────────────────────────────────────────────────────────

  const certCols: GlassColumn<Certification>[] = [
    {
      key: 'employee_name', header: 'Employee',
      render: c => (
        <div>
          <p className="font-medium text-white text-sm">{c.employee_name}</p>
          <p className="text-xs text-white/45">{c.department} · {c.employee_id}</p>
        </div>
      ),
    },
    {
      key: 'certification_name', header: 'Certification',
      render: c => (
        <div>
          <p className="text-sm text-white/90">{c.certification_name}</p>
          <p className="text-xs text-white/45">Refresher: {c.required_refresher}</p>
        </div>
      ),
    },
    {
      key: 'expiry_date', header: 'Expiry',
      render: c => {
        const days = daysUntilExpiry(c.expiry_date);
        return (
          <div>
            <p className="text-sm text-white/80">{fmtDate(c.expiry_date)}</p>
            <p className={`text-xs ${days < 0 ? 'text-red-400' : days <= 90 ? 'text-amber-400' : 'text-white/40'}`}>
              {days < 0 ? `${Math.abs(days)}d overdue` : `${days}d remaining`}
            </p>
          </div>
        );
      },
    },
    { key: 'status', header: 'Status', align: 'center', render: c => statusBadge(c.status) },
    {
      key: 'certificate_url', header: 'Certificate', align: 'center',
      render: c => c.certificate_url
        ? (
          <a href={c.certificate_url} target="_blank" rel="noopener noreferrer">
            <GlassButton size="xs" variant="ghost" icon={Download} />
          </a>
        )
        : <span className="text-white/25 text-xs">—</span>,
    },
    {
      key: 'actions', header: '',
      render: c => (
        <div className="flex gap-1">
          <GlassButton size="xs" variant="ghost" icon={Pencil} onClick={() => openEdit(c)} />
          <GlassButton size="xs" variant="danger" icon={Trash2} onClick={() => setDeleteTarget(c)} />
        </div>
      ),
    },
  ];

  // ── Download columns ───────────────────────────────────────────────────────

  const dlCols: DLColumn[] = [
    { key: 'employee_id',       label: 'Employee ID' },
    { key: 'employee_name',     label: 'Employee Name' },
    { key: 'department',        label: 'Department' },
    { key: 'certification_name', label: 'Certification' },
    { key: 'required_refresher', label: 'Refresher Required' },
    { key: 'expiry_date',       label: 'Expiry Date' },
    { key: 'status',            label: 'Status' },
  ];

  // ── Department compliance breakdown ───────────────────────────────────────

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

  // ── Tabs ───────────────────────────────────────────────────────────────────

  const tabs: GlassTab[] = [
    {
      key: 'register',
      label: 'Certification Register',
      icon: FileText,
      content: (
        <GlassPanel
          title={`Certifications (${filtered.length})`}
          icon={FileText}
          variant="dark"
          actions={
            <div className="flex items-center gap-2">
              <DownloadButton
                data={filtered as unknown as Record<string, unknown>[]}
                columns={dlCols}
                filename={`Training_Register_${new Date().toISOString().slice(0, 10)}`}
                title="Training & Certification Register"
                subtitle={`Exported ${new Date().toLocaleDateString('en-GB')}`}
              />
              <GlassButton size="xs" icon={Plus} variant="primary" onClick={openNew}>Add Record</GlassButton>
            </div>
          }
        >
          {filtered.length === 0
            ? <EmptyState icon={BookOpen} title="No Records Found" message="No certifications match the current filters." action={{ label: 'Add Certification', onClick: openNew }} />
            : <GlassTable<Certification> columns={certCols} data={filtered} keyField="id" stickyHeader maxHeight="480px" />
          }
        </GlassPanel>
      ),
    },
    {
      key: 'refreshers',
      label: 'Refreshers Due',
      icon: RefreshCw,
      content: (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Refresher courses list */}
          <GlassPanel title="Refresher Courses Required" icon={RefreshCw} variant="dark">
            <div className="p-5 space-y-3">
              {refreshers.length === 0
                ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                    <p className="text-sm text-emerald-400 font-semibold">No refreshers overdue</p>
                  </div>
                )
                : refreshers.map(({ refresher, employees_due }) => (
                  <div key={refresher}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-white/80">{refresher}</span>
                      <GlassBadge variant={employees_due > 5 ? 'danger' : employees_due > 2 ? 'warning' : 'neutral'}>
                        {employees_due} employee{employees_due !== 1 ? 's' : ''}
                      </GlassBadge>
                    </div>
                    <GlassProgress value={Math.min(employees_due * 10, 100)} />
                  </div>
                ))
              }
            </div>
          </GlassPanel>

          {/* Upcoming expiries (next 90 days) */}
          <GlassPanel title="Expiring in 90 Days" icon={Calendar} variant="dark">
            <div className="divide-y divide-white/[0.05]">
              {certs
                .filter(c => { const d = daysUntilExpiry(c.expiry_date); return d >= 0 && d <= 90; })
                .sort((a, b) => daysUntilExpiry(a.expiry_date) - daysUntilExpiry(b.expiry_date))
                .slice(0, 8)
                .map(c => (
                  <div key={String(c.id)} className="flex items-center gap-3 px-5 py-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-amber-400">{daysUntilExpiry(c.expiry_date)}d</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{c.employee_name}</p>
                      <p className="text-xs text-white/50 truncate">{c.certification_name}</p>
                    </div>
                    <span className="text-xs text-white/40 shrink-0">{fmtDate(c.expiry_date)}</span>
                  </div>
                ))
              }
              {certs.filter(c => { const d = daysUntilExpiry(c.expiry_date); return d >= 0 && d <= 90; }).length === 0 && (
                <div className="text-center py-8">
                  <CheckCircle className="h-6 w-6 text-emerald-400 mx-auto mb-2" />
                  <p className="text-sm text-emerald-400">Nothing expiring in the next 90 days</p>
                </div>
              )}
            </div>
          </GlassPanel>
        </div>
      ),
    },
    {
      key: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      content: (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Compliance by department */}
          <GlassPanel title="Compliance by Department" icon={BarChart3} variant="dark">
            <div className="p-5 space-y-3">
              {deptCompliance.length === 0
                ? <p className="text-sm text-white/30 text-center py-8">No data — add certifications first</p>
                : deptCompliance.map(({ dept, pct, total, expired }) => (
                  <div key={dept}>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-white/70">{dept}</span>
                      <span className="text-xs text-white/50">{expired > 0 ? <span className="text-red-400">{expired} expired / </span> : null}{total} total — <span className={`font-bold ${pct >= 90 ? 'text-emerald-400' : pct >= 70 ? 'text-amber-400' : 'text-red-400'}`}>{pct}%</span></span>
                    </div>
                    <GlassProgress value={pct} />
                  </div>
                ))
              }
            </div>
          </GlassPanel>

          {/* Status distribution */}
          <GlassPanel title="Status Distribution" icon={Shield} variant="dark">
            <div className="p-5 space-y-4">
              {[
                { label: 'Valid',    count: counts.valid,   color: '#10b981', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20', text: 'text-emerald-400' },
                { label: 'Due Soon', count: counts.dueSoon, color: '#f59e0b', bg: 'bg-amber-400/10',   border: 'border-amber-400/20',   text: 'text-amber-400' },
                { label: 'Expired',  count: counts.expired, color: '#ef4444', bg: 'bg-red-400/10',     border: 'border-red-400/20',     text: 'text-red-400' },
              ].map(({ label, count, bg, border, text }) => (
                <div key={label} className={`rounded-xl p-4 ${bg} border ${border} flex items-center justify-between`}>
                  <span className={`text-sm font-medium ${text}`}>{label}</span>
                  <div className="flex items-center gap-3">
                    <span className={`text-2xl font-black ${text}`}>{count}</span>
                    <span className="text-xs text-white/40">
                      {counts.total > 0 ? `${Math.round((count / counts.total) * 100)}%` : '—'}
                    </span>
                  </div>
                </div>
              ))}

              {/* Compliance rate gauge */}
              <div className="flex items-center gap-4 pt-2">
                <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                  <svg viewBox="0 0 100 100" className="w-24 h-24 -rotate-90">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="14" />
                    <circle
                      cx="50" cy="50" r="40" fill="none"
                      stroke={compliance.compliance_rate >= 90 ? '#10b981' : compliance.compliance_rate >= 70 ? '#f59e0b' : '#ef4444'}
                      strokeWidth="14"
                      strokeDasharray={`${(compliance.compliance_rate / 100) * 251} 251`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute text-center">
                    <p className={`text-lg font-black leading-none ${compliance.compliance_rate >= 90 ? 'text-emerald-400' : compliance.compliance_rate >= 70 ? 'text-amber-400' : 'text-red-400'}`}>{compliance.compliance_rate}%</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Overall Compliance</p>
                  <p className="text-xs text-white/50 mt-0.5">{compliance.total_tracked} certifications tracked</p>
                  <p className="text-xs text-red-400 mt-0.5">{compliance.non_compliant} expired</p>
                </div>
              </div>
            </div>
          </GlassPanel>

        </div>
      ),
    },
  ];

  // ── RENDER ─────────────────────────────────────────────────────────────────

  return (
    <PageShell>
      <main className="container mx-auto px-4 py-8 space-y-4">

        <HeroPanel
          icon={Award}
          title="Training & Certification"
          subtitle="Manage employee qualifications, track expiry dates, and maintain compliance."
          onRefresh={() => fetchAll(true)}
          loading={refreshing}
          stats={heroStats}
          {...sections.panel('hero')}
          actions={
            <>
              <MasterCollapseButton collapse={sections} />
              <DownloadButton
                data={certs as unknown as Record<string, unknown>[]}
                columns={dlCols}
                filename={`Training_Register_${new Date().toISOString().slice(0, 10)}`}
                title="Training & Certification Register"
              />
              <GlassButton variant="primary" icon={Plus} size="sm" onClick={openNew}>Add Certification</GlassButton>
            </>
          }
        />

        {/* Error banner */}
        {error && (
          <div className="oz-glass-panel rounded-2xl p-4 flex items-center gap-3 border border-red-500/30">
            <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
            <p className="text-sm text-red-300">{error}</p>
            <button type="button" onClick={() => setError('')} className="ml-auto text-white/40 hover:text-white text-xl leading-none">×</button>
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <GlassStatCard label="Overall Compliance" value={`${compliance.compliance_rate}%`} icon={Percent}
            valueClass={compliance.compliance_rate >= 90 ? 'text-emerald-400' : compliance.compliance_rate >= 70 ? 'text-amber-400' : 'text-red-400'}>
            <GlassProgress value={compliance.compliance_rate} className="mt-2" />
          </GlassStatCard>
          <GlassStatCard label="Valid"    value={counts.valid}   icon={CheckCircle} valueClass="text-emerald-400" />
          <GlassStatCard label="Due Soon" value={counts.dueSoon} icon={Calendar}    valueClass="text-amber-400" />
          <GlassStatCard label="Expired"  value={counts.expired} icon={XCircle}     valueClass="text-red-400" />
        </div>

        {/* Filters */}
        <GlassPanel icon={Search} title="Filters" variant="panel" {...sections.panel('filters')}>
          <div className="px-5 pb-4 pt-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <GlassInput
              icon={Search}
              placeholder="Search employee, certification, ID…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <GlassSelect
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              options={[
                { value: 'all',      label: 'All Statuses' },
                { value: 'Valid',    label: 'Valid' },
                { value: 'Due Soon', label: 'Due Soon' },
                { value: 'Expired',  label: 'Expired' },
              ]}
            />
            <GlassSelect
              value={deptFilter}
              onChange={e => setDeptFilter(e.target.value)}
              options={[{ value: 'all', label: 'All Departments' }, ...depts.map(d => ({ value: d, label: d }))]}
            />
          </div>
          <div className="px-5 pb-3 text-xs text-white/35">
            {filtered.length} of {certs.length} certifications
          </div>
        </GlassPanel>

        {/* Main tabs */}
        {loading
          ? <LoadingPane message="Loading certification records…" />
          : <GlassTabs tabs={tabs} defaultTab="register" />
        }

      </main>

      {/* Add / Edit modal */}
      <GlassModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editCert ? 'Edit Certification Record' : 'Add Certification Record'}
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <GlassButton variant="secondary" onClick={() => setModalOpen(false)}>Cancel</GlassButton>
            <GlassButton
              variant="primary"
              onClick={saveRecord}
              disabled={saving || !form.employee_name || !form.certification_name || !form.expiry_date}
            >
              {saving ? 'Saving…' : editCert ? 'Update' : 'Save Record'}
            </GlassButton>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <GlassInput
            label="Employee Name *"
            value={form.employee_name}
            onChange={e => setForm(f => ({ ...f, employee_name: e.target.value }))}
            placeholder="Full name"
          />
          <GlassInput
            label="Employee ID *"
            value={form.employee_id}
            onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))}
            placeholder="e.g. E001"
          />
          <GlassInput
            label="Department"
            value={form.department}
            onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
            placeholder="e.g. Safety"
          />
          <GlassInput
            label="Certification Name *"
            value={form.certification_name}
            onChange={e => setForm(f => ({ ...f, certification_name: e.target.value }))}
            placeholder="e.g. First Aid & CPR"
          />
          <GlassInput
            type="date"
            label="Expiry Date *"
            value={form.expiry_date}
            onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))}
          />
          <GlassInput
            label="Required Refresher"
            value={form.required_refresher}
            onChange={e => setForm(f => ({ ...f, required_refresher: e.target.value }))}
            placeholder="e.g. BLS Refresher"
          />

          {/* File upload — full width */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">
              Certificate Document (PDF / Image)
            </label>
            <label className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/[0.12] bg-white/[0.07] cursor-pointer hover:bg-white/[0.10] transition-colors">
              <UploadCloud className="h-4 w-4 text-[#86BBD8] shrink-0" />
              <span className="text-sm text-white/60 truncate">
                {form.certificate_file ? form.certificate_file.name : editCert?.certificate_url ? 'Replace existing file…' : 'Choose file…'}
              </span>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={e => setForm(f => ({ ...f, certificate_file: e.target.files?.[0] ?? null }))}
              />
            </label>
            {form.certificate_file && (
              <p className="text-xs text-emerald-400 mt-1.5 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" /> {form.certificate_file.name} selected
              </p>
            )}
          </div>

          {/* Expiry preview badge */}
          {form.expiry_date && (
            <div className="sm:col-span-2 flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
              <Calendar className="h-4 w-4 text-[#86BBD8] shrink-0" />
              <span className="text-xs text-white/60">Expiry status preview:</span>
              {(() => {
                const days = daysUntilExpiry(form.expiry_date);
                const status = days < 0 ? 'Expired' : days <= 90 ? 'Due Soon' : 'Valid';
                return (
                  <div className="flex items-center gap-2">
                    {statusBadge(status)}
                    <span className={`text-xs ${statusColor(status)}`}>
                      {days < 0 ? `${Math.abs(days)} days overdue` : `${days} days remaining`}
                    </span>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </GlassModal>

      {/* Delete confirmation */}
      <DeleteDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDelete={doDelete}
        title="Delete Certification"
        description={`Delete the "${deleteTarget?.certification_name}" certification for ${deleteTarget?.employee_name}? This cannot be undone.`}
      />

    </PageShell>
  );
}
