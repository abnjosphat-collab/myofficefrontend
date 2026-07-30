// app/drivingSchool/dashboard/mockData.ts — deterministic mock data generation for
// the driving-school dashboard prototype. Seeded RNG so the "business" looks the
// same shape every load (a believable, already-busy schedule) rather than a
// different random mess each refresh.

import {
  BUSINESS_START_HOUR, BUSINESS_END_HOUR, LESSON_TYPES, LESSON_PRICE,
  type Booking, type Instructor, type LessonType, type Student, type VidTest,
} from './types';

const VID_VENUES = ['Kadoma VID', 'Harare VID (Fife Avenue)'];

// mulberry32 — tiny seeded PRNG, good enough for believable-looking demo data.
function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const INSTRUCTOR_NAMES = [
  { name: 'Farai Mutasa', vehicle: 'Toyota Vitz (dual-control)' },
  { name: 'Linda Sibanda', vehicle: 'Honda Fit (dual-control)' },
  { name: 'Tendai Marufu', vehicle: 'Toyota Vitz (dual-control)' },
  { name: 'Chipo Gumbo', vehicle: 'Mazda Demio (dual-control)' },
];

const STUDENT_FIRST = ['Tanaka', 'Rutendo', 'Kudakwashe', 'Anesu', 'Nyasha', 'Tafadzwa', 'Simbarashe', 'Vimbai', 'Munashe', 'Chiedza', 'Blessing', 'Farirai', 'Panashe', 'Rufaro', 'Tinotenda', 'Wadzanai', 'Takudzwa', 'Ropafadzo', 'Nomsa', 'Themba', 'Ashley', 'Brian', 'Cynthia', 'Douglas'];
const STUDENT_LAST = ['Moyo', 'Ncube', 'Dube', 'Chikwanha', 'Sithole', 'Mhaka', 'Zvobgo', 'Chirwa', 'Mabika', 'Nyathi'];
const PACKAGES: Student['package'][] = ['Basic', 'Standard', 'Premium'];

function generateInstructors(): Instructor[] {
  return INSTRUCTOR_NAMES.map((it, i) => ({
    id: `I${i + 1}`,
    name: it.name,
    vehicle: it.vehicle,
    rating: Math.round((4.5 + (i % 3) * 0.15) * 10) / 10,
  }));
}

function generateStudents(rng: () => number, today: Date): Student[] {
  return STUDENT_FIRST.map((first, i) => {
    const last = STUDENT_LAST[i % STUDENT_LAST.length];
    const pkg = PACKAGES[Math.floor(rng() * PACKAGES.length)];
    // A few non-Premium regulars get a manual VIP flag too (loyalty, referrals) —
    // Premium students are VIP by definition, see isVip() in types.ts.
    const vip = pkg !== 'Premium' && rng() < 0.12;
    return {
      id: `S${i + 1}`,
      name: `${first} ${last}`,
      phone: `+263 7${Math.floor(rng() * 9)} ${String(Math.floor(rng() * 900) + 100)} ${String(Math.floor(rng() * 9000) + 1000)}`,
      package: pkg,
      lessonsRemaining: Math.floor(rng() * 8),
      joined_date: toISODate(addDays(today, -Math.floor(rng() * 240) - 14)),
      vip,
    };
  });
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}

// The scheduling grid treats every lesson as occupying exactly one hourly slot,
// regardless of its nominal lesson-type duration (kept simple on purpose — this
// is a demo booking board, not a real interval-overlap scheduler).
export function businessSlots(): string[] {
  const slots: string[] = [];
  for (let h = BUSINESS_START_HOUR; h < BUSINESS_END_HOUR; h++) slots.push(`${String(h).padStart(2, '0')}:00`);
  return slots;
}

function isBusinessDay(d: Date): boolean {
  return d.getDay() !== 0; // closed Sundays
}

function generateBookings(instructors: Instructor[], students: Student[], rng: () => number): Booking[] {
  const bookings: Booking[] = [];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const slots = businessSlots();
  let seq = 1;

  // ~5 months back so the "last 6 months" income chart has real shape, tapering
  // up toward the present (a growing school) rather than a flat random block.
  const HISTORY_DAYS = 150;
  for (let offset = -HISTORY_DAYS; offset <= 14; offset++) {
    const date = addDays(today, offset);
    if (!isBusinessDay(date)) continue;
    const iso = toISODate(date);
    const isPast = offset < 0;
    const isToday = offset === 0;

    for (const instructor of instructors) {
      for (const slot of slots) {
        // Busier midweek and mid-morning/late-afternoon; a touch lighter on
        // Saturdays and at the very start/end of the day — gives the heatmap
        // real shape instead of uniform noise.
        const hour = Number(slot.slice(0, 2));
        const dow = date.getDay();
        let fillChance = 0.5;
        if (dow === 6) fillChance -= 0.15;
        if (hour === BUSINESS_START_HOUR || hour === BUSINESS_END_HOUR - 1) fillChance -= 0.12;
        if (hour >= 9 && hour <= 11) fillChance += 0.1;
        if (hour >= 15 && hour <= 16) fillChance += 0.08;
        // Growth ramp: busier the closer to today, quieter further back.
        fillChance *= 0.55 + 0.45 * (1 - Math.min(1, -offset / HISTORY_DAYS));
        // Future slots fill less — a real school wouldn't be 100% pre-booked weeks out.
        if (!isPast && !isToday) fillChance -= 0.25;

        if (rng() > Math.max(0.04, fillChance)) continue;

        const student = students[Math.floor(rng() * students.length)];
        const lessonType: LessonType = LESSON_TYPES[Math.floor(rng() * LESSON_TYPES.length)];
        const price = LESSON_PRICE[lessonType];

        let status: Booking['status'] = 'upcoming';
        let paymentStatus: Booking['payment_status'] = 'pending';
        if (isPast) {
          status = rng() < 0.06 ? 'cancelled' : 'completed';
          if (status === 'completed') {
            // Older completed lessons that are still unpaid read as genuinely
            // overdue; recent ones are just "pending" — payment hasn't caught up yet.
            const r = rng();
            if (r < 0.8) paymentStatus = 'paid';
            else paymentStatus = offset < -7 ? 'overdue' : 'pending';
          } else {
            paymentStatus = 'pending';
          }
        } else {
          status = 'upcoming';
          paymentStatus = rng() < 0.35 ? 'paid' : 'pending';
        }

        // Road-test result — only meaningful for a completed Test Prep lesson.
        const testOutcome: Booking['test_outcome'] = (lessonType === 'Test Prep' && status === 'completed')
          ? (rng() < 0.82 ? 'passed' : 'failed')
          : undefined;

        bookings.push({
          id: `B${seq++}`,
          student_id: student.id,
          student_name: student.name,
          instructor_id: instructor.id,
          instructor_name: instructor.name,
          date: iso,
          start_time: slot,
          duration: lessonType === 'Test Prep' ? 1.5 : 1,
          lesson_type: lessonType,
          price,
          status,
          payment_status: paymentStatus,
          test_outcome: testOutcome,
        });
      }
    }
  }
  return bookings.sort((a, b) => (a.date + a.start_time).localeCompare(b.date + b.start_time));
}

