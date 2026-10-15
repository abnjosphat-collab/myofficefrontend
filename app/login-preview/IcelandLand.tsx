// app/login-preview/IcelandLand.tsx — the Icelandic landscape under the sky, as one SVG: far snow-capped peaks, a still glacial lake that
// holds a soft reflection of them, then a mossy near shore and dark basalt hills in front. The ridge lines are generated from a fixed seed
// (a ridged value noise, so the peaks are sharp and the valleys soft), which means the same land every time. Snow is a gradient on each
// peak: white high up, turning to rock lower down. Colours are classes from the CSS module, so no colour literals live here.
import s from './login-preview.module.css';

const W = 1440;
const H = 900;

/** A tiny seeded value noise, so the land is the same on every render and on the server. */
function noise1(seed: number) {
  const table = Array.from({ length: 256 }, (_, i) => { const x = Math.sin((i + 1) * 12.9898 + seed * 78.233) * 43758.5453; return x - Math.floor(x); });
  return (x: number) => {
    const i = Math.floor(x); const f = x - i; const u = f * f * (3 - 2 * f);
    return table[((i % 256) + 256) % 256] * (1 - u) + table[(((i + 1) % 256) + 256) % 256] * u;
  };
}

/** A ridge line across the width. Peaks are sharp (1 - |2n - 1|) but sit on a broad base (`floor`), so they read as massifs, not spikes, with finer
 *  detail on top. Returns the closed path down to the bottom edge, and the line itself so snow can be laid along it. */
function ridge(seed: number, baseY: number, amp: number, freq: number, sharp: number, floor = 0.25) {
  const n = noise1(seed);
  const xs: number[] = []; const ys: number[] = [];
  const steps = 160;
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * W;
    const big = 1 - Math.abs(2 * n(x * freq) - 1);
    const fine = n(x * freq * 4.1 + 11) * 0.14;
    xs.push(x); ys.push(baseY - amp * (floor + (1 - floor) * Math.pow(big, sharp) * 0.9 + fine * 0.4));
  }
  const pts = xs.map((x, i) => `${x.toFixed(1)},${ys[i].toFixed(1)}`);
  return { line: `M0,${H} L${pts.join(' L')} L${W},${H} Z`, top: baseY - amp, xs, ys, baseY, amp };
}

/** Snow along a ridge: a band under the crest that thickens with height and breaks up unevenly, so the snow line is ragged like real snow. */
function snow(r: ReturnType<typeof ridge>, seed: number) {
  const n = noise1(seed);
  const top = r.xs.map((x, i) => `${x.toFixed(1)},${r.ys[i].toFixed(1)}`);
  const bottom = r.xs.map((x, i) => {
    const high = Math.max(0, (r.baseY - r.ys[i]) / r.amp - 0.34); // only the higher ground holds snow
    const depth = high * r.amp * 0.62 * (0.55 + 0.9 * n(x * 0.021));
    return `${x.toFixed(1)},${(r.ys[i] + depth).toFixed(1)}`;
  }).reverse();
  return `M${top.join(' L')} L${bottom.join(' L')} Z`;
}

const BACK = ridge(5, 600, 250, 0.0032, 1.4, 0.3);
const FAR = ridge(3, 606, 340, 0.0040, 1.7, 0.3);
const FAR_SNOW = snow(FAR, 17);
const BACK_SNOW = snow(BACK, 29);
const MID = ridge(9, 700, 72, 0.0075, 1.2);
const NEAR = ridge(21, 840, 64, 0.0058, 1.0);
const WATER_TOP = 604;
const WATER_BOTTOM = 735;

export function IcelandLand() {
  return (
    <svg className={s.land} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="ice-far" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1={FAR.top} y2="604">
          <stop offset="0" className={s.farRock} />
          <stop offset="1" className={s.farHaze} />
        </linearGradient>
        <linearGradient id="ice-back" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1={BACK.top} y2="600">
          <stop offset="0" className={s.backTop} />
          <stop offset="1" className={s.backBase} />
        </linearGradient>
        <linearGradient id="ice-snow" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1={FAR.top} y2="604">
          <stop offset="0" className={s.snow} />
          <stop offset="1" className={s.snowShade} />
        </linearGradient>
        <linearGradient id="ice-water" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" className={s.waterFar} />
          <stop offset="1" className={s.waterNear} />
        </linearGradient>
        <linearGradient id="ice-mid" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1={MID.top} y2="740">
          <stop offset="0" className={s.midTop} />
          <stop offset="1" className={s.midBase} />
        </linearGradient>
        <linearGradient id="ice-near" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1={NEAR.top} y2={H}>
          <stop offset="0" className={s.nearTop} />
          <stop offset="1" className={s.nearBase} />
        </linearGradient>
        <clipPath id="ice-lake"><rect x="0" y={WATER_TOP} width={W} height={WATER_BOTTOM - WATER_TOP} /></clipPath>
        <filter id="ice-soft" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="3" /></filter>
      </defs>
      <path d={BACK.line} fill="url(#ice-back)" />
      <path d={BACK_SNOW} className={s.snowFar} />
      <path d={FAR.line} fill="url(#ice-far)" />
      <path d={FAR_SNOW} fill="url(#ice-snow)" />
      <rect x="0" y={WATER_TOP - 1} width={W} height={WATER_BOTTOM - WATER_TOP + 1} fill="url(#ice-water)" />
      <g clipPath="url(#ice-lake)" opacity="0.28" filter="url(#ice-soft)">
        <path d={FAR.line} fill="url(#ice-far)" transform={`translate(0 ${2 * 604}) scale(1 -1)`} />
        <path d={FAR_SNOW} fill="url(#ice-snow)" transform={`translate(0 ${2 * 604}) scale(1 -1)`} />
      </g>
      <g className={s.shimmer} clipPath="url(#ice-lake)">
        <path d="M0,640 H1440 M0,664 H1440 M0,690 H1440 M0,716 H1440" className={s.ripples} />
      </g>
      <path d={MID.line} fill="url(#ice-mid)" />
      <path d={NEAR.line} fill="url(#ice-near)" />
    </svg>
  );
}
