// app/drivingSchool/dashboard/page.tsx — driving-school prototype "app" view,
// reached from the /drivingSchool marketing homepage. Same convention as the
// other vertical-app demos: frontend-only, mock/generated data, no backend or
// AppShell (standalone route, not part of the real MyOffice module set).
'use client';

import React, { useMemo, useState, ElementType } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  useTheme, PageHero, StatTile, StatusBadge, ProgressBar, FormField,
  CenterModal, ACCENT_HEX, EmptyState, PrimaryButton, SelectField, SearchInput,
} from '@/components/shared/theme';
import {
  Car, GraduationCap, CalendarDays, Calendar, CreditCard, Users, TrendingUp, Clock4,
  CheckCircle2, XCircle, Plus, ArrowLeft, ChevronLeft, ChevronRight, Wrench,
  UsersRound, Activity, Star, X, Gauge, UserRound, ClipboardCheck,
} from '@/components/shared/theme';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/components/shared/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import {
  LESSON_TYPES, LESSON_PRICE, WEEKDAY_NAMES, isVip, TYPE_HEX, fmtDate,
  type Booking, type BookingStatus, type Instructor, type LessonType, type PaymentStatus, type Student, type VidTest,
} from './types';
import { generateAllMockData, businessSlots, toISODate, addDays } from './mockData';
import StudentsTab from './StudentsTab';
import CalendarTab from './CalendarTab';

const STATUS_HEX: Record<BookingStatus, string> = { upcoming: ACCENT_HEX.blue, completed: '#34d399', cancelled: '#94a3b8' };
const PAYMENT_HEX: Record<PaymentStatus, string> = { paid: '#34d399', pending: '#fbbf24', overdue: '#f87171' };

