// app/drivingSchool/LicensePathSlideshow.tsx — the "Your Path to a License" step-by-step
// carousel on the RoadReady homepage: autoplays, but pauses on click/hover so a visitor
// can actually read each step. Self-contained (owns its own timer), no external state.
'use client';

import { useEffect, useRef, useState } from 'react';
import { Play, Pause, ChevronLeft, ChevronRight } from '@/components/shared/theme';

interface Slide {
  title: string;
  step: string;
  description: string;
  price?: string;
  image: string;
}

const SLIDES: Slide[] = [
  {
    step: 'Step 1',
    title: 'Theory Lessons',
    description: 'Start in the classroom — learn the highway code, road signs, and rules of the road with a certified instructor before you ever touch the wheel.',
    price: '$10.00 per lesson',
    image: 'https://images.unsplash.com/photo-1598981457915-aea220950616?auto=format&fit=crop&w=1200&q=80',
  },
  {
    step: 'Step 2',
    title: 'Book Your Provisional Test',
    description: 'Once you know the highway code, we help you book and prepare for your Provisional License test at the Vehicle Inspectorate Department (VID) — e.g. Kadoma VID.',
    image: 'https://images.unsplash.com/photo-1611508106567-6218ae6c5f6a?auto=format&fit=crop&w=1200&q=80',
  },
  {
    step: 'Step 3',
    title: 'Practical Driving Lessons',
    description: "With your Provisional in hand, start behind-the-wheel lessons in one of our dual-control cars, one-on-one with your instructor.",
    price: '$6.00 per 30 minutes',
    image: 'https://images.unsplash.com/photo-1537211790624-e6f568af4b13?auto=format&fit=crop&w=1200&q=80',
  },
  {
    step: 'Step 4',
    title: 'Road Test & Full License',
    description: "When your instructor signs off that you're ready, we book your final road test at VID. Pass, and you drive away with your full license.",
    image: 'https://images.unsplash.com/photo-1610130383147-3754d8db3f86?auto=format&fit=crop&w=1200&q=80',
  },
];

const AUTOPLAY_MS = 5000;

export default function LicensePathSlideshow() {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!playing) return;
    timerRef.current = setInterval(() => setIndex(i => (i + 1) % SLIDES.length), AUTOPLAY_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [playing]);

  const goTo = (i: number) => setIndex(((i % SLIDES.length) + SLIDES.length) % SLIDES.length);

  const slide = SLIDES[index];

  return (
    <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-gray-900">
      <div className="relative h-[420px] sm:h-[480px]">
        {SLIDES.map((s, i) => (
          <img
            key={s.title}
            src={s.image}
            alt={s.title}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${i === index ? 'opacity-100' : 'opacity-0'}`}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10" />

        <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
          <span className="inline-block px-2.5 py-1 rounded-full bg-brand-500/90 text-white text-xs font-bold tracking-wide mb-3">{slide.step} of {SLIDES.length}</span>
          <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">{slide.title}</h3>
          <p className="text-white/85 text-sm sm:text-base max-w-xl mb-3">{slide.description}</p>
          {slide.price && (
            <span className="inline-block px-3 py-1.5 rounded-lg bg-white/15 backdrop-blur text-white text-sm font-semibold">{slide.price}</span>
          )}
        </div>

        <div className="absolute top-4 right-4 flex items-center gap-2">
          <button type="button" onClick={() => setPlaying(p => !p)}
            aria-label={playing ? 'Pause slideshow' : 'Play slideshow'}
            className="h-9 w-9 flex items-center justify-center rounded-full bg-white/15 backdrop-blur text-white hover:bg-white/25 transition-colors">
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
        </div>

        <button type="button" onClick={() => goTo(index - 1)} aria-label="Previous step"
          className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 flex items-center justify-center rounded-full bg-white/15 backdrop-blur text-white hover:bg-white/25 transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button type="button" onClick={() => goTo(index + 1)} aria-label="Next step"
          className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 flex items-center justify-center rounded-full bg-white/15 backdrop-blur text-white hover:bg-white/25 transition-colors">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="flex items-center justify-center gap-2 py-4 bg-gray-900">
        {SLIDES.map((s, i) => (
          <button key={s.title} type="button" onClick={() => goTo(i)} aria-label={`Go to ${s.title}`}
            className={`h-1.5 rounded-full transition-all ${i === index ? 'w-8 bg-brand-500' : 'w-1.5 bg-white/30 hover:bg-white/50'}`} />
        ))}
      </div>
    </div>
  );
}
