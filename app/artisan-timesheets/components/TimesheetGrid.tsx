'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { formatDate } from '@/lib/format';
import { SelectField, TYPE_WEIGHT, accentText } from '@/components/shared/theme';
import type { SignatureReuseOption } from '@/components/shared/SignaturePad';
import { toast } from 'sonner';
import { calcArtisanTimesheetTotals } from '../calcTotals';
import { DAY_STATUS_OPTIONS, applyDayStatus, type DayStatusKey } from '../dayStatus';
import {
  FILL_COLUMN_LABELS,
  HOUR_FIELDS,
  fillColumnDown,
  type FillColumn,
  type FillTarget,
} from '../fillHours';
import { formatHourInput, roundHours2 } from '../hourFormat';
import type { ArtisanTimesheetDayRow } from '../types';
import { CommentsPopover } from './CommentsPopover';
import { FillCell } from './FillCell';
import { SignatureFieldModal } from './SignatureFieldModal';

const STANDBY_OPTIONS = [
  { value: '', label: '—' },
  { value: 'yes', label: 'On Standby' },
];

const ZERO_NORMAL_STATUS = new Set(['off', 'absent']);

/** Fixed widths for frozen Date / Day / Status columns — must match <colgroup>. */
const FROZEN_WIDTHS = { date: 92, day: 48, status: 120 } as const;
const FROZEN_LEFT = {
  date: 0,
  day: FROZEN_WIDTHS.date,
  status: FROZEN_WIDTHS.date + FROZEN_WIDTHS.day,
} as const;

const SCROLL_EDGE_PX = 48;
const SCROLL_STEP_PX = 16;

function bodyRowBg(index: number): string {
  return index % 2 ? 'bg-slate-50 dark:bg-slate-900' : 'bg-white dark:bg-slate-950';
}

function frozenColStyle(col: 'date' | 'day' | 'status', enabled: boolean): React.CSSProperties | undefined {
  if (!enabled) return undefined;
  return { left: FROZEN_LEFT[col], minWidth: FROZEN_WIDTHS[col], maxWidth: FROZEN_WIDTHS[col] };
}

interface TimesheetGridProps {
  rows: ArtisanTimesheetDayRow[];
  employeeName: string;
  onChange: (rows: ArtisanTimesheetDayRow[]) => void;
  inputCls: string;
  t: ReturnType<typeof import('@/components/shared/theme').useTheme>;
  reuseSignatures?: SignatureReuseOption[];
}

