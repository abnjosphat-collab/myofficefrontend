// app/overtime/BudgetView.tsx — the Overtime Budget tab: forecast average monthly
// overtime per employee for the ENGINEERING sheet of the FY2027 split-budget
// workbook, with a matching Excel download. OT @ 1.5 Shift comes from the
// uploaded monthly NEC timesheet book (TOTAL HRS minus T/M Hours per month,
// averaged over the months each employee appears in); OT @ 2.0 Shift (holiday/
// off-day working) and OT @ 1.5 Adhoc come from the Overtime module only.
// All figures are whole numbers and the Comment column stays blank. Module
// data arrives through the existing authenticated fetchers, so the tab respects
// the same access permissions as the rest of the page.
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Button, DataTable, EXPORT_CHECK_MS, EmptyState, ExportButton, LoadingPulse, MetricGrid,
  MetricTile, Notice, StatusBadge, useActionFeedback, type Column,
} from '@/components/ui-system';
import type { EmployeeLookup } from '@/hooks/useLookups';
import { adhocTotals, budgetTotals, buildEngineeringRoster, buildSplitBudgetRows, isExcludedFromBudget, toBudgetEmployees, type BudgetRow } from './budgetReport';
import { ENGINEERING_TEMPLATE_ROSTER } from './engineeringRoster';
import { downloadSplitBudgetReport } from './exportBudgetReport';
import { bookShiftAverages, parseShiftBook } from './parseShiftBook';
import type { OTRecord } from './types';

const hrs = (n: number | null) => (n == null ? '—' : `${n.toFixed(0)}`);

const STATUS_TONE = { OK: 'success', Incomplete: 'warning', Missing: 'danger', 'Non-NEC': 'neutral', Unclassified: 'warning' } as const;

const COLUMNS: Column<BudgetRow>[] = [
  {
    id: 'employee', header: 'Employee', sortable: false,
    cell: r => (
      <div className="min-w-0">
        <p className="font-medium text-ink">{r.firstName} {r.surname}</p>
        <p className="text-caption text-ink-muted">{r.employeeId} · {r.occupation} · {r.costCentre || r.department}</p>
      </div>
    ),
  },
  { id: 'ot15shift', header: 'OT @ 1.5 Shift', numeric: true, cell: r => <span className="tabular">{r.ot15Shift == null ? '—' : r.ot15Shift.toFixed(0)}</span> },
  { id: 'ot15adhoc', header: 'OT @ 1.5 Adhoc', numeric: true, cell: r => <span className="tabular">{r.ot15Adhoc.toFixed(0)}</span> },
  { id: 'ot20shift', header: 'OT @ 2.0 Shift', numeric: true, cell: r => <span className="tabular">{r.ot20Shift.toFixed(0)}</span> },
  {
    id: 'status', header: 'Status',
    cell: r => (r.status === 'OK' ? <span className="text-ink-muted">—</span> : <StatusBadge tone={STATUS_TONE[r.status]}>{r.status}</StatusBadge>),
  },
];

