// FILE: app/overtime/page.tsx
'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback, ElementType } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppShell } from '@/components/app-shell';
import { PredictiveInput } from '@/components/shared/PredictiveInput';
import { PillTabs, type PillTab } from '@/components/shared/PillTabs';
import { UnderlineTabs, type UnderlineTab } from '@/components/shared/UnderlineTabs';
import {
  Clock4, Plus, Search, RefreshCw, CheckCircle2, XCircle,
  FileText, Eye, Trash2, Edit, LayoutGrid, List, AlertCircle, AlertTriangle,
  Sun, Moon, Briefcase, Calendar, X, User, Download, CalendarRange,
  Wrench, UsersRound, TrendingUp, TrendingDown, Lightbulb,
  Wallet, Gauge, Brain, PieChart, Layers, ChevronDown, ChevronUp, ChevronRight,
} from '@/components/shared/theme';
import {
  useTheme, PageHero, StatTile, StatusBadge, SearchInput, ProgressBar, FormField, FormActions,
  useCollapseSection, CenterModal, ACCENT_HEX, ACCENT, type Accent, EmptyState, PrimaryButton, GlowCard, SelectField, accentText,
  CountUp, PulsingIcon, TYPE_SCALE, staggerContainer, fadeUp, HintText, TYPE_WEIGHT,
} from '@/components/shared/theme';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ApprovalGate, type SignatureResult } from '@/components/shared/ApprovalGate';
import { useEmployees, type EmployeeLookup } from '@/hooks/useLookups';
import { EmployeeAutocomplete } from '@/components/shared/EmployeeAutocomplete';
import { EmployeeMultiPicker, type PickedEmployee } from '@/components/shared/EmployeeMultiPicker';
import { SpareAutocomplete } from '@/components/shared/SpareAutocomplete';
import { formatDate } from '@/lib/format';
import { formatCurrencyShort } from '@/components/shared/utils';
import { DownloadButton, type DLColumn } from '@/components/shared/DownloadButton';
import { exportFilename, EXPORT_BRAND_ARGB } from '@/lib/exportUtils';
import { toast } from 'sonner';
import {
  BarChart, Bar, AreaChart, Area, PieChart as RePieChart, Pie, Legend,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { OT_TYPES, SELECTABLE_OT_TYPES, STATUSES, type OTType, type OTStatus, type OTRecord, type OTForm, type SpareUsedEntry, type PlanningStatus, type PayoutMethod } from './types';
import { useOvertimeData, buildOvertimePayload, createOT, updateOT, deleteOT, postOvertimeAnalysis } from './useOvertimeData';
import { calcHours, mondayOf, toISODate, addDays, buildWeeklyRows, cleanReasonText } from './calcOvertime';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<OTType, string> = { regular: 'Regular', weekend: 'Weekend', emergency: 'Emergency', project: 'Project', holiday: 'Holiday', night: 'Night Shift' };
const TYPE_ICONS: Record<OTType, ElementType> = { regular: Clock4, weekend: Calendar, emergency: AlertCircle, project: Briefcase, holiday: Sun, night: Moon };
const TYPE_HEX: Record<OTType, string> = { regular: ACCENT_HEX.blue, weekend: '#a78bfa', emergency: '#f87171', project: '#34d399', holiday: '#fbbf24', night: '#818cf8' };

const STATUS_HEX: Record<OTStatus, string> = {
  pending: '#fbbf24', approved: '#34d399', rejected: '#f87171', paid: ACCENT_HEX.blue, cancelled: '#94a3b8',
};

// Scheduled/rostered in advance vs. came up reactively — orthogonal to overtime_type
// and status. Absent on a record means unclassified (legacy, pre-dates this field) —
// deliberately not defaulted to either value; see PlanningBadge below.
const PLANNING_LABELS: Record<PlanningStatus, string> = { planned: 'Planned', unplanned: 'Unplanned' };
const PLANNING_ICONS: Record<PlanningStatus, ElementType> = { planned: Calendar, unplanned: AlertCircle };
const PLANNING_HEX: Record<PlanningStatus, string> = { planned: '#34d399', unplanned: '#f59e0b' };

// Whether this OT will be paid out or was compensated with time off instead — see
// PayoutMethod's doc comment in types.ts. #0891b2 matches the Leaves module's own
// "Leave in Lieu of Overtime" color, so the same concept reads consistently across
// both modules.
const PAYOUT_LABELS: Record<PayoutMethod, string> = { cash: 'To Be Paid', lieu: 'Taken as Leave (Lieu)' };
const PAYOUT_ICONS: Record<PayoutMethod, ElementType> = { cash: Wallet, lieu: Clock4 };
const PAYOUT_HEX: Record<PayoutMethod, string> = { cash: '#34d399', lieu: '#0891b2' };

// ─── TYPES ────────────────────────────────────────────────────────────────────

function nowLocal(): string {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString();
}

const fmtDate = (v?: string): string => (v ? formatDate(v) : '');

function blankForm(): OTForm {
  return {
    employee_name: '', employee_id: '', position: '', department: '',
    overtime_type: 'regular',
    // New entries always get a real value — 'planned' is the default; 'unplanned'
    // is a deliberate switch for overtime that came up reactively.
    planning_status: 'planned',
    // 'cash' is the default — most overtime is paid; 'lieu' is a deliberate switch
    // for overtime that will be compensated with time off instead.
    payout_method: 'cash',
    date: nowLocal().slice(0, 10),
    start_time: '17:00', end_time: '20:00', hours: '',
    reason: '', contact_number: '', notes: '',
  };
}

// ─── SMALL COMPONENTS ─────────────────────────────────────────────────────────

// Defensive fallback for a type value outside the 6 known OTType keys (legacy/
// malformed data) — TYPE_ICONS[type] used to be looked up with no guard, so an
// unrecognized value made Icon undefined and crashed the whole page with "Element
// type is invalid" (found live during the 2026-08-29 UI audit, mocked-data
// triggered but a real, unguarded code path — audit/07-ui-polish-findings.md).
function TypeBadge({ type }: { type: OTType }) {
  const Icon = TYPE_ICONS[type] ?? Clock4;
  const hex = TYPE_HEX[type] ?? '#94a3b8';
  const label = TYPE_LABELS[type] ?? String(type);
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ${TYPE_WEIGHT.semibold}`} style={{ backgroundColor: `${hex}22`, color: hex }}>
      <Icon className="h-2.5 w-2.5" />{label}
    </span>
  );
}

// Renders nothing for an unclassified record (null/undefined) — absence is signal
// enough; a third "Unclassified" badge everywhere would just be visual noise.
function PlanningBadge({ status }: { status?: PlanningStatus | null }) {
  if (!status) return null;
  // Same defensive-fallback fix as TypeBadge above — an unrecognized status value
  // made Icon undefined and crashed the page.
  const Icon = PLANNING_ICONS[status] ?? Calendar;
  const hex = PLANNING_HEX[status] ?? '#94a3b8';
  const label = PLANNING_LABELS[status] ?? String(status);
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ${TYPE_WEIGHT.semibold}`} style={{ backgroundColor: `${hex}22`, color: hex }}>
      <Icon className="h-2.5 w-2.5" />{label}
    </span>
  );
}

