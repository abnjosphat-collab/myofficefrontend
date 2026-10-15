// components/shared/deep-space/MeshCanvas.tsx — the 3D wireframe, as one canvas. Two looks share the file:
//   'stage' — the sign-in net: a flat grid with a thin point at each crossing, turned a little so the right closes in, in perspective.
//             The geometry is still. What moves is the light: the net sits faint, and a soft band of light sweeps slowly
//             from the left edge to the right, "switching the net on" as it passes, then it rests and begins again. Nothing reacts to the pointer.
//   'floor' — the quiet in-app version: a faint, wide floor receding to a horizon low on the page, swaying very slowly (pair it with a CSS fade
//             at the horizon).
// Colours come from the theme (--ds-line / --mo-focus for lines, --ds-node / --mo-action for nodes), so it follows the sage tokens and the dark
// sign-in variant. Honours prefers-reduced-motion (the net is drawn lit and still), pauses when the tab is hidden, cleans up on unmount.
'use client';

import { useEffect, useRef } from 'react';

export type MeshLook = 'stage' | 'floor';

const SWEEP_SECONDS = 13; // one pass of the light, left to right, then a rest
const SWEEP_ACTIVE = 0.78; // the share of that time the band is crossing the screen

// floor (plane): a flat sheet tipped forward into a receding floor.
const F_COLS = 40;
const F_ROWS = 28;
const F_STEP = 0.2;
const F_TILT = -1.0;
const F_DEPTH = 3.4;
const BREEZE_DIR = [0.94, 0.34] as const; // the way the floor's swell travels

