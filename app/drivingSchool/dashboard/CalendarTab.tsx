// app/drivingSchool/dashboard/CalendarTab.tsx — month-view calendar, complementing
// the per-instructor week Schedule tab: a business-wide view of booking density and
// income by day, with a click-through "by date" activity drill-down.
'use client';

import React, { useMemo, useState } from 'react';
import {
  useTheme, StatusBadge, CenterModal, ACCENT_HEX,
} from '@/components/shared/theme';
import { ChevronLeft, ChevronRight, Star, Clock4 } from '@/components/shared/theme';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/components/shared/utils';
import { isVip, type Booking, type LessonType, type Student } from './types';
import { toISODate, addDays } from './mockData';

const TYPE_HEX: Record<LessonType, string> = { Practical: ACCENT_HEX.blue, Highway: '#a78bfa', Theory: '#34d399', 'Test Prep': '#fbbf24' };
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAY_HEAD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function fmtDateLong(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

function getHeatColor(income: number, max: number, light: boolean): string {
  if (income === 0) return 'transparent';
  const intensity = Math.min(1, income / Math.max(max, 1));
  return light
    ? `rgba(124, 58, 237, ${0.08 + 0.3 * intensity})`
    : `rgba(167, 139, 250, ${0.1 + 0.35 * intensity})`;
}

export default function CalendarTab({ bookings, students }: {
  bookings: Booking[]; students: Student[];
}) {
  const t = useTheme();
  const [monthAnchor, setMonthAnchor] = useState(() => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d; });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const studentById = useMemo(() => new Map(students.map(s => [s.id, s])), [students]);

  const byDate = useMemo(() => {
    const map = new Map<string, Booking[]>();
    bookings.forEach(b => {
      if (b.status === 'cancelled') return;
      if (!map.has(b.date)) map.set(b.date, []);
      map.get(b.date)!.push(b);
    });
    return map;
  }, [bookings]);

  // Calendar grid: Monday-first, always 6 rows (42 cells) so the layout never
  // reflows between months with 4 vs 6 weeks.
  const gridDays = useMemo(() => {
    const firstOfMonth = monthAnchor;
    const firstWeekday = (firstOfMonth.getDay() + 6) % 7; // 0 = Monday
    const gridStart = addDays(firstOfMonth, -firstWeekday);
    return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  }, [monthAnchor]);

  const maxDayIncome = useMemo(() => {
    let max = 0;
    byDate.forEach(list => { const income = list.filter(b => b.payment_status === 'paid').reduce((s, b) => s + b.price, 0); if (income > max) max = income; });
    return max;
  }, [byDate]);

  const monthTotals = useMemo(() => {
    let income = 0, count = 0;
    gridDays.filter(d => d.getMonth() === monthAnchor.getMonth()).forEach(d => {
      const list = byDate.get(toISODate(d)) ?? [];
      income += list.filter(b => b.payment_status === 'paid').reduce((s, b) => s + b.price, 0);
      count += list.length;
    });
    return { income, count };
  }, [gridDays, byDate, monthAnchor]);

  const todayIso = toISODate(new Date());
  const selectedList = selectedDate ? (byDate.get(selectedDate) ?? []).slice().sort((a, b) => a.start_time.localeCompare(b.start_time)) : [];
  const selectedIncome = selectedList.filter(b => b.payment_status === 'paid').reduce((s, b) => s + b.price, 0);

  return (
    <div className="space-y-4">
      <div className={`${t.glass} rounded-2xl ${t.shadow} p-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between`}>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setMonthAnchor(a => { const d = new Date(a); d.setMonth(d.getMonth() - 1); return d; })}
            className={`h-8 w-8 flex items-center justify-center rounded-lg ${t.chipBg} ${t.hoverBg} ${t.textFaint}`}><ChevronLeft className="h-4 w-4" /></button>
          <span className={`text-sm font-semibold w-40 text-center ${t.textPrimary}`}>{MONTH_NAMES[monthAnchor.getMonth()]} {monthAnchor.getFullYear()}</span>
          <button type="button" onClick={() => setMonthAnchor(a => { const d = new Date(a); d.setMonth(d.getMonth() + 1); return d; })}
            className={`h-8 w-8 flex items-center justify-center rounded-lg ${t.chipBg} ${t.hoverBg} ${t.textFaint}`}><ChevronRight className="h-4 w-4" /></button>
          <button type="button" onClick={() => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); setMonthAnchor(d); }}
            className={`text-xs px-2.5 py-1.5 rounded-lg ${t.chipBg} ${t.hoverBg} ${t.textFaint}`}>This Month</button>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className={t.textFaint}>Month income: <span className={`font-semibold ${t.textPrimary}`}>{formatCurrency(monthTotals.income)}</span></span>
          <span className={t.textFaint}>Bookings: <span className={`font-semibold ${t.textPrimary}`}>{monthTotals.count}</span></span>
        </div>
      </div>

      <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
        <div className="grid grid-cols-7 gap-px p-2">
          {WEEKDAY_HEAD.map(d => <div key={d} className={`text-center text-[11px] font-semibold py-1.5 ${t.textFaint}`}>{d}</div>)}
          {gridDays.map(d => {
            const iso = toISODate(d);
            const inMonth = d.getMonth() === monthAnchor.getMonth();
            const isSunday = d.getDay() === 0;
            const list = byDate.get(iso) ?? [];
            const income = list.filter(b => b.payment_status === 'paid').reduce((s, b) => s + b.price, 0);
            const hasVip = list.some(b => { const st = studentById.get(b.student_id); return st && isVip(st); });
            const isToday = iso === todayIso;

            return (
              <button key={iso} type="button" disabled={isSunday} onClick={() => setSelectedDate(iso)}
                className={`min-h-[76px] rounded-lg p-1.5 text-left flex flex-col transition-all ${!inMonth ? 'opacity-30' : ''} ${isSunday ? 'cursor-not-allowed' : `${t.hoverBgSoft} cursor-pointer`} ${isToday ? 'ring-1 ring-brand-500/50' : ''}`}
                style={{ backgroundColor: isSunday ? 'transparent' : getHeatColor(income, maxDayIncome, t.light) }}>
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] font-semibold ${isToday ? 'text-brand-400' : t.textPrimary}`}>{d.getDate()}</span>
                  {hasVip && <Star className="h-2.5 w-2.5 text-amber-400" fill="currentColor" />}
                </div>
                {!isSunday && list.length > 0 && (
                  <div className="mt-auto space-y-0.5">
                    <div className={`text-[10px] font-semibold ${t.textPrimary}`}>{formatCurrency(income)}</div>
                    <div className={`text-[9.5px] ${t.textFaint}`}>{list.length} lesson{list.length === 1 ? '' : 's'}</div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <CenterModal open onClose={() => setSelectedDate(null)} title={fmtDateLong(selectedDate)} subtitle={`${selectedList.length} booking${selectedList.length === 1 ? '' : 's'} · ${formatCurrency(selectedIncome)} collected`} accent="violet" width="max-w-2xl">
          <div className="p-5 space-y-4">
            {selectedList.length === 0 ? (
              <p className={`text-sm text-center py-6 ${t.textFaint}`}>No bookings on this day.</p>
            ) : (
              <div className={`${t.chipBg} rounded-xl overflow-hidden max-h-96 overflow-y-auto`}>
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Time</TableHead><TableHead>Student</TableHead><TableHead>Instructor</TableHead><TableHead>Lesson</TableHead><TableHead>Price</TableHead><TableHead>Status</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedList.map(b => {
                      const st = studentById.get(b.student_id);
                      return (
                        <TableRow key={b.id}>
                          <TableCell className={`${t.textFaint} flex items-center gap-1`}><Clock4 className="h-3 w-3" />{b.start_time}</TableCell>
                          <TableCell className={`font-medium ${t.textPrimary}`}>
                            <span className="flex items-center gap-1">{b.student_name}{st && isVip(st) && <Star className="h-3 w-3 text-amber-400" fill="currentColor" />}</span>
                          </TableCell>
                          <TableCell className={t.textFaint}>{b.instructor_name}</TableCell>
                          <TableCell><StatusBadge color={TYPE_HEX[b.lesson_type]} label={b.lesson_type} /></TableCell>
                          <TableCell className={t.textPrimary}>{formatCurrency(b.price)}</TableCell>
                          <TableCell className={t.textFaint}>{b.status}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CenterModal>
      )}
    </div>
  );
}
