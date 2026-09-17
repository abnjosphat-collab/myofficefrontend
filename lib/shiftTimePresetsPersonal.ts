import {
  FREQUENT_SHIFT_TIME_PRESETS,
  normalizeClockTime,
  shiftTimesMatch,
  type ShiftTimePreset,
} from './shiftTimePresets';

export const PERSONAL_SHIFT_PRESETS_STORAGE_KEY = 'myoffice_personal_shift_presets_v1';
export const SAVE_CURRENT_SHIFT_PRESET_ID = '__save_current__';

/** Uses before a learned range appears in quick shift (saved custom always shows). */
export const MIN_LEARN_USES = 2;
export const MAX_PERSONAL_QUICK_SHIFTS = 8;

export type PersonalShiftEntry = {
  start: string;
  end: string;
  useCount: number;
  lastUsedAt: number;
  label?: string;
  userAdded: boolean;
};

export type PersonalShiftStore = {
  entries: PersonalShiftEntry[];
};

function timeKey(start: string, end: string): string {
  return `${normalizeClockTime(start)}|${normalizeClockTime(end)}`;
}

export function formatCompactShiftLabel(start: string, end: string): string {
  const fmt = (t: string) => {
    const [h, m] = normalizeClockTime(t).split(':');
    const hh = String(Number(h));
    return m === '00' ? hh : `${hh}:${m}`;
  };
  return `${fmt(start)}–${fmt(end)}`;
}

function builtinByTimeKey(builtin: ShiftTimePreset[]): Map<string, ShiftTimePreset> {
  const m = new Map<string, ShiftTimePreset>();
  builtin.forEach(p => m.set(timeKey(p.start, p.end), p));
  return m;
}

/** Merge built-in presets with learned / user-saved ranges (deduped by clock span). */
export function mergeEffectiveShiftPresets(
  builtin: ShiftTimePreset[],
  personal: PersonalShiftEntry[],
): ShiftTimePreset[] {
  const seen = new Set<string>();
  const out: ShiftTimePreset[] = [];

  for (const p of builtin) {
    const k = timeKey(p.start, p.end);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(p);
  }

  const eligible = personal
    .filter(e => e.userAdded || e.useCount >= MIN_LEARN_USES)
    .sort((a, b) => b.useCount - a.useCount || b.lastUsedAt - a.lastUsedAt);

  let added = 0;
  for (const e of eligible) {
    if (added >= MAX_PERSONAL_QUICK_SHIFTS) break;
    const k = timeKey(e.start, e.end);
    if (seen.has(k)) continue;
    seen.add(k);
    const label = e.label?.trim() || formatCompactShiftLabel(e.start, e.end);
    const tag = e.userAdded ? 'Saved' : 'Often used';
    out.push({
      id: `personal-${k.replace('|', '-')}`,
      label,
      description: `${label} · ${normalizeClockTime(e.start)} – ${normalizeClockTime(e.end)} (${tag})`,
      start: normalizeClockTime(e.start),
      end: normalizeClockTime(e.end),
    });
    added += 1;
  }

  return out;
}

export function parsePersonalShiftStore(raw: string | null): PersonalShiftStore {
  if (!raw) return { entries: [] };
  try {
    const data = JSON.parse(raw) as PersonalShiftStore;
    if (!Array.isArray(data.entries)) return { entries: [] };
    return {
      entries: data.entries
        .filter(e => e?.start && e?.end)
        .map(e => ({
          start: normalizeClockTime(e.start),
          end: normalizeClockTime(e.end),
          useCount: Math.max(0, Number(e.useCount) || 0),
          lastUsedAt: Number(e.lastUsedAt) || 0,
          label: e.label?.trim() || undefined,
          userAdded: !!e.userAdded,
        })),
    };
  } catch {
    return { entries: [] };
  }
}

export function loadPersonalShiftStore(): PersonalShiftStore {
  if (typeof window === 'undefined') return { entries: [] };
  return parsePersonalShiftStore(localStorage.getItem(PERSONAL_SHIFT_PRESETS_STORAGE_KEY));
}

export function savePersonalShiftStore(store: PersonalShiftStore): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PERSONAL_SHIFT_PRESETS_STORAGE_KEY, JSON.stringify(store));
}

function upsertUsage(store: PersonalShiftStore, start: string, end: string, opts?: { userAdded?: boolean; label?: string }): PersonalShiftStore {
  const st = normalizeClockTime(start);
  const en = normalizeClockTime(end);
  if (!st || !en) return store;

  const k = timeKey(st, en);
  const now = Date.now();
  const entries = [...store.entries];
  const idx = entries.findIndex(e => timeKey(e.start, e.end) === k);

  if (idx >= 0) {
    const prev = entries[idx];
    entries[idx] = {
      ...prev,
      useCount: prev.useCount + 1,
      lastUsedAt: now,
      userAdded: opts?.userAdded ?? prev.userAdded,
      label: opts?.label?.trim() || prev.label,
    };
  } else {
    entries.push({
      start: st,
      end: en,
      useCount: opts?.userAdded ? 3 : 1,
      lastUsedAt: now,
      label: opts?.label?.trim() || undefined,
      userAdded: !!opts?.userAdded,
    });
  }

  return { entries };
}

const listeners = new Set<() => void>();

export function subscribePersonalShiftPresets(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyPersonalShiftPresets(): void {
  listeners.forEach(l => l());
}

/** Call when a shift time range is committed (preset pick, save, bulk apply). */
export function recordShiftTimeUsage(start: string, end: string): void {
  const next = upsertUsage(loadPersonalShiftStore(), start, end);
  savePersonalShiftStore(next);
  notifyPersonalShiftPresets();
}

/** Save current start/end as a named quick shift (always visible). */
export function addCustomShiftPreset(start: string, end: string, label?: string): void {
  const next = upsertUsage(loadPersonalShiftStore(), start, end, {
    userAdded: true,
    label: label?.trim() || formatCompactShiftLabel(start, end),
  });
  savePersonalShiftStore(next);
  notifyPersonalShiftPresets();
}

export function getEffectiveShiftPresets(builtin: ShiftTimePreset[] = FREQUENT_SHIFT_TIME_PRESETS): ShiftTimePreset[] {
  return mergeEffectiveShiftPresets(builtin, loadPersonalShiftStore().entries);
}
