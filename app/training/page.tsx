// app/training/page.tsx — Training & Certification Register
'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import { formatDate } from '@/lib/format';
import { DownloadButton, type DLColumn } from '@/components/shared/DownloadButton';
import {
  Button, Card, DataRegion, DataTable, EmptyState, Field, FormDialog, IconButton, Input, MetricGrid, MetricTile, Notice, PageHeader, Progress, SearchField,
  Select, StatusBadge, Tabs, TabsContent, TabsList, TabsTrigger, Toolbar, sortRows, useConfirm, type Column, type SortState, type Tone,
} from '@/components/ui-system';
import type { DataStatus } from '@/components/ui-system';
import type { Certification, FormState } from './types';
import { useTrainingData, createCertification, updateCertification, deleteCertification } from './useTrainingData';

const STATUS_ORDER: Record<string, number> = { Expired: 3, 'Due Soon': 2, Valid: 1 };
const STATUS: Record<string, { tone: Tone; label: string; icon: 'valid' | 'due-soon' | 'expired' }> = {
  Valid: { tone: 'success', label: 'Valid', icon: 'valid' }, 'Due Soon': { tone: 'warning', label: 'Due soon', icon: 'due-soon' }, Expired: { tone: 'danger', label: 'Expired', icon: 'expired' },
};
const ALL = '__all__';
const EMPTY_FORM: FormState = { employee_name: '', employee_id: '', department: '', certification_name: '', expiry_date: '', required_refresher: '', certificate_file: null };

// A cert missing or with a malformed expiry would otherwise leak "NaNd remaining" onto the register.
function daysUntilExpiry(d: string): number {
  if (!d) return 0;
  const t = new Date(d).getTime();
  return Number.isNaN(t) ? 0 : Math.ceil((t - Date.now()) / 86400000);
}
const StatusTag = ({ status }: { status: string }) => { const s = STATUS[status] ?? { tone: 'neutral' as Tone, label: status || 'Unknown', icon: 'info' as never }; return <StatusBadge tone={s.tone} icon={s.icon}>{s.label}</StatusBadge>; };
const DaysLeft = ({ expiry }: { expiry: string }) => {
  const days = daysUntilExpiry(expiry);
  const tone = days < 0 ? 'text-danger' : days <= 90 ? 'text-warning' : 'text-ink-muted';
  return <span className={`text-caption tabular ${tone}`}>{days < 0 ? `${Math.abs(days)} days overdue` : `${days} days left`}</span>;
};
const complianceTone = (pct: number): 'success' | 'warning' | 'danger' => (pct >= 90 ? 'success' : pct >= 70 ? 'warning' : 'danger');

const dlCols: DLColumn[] = [
  { key: 'employee_id', label: 'Employee ID' }, { key: 'employee_name', label: 'Employee Name' }, { key: 'department', label: 'Department' },
  { key: 'certification_name', label: 'Certification' }, { key: 'required_refresher', label: 'Refresher Required' }, { key: 'expiry_date', label: 'Expiry Date' }, { key: 'status', label: 'Status' },
];

