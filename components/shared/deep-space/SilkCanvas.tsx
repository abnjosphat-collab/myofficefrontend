// components/shared/deep-space/SilkCanvas.tsx — a slow, silky cloth moving in a breeze, drawn by one small WebGL fragment shader. A smooth height
// field of long folds that run mostly one way (a diagonal), each bent by a slow cross-wave, is lit from the upper left: broad soft shading, a
// gentle sheen along the crests and a faint rim on the turning edges, so it reads as satin linen. Nothing reacts to the pointer; the motion
// is a slow drift. Three colours come from the CSS module (--ds-silk-base / -shade / -hi), so light and dark are the same cloth in different
// light. Without WebGL it simply draws nothing and the stage's plain background shows. Renders at reduced resolution (the cloth is soft
// anyway), honours prefers-reduced-motion (one still frame), pauses when the tab is hidden, and frees its GL resources on unmount.
'use client';

import { useEffect, useRef } from 'react';

const VERT = `attribute vec2 a; varying vec2 v; void main() { v = a * 0.5 + 0.5; gl_Position = vec4(a, 0.0, 1.0); }`;

const FRAG = `
precision highp float;
varying vec2 v;
uniform vec2 uRes;
uniform float uTime;
uniform vec3 uBase;
uniform vec3 uShade;
uniform vec3 uHi;

// Cloth in a real wind. Everything travels WITH the wind: long billows roll across the sheet, each one bent along its crest so the fronts
// ripple instead of marching in straight lines, with a finer flutter riding on top only where a gust passes. Gusts are slow envelopes that
// move with the wind, so the cloth lifts, snaps and settles in turn rather than waving evenly.
float fold(vec2 p, float t) {
  vec2 w = normalize(vec2(1.0, 0.32));   // the way the wind blows
  vec2 c = vec2(-w.y, w.x);              // across the wind
  float x = dot(p, w);
  float y = dot(p, c);
  float gust = 0.55 + 0.45 * sin(x * 0.85 - t * 1.25 + 0.9 * sin(y * 0.65 + t * 0.40));
  float h = 1.00 * sin(x * 1.45 - t * 1.55 + 0.55 * sin(y * 0.80 + t * 0.42) + 0.3 * sin(y * 1.90 - t * 0.70));
  h += 0.55 * sin(x * 2.55 - t * 2.20 + 0.8 * sin(y * 1.30 - t * 0.60) + 1.7);
  h += 0.28 * gust * sin(x * 4.30 - t * 3.20 + 1.0 * sin(y * 2.10 + t * 0.90) + 0.6);
  h += 0.30 * h * abs(h);                // fuller crests, flatter troughs: how cloth drapes under load
  return h * (0.70 + 0.55 * gust);
}

void main() {
  float aspect = uRes.x / uRes.y;
  vec2 p = (v - 0.5) * vec2(aspect, 1.0) * 2.0;
  float t = uTime;
  float e = 0.01;
  float h = fold(p, t);
  float hx = fold(p + vec2(e, 0.0), t) - h;
  float hy = fold(p + vec2(0.0, e), t) - h;
  vec3 n = normalize(vec3(-hx / e * 1.5, -hy / e * 1.5, 1.0));
  vec3 l = normalize(vec3(-0.50, 0.55, 0.68));
  float diffuse = clamp(dot(n, l) * 0.5 + 0.5, 0.0, 1.0);
  vec3 r = reflect(-l, n);
  float sheen = pow(max(r.z, 0.0), 6.0);    // the soft, wide glow of silk (no hard hot spots)
  float rim = pow(1.0 - n.z, 1.5);
  // One colour: a milky linen, lit from the upper left. Shadow is the same cloth, darker; light through the thin folds warms it.
  vec3 col = mix(uShade, uBase, smoothstep(0.28, 0.76, diffuse));
  col *= 0.90 + 0.10 * clamp(h * 0.4 + 0.5, 0.0, 1.0);
  col += uBase * 0.07 * (1.0 - diffuse) * smoothstep(0.0, 0.5, rim);
  col += uHi * (0.16 * sheen + 0.06 * rim);
  gl_FragColor = vec4(col, 1.0);
}
`;

/** A token colour as 0..1 r, g, b (paint it on one pixel and read it back; tokens can be any CSS colour). */
function rgb(colour: string): [number, number, number] {
  const c = document.createElement('canvas'); c.width = c.height = 1;
  const g = c.getContext('2d');
  if (!g) return [1, 1, 1];
  g.fillStyle = colour; g.fillRect(0, 0, 1, 1);
  const d = g.getImageData(0, 0, 1, 1).data;
  return [d[0] / 255, d[1] / 255, d[2] / 255];
}

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source); gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  console.warn('SilkCanvas shader:', gl.getShaderInfoLog(shader));
  return null;
}

export function SilkCanvas({ className, dark = false }: { className?: string; dark?: boolean }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = ref.current;
    const gl = canvas?.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
    if (!canvas || !gl) return;
    const vs = compile(gl, gl.VERTEX_SHADER, VERT); const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    const program = gl.createProgram();
    if (!vs || !fs || !program) return;
    gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, 'a');
    gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uRes = gl.getUniformLocation(program, 'uRes'); const uTime = gl.getUniformLocation(program, 'uTime');
    const css = getComputedStyle(canvas);
    const set = (name: string, token: string, fallback: string) => { const c = rgb(css.getPropertyValue(token).trim() || fallback); gl.uniform3f(gl.getUniformLocation(program, name), c[0], c[1], c[2]); };
    set('uBase', '--ds-silk-base', '#f7faf8'); set('uShade', '--ds-silk-shade', '#c5d4cb'); set('uHi', '--ds-silk-hi', '#ffffff');

    let raf = 0; let running = true; let clock = 0; let last = performance.now();
    const resize = () => {
      const scale = Math.min(window.devicePixelRatio || 1, 1) * 0.85; // enough resolution for the weave to show
      canvas.width = Math.max(2, Math.floor(window.innerWidth * scale)); canvas.height = Math.max(2, Math.floor(window.innerHeight * scale));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
    };
    const draw = () => { gl.uniform1f(uTime, clock); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); };
    const tick = (now: number) => {
      if (!running) return;
      clock += Math.min(0.1, (now - last) / 1000) * 1.0; // real time: the waves carry their own speeds
      last = now; draw();
      raf = requestAnimationFrame(tick);
    };
    const onVisibility = () => { if (document.hidden) { running = false; return; } running = true; last = performance.now(); raf = requestAnimationFrame(tick); };
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVisibility);
    resize();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) draw();
    else raf = requestAnimationFrame(tick);
    return () => {
      running = false; cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize); document.removeEventListener('visibilitychange', onVisibility);
      // Free what this effect made but leave the context alive: React's strict mode re-runs the effect on the same canvas.
      gl.deleteBuffer(buffer); gl.deleteProgram(program); gl.deleteShader(vs); gl.deleteShader(fs);
    };
  }, [dark]);
  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
