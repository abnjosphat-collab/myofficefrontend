// lib/notify.ts — the app's notification voice: one wrapper over the toast popups so every task outcome
// looks the same, stays readable for the right time, and plays a soft sound. Sounds are synthesized with
// WebAudio (no audio files to ship); the on/off choice persists on the device and defaults to on. A missing
// or blocked AudioContext never breaks the popup — the sound is skipped silently.
import { toast } from 'sonner';

const SOUND_KEY = 'myoffice.notify.sound';

export function soundEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(SOUND_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setSoundEnabled(on: boolean) {
  try {
    window.localStorage.setItem(SOUND_KEY, on ? 'on' : 'off');
  } catch {
    // Private browsing or a locked store: the popup still shows, the choice just does not persist.
  }
}

type Chime = 'success' | 'error' | 'info';

/** One shared context, created on first use (tasks always follow a click, so autoplay policy is satisfied). */
let sharedContext: AudioContext | null = null;
function context(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    sharedContext ??= new Ctor();
    if (sharedContext.state === 'suspended') void sharedContext.resume().catch(() => {});
    return sharedContext;
  } catch {
    return null;
  }
}

function blip(ctx: AudioContext, at: number, frequency: number, length: number, type: OscillatorType, peak: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
  osc.connect(gain).connect(ctx.destination);
  osc.start(at);
  osc.stop(at + length + 0.05);
}

function playChime(kind: Chime) {
  if (!soundEnabled()) return;
  const ctx = context();
  if (!ctx) return;
  try {
    const at = ctx.currentTime;
    if (kind === 'success') {
      blip(ctx, at, 660, 0.12, 'sine', 0.12);
      blip(ctx, at + 0.09, 880, 0.16, 'sine', 0.1);
    } else if (kind === 'error') {
      blip(ctx, at, 220, 0.22, 'triangle', 0.14);
    } else {
      blip(ctx, at, 520, 0.1, 'sine', 0.08);
    }
  } catch {
    // A sound must never break the popup it accompanies.
  }
}

export type NotifyOptions = { description?: string; duration?: number };

function show(kind: Chime, message: string, opts?: NotifyOptions) {
  const duration = opts?.duration ?? (kind === 'error' ? 8000 : kind === 'success' ? 4000 : 5000);
  toast[kind](message, { ...opts, duration });
  playChime(kind);
}

/** Task-outcome popups with sound. Failures linger (8s); successes confirm briefly (4s). */
export const notify = {
  success: (message: string, opts?: NotifyOptions) => show('success', message, opts),
  error: (message: string, opts?: NotifyOptions) => show('error', message, opts),
  info: (message: string, opts?: NotifyOptions) => show('info', message, opts),
};