// A single-hue violet scale (matching the app's own brand accent) reads as far
// more refined than a traffic-light blue/amber/red ramp for a density map —
// darker/more saturated simply means busier, no colour-meaning to decode.
const getHeatColor = (value: number, max: number, light: boolean): string => {
  if (value === 0) return light ? 'rgba(124,58,237,0.04)' : 'rgba(167,139,250,0.05)';
  const intensity = Math.min(1, value / Math.max(max, 1));
  return light
    ? `rgba(124, 58, 237, ${0.1 + 0.55 * intensity})`
    : `rgba(167, 139, 250, ${0.14 + 0.6 * intensity})`;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function mondayOf(d: Date): Date {
  const r = new Date(d);
  const dow = r.getDay();
  r.setDate(r.getDate() - ((dow + 6) % 7));
  r.setHours(0, 0, 0, 0);
  return r;
}
type Tab = 'overview' | 'bookings' | 'schedule' | 'calendar' | 'students' | 'payments' | 'analytics';

export default function DrivingSchoolDashboard() {
  const t = useTheme();
  const [seed] = useState(() => generateAllMockData());
  const { instructors, students, vidTests } = seed;
  const [bookings, setBookings] = useState<Booking[]>(seed.bookings);

  const [tab, setTab] = useState<Tab>('overview');
  const [bookingModal, setBookingModal] = useState<{ instructorId?: string; date?: string; slot?: string } | null>(null);

  return (
    <div className={`min-h-screen ${t.pageBg}`}>
      <main className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/drivingSchool" className={`flex items-center gap-1.5 text-sm ${t.textFaint} hover:${t.textPrimary} transition-colors`}>
            <ArrowLeft className="h-4 w-4" /> Back to RoadReady
          </Link>
        </div>

        <PageHero
          icon={Car} accent="violet"
          crumbs={['RoadReady', 'Dashboard']}
          title="School Dashboard"
          description="Bookings, schedules, payments and performance — all in one place."
          actions={
            <PrimaryButton onClick={() => setBookingModal({})}>
              <Plus className="h-4 w-4" /> New Booking
            </PrimaryButton>
          }
        />

        <div className={`flex items-center gap-1 ${t.glassSoft} rounded-xl p-1 w-fit overflow-x-auto`}>
          {([
            { key: 'overview', label: 'Overview', icon: TrendingUp },
            { key: 'bookings', label: 'Bookings', icon: CalendarDays },
            { key: 'schedule', label: 'Schedule', icon: Clock4 },
            { key: 'calendar', label: 'Calendar', icon: CalendarDays },
            { key: 'students', label: 'Students', icon: UserRound },
            { key: 'payments', label: 'Payments', icon: CreditCard },
            { key: 'analytics', label: 'Analytics', icon: Activity },
          ] as { key: Tab; label: string; icon: ElementType }[]).map(tb => (
            <button key={tb.key} type="button" onClick={() => setTab(tb.key)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${tab === tb.key ? 'bg-brand-500/20 text-brand-400' : `${t.textFaint} hover:${t.textPrimary} ${t.hoverBg}`}`}>
              <tb.icon className="h-4 w-4" />{tb.label}
            </button>
          ))}
        </div>

        {tab === 'overview' && <OverviewTab bookings={bookings} instructors={instructors} students={students} vidTests={vidTests} />}
        {tab === 'bookings' && <BookingsTab bookings={bookings} students={students} onNewBooking={() => setBookingModal({})} />}
        {tab === 'schedule' && (
          <ScheduleTab
            bookings={bookings}
            instructors={instructors}
            students={students}
            onSlotClick={(instructorId, date, slot) => setBookingModal({ instructorId, date, slot })}
          />
        )}
        {tab === 'calendar' && <CalendarTab bookings={bookings} students={students} />}
        {tab === 'students' && <StudentsTab students={students} bookings={bookings} vidTests={vidTests} />}
        {tab === 'payments' && (
          <PaymentsTab
            bookings={bookings}
            onRecordPayment={(id) => {
              setBookings(prev => prev.map(b => b.id === id ? { ...b, payment_status: 'paid' } : b));
              toast.success('Payment recorded');
            }}
          />
        )}
        {tab === 'analytics' && <AnalyticsTab bookings={bookings} instructors={instructors} students={students} />}

        {bookingModal && (
          <NewBookingModal
            instructors={instructors}
            students={students}
            bookings={bookings}
            initial={bookingModal}
            onClose={() => setBookingModal(null)}
            onCreate={(b) => {
              setBookings(prev => [...prev, b]);
              setBookingModal(null);
              toast.success(`Lesson booked for ${b.student_name}`);
            }}
          />
        )}
      </main>
    </div>
  );
}

// ─── OVERVIEW ───────────────────────────────────────────────────────────────

function OverviewTab({ bookings, instructors, students, vidTests }: { bookings: Booking[]; instructors: Instructor[]; students: Student[]; vidTests: VidTest[] }) {
  const t = useTheme();
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);

  const upcomingVidTests = useMemo(() => vidTests
    .filter(v => v.status === 'scheduled')
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6), [vidTests]);

  const stats = useMemo(() => {
    const paid = bookings.filter(b => b.payment_status === 'paid');
    const totalIncome = paid.reduce((s, b) => s + b.price, 0);
    const now = new Date();
    const thisMonthIncome = paid.filter(b => { const d = new Date(`${b.date}T00:00:00`); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).reduce((s, b) => s + b.price, 0);
    const upcoming = bookings.filter(b => b.status === 'upcoming').length;
    const activeStudents = new Set(bookings.filter(b => b.status !== 'cancelled').map(b => b.student_id)).size;
    const completedCount = bookings.filter(b => b.status === 'completed').length;
    const avgPrice = completedCount > 0 ? bookings.filter(b => b.status === 'completed').reduce((s, b) => s + b.price, 0) / completedCount : 0;
    const vipCount = students.filter(isVip).length;
    return { totalIncome, thisMonthIncome, upcoming, activeStudents, avgPrice: Math.round(avgPrice * 100) / 100, vipCount };
  }, [bookings, students]);

  const monthlyIncome = useMemo(() => {
    const now = new Date();
    const months: { key: string; label: string; income: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: MONTHS[d.getMonth()], income: 0 });
    }
    bookings.filter(b => b.payment_status === 'paid').forEach(b => {
      const d = new Date(`${b.date}T00:00:00`);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const m = months.find(x => x.key === key);
      if (m) m.income += b.price;
    });
    return months;
  }, [bookings]);

  const occupancy = useMemo(() => {
    const slots = businessSlots();
    let booked = 0, total = 0;
    for (let i = 0; i < 7; i++) {
      const d = addDays(today, i);
      if (d.getDay() === 0) continue;
      total += slots.length * instructors.length;
      const iso = toISODate(d);
      booked += bookings.filter(b => b.date === iso && b.status !== 'cancelled').length;
    }
    return total > 0 ? Math.round((booked / total) * 100) : 0;
  }, [bookings, instructors, today]);

  const nextFreeSlots = useMemo(() => {
    const slots = businessSlots();
    const free: { instructor: Instructor; date: string; slot: string }[] = [];
    for (let i = 0; i < 6 && free.length < 6; i++) {
      const d = addDays(today, i);
      if (d.getDay() === 0) continue;
      const iso = toISODate(d);
      for (const instructor of instructors) {
        for (const slot of slots) {
          if (free.length >= 6) break;
          const taken = bookings.some(b => b.date === iso && b.instructor_id === instructor.id && b.start_time === slot && b.status !== 'cancelled');
          if (!taken) free.push({ instructor, date: iso, slot });
        }
      }
    }
    return free;
  }, [bookings, instructors, today]);

  const maxMonthly = Math.max(1, ...monthlyIncome.map(m => m.income));
  const axisColor = t.light ? 'rgba(15,23,42,0.4)' : 'rgba(255,255,255,0.4)';
  const gridColor = t.light ? 'rgba(15,23,42,0.06)' : 'rgba(255,255,255,0.06)';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatTile icon={CreditCard} color={ACCENT_HEX.emerald} label="Total Income" value={formatCurrency(stats.totalIncome)} />
        <StatTile icon={TrendingUp} color={ACCENT_HEX.blue} label="This Month" value={formatCurrency(stats.thisMonthIncome)} />
        <StatTile icon={CalendarDays} color={ACCENT_HEX.indigo} label="Upcoming Lessons" value={stats.upcoming} />
        <StatTile icon={UsersRound} color={ACCENT_HEX.violet} label="Active Students" value={stats.activeStudents} />
        <StatTile icon={Star} color="#fbbf24" label="VIP Students" value={stats.vipCount} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
          <div className={`flex items-center gap-2 px-5 py-3 border-b ${t.border}`}><TrendingUp className="h-4 w-4 text-brand-400" /><span className={`font-semibold text-sm ${t.textPrimary}`}>Income — Last 6 Months</span></div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyIncome} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="label" tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: t.light ? '#fff' : '#0f1e2e', border: `1px solid ${t.light ? 'rgba(15,23,42,0.1)' : 'rgba(134,187,216,0.2)'}`, borderRadius: 12, color: t.light ? '#0f172a' : '#fff', fontSize: 12 }} formatter={(v: number) => [formatCurrency(v), 'Income']} />
                <Bar dataKey="income" name="Income" radius={[6, 6, 0, 0]} fill={ACCENT_HEX.emerald} fillOpacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
          <div className={`flex items-center gap-2 px-5 py-3 border-b ${t.border}`}><Activity className="h-4 w-4 text-brand-400" /><span className={`font-semibold text-sm ${t.textPrimary}`}>This Week</span></div>
          <div className="p-4 space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1"><span className={t.textFaint}>Slot Occupancy</span><span className={`font-semibold ${t.textPrimary}`}>{occupancy}%</span></div>
              <ProgressBar value={occupancy} color={ACCENT_HEX.blue} showValue={false} />
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className={`${t.chipBg} rounded-xl p-3`}>
                <div className={`text-[10px] ${t.textFaint}`}>Avg. Lesson Price</div>
                <div className={`text-lg font-bold ${t.textPrimary}`}>{formatCurrency(stats.avgPrice)}</div>
              </div>
              <div className={`${t.chipBg} rounded-xl p-3`}>
                <div className={`text-[10px] ${t.textFaint}`}>Instructors</div>
                <div className={`text-lg font-bold ${t.textPrimary}`}>{instructors.length}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
        <div className={`flex items-center gap-2 px-5 py-3 border-b ${t.border}`}><Clock4 className="h-4 w-4 text-brand-400" /><span className={`font-semibold text-sm ${t.textPrimary}`}>Next Available Slots</span></div>
        <div className="p-4 flex flex-wrap gap-2">
          {nextFreeSlots.map((f, i) => (
            <div key={i} className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border ${t.border} ${t.chipBg} ${t.textPrimary}`}>
              <span className="font-medium">{fmtDate(f.date)} · {f.slot}</span>
              <span className={t.textFaint}>{f.instructor.name.split(' ')[0]}</span>
            </div>
          ))}
          {nextFreeSlots.length === 0 && <p className={`text-sm ${t.textFaint}`}>No free slots in the next few days — fully booked!</p>}
        </div>
      </div>

      <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
        <div className={`flex items-center gap-2 px-5 py-3 border-b ${t.border}`}><ClipboardCheck className="h-4 w-4 text-brand-400" /><span className={`font-semibold text-sm ${t.textPrimary}`}>Upcoming VID Test Appointments</span></div>
        <div className="p-4">
          {upcomingVidTests.length === 0 ? (
            <p className={`text-sm ${t.textFaint}`}>No VID tests scheduled right now.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {upcomingVidTests.map(v => (
                <div key={v.id} className={`flex items-center gap-2 text-xs px-3 py-2 rounded-xl border ${t.border} ${t.chipBg}`}>
                  <span className={`font-semibold ${t.textPrimary}`}>{v.student_name}</span>
                  <StatusBadge color={v.type === 'Provisional' ? ACCENT_HEX.blue : '#a78bfa'} label={v.type} />
                  <span className={t.textFaint}>{fmtDate(v.date)} · {v.venue}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── BOOKINGS ───────────────────────────────────────────────────────────────

function BookingsTab({ bookings, students, onNewBooking }: { bookings: Booking[]; students: Student[]; onNewBooking: () => void }) {
  const t = useTheme();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [vipOnly, setVipOnly] = useState(false);

  const vipStudentIds = useMemo(() => new Set(students.filter(isVip).map(s => s.id)), [students]);

  const filtered = useMemo(() => bookings.filter(b => {
    if (status !== 'all' && b.status !== status) return false;
    if (vipOnly && !vipStudentIds.has(b.student_id)) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!b.student_name.toLowerCase().includes(q) && !b.instructor_name.toLowerCase().includes(q)) return false;
    }
    return true;
  }).sort((a, b) => (b.date + b.start_time).localeCompare(a.date + a.start_time)), [bookings, search, status, vipOnly, vipStudentIds]);
  // Cap the rendered rows — a busy school's full history can run into the
  // thousands; the table shows the most recent slice rather than paginating.
  const visible = filtered.slice(0, 150);

  return (
    <div className="space-y-4">
      <div className={`${t.glass} rounded-2xl ${t.shadow} p-4`}>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="flex flex-col sm:flex-row gap-2 flex-1">
            <SearchInput value={search} onChange={setSearch} placeholder="Search student, instructor…" />
            <SelectField size="filter" title="Status" value={status} onChange={setStatus}
              options={[{ value: 'all', label: 'All Statuses' }, { value: 'upcoming', label: 'Upcoming' }, { value: 'completed', label: 'Completed' }, { value: 'cancelled', label: 'Cancelled' }]} />
            <button type="button" onClick={() => setVipOnly(v => !v)}
              className={`flex items-center gap-1.5 h-9 px-3 rounded-lg text-[13px] font-semibold transition-colors ${vipOnly ? 'bg-amber-500/20 text-amber-400' : `${t.chipBg} ${t.textMuted} ${t.hoverBg}`}`}>
              <Star className="h-3.5 w-3.5" fill={vipOnly ? 'currentColor' : 'none'} /> VIP Only
            </button>
          </div>
          <PrimaryButton onClick={onNewBooking}><Plus className="h-4 w-4" /> New Booking</PrimaryButton>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className={`${t.glass} rounded-2xl ${t.shadow}`}>
          <EmptyState icon={CalendarDays} title="No bookings" message="No bookings match your filters." action={{ label: 'New Booking', onClick: onNewBooking }} />
        </div>
      ) : (
        <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
          {filtered.length > visible.length && (
            <div className={`px-5 py-2 text-xs ${t.textFaint} border-b ${t.border}`}>Showing latest {visible.length} of {filtered.length} bookings</div>
          )}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Instructor</TableHead>
                  <TableHead>Date &amp; Time</TableHead>
                  <TableHead>Lesson</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map(b => (
                  <TableRow key={b.id}>
                    <TableCell className={`font-medium ${t.textPrimary}`}>
                      <span className="flex items-center gap-1">{b.student_name}{vipStudentIds.has(b.student_id) && <Star className="h-3 w-3 text-amber-400" fill="currentColor" />}</span>
                    </TableCell>
                    <TableCell className={t.textFaint}>{b.instructor_name}</TableCell>
                    <TableCell className={t.textFaint}>{fmtDate(b.date)} · {b.start_time}</TableCell>
                    <TableCell><StatusBadge color={TYPE_HEX[b.lesson_type]} label={b.lesson_type} /></TableCell>
                    <TableCell className={t.textPrimary}>{formatCurrency(b.price)}</TableCell>
                    <TableCell><StatusBadge color={STATUS_HEX[b.status]} label={b.status} /></TableCell>
                    <TableCell><StatusBadge color={PAYMENT_HEX[b.payment_status]} label={b.payment_status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SCHEDULE ───────────────────────────────────────────────────────────────

function ScheduleTab({ bookings, instructors, students, onSlotClick }: {
  bookings: Booking[]; instructors: Instructor[]; students: Student[];
  onSlotClick: (instructorId: string, date: string, slot: string) => void;
}) {
  const t = useTheme();
  const vipStudentIds = useMemo(() => new Set(students.filter(isVip).map(s => s.id)), [students]);
  const [instructorId, setInstructorId] = useState(instructors[0]?.id ?? '');
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const slots = businessSlots();
  const days = useMemo(() => Array.from({ length: 6 }, (_, i) => addDays(weekStart, i)), [weekStart]); // Mon–Sat

  const instructor = instructors.find(i => i.id === instructorId);

  return (
    <div className="space-y-4">
      <div className={`${t.glass} rounded-2xl ${t.shadow} p-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between`}>
        <SelectField size="filter" title="Instructor" value={instructorId} onChange={setInstructorId}
          options={instructors.map(i => ({ value: i.id, label: i.name }))} />
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setWeekStart(w => addDays(w, -7))} className={`h-8 w-8 flex items-center justify-center rounded-lg ${t.chipBg} ${t.hoverBg} ${t.textFaint}`}><ChevronLeft className="h-4 w-4" /></button>
          <span className={`text-sm font-medium ${t.textPrimary}`}>{toISODate(days[0])} – {toISODate(days[5])}</span>
          <button type="button" onClick={() => setWeekStart(w => addDays(w, 7))} className={`h-8 w-8 flex items-center justify-center rounded-lg ${t.chipBg} ${t.hoverBg} ${t.textFaint}`}><ChevronRight className="h-4 w-4" /></button>
          <button type="button" onClick={() => setWeekStart(mondayOf(new Date()))} className={`text-xs px-2.5 py-1.5 rounded-lg ${t.chipBg} ${t.hoverBg} ${t.textFaint}`}>This Week</button>
        </div>
      </div>

      {instructor && (
        <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
          <div className={`flex items-center justify-between px-5 py-3 border-b ${t.border}`}>
            <span className={`font-semibold text-sm ${t.textPrimary}`}>{instructor.name}'s Schedule</span>
            <span className={`text-xs ${t.textFaint}`}>{instructor.vehicle} · <Star className="h-3 w-3 inline text-amber-400" /> {instructor.rating}</span>
          </div>
          <div className="overflow-x-auto p-3">
            <div className="min-w-[760px]">
              <div className="grid grid-cols-[70px_repeat(6,1fr)] gap-1.5 mb-1.5">
                <div />
                {days.map(d => (
                  <div key={toISODate(d)} className={`text-center text-xs font-medium py-1 ${t.textFaint}`}>{WEEKDAY_NAMES[(d.getDay() + 6) % 7]} <span className="opacity-70">{d.getDate()}</span></div>
                ))}
              </div>
              {slots.map(slot => (
                <div key={slot} className="grid grid-cols-[70px_repeat(6,1fr)] gap-1.5 mb-1.5">
                  <div className={`text-right text-[11px] pr-2 self-center ${t.textFaint}`}>{slot}</div>
                  {days.map(d => {
                    const iso = toISODate(d);
                    const booking = bookings.find(b => b.date === iso && b.instructor_id === instructorId && b.start_time === slot && b.status !== 'cancelled');
                    if (booking) {
                      const vip = vipStudentIds.has(booking.student_id);
                      return (
                        <div key={iso} title={`${booking.student_name} · ${booking.lesson_type}${vip ? ' · VIP' : ''}`}
                          className="rounded-lg px-1.5 py-1.5 text-[10px] leading-tight truncate relative"
                          style={{ backgroundColor: `${TYPE_HEX[booking.lesson_type]}26`, color: TYPE_HEX[booking.lesson_type], border: `1px solid ${vip ? '#fbbf24' : `${TYPE_HEX[booking.lesson_type]}55`}` }}>
                          {vip && <Star className="h-2.5 w-2.5 text-amber-400 absolute top-1 right-1" fill="currentColor" />}
                          <div className="font-semibold truncate pr-3">{booking.student_name}</div>
                          <div className="opacity-80 truncate">{booking.lesson_type}</div>
                        </div>
                      );
                    }
                    const isPast = new Date(`${iso}T${slot}:00`) < new Date();
                    return (
                      <button key={iso} type="button" disabled={isPast} onClick={() => onSlotClick(instructorId, iso, slot)}
                        className={`rounded-lg text-[10px] py-1.5 transition-colors ${isPast ? `${t.chipBg} opacity-30 cursor-not-allowed` : `border border-dashed ${t.border} ${t.textFaint} hover:border-emerald-400 hover:text-emerald-500 hover:bg-emerald-500/10`}`}>
                        {isPast ? '—' : 'Free'}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PAYMENTS ───────────────────────────────────────────────────────────────

function PaymentsTab({ bookings, onRecordPayment }: { bookings: Booking[]; onRecordPayment: (id: string) => void }) {
  const t = useTheme();
  const [status, setStatus] = useState('all');
  const payable = useMemo(() => bookings.filter(b => b.status !== 'cancelled'), [bookings]);

  const totals = useMemo(() => {
    const collected = payable.filter(b => b.payment_status === 'paid').reduce((s, b) => s + b.price, 0);
    const pending = payable.filter(b => b.payment_status === 'pending').reduce((s, b) => s + b.price, 0);
    const overdue = payable.filter(b => b.payment_status === 'overdue').reduce((s, b) => s + b.price, 0);
    return { collected, pending, overdue };
  }, [payable]);

  const filtered = useMemo(() => payable
    .filter(b => status === 'all' || b.payment_status === status)
    .sort((a, b) => (b.date + b.start_time).localeCompare(a.date + a.start_time)), [payable, status]);
  const visible = filtered.slice(0, 150);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatTile icon={CheckCircle2} color="#34d399" label="Collected" value={formatCurrency(totals.collected)} />
        <StatTile icon={Clock4} color="#fbbf24" label="Pending" value={formatCurrency(totals.pending)} onClick={() => setStatus('pending')} />
        <StatTile icon={XCircle} color="#f87171" label="Overdue" value={formatCurrency(totals.overdue)} onClick={() => setStatus('overdue')} />
      </div>

      <div className={`${t.glass} rounded-2xl ${t.shadow} p-4 flex items-center gap-2`}>
        <SelectField size="filter" title="Status" value={status} onChange={setStatus}
          options={[{ value: 'all', label: 'All Payments' }, { value: 'paid', label: 'Paid' }, { value: 'pending', label: 'Pending' }, { value: 'overdue', label: 'Overdue' }]} />
        <span className={`ml-auto text-xs ${t.textFaint}`}>{filtered.length} records</span>
      </div>

      {filtered.length === 0 ? (
        <div className={`${t.glass} rounded-2xl ${t.shadow}`}>
          <EmptyState icon={CreditCard} title="No payment records" message="No payments match your filter." />
        </div>
      ) : (
        <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
          {filtered.length > visible.length && (
            <div className={`px-5 py-2 text-xs ${t.textFaint} border-b ${t.border}`}>Showing latest {visible.length} of {filtered.length} payment records</div>
          )}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Instructor</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Lesson</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map(b => (
                  <TableRow key={b.id}>
                    <TableCell className={`font-medium ${t.textPrimary}`}>{b.student_name}</TableCell>
                    <TableCell className={t.textFaint}>{b.instructor_name}</TableCell>
                    <TableCell className={t.textFaint}>{fmtDate(b.date)}</TableCell>
                    <TableCell className={t.textFaint}>{b.lesson_type}</TableCell>
                    <TableCell className={t.textPrimary}>{formatCurrency(b.price)}</TableCell>
                    <TableCell><StatusBadge color={PAYMENT_HEX[b.payment_status]} label={b.payment_status} /></TableCell>
                    <TableCell>
                      {b.payment_status !== 'paid' && (
                        <button type="button" onClick={() => onRecordPayment(b.id)} className="text-xs px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-400 transition-all">Record Payment</button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ANALYTICS ──────────────────────────────────────────────────────────────

function AnalyticsTab({ bookings, instructors, students }: { bookings: Booking[]; instructors: Instructor[]; students: Student[] }) {
  const t = useTheme();
  const slots = businessSlots();
  const active = useMemo(() => bookings.filter(b => b.status !== 'cancelled'), [bookings]);

  const passRate = useMemo(() => {
    const outcomes = active.filter(b => b.test_outcome);
    return outcomes.length > 0 ? Math.round((outcomes.filter(b => b.test_outcome === 'passed').length / outcomes.length) * 100) : 0;
  }, [active]);

  const vipRevenue = useMemo(() => {
    const vipIds = new Set(students.filter(isVip).map(s => s.id));
    const paid = active.filter(b => b.payment_status === 'paid');
    const vip = paid.filter(b => vipIds.has(b.student_id)).reduce((s, b) => s + b.price, 0);
    const total = paid.reduce((s, b) => s + b.price, 0);
    return { vip, pct: total > 0 ? Math.round((vip / total) * 100) : 0 };
  }, [active, students]);

  const instructorUtilization = useMemo(() => {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const from = addDays(now, -30);
    let businessDays = 0;
    for (let i = 0; i < 30; i++) if (addDays(from, i).getDay() !== 0) businessDays++;
    const totalSlots = slots.length * businessDays;
    return instructors.map(i => {
      const count = active.filter(b => b.instructor_id === i.id && b.date >= toISODate(from) && b.date <= toISODate(now)).length;
      return { instructor: i, pct: totalSlots > 0 ? Math.min(100, Math.round((count / totalSlots) * 100)) : 0 };
    }).sort((a, b) => b.pct - a.pct);
  }, [active, instructors, slots]);

  const heatmap = useMemo(() => {
    const grid = WEEKDAY_NAMES.map(() => slots.map(() => 0));
    active.forEach(b => {
      const dow = (new Date(`${b.date}T00:00:00`).getDay() + 6) % 7;
      if (dow > 5) return; // Sunday closed, no column
      const hourIdx = slots.indexOf(b.start_time);
      if (hourIdx >= 0) grid[dow][hourIdx] += 1;
    });
    return grid;
  }, [active, slots]);
  const maxHeat = Math.max(1, ...heatmap.flat());

  const revenueByType = useMemo(() => LESSON_TYPES.map(lt => ({
    type: lt, revenue: active.filter(b => b.lesson_type === lt && b.payment_status === 'paid').reduce((s, b) => s + b.price, 0),
    count: active.filter(b => b.lesson_type === lt).length,
  })).filter(x => x.count > 0), [active]);

  const revenueByInstructor = useMemo(() => instructors.map(i => ({
    instructor: i,
    revenue: active.filter(b => b.instructor_id === i.id && b.payment_status === 'paid').reduce((s, b) => s + b.price, 0),
    lessons: active.filter(b => b.instructor_id === i.id).length,
  })).sort((a, b) => b.revenue - a.revenue), [active, instructors]);
  const maxInstructorRevenue = Math.max(1, ...revenueByInstructor.map(r => r.revenue));

  const axisColor = t.light ? 'rgba(15,23,42,0.4)' : 'rgba(255,255,255,0.4)';
  const gridColor = t.light ? 'rgba(15,23,42,0.06)' : 'rgba(255,255,255,0.06)';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile icon={GraduationCap} color={ACCENT_HEX.emerald} label="Test Pass Rate" value={`${passRate}%`} />
        <StatTile icon={Star} color="#fbbf24" label="VIP Revenue" value={formatCurrency(vipRevenue.vip)} />
        <StatTile icon={UsersRound} color={ACCENT_HEX.violet} label="VIP Share of Revenue" value={`${vipRevenue.pct}%`} />
        <StatTile icon={Gauge} color={ACCENT_HEX.blue} label="Avg. Instructor Utilization" value={`${instructorUtilization.length > 0 ? Math.round(instructorUtilization.reduce((s, r) => s + r.pct, 0) / instructorUtilization.length) : 0}%`} />
      </div>

      <div className={`${t.glass} rounded-2xl ${t.shadow} p-4`}>
        <h3 className={`flex items-center gap-2 text-sm font-semibold mb-1 ${t.textPrimary}`}><Activity className="h-4 w-4 text-violet-400" /> Booking Demand Heatmap</h3>
        <p className={`text-xs mb-3 ${t.textFaint}`}>Darker = more lessons booked at that time. Helps spot when to add instructor capacity.</p>
        <div className="overflow-x-auto">
          <div className="min-w-[380px] max-w-md">
            <div className="grid grid-cols-[38px_repeat(6,1fr)] gap-0.5 mb-0.5">
              <div />
              {WEEKDAY_NAMES.slice(0, 6).map(d => <div key={d} className={`text-[9px] text-center font-medium ${t.textFaint}`}>{d}</div>)}
            </div>
            {slots.map((slot, hourIdx) => (
              <div key={slot} className="grid grid-cols-[38px_repeat(6,1fr)] gap-0.5 items-center mb-0.5">
                <div className={`text-right text-[9px] pr-1.5 ${t.textFaint}`}>{slot}</div>
                {WEEKDAY_NAMES.slice(0, 6).map((d, dayIdx) => {
                  const value = heatmap[dayIdx][hourIdx];
                  return (
                    <div key={d} title={`${d} ${slot}: ${value} lesson${value !== 1 ? 's' : ''}`} className="h-3 rounded-[3px] transition-transform duration-150 hover:scale-110" style={{ backgroundColor: getHeatColor(value, maxHeat, t.light) }} />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
          <div className={`flex items-center gap-2 px-5 py-3 border-b ${t.border}`}><GraduationCap className="h-4 w-4 text-brand-400" /><span className={`font-semibold text-sm ${t.textPrimary}`}>Revenue by Lesson Type</span></div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={revenueByType} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="type" tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: t.light ? '#fff' : '#0f1e2e', border: `1px solid ${t.light ? 'rgba(15,23,42,0.1)' : 'rgba(134,187,216,0.2)'}`, borderRadius: 12, color: t.light ? '#0f172a' : '#fff', fontSize: 12 }} formatter={(v: number) => [formatCurrency(v), 'Revenue']} />
                <Bar dataKey="revenue" name="Revenue" radius={[6, 6, 0, 0]}>
                  {revenueByType.map((d, i) => <Cell key={i} fill={TYPE_HEX[d.type]} fillOpacity={0.85} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
          <div className={`flex items-center gap-2 px-5 py-3 border-b ${t.border}`}><UsersRound className="h-4 w-4 text-brand-400" /><span className={`font-semibold text-sm ${t.textPrimary}`}>Revenue by Instructor</span></div>
          <div className="p-4 space-y-3">
            {revenueByInstructor.map(r => (
              <div key={r.instructor.id}>
                <div className="flex justify-between text-xs mb-1">
                  <span className={`font-medium ${t.textPrimary}`}>{r.instructor.name}<span className={t.textFaint}> · {r.lessons} lessons</span></span>
                  <span className={`font-semibold ${t.textPrimary}`}>{formatCurrency(r.revenue)}</span>
                </div>
                <ProgressBar value={(r.revenue / maxInstructorRevenue) * 100} color={ACCENT_HEX.blue} showValue={false} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
        <div className={`flex items-center gap-2 px-5 py-3 border-b ${t.border}`}>
          <Gauge className="h-4 w-4 text-brand-400" /><span className={`font-semibold text-sm ${t.textPrimary}`}>Instructor Utilization — Last 30 Days</span>
        </div>
        <p className={`text-xs px-5 pt-3 ${t.textFaint}`}>Booked slots as a share of available slots — low numbers flag spare capacity, high numbers flag when to hire.</p>
        <div className="p-4 pt-3 space-y-3">
          {instructorUtilization.map(r => (
            <div key={r.instructor.id}>
              <div className="flex justify-between text-xs mb-1">
                <span className={`font-medium ${t.textPrimary}`}>{r.instructor.name}</span>
                <span className={`font-semibold ${t.textPrimary}`}>{r.pct}%</span>
              </div>
              <ProgressBar value={r.pct} color={r.pct >= 70 ? '#f87171' : r.pct >= 40 ? ACCENT_HEX.emerald : ACCENT_HEX.violet} showValue={false} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── NEW BOOKING MODAL ──────────────────────────────────────────────────────

function NewBookingModal({ instructors, students, bookings, initial, onClose, onCreate }: {
  instructors: Instructor[]; students: Student[]; bookings: Booking[];
  initial: { instructorId?: string; date?: string; slot?: string };
  onClose: () => void;
  onCreate: (b: Booking) => void;
}) {
  const t = useTheme();
  const [studentId, setStudentId] = useState(students[0]?.id ?? '');
  const [instructorId, setInstructorId] = useState(initial.instructorId ?? instructors[0]?.id ?? '');
  const [date, setDate] = useState(initial.date ?? (() => {
    const d = new Date();
    if (d.getDay() === 0) d.setDate(d.getDate() + 1); // skip Sunday
    return toISODate(d);
  })());
  const [lessonType, setLessonType] = useState<LessonType>('Practical');
  const [slot, setSlot] = useState<string | undefined>(initial.slot);
  const [prepaid, setPrepaid] = useState(false);

  const isSunday = new Date(`${date}T00:00:00`).getDay() === 0;
  const freeSlots = useMemo(() => {
    if (isSunday) return [];
    return businessSlots().filter(s => {
      const taken = bookings.some(b => b.date === date && b.instructor_id === instructorId && b.start_time === s && b.status !== 'cancelled');
      if (taken) return false;
      return new Date(`${date}T${s}:00`) >= new Date();
    });
  }, [bookings, date, instructorId, isSunday]);

  const canSubmit = !!studentId && !!instructorId && !!date && !!slot && !isSunday;

  function submit() {
    if (!canSubmit || !slot) return;
    const student = students.find(s => s.id === studentId);
    const instructor = instructors.find(i => i.id === instructorId);
    if (!student || !instructor) return;
    onCreate({
      id: `B${Date.now()}`,
      student_id: student.id, student_name: student.name,
      instructor_id: instructor.id, instructor_name: instructor.name,
      date, start_time: slot, duration: lessonType === 'Test Prep' ? 1.5 : 1,
      lesson_type: lessonType, price: LESSON_PRICE[lessonType],
      status: 'upcoming', payment_status: prepaid ? 'paid' : 'pending',
    });
  }

  return (
    <CenterModal open onClose={onClose} title="New Booking" accent="violet" width="max-w-lg">
      <div className="p-5 space-y-4">
        <FormField label="Student">
          <SelectField value={studentId} onChange={setStudentId} options={students.map(s => ({ value: s.id, label: isVip(s) ? `★ ${s.name}` : s.name }))} />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Instructor">
            <SelectField value={instructorId} onChange={v => { setInstructorId(v); setSlot(undefined); }} options={instructors.map(i => ({ value: i.id, label: i.name }))} />
          </FormField>
          <FormField label="Lesson Type">
            <SelectField value={lessonType} onChange={v => setLessonType(v as LessonType)} options={LESSON_TYPES.map(lt => ({ value: lt, label: `${lt} · ${formatCurrency(LESSON_PRICE[lt])}` }))} />
          </FormField>
        </div>
        <FormField label="Date">
          <input type="date" value={date} onChange={e => { setDate(e.target.value); setSlot(undefined); }} min={toISODate(new Date())}
            className={`w-full px-3 py-2 rounded-lg text-sm ${t.inputBg} ${t.textPrimary} border ${t.border} focus:outline-none focus:ring-2 focus:ring-brand-500/40`} />
        </FormField>

        <div>
          <label className={`text-xs font-medium mb-1.5 block ${t.textFaint}`}>Available Slots</label>
          {isSunday ? (
            <p className={`text-xs ${t.textFaint}`}>Closed on Sundays — pick another day.</p>
          ) : freeSlots.length === 0 ? (
            <p className={`text-xs ${t.textFaint}`}>No free slots for this instructor on this day.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {freeSlots.map(s => (
                <button key={s} type="button" onClick={() => setSlot(s)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${slot === s ? 'bg-brand-500/20 border-brand-500 text-brand-400' : `${t.border} ${t.chipBg} ${t.textFaint} hover:${t.textPrimary}`}`}>
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={prepaid} onChange={e => setPrepaid(e.target.checked)} className="rounded" />
          <span className={t.textMuted}>Mark as paid now ({formatCurrency(LESSON_PRICE[lessonType])})</span>
        </label>

        <div className="flex gap-2">
          <button type="button" onClick={onClose} className={`flex-1 py-2.5 rounded-xl text-sm ${t.textMuted} hover:${t.textPrimary} border ${t.border} transition-all`}>Cancel</button>
          <button type="button" disabled={!canSubmit} onClick={submit} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-br from-violet-500 to-violet-700 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all">Confirm Booking</button>
        </div>
      </div>
    </CenterModal>
  );
}