function CertificationDialog({ cert, open, onOpenChange, onSaved }: { cert: Certification | null; open: boolean; onOpenChange: (open: boolean) => void; onSaved: () => void }) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [touched, setTouched] = useState(false);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const key = open ? String(cert?.id ?? 'new') : null;
  if (key !== loadedFor) {
    setLoadedFor(key);
    if (key !== null) {
      setTouched(false);
      setForm(cert ? { employee_name: cert.employee_name, employee_id: cert.employee_id, department: cert.department, certification_name: cert.certification_name, expiry_date: cert.expiry_date, required_refresher: cert.required_refresher, certificate_file: null } : EMPTY_FORM);
    }
  }
  const set = (patch: Partial<FormState>) => setForm(current => ({ ...current, ...patch }));
  const missing = (value: string, message: string) => (touched && !value.trim() ? message : undefined);
  const days = form.expiry_date ? daysUntilExpiry(form.expiry_date) : null;
  const previewStatus = days === null ? null : days < 0 ? 'Expired' : days <= 90 ? 'Due Soon' : 'Valid';

  const submit = async () => {
    setTouched(true);
    if (!form.employee_name.trim() || !form.employee_id.trim() || !form.certification_name.trim() || !form.expiry_date) return false;
    const fd = new FormData();
    fd.append('employee_name', form.employee_name);
    fd.append('employee_id', form.employee_id);
    fd.append('department', form.department);
    fd.append('certification_name', form.certification_name);
    fd.append('expiry_date', form.expiry_date);
    fd.append('required_refresher', form.required_refresher);
    if (form.certificate_file) fd.append('certificate_file', form.certificate_file);
    if (cert) await updateCertification(cert.id, fd); else await createCertification(fd);
    toast.success(`${form.certification_name} was saved for ${form.employee_name}.`);
    onSaved();
  };

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={cert ? 'Edit certification' : 'Add certification'} description="Employee name, employee ID, certification and expiry date are required." submitLabel={cert ? 'Save changes' : 'Save certification'} onSubmit={submit} size="lg">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Employee name" required error={missing(form.employee_name, 'Enter the employee name.')}><Input value={form.employee_name} onChange={e => set({ employee_name: e.target.value })} autoComplete="name" /></Field>
        <Field label="Employee ID" required error={missing(form.employee_id, 'Enter the employee ID.')}><Input value={form.employee_id} onChange={e => set({ employee_id: e.target.value })} placeholder="For example, E001" /></Field>
        <Field label="Department" optional><Input value={form.department} onChange={e => set({ department: e.target.value })} /></Field>
        <Field label="Certification name" required error={missing(form.certification_name, 'Enter the certification name.')}><Input value={form.certification_name} onChange={e => set({ certification_name: e.target.value })} placeholder="For example, First aid and CPR" /></Field>
        <Field label="Expiry date" required error={touched && !form.expiry_date ? 'Choose the expiry date.' : undefined}><Input type="date" value={form.expiry_date} onChange={e => set({ expiry_date: e.target.value })} /></Field>
        <Field label="Required refresher" optional><Input value={form.required_refresher} onChange={e => set({ required_refresher: e.target.value })} placeholder="For example, BLS refresher" /></Field>
        <div className="sm:col-span-2">
          <Field label="Certificate document" optional description={cert?.certificate_url && !form.certificate_file ? 'A file is already attached. Choosing a new one replaces it.' : 'PDF or image (.pdf, .jpg, .png).'}>
            <Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => set({ certificate_file: e.target.files?.[0] ?? null })} className="h-auto py-2 file:mr-3 file:rounded-control file:border-0 file:bg-surface-muted file:px-3 file:py-1.5 file:font-sans file:text-label file:text-ink" />
          </Field>
        </div>
        {previewStatus && days !== null && (
          <div className="flex flex-wrap items-center gap-3 rounded-control border border-line-subtle bg-surface-subtle p-3 sm:col-span-2">
            <span className="font-sans text-body-sm text-ink-muted">Status once saved:</span>
            <StatusTag status={previewStatus} />
            <span className="font-sans text-body-sm text-ink-muted">{days < 0 ? `${Math.abs(days)} days overdue` : `${days} days remaining`}</span>
          </div>
        )}
      </div>
    </FormDialog>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return <Card padding="lg" className="flex flex-col gap-4"><h2 className="font-display text-title font-semibold text-ink">{title}</h2>{children}</Card>;
}

