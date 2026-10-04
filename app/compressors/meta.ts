// app/compressors/meta.ts — how a compressor's status, service urgency and rating are shown (tone + icon + words).
import type { IconMeaning, Tone } from '@/components/ui-system';

export const STATUS_META: Record<string, { label: string; tone: Tone; icon: IconMeaning }> = {
  running: { label: 'Running', tone: 'success', icon: 'active' },
  standby: { label: 'Standby', tone: 'info', icon: 'pending' },
  maintenance: { label: 'Maintenance', tone: 'warning', icon: 'maintenance' },
  offline: { label: 'Offline', tone: 'danger', icon: 'inactive' },
};
export const STATUS_KEYS = Object.keys(STATUS_META);
export const statusLabel = (s: string) => STATUS_META[s]?.label ?? s;

export const URGENCY_TONE: Record<string, Tone> = { critical: 'danger', high: 'warning', medium: 'info', low: 'neutral' };
export const RATING_TONE: Record<string, Tone> = { Excellent: 'success', Good: 'info', Fair: 'warning', Poor: 'danger' };
export const TREND_META: Record<string, { tone: Tone; label: string }> = {
  improving: { tone: 'success', label: 'Improving' },
  declining: { tone: 'danger', label: 'Declining' },
  stable: { tone: 'neutral', label: 'Stable' },
};

/** Hours with the unit kept to the number; a missing value is a dash, never a made-up 0. */
export const hours = (n: number | null | undefined) => (n == null || Number.isNaN(Number(n)) ? '—' : `${Number(n).toFixed(1)} h`);
