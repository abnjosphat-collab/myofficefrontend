// lib/notificationSound.ts — the app's notification sound: a short synthesised tone (no audio file), the chosen voice
// and the mute choice. The choice is made once in Settings (top bar) and remembered in this browser; screens that
// announce events (the compressors floor) read it here and play through `playSound`. Browsers only allow audio after
// the person has interacted with the page, so a failed play is silent by design.
import { useSyncExternalStore } from 'react';

export type SignalKind = 'saved' | 'status' | 'alert';
export type SoundVoice = 'chime' | 'bell' | 'marimba';

export const VOICES: Record<SoundVoice, { label: string; description: string }> = {
  chime: { label: 'Chime', description: 'Soft and clear' },
  bell: { label: 'Bell', description: 'A struck bell that rings out' },
  marimba: { label: 'Marimba', description: 'Short and woody' },
};
export const VOICE_KEYS = Object.keys(VOICES) as SoundVoice[];

/** Notes per kind (frequency in Hz, start offset in seconds): rising for good news, one note for a change, falling for attention. */
const NOTES: Record<SignalKind, Array<[number, number]>> = {
  saved: [[660, 0], [990, 0.12]],
  status: [[740, 0]],
  alert: [[880, 0], [587, 0.16]],
};

/** How each voice sounds one note: its partials (multiple of the pitch, relative loudness), attack and ring time. */
const TIMBRE: Record<SoundVoice, { partials: Array<[number, number]>; wave: OscillatorType; attack: number; ring: number; peak: number }> = {
  chime: { partials: [[1, 1]], wave: 'sine', attack: 0.02, ring: 0.35, peak: 0.12 },
  bell: { partials: [[1, 1], [2.76, 0.45], [5.4, 0.22]], wave: 'sine', attack: 0.005, ring: 1.1, peak: 0.1 },
  marimba: { partials: [[1, 1], [4, 0.25]], wave: 'triangle', attack: 0.004, ring: 0.22, peak: 0.16 },
};

const MUTE_KEY = 'compressors.floor.muted';
const VOICE_KEY = 'compressors.floor.voice';
const EVENT = 'oz-sound-changed';

function readRaw(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try { return window.localStorage.getItem(key); } catch { return null; }
}

function writeRaw(key: string, value: string) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(key, value); } catch { /* storage unavailable: the choice lasts until reload */ }
  window.dispatchEvent(new Event(EVENT));
}

export function getVoice(): SoundVoice {
  const v = readRaw(VOICE_KEY);
  return v && v in VOICES ? (v as SoundVoice) : 'chime';
}
export function getMuted(): boolean { return readRaw(MUTE_KEY) === '1'; }
export function setVoice(v: SoundVoice) { writeRaw(VOICE_KEY, v); }
export function setMuted(m: boolean) { writeRaw(MUTE_KEY, m ? '1' : '0'); }

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => { window.removeEventListener(EVENT, onChange); window.removeEventListener('storage', onChange); };
}

/** The chosen voice and mute flag, kept in step with Settings. */
export function useSoundPrefs() {
  const voice = useSyncExternalStore(subscribe, getVoice, () => 'chime' as SoundVoice);
  const muted = useSyncExternalStore(subscribe, getMuted, () => false);
  return { voice, muted };
}

let ctx: AudioContext | null = null;

/** Play one signal in a voice. Never throws: with no audio available the screen's visual cue still shows. */
export function playSound(kind: SignalKind, voice: SoundVoice) {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    const now = ctx.currentTime;
    const tone = TIMBRE[voice];
    for (const [freq, at] of NOTES[kind]) {
      for (const [multiple, level] of tone.partials) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = tone.wave;
        osc.frequency.value = freq * multiple;
        gain.gain.setValueAtTime(0.0001, now + at);
        gain.gain.exponentialRampToValueAtTime(tone.peak * level, now + at + tone.attack);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + at + tone.ring);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + at);
        osc.stop(now + at + tone.ring + 0.05);
      }
    }
  } catch { /* audio unavailable */ }
}
