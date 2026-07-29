// app/drivingSchool/dashboard/types.ts — mock data model for the driving-school
// prototype dashboard. Same convention as the other vertical-app demos (bank,
// roomRental, etc.): frontend-only, generated data, no backend.

export const LESSON_TYPES = ['Practical', 'Highway', 'Theory', 'Test Prep'] as const;
export type LessonType = typeof LESSON_TYPES[number];

export const LESSON_PRICE: Record<LessonType, number> = {
  Practical: 35, Highway: 45, Theory: 20, 'Test Prep': 55,
};
export const LESSON_DURATION: Record<LessonType, number> = {
  Practical: 1, Highway: 1, Theory: 1, 'Test Prep': 1.5,
};

export type BookingStatus = 'upcoming' | 'completed' | 'cancelled';
export type PaymentStatus = 'paid' | 'pending' | 'overdue';

export interface Instructor {
  id: string;
  name: string;
  vehicle: string;
  rating: number;
}

export interface Student {
  id: string;
  name: string;
  phone: string;
  package: 'Basic' | 'Standard' | 'Premium';
  lessonsRemaining: number;
}

export interface Booking {
  id: string;
  student_id: string;
  student_name: string;
  instructor_id: string;
  instructor_name: string;
  date: string; // ISO yyyy-mm-dd
  start_time: string; // "HH:MM"
  duration: number; // hours
  lesson_type: LessonType;
  price: number;
  status: BookingStatus;
  payment_status: PaymentStatus;
}

// Business hours: 07:00–17:00, Monday–Saturday (Sunday closed).
export const BUSINESS_START_HOUR = 7;
export const BUSINESS_END_HOUR = 17;
export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const WEEKDAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