export function MeshCanvas({ look = 'stage', className, dark = false }: { look?: MeshLook; className?: string; dark?: boolean }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const stage = true; // both looks draw the same net; 'floor' is the quiet in-app version: fainter, with no sweep of light
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
      // A woven sheet laid out like a hammock: a net on the ground plane seen from above and in front, its sides lifting towards you and its far
      // edge receding to a soft horizon, with a gentle swell running through it. Cells are about the same size across, smaller only as they go
      // back. Nothing in it is random: it is the same every time, so the page looks the same on every visit.
      const STEP = 0.115; const NX = 190; const NY = 130;
      const pitch = 0.62; const camH = 1.9; const camBack = 3.6;
      const f = 0.8 * Math.max(width, height * 1.5);
      const cx = width * 0.5; const cy = height * 0.3;
      const cp = Math.cos(pitch); const sp = Math.sin(pitch);
      const C = NX + 1; const N = C * (NY + 1);
      const px = new Float32Array(N); const py = new Float32Array(N); const pz = new Float32Array(N); const hh = new Float32Array(N); const ok = new Uint8Array(N);
      for (let j = 0; j <= NY; j++) {
        for (let i = 0; i <= NX; i++) {
          const k = j * C + i;
          const u = (i - NX / 2) * STEP; const v = (j - 30) * STEP;
          // The sides lift (u squared), the far end lifts a little, and a slow swell crosses the sheet.
          const far = Math.max(0, v + 1.5); // the folds grow towards the horizon, like a swell rolling away
          const h = 0.05 * u * u + 0.07 * Math.sin(u * 0.9 + v * 0.55) + (0.12 + 0.045 * far) * Math.sin(v * 0.95 + u * 0.28) + 0.05 * Math.sin(u * 1.9 - v * 1.1 + 1.4);
          const Y = h - camH; const Z = v + camBack;
          const yc = Y * cp + Z * sp; const zc = -Y * sp + Z * cp;
          if (zc < 0.35) { ok[k] = 0; continue; }
          px[k] = cx + (u * f) / zc; py[k] = cy - (yc * f) / zc; pz[k] = zc; hh[k] = h; ok[k] = 1;
        }
      }
      const light = new Float32Array(N);
      for (let j = 0; j <= NY; j++) {
        for (let i = 0; i <= NX; i++) {
          const i0 = Math.max(i - 1, 0); const i1 = Math.min(i + 1, NX); const j0 = Math.max(j - 1, 0); const j1 = Math.min(j + 1, NY);
          const dx = hh[j * C + i1] - hh[j * C + i0]; const dy = hh[j1 * C + i] - hh[j0 * C + i];
          light[j * C + i] = Math.max(0.2, Math.min(1, 0.6 - 2.2 * dx - 2.6 * dy)); // light from the upper left: the folds catch it on one side
        }
      }
      const smooth = (lo: number, hi: number, x: number) => { const q = Math.max(0, Math.min(1, (x - lo) / (hi - lo))); return q * q * (3 - 2 * q); };
      // The far end dissolves into the haze; nearer to you the lines are fuller.
      const haze = (k: number) => 1 - 0.8 * smooth(9, 22, pz[k]);
      const dim = lineColor;
      g.strokeStyle = dim; g.lineWidth = 0.75;
      const seg = (a: number, b: number) => {
        if (!ok[a] || !ok[b]) return;
        if ((px[a] < -40 && px[b] < -40) || (px[a] > width + 40 && px[b] > width + 40) || (py[a] > height + 60 && py[b] > height + 60)) return;
        const alpha = 0.95 * (0.45 + 0.55 * (light[a] + light[b]) / 2) * ((haze(a) + haze(b)) / 2);
        if (alpha < 0.03) return;
        g.globalAlpha = alpha;
        g.beginPath(); g.moveTo(px[a], py[a]); g.lineTo(px[b], py[b]); g.stroke();
      };
      for (let j = 0; j <= NY; j++) for (let i = 0; i < NX; i++) seg(j * C + i, j * C + i + 1);
      for (let i = 0; i <= NX; i++) for (let j = 0; j < NY; j++) seg(j * C + i, (j + 1) * C + i);
      g.fillStyle = nodeColor;
      for (let j = 0; j <= NY; j++) {
        for (let i = 0; i <= NX; i++) {
          const k = j * C + i;
          if (!ok[k] || px[k] < -6 || px[k] > width + 6 || py[k] < -6 || py[k] > height + 6) continue;
          const a = (0.5 + 0.5 * light[k]) * haze(k);
          const r = Math.min(1.8, 0.4 + 3.2 / pz[k]) * (0.8 + 0.3 * light[k]);
          if (a < 0.1 || r < 0.5) continue;
          g.globalAlpha = Math.min(1, a);
          g.beginPath(); g.arc(px[k], py[k], r, 0, 6.2832); g.fill();
        }
      }
      g.globalAlpha = 1;
    };
    const drawStage = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (quiet) { ctx.globalAlpha = 0.3; ctx.drawImage(lit, 0, 0); ctx.globalAlpha = 1; return; }
      if (reduced) { ctx.globalAlpha = 0.55; ctx.drawImage(lit, 0, 0); ctx.globalAlpha = 1; return; }
      ctx.globalAlpha = dark ? 0.5 : 0.42; ctx.drawImage(lit, 0, 0); // the net at rest: quiet but present
      const cycle = (clock % SWEEP_SECONDS) / SWEEP_SECONDS;
      const progress = cycle / SWEEP_ACTIVE;
      if (progress > 1) { ctx.globalAlpha = 1; return; } // resting between passes
      const half = 0.3 * canvas.width;
      const centre = (-0.3 + 1.6 * progress) * canvas.width; // from just off the left edge to just off the right
      const b = band.getContext('2d');
      if (!b) return;
      band.width = canvas.width; band.height = canvas.height;
      b.drawImage(lit, 0, 0);
      const grad = b.createLinearGradient(centre - half, 0, centre + half, 0);
      grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(0.5, 'rgba(0,0,0,1)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
      b.globalCompositeOperation = 'destination-in';
      b.fillStyle = grad; b.fillRect(0, 0, band.width, band.height);
      ctx.globalAlpha = 1; ctx.drawImage(band, 0, 0); // the lit net, at full strength inside the band
      ctx.globalAlpha = 0.55; ctx.filter = 'blur(7px)'; ctx.drawImage(band, 0, 0); ctx.filter = 'none'; // and a soft glow round it
      ctx.globalAlpha = 1;
    };

    // ---------------------------------------------------------------- floor: a faint plane swaying slowly
    const FN = F_COLS * F_ROWS;
    const fx = new Float32Array(FN); const fy = new Float32Array(FN); const fd = new Float32Array(FN);
    let phase = 0; let ffocal = 0; let fcx = 0; let fcy = 0;
    const [wx, wy] = BREEZE_DIR;
    const cp = Math.cos(F_TILT); const sp = Math.sin(F_TILT);
    const drawFloor = (now: number) => {
      const dt = Math.min(3, Math.max(0.25, (now - last) / 16.667));
      phase += (dt / 60) * 0.16;
      for (let j = 0; j < F_ROWS; j++) {
        for (let i = 0; i < F_COLS; i++) {
          const k = j * F_COLS + i;
          const u = (i - (F_COLS - 1) / 2) * F_STEP; const v = (j - (F_ROWS - 1) / 2) * F_STEP;
          const along = u * wx + v * wy; const across = -u * wy + v * wx;
          const left = Math.max(0.15, Math.min(1, 0.5 - u / (F_COLS * F_STEP)));
          const z = (0.05 + 0.2 * left) * 0.7 * (Math.sin(along * 1.2 - phase * 2) + 0.5 * Math.sin(across * 1.9 + clock * 0.8 + 1));
          const y2 = v * cp - z * sp; const z2 = v * sp + z * cp;
          const depth = Math.max(0.35, F_DEPTH + z2);
          const sc = ffocal / depth;
          fx[k] = fcx + u * sc; fy[k] = fcy + y2 * sc; fd[k] = depth;
        }
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.strokeStyle = lineColor; ctx.lineWidth = 1; ctx.globalAlpha = 0.2;
      for (let j = 0; j < F_ROWS; j++) {
        ctx.beginPath();
        for (let i = 0; i < F_COLS; i++) { const k = j * F_COLS + i; if (i) ctx.lineTo(fx[k], fy[k]); else ctx.moveTo(fx[k], fy[k]); }
        ctx.stroke();
      }
      for (let i = 0; i < F_COLS; i++) {
        ctx.beginPath();
        for (let j = 0; j < F_ROWS; j++) { const k = j * F_COLS + i; if (j) ctx.lineTo(fx[k], fy[k]); else ctx.moveTo(fx[k], fy[k]); }
        ctx.stroke();
      }
      ctx.fillStyle = nodeColor; ctx.globalAlpha = 0.4;
      for (let k = 0; k < FN; k++) {
        if (fx[k] < -10 || fx[k] > width + 10 || fy[k] < -10 || fy[k] > height + 10) continue;
        const r = Math.min(1.3, 2.6 / fd[k]);
        if (r < 0.5) continue;
        ctx.beginPath(); ctx.arc(fx[k], fy[k], r, 0, 6.2832); ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth; height = window.innerHeight;
      canvas.width = Math.floor(width * dpr); canvas.height = Math.floor(height * dpr);
      if (stage) { drawStageNet(); drawStage(); }
      else { ffocal = 0.52 * Math.max(width, height * 1.2); fcx = width / 2; fcy = height * 0.62; }
    };
    const tick = (now: number) => {
      if (!running) return;
      clock += Math.min(0.1, (now - last) / 1000);
      if (stage) drawStage(); else drawFloor(now);
      last = now;
      raf = requestAnimationFrame(tick);
    };
    const onVisibility = () => {
      if (document.hidden) { running = false; return; }
      running = true; last = performance.now();
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVisibility);
    resize();
    clock = stage ? 0.8 : 0; // the first pass of light starts at once, just inside the left edge
    if (reduced) { if (!stage) drawFloor(last + 16.667); }
    else raf = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [look, dark]);
  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
