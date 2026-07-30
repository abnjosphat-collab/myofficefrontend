// app/drivingSchool/dashboard/StudentsTab.tsx — per-student activity view: spend,
// lesson history, progress toward test-readiness, VIP status. Derives every stat
// from the booking list rather than storing it on Student, so it can't drift out
// of sync with the records it's summarizing.
'use client';

import React, { useMemo, useState } from 'react';
import {
  useTheme, StatusBadge, SearchInput, SelectField, EmptyState, CenterModal,
  ACCENT_HEX,
} from '@/components/shared/theme';
import {
  Star, Phone, CheckCircle2, X, UserRound,
} from '@/components/shared/theme';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/components/shared/utils';
import { LESSON_TYPES, isVip, TYPE_HEX, type Booking, type LessonType, type Student, type VidTest } from './types';

const VID_STATUS_HEX: Record<VidTest['status'], string> = { scheduled: ACCENT_HEX.blue, passed: '#34d399', failed: '#f87171' };

const PACKAGE_HEX: Record<Student['package'], string> = { Basic: '#94a3b8', Standard: ACCENT_HEX.blue, Premium: '#fbbf24' };

// A student reads as "test ready" once they've logged 3+ completed Practical/
// Highway lessons and haven't already passed — a simple, explainable readiness
// signal for the coaching team, not a real DMV rule.
function isTestReady(completed: Booking[]): boolean {
  const roadLessons = completed.filter(b => b.lesson_type === 'Practical' || b.lesson_type === 'Highway').length;
  const alreadyPassed = completed.some(b => b.test_outcome === 'passed');
  return roadLessons >= 3 && !alreadyPassed;
}

function fmtDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

interface StudentStats {
  student: Student;
  totalSpent: number;
  totalLessons: number;
  byType: Record<LessonType, number>;
  lastLesson?: Booking;
  testReady: boolean;
  passed: boolean;
}

