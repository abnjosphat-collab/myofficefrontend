// components/PageShell.tsx
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

// 5K WebP wallpapers — maximum quality, crisp on any display
const WALLPAPERS = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=5120&q=100&fm=webp&fit=crop', // Swiss Alps panorama
  'https://images.unsplash.com/photo-1448375240586-882707db888b?w=5120&q=100&fm=webp&fit=crop', // Ancient forest mist
  'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=5120&q=100&fm=webp&fit=crop', // Northern lights
  'https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?w=5120&q=100&fm=webp&fit=crop', // Patagonia peaks
  'https://images.unsplash.com/photo-1470770903676-69b98201ea1c?w=5120&q=100&fm=webp&fit=crop', // Misty meadow
];

interface PageShellProps {
  children: React.ReactNode;
  variant?: 'module' | 'home';
  noFooter?: boolean;
}

export function PageShell({ children, noFooter = false }: PageShellProps) {
  const [current, setCurrent] = useState(0);
  const [incoming, setIncoming] = useState<number | null>(null);
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      const next = (current + 1) % WALLPAPERS.length;
      setIncoming(next);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setFadeIn(true));
      });
      const swap = setTimeout(() => {
        setCurrent(next);
        setIncoming(null);
        setFadeIn(false);
      }, 3200);
      return () => clearTimeout(swap);
    }, 90000);
    return () => clearInterval(t);
  }, [current]);

  return (
    <div className="relative min-h-screen flex flex-col">

      {/* Base wallpaper — Next.js Image: optimised, lazy, no inline styles */}
      <div className="fixed inset-0 -z-20 overflow-hidden">
        <Image
          src={WALLPAPERS[current]}
          alt=""
          fill
          className="object-cover object-center"
        />
      </div>

      {/* Incoming wallpaper — fades in via opacity-only CSS transition */}
      {incoming !== null && (
        <div className={`fixed inset-0 -z-20 overflow-hidden oz-bg-entering${fadeIn ? ' oz-bg-visible' : ''}`}>
          <Image
            src={WALLPAPERS[incoming]}
            alt=""
            fill
            className="object-cover object-center"
          />
        </div>
      )}

      {/* Dark vignette — ensures text contrast against bright wallpapers */}
      <div className="fixed inset-0 -z-10 bg-black/52" />

      <Header />
      <main className="oz-page-enter flex-1 flex flex-col">{children}</main>
      {!noFooter && <Footer />}
    </div>
  );
}