// VID (Vehicle Inspectorate Department) test appointments — real government
// bookings, not driving lessons, so derived from each student's lesson history
// rather than the slot grid: a Provisional test follows their first Theory
// lesson; a Full License test follows enough Practical/Highway lessons.
function generateVidTests(students: Student[], bookings: Booking[], rng: () => number, today: Date): VidTest[] {
  const byStudent = new Map<string, Booking[]>();
  bookings.forEach(b => { if (!byStudent.has(b.student_id)) byStudent.set(b.student_id, []); byStudent.get(b.student_id)!.push(b); });

  const tests: VidTest[] = [];
  let seq = 1;
  for (const student of students) {
    const own = (byStudent.get(student.id) ?? []).filter(b => b.status !== 'cancelled');
    const firstTheory = own.filter(b => b.lesson_type === 'Theory').sort((a, b) => a.date.localeCompare(b.date))[0];
    const roadLessons = own.filter(b => (b.lesson_type === 'Practical' || b.lesson_type === 'Highway') && b.status === 'completed').length;
    const venue = VID_VENUES[Math.floor(rng() * VID_VENUES.length)];

    if (firstTheory && rng() < 0.7) {
      const testDate = addDays(new Date(`${firstTheory.date}T00:00:00`), 7 + Math.floor(rng() * 10));
      const isFuture = testDate > today;
      const status: VidTest['status'] = isFuture ? 'scheduled' : (rng() < 0.88 ? 'passed' : 'failed');
      tests.push({ id: `V${seq++}`, student_id: student.id, student_name: student.name, type: 'Provisional', date: toISODate(testDate), venue, status });

      // A Full License test only makes sense once they've passed Provisional
      // and logged real road time.
      if (status === 'passed' && roadLessons >= 3 && rng() < 0.55) {
        const fullDate = addDays(testDate, 30 + Math.floor(rng() * 60));
        const fullIsFuture = fullDate > today;
        const fullStatus: VidTest['status'] = fullIsFuture ? 'scheduled' : (rng() < 0.8 ? 'passed' : 'failed');
        tests.push({ id: `V${seq++}`, student_id: student.id, student_name: student.name, type: 'Full License', date: toISODate(fullDate), venue, status: fullStatus });
      }
    }
  }

  // A student's earliest Theory lesson (the anchor above) is, for any
  // long-enrolled student, deep in the past — so the derived date is almost
  // always historical too. Real schools always have a few tests genuinely on
  // the calendar, so explicitly schedule a handful for students who are still
  // mid-course (lessons remaining, no passed Provisional yet) rather than
  // leaving "upcoming tests" permanently empty.
  const stillLearning = students.filter(s => s.lessonsRemaining > 0 && !tests.some(v => v.student_id === s.id && v.status !== 'failed'));
  for (let i = 0; i < Math.min(4, stillLearning.length); i++) {
    const student = stillLearning[Math.floor(rng() * stillLearning.length)];
    if (tests.some(v => v.student_id === student.id && v.status === 'scheduled')) continue;
    const testDate = addDays(today, 2 + Math.floor(rng() * 18));
    const venue = VID_VENUES[Math.floor(rng() * VID_VENUES.length)];
    tests.push({ id: `V${seq++}`, student_id: student.id, student_name: student.name, type: 'Provisional', date: toISODate(testDate), venue, status: 'scheduled' });
  }

  return tests.sort((a, b) => a.date.localeCompare(b.date));
}

export function generateAllMockData(): { instructors: Instructor[]; students: Student[]; bookings: Booking[]; vidTests: VidTest[] } {
  const rng = mulberry32(20260729);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const instructors = generateInstructors();
  const students = generateStudents(rng, today);
  const bookings = generateBookings(instructors, students, rng);
  const vidTests = generateVidTests(students, bookings, rng, today);
  return { instructors, students, bookings, vidTests };
}
