// app/drivingSchool/PricingSection.tsx — RoadReady homepage pricing. Packages mirror
// the dashboard's own Basic/Standard/Premium student tiers (app/drivingSchool/
// dashboard/types.ts) so the marketing price list and the internal roster use the
// same three names, not a parallel vocabulary.
import Link from 'next/link';
import { Check, Star } from '@/components/shared/theme';

const SINGLE_LESSON_PRICE = 6;
const THEORY_PRICE = 10;

const PACKAGES = [
  {
    name: 'Basic', lessons: 5, pricePerLesson: 5.5, popular: false,
    features: ['5 practical lessons (30 min each)', 'Free highway code booklet', 'Flexible rescheduling'],
  },
  {
    name: 'Standard', lessons: 10, pricePerLesson: 5.0, popular: true,
    features: ['10 practical lessons (30 min each)', '1 free theory lesson', 'VID provisional test booking help', 'Priority scheduling'],
  },
  {
    name: 'Premium', lessons: 20, pricePerLesson: 4.5, popular: false,
    features: ['20 practical lessons (30 min each)', '2 free theory lessons', 'VID test booking, both stages', 'VIP priority scheduling', 'Dedicated instructor'],
  },
] as const;

export default function PricingSection() {
  return (
    <section id="pricing" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">Simple, honest pricing</h2>
          <p className="mt-4 text-xl text-gray-600">
            ${SINGLE_LESSON_PRICE.toFixed(2)} per 30-minute practical lesson · ${THEORY_PRICE.toFixed(2)} per theory lesson.
            Buy more lessons at once, pay less per lesson.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {PACKAGES.map(pkg => {
            const total = pkg.lessons * pkg.pricePerLesson;
            const savingsPct = Math.round((1 - pkg.pricePerLesson / SINGLE_LESSON_PRICE) * 100);
            return (
              <div key={pkg.name}
                className={`relative rounded-2xl p-8 border-2 transition-all ${pkg.popular ? 'border-brand-600 shadow-xl scale-[1.03]' : 'border-gray-200 shadow-sm'}`}>
                {pkg.popular && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-1 rounded-full bg-brand-600 text-white text-xs font-bold">
                    <Star className="h-3 w-3" fill="currentColor" /> Most Popular
                  </span>
                )}
                <h3 className="text-xl font-bold text-gray-900">{pkg.name}</h3>
                <p className="mt-1 text-sm text-gray-500">{pkg.lessons} lessons</p>
                <div className="mt-4 flex items-baseline gap-1.5">
                  <span className="text-4xl font-extrabold text-gray-900">${total.toFixed(2)}</span>
                  <span className="text-sm text-gray-500">total</span>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  ${pkg.pricePerLesson.toFixed(2)} / lesson
                  {savingsPct > 0 && <span className="ml-1.5 text-emerald-600 font-semibold">Save {savingsPct}%</span>}
                </p>
                <ul className="mt-6 space-y-3">
                  {pkg.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                      <Check className="h-4 w-4 text-brand-600 shrink-0 mt-0.5" /> {f}
                    </li>
                  ))}
                </ul>
                <Link href="/login"
                  className={`mt-8 block text-center px-4 py-3 rounded-lg text-sm font-semibold transition-colors ${pkg.popular ? 'bg-brand-600 text-white hover:bg-brand-700' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}>
                  Choose {pkg.name}
                </Link>
              </div>
            );
          })}
        </div>

        <p className="mt-8 text-center text-sm text-gray-500">
          Prefer to pay as you go? Single lessons are always available at ${SINGLE_LESSON_PRICE.toFixed(2)} per 30 minutes — no package required.
        </p>
      </div>
    </section>
  );
}
