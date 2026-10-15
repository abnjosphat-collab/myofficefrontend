// app/login-preview/IcelandSky.tsx — an Icelandic sky with slow, soft clouds, drawn by one small WebGL fragment shader. Two cloud decks drift
// at different speeds (high, thin, stretched streaks and a lower, fuller deck that is lit from the upper left, with greyer undersides), over
// a pale blue-to-haze gradient. Nothing reacts to the pointer. Renders at reduced resolution (clouds are soft anyway), honours
// prefers-reduced-motion (one still frame), pauses when the tab is hidden, and frees its GL resources on unmount. Colours come from the CSS
// module (--ice-sky-top, --ice-sky-low, --ice-cloud, --ice-cloud-shade), so no colour literals live in this file.
'use client';

import { useEffect, useRef } from 'react';

const VERT = `attribute vec2 a; varying vec2 v; void main() { v = a * 0.5 + 0.5; gl_Position = vec4(a, 0.0, 1.0); }`;

const FRAG = `
precision highp float;
varying vec2 v;
uniform vec2 uRes;
uniform float uTime;
uniform vec3 uTop;
uniform vec3 uLow;
uniform vec3 uCloud;
uniform vec3 uShade;

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) {
  float s = 0.0; float a = 0.5;
  for (int i = 0; i < 5; i++) { s += a * noise(p); p = p * 2.03 + vec2(7.1, 3.7); a *= 0.5; }
  return s;
}

void main() {
  float aspect = uRes.x / uRes.y;
  vec2 uv = vec2(v.x * aspect, v.y);
  float t = uTime;
  float height = v.y; // 0 at the bottom of the screen, 1 at the top
  vec3 sky = mix(uLow, uTop, smoothstep(0.35, 1.0, height));

  // High deck: thin streaks stretched along the wind, slow.
  vec2 hp = vec2(uv.x * 0.9 - t * 0.012, uv.y * 3.2);
  float high = smoothstep(0.50, 0.78, fbm(hp * 1.6 + vec2(0.0, 2.0))) * smoothstep(0.45, 0.9, height) * 0.55;

  // Low deck: fuller clouds that drift faster, with a light offset sample so the lit tops and shaded undersides separate.
  vec2 lp = vec2(uv.x * 1.15 - t * 0.030, uv.y * 1.9);
  float d0 = fbm(lp * 1.7);
  float d1 = fbm(lp * 1.7 + vec2(0.05, -0.07)); // sampled towards the light
  float body = smoothstep(0.46, 0.74, d0) * smoothstep(0.30, 0.62, height);
  float lit = clamp((d0 - d1) * 5.0 + 0.55, 0.0, 1.0);

  vec3 col = sky;
  col = mix(col, uCloud, high);
  vec3 cloudCol = mix(uShade, uCloud, lit);
  col = mix(col, cloudCol, body);
  // Haze thickens towards the horizon, where the mountains stand.
  col = mix(col, uLow, smoothstep(0.55, 0.30, height) * 0.5);
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
  console.warn('IcelandSky shader:', gl.getShaderInfoLog(shader));
  return null;
}

export function IcelandSky({ className }: { className?: string }) {
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
    set('uTop', '--ice-sky-top', 'skyblue'); set('uLow', '--ice-sky-low', 'white'); set('uCloud', '--ice-cloud', 'white'); set('uShade', '--ice-cloud-shade', 'gray');

    let raf = 0; let running = true; let clock = 0; let last = performance.now();
    const resize = () => {
      const scale = Math.min(window.devicePixelRatio || 1, 1) * 0.55;
      canvas.width = Math.max(2, Math.floor(window.innerWidth * scale)); canvas.height = Math.max(2, Math.floor(window.innerHeight * scale));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
    };
    const draw = () => { gl.uniform1f(uTime, clock); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); };
    const tick = (now: number) => {
      if (!running) return;
      clock += Math.min(0.1, (now - last) / 1000);
      last = now; draw();
      raf = requestAnimationFrame(tick);
    };
    const onVisibility = () => { if (document.hidden) { running = false; return; } running = true; last = performance.now(); raf = requestAnimationFrame(tick); };
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVisibility);
    resize();
    clock = 40; // start part-way through the drift so the first frame is already a good sky
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) draw();
    else raf = requestAnimationFrame(tick);
    return () => {
      running = false; cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize); document.removeEventListener('visibilitychange', onVisibility);
      // Free what this effect made but leave the context alive: React's strict mode re-runs the effect on the same canvas.
      gl.deleteBuffer(buffer); gl.deleteProgram(program); gl.deleteShader(vs); gl.deleteShader(fs);
    };
  }, []);
  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
