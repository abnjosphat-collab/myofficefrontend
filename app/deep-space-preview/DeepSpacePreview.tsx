// app/deep-space-preview/DeepSpacePreview.tsx — client island for the /deep-space-preview prototype:
// the animated 3D particle canvas plus the floating glass card. Self-contained on purpose: no ui-system
// imports, no floor tokens, no Tailwind colour classes. Particle colours come from the co-located CSS module
// (read via getComputedStyle) so no hex literal appears in page code.
'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import s from './deep-space-preview.module.css';

type Tab = { id: string; label: string; heading: string; body: string; icon: ReactNode };

const TABS: Tab[] = [
  {
    id: 'overview', label: 'Overview',
    heading: 'Explore the deep field',
    body: 'A floating interface suspended over a living starfield. Drift through the vectors, then drop your address below to join the preview list.',
    icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="7.5" height="7.5" rx="1.5" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" /></svg>),
  },
  {
    id: 'settings', label: 'Settings',
    heading: 'Tune the field',
    body: 'Dial the particle density, drift speed and cursor parallax until the canvas behind the card feels like your own sky.',
    icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3.2" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.04-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.04H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.65 8.9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1.04-1.56V3a2 2 0 1 1 4 0v.09c0 .68.4 1.3 1.04 1.56.6.25 1.3.11 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87c.26.63.88 1.04 1.56 1.04H21a2 2 0 1 1 0 4h-.09c-.68 0-1.3.4-1.51 1.04Z" /></svg>),
  },
  {
    id: 'analytics', label: 'Analytics',
    heading: 'Read the vectors',
    body: 'Every particle reports its position each frame, so the motion stays smooth from phones to wide screens.',
    icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 20V4" /><path d="M4 20h16" /><path d="M8.5 16v-5" /><path d="M13 16V7.5" /><path d="M17.5 16v-3" /></svg>),
  },
];

type Particle = { x: number; y: number; z: number; size: number; alpha: number; color: string; speed: number };

const COUNT = 170;
const NEAR = 0.12; // z of the camera plane; crossing it resets the particle
const FAR = 1.6; // z of deep space; particles respawn here
const BASE_SPEED = 0.0038; // z units per frame at 60fps
const PARALLAX = 64; // px of cursor parallax at z = 1

export function DeepSpacePreview() {
  const [active, setActive] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const baseId = useId();
  const tab = TABS[active];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Palette stays in the CSS module; read it (trimmed) so JS holds no colour literals.
    const css = getComputedStyle(canvas);
    const COLORS = [css.getPropertyValue('--dsp-teal').trim(), css.getPropertyValue('--dsp-purple').trim()];

    let width = 0; let height = 0; let cx = 0; let cy = 0; let focal = 0;
    let raf = 0;
    let running = true;
    let last = performance.now();
    let targetX = 0; let targetY = 0; let camX = 0; let camY = 0; let boost = 0;

    const spawn = (p: Particle, initial: boolean): Particle => {
      p.x = Math.random() * 2 - 1;
      p.y = Math.random() * 2 - 1;
      p.z = initial ? NEAR + Math.random() * (FAR - NEAR) : FAR * (0.85 + Math.random() * 0.15);
      p.size = 0.6 + Math.random() * 1.2;
      p.alpha = 0.2 + Math.random() * 0.6;
      p.color = COLORS[(Math.random() * COLORS.length) | 0];
      p.speed = 0.7 + Math.random() * 0.6;
      return p;
    };
    const particles: Particle[] = Array.from({ length: COUNT }, () => spawn({ x: 0, y: 0, z: 0, size: 0, alpha: 0, color: '', speed: 0 }, true));

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx = width / 2;
      cy = height / 2;
      focal = Math.min(width, height) * 0.9;
    };
    const onMouse = (event: MouseEvent) => {
      targetX = (event.clientX / width - 0.5) * 2;
      targetY = (event.clientY / height - 0.5) * 2;
      boost = Math.min(1, Math.sqrt(targetX * targetX + targetY * targetY)) * 0.6;
    };
    const onVisibility = () => {
      if (document.hidden) { running = false; return; }
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };

    const draw = (now: number) => {
      const dt = Math.min(3, Math.max(0.25, (now - last) / 16.667));
      camX += (targetX - camX) * 0.045 * dt;
      camY += (targetY - camY) * 0.045 * dt;
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'lighter';
      for (const p of particles) {
        p.z -= BASE_SPEED * p.speed * (1 + boost) * dt;
        // Perspective divide: position and radius scale with depth.
        const scale = focal / p.z;
        const sx = cx + p.x * scale + (camX * PARALLAX) / p.z;
        const sy = cy + p.y * scale + (camY * PARALLAX) / p.z;
        // Past the camera or off-screen: recycle deep into the distance.
        if (p.z <= NEAR || sx < -20 || sx > width + 20 || sy < -20 || sy > height + 20) {
          spawn(p, false);
          continue;
        }
        const depthFade = 1 - ((p.z - NEAR) / (FAR - NEAR)) * 0.45;
        ctx.globalAlpha = p.alpha * depthFade;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(sx, sy, Math.min(5, Math.max(0.4, p.size / p.z)), 0, 6.2832);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    };
    const tick = (now: number) => {
      if (!running) return;
      draw(now);
      last = now;
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMouse, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    resize();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      draw(last + 16.667); // One static frame; no loop.
    } else {
      raf = requestAnimationFrame(tick);
    }
    // Strict-mode safe: the double-invoked effect cancels its first loop and listeners here.
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouse);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const onTabKey = (event: KeyboardEvent, index: number) => {
    let next: number | null = null;
    if (event.key === 'ArrowRight') next = (index + 1) % TABS.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + TABS.length) % TABS.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = TABS.length - 1;
    if (next === null) return;
    event.preventDefault();
    setActive(next);
    document.getElementById(`${baseId}-tab-${TABS[next].id}`)?.focus();
  };

  return (
    <div className={s.page}>
      <canvas ref={canvasRef} className={s.canvas} aria-hidden="true" />
      <div className={s.stage}>
        <main className={s.card} aria-label="Deep space preview card">
          <div className={s.tabs} role="tablist" aria-label="Preview sections">
            {TABS.map((t, index) => (
              <button
                key={t.id}
                type="button"
                id={`${baseId}-tab-${t.id}`}
                role="tab"
                aria-selected={index === active}
                aria-controls={`${baseId}-panel`}
                tabIndex={index === active ? 0 : -1}
                className={`${s.tab}${index === active ? ` ${s.active}` : ''}`}
                onClick={() => setActive(index)}
                onKeyDown={event => onTabKey(event, index)}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          <div role="tabpanel" id={`${baseId}-panel`} aria-labelledby={`${baseId}-tab-${tab.id}`}>
            <h1 className={s.title}>{tab.heading}</h1>
            <p className={s.lead}>{tab.body}</p>
          </div>

          <form onSubmit={event => event.preventDefault()}>
            <div className={s.field}>
              <label htmlFor={`${baseId}-email`}>Email address</label>
              <div className={s.inputWrap}>
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ stroke: 'var(--dsp-teal)' }}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3.5 7 8.5 6 8.5-6" /></svg>
                <input id={`${baseId}-email`} name="email" type="email" placeholder="you@example.com" autoComplete="email" />
              </div>
            </div>

            <div className={s.actions}>
              <button type="submit" className={`${s.btn} ${s.primary}`}>
                <span>Get started</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>
              </button>
              <button type="button" className={`${s.btn} ${s.secondary}`}>
                <span>Learn more</span>
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