export default function StudentsTab({ students, bookings, vidTests }: { students: Student[]; bookings: Booking[]; vidTests: VidTest[] }) {
  const t = useTheme();
  const [search, setSearch] = useState('');
  const [pkgFilter, setPkgFilter] = useState('all');
  const [vipOnly, setVipOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'spend' | 'lessons'>('spend');
  const [opened, setOpened] = useState<Student | null>(null);

  const byStudent = useMemo(() => {
    const map = new Map<string, Booking[]>();
    bookings.forEach(b => { if (!map.has(b.student_id)) map.set(b.student_id, []); map.get(b.student_id)!.push(b); });
    return map;
  }, [bookings]);

  const vidByStudent = useMemo(() => {
    const map = new Map<string, VidTest[]>();
    vidTests.forEach(v => { if (!map.has(v.student_id)) map.set(v.student_id, []); map.get(v.student_id)!.push(v); });
    return map;
  }, [vidTests]);

  const stats: StudentStats[] = useMemo(() => students.map(student => {
    const own = byStudent.get(student.id) ?? [];
    const completed = own.filter(b => b.status === 'completed');
    const totalSpent = own.filter(b => b.payment_status === 'paid').reduce((s, b) => s + b.price, 0);
    const byType = { Practical: 0, Highway: 0, Theory: 0, 'Test Prep': 0 } as Record<LessonType, number>;
    completed.forEach(b => { byType[b.lesson_type] += 1; });
    const lastLesson = [...completed].sort((a, b) => (b.date + b.start_time).localeCompare(a.date + a.start_time))[0];
    return {
      student, totalSpent, totalLessons: completed.length, byType, lastLesson,
      testReady: isTestReady(completed),
      passed: completed.some(b => b.test_outcome === 'passed'),
    };
  }), [students, byStudent]);

  const filtered = useMemo(() => stats.filter(s => {
    if (vipOnly && !isVip(s.student)) return false;
    if (pkgFilter !== 'all' && s.student.package !== pkgFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!s.student.name.toLowerCase().includes(q) && !s.student.phone.includes(q)) return false;
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === 'name') return a.student.name.localeCompare(b.student.name);
    if (sortBy === 'lessons') return b.totalLessons - a.totalLessons;
    return b.totalSpent - a.totalSpent;
  }), [stats, search, pkgFilter, vipOnly, sortBy]);

  const openedStats = opened ? stats.find(s => s.student.id === opened.id) : undefined;
  const openedHistory = opened ? (byStudent.get(opened.id) ?? []).slice().sort((a, b) => (b.date + b.start_time).localeCompare(a.date + a.start_time)) : [];

  return (
    <div className="space-y-4">
      <div className={`${t.glass} rounded-2xl ${t.shadow} p-4`}>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between flex-wrap">
          <div className="flex flex-col sm:flex-row gap-2 flex-1">
            <SearchInput value={search} onChange={setSearch} placeholder="Search student, phone…" />
            <SelectField size="filter" title="Package" value={pkgFilter} onChange={setPkgFilter}
              options={[{ value: 'all', label: 'All Packages' }, { value: 'Basic', label: 'Basic' }, { value: 'Standard', label: 'Standard' }, { value: 'Premium', label: 'Premium' }]} />
            <SelectField size="filter" title="Sort by" value={sortBy} onChange={v => setSortBy(v as typeof sortBy)}
              options={[{ value: 'spend', label: 'Highest Spend' }, { value: 'lessons', label: 'Most Lessons' }, { value: 'name', label: 'Name (A–Z)' }]} />
          </div>
          <button type="button" onClick={() => setVipOnly(v => !v)}
            className={`flex items-center gap-1.5 h-9 px-3 rounded-lg text-[13px] font-semibold transition-colors ${vipOnly ? 'bg-amber-500/20 text-amber-400' : `${t.chipBg} ${t.textMuted} ${t.hoverBg}`}`}>
            <Star className="h-3.5 w-3.5" fill={vipOnly ? 'currentColor' : 'none'} /> VIP Only
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className={`${t.glass} rounded-2xl ${t.shadow}`}>
          <EmptyState icon={UserRound} title="No students" message="No students match your filters." />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(s => (
            <button key={s.student.id} type="button" onClick={() => setOpened(s.student)}
              className={`text-left ${t.glass} rounded-2xl ${t.shadow} p-4 hover:ring-1 hover:ring-brand-500/40 transition-all`}>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-9 w-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${PACKAGE_HEX[s.student.package]}22`, color: PACKAGE_HEX[s.student.package] }}>
                    <UserRound className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <div className={`font-semibold text-[14px] truncate ${t.textPrimary}`}>{s.student.name}</div>
                    <div className={`text-xs ${t.textFaint} flex items-center gap-1`}><Phone className="h-3 w-3" />{s.student.phone}</div>
                  </div>
                </div>
                {isVip(s.student) && <span title="VIP"><Star className="h-4 w-4 text-amber-400 shrink-0" fill="currentColor" /></span>}
              </div>

              <div className="flex flex-wrap gap-1.5 mb-3">
                <StatusBadge color={PACKAGE_HEX[s.student.package]} label={s.student.package} />
                {s.testReady && <StatusBadge color="#34d399" label="Test Ready" />}
                {s.passed && <StatusBadge color={ACCENT_HEX.blue} label="Passed" />}
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className={`${t.chipBg} rounded-xl p-2.5`}>
                  <div className={`text-[10px] ${t.textFaint}`}>Total Spent</div>
                  <div className={`text-base font-bold ${t.textPrimary}`}>{formatCurrency(s.totalSpent)}</div>
                </div>
                <div className={`${t.chipBg} rounded-xl p-2.5`}>
                  <div className={`text-[10px] ${t.textFaint}`}>Lessons Done</div>
                  <div className={`text-base font-bold ${t.textPrimary}`}>{s.totalLessons}</div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className={t.textFaint}>{s.student.lessonsRemaining} remaining</span>
                <span className={t.textFaint}>{s.lastLesson ? `Last: ${fmtDate(s.lastLesson.date)}` : 'No lessons yet'}</span>
              </div>

              {(() => {
                const nextVid = (vidByStudent.get(s.student.id) ?? []).find(v => v.status === 'scheduled');
                return nextVid ? (
                  <div className={`mt-2.5 pt-2.5 border-t ${t.border} flex items-center gap-1.5 text-[11px]`}>
                    <StatusBadge color={VID_STATUS_HEX.scheduled} label={`${nextVid.type} test · ${fmtDate(nextVid.date)}`} />
                  </div>
                ) : null;
              })()}
            </button>
          ))}
        </div>
      )}

      {opened && openedStats && (
        <CenterModal open onClose={() => setOpened(null)} title={opened.name} subtitle={`${opened.phone} · Joined ${fmtDate(opened.joined_date)}`} accent="violet" width="max-w-2xl">
          <div className="p-5 space-y-4">
            <div className="flex flex-wrap gap-1.5">
              <StatusBadge color={PACKAGE_HEX[opened.package]} label={`${opened.package} Package`} />
              {isVip(opened) && <StatusBadge color="#fbbf24" label="VIP" />}
              {openedStats.testReady && <StatusBadge color="#34d399" label="Test Ready" />}
              {openedStats.passed && <StatusBadge color={ACCENT_HEX.blue} label="Passed Test" />}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className={`${t.chipBg} rounded-xl p-3`}>
                <div className={`text-[10px] ${t.textFaint}`}>Total Spent</div>
                <div className={`text-lg font-bold ${t.textPrimary}`}>{formatCurrency(openedStats.totalSpent)}</div>
              </div>
              <div className={`${t.chipBg} rounded-xl p-3`}>
                <div className={`text-[10px] ${t.textFaint}`}>Lessons Done</div>
                <div className={`text-lg font-bold ${t.textPrimary}`}>{openedStats.totalLessons}</div>
              </div>
              <div className={`${t.chipBg} rounded-xl p-3`}>
                <div className={`text-[10px] ${t.textFaint}`}>Remaining</div>
                <div className={`text-lg font-bold ${t.textPrimary}`}>{opened.lessonsRemaining}</div>
              </div>
              <div className={`${t.chipBg} rounded-xl p-3`}>
                <div className={`text-[10px] ${t.textFaint}`}>Member For</div>
                <div className={`text-lg font-bold ${t.textPrimary}`}>{Math.max(1, Math.round((Date.now() - new Date(`${opened.joined_date}T00:00:00`).getTime()) / (1000 * 60 * 60 * 24 * 30)))}mo</div>
              </div>
            </div>

            {(vidByStudent.get(opened.id) ?? []).length > 0 && (
              <div>
                <p className={`text-xs font-semibold ${t.textFaint} uppercase tracking-wider mb-2`}>VID Test Appointments</p>
                <div className="flex flex-wrap gap-2">
                  {(vidByStudent.get(opened.id) ?? []).map(v => (
                    <StatusBadge key={v.id} color={VID_STATUS_HEX[v.status]} label={`${v.type} · ${fmtDate(v.date)} · ${v.venue} · ${v.status}`} />
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className={`text-xs font-semibold ${t.textFaint} uppercase tracking-wider mb-2`}>Lessons by Type</p>
              <div className="flex flex-wrap gap-2">
                {LESSON_TYPES.map(lt => openedStats.byType[lt] > 0 && (
                  <StatusBadge key={lt} color={TYPE_HEX[lt]} label={`${lt} × ${openedStats.byType[lt]}`} />
                ))}
                {openedStats.totalLessons === 0 && <span className={`text-xs ${t.textFaint}`}>No completed lessons yet.</span>}
              </div>
            </div>

            <div>
              <p className={`text-xs font-semibold ${t.textFaint} uppercase tracking-wider mb-2`}>Booking History</p>
              <div className={`${t.chipBg} rounded-xl overflow-hidden max-h-64 overflow-y-auto`}>
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Date</TableHead><TableHead>Lesson</TableHead><TableHead>Instructor</TableHead><TableHead>Status</TableHead><TableHead>Payment</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {openedHistory.map(b => (
                      <TableRow key={b.id}>
                        <TableCell className={t.textFaint}>{fmtDate(b.date)} · {b.start_time}</TableCell>
                        <TableCell><StatusBadge color={TYPE_HEX[b.lesson_type]} label={b.lesson_type} /></TableCell>
                        <TableCell className={t.textFaint}>{b.instructor_name}</TableCell>
                        <TableCell className={t.textFaint}>
                          {b.status}{b.test_outcome && (b.test_outcome === 'passed' ? <CheckCircle2 className="h-3 w-3 inline ml-1 text-emerald-400" /> : <X className="h-3 w-3 inline ml-1 text-rose-400" />)}
                        </TableCell>
                        <TableCell className={t.textFaint}>{b.payment_status}</TableCell>
                      </TableRow>
                    ))}
                    {openedHistory.length === 0 && (
                      <TableRow><TableCell className={t.textFaint}>No bookings yet.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </CenterModal>
      )}
    </div>
  );
}
