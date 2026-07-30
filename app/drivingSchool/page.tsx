// app/drivingSchool/page.tsx
'use client';

import Link from 'next/link';
import { useState } from 'react';
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
  Phone,
  MessageCircle,
  Mail,
  X,
  ChevronDown,
} from '@/components/shared/theme';
import LicensePathSlideshow from './LicensePathSlideshow';
import PricingSection from './PricingSection';

const INSTRUCTORS = [
  { name: 'Farai Mutasa', specialty: 'Practical & Highway', rating: 4.9, years: 8 },
  { name: 'Linda Sibanda', specialty: 'Nervous Beginners', rating: 4.8, years: 6 },
  { name: 'Tendai Marufu', specialty: 'Test Preparation', rating: 4.9, years: 10 },
  { name: 'Chipo Gumbo', specialty: 'Theory & Highway Code', rating: 4.7, years: 5 },
];

const TESTIMONIALS = [
  { name: 'Rutendo N.', quote: "Passed my VID test first time! My instructor knew exactly what the examiners look for.", rating: 5 },
  { name: 'Tafadzwa M.', quote: "I was terrified of driving. Linda was so patient — three months later I have my full license.", rating: 5 },
  { name: 'Kudakwashe D.', quote: "Booked everything from my phone, paid per lesson, no long-term contract. Exactly what I needed.", rating: 5 },
];

const FAQS = [
  { q: 'How much does it cost to get my full license?', a: `Most learners spend around $150–$250 total: a handful of theory lessons at $10 each, roughly 15–20 practical lessons at $6 per 30 minutes (less if you buy a package), plus the VID's own test fees for the Provisional and Road Test.` },
  { q: 'Do I have to buy a package, or can I pay per lesson?', a: 'Pay-as-you-go is always available at $6.00 per 30-minute lesson. Packages (5/10/20 lessons) just work out cheaper per lesson if you know you\'ll need several.' },
  { q: 'What happens if I fail the VID test?', a: "It happens — you simply rebook with VID and keep training with us in the meantime. Many students take a few extra lessons to shore up the specific skill that tripped them up." },
  { q: 'Do you provide the car for my VID test?', a: 'Yes — Standard and Premium package students get their VID test day covered by one of our dual-control vehicles, with your instructor there for support.' },
  { q: 'How long does the whole process usually take?', a: 'From your first theory lesson to a full license, most learners finish in 2–4 months, depending on how often you can take lessons and VID appointment availability.' },
];

export default function DrivingSchoolHome() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [contactOpen, setContactOpen] = useState(false);
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

      {/* Your Path to a License — pausable step-by-step slideshow */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">Your path to a license</h2>
            <p className="mt-4 text-xl text-gray-600">Four steps, start to finish. Click pause to read at your own speed.</p>
          </div>
          <LicensePathSlideshow />
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

      {/* Meet the Instructors */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">Meet your instructors</h2>
            <p className="mt-4 text-xl text-gray-600">Certified, patient, and matched to how you learn best.</p>
          </div>
          <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {INSTRUCTORS.map(ins => (
              <div key={ins.name} className="bg-white rounded-xl border p-6 text-center hover:shadow-lg transition">
                <div className="mx-auto h-16 w-16 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 text-xl font-bold">
                  {ins.name.split(' ').map(n => n[0]).join('')}
                </div>
                <h3 className="mt-4 font-semibold text-gray-900">{ins.name}</h3>
                <p className="mt-1 text-sm text-gray-500">{ins.specialty}</p>
                <div className="mt-2 flex items-center justify-center gap-1 text-sm text-amber-500">
                  <Star className="h-4 w-4" fill="currentColor" /> {ins.rating}
                  <span className="text-gray-400 ml-1">· {ins.years} yrs</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PricingSection />

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

      {/* Testimonials */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">What our learners say</h2>
          </div>
          <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-8">
            {TESTIMONIALS.map(tm => (
              <div key={tm.name} className="bg-gray-50 rounded-xl p-6 border">
                <div className="flex gap-0.5 text-amber-500">
                  {Array.from({ length: tm.rating }).map((_, i) => <Star key={i} className="h-4 w-4" fill="currentColor" />)}
                </div>
                <p className="mt-4 text-gray-700">&ldquo;{tm.quote}&rdquo;</p>
                <p className="mt-4 font-semibold text-gray-900">{tm.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">Frequently asked questions</h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((f, i) => (
              <div key={f.q} className="bg-white rounded-xl border overflow-hidden">
                <button type="button" onClick={() => setOpenFaq(o => o === i ? null : i)}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left">
                  <span className="font-medium text-gray-900">{f.q}</span>
                  <ChevronDown className={`h-4 w-4 text-gray-400 shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && <p className="px-5 pb-4 text-sm text-gray-600">{f.a}</p>}
              </div>
            ))}
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

      {/* Floating contact widget — the easiest possible way for a visitor to reach us */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {contactOpen && (
          <div className="flex flex-col gap-2 mb-1">
            <a href="https://wa.me/263771234567" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2.5 pl-3.5 pr-4 py-2.5 rounded-full bg-white shadow-lg border text-sm font-medium text-gray-800 hover:shadow-xl transition-shadow">
              <span className="h-8 w-8 rounded-full bg-emerald-500 flex items-center justify-center text-white"><MessageCircle className="h-4 w-4" /></span>
              WhatsApp Us
            </a>
            <a href="tel:+263771234567"
              className="flex items-center gap-2.5 pl-3.5 pr-4 py-2.5 rounded-full bg-white shadow-lg border text-sm font-medium text-gray-800 hover:shadow-xl transition-shadow">
              <span className="h-8 w-8 rounded-full bg-brand-600 flex items-center justify-center text-white"><Phone className="h-4 w-4" /></span>
              Call Us
            </a>
            <a href="mailto:hello@roadready.co.zw"
              className="flex items-center gap-2.5 pl-3.5 pr-4 py-2.5 rounded-full bg-white shadow-lg border text-sm font-medium text-gray-800 hover:shadow-xl transition-shadow">
              <span className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center text-white"><Mail className="h-4 w-4" /></span>
              Email Us
            </a>
          </div>
        )}
        <button type="button" onClick={() => setContactOpen(v => !v)} aria-label={contactOpen ? 'Close contact options' : 'Open contact options'}
          className="h-14 w-14 rounded-full bg-brand-600 hover:bg-brand-700 text-white shadow-xl flex items-center justify-center transition-all">
          {contactOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        </button>
      </div>
    </div>
  );
}