function TrainingContent() {
  const confirm = useConfirm();
  const { certs, refreshers, compliance, loading, refreshing, error, setError, registerUnavailable, complianceUnavailable, refreshersUnavailable, fetchAll } = useTrainingData();
  const [tab, setTab] = useState('register');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [deptFilter, setDeptFilter] = useState(ALL);
  const [sort, setSort] = useState<SortState>(null);
  const [editing, setEditing] = useState<Certification | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const depts = useMemo(() => [...new Set(certs.map(c => c.department).filter(Boolean))].sort(), [certs]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return certs
      .filter(c => statusFilter === ALL || c.status === statusFilter)
      .filter(c => deptFilter === ALL || c.department === deptFilter)
      .filter(c => !q || c.employee_name.toLowerCase().includes(q) || c.certification_name.toLowerCase().includes(q) || c.employee_id.toLowerCase().includes(q))
      .sort((a, b) => (STATUS_ORDER[b.status] ?? 0) - (STATUS_ORDER[a.status] ?? 0));
  }, [certs, statusFilter, deptFilter, search]);
  const rows = useMemo(() => sortRows(filtered, sort, (c, id) => (id === 'expiry_date' ? c.expiry_date : id === 'status' ? STATUS_ORDER[c.status] ?? 0 : String(c[id as keyof Certification] ?? '').toLowerCase())), [filtered, sort]);
  const counts = useMemo(() => ({ total: certs.length, valid: certs.filter(c => c.status === 'Valid').length, expired: certs.filter(c => c.status === 'Expired').length, dueSoon: certs.filter(c => c.status === 'Due Soon').length }), [certs]);
  const expiring = useMemo(() => certs.filter(c => { const d = daysUntilExpiry(c.expiry_date); return d >= 0 && d <= 90; }).sort((a, b) => daysUntilExpiry(a.expiry_date) - daysUntilExpiry(b.expiry_date)), [certs]);
  const deptCompliance = useMemo(() => {
    const map = new Map<string, { total: number; expired: number }>();
    certs.forEach(c => { const d = c.department || 'Unknown'; const ex = map.get(d) ?? { total: 0, expired: 0 }; map.set(d, { total: ex.total + 1, expired: ex.expired + (c.status === 'Expired' ? 1 : 0) }); });
    return [...map.entries()].map(([dept, { total, expired }]) => ({ dept, total, expired, pct: total > 0 ? Math.round(((total - expired) / total) * 100) : 100 })).sort((a, b) => a.pct - b.pct);
  }, [certs]);

  const openEditor = (cert: Certification | null) => { setEditing(cert); setDialogOpen(true); };
  const remove = async (cert: Certification) => {
    if (!await confirm({ title: `Delete ${cert.certification_name}?`, message: `This removes the certification for ${cert.employee_name}. It cannot be undone.`, confirmLabel: 'Delete', destructive: true })) return;
    try { await deleteCertification(cert.id); toast.success('The certification was deleted.'); fetchAll(true); }
    catch (e) { toast.error(`Delete failed: ${(e as Error).message}`); }
  };

  const registerStatus: DataStatus = loading ? 'loading' : registerUnavailable ? 'error' : filtered.length === 0 ? 'empty' : 'ready';
  const unavailable = (flag: boolean) => !loading && flag;
  const hasFilters = !!search || statusFilter !== ALL || deptFilter !== ALL;

  const COLUMNS: Column<Certification>[] = [
    { id: 'employee_name', header: 'Employee', sortable: true, sticky: true, cell: c => <span>{c.employee_name}<span className="block text-caption font-normal text-ink-muted">{[c.department, c.employee_id].filter(Boolean).join(' · ')}</span></span> },
    { id: 'certification_name', header: 'Certification', sortable: true, cell: c => <span>{c.certification_name}{c.required_refresher && <span className="block text-caption text-ink-muted">Refresher: {c.required_refresher}</span>}</span> },
    { id: 'expiry_date', header: 'Expiry', sortable: true, cell: c => <span><span className="tabular whitespace-nowrap">{c.expiry_date ? formatDate(c.expiry_date) : 'Not set'}</span><span className="block"><DaysLeft expiry={c.expiry_date} /></span></span> },
    { id: 'status', header: 'Status', sortable: true, cell: c => <StatusTag status={c.status} /> },
    { id: 'certificate', header: 'Certificate', hideBelow: 'md', cell: c => (c.certificate_url ? <a href={c.certificate_url} target="_blank" rel="noreferrer" className="focus-ring rounded-xs text-action underline underline-offset-2">Open file</a> : <span className="text-ink-muted">None</span>) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: 'Safety and compliance' }, { label: 'Training' }]}
        title="Training and certification"
        description="Employee qualifications, expiry dates and compliance."
        actions={(
          <>
            <IconButton icon="refresh" label="Refresh training records" variant="outline" pending={refreshing} onClick={() => fetchAll(true)} />
            <DownloadButton data={certs as unknown as Record<string, unknown>[]} columns={dlCols} filename={`Training_Register_${new Date().toISOString().slice(0, 10)}`} title="Training & Certification Register" />
            <Button variant="primary" icon="plus" onClick={() => openEditor(null)}>Add certification</Button>
          </>
        )}
      />

      {error && <Notice tone="danger" title="Something went wrong" action={<Button size="sm" onClick={() => setError('')}>Dismiss</Button>}>{error}</Notice>}

      <MetricGrid columns={5}>
        <MetricTile label="Certifications" icon="training" value={counts.total} loading={loading} unavailable={unavailable(registerUnavailable)} />
        <MetricTile label="Compliance" icon="percent" tone={complianceTone(compliance.compliance_rate)} value={`${compliance.compliance_rate}%`} loading={loading} unavailable={unavailable(complianceUnavailable)} />
        <MetricTile label="Valid" icon="valid" tone="success" value={counts.valid} loading={loading} unavailable={unavailable(registerUnavailable)} />
        <MetricTile label="Due soon" icon="due-soon" tone="warning" value={counts.dueSoon} loading={loading} unavailable={unavailable(registerUnavailable)} />
        <MetricTile label="Expired" icon="expired" tone="danger" value={counts.expired} loading={loading} unavailable={unavailable(registerUnavailable)} />
      </MetricGrid>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList aria-label="Training views">
          <TabsTrigger value="register" icon="training">Certification register</TabsTrigger>
          <TabsTrigger value="refreshers" icon="due-soon">Refreshers due</TabsTrigger>
          <TabsTrigger value="analytics" icon="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="register" className="mt-5 flex flex-col gap-4">
          <Toolbar filtered={hasFilters}>
            <SearchField value={search} onValueChange={setSearch} placeholder="Search employee, certification or ID" wrapperClassName="min-w-56 max-w-md flex-1" />
            <Select className="w-44" aria-label="Filter by status" value={statusFilter} onValueChange={setStatusFilter} options={[{ value: ALL, label: 'All statuses' }, { value: 'Valid', label: 'Valid' }, { value: 'Due Soon', label: 'Due soon' }, { value: 'Expired', label: 'Expired' }]} />
            <Select className="w-48" aria-label="Filter by department" value={deptFilter} onValueChange={setDeptFilter} options={[{ value: ALL, label: 'All departments' }, ...depts.map(d => ({ value: d, label: d }))]} />
          </Toolbar>
          <DataRegion
            status={registerStatus}
            subject="certifications"
            error="The certification register could not be loaded."
            onRetry={() => fetchAll()}
            empty={hasFilters
              ? <EmptyState icon="search" title="No certifications match" description="Try a different search or filter." action={<Button onClick={() => { setSearch(''); setStatusFilter(ALL); setDeptFilter(ALL); }}>Clear filters</Button>} />
              : <EmptyState icon="training" title="No certifications yet" description="Add the first certification to start tracking expiry dates." action={<Button variant="primary" icon="plus" onClick={() => openEditor(null)}>Add certification</Button>} />}
          >
            <p className="font-sans text-caption text-ink-muted">{filtered.length} of {certs.length} certifications</p>
            <DataTable
              caption="Certification register"
              rows={rows}
              columns={COLUMNS}
              getRowId={c => String(c.id)}
              sort={sort}
              onSortChange={setSort}
              onRowActivate={openEditor}
              rowActions={c => (
                <span className="inline-flex gap-1">
                  <IconButton icon="edit" label={`Edit ${c.certification_name} for ${c.employee_name}`} size="sm" onClick={() => openEditor(c)} />
                  <IconButton icon="delete" label={`Delete ${c.certification_name} for ${c.employee_name}`} size="sm" variant="danger" onClick={() => remove(c)} />
                </span>
              )}
            />
          </DataRegion>
        </TabsContent>

        <TabsContent value="refreshers" className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel title="Refresher courses required">
            {refreshersUnavailable ? <Notice tone="warning" title="Refresher data is unavailable" action={<Button size="sm" onClick={() => fetchAll()}>Try again</Button>} />
              : refreshers.length === 0 ? <EmptyState icon="valid" title="No refreshers overdue" />
              : refreshers.map(({ refresher, employees_due }) => {
                const tone: Tone = employees_due > 5 ? 'danger' : employees_due > 2 ? 'warning' : 'neutral';
                return (
                  <div key={refresher} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-3"><span className="font-sans text-body text-ink">{refresher}</span><StatusBadge tone={tone}>{employees_due} {employees_due === 1 ? 'employee' : 'employees'}</StatusBadge></div>
                    <Progress value={Math.min(employees_due * 10, 100)} label={`${refresher}: ${employees_due} due`} />
                  </div>
                );
              })}
          </Panel>
          <Panel title="Expiring in 90 days">
            {registerUnavailable ? <Notice tone="warning" title="Certification data is unavailable" action={<Button size="sm" onClick={() => fetchAll()}>Try again</Button>} />
              : expiring.length === 0 ? <EmptyState icon="valid" title="Nothing expiring in the next 90 days" />
              : (
                <ul className="flex flex-col divide-y divide-line-subtle">
                  {expiring.slice(0, 8).map(c => (
                    <li key={String(c.id)} className="flex items-center gap-3 py-2.5">
                      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-control bg-warning-soft font-sans text-label font-semibold text-warning tabular">{daysUntilExpiry(c.expiry_date)}d</span>
                      <span className="min-w-0 flex-1"><span className="block truncate font-sans text-label font-medium text-ink">{c.employee_name}</span><span className="block truncate font-sans text-caption text-ink-muted">{c.certification_name}</span></span>
                      <span className="shrink-0 font-sans text-caption text-ink-muted tabular">{formatDate(c.expiry_date)}</span>
                    </li>
                  ))}
                </ul>
              )}
          </Panel>
        </TabsContent>

        <TabsContent value="analytics" className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel title="Compliance by department">
            {registerUnavailable ? <Notice tone="warning" title="Certification data is unavailable" action={<Button size="sm" onClick={() => fetchAll()}>Try again</Button>} />
              : deptCompliance.length === 0 ? <EmptyState icon="analytics" title="No data yet" description="Add certifications first." />
              : deptCompliance.map(({ dept, pct, total, expired }) => (
                <div key={dept} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-3 font-sans text-body-sm"><span className="text-ink">{dept}</span><span className="text-ink-muted">{expired > 0 ? `${expired} expired of ${total}` : `${total} total`} · <strong className={`font-semibold ${complianceTone(pct) === 'success' ? 'text-success' : complianceTone(pct) === 'warning' ? 'text-warning' : 'text-danger'}`}>{pct}%</strong></span></div>
                  <Progress value={pct} label={`${dept} compliance`} />
                </div>
              ))}
          </Panel>
          <Panel title="Status distribution">
            {registerUnavailable ? <Notice tone="warning" title="Certification data is unavailable" action={<Button size="sm" onClick={() => fetchAll()}>Try again</Button>} /> : (
              <>
                <ul className="flex flex-col gap-2">
                  {([['Valid', counts.valid], ['Due Soon', counts.dueSoon], ['Expired', counts.expired]] as const).map(([status, count]) => (
                    <li key={status} className="flex items-center justify-between rounded-control border border-line-subtle bg-surface-subtle px-3.5 py-3">
                      <StatusTag status={status} />
                      <span className="font-sans text-body tabular"><strong className="font-semibold text-ink">{count}</strong><span className="ml-3 text-ink-muted">{counts.total > 0 ? `${Math.round((count / counts.total) * 100)}%` : 'None'}</span></span>
                    </li>
                  ))}
                </ul>
                {complianceUnavailable ? <Notice tone="warning" title="The compliance report is unavailable" /> : (
                  <div className="rounded-control border border-line-subtle p-4">
                    <p className="font-display text-title font-semibold text-ink">Overall compliance: {compliance.compliance_rate}%</p>
                    <p className="mt-0.5 font-sans text-body-sm text-ink-muted">{compliance.total_tracked} certifications tracked, {compliance.non_compliant} expired.</p>
                    <Progress value={compliance.compliance_rate} label="Overall compliance" className="mt-2" />
                  </div>
                )}
              </>
            )}
          </Panel>
        </TabsContent>
      </Tabs>

      <CertificationDialog cert={editing} open={dialogOpen} onOpenChange={setDialogOpen} onSaved={() => fetchAll(true)} />
    </div>
  );
}

export default function TrainingPage() {
  return <AppShell migrated><TrainingContent /></AppShell>;
}