export function TimesheetGrid({
  rows,
  employeeName,
  onChange,
  inputCls,
  t,
  reuseSignatures = [],
}: TimesheetGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [fillDrag, setFillDrag] = useState<{ target: FillTarget; source: number; end: number } | null>(null);
  const [freezeHeader, setFreezeHeader] = useState(true);
  const [freezeCols, setFreezeCols] = useState(true);

  const totals = calcArtisanTimesheetTotals(rows);
  const headerBg = 'bg-slate-100 dark:bg-slate-900';

  const updateRow = useCallback((index: number, patch: Partial<ArtisanTimesheetDayRow>) => {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch, _auto: false } : row)));
  }, [rows, onChange]);

  const applyFill = useCallback((source: number, end: number, target: FillTarget) => {
    if (end <= source || target === 'all-hours') return;
    const next = fillColumnDown(rows, target, source, end);
    onChange(next);
    const count = end - source;
    toast.success(`Copied ${FILL_COLUMN_LABELS[target]} to ${count} day${count === 1 ? '' : 's'}`);
  }, [rows, onChange]);

  useEffect(() => {
    if (!fillDrag) return;

    const onMouseMove = (e: MouseEvent) => {
      const scroller = scrollRef.current;
      if (scroller) {
        const rect = scroller.getBoundingClientRect();
        if (e.clientY > rect.bottom - SCROLL_EDGE_PX) scroller.scrollTop += SCROLL_STEP_PX;
        else if (e.clientY < rect.top + SCROLL_EDGE_PX) scroller.scrollTop -= SCROLL_STEP_PX;
        if (e.clientX > rect.right - SCROLL_EDGE_PX) scroller.scrollLeft += SCROLL_STEP_PX;
        else if (e.clientX < rect.left + SCROLL_EDGE_PX) scroller.scrollLeft -= SCROLL_STEP_PX;
      }

      const under = document.elementFromPoint(e.clientX, e.clientY);
      const tr = under?.closest('tr[data-row-index]');
      if (tr) {
        const idx = Number(tr.getAttribute('data-row-index'));
        if (!Number.isNaN(idx) && idx > fillDrag.source) {
          setFillDrag(prev => (prev ? { ...prev, end: idx } : null));
        }
      }
    };

    const onMouseUp = () => {
      if (fillDrag.end > fillDrag.source) applyFill(fillDrag.source, fillDrag.end, fillDrag.target);
      setFillDrag(null);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [fillDrag, applyFill]);

  const startColumnFill = (rowIndex: number, column: FillColumn) => {
    setFillDrag({ target: column, source: rowIndex, end: rowIndex });
  };

  const cellState = (rowIndex: number, column: FillColumn) => {
    if (!fillDrag || fillDrag.target !== column) return { active: false, preview: false };
    return {
      active: fillDrag.source === rowIndex,
      preview: rowIndex > fillDrag.source && rowIndex <= fillDrag.end,
    };
  };

  const frozenTh = (col: 'date' | 'day' | 'status', extra = '') => {
    const corner = freezeHeader && freezeCols ? 'z-50' : freezeHeader ? 'z-30' : freezeCols ? 'z-40' : '';
    return [
      'px-1.5 py-2 text-left align-top overflow-hidden',
      headerBg,
      freezeHeader ? 'sticky top-0' : '',
      freezeCols ? 'sticky' : '',
      freezeCols && col === 'status' ? 'shadow-[4px_0_10px_-4px_rgba(0,0,0,0.18)]' : '',
      corner,
      extra,
    ].filter(Boolean).join(' ');
  };

  const frozenTd = (col: 'date' | 'day' | 'status', rowIndex: number, extra = '') => {
    const bg = bodyRowBg(rowIndex);
    return [
      'px-1.5 py-1 align-top overflow-hidden',
      bg,
      freezeCols ? 'sticky z-20' : '',
      freezeCols && col === 'status' ? 'shadow-[4px_0_10px_-4px_rgba(0,0,0,0.12)]' : '',
      extra,
    ].filter(Boolean).join(' ');
  };

  const scrollHeader = freezeHeader ? `sticky top-0 z-30 ${headerBg}` : '';

  return (
    <div className={`rounded-xl border overflow-hidden ${fillDrag ? 'select-none' : ''}`}>
      <div className={`flex flex-wrap items-center gap-4 px-3 py-2 border-b ${t.border} ${t.chipBg}`}>
        <span className={`text-xs ${TYPE_WEIGHT.medium} ${t.textMuted}`}>Freeze panes</span>
        <label className={`inline-flex items-center gap-1.5 text-xs cursor-pointer ${t.textMuted}`}>
          <input type="checkbox" checked={freezeHeader} onChange={e => setFreezeHeader(e.target.checked)} className="rounded accent-brand-500" />
          Header row
        </label>
        <label className={`inline-flex items-center gap-1.5 text-xs cursor-pointer ${t.textMuted}`}>
          <input type="checkbox" checked={freezeCols} onChange={e => setFreezeCols(e.target.checked)} className="rounded accent-brand-500" />
          Date &amp; status columns
        </label>
        <span className={`text-[10px] ${t.textFaint} ml-auto`}>
          Scroll to the last row/column · drag near edges to auto-scroll while filling
        </span>
      </div>

      <div
        ref={scrollRef}
        className="overflow-auto max-h-[min(75vh,800px)] overscroll-contain"
        style={{ scrollPaddingBottom: 12, scrollPaddingRight: 12 }}
      >
        <table className="w-full text-xs min-w-[1380px] border-collapse">
          <colgroup>
            <col style={{ width: FROZEN_WIDTHS.date }} />
            <col style={{ width: FROZEN_WIDTHS.day }} />
            <col style={{ width: FROZEN_WIDTHS.status }} />
          </colgroup>
          <thead>
            <tr className={`border-b ${t.border}`}>
              <th className={frozenTh('date')} style={frozenColStyle('date', freezeCols)}>Date</th>
              <th className={frozenTh('day')} style={frozenColStyle('day', freezeCols)}>Day</th>
              <th className={frozenTh('status')} style={frozenColStyle('status', freezeCols)}>
                <div className="leading-tight">Status</div>
                <div className={`text-[9px] font-normal ${t.textFaint} truncate`} title="Auto-filled from Leaves module">
                  From Leaves
                </div>
              </th>
              {HOUR_FIELDS.map(field => (
                <th key={field} className={`px-1 py-2 text-center font-semibold whitespace-nowrap min-w-[72px] ${scrollHeader}`}>
                  {FILL_COLUMN_LABELS[field]}
                </th>
              ))}
              <th className={`px-1 py-2 text-center min-w-[88px] ${scrollHeader}`}>Standby</th>
              <th className={`px-1 py-2 min-w-[56px] ${scrollHeader}`}>In time</th>
              <th className={`px-1 py-2 min-w-[80px] ${scrollHeader}`}>Sign in</th>
              <th className={`px-1 py-2 min-w-[56px] ${scrollHeader}`}>Out time</th>
              <th className={`px-1 py-2 min-w-[80px] ${scrollHeader}`}>Sign out</th>
              <th className={`px-1 py-2 min-w-[260px] ${scrollHeader}`}>Comments</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.date}
                data-row-index={i}
                className={`border-b ${t.border} ${bodyRowBg(i)} ${row.on_standby ? '!bg-amber-500/5' : ''}`}
              >
                <td className={`${frozenTd('date', i)} whitespace-nowrap`} style={frozenColStyle('date', freezeCols)}>
                  {formatDate(row.date)}
                  {row._auto && (
                    <span
                      className={`ml-1 inline-block h-1.5 w-1.5 rounded-full ${accentText('brand', t.light)} bg-current opacity-60`}
                      title="Auto-filled from system data"
                    />
                  )}
                </td>
                <td className={frozenTd('day', i)} style={frozenColStyle('day', freezeCols)}>{row.day}</td>

                <FillCell
                  rowIndex={i}
                  column="day_status"
                  {...cellState(i, 'day_status')}
                  onStartFill={startColumnFill}
                  className={`${frozenTd('status', i)} !px-0.5 !py-0.5 ${cellState(i, 'day_status').preview ? '!bg-brand-500/12' : ''}`}
                  style={frozenColStyle('status', freezeCols)}
                >
                  <SelectField
                    size="filter"
                    title="Day status"
                    value={row.day_status}
                    onChange={v => updateRow(i, applyDayStatus(row, v as DayStatusKey))}
                    options={DAY_STATUS_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
                  />
                </FillCell>

                {HOUR_FIELDS.map(field => (
                  <FillCell
                    key={field}
                    rowIndex={i}
                    column={field}
                    {...cellState(i, field)}
                    onStartFill={startColumnFill}
                    className={cellState(i, field).preview ? '!bg-brand-500/12' : ''}
                  >
                    <input
                      type="number"
                      min={0}
                      step={0.25}
                      disabled={ZERO_NORMAL_STATUS.has(row.day_status) && field === 'normal_hrs'}
                      className={`${inputCls} w-[68px] text-center mx-auto block tabular-nums ${ZERO_NORMAL_STATUS.has(row.day_status) && field === 'normal_hrs' ? 'opacity-40' : ''}`}
                      value={formatHourInput(row[field])}
                      onChange={e => {
                        const raw = e.target.value.trim();
                        const n = raw === '' ? 0 : Number(raw);
                        updateRow(i, { [field]: Number.isFinite(n) ? roundHours2(n) : 0 });
                      }}
                      onBlur={e => {
                        const raw = e.target.value.trim();
                        if (raw === '') return;
                        const n = Number(raw);
                        if (Number.isFinite(n)) updateRow(i, { [field]: roundHours2(n) });
                      }}
                      onClick={e => e.stopPropagation()}
                      aria-label={`${field} ${row.date}`}
                    />
                  </FillCell>
                ))}

                <FillCell
                  rowIndex={i}
                  column="on_standby"
                  {...cellState(i, 'on_standby')}
                  onStartFill={startColumnFill}
                  className={cellState(i, 'on_standby').preview ? '!bg-brand-500/12' : ''}
                >
                  <SelectField
                    size="filter"
                    title="Standby"
                    value={row.on_standby ? 'yes' : ''}
                    onChange={v => updateRow(i, { on_standby: v === 'yes' })}
                    options={STANDBY_OPTIONS}
                  />
                </FillCell>

                <td className="px-0.5 py-0.5">
                  <input
                    className={`${inputCls} w-14`}
                    value={row.sign_in_time}
                    onChange={e => updateRow(i, { sign_in_time: e.target.value })}
                    aria-label={`Sign in time ${row.date}`}
                  />
                </td>

                <FillCell
                  rowIndex={i}
                  column="sign_in_signature"
                  {...cellState(i, 'sign_in_signature')}
                  onStartFill={startColumnFill}
                  className={cellState(i, 'sign_in_signature').preview ? '!bg-brand-500/12' : ''}
                >
                  <SignatureFieldModal
                    compact
                    label={`Sign in — ${formatDate(row.date)}`}
                    signerName={employeeName}
                    value={row.sign_in_signature}
                    reuseSignatures={reuseSignatures}
                    onChange={url => updateRow(i, { sign_in_signature: url })}
                  />
                </FillCell>

                <td className="px-0.5 py-0.5">
                  <input
                    className={`${inputCls} w-14`}
                    value={row.sign_out_time}
                    onChange={e => updateRow(i, { sign_out_time: e.target.value })}
                    aria-label={`Sign out time ${row.date}`}
                  />
                </td>

                <FillCell
                  rowIndex={i}
                  column="sign_out_signature"
                  {...cellState(i, 'sign_out_signature')}
                  onStartFill={startColumnFill}
                  className={cellState(i, 'sign_out_signature').preview ? '!bg-brand-500/12' : ''}
                >
                  <SignatureFieldModal
                    compact
                    label={`Sign out — ${formatDate(row.date)}`}
                    signerName={employeeName}
                    value={row.sign_out_signature}
                    reuseSignatures={reuseSignatures}
                    onChange={url => updateRow(i, { sign_out_signature: url })}
                  />
                </FillCell>

                <td className="px-0.5 py-0.5 min-w-[260px]">
                  <CommentsPopover value={row.comments} onChange={v => updateRow(i, { comments: v })} dateLabel={formatDate(row.date)} />
                </td>
              </tr>
            ))}
            <tr data-row-index={rows.length} className={`font-semibold border-t-2 ${t.border} ${headerBg}`}>
              <td colSpan={3} className={`px-1.5 py-2 sticky left-0 ${headerBg}`} style={frozenColStyle('date', freezeCols)}>
                TOTALS
              </td>
              <td className="px-1.5 py-2 text-center tabular-nums">{totals.normal_hrs.toFixed(2)}</td>
              <td className="px-1.5 py-2 text-center tabular-nums">{totals.ot_15.toFixed(2)}</td>
              <td className="px-1.5 py-2 text-center tabular-nums">{totals.ot_20.toFixed(2)}</td>
              <td className="px-1.5 py-2 text-center tabular-nums">{totals.sb_15.toFixed(2)}</td>
              <td className="px-1.5 py-2 text-center tabular-nums">{totals.sb_20.toFixed(2)}</td>
              <td className="px-1.5 py-2 text-center tabular-nums">{totals.night_shift.toFixed(2)}</td>
              <td colSpan={6} className="px-1.5 py-2" />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
