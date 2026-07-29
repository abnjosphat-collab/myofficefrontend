// app/drivingSchool/page.tsx
'use client';

import Link from 'next/link';
import {
  ArrowRight,
  Car,
  GraduationCap,
  CalendarDays,
  ShieldCheck,
  CreditCard,
  Users,
  Star,
  MapPin,
  ClipboardCheck,
} from '@/components/shared/theme';

export default function DrivingSchoolHome() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-2">
              <Car className="h-6 w-6 text-brand-600" />
              <span className="text-2xl font-bold text-brand-600">RoadReady</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/drivingSchool/dashboard"
                className="text-gray-700 hover:text-brand-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                View Live Demo
              </Link>
              <Link
                href="/login"
                className="text-gray-700 hover:text-brand-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                Sign In
              </Link>
              <Link
                href="/login"
                className="bg-brand-600 text-white hover:bg-brand-700 px-4 py-2 rounded-md text-sm font-medium"
              >
                Enroll Now
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
              Learn to drive<br />with confidence
            </h1>
            <p className="mt-6 text-xl text-gray-600">
              Book lessons with certified instructors, track your progress toward your
              license, and manage everything from bookings to payments in one place.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-brand-600 hover:bg-brand-700"
              >
                Book Your First Lesson
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link
                href="#features"
                className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Learn More
              </Link>
            </div>
          </div>
          <div className="relative h-96 lg:h-auto">
            <img
              src="https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80"
              alt="Learner driver behind the wheel"
              className="rounded-lg shadow-xl object-cover w-full h-full"
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Why choose RoadReady?
            </h2>
            <p className="mt-4 text-xl text-gray-600">
              Everything a modern driving school needs, and everything a learner needs to pass.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="p-6 border rounded-lg hover:shadow-lg transition">
              <div className="w-12 h-12 bg-brand-100 rounded-lg flex items-center justify-center">
                <GraduationCap className="h-6 w-6 text-brand-600" />
              </div>
              <h3 className="mt-4 text-xl font-semibold">Certified Instructors</h3>
              <p className="mt-2 text-gray-600">
                Learn from experienced, licensed instructors matched to your schedule and skill level.
              </p>
            </div>

            <div className="p-6 border rounded-lg hover:shadow-lg transition">
              <div className="w-12 h-12 bg-brand-100 rounded-lg flex items-center justify-center">
                <CalendarDays className="h-6 w-6 text-brand-600" />
              </div>
              <h3 className="mt-4 text-xl font-semibold">Flexible Scheduling</h3>
              <p className="mt-2 text-gray-600">
                Book, reschedule, or cancel lessons online — fit driving lessons around your life.
              </p>
            </div>

            <div className="p-6 border rounded-lg hover:shadow-lg transition">
              <div className="w-12 h-12 bg-brand-100 rounded-lg flex items-center justify-center">
                <ClipboardCheck className="h-6 w-6 text-brand-600" />
              </div>
              <h3 className="mt-4 text-xl font-semibold">Progress Tracking</h3>
              <p className="mt-2 text-gray-600">
                See exactly which skills you've mastered and what to focus on before your test.
              </p>
            </div>

            <div className="p-6 border rounded-lg hover:shadow-lg transition">
              <div className="w-12 h-12 bg-brand-100 rounded-lg flex items-center justify-center">
                <Car className="h-6 w-6 text-brand-600" />
              </div>
              <h3 className="mt-4 text-xl font-semibold">Modern Fleet</h3>
              <p className="mt-2 text-gray-600">
                Dual-control, regularly serviced vehicles so every lesson starts safe and ready.
              </p>
            </div>

            <div className="p-6 border rounded-lg hover:shadow-lg transition">
              <div className="w-12 h-12 bg-brand-100 rounded-lg flex items-center justify-center">
                <MapPin className="h-6 w-6 text-brand-600" />
              </div>
              <h3 className="mt-4 text-xl font-semibold">Local Test Routes</h3>
              <p className="mt-2 text-gray-600">
                Practice on the same roads and routes examiners actually use in your area.
              </p>
            </div>

            <div className="p-6 border rounded-lg hover:shadow-lg transition">
              <div className="w-12 h-12 bg-brand-100 rounded-lg flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-brand-600" />
              </div>
              <h3 className="mt-4 text-xl font-semibold">Simple Payments</h3>
              <p className="mt-2 text-gray-600">
                Pay per lesson or buy a package upfront — securely, with a clear record of every booking.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="py-14 bg-brand-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="flex items-center justify-center gap-2 text-3xl font-bold text-brand-600">
              <Users className="h-6 w-6" />4,200+
            </div>
            <p className="mt-1 text-sm text-gray-600">Learners trained</p>
          </div>
          <div>
            <div className="flex items-center justify-center gap-2 text-3xl font-bold text-brand-600">
              <ShieldCheck className="h-6 w-6" />96%
            </div>
            <p className="mt-1 text-sm text-gray-600">First-time pass rate</p>
          </div>
          <div>
            <div className="flex items-center justify-center gap-2 text-3xl font-bold text-brand-600">
              <Car className="h-6 w-6" />35
            </div>
            <p className="mt-1 text-sm text-gray-600">Cars in the fleet</p>
          </div>
          <div>
            <div className="flex items-center justify-center gap-2 text-3xl font-bold text-brand-600">
              <Star className="h-6 w-6" />4.9
            </div>
            <p className="mt-1 text-sm text-gray-600">Average rating</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-brand-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Ready to hit the road?
          </h2>
          <p className="mt-4 text-xl text-brand-100">
            Join thousands of learners who passed first time with RoadReady.
          </p>
          <div className="mt-10">
            <Link
              href="/login"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-brand-600 bg-white hover:bg-gray-50"
            >
              Start Learning Today
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-white text-lg font-semibold">RoadReady</h3>
              <p className="mt-2 text-sm">
                Modern driving lessons, booked and tracked online.
              </p>
            </div>
            <div>
              <h4 className="text-white font-medium">Programs</h4>
              <ul className="mt-2 space-y-2 text-sm">
                <li><Link href="#" className="hover:text-white">Beginner Lessons</Link></li>
                <li><Link href="#" className="hover:text-white">Refresher Courses</Link></li>
                <li><Link href="#" className="hover:text-white">Defensive Driving</Link></li>
                <li><Link href="#" className="hover:text-white">Test Preparation</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-medium">Company</h4>
              <ul className="mt-2 space-y-2 text-sm">
                <li><Link href="#" className="hover:text-white">About Us</Link></li>
                <li><Link href="#" className="hover:text-white">Instructors</Link></li>
                <li><Link href="#" className="hover:text-white">Careers</Link></li>
                <li><Link href="#" className="hover:text-white">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-medium">Legal</h4>
              <ul className="mt-2 space-y-2 text-sm">
                <li><Link href="#" className="hover:text-white">Privacy Policy</Link></li>
                <li><Link href="#" className="hover:text-white">Terms of Service</Link></li>
                <li><Link href="#" className="hover:text-white">Cancellation Policy</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-sm text-center">
            © {new Date().getFullYear()} RoadReady. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