// Only ever renders for 'lieu' — the exception worth flagging ("this one's not
// getting paid"). 'cash' is the unremarkable default and unclassified has nothing
// to say, so both render nothing, same reasoning as PlanningBadge above.
function PayoutBadge({ method }: { method?: PayoutMethod | null }) {
  if (method !== 'lieu') return null;
  const Icon = PAYOUT_ICONS.lieu;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ${TYPE_WEIGHT.semibold}`} style={{ backgroundColor: `${PAYOUT_HEX.lieu}22`, color: PAYOUT_HEX.lieu }}>
      <Icon className="h-2.5 w-2.5" />{PAYOUT_LABELS.lieu}
    </span>
  );
}

// Person identity marker — a bare accent person icon (matches the app-wide
// convention; replaced the old initials-in-a-circle avatar). `name` kept in the
// signature only for call-site compatibility.
function Avatar({ size = 'sm' }: { name?: string; size?: 'sm' | 'lg' }) {
  const dims = size === 'lg' ? 'h-7 w-7' : 'h-5 w-5';
  return <User className={`${dims} text-brand-400 shrink-0`} />;
}

// Employee autocomplete now lives in components/shared/EmployeeAutocomplete.tsx
// (imported above) — used to be a local, mouse-only implementation here with no
// keyboard support at all; the shared component (built on the design system's
// Combobox) gets Tab/Enter/Arrow selection for free, matching every other module.

// ─── FORM MODAL ───────────────────────────────────────────────────────────────

function OTFormModal({ open, onClose, onSave, editing, records }: {
  open: boolean; onClose: () => void;
  onSave: (data: Record<string, unknown>, id?: number | string) => Promise<void>;
  editing: OTRecord | null;
  records: OTRecord[];
}) {
  const t = useTheme();
  const [form, setForm] = useState<OTForm>(blankForm());
  const [saving, setSaving] = useState(false);
  // The "pressed for time" fast path: hours entered directly instead of start/end times.
  const [useHours, setUseHours] = useState(false);
  // Spares Used — a reference/cost log only (see SpareUsedEntry doc comment), managed
  // outside `form` since OTForm is otherwise all flat strings and this is a list.
  const [spares, setSpares] = useState<SpareUsedEntry[]>([]);
  const [spareDraft, setSpareDraft] = useState({ name: '', part_number: '', quantity: '1', unit_price: '0' });

  // Same person, same date, same time slot already has an active request —
  // flag it, don't block: stacked entries (e.g. a standby callout after the
  // normal shift) are a real, legitimate scenario, just not this exact one.
  const duplicate = useMemo(() => {
    if (useHours || !form.employee_id || !form.date || !form.start_time) return undefined;
    return records.find(r =>
      r.id !== editing?.id &&
      r.employee_id === form.employee_id &&
      r.date === form.date &&
      r.start_time === form.start_time &&
      r.status !== 'rejected' && r.status !== 'cancelled'
    );
  }, [records, editing, useHours, form.employee_id, form.date, form.start_time]);

  useEffect(() => {
    if (open) {
      setForm(editing ? {
        employee_name: editing.employee_name, employee_id: editing.employee_id, position: editing.position,
        department: editing.department || '', overtime_type: editing.overtime_type,
        // Preserve 'unclassified' (null) as a real, sticky state on an existing legacy
        // record — must NOT default to 'unplanned'/'cash' here, or saving an unrelated
        // edit (e.g. fixing a typo in reason) would silently stamp a guessed value on it.
        planning_status: editing.planning_status ?? null,
        payout_method: editing.payout_method ?? null,
        date: editing.date,
        start_time: editing.start_time || '17:00', end_time: editing.end_time || '20:00',
        hours: editing.hours != null ? String(editing.hours) : '',
        reason: editing.reason || '', contact_number: editing.contact_number || '', notes: editing.notes || '',
      } : blankForm());
      // An existing record with no recorded start/end but a stored hours value was
      // entered via the fast path — reopen it the same way.
      setUseHours(!!editing && !editing.start_time && editing.hours != null);
      setSpares(editing?.spares_used || []);
      setSpareDraft({ name: '', part_number: '', quantity: '1', unit_price: '0' });
    }
  }, [open, editing]);

  const addSpare = () => {
    const name = spareDraft.name.trim();
    if (!name) return;
    const quantity = parseFloat(spareDraft.quantity) || 1;
    const unit_price = parseFloat(spareDraft.unit_price) || 0;
    setSpares(prev => [...prev, { name, part_number: spareDraft.part_number.trim() || undefined, quantity, unit_price, total_cost: quantity * unit_price }]);
    setSpareDraft({ name: '', part_number: '', quantity: '1', unit_price: '0' });
  };
  const removeSpare = (idx: number) => setSpares(prev => prev.filter((_, i) => i !== idx));

  const set = (k: keyof OTForm, v: string) => setForm(f => ({ ...f, [k]: v }));
  const hours = useHours ? (parseFloat(form.hours) || 0) : calcHours(form.start_time, form.end_time);
  const inputCls = `w-full h-9 rounded-lg px-3 text-sm outline-none transition-colors ${t.inputBg}`;

  // "Unclassified" is no longer a selectable tab (removed 2026-08-30, per request) —
  // only Planned/Unplanned and To Be Paid/Taken as Leave are choosable now. A legacy
  // record whose planning_status/payout_method is still null (predates these fields)
  // shows neither tab active rather than guessing one on the user's behalf: `value`
  // below still falls back to the 'unclassified' sentinel, which no longer matches
  // any tab's key, so Radix's Tabs.Root just renders with nothing highlighted — the
  // same "don't silently stamp a guessed value" safety this used to get from the
  // now-removed third tab, still intact, just without the visible pill for it.
  const planningTabs: PillTab<PlanningStatus | 'unclassified'>[] = [
    { key: 'planned', label: 'Planned', icon: Calendar },
    { key: 'unplanned', label: 'Unplanned', icon: AlertCircle },
  ];

  const payoutTabs: PillTab<PayoutMethod | 'unclassified'>[] = [
    { key: 'cash', label: 'To Be Paid', icon: Wallet },
    { key: 'lieu', label: 'Taken as Leave', icon: Clock4 },
  ];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employee_name || !form.date) { toast.error('Employee and date are required'); return; }
    if (useHours ? !(parseFloat(form.hours) > 0) : !(form.start_time && form.end_time)) {
      toast.error(useHours ? 'Enter the number of hours' : 'Start and end time are required');
      return;
    }
    setSaving(true);
    try { await onSave({ ...buildOvertimePayload(form, useHours), spares_used: spares }, editing?.id); onClose(); }
    catch (err) { toast.error((err as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <CenterModal open={open} onClose={onClose} title={editing ? 'Edit Overtime Request' : 'New Overtime Request'} accent="violet" width="max-w-xl">
      <form onSubmit={handleSave} className="p-5 space-y-4">
        <FormField label="Employee" required>
          <EmployeeAutocomplete
            value={form.employee_name}
            disabled={!!editing}
            onChange={name => setForm(f => ({ ...f, employee_name: name }))}
            onSelect={emp => setForm(f => ({
              ...f,
              employee_id: emp.employee_id || f.employee_id,
              position: emp.designation || f.position,
              department: emp.department || f.department,
              contact_number: emp.phone || f.contact_number,
            }))}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Employee ID"><input className={inputCls} value={form.employee_id} onChange={e => set('employee_id', e.target.value)} placeholder="e.g. C1165" /></FormField>
          <FormField label="Position"><input className={inputCls} value={form.position} onChange={e => set('position', e.target.value)} placeholder="Job title" /></FormField>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Overtime Type" required>
            <SelectField size="form" value={form.overtime_type} title="Overtime type" onChange={v => set('overtime_type', v as OTType)}
              options={SELECTABLE_OT_TYPES.map(ty => ({ value: ty, label: TYPE_LABELS[ty] }))} />
          </FormField>
          <FormField label="Date" required><input type="date" className={inputCls} value={form.date} onChange={e => set('date', e.target.value)} /></FormField>
        </div>

        <FormField label="Planned or Unplanned?" required>
          <PillTabs<PlanningStatus | 'unclassified'>
            tabs={planningTabs}
            value={form.planning_status ?? 'unclassified'}
            onChange={v => setForm(f => ({ ...f, planning_status: v === 'unclassified' ? null : v }))}
          />
        </FormField>

        <FormField label="Payout" required>
          <PillTabs<PayoutMethod | 'unclassified'>
            tabs={payoutTabs}
            value={form.payout_method ?? 'unclassified'}
            onChange={v => setForm(f => ({ ...f, payout_method: v === 'unclassified' ? null : v }))}
          />
        </FormField>

        <label className="flex items-center gap-2 text-xs cursor-pointer select-none" title="Skip exact times and just enter the hours worked">
          <input type="checkbox" checked={useHours} onChange={e => setUseHours(e.target.checked)} className="accent-brand-500" />
          <span className={t.textMuted}>Pressed for time — just enter hours</span>
        </label>

        {useHours ? (
          <FormField label="Hours" required>
            <input type="number" min={0.5} max={24} step={0.5} className={inputCls} value={form.hours}
              onChange={e => set('hours', e.target.value)} placeholder="e.g. 3.5" />
          </FormField>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Start Time" required><input type="time" className={inputCls} value={form.start_time} onChange={e => set('start_time', e.target.value)} /></FormField>
            <FormField label="End Time" required><input type="time" className={inputCls} value={form.end_time} onChange={e => set('end_time', e.target.value)} /></FormField>
            <FormField label="Duration"><div className={`${inputCls} flex items-center text-brand-400 ${TYPE_WEIGHT.semibold} pointer-events-none`}>{hours > 0 ? `${hours.toFixed(1)}h` : '—'}</div></FormField>
          </div>
        )}

        {duplicate && (
          <div className="flex items-start gap-2.5 rounded-xl px-3.5 py-3 bg-amber-500/10 border border-amber-500/30">
            <AlertTriangle className={`h-4 w-4 ${accentText('amber', t.light)} shrink-0 mt-0.5`} />
            <div className="min-w-0 flex-1">
              <p className={`text-xs ${TYPE_WEIGHT.semibold} text-amber-500`}>Already has a request for this exact slot</p>
              <p className={`text-xs mt-0.5 ${t.textMuted}`}>
                {duplicate.employee_name} · {formatDate(duplicate.date)} · {duplicate.start_time}–{duplicate.end_time}
                {duplicate.hours != null && ` (${duplicate.hours}h)`}
              </p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <StatusBadge color={STATUS_HEX[duplicate.status]} label={duplicate.status} />
                {duplicate.reason && <span className={`text-[11px] truncate ${t.textFaint}`}>{duplicate.reason}</span>}
              </div>
            </div>
          </div>
        )}

        <FormField label="Reason">
          <PredictiveInput historyKey="overtime_reason" multiline rows={3}
            value={form.reason} onChange={v => set('reason', v)} placeholder="Reason for overtime (optional)..."
            inputClassName={`text-sm ${t.inputBg}`} />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Contact Number"><input className={inputCls} value={form.contact_number} onChange={e => set('contact_number', e.target.value)} placeholder="+263 77 ..." /></FormField>
          <FormField label="Notes"><input className={inputCls} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional notes..." /></FormField>
        </div>

        <FormField label="Spares Used (optional)">
          <div className={`${t.chipBg} rounded-xl p-3 space-y-2`}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="sm:col-span-2">
                <SpareAutocomplete
                  value={spareDraft.name}
                  onChange={v => setSpareDraft(s => ({ ...s, name: v }))}
                  onSelect={item => setSpareDraft(s => ({
                    ...s, name: item.description || s.name, part_number: item.stock_code || s.part_number,
                    unit_price: item.unit_price != null ? String(item.unit_price) : s.unit_price,
                  }))}
                  placeholder="Search spares register or type manually…"
                />
              </div>
              <input type="number" min={1} step={1} className={inputCls} placeholder="Quantity" value={spareDraft.quantity} onChange={e => setSpareDraft(s => ({ ...s, quantity: e.target.value }))} />
              <input type="number" min={0} step={0.01} className={inputCls} placeholder="Unit Price" value={spareDraft.unit_price} onChange={e => setSpareDraft(s => ({ ...s, unit_price: e.target.value }))} />
            </div>
            <button type="button" onClick={addSpare} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs ${TYPE_WEIGHT.semibold} bg-brand-500/15 text-brand-400 hover:bg-brand-500/25 transition-all`}>
              <Plus className="h-3.5 w-3.5" /> Add Spare
            </button>
            {spares.length > 0 && (
              <div className="space-y-1.5 pt-1">
                {spares.map((s, i) => (
                  <div key={i} className={`flex justify-between items-center ${t.inputBg} rounded-lg px-3 py-2 text-sm`}>
                    <div>
                      <span className={`${TYPE_WEIGHT.medium} ${t.textMuted}`}>{s.name}</span>
                      {s.part_number && <span className={`ml-2 text-xs ${t.textFaint}`}>({s.part_number})</span>}
                      <span className={`ml-2 text-xs ${t.textFaint}`}>{s.quantity} × R{(s.unit_price || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`${accentText('emerald', t.light)} ${TYPE_WEIGHT.semibold}`}>R{(s.total_cost || 0).toFixed(2)}</span>
                      <button type="button" title="Remove spare" onClick={() => removeSpare(i)} className="h-6 w-6 flex items-center justify-center rounded text-rose-500/60 hover:text-rose-500"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </FormField>

        <FormActions onCancel={onClose} submitting={saving} submitLabel={editing ? 'Update' : 'Submit'} accent="violet" />
      </form>
    </CenterModal>
  );
}

// ─── DETAIL MODAL ─────────────────────────────────────────────────────────────

function OTDetailModal({ record, onClose, onEdit, onApprove, onReject }: {
  record: OTRecord; onClose: () => void; onEdit: () => void; onApprove: () => void; onReject: () => void;
}) {
  const t = useTheme();
  const hours = record.hours ?? calcHours(record.start_time, record.end_time);
  const rows = [
    { l: 'Employee', v: record.employee_name },
    { l: 'Employee ID', v: record.employee_id },
    { l: 'Position', v: record.position },
    { l: 'Department', v: record.department },
    { l: 'Date', v: fmtDate(record.date) },
    { l: 'Time', v: record.start_time && record.end_time ? `${record.start_time} – ${record.end_time}` : undefined },
    { l: 'Duration', v: hours > 0 ? `${hours.toFixed(1)} hours` : '—' },
    { l: 'Applied', v: fmtDate(record.created_at) },
    { l: 'Contact', v: record.contact_number },
    { l: 'Notes', v: record.notes },
  ].filter(r => r.v);

  return (
    <CenterModal open onClose={onClose} title="Overtime Request Details" accent="violet" width="max-w-lg">
      <div className="p-5 space-y-3">
        <div className="flex items-center gap-3">
          <Avatar name={record.employee_name} size="lg" />
          <div>
            <p className={`${TYPE_WEIGHT.semibold} ${t.textPrimary}`}>{record.employee_name}</p>
            <p className={`text-xs ${t.textFaint}`}>{record.position} · {record.employee_id}</p>
          </div>
          <div className="ml-auto flex flex-col items-end gap-1">
            <StatusBadge color={STATUS_HEX[record.status]} label={record.status} />
            <TypeBadge type={record.overtime_type} />
            <PlanningBadge status={record.planning_status} />
            <PayoutBadge method={record.payout_method} />
          </div>
        </div>

        <div className={`${t.chipBg} rounded-xl px-4 py-3`}>
          <p className={`text-xs mb-1 ${t.textFaint}`}>Reason for overtime</p>
          <p className={`text-sm ${t.textMuted}`}>{record.reason}</p>
        </div>

        {!!record.spares_used?.length && (
          <div className={`${t.chipBg} rounded-xl px-4 py-3`}>
            <p className={`text-xs mb-1.5 ${t.textFaint}`}>Spares used</p>
            <div className="space-y-1">
              {record.spares_used.map((s, i) => (
                <div key={i} className="flex justify-between items-center text-xs">
                  <span className={t.textMuted}>{s.name}{s.part_number && ` (${s.part_number})`} · {s.quantity} × R{(s.unit_price || 0).toFixed(2)}</span>
                  <span className={`${TYPE_WEIGHT.semibold} ${accentText('emerald', t.light)}`}>R{(s.total_cost || 0).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          {rows.map(({ l, v }) => (
            <div key={l} className={`${t.chipBg} rounded-lg p-2.5`}>
              <p className={`text-[10px] mb-0.5 ${t.textFaint}`}>{l}</p>
              <p className={`text-xs ${TYPE_WEIGHT.medium} ${t.textMuted}`}>{v}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-2">
          {record.status === 'pending' && (
            <>
              <button type="button" onClick={onReject} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs ${TYPE_WEIGHT.semibold} bg-rose-500/15 hover:bg-rose-500/25 ${accentText('rose', t.light)} transition-colors`}><XCircle className="h-3.5 w-3.5" /> Reject</button>
              <button type="button" onClick={onApprove} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs ${TYPE_WEIGHT.semibold} bg-emerald-500/15 hover:bg-emerald-500/25 ${accentText('emerald', t.light)} transition-colors`}><CheckCircle2 className="h-3.5 w-3.5" /> Approve</button>
            </>
          )}
          <button type="button" onClick={onEdit} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs ${TYPE_WEIGHT.medium} ${t.chipBg} ${t.textMuted} ${t.hoverBg} transition-colors`}><Edit className="h-3.5 w-3.5" /> Edit</button>
          <div className="ml-auto" />
          <button type="button" onClick={onClose} className={`px-3 py-2 rounded-lg text-xs ${TYPE_WEIGHT.medium} ${t.chipBg} ${t.textMuted} ${t.hoverBg} transition-colors`}>Close</button>
        </div>
      </div>
    </CenterModal>
  );
}

// ─── EXPORT ───────────────────────────────────────────────────────────────────

const overtimeExportColumns: DLColumn[] = [
  { key: 'employee_name', label: 'Employee', width: 20 },
  { key: 'employee_id', label: 'ID', width: 20 },
  { key: 'position', label: 'Position', width: 20 },
  { key: 'overtime_type', label: 'Type', width: 20, format: v => TYPE_LABELS[v as OTType] },
  { key: 'date', label: 'Date', width: 20, format: v => fmtDate(v as string) },
  { key: 'start_time', label: 'Start', width: 20 },
  { key: 'end_time', label: 'End', width: 20 },
  { key: 'reason', label: 'Reason', width: 20 },
  { key: 'status', label: 'Status', width: 20 },
];

// Weekly-summary rollup (mondayOf/toISODate/addDays/buildWeeklyRows) and the
// similar-reason-grouping heuristic (cleanReasonText/groupSimilarReasons/etc.) live in
// ./calcOvertime.ts, imported above — extracted per the "extract + test business logic"
// standard (app/timesheets/calcTotals.ts precedent), tested in calcOvertime.test.ts.

// ─── ANALYZE (reads reason text + volume/trend, no external AI API) ───────────
// Manually triggered (not auto-fired on every filter tweak, matching how the SHEQ
// dashboard's own AI analysis works) — sends whatever is currently filtered, so
// re-running after changing a filter is just clicking the button again.

interface OTProblemArea { title: string; description: string; severity: 'critical' | 'high' | 'medium' | 'low'; }
interface OTTrend { metric: string; direction: 'worsening' | 'improving' | 'stable'; insight: string; older_hours: number; newer_hours: number; }
interface OTRecommendation { priority: 'immediate' | 'short_term' | 'long_term'; action: string; rationale: string; target: string; }
interface OTCategoryDetail {
  category: string; instances: number; hours: number; avg_hours: number; pct_of_total: number;
  top_weekday: string | null; top_employee: string | null; top_spare: string | null;
  records: { employee_name: string; date: string; hours: number; reason: string }[];
}
interface OTAnalysisResult {
  summary: string;
  // Observed facts — plain tallies for the current selection.
  total_hours: number;
  total_instances: number;
  employees_involved: number;
  sections_involved: number;
  avg_hours_per_instance: number;
  avg_hours_per_employee: number;
  double_time_pct: number;
  // Patterns — recurring/descriptive, still data not interpretation.
  top_reasons: { phrase: string; count: number; hours: number }[];
  category_detail: OTCategoryDetail[];
  top_machines: { name: string; count: number; hours: number }[];
  top_employees: { name: string; hours: number }[];
  top_sections: { section: string; hours: number }[];
  weekly_series: { week: string; hours: number }[];
  trend_direction: 'worsening' | 'improving' | 'stable';
  trends: OTTrend[];
  hour_weekday_hours: number[][];
  weekday_labels: string[];
  punch_records: Record<string, { employee_name: string; hours: number; reason: string; date: string }[]>;
  // Possible causes — interpretive hypotheses, not facts.
  possible_causes: OTProblemArea[];
  // Recommendations — practical actions to investigate.
  recommendations: OTRecommendation[];
  _records_analysed: number;
  generated_at: string;
}

const SEV_HEX: Record<string, string> = { critical: '#f43f5e', high: '#f97316', medium: '#f59e0b', low: '#94a3b8' };
const PRIORITY_HEX: Record<string, string> = { immediate: '#f43f5e', short_term: '#f59e0b', long_term: '#60a5fa' };
const PRIORITY_LABEL: Record<string, string> = { immediate: 'Immediate', short_term: 'Short Term', long_term: 'Long Term' };
const DIR_HEX: Record<string, string> = { worsening: '#f97316', improving: '#34d399', stable: '#94a3b8' };

/** Same visual recipe as the shared StatCard (GlowCard + icon/label/value), but with
 *  CountUp for the value — StatCard's `value` prop is typed string|number, so it can't
 *  host CountUp's JSX directly. */
function AnalyzeStat({ icon: Icon, accent, label, value, suffix = '', decimals = 0 }: {
  icon: ElementType; accent: Accent; label: string; value: number; suffix?: string; decimals?: number;
}) {
  const t = useTheme();
  const a = ACCENT[accent];
  return (
    <GlowCard color={ACCENT_HEX[accent]} className="p-3.5">
      <div className="flex items-center gap-1.5 mb-3">
        <Icon className={`h-3.5 w-3.5 shrink-0 ${a.icon}`} />
        <p className={`${t.textSecondary} ${TYPE_SCALE.label} ${TYPE_WEIGHT.medium} uppercase tracking-wide truncate`}>{label}</p>
      </div>
      <p className={`${TYPE_SCALE.statLarge} leading-none ${TYPE_WEIGHT.bold} ${t.textPrimary} tracking-tight tabular-nums`}>
        <CountUp value={value} suffix={suffix} duration={decimals ? 1.2 : 0.9} />
      </p>
    </GlowCard>
  );
}

type PunchRecord = { employee_name: string; hours: number; reason: string; date: string };

/** Punch-card heatmap — hour-of-day × weekday, weighted by hours (not just a count of
 *  starts) — answers "when does overtime happen most", dynamically over whatever's
 *  currently filtered (person/date-range/etc, since it comes from the same analyze
 *  call as everything else on this tab). Sequential single-hue intensity per the app's
 *  own color rule: magnitude gets one hue light→dark, never a rainbow. Records with no
 *  recorded start_time (the hours-only fast path) can't be placed on an hour axis and
 *  are simply not counted here.
 *
 *  Hover OR click a cell (click matters on touch, where hover doesn't fire) to pop the
 *  actual entries behind it into the panel below — a quick animated highlight on the
 *  cell itself plus a staggered reveal of who/why/how-long, not just a bare number. */
function OvertimeHeatmap({ grid, weekdayLabels, punchRecords }: { grid: number[][]; weekdayLabels: string[]; punchRecords: Record<string, PunchRecord[]> }) {
  const t = useTheme();
  const [selected, setSelected] = useState<{ hour: number; wd: number } | null>(null);
  const hasData = grid.some(row => row.some(v => v > 0));
  if (!hasData) return null;
  const max = Math.max(...grid.flat(), 1);
  const levelOf = (h: number) => h <= 0 ? 0 : h / max <= 0.25 ? 1 : h / max <= 0.5 ? 2 : h / max <= 0.75 ? 3 : 4;
  const LEVEL_BG = [t.chipBg, 'bg-brand-500/20', 'bg-brand-500/40', 'bg-brand-500/65', 'bg-brand-500/90'];
  // Hours with zero overtime across every weekday in this selection are dead columns —
  // drop them so the grid stays compact instead of mostly-empty for a night-shift-only
  // roster or a 9-to-5 one.
  const activeHours = Array.from({ length: 24 }, (_, h) => h).filter(h => grid[h].some(v => v > 0));

  const selectedKey = selected ? `${selected.hour}-${selected.wd}` : null;
  const selectedEntries = selectedKey ? (punchRecords[selectedKey] || []) : [];
  const selectedLabel = selected ? `${weekdayLabels[selected.wd]} ${String(selected.hour).padStart(2, '0')}:00` : null;
  const selectedTotal = selected ? grid[selected.hour][selected.wd] : 0;

  return (
    <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
      <div className={`flex items-center gap-2 px-5 py-3 border-b ${t.border}`}>
        <Calendar className="h-4 w-4 text-brand-400" />
        <span className={`${TYPE_WEIGHT.semibold} ${TYPE_SCALE.title} ${t.textPrimary}`}>When Overtime Happens</span>
        <HintText className="ml-auto">click a cell to see who worked overtime then</HintText>
      </div>
      <div className="p-4 overflow-x-auto">
        <div className="inline-block">
          <p className={`pl-9 ${TYPE_SCALE.caption} ${t.textFaint} mb-1`}>Hour of day</p>
          <div className="flex gap-[3px] pl-9">
            {activeHours.map(h => (
              <span key={h} className={`w-5 shrink-0 text-center ${TYPE_SCALE.caption} ${t.textFaint}`}>{h}</span>
            ))}
          </div>
          {weekdayLabels.map((day, wd) => (
            <div key={day} className="flex items-center gap-[3px] mt-[3px]">
              <span className={`w-8 shrink-0 ${TYPE_SCALE.caption} ${t.textFaint}`}>{day}</span>
              {activeHours.map((h, i) => {
                const hours = grid[h][wd];
                const isSelected = selected?.hour === h && selected?.wd === wd;
                const isPeak = hours > 0 && hours === max;
                return (
                  <motion.div
                    key={h}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.35, zIndex: 10 }}
                    whileTap={{ scale: 1.2 }}
                    transition={{ duration: 0.2, delay: Math.min((wd * activeHours.length + i) * 0.004, 0.6) }}
                    onClick={() => setSelected(isSelected ? null : { hour: h, wd })}
                    title={`${day} ${String(h).padStart(2, '0')}:00 — ${hours > 0 ? `${hours.toFixed(1)}h` : 'no overtime'}${isPeak ? ' (peak)' : ''} — click for detail`}
                    className={`h-5 w-5 rounded-[4px] shrink-0 ${LEVEL_BG[levelOf(hours)]} ${isSelected ? 'ring-2 ring-brand-400' : isPeak ? 'ring-1 ring-amber-400/80' : ''} cursor-pointer`}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 mt-3 pl-9">
          <div className="flex items-center gap-1.5">
            <span className={`${TYPE_SCALE.caption} ${t.textFaint}`}>Less</span>
            {LEVEL_BG.map((cls, i) => <div key={i} className={`h-3 w-3 rounded-[3px] ${cls}`} />)}
            <span className={`${TYPE_SCALE.caption} ${t.textFaint}`}>More</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-[3px] ring-1 ring-amber-400/80" />
            <span className={`${TYPE_SCALE.caption} ${t.textFaint}`}>Peak</span>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {selected && (
          <motion.div
            key={selectedKey}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className={`border-t ${t.border} p-4`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className={`${TYPE_SCALE.body} ${TYPE_WEIGHT.semibold} ${t.textPrimary}`}>{selectedLabel}</span>
              <StatusBadge color={ACCENT_HEX.violet} label={`${selectedTotal.toFixed(1)}h`} />
              {selectedEntries.length > 0 && <span className={`${TYPE_SCALE.caption} ${t.textFaint}`}>{selectedEntries.length} entr{selectedEntries.length !== 1 ? 'ies' : 'y'}</span>}
            </div>
            {selectedEntries.length === 0 ? (
              <p className={`${TYPE_SCALE.caption} ${t.textFaint}`}>No overtime started at this hour on this weekday in the current selection.</p>
            ) : (
              <motion.div initial="hidden" animate="show" variants={staggerContainer} className="space-y-1.5">
                {selectedEntries.map((e, i) => (
                  <motion.div key={i} variants={fadeUp} className={`flex items-center justify-between gap-3 ${t.chipBg} rounded-lg px-3 py-1.5`}>
                    <div className="min-w-0 flex-1">
                      <span className={`${TYPE_SCALE.caption} ${TYPE_WEIGHT.medium} ${t.textPrimary}`}>{e.employee_name}</span>
                      <span className={`${TYPE_SCALE.caption} ${t.textFaint} ml-2`}>{fmtDate(e.date)}</span>
                      {e.reason && <p className={`${TYPE_SCALE.caption} ${t.textFaint} truncate`}>{e.reason}</p>}
                    </div>
                    <span className={`${TYPE_SCALE.caption} ${TYPE_WEIGHT.semibold} shrink-0 ${accentText('violet', t.light)}`}>{e.hours}h</span>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── OVERTIME INSIGHTS (Overview / Analytics / Analysis) ──────────────────────
// Analytics sub-tab's charts are cheap client-side aggregations over `filtered`
// (instant, no round-trip — same pattern this tab always used). The Overview KPIs
// and Analysis report both come from one shared, debounced server-side analyze
// call so "regenerate on every filter change" doesn't mean "fetch on every
// keystroke": it fires ~500ms after `filtered` settles, with a non-blocking
// "Updating…" indicator plus a manual Refresh for an explicit re-run.

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
// "By section" reads the employee's section off the live roster keyed by
// employee_id — the OT record itself has no reliable section field. Casing is
// normalized (source data has "Electrical" vs "electrical " etc.) so the same
// real-world section always buckets together, matching app/employees/page.tsx's
// normalizeSection convention.
const KNOWN_SECTIONS = ['Mechanical', 'Electrical', 'Civil', 'Instrumentation'];
const SECTION_HEX: Record<string, string> = { Mechanical: ACCENT_HEX.blue, Electrical: '#fbbf24', Civil: '#34d399', Instrumentation: '#a78bfa', Unassigned: '#94a3b8' };
function normalizeOtSection(section?: string): string {
  const s = (section || '').trim();
  if (!s) return 'Unassigned';
  return KNOWN_SECTIONS.find(c => c.toLowerCase() === s.toLowerCase()) ?? s;
}

type InsightsSubTab = 'overview' | 'analytics' | 'patterns' | 'causes';

function OvertimeInsightsView({ filtered, employees, employeePicks, onToggleArtisan }: {
  filtered: OTRecord[]; employees: EmployeeLookup[]; employeePicks: PickedEmployee[]; onToggleArtisan: (employee_id: string, employee_name: string) => void;
}) {
  const t = useTheme();
  const [sub, setSub] = useState<InsightsSubTab>('overview');
  const [result, setResult] = useState<OTAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const loadedOnce = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runAnalyze = useCallback(async (recs: OTRecord[]) => {
    if (loadedOnce.current) setUpdating(true); else setLoading(true);
    setError('');
    try {
      const r = await postOvertimeAnalysis({ records: recs, period_label: 'current selection' });
      setResult(r as OTAnalysisResult);
      loadedOnce.current = true;
    } catch (e) { setError(e instanceof Error ? e.message : 'Analysis failed'); }
    finally { setLoading(false); setUpdating(false); }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { runAnalyze(filtered); }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered]);

  // ── Client-side tallies (instant, no round-trip) — shared by Overview & Analytics.
  // Read `filtered`, not `employees`-scoped `records` — otherwise a filter change
  // would visibly move the Records tab but leave these tiles/charts stuck on the
  // unfiltered set. ─────────────────────────────────────────────────────────────
  const empById = useMemo(() => new Map(employees.map(e => [e.employee_id, e])), [employees]);
  const byType = useMemo(() => OT_TYPES.map(ty => ({ type: TYPE_LABELS[ty], count: filtered.filter(r => r.overtime_type === ty).length })).filter(x => x.count > 0), [filtered]);
  const byStatus = useMemo(() => STATUSES.map(s => ({ status: s.charAt(0).toUpperCase() + s.slice(1), count: filtered.filter(r => r.status === s).length })).filter(x => x.count > 0), [filtered]);
  const bySection = useMemo(() => {
    const buckets: Record<string, { hours: number; count: number }> = {};
    filtered.forEach(r => {
      const key = normalizeOtSection(empById.get(r.employee_id)?.section);
      if (!buckets[key]) buckets[key] = { hours: 0, count: 0 };
      buckets[key].hours += r.hours ?? calcHours(r.start_time, r.end_time);
      buckets[key].count += 1;
    });
    return Object.entries(buckets).map(([section, v]) => ({ section, hours: Math.round(v.hours * 10) / 10, count: v.count })).filter(x => x.count > 0);
  }, [filtered, empById]);
  const byArtisan = useMemo(() => {
    const map = new Map<string, { employee_id: string; employee_name: string; position: string; hours: number; count: number }>();
    filtered.forEach(r => {
      const key = r.employee_id || r.employee_name;
      const h = r.hours ?? calcHours(r.start_time, r.end_time);
      const existing = map.get(key);
      if (existing) { existing.hours += h; existing.count += 1; }
      else map.set(key, { employee_id: r.employee_id, employee_name: r.employee_name, position: r.position, hours: h, count: 1 });
    });
    return [...map.values()].sort((a, b) => b.hours - a.hours).slice(0, 8).map(a => ({ ...a, hours: Math.round(a.hours * 10) / 10 }));
  }, [filtered]);
  const maxArtisanHours = Math.max(1, ...byArtisan.map(a => a.hours));
  const byWeekday = useMemo(() => {
    const buckets = WEEKDAY_LABELS.map(() => ({ hours: 0, count: 0 }));
    filtered.forEach(r => {
      if (!r.date) return;
      const dow = (new Date(`${r.date}T00:00:00`).getDay() + 6) % 7;
      buckets[dow].hours += r.hours ?? calcHours(r.start_time, r.end_time);
      buckets[dow].count += 1;
    });
    return WEEKDAY_LABELS.map((day, i) => ({ day, hours: Math.round(buckets[i].hours * 10) / 10, count: buckets[i].count }));
  }, [filtered]);
  const richStats = useMemo(() => {
    const uniqueEmployees = new Set(filtered.map(r => r.employee_id)).size;
    const filteredHrs = filtered.reduce((s, r) => s + (r.hours ?? calcHours(r.start_time, r.end_time)), 0);
    const avgHours = filtered.length > 0 ? filteredHrs / filtered.length : 0;
    const busiest = byWeekday.reduce((best, d) => d.hours > best.hours ? d : best, byWeekday[0] ?? { day: '—', hours: 0 });
    const spareCost = filtered.reduce((s, r) => s + (r.spares_used || []).reduce((ss, sp) => ss + (sp.total_cost ?? ((sp.unit_price ?? 0) * (sp.quantity ?? 0))), 0), 0);
    return { uniqueEmployees, avgHours: Math.round(avgHours * 10) / 10, busiestDay: busiest.hours > 0 ? busiest.day : '—', totalHrs: Math.round(filteredHrs * 10) / 10, spareCost: Math.round(spareCost) };
  }, [filtered, byWeekday]);

  const SUB_TABS: UnderlineTab<InsightsSubTab>[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'patterns', label: 'Patterns' },
    { id: 'causes', label: 'Causes & Actions' },
  ];

  return (
    <div className={`${t.glass} rounded-2xl overflow-hidden`}>
      <UnderlineTabs tabs={SUB_TABS} value={sub} onChange={setSub} accent="brand" />
      <div className="p-4">
        {sub === 'overview' ? (
          <OverviewSubTab filtered={filtered} richStats={richStats} byArtisan={byArtisan} maxArtisanHours={maxArtisanHours} result={result} loading={loading} updating={updating} employeePicks={employeePicks} onToggleArtisan={onToggleArtisan} />
        ) : sub === 'analytics' ? (
          <AnalyticsSubTab filtered={filtered} byType={byType} byStatus={byStatus} bySection={bySection} byArtisan={byArtisan} maxArtisanHours={maxArtisanHours} byWeekday={byWeekday} richStats={richStats} employeePicks={employeePicks} onToggleArtisan={onToggleArtisan} />
        ) : sub === 'patterns' ? (
          <PatternsSubTab records={filtered} result={result} loading={loading} updating={updating} error={error} onRefresh={() => runAnalyze(filtered)} />
        ) : (
          <CausesSubTab records={filtered} result={result} loading={loading} updating={updating} error={error} onRefresh={() => runAnalyze(filtered)} />
        )}
      </div>
    </div>
  );
}

/** Shared "click a name to filter" row — the same artisan bar-row is used by Overview's
 *  Top Employees and Analytics' Top Artisans lists, so clicking either one toggles the
 *  exact same `employeePicks` filter (one mechanism, two places it's surfaced). */
function ArtisanBarRow({ a, maxHours, active, onToggle }: {
  a: { employee_id: string; employee_name: string; position: string; hours: number };
  maxHours: number; active: boolean; onToggle: () => void;
}) {
  const t = useTheme();
  return (
    <button type="button" onClick={onToggle} title={`Click to ${active ? 'remove' : 'filter by'} ${a.employee_name}`}
      className={`w-full text-left rounded-lg px-2 -mx-2 py-1.5 transition-colors ${active ? 'bg-brand-500/10' : t.hoverBgSoft}`}>
      <div className="flex justify-between text-xs mb-1">
        <span className={`${TYPE_WEIGHT.medium} ${active ? accentText('violet', t.light) : t.textPrimary}`}>{a.employee_name}{a.position ? <span className={t.textFaint}> · {a.position}</span> : null}</span>
        <span className={`${TYPE_WEIGHT.semibold} ${t.textPrimary}`}>{a.hours}h</span>
      </div>
      <ProgressBar value={(a.hours / maxHours) * 100} color={active ? ACCENT_HEX.violet : ACCENT_HEX.blue} showValue={false} />
    </button>
  );
}

function OverviewSubTab({ filtered, richStats, byArtisan, maxArtisanHours, result, loading, updating, employeePicks, onToggleArtisan }: {
  filtered: OTRecord[];
  richStats: { uniqueEmployees: number; avgHours: number; busiestDay: string; totalHrs: number; spareCost: number };
  byArtisan: { employee_id: string; employee_name: string; position: string; hours: number; count: number }[];
  maxArtisanHours: number;
  result: OTAnalysisResult | null; loading: boolean; updating: boolean;
  employeePicks: PickedEmployee[]; onToggleArtisan: (employee_id: string, employee_name: string) => void;
}) {
  const t = useTheme();
  const axisColor = t.light ? 'rgba(15,23,42,0.4)' : 'rgba(255,255,255,0.4)';
  const gridColor = t.light ? 'rgba(15,23,42,0.06)' : 'rgba(255,255,255,0.06)';

  return (
    <motion.div initial="hidden" animate="show" variants={staggerContainer} className="space-y-4">
      <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <AnalyzeStat icon={Clock4} accent="violet" label="Total Hours" value={richStats.totalHrs} suffix="h" decimals={1} />
        <AnalyzeStat icon={FileText} accent="blue" label="Instances" value={filtered.length} />
        <AnalyzeStat icon={UsersRound} accent="indigo" label="Employees Involved" value={richStats.uniqueEmployees} />
        <AnalyzeStat icon={Gauge} accent="amber" label="Avg Hrs / Instance" value={richStats.avgHours} suffix="h" decimals={1} />
        <GlowCard color={ACCENT_HEX.cyan} className="p-3.5">
          <div className="flex items-center gap-1.5 mb-2"><TrendingUp className={`h-3.5 w-3.5 ${accentText('cyan', t.light)}`} /><span className={`${TYPE_SCALE.label} ${TYPE_WEIGHT.medium} uppercase tracking-wide ${t.textSecondary}`}>Busiest Day</span></div>
          <p className={`${TYPE_SCALE.statLarge} leading-none ${TYPE_WEIGHT.bold} ${t.textPrimary}`}>{richStats.busiestDay}</p>
        </GlowCard>
        <GlowCard color={ACCENT_HEX.emerald} className="p-3.5">
          <div className="flex items-center gap-1.5 mb-2"><Lightbulb className={`h-3.5 w-3.5 ${accentText('emerald', t.light)}`} /><span className={`${TYPE_SCALE.label} ${TYPE_WEIGHT.medium} uppercase tracking-wide ${t.textSecondary}`}>Most Common Reason</span></div>
          <p className={`${TYPE_SCALE.stat} leading-tight ${TYPE_WEIGHT.bold} ${t.textPrimary} truncate`} title={result?.top_reasons[0]?.phrase || undefined}>
            {loading && !result ? '…' : result?.top_reasons[0] ? `“${result.top_reasons[0].phrase}”` : '—'}
          </p>
        </GlowCard>
        <AnalyzeStat icon={Wrench} accent="violet" label="Machines Involved" value={result?.top_machines.length ?? 0} />
        <GlowCard color={ACCENT_HEX.blue} className="p-3.5">
          <div className="flex items-center gap-1.5 mb-2"><Wallet className={`h-3.5 w-3.5 ${accentText('blue', t.light)}`} /><span className={`${TYPE_SCALE.label} ${TYPE_WEIGHT.medium} uppercase tracking-wide ${t.textSecondary}`}>Spares Cost</span></div>
          <p className={`${TYPE_SCALE.statLarge} leading-none ${TYPE_WEIGHT.bold} ${t.textPrimary}`}>{formatCurrencyShort(richStats.spareCost)}</p>
        </GlowCard>
      </motion.div>

      {updating && <motion.p variants={fadeUp} className={`${TYPE_SCALE.caption} ${t.textFaint} flex items-center gap-1.5`}><RefreshCw className="h-3 w-3 animate-spin" /> Updating for the current filters…</motion.p>}

      <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
          <div className={`flex items-center gap-2 px-5 py-3 border-b ${t.border}`}><TrendingUp className="h-4 w-4 text-brand-400" /><span className={`${TYPE_WEIGHT.semibold} ${TYPE_SCALE.title} ${t.textPrimary}`}>Weekly Trend</span></div>
          <div className="p-4">
            {!result || result.weekly_series.length < 2 ? (
              <p className={`text-sm text-center py-14 ${t.textFaint}`}>{loading ? 'Loading…' : 'Not enough data for a trend yet'}</p>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={result.weekly_series}>
                  <defs>
                    <linearGradient id="otOverviewTrendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={ACCENT_HEX.blue} stopOpacity={0.45} />
                      <stop offset="95%" stopColor={ACCENT_HEX.blue} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="week" tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: t.light ? '#fff' : '#0f1e2e', border: `1px solid ${t.light ? 'rgba(15,23,42,0.1)' : 'rgba(134,187,216,0.2)'}`, borderRadius: 12, color: t.light ? '#0f172a' : '#fff', fontSize: 12 }} formatter={(v: number) => [`${v}h`, 'Hours']} />
                  <Area type="monotone" dataKey="hours" stroke={ACCENT_HEX.blue} strokeWidth={2} fill="url(#otOverviewTrendGrad)" animationDuration={700} animationEasing="ease-out" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
          <div className={`flex items-center gap-2 px-5 py-3 border-b ${t.border}`}><UsersRound className="h-4 w-4 text-brand-400" /><span className={`${TYPE_WEIGHT.semibold} ${TYPE_SCALE.title} ${t.textPrimary}`}>Top Employees by Hours</span><span className={`ml-auto ${TYPE_SCALE.caption} ${t.textFaint}`}>click a name to filter</span></div>
          <div className="p-4 space-y-1">
            {byArtisan.slice(0, 6).map(a => (
              <ArtisanBarRow key={a.employee_id || a.employee_name} a={a} maxHours={maxArtisanHours}
                active={employeePicks.some(p => p.employee_id === a.employee_id)}
                onToggle={() => onToggleArtisan(a.employee_id, a.employee_name)} />
            ))}
            {byArtisan.length === 0 && <p className={`text-sm text-center py-6 ${t.textFaint}`}>No data</p>}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function AnalyticsSubTab({ filtered, byType, byStatus, bySection, byArtisan, maxArtisanHours, byWeekday, richStats, employeePicks, onToggleArtisan }: {
  filtered: OTRecord[];
  byType: { type: string; count: number }[];
  byStatus: { status: string; count: number }[];
  bySection: { section: string; hours: number; count: number }[];
  byArtisan: { employee_id: string; employee_name: string; position: string; hours: number; count: number }[];
  maxArtisanHours: number;
  byWeekday: { day: string; hours: number; count: number }[];
  richStats: { uniqueEmployees: number; avgHours: number; busiestDay: string; totalHrs: number; spareCost: number };
  employeePicks: PickedEmployee[]; onToggleArtisan: (employee_id: string, employee_name: string) => void;
}) {
  const t = useTheme();
  const axisColor = t.light ? 'rgba(15,23,42,0.4)' : 'rgba(255,255,255,0.4)';
  const gridColor = t.light ? 'rgba(15,23,42,0.06)' : 'rgba(255,255,255,0.06)';
  const TYPE_BAR_COLORS = Object.values(TYPE_HEX);
  const STATUS_COLORS = byStatus.map(s => STATUS_HEX[s.status.toLowerCase() as OTStatus] ?? '#94a3b8');
  const typeTotal = byType.reduce((s, x) => s + x.count, 0);
  const statusTotal = byStatus.reduce((s, x) => s + x.count, 0);
  const tooltipStyle = { backgroundColor: t.light ? '#fff' : '#0f1e2e', border: `1px solid ${t.light ? 'rgba(15,23,42,0.1)' : 'rgba(134,187,216,0.2)'}`, borderRadius: 12, color: t.light ? '#0f172a' : '#fff', fontSize: 12 };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
          <div className={`flex items-center gap-2 px-5 py-3 border-b ${t.border}`}><PieChart className="h-4 w-4 text-brand-400" /><span className={`${TYPE_WEIGHT.semibold} ${TYPE_SCALE.title} ${t.textPrimary}`}>By Overtime Type</span><span className={`ml-auto ${TYPE_SCALE.caption} ${t.textFaint}`}>{typeTotal} total</span></div>
          <div className="p-4">
            {byType.length === 0 ? <p className={`text-sm text-center py-16 ${t.textFaint}`}>No data</p> : (
              <ResponsiveContainer width="100%" height={220}>
                <RePieChart>
                  <Pie data={byType} dataKey="count" nameKey="type" innerRadius={50} outerRadius={80} paddingAngle={2} animationDuration={700} animationEasing="ease-out">
                    {byType.map((_, i) => <Cell key={i} fill={TYPE_BAR_COLORS[i % TYPE_BAR_COLORS.length]} fillOpacity={0.85} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n: string) => [`${v} request${v !== 1 ? 's' : ''}`, n]} />
                  <Legend content={<DonutLegend />} />
                </RePieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
          <div className={`flex items-center gap-2 px-5 py-3 border-b ${t.border}`}><CheckCircle2 className="h-4 w-4 text-brand-400" /><span className={`${TYPE_WEIGHT.semibold} ${TYPE_SCALE.title} ${t.textPrimary}`}>By Status</span><span className={`ml-auto ${TYPE_SCALE.caption} ${t.textFaint}`}>{statusTotal} total</span></div>
          <div className="p-4">
            {byStatus.length === 0 ? <p className={`text-sm text-center py-16 ${t.textFaint}`}>No data</p> : (
              <ResponsiveContainer width="100%" height={220}>
                <RePieChart>
                  <Pie data={byStatus} dataKey="count" nameKey="status" innerRadius={50} outerRadius={80} paddingAngle={2} animationDuration={700} animationEasing="ease-out">
                    {byStatus.map((_, i) => <Cell key={i} fill={STATUS_COLORS[i]} fillOpacity={0.85} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n: string) => [`${v} request${v !== 1 ? 's' : ''}`, n]} />
                  <Legend content={<DonutLegend />} />
                </RePieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {STATUSES.map(s => {
          const count = filtered.filter(r => r.status === s).length;
          const hex = STATUS_HEX[s] ?? '#94a3b8';
          return (
            <GlowCard key={s} color={hex} className="p-3.5">
              <div className="flex items-center gap-1.5 mb-2">
                {s === 'approved' ? <CheckCircle2 className={`h-3.5 w-3.5 ${accentText('emerald', t.light)}`} /> : s === 'rejected' ? <XCircle className={`h-3.5 w-3.5 ${accentText('rose', t.light)}`} /> : <Clock4 className="h-3.5 w-3.5 text-brand-400" />}
                <span className={`${TYPE_SCALE.label} ${TYPE_WEIGHT.medium} uppercase tracking-wide ${t.textSecondary}`}>{s.charAt(0).toUpperCase() + s.slice(1)}</span>
              </div>
              <p className={`${TYPE_SCALE.statLarge} leading-none ${TYPE_WEIGHT.bold} tabular-nums`} style={{ color: hex }}><CountUp value={count} duration={0.9} /></p>
            </GlowCard>
          );
        })}
        <AnalyzeStat icon={UsersRound} accent="violet" label="Employees" value={richStats.uniqueEmployees} />
        <AnalyzeStat icon={Clock4} accent="blue" label="Avg Hrs/Request" value={richStats.avgHours} suffix="h" decimals={1} />
        <GlowCard color={ACCENT_HEX.indigo} className="p-3.5">
          <div className="flex items-center gap-1.5 mb-2"><TrendingUp className={`h-3.5 w-3.5 ${accentText('indigo', t.light)}`} /><span className={`${TYPE_SCALE.label} ${TYPE_WEIGHT.medium} uppercase tracking-wide ${t.textSecondary}`}>Busiest Day</span></div>
          <p className={`${TYPE_SCALE.statLarge} leading-none ${TYPE_WEIGHT.bold} ${t.textPrimary}`}>{richStats.busiestDay}</p>
        </GlowCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
          <div className={`flex items-center gap-2 px-5 py-3 border-b ${t.border}`}><Wrench className="h-4 w-4 text-brand-400" /><span className={`${TYPE_WEIGHT.semibold} ${TYPE_SCALE.title} ${t.textPrimary}`}>By Section</span></div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={bySection} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="section" tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}h`, 'Hours']} />
                <Bar dataKey="hours" name="Hours" radius={[6, 6, 0, 0]} animationDuration={700} animationEasing="ease-out">
                  {bySection.map((d, i) => <Cell key={i} fill={SECTION_HEX[d.section] ?? '#94a3b8'} fillOpacity={0.8} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {bySection.length === 0 && <p className={`text-sm text-center py-6 ${t.textFaint}`}>No data</p>}
          </div>
        </div>

        <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
          <div className={`flex items-center gap-2 px-5 py-3 border-b ${t.border}`}><UsersRound className="h-4 w-4 text-brand-400" /><span className={`${TYPE_WEIGHT.semibold} ${TYPE_SCALE.title} ${t.textPrimary}`}>Top Artisans by Hours</span><span className={`ml-auto ${TYPE_SCALE.caption} ${t.textFaint}`}>click a name to filter</span></div>
          <div className="p-4 space-y-1">
            {byArtisan.map(a => (
              <ArtisanBarRow key={a.employee_id || a.employee_name} a={a} maxHours={maxArtisanHours}
                active={employeePicks.some(p => p.employee_id === a.employee_id)}
                onToggle={() => onToggleArtisan(a.employee_id, a.employee_name)} />
            ))}
            {byArtisan.length === 0 && <p className={`text-sm text-center py-6 ${t.textFaint}`}>No data</p>}
          </div>
        </div>
      </div>

      <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
        <div className={`flex items-center gap-2 px-5 py-3 border-b ${t.border}`}><TrendingUp className="h-4 w-4 text-brand-400" /><span className={`${TYPE_WEIGHT.semibold} ${TYPE_SCALE.title} ${t.textPrimary}`}>By Day of Week</span></div>
        <div className="p-4">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byWeekday} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="day" tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}h`, 'Hours']} />
              <Bar dataKey="hours" name="Hours" radius={[6, 6, 0, 0]} fill={ACCENT_HEX.indigo} fillOpacity={0.8} animationDuration={700} animationEasing="ease-out" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/** One row per recurring category, expandable to reveal the underlying records —
 *  the "drill down from a high-level category into the raw records" requirement. */
// 8-hue validated categorical palette (dataviz skill's default set — gate-checked for
// CVD-safe adjacent contrast in both themes) rather than ACCENT_HEX's 6, since these
// charts can carry up to 8 series (the backend caps top_reasons/category_detail at 8)
// and 6 colors would silently repeat on slots 7-8.
const CATEGORY_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'];
type CategorySortKey = 'instances' | 'hours' | 'avg_hours' | 'pct_of_total';

/** Custom Recharts legend — the default `<Legend>` packs long category/phrase names
 *  together with no visible separation ("Daily ChecksDeclutchingShaft Exam…"). Wraps
 *  properly with real gaps, truncates long labels, keeps the full name in a tooltip. */
function DonutLegend({ payload }: { payload?: { value: string; color: string }[] }) {
  const t = useTheme();
  if (!payload || payload.length === 0) return null;
  return (
    <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5 pt-2">
      {payload.map((entry, i) => (
        <span key={i} title={entry.value} className={`inline-flex items-center gap-1.5 ${TYPE_SCALE.caption} ${t.textFaint} max-w-[140px]`}>
          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
          <span className="truncate">{entry.value}</span>
        </span>
      ))}
    </div>
  );
}

/** Clickable column header for CategoryDetailTable — click toggles sort, a second
 *  click on the same column flips direction (standard data-table sort convention). */
function SortHeader({ label, sortKey, active, dir, onClick, className }: {
  label: string; sortKey: CategorySortKey; active: boolean; dir: 'asc' | 'desc'; onClick: (k: CategorySortKey) => void; className: string;
}) {
  return (
    <th className={`${className} cursor-pointer select-none`} onClick={() => onClick(sortKey)}>
      <span className={`inline-flex items-center gap-0.5 ${active ? 'text-brand-400' : ''}`}>
        {label}
        {active ? (dir === 'desc' ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />) : null}
      </span>
    </th>
  );
}

function CategoryDetailTable({ categories }: { categories: OTCategoryDetail[] }) {
  const t = useTheme();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sort, setSort] = useState<{ key: CategorySortKey; dir: 'asc' | 'desc' }>({ key: 'hours', dir: 'desc' });
  if (categories.length === 0) return null;
  const thCls = `${TYPE_SCALE.caption} ${TYPE_WEIGHT.medium} ${t.textFaint} px-3 py-2`;
  const tdCls = `${TYPE_SCALE.caption} ${t.textMuted} px-3 py-2`;

  const sorted = [...categories].sort((a, b) => (a[sort.key] - b[sort.key]) * (sort.dir === 'asc' ? 1 : -1));
  const setSortKey = (key: CategorySortKey) => setSort(prev => prev.key === key ? { key, dir: prev.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: 'desc' });

  return (
    <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
      <div className={`flex items-center gap-2 px-5 py-3 border-b ${t.border}`}>
        <Layers className="h-4 w-4 text-brand-400" />
        <span className={`${TYPE_WEIGHT.semibold} ${TYPE_SCALE.title} ${t.textPrimary}`}>Category Detail</span>
      </div>
      <HintText className="px-5 pt-3">
        Click any category row below to expand it and see the individual overtime records behind that number. Click a column heading (Instances / Hours / Avg h / % Total) to sort by it — click again to reverse the order.
      </HintText>

      {categories.length > 1 && (
        <div className="px-5 pt-3">
          <ResponsiveContainer width="100%" height={220}>
            <RePieChart>
              {/* Percentage comes straight off `pct_of_total` (same field the table
                  renders) rather than being recomputed against sum(categories' hours) —
                  that denominator excludes every uncategorized record, which silently
                  inflated the pie's percentage above what the table showed. */}
              <Pie data={categories.map(c => ({ category: c.category, hours: c.hours, instances: c.instances, pct: c.pct_of_total }))} dataKey="hours" nameKey="category" innerRadius={50} outerRadius={80} paddingAngle={2} animationDuration={700} animationEasing="ease-out">
                {categories.map((_, i) => <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} fillOpacity={0.85} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: t.light ? '#fff' : '#0f1e2e', border: `1px solid ${t.light ? 'rgba(15,23,42,0.1)' : 'rgba(134,187,216,0.2)'}`, borderRadius: 12, color: t.light ? '#0f172a' : '#fff', fontSize: 12 }}
                formatter={(v: number, n: string, entry) => [`${v}h (${entry.payload.instances}×, ${entry.payload.pct}%)`, n]} />
              <Legend content={<DonutLegend />} />
            </RePieChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="overflow-x-auto mt-2">
        <table className="w-full">
          <thead className={`border-b ${t.border}`}>
            <tr>
              <th className={`text-left ${thCls} pl-4`}>Category</th>
              <SortHeader label="Instances" sortKey="instances" active={sort.key === 'instances'} dir={sort.dir} onClick={setSortKey} className={`text-right ${thCls}`} />
              <SortHeader label="Hours" sortKey="hours" active={sort.key === 'hours'} dir={sort.dir} onClick={setSortKey} className={`text-right ${thCls}`} />
              <SortHeader label="Avg h" sortKey="avg_hours" active={sort.key === 'avg_hours'} dir={sort.dir} onClick={setSortKey} className={`text-right ${thCls}`} />
              <SortHeader label="% Total" sortKey="pct_of_total" active={sort.key === 'pct_of_total'} dir={sort.dir} onClick={setSortKey} className={`text-right ${thCls}`} />
              <th className={`text-left ${thCls}`}>Top Weekday</th>
              <th className={`text-left ${thCls}`}>Top Employee</th>
              <th className={`text-left ${thCls}`}>Top Spare</th>
              <th className={`${thCls} w-8`}></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(c => {
              const isOpen = expanded === c.category;
              return (
                <React.Fragment key={c.category}>
                  <tr onClick={() => setExpanded(isOpen ? null : c.category)} className={`border-b ${t.border} ${t.hoverBgSoft} cursor-pointer transition-colors`}>
                    <td className={`${tdCls} pl-4 ${TYPE_WEIGHT.medium} ${t.textPrimary}`}>&ldquo;{c.category}&rdquo;</td>
                    <td className={`text-right ${tdCls}`}>{c.instances}</td>
                    <td className={`text-right ${tdCls} ${TYPE_WEIGHT.semibold} text-brand-400`}>{c.hours}h</td>
                    <td className={`text-right ${tdCls}`}>{c.avg_hours}h</td>
                    <td className={`text-right ${tdCls}`}>{c.pct_of_total}%</td>
                    <td className={tdCls}>{c.top_weekday ?? '—'}</td>
                    <td className={`${tdCls} truncate max-w-[140px]`}>{c.top_employee ?? '—'}</td>
                    <td className={`${tdCls} truncate max-w-[140px]`}>{c.top_spare ?? '—'}</td>
                    <td className={tdCls}>
                      <motion.div animate={{ rotate: isOpen ? 90 : 0 }} transition={{ duration: 0.15 }} className="flex items-center justify-center">
                        <ChevronRight className={`h-3.5 w-3.5 ${t.textFaint}`} />
                      </motion.div>
                    </td>
                  </tr>
                  <AnimatePresence>
                    {isOpen && (
                      <tr>
                        <td colSpan={9} className="p-0">
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
                            <motion.div initial="hidden" animate="show" variants={staggerContainer} className={`p-3 space-y-1.5 ${t.chipBg}`}>
                              {c.records.map((r, i) => (
                                <motion.div key={i} variants={fadeUp} className={`flex items-center justify-between gap-3 ${t.glassSoft} rounded-lg px-3 py-1.5`}>
                                  <div className="min-w-0 flex-1">
                                    <span className={`${TYPE_SCALE.caption} ${TYPE_WEIGHT.medium} ${t.textPrimary}`}>{r.employee_name}</span>
                                    <span className={`${TYPE_SCALE.caption} ${t.textFaint} ml-2`}>{fmtDate(r.date)}</span>
                                    {r.reason && <p className={`${TYPE_SCALE.caption} ${t.textFaint} truncate`}>{r.reason}</p>}
                                  </div>
                                  <span className={`${TYPE_SCALE.caption} ${TYPE_WEIGHT.semibold} shrink-0 ${accentText('violet', t.light)}`}>{r.hours}h</span>
                                </motion.div>
                              ))}
                            </motion.div>
                          </motion.div>
                        </td>
                      </tr>
                    )}
                  </AnimatePresence>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Shared gate pieces — both Patterns and Causes sub-tabs show the same loading
// spinner / "no analysis yet" placeholder / status-and-refresh header, since they're
// two views onto the one debounced analyze result owned by OvertimeInsightsView. ────

function AnalysisLoading() {
  const t = useTheme();
  return <div className={`${t.glass} rounded-2xl ${t.shadow} p-16 text-center flex items-center justify-center gap-2 ${t.textFaint}`}><RefreshCw className="h-5 w-5 animate-spin" /> Analyzing…</div>;
}

function AnalysisEmpty({ records, error, onRefresh }: { records: OTRecord[]; error: string; onRefresh: () => void }) {
  const t = useTheme();
  return (
    <div className={`${t.glass} rounded-2xl ${t.shadow} p-10 text-center`}>
      <PulsingIcon className="h-12 w-12 mx-auto mb-3 flex items-center justify-center">
        <Brain className={`h-9 w-9 ${accentText('amber', t.light)}`} />
      </PulsingIcon>
      <h3 className={`${TYPE_SCALE.subtitle} ${TYPE_WEIGHT.semibold} mb-1.5 ${t.textPrimary}`}>No Analysis Yet</h3>
      <p className={`${TYPE_SCALE.body} mb-4 max-w-md mx-auto ${t.textFaint}`}>
        {error || (records.length === 0
          ? 'No records in the current filter selection.'
          : 'Reads the reason text, machines mentioned, and volume/trend across the currently-filtered records — no external AI service, just aggregation and pattern rules run locally.')}
      </p>
      {records.length > 0 && (
        <button type="button" onClick={onRefresh}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm ${TYPE_WEIGHT.semibold} text-white bg-gradient-to-br from-brand-500 to-brand-700 hover:brightness-110 transition-all`}>
          <Brain className="h-4 w-4" /> Generate Analysis
        </button>
      )}
    </div>
  );
}

function AnalysisStatusBar({ result, updating, error, onRefresh }: { result: OTAnalysisResult; updating: boolean; error: string; onRefresh: () => void }) {
  const t = useTheme();
  return (
    <motion.div variants={fadeUp} className="flex items-center justify-between gap-3">
      <p className={`${TYPE_SCALE.caption} ${t.textFaint}`}>
        {error ? <span className="text-rose-400">{error}</span> : updating ? 'Updating for the current filters…' :
          `${result._records_analysed} record${result._records_analysed !== 1 ? 's' : ''} analysed · generated ${new Date(result.generated_at).toLocaleString('en-GB')}`}
      </p>
      <button type="button" onClick={onRefresh} title="Re-run with the current filters"
        className={`shrink-0 flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg ${t.chipBg} ${t.textFaint} ${t.hoverBg} ${t.hoverText} transition-all`}>
        <Brain className={`h-3 w-3 ${updating ? 'animate-pulse' : ''}`} /> Refresh
      </button>
    </motion.div>
  );
}

type AnalysisSubTabProps = { records: OTRecord[]; result: OTAnalysisResult | null; loading: boolean; updating: boolean; error: string; onRefresh: () => void };

function PatternsSubTab({ records, result, loading, updating, error, onRefresh }: AnalysisSubTabProps) {
  const t = useTheme();
  const axisColor = t.light ? 'rgba(15,23,42,0.4)' : 'rgba(255,255,255,0.4)';
  const gridColor = t.light ? 'rgba(15,23,42,0.06)' : 'rgba(255,255,255,0.06)';
  const tooltipStyle = { backgroundColor: t.light ? '#fff' : '#0f1e2e', border: `1px solid ${t.light ? 'rgba(15,23,42,0.1)' : 'rgba(134,187,216,0.2)'}`, borderRadius: 12, color: t.light ? '#0f172a' : '#fff', fontSize: 12 };

  if (loading) return <AnalysisLoading />;
  if (!result) return <AnalysisEmpty records={records} error={error} onRefresh={onRefresh} />;

  return (
    <motion.div initial="hidden" animate="show" variants={staggerContainer} className="space-y-4">
      <AnalysisStatusBar result={result} updating={updating} error={error} onRefresh={onRefresh} />

      <motion.div variants={fadeUp} className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
        <div className={`flex items-center gap-2 px-5 py-3 border-b ${t.border}`}><FileText className="h-4 w-4 text-brand-400" /><span className={`${TYPE_WEIGHT.semibold} ${TYPE_SCALE.title} ${t.textPrimary}`}>Observed Facts</span></div>
        <div className="p-4 space-y-4">
          <p className={`${TYPE_SCALE.body} ${t.textMuted}`}>{result.summary}</p>
          {/* Total Hours / Instances / Employees already live on the Overview tab — these
              three are the facts this backend computes that aren't shown anywhere else. */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <AnalyzeStat icon={TrendingUp} accent="amber" label="2.0× Share" value={result.double_time_pct} suffix="%" />
            <AnalyzeStat icon={Layers} accent="indigo" label="Sections Involved" value={result.sections_involved} />
            <AnalyzeStat icon={Gauge} accent="cyan" label="Avg Hrs / Employee" value={result.avg_hours_per_employee} suffix="h" decimals={1} />
          </div>
        </div>
      </motion.div>

      {result.top_reasons.length > 0 && (
        <motion.div variants={fadeUp} className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
          <div className={`flex items-center gap-2 px-5 py-3 border-b ${t.border}`}><FileText className="h-4 w-4 text-brand-400" /><span className={`${TYPE_WEIGHT.semibold} ${TYPE_SCALE.title} ${t.textPrimary}`}>Recurring Reasons</span></div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={result.top_reasons} barSize={28} margin={{ bottom: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="phrase" tick={{ fill: axisColor, fontSize: 9 }} axisLine={false} tickLine={false} angle={-35} textAnchor="end" interval={0} height={50}
                  tickFormatter={(v: string) => v.length > 14 ? `${v.slice(0, 13)}…` : v} />
                <YAxis tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} labelFormatter={(label: string) => `"${label}"`}
                  formatter={(v: number, _n: string, entry) => [`${v}h · ${entry.payload.count}×`, 'Hours']} />
                <Bar dataKey="hours" radius={[6, 6, 0, 0]} animationDuration={700} animationEasing="ease-out">
                  {result.top_reasons.map((_, i) => <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} fillOpacity={0.85} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {result.top_machines.length > 0 && (
        <motion.div variants={fadeUp} className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
          <div className={`flex items-center gap-2 px-5 py-3 border-b ${t.border}`}><Wrench className="h-4 w-4 text-brand-400" /><span className={`${TYPE_WEIGHT.semibold} ${TYPE_SCALE.title} ${t.textPrimary}`}>Machines Mentioned</span></div>
          <div className="p-4 space-y-3">
            {(() => {
              const maxHours = Math.max(...result.top_machines.map(x => x.hours), 1);
              return result.top_machines.map((m, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className={`${TYPE_WEIGHT.medium} ${t.textPrimary} truncate`}>{m.name}</span>
                    <span className={`shrink-0 ml-2 ${t.textFaint}`}>{m.count}× · {m.hours}h</span>
                  </div>
                  <ProgressBar value={(m.hours / maxHours) * 100} color={ACCENT_HEX.cyan} showValue={false} />
                </div>
              ));
            })()}
          </div>
        </motion.div>
      )}

      {result.weekly_series.length > 1 && (
        <motion.div variants={fadeUp} className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
          <div className={`flex items-center gap-2 px-5 py-3 border-b ${t.border}`}>
            <TrendingUp className="h-4 w-4 text-brand-400" /><span className={`${TYPE_WEIGHT.semibold} ${TYPE_SCALE.title} ${t.textPrimary}`}>Weekly Trend</span>
            <StatusBadge color={DIR_HEX[result.trend_direction]} label={result.trend_direction} />
            {result.trends[0] && <span className={`ml-auto ${TYPE_SCALE.caption} ${t.textFaint} truncate max-w-[50%]`}>{result.trends[0].insight}</span>}
          </div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={result.weekly_series}>
                <defs>
                  <linearGradient id="otWeeklyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={ACCENT_HEX.blue} stopOpacity={0.45} />
                    <stop offset="95%" stopColor={ACCENT_HEX.blue} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="week" tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}h`, 'Hours']} />
                <Area type="monotone" dataKey="hours" stroke={ACCENT_HEX.blue} strokeWidth={2} fill="url(#otWeeklyGrad)" animationDuration={700} animationEasing="ease-out" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      <motion.div variants={fadeUp}><CategoryDetailTable categories={result.category_detail} /></motion.div>

      <motion.div variants={fadeUp}><OvertimeHeatmap grid={result.hour_weekday_hours} weekdayLabels={result.weekday_labels} punchRecords={result.punch_records} /></motion.div>
    </motion.div>
  );
}

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low'] as const;

function CausesSubTab({ records, result, loading, updating, error, onRefresh }: AnalysisSubTabProps) {
  const t = useTheme();

  if (loading) return <AnalysisLoading />;
  if (!result) return <AnalysisEmpty records={records} error={error} onRefresh={onRefresh} />;

  return (
    <motion.div initial="hidden" animate="show" variants={staggerContainer} className="space-y-4">
      <AnalysisStatusBar result={result} updating={updating} error={error} onRefresh={onRefresh} />

      {result.possible_causes.length > 0 && (
        <motion.div variants={fadeUp} className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
          <div className={`flex items-center gap-2 px-5 py-3 border-b ${t.border}`}>
            <AlertTriangle className="h-4 w-4 text-brand-400" /><span className={`${TYPE_WEIGHT.semibold} ${TYPE_SCALE.title} ${t.textPrimary}`}>Possible Causes</span>
            <div className="ml-auto flex items-center gap-2.5">
              {SEVERITY_ORDER.map(sev => {
                const n = result.possible_causes.filter(p => p.severity === sev).length;
                if (n === 0) return null;
                return (
                  <span key={sev} className={`flex items-center gap-1 ${TYPE_SCALE.caption} ${t.textFaint}`}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: SEV_HEX[sev] }} />{n} {sev}
                  </span>
                );
              })}
            </div>
          </div>
          <div className="p-4 space-y-4">
            {SEVERITY_ORDER.map(sev => {
              const items = result.possible_causes.filter(p => p.severity === sev);
              if (items.length === 0) return null;
              return (
                <div key={sev}>
                  <p className={`${TYPE_SCALE.label} ${TYPE_WEIGHT.semibold} uppercase tracking-wide mb-2`} style={{ color: SEV_HEX[sev] }}>{sev}</p>
                  <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {items.map((p, i) => {
                      const SevIcon = p.severity === 'critical' || p.severity === 'high' ? AlertTriangle : AlertCircle;
                      return (
                        <motion.div key={i} variants={fadeUp}>
                          <GlowCard color={SEV_HEX[p.severity]} forceGlow elevated surface={`${t.glassSoft} rounded-xl`}>
                            <div className="flex items-start gap-3 p-4">
                              <PulsingIcon className="shrink-0 mt-0.5 h-6 w-6 flex items-center justify-center">
                                <SevIcon className="h-4 w-4" style={{ color: SEV_HEX[p.severity] }} />
                              </PulsingIcon>
                              <div className="min-w-0 flex-1">
                                <p className={`${TYPE_SCALE.body} ${TYPE_WEIGHT.semibold}`} style={{ color: SEV_HEX[p.severity] }}>{p.title}</p>
                                <p className={`${TYPE_SCALE.caption} mt-0.5 ${t.textMuted}`}>{p.description}</p>
                              </div>
                            </div>
                          </GlowCard>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {result.recommendations.length > 0 && (
        <motion.div variants={fadeUp} className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
          <div className={`flex items-center gap-2 px-5 py-3 border-b ${t.border}`}><Brain className="h-4 w-4 text-brand-400" /><span className={`${TYPE_WEIGHT.semibold} ${TYPE_SCALE.title} ${t.textPrimary}`}>Recommendations</span></div>
          <motion.div variants={staggerContainer} initial="hidden" animate="show" className="p-4 space-y-2.5">
            {result.recommendations.map((r, i) => (
              <motion.div key={i} variants={fadeUp}>
                <GlowCard color={PRIORITY_HEX[r.priority]} surface={`${t.glassSoft} rounded-xl`}>
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <StatusBadge color={PRIORITY_HEX[r.priority]} label={PRIORITY_LABEL[r.priority]} />
                      <p className={`${TYPE_SCALE.body} ${TYPE_WEIGHT.medium} ${t.textPrimary}`}>{r.action}</p>
                    </div>
                    <p className={`${TYPE_SCALE.caption} ${t.textFaint}`}>{r.rationale} · {r.target}</p>
                  </div>
                </GlowCard>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}

function WeeklySummaryView({ records, employees }: { records: OTRecord[]; employees: EmployeeLookup[] }) {
  const t = useTheme();
  // The weekly report opened Monday morning is for the week that just finished, not the
  // one that just started an hour ago — so the default range is last Monday through last
  // Sunday (the most recently COMPLETED Mon-Sun cycle), computed by stepping back one full
  // week from the start of the current week. This holds on any day of the week, not just
  // Monday: opened on a Wednesday it still shows the last full week, not a half-done
  // current one.
  const lastCompletedMonday = addDays(mondayOf(new Date()), -7);
  const defaultFrom = toISODate(lastCompletedMonday);
  const defaultTo = toISODate(addDays(lastCompletedMonday, 6));
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [sortMode, setSortMode] = useState<'name' | 'total' | 'mineNumber'>('total');

  const { rows: rowsByName, days } = useMemo(() => buildWeeklyRows(records, from, to, employees), [records, from, to, employees]);
  // buildWeeklyRows already returns alphabetical order — re-sort on top of that
  // (not inside it) so the chosen order stays a view preference, not a change to
  // the underlying data shape everything else here relies on.
  const rows = useMemo(() => {
    if (sortMode === 'total') return [...rowsByName].sort((a, b) => b.total - a.total);
    if (sortMode === 'mineNumber') return [...rowsByName].sort((a, b) => a.employee_id.localeCompare(b.employee_id, undefined, { numeric: true }));
    return rowsByName;
  }, [rowsByName, sortMode]);
  const grandTotal = rows.reduce((s, r) => s + r.total, 0);
  const dayTotals = days.map(d => { const ds = toISODate(d); return rows.reduce((s, r) => s + (r.byDate.get(ds) || 0), 0); });

  // 1.5x/2.0x totals belong to individuals (each employee's own split, shown as two
  // extra columns on their row in the export) — summed here only for the grand-total
  // row, not broken out by day.
  const grandTotal15 = rows.reduce((s, r) => s + r.total15, 0);
  const grandTotal20 = rows.reduce((s, r) => s + r.total20, 0);

  // Planned vs. unplanned totals for the week — always sums to grandTotal. The
  // "Unclassified" column/badge was removed from display (2026-08-30, per request);
  // calcOvertime.ts still tracks unclassifiedHours as its own bucket internally (no
  // float-drift risk, and it's what calcOvertime.test.ts exercises), it's just folded
  // into Unplanned here at the point of display — an unresolved legacy record reads
  // closer to "we don't know it was planned" than to "we don't know it was unplanned".
  const grandTotalPlanned = rows.reduce((s, r) => s + r.plannedHours, 0);
  const grandTotalUnplanned = rows.reduce((s, r) => s + r.unplannedHours + r.unclassifiedHours, 0);

  // "Where it's coming from" — a quick, always-visible answer to who's driving this
  // week's overtime and why, distinct from the separate Causes & Actions AI tab (which
  // requires navigating away and running an analysis). Both computed instantly from
  // whatever week is currently selected here.
  const weekRecords = useMemo(() => records.filter(r => r.date >= from && r.date <= to), [records, from, to]);
  const topEmployees = useMemo(() => [...rowsByName].filter(r => r.total > 0).sort((a, b) => b.total - a.total).slice(0, 5), [rowsByName]);
  const maxTopEmployeeHours = Math.max(1, ...topEmployees.map(r => r.total));
  const topEmployeeShare = grandTotal > 0 && topEmployees[0] ? Math.round((topEmployees[0].total / grandTotal) * 100) : 0;
  // For each top earner, their actual OT records this week — date, time, hours, and the
  // reason they gave — so "who has the most overtime" reads alongside "what were they
  // doing and when", not just a total.
  const topEmployeeInstances = useMemo(() => topEmployees.map(emp => ({
    ...emp,
    // Highest hours first within each person too, not chronological — the point is to
    // surface what's driving their total, so the biggest single instance leads.
    instances: weekRecords
      .filter(r => (r.employee_id || r.employee_name) === (emp.employee_id || emp.employee_name))
      .sort((a, b) => (b.hours ?? calcHours(b.start_time, b.end_time)) - (a.hours ?? calcHours(a.start_time, a.end_time))),
  })), [topEmployees, weekRecords]);

  // groupSimilarReasons (./calcOvertime.ts) fed the now-removed "Overtime by Work
  // Description" panel — kept exported there for when that section comes back.

  const stickyBg = t.light ? 'bg-white' : 'bg-[#040c18]';
  const today = toISODate(new Date());
  const invalidRange = from > to;

  const [downloading, setDownloading] = useState(false);
  const downloadExcel = async () => {
    setDownloading(true);
    try {
    const { default: ExcelJS } = await import('exceljs');
    const wb = new ExcelJS.Workbook(); wb.creator = 'Ozech MyOffice';
    const ws = wb.addWorksheet('OT Weekly Summary');
    // No per-day breakdown — each employee gets one numbered row: their week's
    // planned/unplanned split, 1.5x total, 2.0x total, and overall total.
    // [No., Mine No., Employee, Planned h, Unplanned h, 1.5x h, 2.0x h, Total h].
    // No separate "Unclassified h" column (removed 2026-08-30, per request) — an
    // unresolved legacy record's hours are folded into Unplanned h here so Planned +
    // Unplanned still sums to Total; see the on-screen grandTotalUnplanned comment
    // above for why Unplanned is the fold-in target, not Planned.
    const totalCols = 8;
    const NAME_COL = 3, TOTAL_COL = 8;
    ws.views = [{ state: 'frozen', xSplit: 3, ySplit: 3 }];
    const FONT = 'Calibri';

    // A single, softer brand blue across the whole header (the previous version's
    // near-black navy on the fixed/total columns read too dark for a document meant
    // to be shared outward) — one clean tone, white bold text, good contrast without
    // being harsh.
    const HEADER_FILL = EXPORT_BRAND_ARGB;
    const HEADER_BORDER = 'FF9FC4DE';
    const STRIPE_FILL = 'FFF6F9FB';

    ws.mergeCells(1, 1, 1, totalCols);
    const title = ws.getCell(1, 1);
    title.value = `Overtime Weekly Summary — ${fmtDate(from)} to ${fmtDate(to)}`;
    title.font = { name: FONT, bold: true, size: 14, color: { argb: EXPORT_BRAND_ARGB } };
    title.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(1).height = 24;
    ws.addRow([]);

    const hdrRow = ws.getRow(3);
    hdrRow.values = ['No.', 'Mine No.', 'Employee', 'Planned h', 'Unplanned h', '1.5x h', '2.0x h', 'Total h'];
    hdrRow.height = 28;
    hdrRow.eachCell({ includeEmpty: true }, (c, col) => {
      const isNameCol = col === NAME_COL;
      c.font = { name: FONT, bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
      c.alignment = { horizontal: isNameCol ? 'left' : 'center', vertical: 'middle', wrapText: !isNameCol };
      c.border = { bottom: { style: 'medium', color: { argb: HEADER_BORDER } } };
    });

    // Hour values are written as formatted TEXT ("0.00"), not native numbers with a
    // numFmt — Excel's decimal separator glyph for numeric cells is always rendered
    // using the OPENING machine's own OS/Excel regional settings, not anything
    // encoded in the file (a `[$-409]0.00` locale-prefixed numFmt was tried here
    // before and still showed "0,00" on comma-locale machines, since that prefix
    // only overrides locale-specific symbols like currency/month names, not the
    // decimal point itself). A plain string is never re-rendered — what's written
    // is exactly what displays, everywhere.
    const fmtHours = (n: number) => n.toFixed(2);

    rows.forEach((row, ei) => {
      const rowVals: (string | number)[] = [ei + 1, row.employee_id || '—', row.employee_name, fmtHours(row.plannedHours), fmtHours(row.unplannedHours + row.unclassifiedHours), fmtHours(row.total15), fmtHours(row.total20), fmtHours(row.total)];
      const dataRow = ws.getRow(4 + ei);
      dataRow.values = rowVals;
      dataRow.height = 17;
      const stripe = ei % 2 !== 0;
      dataRow.eachCell({ includeEmpty: true }, (c, col) => {
        const isNameCol = col === NAME_COL;
        c.font = { name: FONT, size: 10 };
        c.alignment = { horizontal: isNameCol ? 'left' : 'center', vertical: 'middle' };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: stripe ? STRIPE_FILL : 'FFFFFFFF' } };
      });
    });

    const totalRow = ws.getRow(4 + rows.length + 1);
    totalRow.values = ['', '', 'Grand Total', fmtHours(grandTotalPlanned), fmtHours(grandTotalUnplanned), fmtHours(grandTotal15), fmtHours(grandTotal20), fmtHours(grandTotal)];
    totalRow.height = 22;
    totalRow.eachCell({ includeEmpty: true }, (c, col) => {
      const isTotalCol = col === TOTAL_COL;
      c.font = { name: FONT, bold: true, size: 10, color: { argb: isTotalCol ? 'FFFFFFFF' : EXPORT_BRAND_ARGB } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isTotalCol ? EXPORT_BRAND_ARGB : 'FFE4EEF5' } };
      c.alignment = { horizontal: col === NAME_COL ? 'left' : 'center', vertical: 'middle' };
      c.border = { top: { style: 'medium', color: { argb: HEADER_BORDER } } };
    });

    // "Where it's coming from" — the same quick who/why breakdown shown on screen,
    // appended below the grand total so the Monday-morning download carries it too,
    // not just the live view.
    let cursor = 4 + rows.length + 1 + 2;

    // Top earners get their actual instances listed — date, time, hours, and the reason
    // given — not just a total, matching the on-screen panel above.
    if (topEmployeeInstances.length > 0) {
      ws.mergeCells(cursor, 1, cursor, totalCols);
      const teTitleCell = ws.getCell(cursor, 1);
      teTitleCell.value = 'Weekly Summary';
      teTitleCell.font = { name: FONT, bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
      teTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
      teTitleCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
      ws.getRow(cursor).height = 20;
      cursor++;

      topEmployeeInstances.forEach(emp => {
        ws.mergeCells(cursor, 2, cursor, totalCols);
        const empCell = ws.getCell(cursor, 2);
        empCell.value = `${emp.employee_name}${emp.position ? ' · ' + emp.position : ''} — ${fmtHours(emp.total)}h`;
        empCell.font = { name: FONT, bold: true, size: 10, color: { argb: EXPORT_BRAND_ARGB } };
        empCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
        empCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE4EEF5' } };
        cursor++;

        if (emp.instances.length === 0) {
          ws.mergeCells(cursor, 2, cursor, totalCols);
          const noneCell = ws.getCell(cursor, 2);
          noneCell.value = "No individual instances logged for this week&apos;s hours.";
          noneCell.font = { name: FONT, italic: true, size: 9, color: { argb: 'FF8AA0B4' } };
          noneCell.alignment = { horizontal: 'left', indent: 2 };
          cursor++;
        } else {
          emp.instances.forEach((inst, i) => {
            ws.mergeCells(cursor, 2, cursor, totalCols);
            const instCell = ws.getCell(cursor, 2);
            const timeStr = inst.start_time && inst.end_time ? `${inst.start_time}–${inst.end_time}` : 'hours only';
            const hrs = inst.hours ?? calcHours(inst.start_time, inst.end_time);
            instCell.value = `${fmtDate(inst.date)}   ${timeStr} · ${fmtHours(hrs)}h   ${inst.reason ? `"${cleanReasonText(inst.reason)}"` : 'No reason given'}`;
            instCell.font = { name: FONT, size: 9 };
            instCell.alignment = { horizontal: 'left', indent: 2 };
            instCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 !== 0 ? STRIPE_FILL : 'FFFFFFFF' } };
            cursor++;
          });
        }
        cursor++; // blank spacer row between employees
      });
      cursor++; // blank row before the next section
    }

    // "Overtime by Work Description" (fuzzy-grouped similar reasons) pulled for now —
    // see the matching note above the on-screen JSX for this same section.

    ws.getColumn(1).width = 6;
    ws.getColumn(2).width = 12;
    ws.getColumn(3).width = 26;
    ws.getColumn(4).width = 11;
    ws.getColumn(5).width = 13;
    ws.getColumn(6).width = 14;
    ws.getColumn(7).width = 10;
    ws.getColumn(8).width = 10;
    ws.getColumn(9).width = 12;

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${exportFilename('OT_Weekly_Summary')}.xlsx`; a.click(); URL.revokeObjectURL(url);
    } catch (e) {
      // Previously this button did nothing visible on failure — any thrown error (a bad
      // ExcelJS call, the dynamic import failing to load) just vanished as an unhandled
      // promise rejection, which read as "the download button doesn't work."
      toast.error('Download failed: ' + (e as Error).message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className={`${t.glass} rounded-2xl ${t.shadow} p-4 flex flex-wrap items-center gap-3`}>
        <div className="flex items-center gap-1.5"><CalendarRange className="h-4 w-4 text-brand-400" /><span className={`text-sm ${TYPE_WEIGHT.medium} ${t.textMuted}`}>Range</span></div>
        <input type="date" title="From date" value={from} onChange={e => setFrom(e.target.value)} className={`h-9 rounded-lg px-2.5 text-xs outline-none transition-colors ${t.inputBg}`} />
        <span className={t.textFaint}>to</span>
        <input type="date" title="To date" value={to} onChange={e => setTo(e.target.value)} className={`h-9 rounded-lg px-2.5 text-xs outline-none transition-colors ${t.inputBg}`} />
        <button type="button" onClick={() => { setFrom(defaultFrom); setTo(defaultTo); }} title="Last completed Monday-Sunday week" className={`h-9 px-3 rounded-lg text-xs ${TYPE_WEIGHT.medium} transition-colors ${t.chipBg} ${t.textFaint} ${t.hoverBg} ${t.hoverText}`}>Last Week</button>
        <div className="flex items-center gap-1.5">
          <TrendingUp className={`h-3.5 w-3.5 ${t.textFaint}`} />
          <SelectField size="filter" title="Sort order" value={sortMode} onChange={v => setSortMode(v as typeof sortMode)}
            options={[
              { value: 'name', label: 'Sort: Name (A–Z)' },
              { value: 'total', label: 'Sort: Highest OT first' },
              { value: 'mineNumber', label: 'Sort: Mine Number' },
            ]} />
        </div>
        {!invalidRange && (
          <span className={`text-xs ${t.textFaint}`}>
            {days.length} day{days.length !== 1 ? 's' : ''} · {rows.length} employee{rows.length !== 1 ? 's' : ''} · {grandTotal.toFixed(1)}h total
            {grandTotal > 0 && (
              <>
                {' · '}<span style={{ color: PLANNING_HEX.planned }} className={`${TYPE_WEIGHT.semibold}`}>Planned {grandTotalPlanned.toFixed(1)}h</span>
                {' · '}<span style={{ color: PLANNING_HEX.unplanned }} className={`${TYPE_WEIGHT.semibold}`}>Unplanned {grandTotalUnplanned.toFixed(1)}h</span>
              </>
            )}
          </span>
        )}
        {!invalidRange && rows.length > 0 && (
          <button type="button" onClick={downloadExcel} disabled={downloading} className={`ml-auto flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs ${TYPE_WEIGHT.semibold} text-white bg-gradient-to-br from-brand-500 to-brand-700 hover:brightness-110 disabled:opacity-60 transition-all`}>
            {downloading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Download Excel
          </button>
        )}
      </div>

      {!invalidRange && topEmployees.length > 0 && (
        <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
          <div className={`flex items-center gap-2 px-5 py-3 border-b ${t.border}`}>
            <UsersRound className="h-4 w-4 text-brand-400" />
            <span className={`${TYPE_WEIGHT.semibold} text-sm ${t.textPrimary}`}>Highest This Week</span>
            <span className={`ml-auto text-xs ${t.textFaint}`}>{topEmployees[0].employee_name} is <span className={`${TYPE_WEIGHT.semibold} ${accentText('blue', t.light)}`}>{topEmployeeShare}%</span> of the total</span>
          </div>
          <div className={`divide-y ${t.border}`}>
            {topEmployeeInstances.map(emp => (
              <div key={emp.employee_id || emp.employee_name} className="p-4 space-y-2.5">
                <div>
                  <div className="flex justify-between items-baseline text-sm mb-1 gap-2">
                    <span className={`${TYPE_WEIGHT.semibold} truncate ${t.textPrimary}`}>{emp.employee_name}{emp.position ? <span className={`font-normal ${t.textFaint}`}> · {emp.position}</span> : null}</span>
                    <span className={`shrink-0 ${TYPE_WEIGHT.bold} ${accentText('blue', t.light)}`}>{emp.total.toFixed(1)}h</span>
                  </div>
                  <ProgressBar value={(emp.total / maxTopEmployeeHours) * 100} color={ACCENT_HEX.blue} showValue={false} />
                </div>
                <div className={`pl-3 border-l-2 ${t.border} space-y-1`}>
                  {emp.instances.length === 0 ? (
                    <p className={`text-xs ${t.textFaint}`}>No individual instances logged for this week&apos;s hours.</p>
                  ) : emp.instances.map(inst => (
                    <div key={inst.id} className="flex flex-wrap items-baseline gap-x-2 text-xs">
                      <span className={`shrink-0 ${TYPE_WEIGHT.medium} ${t.textMuted}`}>{fmtDate(inst.date)}</span>
                      <span className={`shrink-0 ${accentText('blue', t.light)}`}>
                        {inst.start_time && inst.end_time ? `${inst.start_time}–${inst.end_time}` : 'hours only'} · {(inst.hours ?? calcHours(inst.start_time, inst.end_time)).toFixed(1)}h
                      </span>
                      <span className={`${t.textFaint} truncate`}>{inst.reason ? `"${cleanReasonText(inst.reason)}"` : 'No reason given'}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* "Overtime by Work Description" (fuzzy-grouped similar reasons) pulled for now —
          not ready to send out, revisit and perfect later. groupSimilarReasons stays
          exported from ./calcOvertime.ts; cleanReasonText is still used directly below,
          by the Highest This Week instance list. */}

      {invalidRange ? (
        <div className={`${t.glass} rounded-2xl ${t.shadow}`}>
          <EmptyState icon={CalendarRange} title="Invalid range" message="The end date is before the start date." />
        </div>
      ) : rows.length === 0 ? (
        <div className={`${t.glass} rounded-2xl ${t.shadow}`}>
          <EmptyState icon={Clock4} title="No overtime in this range" message="Try a different date range." />
        </div>
      ) : (
        <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
          <Table containerClassName="overflow-auto max-h-[calc(100vh-360px)]">
            <TableHeader>
              <TableRow className={`${t.border} hover:bg-transparent`}>
                <TableHead className={`min-w-48 sticky left-0 top-0 z-30 ${stickyBg} border-r ${t.border} ${t.textMuted}`}>Employee</TableHead>
                {days.map(d => {
                  const ds = toISODate(d);
                  const isWknd = d.getDay() === 0 || d.getDay() === 6;
                  return (
                    <TableHead key={ds} className={`text-center min-w-[64px] px-0.5 sticky top-0 z-20 ${stickyBg} ${isWknd ? t.chipBg : ''}`}>
                      <div className="flex flex-col items-center text-[9px] py-1">
                        <span className={t.textFaint}>{d.toLocaleDateString('en-GB', { weekday: 'short' })}</span>
                        <span className={`${TYPE_WEIGHT.bold} text-sm ${ds === today ? 'text-brand-400' : t.textMuted}`}>{d.getDate()}</span>
                        <span className={t.textFaint}>{d.toLocaleDateString('en-GB', { month: 'short' })}</span>
                      </div>
                    </TableHead>
                  );
                })}
                <TableHead className={`text-center min-w-16 text-[10px] ${TYPE_WEIGHT.semibold} sticky top-0 z-20 ${stickyBg} ${t.textMuted}`}>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(row => (
                <TableRow key={row.employee_id || row.employee_name} className={`${t.border} ${t.hoverBgSoft}`}>
                  <TableCell className={`sticky left-0 z-10 ${stickyBg} border-r ${t.border} py-2`}>
                    <div className="flex items-center gap-2.5">
                      <Avatar />
                      <div className="min-w-0">
                        <p className={`text-sm ${TYPE_WEIGHT.medium} truncate ${t.textPrimary}`}>{row.employee_name}</p>
                        <p className={`text-[10px] truncate ${t.textFaint}`}>{row.employee_id}{row.position ? ` · ${row.position}` : ''}</p>
                      </div>
                    </div>
                  </TableCell>
                  {days.map(d => {
                    const ds = toISODate(d);
                    const h = row.byDate.get(ds) || 0;
                    const isWknd = d.getDay() === 0 || d.getDay() === 6;
                    return (
                      <TableCell key={ds} className={`text-center text-xs ${isWknd ? t.chipBg : ''} ${h > 0 ? `${TYPE_WEIGHT.semibold} text-brand-400` : t.textFaint}`}>
                        {h > 0 ? h.toFixed(1) : '—'}
                      </TableCell>
                    );
                  })}
                  <TableCell className={`text-center text-sm ${TYPE_WEIGHT.bold} ${t.textPrimary}`}>{row.total.toFixed(1)}</TableCell>
                </TableRow>
              ))}
              <TableRow className={`${t.border} ${t.chipBg} hover:bg-transparent`}>
                <TableCell className={`sticky left-0 z-10 ${t.chipBg} border-r ${t.border} text-xs ${TYPE_WEIGHT.bold} ${t.textPrimary}`}>TOTAL</TableCell>
                {dayTotals.map((dt, i) => (
                  <TableCell key={i} className={`text-center text-xs ${TYPE_WEIGHT.semibold} ${t.textMuted}`}>{dt > 0 ? dt.toFixed(1) : '—'}</TableCell>
                ))}
                <TableCell className={`text-center text-sm ${TYPE_WEIGHT.bold} text-brand-400`}>{grandTotal.toFixed(1)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

function OvertimeContent() {
  const t = useTheme();
  const sections = useCollapseSection({ hero: true, filters: true });

  const { records, setRecords, loading, refreshing, refresh: load } = useOvertimeData();
  // Joined live against employee master data (not stored on the OT record) so
  // section analytics always reflect the current roster, not a snapshot that
  // might predate the employee's section being set.
  const employees = useEmployees();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [type, setType] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [employeePicks, setEmployeePicks] = useState<PickedEmployee[]>([]);
  const [view, setView] = useState<'table' | 'grid'>('table');
  const [dateSort, setDateSort] = useState<'desc' | 'asc'>('desc');
  const [mainTab, setMainTab] = useState<'records' | 'insights' | 'weekly-summary'>('records');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<OTRecord | null>(null);
  const [viewing, setViewing] = useState<OTRecord | null>(null);
  const [delTarget, setDelTarget] = useState<OTRecord | null>(null);
  const [approving, setApproving] = useState<OTRecord | null>(null);
  const [rejecting, setRejecting] = useState<OTRecord | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<'approve' | 'reject' | null>(null);

  const employeeIds = useMemo(() => new Set(employeePicks.map(p => p.employee_id)), [employeePicks]);

  const filtered = useMemo(() => records.filter(r => {
    if (status !== 'all' && r.status !== status) return false;
    if (type !== 'all' && r.overtime_type !== type) return false;
    if (dateFrom && r.date < dateFrom) return false;
    if (dateTo && r.date > dateTo) return false;
    if (employeeIds.size > 0 && !employeeIds.has(r.employee_id)) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!r.employee_name.toLowerCase().includes(q) && !r.employee_id.toLowerCase().includes(q) && !(r.reason || '').toLowerCase().includes(q) && !r.position.toLowerCase().includes(q)) return false;
    }
    return true;
  }).sort((a, b) => dateSort === 'asc' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)),
  [records, status, type, dateFrom, dateTo, employeeIds, search, dateSort]);

  // Month quick-filter — reads off `records` (not `filtered`), so the chip list itself
  // doesn't shrink as the user filters by other criteria. Newest first, capped so a
  // multi-year history doesn't turn this into an unusable wall of chips.
  const monthOptions = useMemo(() => {
    const months = new Set(records.map(r => r.date?.slice(0, 7)).filter((m): m is string => !!m));
    return [...months].sort((a, b) => b.localeCompare(a)).slice(0, 12).map(m => {
      const [y, mo] = m.split('-').map(Number);
      const label = new Date(y, mo - 1, 1).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
      const lastDay = new Date(y, mo, 0).getDate();
      return { key: m, label, from: `${m}-01`, to: `${m}-${String(lastDay).padStart(2, '0')}` };
    });
  }, [records]);
  const activeMonth = monthOptions.find(m => m.from === dateFrom && m.to === dateTo)?.key ?? null;
  const toggleMonthFilter = (m: typeof monthOptions[number]) => {
    if (activeMonth === m.key) { setDateFrom(''); setDateTo(''); }
    else { setDateFrom(m.from); setDateTo(m.to); }
  };

  // Artisan quick-filter — clicking a name in the Top Employees/Artisans charts toggles
  // them into/out of the same `employeePicks` state the EmployeeMultiPicker above writes
  // to, so it's just another way to populate the one filter, not a parallel mechanism.
  const toggleArtisanFilter = (employee_id: string, employee_name: string) => {
    if (!employee_id) return;
    setEmployeePicks(prev => prev.some(p => p.employee_id === employee_id)
      ? prev.filter(p => p.employee_id !== employee_id)
      : [...prev, { id: employee_id, employee_id, name: employee_name }]);
  };

  const stats = useMemo(() => {
    const pending = records.filter(r => r.status === 'pending').length;
    const approved = records.filter(r => r.status === 'approved').length;
    const totalHrs = records.reduce((s, r) => s + (r.hours ?? calcHours(r.start_time, r.end_time)), 0);
    return { total: records.length, pending, approved, totalHrs: Math.round(totalHrs) };
  }, [records]);

  // Whether any filter narrows `filtered` below the full record set — the quick summary
  // below only makes sense (and doesn't just repeat the page-wide `stats` tiles above)
  // once the view is actually scoped to something.
  const hasActiveFilter = status !== 'all' || type !== 'all' || !!dateFrom || !!dateTo || employeePicks.length > 0 || !!search;
  const filteredSummary = useMemo(() => {
    const totalHrs = filtered.reduce((s, r) => s + (r.hours ?? calcHours(r.start_time, r.end_time)), 0);
    const uniqueEmployees = new Set(filtered.map(r => r.employee_id)).size;
    return {
      instances: filtered.length,
      totalHrs: Math.round(totalHrs * 10) / 10,
      uniqueEmployees,
      avgHours: filtered.length > 0 ? Math.round((totalHrs / filtered.length) * 10) / 10 : 0,
    };
  }, [filtered]);

  // byType/byStatus/bySection/byArtisan/byWeekday/richStats moved into
  // OvertimeInsightsView (below) — it's now the sole consumer, after Analytics and
  // Analyze were merged into that one nested-tab component.

  const handleSave = async (body: Record<string, unknown>, id?: number | string) => {
    if (id) {
      const updated = await updateOT(id, body);
      setRecords(prev => prev.map(r => r.id === id ? updated : r));
      toast.success('Record updated');
    } else {
      const created = await createOT(body);
      setRecords(prev => [created, ...prev]);
      toast.success('Overtime request submitted');
    }
  };

  const handleDelete = async () => {
    if (!delTarget) return;
    await deleteOT(delTarget.id);
    setRecords(prev => prev.filter(r => r.id !== delTarget.id));
    toast.success('Deleted');
    setDelTarget(null);
  };

  const handleApprove = async (sig: SignatureResult) => {
    if (!approving) return;
    const updated = await updateOT(approving.id, { status: 'approved', approved_by: sig.signerName, approved_at: sig.signedAt, approval_signature: sig.dataUrl });
    setRecords(prev => prev.map(r => r.id === approving.id ? updated : r));
    toast.success('Overtime approved');
    setViewing(null);
    setApproving(null);
  };

  const handleReject = async (sig: SignatureResult) => {
    if (!rejecting) return;
    const updated = await updateOT(rejecting.id, { status: 'rejected', rejected_by: sig.signerName, rejected_at: sig.signedAt });
    setRecords(prev => prev.map(r => r.id === rejecting.id ? updated : r));
    toast.success('Overtime rejected');
    setViewing(null);
    setRejecting(null);
  };

  // Only pending records are selectable — approve/reject is the only bulk action, and a
  // stale selection (e.g. someone else approved one mid-session) is filtered out again
  // at submit time rather than trusted.
  const pendingInView = useMemo(() => filtered.filter(r => r.status === 'pending'), [filtered]);
  const allPendingSelected = pendingInView.length > 0 && pendingInView.every(r => selectedIds.has(String(r.id)));
  const toggleSelectAll = () => setSelectedIds(allPendingSelected ? new Set() : new Set(pendingInView.map(r => String(r.id))));
  const toggleSelect = (id: string) => setSelectedIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const selectedRecords = useMemo(() => records.filter(r => r.status === 'pending' && selectedIds.has(String(r.id))), [records, selectedIds]);

  const handleBulkApprove = async (sig: SignatureResult) => {
    const targets = selectedRecords;
    const results = await Promise.allSettled(targets.map(r => updateOT(r.id, { status: 'approved', approved_by: sig.signerName, approved_at: sig.signedAt, approval_signature: sig.dataUrl })));
    const updated = results.filter((r): r is PromiseFulfilledResult<OTRecord> => r.status === 'fulfilled').map(r => r.value);
    setRecords(prev => { const map = new Map(prev.map(r => [String(r.id), r])); updated.forEach(u => map.set(String(u.id), u)); return [...map.values()]; });
    const failed = results.length - updated.length;
    if (failed > 0) toast.warning(`${failed} failed to approve`);
    if (updated.length > 0) toast.success(`Approved ${updated.length} request${updated.length !== 1 ? 's' : ''}`);
    setSelectedIds(new Set());
  };

  const handleBulkReject = async (sig: SignatureResult) => {
    const targets = selectedRecords;
    const results = await Promise.allSettled(targets.map(r => updateOT(r.id, { status: 'rejected', rejected_by: sig.signerName, rejected_at: sig.signedAt })));
    const updated = results.filter((r): r is PromiseFulfilledResult<OTRecord> => r.status === 'fulfilled').map(r => r.value);
    setRecords(prev => { const map = new Map(prev.map(r => [String(r.id), r])); updated.forEach(u => map.set(String(u.id), u)); return [...map.values()]; });
    const failed = results.length - updated.length;
    if (failed > 0) toast.warning(`${failed} failed to reject`);
    if (updated.length > 0) toast.success(`Rejected ${updated.length} request${updated.length !== 1 ? 's' : ''}`);
    setSelectedIds(new Set());
  };

  const selCls = `h-9 rounded-lg px-3 text-sm outline-none transition-colors ${t.inputBg}`;
  const thCls = `text-left px-3 py-2 text-[10px] uppercase tracking-wide ${TYPE_WEIGHT.medium} ${t.textFaint}`;
  const tdCls = `px-3 py-2.5 text-sm ${t.textMuted}`;

  const GridCard = ({ r }: { r: OTRecord }) => {
    const hours = calcHours(r.start_time, r.end_time);
    return (
      <GlowCard onClick={() => setViewing(r)} color={STATUS_HEX[r.status]} surface={`${t.glass} rounded-xl`} className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <Avatar name={r.employee_name} />
            <div><p className={`text-xs ${TYPE_WEIGHT.semibold} ${t.textPrimary}`}>{r.employee_name}</p><p className={`text-[10px] ${t.textFaint}`}>{r.employee_id}</p></div>
          </div>
          <StatusBadge color={STATUS_HEX[r.status]} label={r.status} />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <TypeBadge type={r.overtime_type} />
          <PlanningBadge status={r.planning_status} />
          <PayoutBadge method={r.payout_method} />
        </div>
        <div className={`mt-2 space-y-0.5 text-[11px] ${t.textFaint}`}>
          <p>{fmtDate(r.date)} · {r.start_time}–{r.end_time} {hours > 0 && <span className={`text-brand-400 ${TYPE_WEIGHT.semibold}`}>({hours.toFixed(1)}h)</span>}</p>
          <p className="truncate">{r.reason}</p>
        </div>
        <div className="flex gap-1 mt-3">
          {r.status === 'pending' && (
            <>
              <button type="button" onClick={e => { e.stopPropagation(); setApproving(r); }} className={`flex-1 py-1 text-[10px] ${TYPE_WEIGHT.semibold} rounded-lg bg-emerald-500/15 ${accentText('emerald', t.light)} hover:bg-emerald-500/25 transition-all`}>Approve</button>
              <button type="button" onClick={e => { e.stopPropagation(); setRejecting(r); }} className={`flex-1 py-1 text-[10px] ${TYPE_WEIGHT.semibold} rounded-lg bg-rose-500/15 ${accentText('rose', t.light)} hover:bg-rose-500/25 transition-all`}>Reject</button>
            </>
          )}
          <button type="button" title="Edit" onClick={e => { e.stopPropagation(); setEditing(r); setFormOpen(true); }} className={`h-6 w-6 flex items-center justify-center rounded-lg ${t.chipBg} ${t.hoverBg} ${t.textFaint} transition-all`}><Edit className="h-3 w-3" /></button>
          <button type="button" title="Delete" onClick={e => { e.stopPropagation(); setDelTarget(r); }} className={`h-6 w-6 flex items-center justify-center rounded-lg ${t.chipBg} hover:bg-rose-500/20 ${t.textFaint} hover:${t.light ? 'text-rose-600' : 'text-rose-400'} transition-all`}><Trash2 className="h-3 w-3" /></button>
        </div>
      </GlowCard>
    );
  };

  return (
    <main className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <PageHero
        icon={Clock4}
        accent="violet"
        crumbs={['Time & Attendance', 'Overtime']}
        title="Overtime Management"
        description="Submit, track and approve overtime requests"
        statsOpen={sections.expanded.hero}
        actions={
          <>
            <button type="button" onClick={() => load(true)} title="Refresh" className={`h-8 w-8 flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} ${t.hoverText}`}>
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            {records.length > 0 && (
              <DownloadButton
                data={records as unknown as Record<string, unknown>[]}
                columns={overtimeExportColumns}
                filename={exportFilename('overtime_records')}
                title="Overtime Records"
                formats={['excel']}
              />
            )}
            <PrimaryButton icon={Plus} onClick={() => { setEditing(null); setFormOpen(true); }}>New Request</PrimaryButton>
          </>
        }
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatTile icon={Clock4} color={ACCENT_HEX.blue} label="Total Requests" value={stats.total} />
          <StatTile icon={Clock4} color="#fbbf24" label="Pending" value={stats.pending} onClick={() => setStatus('pending')} />
          <StatTile icon={CheckCircle2} color="#34d399" label="Approved" value={stats.approved} onClick={() => setStatus('approved')} />
          <StatTile icon={Calendar} color={ACCENT_HEX.blue} label="Total Hours" value={`${stats.totalHrs}h`} />
        </div>
      </PageHero>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className={`${t.glass} rounded-xl p-4`}><div className="flex items-center gap-1.5 mb-1"><Clock4 className="h-3.5 w-3.5 text-brand-400" /><span className={`text-xs ${t.textFaint}`}>Total</span></div><div className={`text-xl ${TYPE_WEIGHT.bold} ${t.textPrimary}`}>{stats.total}</div></div>
        <div className={`${t.glass} rounded-xl p-4`}><div className="flex items-center gap-1.5 mb-1"><Clock4 className={`h-3.5 w-3.5 ${accentText('amber', t.light)}`} /><span className={`text-xs ${t.textFaint}`}>Pending</span></div><div className={`text-xl ${TYPE_WEIGHT.bold} ${accentText('amber', t.light)}`}>{stats.pending}</div></div>
        <div className={`${t.glass} rounded-xl p-4`}><div className="flex items-center gap-1.5 mb-1"><CheckCircle2 className={`h-3.5 w-3.5 ${accentText('emerald', t.light)}`} /><span className={`text-xs ${t.textFaint}`}>Approved</span></div><div className={`text-xl ${TYPE_WEIGHT.bold} ${accentText('emerald', t.light)}`}>{stats.approved}</div></div>
        <div className={`${t.glass} rounded-xl p-4`}><div className="flex items-center gap-1.5 mb-1"><Calendar className="h-3.5 w-3.5 text-brand-400" /><span className={`text-xs ${t.textFaint}`}>OT Hours</span></div><div className={`text-xl ${TYPE_WEIGHT.bold} text-brand-400`}>{stats.totalHrs}h</div></div>
      </div>

      <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
        <div className={`flex items-center gap-2 px-5 py-3 border-b ${t.border}`}>
          <Search className="h-4 w-4 text-brand-400" /><span className={`${TYPE_WEIGHT.semibold} text-sm ${t.textPrimary}`}>Filters</span>
        </div>
        <div className="px-5 pb-4 pt-3 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <SearchInput value={search} onChange={setSearch} placeholder="Search employee, reason…" />
            <SelectField size="filter" title="Status" value={status} onChange={setStatus}
              options={[{ value: 'all', label: 'All Statuses' }, ...STATUSES.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))]} />
            <SelectField size="filter" title="Type" value={type} onChange={setType}
              options={[{ value: 'all', label: 'All Types' }, ...OT_TYPES.map(ty => ({ value: ty, label: TYPE_LABELS[ty] }))]} />
            {/* Native date inputs have a non-negotiable intrinsic width (segments + picker
                icon) — giving this pair its own 2-column span, plus min-w-0 on each input,
                keeps them from overflowing/overlapping the grid cell at narrower widths. */}
            <div className="flex gap-2 sm:col-span-2 lg:col-span-2">
              <input type="date" title="From date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={`flex-1 min-w-0 ${selCls}`} />
              <input type="date" title="To date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={`flex-1 min-w-0 ${selCls}`} />
            </div>
          </div>
          {monthOptions.length > 0 && (
            <div>
              <p className={`text-xs mb-1.5 ${t.textFaint}`}>Quick filter by month</p>
              <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                {monthOptions.map(m => (
                  <button key={m.key} type="button" onClick={() => toggleMonthFilter(m)}
                    className={`shrink-0 px-2.5 py-1 rounded-full text-xs ${TYPE_WEIGHT.medium} whitespace-nowrap transition-colors ${activeMonth === m.key ? 'bg-brand-500/20 text-brand-400' : `${t.chipBg} ${t.textFaint} ${t.hoverBg} ${t.hoverText}`}`}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="max-w-sm">
            <EmployeeMultiPicker
              label="Employee(s)"
              placeholder="Scope to specific employee(s)…"
              value={employeePicks}
              onAdd={p => setEmployeePicks(prev => [...prev, p])}
              onRemove={id => setEmployeePicks(prev => prev.filter(p => p.id !== id))}
            />
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => { setSearch(''); setStatus('all'); setType('all'); setDateFrom(''); setDateTo(''); setEmployeePicks([]); }} className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors ${t.chipBg} ${t.textFaint} ${t.hoverBg} ${t.hoverText}`}>
              <X className="h-3.5 w-3.5" /> Clear
            </button>
            <button type="button" onClick={() => setDateSort(d => d === 'asc' ? 'desc' : 'asc')} title="Sort by date"
              className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition-colors ${t.chipBg} ${t.textFaint} ${t.hoverBg} ${t.hoverText}`}>
              {dateSort === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />} Date
            </button>
            <div className="ml-auto flex gap-1">
              <button type="button" title="Table view" onClick={() => setView('table')} className={`h-7 w-7 flex items-center justify-center rounded-lg transition-all ${view === 'table' ? 'bg-brand-500/20 text-brand-400' : `${t.chipBg} ${t.textFaint} ${t.hoverBg}`}`}><List className="h-3.5 w-3.5" /></button>
              <button type="button" title="Grid view" onClick={() => setView('grid')} className={`h-7 w-7 flex items-center justify-center rounded-lg transition-all ${view === 'grid' ? 'bg-brand-500/20 text-brand-400' : `${t.chipBg} ${t.textFaint} ${t.hoverBg}`}`}><LayoutGrid className="h-3.5 w-3.5" /></button>
            </div>
            <span className={`text-xs ${t.textFaint}`}>{filtered.length} of {records.length}</span>
          </div>
        </div>
      </div>

      {hasActiveFilter && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <AnalyzeStat icon={FileText} accent="blue" label="Instances (this view)" value={filteredSummary.instances} />
          <AnalyzeStat icon={Clock4} accent="violet" label="Total OT Hours" value={filteredSummary.totalHrs} suffix="h" decimals={1} />
          <AnalyzeStat icon={UsersRound} accent="indigo" label="Employees" value={filteredSummary.uniqueEmployees} />
          <AnalyzeStat icon={Gauge} accent="amber" label="Avg Hrs / Instance" value={filteredSummary.avgHours} suffix="h" decimals={1} />
        </div>
      )}

      <PillTabs
        tabs={[{ key: 'records', label: 'Records', icon: FileText }, { key: 'insights', label: 'Overtime Insights', icon: Lightbulb }, { key: 'weekly-summary', label: 'Weekly Summary', icon: CalendarRange }]}
        value={mainTab}
        onChange={setMainTab}
      />

      {mainTab === 'weekly-summary' ? (
        <WeeklySummaryView records={records} employees={employees} />
      ) : mainTab === 'records' ? (
        loading ? (
          <div className="flex items-center justify-center py-16"><RefreshCw className={`h-6 w-6 animate-spin ${t.textFaint}`} /></div>
        ) : filtered.length === 0 ? (
          <div className={`${t.glass} rounded-2xl ${t.shadow}`}>
            <EmptyState icon={Clock4} title="No overtime requests" message="No records match your filters."
              action={{ label: 'New Request', onClick: () => { setEditing(null); setFormOpen(true); } }} />
          </div>
        ) : view === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(r => <GridCard key={String(r.id)} r={r} />)}
          </div>
        ) : (
          <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
            {selectedIds.size > 0 && (
              <div className={`flex items-center gap-2 px-5 py-2.5 border-b ${t.border} bg-brand-500/[0.06]`}>
                <span className={`text-xs ${TYPE_WEIGHT.semibold} ${t.textPrimary}`}>{selectedIds.size} selected</span>
                <button type="button" onClick={() => setBulkAction('approve')} className={`flex items-center gap-1 text-[11px] ${TYPE_WEIGHT.semibold} px-2.5 py-1 rounded-lg bg-emerald-500/15 ${accentText('emerald', t.light)} hover:bg-emerald-500/25 transition-all`}><CheckCircle2 className="h-3 w-3" /> Approve</button>
                <button type="button" onClick={() => setBulkAction('reject')} className={`flex items-center gap-1 text-[11px] ${TYPE_WEIGHT.semibold} px-2.5 py-1 rounded-lg bg-rose-500/15 ${accentText('rose', t.light)} hover:bg-rose-500/25 transition-all`}><XCircle className="h-3 w-3" /> Reject</button>
                <button type="button" onClick={() => setSelectedIds(new Set())} className={`ml-auto text-[11px] ${t.textFaint} ${t.hoverText} transition-colors`}>Clear</button>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`border-b ${t.border}`}>
                  <tr>
                    <th className={`${thCls} w-8`}>
                      {pendingInView.length > 0 && <input type="checkbox" checked={allPendingSelected} onChange={toggleSelectAll} title="Select all pending" className="rounded" />}
                    </th>
                    <th className={thCls}>Employee</th><th className={thCls}>Type</th>
                    <th className={thCls}>
                      <button type="button" onClick={() => setDateSort(d => d === 'asc' ? 'desc' : 'asc')}
                        className={`flex items-center gap-0.5 ${t.hoverText} transition-colors`} title="Sort by date">
                        Date {dateSort === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>
                    </th>
                    <th className={thCls}>Hours</th><th className={thCls}>Reason</th><th className={thCls}>Status</th><th className={thCls}></th></tr>
                </thead>
                <tbody>
                  {filtered.map(r => {
                    const h = calcHours(r.start_time, r.end_time);
                    return (
                      <tr key={r.id} onClick={() => setViewing(r)} className={`border-b ${t.border} ${t.hoverBgSoft} transition-colors cursor-pointer`}>
                        <td className={tdCls} onClick={e => e.stopPropagation()}>
                          {r.status === 'pending' && <input type="checkbox" checked={selectedIds.has(String(r.id))} onChange={() => toggleSelect(String(r.id))} className="rounded" />}
                        </td>
                        <td className={tdCls}>
                          <div className="flex items-center gap-2.5">
                            <Avatar name={r.employee_name} />
                            <div><p className={`text-sm ${TYPE_WEIGHT.medium} ${t.textPrimary}`}>{r.employee_name}</p><p className={`text-[10px] ${t.textFaint}`}>{r.employee_id} · {r.position}</p></div>
                          </div>
                        </td>
                        <td className={tdCls}><div className="flex items-center gap-1.5 flex-wrap"><TypeBadge type={r.overtime_type} /><PlanningBadge status={r.planning_status} /><PayoutBadge method={r.payout_method} /></div></td>
                        <td className={tdCls}><p className="text-xs">{fmtDate(r.date)}</p><p className={`text-[10px] ${t.textFaint}`}>{r.start_time} – {r.end_time}</p></td>
                        <td className={tdCls}><span className={`text-xs ${TYPE_WEIGHT.semibold} text-brand-400`}>{h > 0 ? `${h.toFixed(1)}h` : '—'}</span></td>
                        <td className={tdCls}><span className={`text-xs max-w-[200px] truncate block ${t.textFaint}`}>{r.reason}</span></td>
                        <td className={tdCls}><StatusBadge color={STATUS_HEX[r.status]} label={r.status} /></td>
                        <td className={tdCls}>
                          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            <button type="button" title="View" onClick={() => setViewing(r)} className={`h-6 w-6 flex items-center justify-center rounded-md ${t.chipBg} ${t.hoverBg} ${t.textFaint} transition-all`}><Eye className="h-3 w-3" /></button>
                            <button type="button" title="Edit" onClick={() => { setEditing(r); setFormOpen(true); }} className={`h-6 w-6 flex items-center justify-center rounded-md ${t.chipBg} ${t.hoverBg} ${t.textFaint} transition-all`}><Edit className="h-3 w-3" /></button>
                            {r.status === 'pending' && (
                              <>
                                <button type="button" title="Approve" onClick={() => setApproving(r)} className={`h-6 w-6 flex items-center justify-center rounded-md bg-emerald-500/15 hover:bg-emerald-500/30 ${accentText('emerald', t.light)} transition-all`}><CheckCircle2 className="h-3 w-3" /></button>
                                <button type="button" title="Reject" onClick={() => setRejecting(r)} className={`h-6 w-6 flex items-center justify-center rounded-md bg-rose-500/15 hover:bg-rose-500/30 ${accentText('rose', t.light)} transition-all`}><XCircle className="h-3 w-3" /></button>
                              </>
                            )}
                            <button type="button" title="Delete" onClick={() => setDelTarget(r)} className={`h-6 w-6 flex items-center justify-center rounded-md ${t.chipBg} hover:bg-rose-500/20 ${t.textFaint} hover:${t.light ? 'text-rose-600' : 'text-rose-400'} transition-all`}><Trash2 className="h-3 w-3" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        <OvertimeInsightsView filtered={filtered} employees={employees} employeePicks={employeePicks} onToggleArtisan={toggleArtisanFilter} />
      )}

      <OTFormModal open={formOpen} onClose={() => { setFormOpen(false); setEditing(null); }} onSave={handleSave} editing={editing} records={records} />

      {viewing && (
        <OTDetailModal
          record={viewing}
          onClose={() => setViewing(null)}
          onEdit={() => { setEditing(viewing); setFormOpen(true); setViewing(null); }}
          onApprove={() => { setApproving(viewing); setViewing(null); }}
          onReject={() => { setRejecting(viewing); setViewing(null); }}
        />
      )}

      {approving && (
        <ApprovalGate
          title="Approve Overtime Request"
          description={`Approve OT for ${approving.employee_name} on ${fmtDate(approving.date)}`}
          actionLabel="Sign & Approve"
          requiredRole="manager"
          variant="approve"
          preferSavedSignature
          onConfirm={handleApprove}
          onCancel={() => setApproving(null)}
        />
      )}

      {rejecting && (
        <ApprovalGate
          title="Reject Overtime Request"
          description={`Reject OT for ${rejecting.employee_name} on ${fmtDate(rejecting.date)}`}
          actionLabel="Sign & Reject"
          requiredRole="manager"
          variant="reject"
          onConfirm={handleReject}
          onCancel={() => setRejecting(null)}
        />
      )}

      {bulkAction && (
        <ApprovalGate
          title={bulkAction === 'approve' ? `Approve ${selectedRecords.length} Overtime Request${selectedRecords.length !== 1 ? 's' : ''}` : `Reject ${selectedRecords.length} Overtime Request${selectedRecords.length !== 1 ? 's' : ''}`}
          description={`${selectedRecords.length} pending request${selectedRecords.length !== 1 ? 's' : ''} selected`}
          actionLabel={bulkAction === 'approve' ? 'Sign & Approve All' : 'Sign & Reject All'}
          requiredRole="manager"
          variant={bulkAction === 'approve' ? 'approve' : 'reject'}
          preferSavedSignature={bulkAction === 'approve'}
          onConfirm={bulkAction === 'approve' ? handleBulkApprove : handleBulkReject}
          onCancel={() => setBulkAction(null)}
        />
      )}

      <CenterModal open={!!delTarget} onClose={() => setDelTarget(null)} title="Delete Overtime Request" accent="amber" width="max-w-sm">
        <div className="p-5 space-y-4">
          <p className={`text-sm ${t.textMuted}`}>Delete overtime request for {delTarget?.employee_name}? This cannot be undone.</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setDelTarget(null)} className={`flex-1 py-2.5 rounded-xl text-sm ${t.textMuted} ${t.hoverText} border ${t.border} transition-all`}>Cancel</button>
            <button type="button" onClick={handleDelete} className={`flex-1 py-2.5 rounded-xl text-sm ${TYPE_WEIGHT.semibold} text-white bg-gradient-to-br from-rose-500 to-rose-700 hover:brightness-110 transition-all`}>Delete</button>
          </div>
        </div>
      </CenterModal>
    </main>
  );
}

export default function OvertimePage() {
  return (
    <AppShell>
      <OvertimeContent />
    </AppShell>
  );
}
