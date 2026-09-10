'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/app-shell';
import {
  useTheme, PageHero, PrimaryButton, EmptyState, FormField, SelectField,
  TYPE_WEIGHT, Loader2, FileSpreadsheet, FileText, Save, Search, RefreshCw,
  HardHat, CalendarDays, Trash2, Sparkles,
} from '@/components/shared/theme';
import { toast } from 'sonner';
import { formatDate } from '@/lib/format';
import {
  mergeMonthRows,
  monthName,
  parseNumericField,
} from './calcTotals';
import {
  createArtisanTimesheet,
  deleteArtisanTimesheet,
  updateArtisanTimesheet,
  useArtisanTimesheetsData,
} from './useArtisanTimesheetsData';
import { downloadArtisanTimesheetExcel, downloadArtisanTimesheetPdf } from './exportArtisanTimesheet';
import { autoPopulateMonthRows } from './autoPopulate';
import { getCompiledBySignatureReuse } from './collectTimesheetSignatures';
import { TimesheetGrid } from './components/TimesheetGrid';
import { SearchablePersonField } from './components/SearchablePersonField';
import { SignatureFieldModal } from './components/SignatureFieldModal';
import type { ArtisanTimesheetDraft, ArtisanTimesheetRecord } from './types';

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: monthName(i + 1),
}));

const YEAR_OPTIONS = (() => {
  const y = new Date().getFullYear();
  return Array.from({ length: 6 }, (_, i) => {
    const year = y - 2 + i;
    return { value: String(year), label: String(year) };
  });
})();

function recordToDraft(record: ArtisanTimesheetRecord): ArtisanTimesheetDraft {
  return {
    employee_id: record.employee_id,
    employee_db_id: record.employee_db_id ?? undefined,
    employee_name: record.employee_name,
    id_number: record.id_number || '',
    year: record.year,
    month: record.month,
    shift_rate: record.shift_rate != null ? String(record.shift_rate) : '',
    hourly_rate: record.hourly_rate != null ? String(record.hourly_rate) : '',
    daily_rows: mergeMonthRows(record.year, record.month, record.daily_rows),
    compiled_by: record.compiled_by || '',
    compiled_by_signature: record.compiled_by_signature || '',
    approved_electrical_foreman: record.approved_electrical_foreman || '',
    approved_electrical_foreman_signature: record.approved_electrical_foreman_signature || '',
    approved_mechanical_foreman: record.approved_mechanical_foreman || '',
    approved_mechanical_foreman_signature: record.approved_mechanical_foreman_signature || '',
    authorized_by: record.authorized_by || '',
    authorized_by_signature: record.authorized_by_signature || '',
  };
}

function draftToPayload(draft: ArtisanTimesheetDraft) {
  return {
    employee_id: draft.employee_id,
    employee_db_id: draft.employee_db_id,
    employee_name: draft.employee_name,
    id_number: draft.id_number || null,
    year: draft.year,
    month: draft.month,
    shift_rate: parseNumericField(draft.shift_rate),
    hourly_rate: parseNumericField(draft.hourly_rate),
    daily_rows: draft.daily_rows,
    compiled_by: draft.compiled_by || null,
    compiled_by_signature: draft.compiled_by_signature || null,
    approved_electrical_foreman: draft.approved_electrical_foreman || null,
    approved_electrical_foreman_signature: draft.approved_electrical_foreman_signature || null,
    approved_mechanical_foreman: draft.approved_mechanical_foreman || null,
    approved_mechanical_foreman_signature: draft.approved_mechanical_foreman_signature || null,
    authorized_by: draft.authorized_by || null,
    authorized_by_signature: draft.authorized_by_signature || null,
  };
}

