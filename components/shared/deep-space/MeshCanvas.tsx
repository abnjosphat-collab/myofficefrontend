// components/shared/deep-space/MeshCanvas.tsx — the 3D wireframe, as one canvas. Two looks share the file:
//   'stage' — the sign-in net: a flat grid with a thin point at each crossing, turned a little so the right closes in, in perspective.
//             The geometry is still. What moves is the light: the net sits faint, and a soft band of light sweeps slowly
//             from the left edge to the right, "switching the net on" as it passes, then it rests and begins again. Nothing reacts to the pointer.
//   'floor' — the quiet in-app version: the same net at low opacity with no sweep, drawn once per size with no
//             animation loop (pair it with a CSS fade at the horizon).
// Colours come from the theme (--ds-line / --mo-focus for lines, --ds-node / --mo-action for nodes), so it follows the sage tokens and the dark
// sign-in variant. Honours prefers-reduced-motion (the net is drawn lit and still), pauses when the tab is hidden, cleans up on unmount.
'use client';

import { useEffect, useRef } from 'react';

export type MeshLook = 'stage' | 'floor';

const SWEEP_SECONDS = 13; // one pass of the light, left to right, then a rest
const SWEEP_ACTIVE = 0.78; // the share of that time the band is crossing the screen

export function MeshCanvas({ look = 'stage', className, dark = false }: { look?: MeshLook; className?: string; dark?: boolean }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const quiet = look === 'floor';
    const css = getComputedStyle(canvas);
    const lineColor = (css.getPropertyValue('--ds-line') || css.getPropertyValue('--mo-focus')).trim();
    const nodeColor = (css.getPropertyValue('--ds-node') || css.getPropertyValue('--mo-action')).trim();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width = 0; let height = 0; let dpr = 1;
    let raf = 0; let running = true; let last = performance.now(); let clock = 0;

    // ---------------------------------------------------------------- stage: still net, travelling light
    const lit = document.createElement('canvas'); // the whole net at full strength, drawn once per size
    const band = document.createElement('canvas'); // scratch: the lit net cut to the moving band
    const drawStageNet = () => {
      const g = lit.getContext('2d');
      if (!g) return;
      lit.width = canvas.width; lit.height = canvas.height;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, width, height);
      g.lineCap = 'round';
      // A flat net standing like a wall, turned a little so its right side recedes in perspective: near cells open on the left, closing in
      // towards the right. It fills the whole background. Lines and points are thin and fade slightly with distance.
      const yaw = Math.PI / 3; const pitch = -0.04; // the wall is turned 60 degrees into the background
      const cyw = Math.cos(yaw); const syw = Math.sin(yaw); const cp = Math.cos(pitch); const sp = Math.sin(pitch);
      const focal = 1.7 * Math.max(width, height * 1.3);
      const cx = width * 0.1; const cy = height * 0.5;
      const STEP = 0.07; const NX = 200; const NY = 90; const DEPTH = 1.9;
      const project = (i: number, j: number) => {
        const u = (i - 10) * STEP; const v = (j - NY / 2) * STEP;
        const x1 = u * cyw; const z1 = u * syw;
        const y2 = v * cp - z1 * sp; const z2 = v * sp + z1 * cp;
        const depth = DEPTH + z2;
        const s = depth > 0.2 ? focal / depth : 0;
        return { x: cx + x1 * s, y: cy + y2 * s, d: depth, ok: depth > 0.2 };
      };
      const smooth = (lo: number, hi: number, x: number) => { const k = Math.max(0, Math.min(1, (x - lo) / (hi - lo))); return k * k * (3 - 2 * k); };
      const fade = (d: number) => (1 - smooth(3.4, 8.0, d)) * (1 + 0.3 * (1 - smooth(1.7, 2.4, d))); // the far right dissolves into the horizon
      g.strokeStyle = lineColor; g.lineWidth = 0.75;
      const seg = (i0: number, j0: number, i1: number, j1: number) => {
        const a = project(i0, j0); const c = project(i1, j1);
        if (!a.ok || !c.ok) return;
        if ((a.x < -50 && c.x < -50) || (a.x > width + 50 && c.x > width + 50) || (a.y < -50 && c.y < -50) || (a.y > height + 50 && c.y > height + 50)) return;
        g.globalAlpha = Math.min(1, 0.7 * fade((a.d + c.d) / 2));
        if (g.globalAlpha < 0.03) return;
        g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(c.x, c.y); g.stroke();
      };
      for (let j = 0; j <= NY; j++) for (let i = 0; i < NX; i++) seg(i, j, i + 1, j);
      for (let i = 0; i <= NX; i++) for (let j = 0; j < NY; j++) seg(i, j, i, j + 1);
      g.fillStyle = nodeColor;
      for (let j = 0; j <= NY; j += 2) {
        for (let i = 0; i <= NX; i += 2) {
          const q = project(i, j);
          if (!q.ok || q.x < -6 || q.x > width + 6 || q.y < -6 || q.y > height + 6) continue;
          const f = fade(q.d);
          const r = Math.min(1.9, 0.35 + 2.6 / (q.d * q.d));
          if (f < 0.12 || r < 0.5) continue;
          g.globalAlpha = Math.min(1, 0.8 * f);
          g.beginPath(); g.arc(q.x, q.y, r, 0, 6.2832); g.fill();
        }
      }
      g.globalAlpha = 1;
    };
    const comp = document.createElement('canvas'); // one wall with its light, composed once per frame, then shown twice
    const drawStage = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const c = comp.getContext('2d');
      if (!c) return;
      comp.width = canvas.width; comp.height = canvas.height;
      if (quiet) { c.globalAlpha = 0.13; c.drawImage(lit, 0, 0); }
      else if (reduced) { c.globalAlpha = 0.55; c.drawImage(lit, 0, 0); }
      else {
        c.globalAlpha = dark ? 0.36 : 0.3; c.drawImage(lit, 0, 0); // the net at rest: quiet but present
        const cycle = (clock % SWEEP_SECONDS) / SWEEP_SECONDS;
        const progress = cycle / SWEEP_ACTIVE;
        const b = band.getContext('2d');
        if (progress <= 1 && b) { // (between passes the net rests)
          const half = 0.3 * canvas.width;
          const centre = (-0.3 + 1.6 * progress) * canvas.width; // from just off the left edge to just off the right
          band.width = canvas.width; band.height = canvas.height;
          b.drawImage(lit, 0, 0);
          const grad = b.createLinearGradient(centre - half, 0, centre + half, 0);
          grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(0.5, 'rgba(0,0,0,1)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
          b.globalCompositeOperation = 'destination-in';
          b.fillStyle = grad; b.fillRect(0, 0, band.width, band.height);
          c.globalAlpha = 0.8; c.drawImage(band, 0, 0); // the lit net inside the band
          c.globalAlpha = 0.3; c.filter = 'blur(7px)'; c.drawImage(band, 0, 0); c.filter = 'none'; // and a soft glow round it
        }
      }
      ctx.drawImage(comp, 0, 0);
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth; height = window.innerHeight;
      canvas.width = Math.floor(width * dpr); canvas.height = Math.floor(height * dpr);
      drawStageNet(); drawStage();
    };
    const tick = (now: number) => {
      if (!running) return;
      clock += Math.min(0.1, (now - last) / 1000);
      drawStage();
      last = now;
      raf = requestAnimationFrame(tick);
    };
    const onVisibility = () => {
      if (document.hidden) { running = false; return; }
      running = true; last = performance.now();
      if (!quiet && !reduced) raf = requestAnimationFrame(tick); else running = false;
    };

    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVisibility);
    resize();
    clock = 0.8; // the first pass of light starts at once, just inside the left edge
    if (!reduced && !quiet) raf = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [look, dark]);
  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