interface ShiftBook {
  fileName: string;
  monthsUsed: string[];
  avg: Map<string, number>;
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const monthLabel = (key: string): string => {
  const m = /^(\d{4})-(\d{2})$/.exec(key);
  if (!m) return key;
  return `${MONTH_NAMES[Number(m[2]) - 1]} ${m[1]}`;
};

export function BudgetView({ records, register, otLoaded }: { records: OTRecord[]; register: EmployeeLookup[]; otLoaded: boolean }) {
  const [book, setBook] = useState<ShiftBook | null>(null);
  const [bookError, setBookError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [serverMiss, setServerMiss] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const fb = useActionFeedback(EXPORT_CHECK_MS);

  const employees = useMemo(() => toBudgetEmployees(register), [register]);

  // The book lives on this machine, so the tab reads it straight from the
  // server — no upload needed. Upload stays as the fallback for anywhere else.
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const res = await fetch('/api/budget-shift-book');
        if (!res.ok) throw new Error(await res.text());
        const json = (await res.json()) as { fileName: string; monthsUsed: string[]; averages: { code: string; value: number }[] };
        if (!live) return;
        setBook({ fileName: json.fileName, monthsUsed: json.monthsUsed, avg: new Map(json.averages.map(a => [a.code, a.value])) });
      } catch {
        if (live) setServerMiss(true);
      }
    })();
    return () => { live = false; };
  }, []);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setParsing(true);
    setBookError(null);
    try {
      const buf = await file.arrayBuffer();
      const parsed = await parseShiftBook(buf);
      if (parsed.monthsUsed.length === 0) {
        throw new Error('No monthly NEC sheets (e.g. “NEC June 2026”) found in that book.');
      }
      setBook({ fileName: file.name, monthsUsed: parsed.monthsUsed, avg: bookShiftAverages(parsed) });
      toast.success(`Shift book loaded — ${parsed.monthsUsed.map(monthLabel).join(', ')}.`);
    } catch (e) {
      setBook(null);
      setBookError(e instanceof Error ? e.message : 'That file could not be read as a monthly shift book.');
    } finally {
      setParsing(false);
    }
  };

  useEffect(() => {
    if (bookError) toast.error(bookError);
  }, [bookError]);

  // The roster is exactly the template ENGINEERING sheet: live register data
  // enriches each row where the employee number matches.
  const engEmployees = useMemo(() => buildEngineeringRoster(employees, ENGINEERING_TEMPLATE_ROSTER), [employees]);

  const computed = useMemo(() => {
    if (!otLoaded) return null;
    const adhoc = adhocTotals(records, employees);
    const rows = buildSplitBudgetRows(engEmployees, book?.avg ?? new Map(), adhoc.byKey, adhoc.causeByKey);
    return { rows, totals: budgetTotals(rows), orphanCount: adhoc.orphanCount, orphanHours: adhoc.orphanHours };
  }, [otLoaded, employees, engEmployees, book, records]);

  const download = () => fb.run(async () => {
    if (!computed) throw new Error('nothing to download yet');
    try { await downloadSplitBudgetReport(computed.rows); toast.success('Overtime Budget downloaded.'); }
    catch (e) { toast.error(`The download failed: ${(e as Error).message}`); throw e; }
  });

  const ready = otLoaded && !!computed;
  const shown = computed?.rows ?? [];
  const incomplete = shown.filter(r => r.status === 'Incomplete').length;
  const missing = shown.filter(r => r.status === 'Missing').length;
  const unclassified = shown.filter(r => r.status === 'Unclassified').length;
  const excluded = engEmployees.filter(isExcludedFromBudget).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="max-w-3xl">
          <h2 className="font-sans text-heading-sm font-semibold text-ink">Overtime Budget — Engineering</h2>
          <p className="mt-1 font-sans text-body-sm text-ink-muted">
            Forecast monthly overtime for the ENGINEERING sheet of the FY2027 split-budget workbook,
            in whole hours with no comments. OT @ 1.5 Shift is read automatically from the monthly
            NEC timesheet book on this machine (TOTAL HRS minus T/M Hours per month, averaged over
            the months each employee appears in). OT @ 2.0 Shift covers holiday and off-day working,
            and OT @ 1.5 Adhoc every other overtime hour — both averaged from Overtime-module
            records for July to September 2026 (total ÷ 3). Graduate trainees, engineers, managers,
            foremen and Takudzwa Chibi are left off entirely.
            {computed && ` Covering the ${engEmployees.length} people on the sheet (${shown.length} shown after exclusions); the download matches the sheet order for direct copy-paste.`}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              ref={fileRef} type="file" accept=".xlsx" className="hidden"
              aria-label="Upload monthly NEC timesheet book"
              onChange={e => { void onFile(e.target.files?.[0]); e.target.value = ''; }}
            />
            {parsing ? (
              <span className="font-sans text-body-sm text-ink-muted">Reading shift book…</span>
            ) : book ? (
              <span className="font-sans text-body-sm text-ink-muted">
                Shift book: {book.fileName} — {book.monthsUsed.map(monthLabel).join(', ')}.
              </span>
            ) : (
              <span className="font-sans text-body-sm text-ink-muted">Reading the shift book from this machine…</span>
            )}
            {(serverMiss || bookError) && !book && (
              <Button size="sm" variant="secondary" disabled={parsing} onClick={() => fileRef.current?.click()}>
                Upload shift book instead
              </Button>
            )}
          </div>
        </div>
        {ready && <ExportButton label="Download Excel" onPress={download} pending={fb.pending} success={fb.success} />}
      </div>

      {!otLoaded ? (
        <LoadingPulse compact label="Loading budget data" />
      ) : !computed ? (
        <Notice tone="danger" title="The budget data could not be loaded">
          <p className="font-sans text-body-sm">The overtime records could not be loaded; see the Records tab.</p>
        </Notice>
      ) : shown.length === 0 ? (
        <EmptyState icon="employees" title="No Engineering employees on the register" description="Add employees in Personnel before forecasting the overtime budget." />
      ) : (
        <>
          {!book && serverMiss && (
            <Notice tone="info" title="Shift book not found on this machine">
              <p className="font-sans text-body-sm">The monthly NEC timesheet book could not be read here — upload it with the button above to fill OT @ 1.5 Shift. The Adhoc columns already use live overtime records.</p>
            </Notice>
          )}
          <MetricGrid compact>
            <MetricTile compact label="Engineering employees" value={shown.length} />
            <MetricTile compact label="OT @ 1.5 Shift" value={`${hrs(computed.totals.total15Shift)}`} detail="Sum of shift averages" />
            <MetricTile compact label="OT @ 1.5 Adhoc" value={`${hrs(computed.totals.total15Adhoc)}`} detail="Sum of Adhoc averages" />
            <MetricTile compact label="OT @ 2.0 Shift" value={`${hrs(computed.totals.total20Shift)}`} detail="Sum of 2.0 averages" />
          </MetricGrid>

          {(incomplete > 0 || missing > 0 || unclassified > 0 || excluded > 0 || computed.orphanCount > 0) && (
            <Notice tone={missing > 0 ? 'warning' : 'info'} title="Data quality">
              <p className="font-sans text-body-sm">
                {[
                  incomplete > 0 ? `${incomplete} incomplete book ${incomplete === 1 ? 'record' : 'records'}` : '',
                  missing > 0 ? `${missing} without monthly-book data (shift blank)` : '',
                  unclassified > 0 ? `${unclassified} without an employment type in Personnel` : '',
                  excluded > 0 ? `${excluded} left off (trainees, engineers, managers, foremen, named exclusion)` : '',
                  computed.orphanCount > 0 ? `${computed.orphanCount} overtime ${computed.orphanCount === 1 ? 'record' : 'records'} for people outside the register (${computed.orphanHours}h, excluded from rows)` : '',
                ].filter(Boolean).join(' · ')}.
              </p>
            </Notice>
          )}

          <DataTable caption="Overtime Budget forecast — Engineering" rows={shown} columns={COLUMNS} getRowId={r => r.employeeId} stillKey={shown.length} />
        </>
      )}
    </div>
  );
}