function ArtisanTimesheetsContent() {
  const t = useTheme();
  const now = new Date();
  const [listEmployee, setListEmployee] = useState('');
  const [listYear, setListYear] = useState('');
  const [listMonth, setListMonth] = useState('');
  const listFilters = useMemo(() => ({
    employee_id: listEmployee || undefined,
    year: listYear ? Number(listYear) : undefined,
    month: listMonth ? Number(listMonth) : undefined,
  }), [listEmployee, listMonth, listYear]);

  const { artisans, saved, reference, loading, reload } = useArtisanTimesheetsData(listFilters);

  const [recordId, setRecordId] = useState<number | null>(null);
  const [selectedEmployeeKey, setSelectedEmployeeKey] = useState('');
  const [editorYear, setEditorYear] = useState(String(now.getFullYear()));
  const [editorMonth, setEditorMonth] = useState(String(now.getMonth() + 1));
  const [draft, setDraft] = useState<ArtisanTimesheetDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);

  const registerOptions = useMemo(
    () => reference.employeeRegister,
    [reference.employeeRegister],
  );

  const reuseSignatures = useMemo(
    () => getCompiledBySignatureReuse(draft?.compiled_by_signature ?? ''),
    [draft?.compiled_by_signature],
  );

  const artisanOptions = useMemo(
    () => artisans.map(a => ({
      value: a.employee_id || String(a.id),
      label: `${a.name}${a.employee_id ? ` (${a.employee_id})` : ''} — ${a.designation}`,
    })),
    [artisans],
  );

  const buildBlankDraft = useCallback((employeeKey: string, year: number, month: number, autoFill = true): ArtisanTimesheetDraft | null => {
    const emp = artisans.find(a => (a.employee_id || String(a.id)) === employeeKey);
    if (!emp) return null;
    const existing = saved.find(
      s => s.employee_id === (emp.employee_id || String(emp.id)) && s.year === year && s.month === month,
    );
    if (existing) {
      setRecordId(existing.id);
      return recordToDraft(existing);
    }
    setRecordId(null);
    let daily_rows = mergeMonthRows(year, month, []);
    if (autoFill) {
      daily_rows = autoPopulateMonthRows(daily_rows, emp.employee_id || String(emp.id), {
        leaves: reference.leaves,
        overtime: reference.overtime,
        standbyAssignments: reference.standbyAssignments,
      });
    }
    return {
      employee_id: emp.employee_id || String(emp.id),
      employee_db_id: emp.id,
      employee_name: emp.name,
      id_number: emp.id_number,
      year,
      month,
      shift_rate: '',
      hourly_rate: '',
      daily_rows,
      compiled_by: '',
      compiled_by_signature: '',
      approved_electrical_foreman: '',
      approved_electrical_foreman_signature: '',
      approved_mechanical_foreman: '',
      approved_mechanical_foreman_signature: '',
      authorized_by: '',
      authorized_by_signature: '',
    };
  }, [artisans, saved, reference]);

  const loadEditor = useCallback(() => {
    if (!selectedEmployeeKey) {
      toast.error('Select an artisan employee first');
      return;
    }
    const year = Number(editorYear);
    const month = Number(editorMonth);
    if (!year || !month) {
      toast.error('Select month and year');
      return;
    }
    const next = buildBlankDraft(selectedEmployeeKey, year, month);
    if (next) setDraft(next);
  }, [buildBlankDraft, editorMonth, editorYear, selectedEmployeeKey]);

  useEffect(() => {
    if (selectedEmployeeKey && editorYear && editorMonth) {
      const next = buildBlankDraft(selectedEmployeeKey, Number(editorYear), Number(editorMonth));
      if (next) setDraft(next);
    }
  }, [selectedEmployeeKey, editorYear, editorMonth, buildBlankDraft]);

  const openSaved = (record: ArtisanTimesheetRecord) => {
    setSelectedEmployeeKey(record.employee_id);
    setEditorYear(String(record.year));
    setEditorMonth(String(record.month));
    setRecordId(record.id);
    setDraft(recordToDraft(record));
  };

  const refreshFromSystem = () => {
    if (!draft) return;
    setDraft({
      ...draft,
      daily_rows: autoPopulateMonthRows(draft.daily_rows, draft.employee_id, {
        leaves: reference.leaves,
        overtime: reference.overtime,
        standbyAssignments: reference.standbyAssignments,
      }, { overwrite: true }),
    });
    toast.success('Updated from Leaves, Overtime, Standby & holidays');
  };

  const handleSave = async () => {
    if (!draft) return;
    if (!draft.employee_id || !draft.employee_name) {
      toast.error('Employee details are required');
      return;
    }
    setSaving(true);
    try {
      const payload = draftToPayload(draft);
      if (recordId) {
        await updateArtisanTimesheet(recordId, payload);
        toast.success('Timesheet updated');
      } else {
        const created = await createArtisanTimesheet(payload);
        setRecordId(created.id);
        toast.success('Timesheet saved');
      }
      reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this saved timesheet?')) return;
    try {
      await deleteArtisanTimesheet(id);
      if (recordId === id) {
        setRecordId(null);
        setDraft(null);
      }
      toast.success('Timesheet deleted');
      reload();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleExport = async (format: 'excel' | 'pdf') => {
    if (!draft) return;
    setExporting(format);
    try {
      const record: ArtisanTimesheetRecord = {
        id: recordId ?? 0,
        ...draftToPayload(draft),
      };
      if (format === 'excel') await downloadArtisanTimesheetExcel(record);
      else await downloadArtisanTimesheetPdf(record);
      toast.success(`${format === 'excel' ? 'Excel' : 'PDF'} downloaded`);
    } catch (e) {
      toast.error(`Export failed: ${(e as Error).message}`);
    } finally {
      setExporting(null);
    }
  };

  const inputCls = `w-full min-w-0 rounded px-1.5 py-1 text-xs outline-none ${t.inputBg}`;
  const headerInputCls = `w-full h-9 rounded-lg px-3 text-sm outline-none ${t.inputBg}`;

  return (
    <main className="space-y-4 pb-8">
      <PageHero
        icon={HardHat}
        title="Artisan Timesheets"
        description="Formal monthly daily timesheets for Class 1 artisans and winder technicians"
        accent="indigo"
        actions={
          <button type="button" onClick={reload} className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${t.chipBg} border ${t.border}`}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        }
      />

      {loading && !draft ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-brand-400" /></div>
      ) : artisans.length === 0 ? (
        <EmptyState
          icon={HardHat}
          title="No artisan employees found"
          message="Only employees with Class 1 trade designations or Winder Technician roles appear here. Update employee designations on the Personnel page first."
        />
      ) : (
        <>
          {/* Saved timesheets list */}
          <section className={`${t.glass} rounded-2xl ${t.shadow} p-4 space-y-3`}>
            <div className="flex flex-wrap items-center gap-2">
              <Search className={`h-4 w-4 ${t.textFaint}`} />
              <span className={`text-sm ${TYPE_WEIGHT.semibold} ${t.textPrimary}`}>Saved Timesheets</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <FormField label="Employee">
                <SelectField size="filter" title="Filter employee" value={listEmployee} onChange={setListEmployee}
                  options={[{ value: '', label: 'All artisans' }, ...artisanOptions]} />
              </FormField>
              <FormField label="Year">
                <SelectField size="filter" title="Filter year" value={listYear} onChange={setListYear}
                  options={[{ value: '', label: 'All years' }, ...YEAR_OPTIONS]} />
              </FormField>
              <FormField label="Month">
                <SelectField size="filter" title="Filter month" value={listMonth} onChange={setListMonth}
                  options={[{ value: '', label: 'All months' }, ...MONTH_OPTIONS]} />
              </FormField>
            </div>
            {saved.length === 0 ? (
              <p className={`text-sm ${t.textFaint} py-2`}>No saved timesheets match these filters.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={`border-b ${t.border} ${t.textFaint} text-xs`}>
                      <th className="text-left py-2 pr-3">Employee</th>
                      <th className="text-left py-2 pr-3">Mine No.</th>
                      <th className="text-left py-2 pr-3">Period</th>
                      <th className="text-left py-2 pr-3">Updated</th>
                      <th className="text-right py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {saved.map(row => (
                      <tr key={row.id} className={`border-b ${t.border}`}>
                        <td className="py-2 pr-3">{row.employee_name}</td>
                        <td className="py-2 pr-3 font-mono text-xs">{row.employee_id}</td>
                        <td className="py-2 pr-3">{monthName(row.month)} {row.year}</td>
                        <td className="py-2 pr-3 text-xs">{row.updated_at ? formatDate(row.updated_at.slice(0, 10)) : '—'}</td>
                        <td className="py-2 text-right space-x-2">
                          <button type="button" onClick={() => openSaved(row)} className="text-brand-500 hover:underline text-xs">Open</button>
                          <button type="button" onClick={() => handleDelete(row.id)} className="text-rose-500 hover:underline text-xs inline-flex items-center gap-1"><Trash2 className="h-3 w-3" /> Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Editor */}
          <section className={`${t.glass} rounded-2xl ${t.shadow} p-4 space-y-4`}>
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[220px] flex-1">
                <FormField label="Artisan Employee">
                  <SelectField size="form" title="Artisan employee" value={selectedEmployeeKey} onChange={setSelectedEmployeeKey}
                    options={[{ value: '', label: 'Select artisan…' }, ...artisanOptions]} />
                </FormField>
              </div>
              <div className="w-36">
                <FormField label="Month">
                  <SelectField size="form" title="Month" value={editorMonth} onChange={setEditorMonth} options={MONTH_OPTIONS} />
                </FormField>
              </div>
              <div className="w-28">
                <FormField label="Year">
                  <SelectField size="form" title="Year" value={editorYear} onChange={setEditorYear} options={YEAR_OPTIONS} />
                </FormField>
              </div>
              <PrimaryButton size="md" onClick={loadEditor} disabled={!selectedEmployeeKey}>
                <CalendarDays className="h-4 w-4" /> Generate Month
              </PrimaryButton>
            </div>

            {draft && (
              <>
                <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 p-3 rounded-xl ${t.chipBg}`}>
                  {([
                    ['Mine No.', draft.employee_id],
                    ['Employee Name', draft.employee_name],
                    ['ID Number', draft.id_number],
                    ['Month', `${monthName(draft.month)} ${draft.year}`],
                  ] as const).map(([label, value]) => (
                    <div key={label}>
                      <div className={`text-[10px] uppercase tracking-wide mb-0.5 ${t.textFaint}`}>{label}</div>
                      <div className={`text-sm ${t.textPrimary}`}>{value || '—'}</div>
                    </div>
                  ))}
                  <FormField label="Shift Rate">
                    <input className={headerInputCls} value={draft.shift_rate} onChange={e => setDraft({ ...draft, shift_rate: e.target.value })} aria-label="Shift rate" />
                  </FormField>
                  <FormField label="Hourly Rate">
                    <input className={headerInputCls} value={draft.hourly_rate} onChange={e => setDraft({ ...draft, hourly_rate: e.target.value })} aria-label="Hourly rate" />
                  </FormField>
                </div>

                <div className={`flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2.5 ${t.chipBg}`}>
                  <p className={`text-[11px] ${t.textFaint} max-w-2xl`}>
                    <strong className={t.textMuted}>Copy down:</strong> hover any cell and drag the corner handle to copy that column.
                    Daily sign-in/out can reuse the <strong className={t.textMuted}>Compiled by</strong> signature. Shifts run 07:00–07:00.
                  </p>
                  <button type="button" onClick={refreshFromSystem}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs ${TYPE_WEIGHT.medium} border ${t.border} ${t.hoverBg}`}>
                    <Sparkles className="h-3.5 w-3.5" /> Refresh from system
                  </button>
                </div>

                <TimesheetGrid
                  rows={draft.daily_rows}
                  employeeName={draft.employee_name}
                  inputCls={inputCls}
                  t={t}
                  reuseSignatures={reuseSignatures}
                  onChange={rows => setDraft({ ...draft, daily_rows: rows })}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {([
                    ['Compiled By', 'compiled_by', 'compiled_by_signature'],
                    ['Approved By Electrical Foreman', 'approved_electrical_foreman', 'approved_electrical_foreman_signature'],
                    ['Approved By Mechanical Foreman', 'approved_mechanical_foreman', 'approved_mechanical_foreman_signature'],
                    ['Authorized By', 'authorized_by', 'authorized_by_signature'],
                  ] as const).map(([label, nameKey, sigKey]) => (
                    <div key={nameKey} className={`rounded-xl p-3 space-y-2 ${t.chipBg}`}>
                      <FormField label={label}>
                        <SearchablePersonField
                          value={draft[nameKey]}
                          onChange={v => setDraft({ ...draft, [nameKey]: v })}
                          options={registerOptions}
                          placeholder="Search employee name…"
                        />
                      </FormField>
                      <div>
                        <div className={`text-[10px] uppercase tracking-wide mb-1 ${t.textFaint}`}>Signature</div>
                        <SignatureFieldModal
                          label={`${label} signature`}
                          signerName={draft[nameKey] || draft.employee_name}
                          value={draft[sigKey]}
                          onChange={url => setDraft({ ...draft, [sigKey]: url })}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2 justify-end pt-2">
                  <button type="button" onClick={() => handleExport('excel')} disabled={!!exporting}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm ${TYPE_WEIGHT.medium} ${t.chipBg} border ${t.border}`}>
                    {exporting === 'excel' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                    Download Excel
                  </button>
                  <button type="button" onClick={() => handleExport('pdf')} disabled={!!exporting}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm ${TYPE_WEIGHT.medium} ${t.chipBg} border ${t.border}`}>
                    {exporting === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                    Download PDF
                  </button>
                  <PrimaryButton size="md" submitting={saving} onClick={handleSave}>
                    <Save className="h-4 w-4" /> {recordId ? 'Update' : 'Save'} Timesheet
                  </PrimaryButton>
                </div>
              </>
            )}
          </section>
        </>
      )}
    </main>
  );
}

export default function ArtisanTimesheetsPage() {
  return (
    <AppShell>
      <ArtisanTimesheetsContent />
    </AppShell>
  );
}
