'use client';

/**
 * PredictiveInput — single-line input + textarea with:
 *  • localStorage history per key (up to 40 unique values, ranked by how often
 *    each one's actually been used — a real "most frequently typed" ranking,
 *    not just "most recent" — with recency as the tiebreaker)
 *  • Inline ghost-text suggestion (Tab to accept)
 *  • Dropdown for multiple matching suggestions
 *  • Predefined hints that can be seeded per-instance
 */

import { useState, useEffect, useRef, useCallback, useId } from 'react';
import { createPortal } from 'react-dom';
import { cn, controlClasses, floatingSurface } from '@/components/ui-system';

const MAX_HISTORY = 40;

interface HistoryEntry { value: string; count: number; lastUsed: number }

// Older saved history was a plain string[] (recency-only, no counts) — treat
// each as used once so a pre-existing history keeps working instead of
// silently resetting the first time this ships.
const byFrequencyThenRecency = (a: HistoryEntry, b: HistoryEntry) => b.count - a.count || b.lastUsed - a.lastUsed;

export function loadHistory(key: string): HistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = JSON.parse(localStorage.getItem(`prd_hist_${key}`) ?? '[]');
    if (!Array.isArray(raw)) return [];
    const entries: HistoryEntry[] = raw.length > 0 && typeof raw[0] === 'string'
      ? (raw as string[]).map((value, i) => ({ value, count: 1, lastUsed: -i }))
      : raw as HistoryEntry[];
    return [...entries].sort(byFrequencyThenRecency);
  } catch { return []; }
}

export function saveToHistory(key: string, value: string) {
  if (!value.trim()) return;
  const existing = loadHistory(key);
  const match = existing.find(e => e.value === value);
  const rest = existing.filter(e => e.value !== value);
  const entry: HistoryEntry = { value, count: (match?.count ?? 0) + 1, lastUsed: Date.now() };
  // Ranked by frequency first (most-typed floats up over time), recency
  // breaks ties — so a value used 10 times still ranks above one used
  // once yesterday.
  const updated = [entry, ...rest].sort(byFrequencyThenRecency).slice(0, MAX_HISTORY);
  localStorage.setItem(`prd_hist_${key}`, JSON.stringify(updated));
}

/**
 * One register-backed suggestion. A `disabled` option stays listed (greyed, with its `note`) but is never proposed as
 * ghost text and cannot be accepted by Tab, Enter or click, so the reason it is unavailable is always visible.
 */
export interface PredictiveOption {
  /** Stable identity returned to `onPick` (for example a register row id). */
  value: string;
  /** Text placed in the field when picked. Defaults to `value`. */
  label?: string;
  description?: string;
  disabled?: boolean;
  /** Why the option is disabled, shown under it. */
  note?: string;
}

interface Entry { key: string; label: string; description?: string; disabled?: boolean; note?: string; option?: PredictiveOption }

export interface PredictiveInputProps {
  /** Stable key used for localStorage persistence (e.g. "breakdown_location") */
  historyKey: string;
  value: string;
  onChange: (v: string) => void;
  /** Called when the user commits a value (blur or Enter on single-line) */
  onCommit?: (v: string) => void;
  /** Plain string in most cases; accepts richer content (e.g. an icon + text) too —
   *  it's rendered as-is inside this component's own properly-associated <label>. */
  label?: React.ReactNode;
  /** Override the generated id used for the input/textarea (e.g. to associate an
   *  external, custom-styled <label htmlFor> instead of this component's own). */
  id?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  /** Extra class on wrapper */
  className?: string;
  /** Use textarea instead of input */
  multiline?: boolean;
  rows?: number;
  /** Seed suggestions to show even before user has history */
  hints?: string[];
  /** Additional Tailwind classes on the input/textarea itself */
  inputClassName?: string;
  /**
   * A register-backed list (machines, people, sections, parts). When given, matches come from it first, prefix matches
   * before contains matches, and the exact match stays listed so it can be picked. Without it nothing changes.
   */
  options?: PredictiveOption[];
  /** Mix this user's typing history into the suggestions (default true). Register fields pass false so history cannot outrank the register. */
  useHistory?: boolean;
  /** Called when an option is accepted (Tab on ghost text, Enter, or click), so the caller learns its `value`. */
  onPick?: (option: PredictiveOption) => void;
}

export function PredictiveInput({
  historyKey,
  value,
  onChange,
  onCommit,
  label,
  id: idProp,
  placeholder = '',
  required = false,
  disabled = false,
  error,
  className = '',
  multiline = false,
  rows = 3,
  hints = [],
  inputClassName = '',
  options,
  useHistory = true,
  onPick,
}: PredictiveInputProps) {
  const [history,   setHistory]   = useState<HistoryEntry[]>([]);
  const [ghost,     setGhost]     = useState('');        // inline ghost text
  const [ghostEntry, setGhostEntry] = useState<Entry | null>(null);
  const [open,      setOpen]      = useState(false);    // dropdown open
  const [highlight, setHighlight] = useState(0);
  const wrapRef  = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  // Portal + real ARIA roles (2026-08-29, UI foundation hardening plan Phase 3, item
  // 4 — audit/07-ui-polish-findings.md flagged this component as a second, hand-rolled
  // combobox-like dropdown, not portaled (clips inside an overflow-hidden ancestor,
  // same bug class Combobox's own portal already fixes) and with no ARIA roles. Kept
  // as its OWN component rather than merged into Combobox: this is genuinely
  // different UX (ghost-text/Tab-to-accept, localStorage frequency-ranked history) —
  // not a duplicate implementation of the same feature, so a forced merge would be a
  // much larger, riskier rewrite for no real benefit. Position is measured off the
  // wrapper (not just the input) to reproduce the exact placement the old `absolute
  // top-full` on the wrapper had — including sitting below the error message when
  // both are shown, not just below the input — rather than quietly changing it.
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const listboxId = useId();
  const optionId = (i: number) => `${listboxId}-opt-${i}`;
  const generatedFieldId = useId();
  const fieldId = idProp ?? generatedFieldId;

  useEffect(() => setMounted(true), []);

  const reposition = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({ top: r.bottom + 4, left: r.left, width: r.width });
  }, []);

  // Load history on mount
  useEffect(() => {
    setHistory(loadHistory(historyKey));
  }, [historyKey]);

  // Derive suggestions and ghost text. `history` is already frequency-then-
  // recency ranked; hints are seeded defaults, so they go after real history
  // (a value the user's actually typed should always outrank a static hint).
  const suggestions = useCallback((): Entry[] => {
    const q = value.toLowerCase();
    if (options) {
      const fromOptions: Entry[] = options.map(o => ({ key: `o:${o.value}`, label: o.label ?? o.value, description: o.description, disabled: o.disabled, note: o.note, option: o }));
      const fromHistory: Entry[] = useHistory ? history.map(e => ({ key: `h:${e.value}`, label: e.value })).filter(h => !fromOptions.some(o => o.label.toLowerCase() === h.label.toLowerCase())) : [];
      const all = [...fromOptions, ...fromHistory];
      if (!q.trim()) return all.slice(0, 8);
      const prefix = all.filter(e => e.label.toLowerCase().startsWith(q));
      const contains = all.filter(e => !e.label.toLowerCase().startsWith(q) && e.label.toLowerCase().includes(q));
      return [...prefix, ...contains].slice(0, 8);
    }
    const ranked = [...history.map(e => e.value), ...hints].filter((v, i, a) => a.indexOf(v) === i);
    const strings = !value.trim() ? ranked.slice(0, 8) : ranked.filter(x => x.toLowerCase().includes(q) && x.toLowerCase() !== q).slice(0, 8);
    return strings.map(x => ({ key: x, label: x }));
  }, [value, history, hints, options, useHistory]);

  // Update ghost text
  useEffect(() => {
    const q = value;
    if (!q.trim()) { setGhost(''); setGhostEntry(null); return; }
    const match = suggestions().find(e => !e.disabled && e.label.toLowerCase().startsWith(q.toLowerCase()));
    setGhost(match ? match.label.slice(q.length) : '');
    // `hints` defaults to a new array every render, so this effect runs every render: keep the same entry object when nothing changed, or it loops.
    const next = match && match.label.length > q.length ? match : null;
    setGhostEntry(prev => (prev?.key === next?.key ? prev : next));
  }, [value, suggestions]);

  // Outside click closes dropdown
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    if (!open) return;
    reposition();
    const on = () => reposition();
    window.addEventListener('scroll', on, true);
    window.addEventListener('resize', on);
    return () => { window.removeEventListener('scroll', on, true); window.removeEventListener('resize', on); };
  }, [open, reposition]);

  function acceptGhost() {
    if (!ghost) return false;
    // A register entry is taken exactly as the register spells it; a history suggestion keeps what was typed.
    if (ghostEntry?.option) { onChange(ghostEntry.label); onPick?.(ghostEntry.option); }
    else onChange(value + ghost);
    setGhost('');
    setGhostEntry(null);
    return true;
  }

  function commit(v: string) {
    if (!v.trim()) return;
    if (useHistory) {
      saveToHistory(historyKey, v.trim());
      setHistory(loadHistory(historyKey));
    }
    onCommit?.(v.trim());
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Tab' && ghost) {
      e.preventDefault();
      acceptGhost();
      setOpen(false);
      return;
    }
    if (!open) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setHighlight(0); }
      return;
    }
    const list = suggestions();
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight(h => Math.min(h + 1, list.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setHighlight(h => Math.max(h - 1, 0)); }
    if (e.key === 'Enter' && !multiline && list[highlight]) {
      e.preventDefault();
      const chosen = list[highlight];
      if (chosen.disabled) return; // listed with its reason, but cannot be picked
      onChange(chosen.label);
      if (chosen.option) onPick?.(chosen.option);
      commit(chosen.label);
      setOpen(false);
    }
    // Reached only when `open` is already true (the `!open` branch above returns
    // unconditionally). stopPropagation here is for plain React-tree nesting; the
    // CenterModal case is actually handled by CenterModal's own onEscapeKeyDown
    // (design-system/primitives.tsx), which checks aria-expanded on the event
    // target — Radix's Escape handling runs outside React's synthetic bubble
    // chain, so stopPropagation alone does not stop it (confirmed empirically).
    if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); }
  }

  function handleChange(v: string) {
    onChange(v);
    setOpen(true);
    setHighlight(0);
  }

  function handleBlur() {
    // small delay so click-on-suggestion fires first
    setTimeout(() => {
      commit(value);
      setOpen(false);
    }, 150);
  }

  const list = suggestions();
  const showPanel = open && list.length > 0 && !disabled;

  const BASE_CLS = cn(controlClasses, 'resize-none', error && 'border-danger', inputClassName);

  // Shared filler content for both branches below — doesn't itself need to be a
  // literal, unconditional JSX child of <label> (only the actual control does, for
  // label-has-for's static nesting check), so a variable reference is fine here.
  const captionId = label ? `${fieldId}-caption` : undefined;
  const captionSpan = label && (
    <span id={captionId} className="mb-1.5 block font-sans text-label font-medium text-ink">
      {label}{required && <span aria-hidden="true" className="ml-0.5 text-danger">*</span>}
    </span>
  );
  const ghostOverlay = !multiline && ghost && (
    <div
      aria-hidden
      className="pointer-events-none absolute left-0 right-0 flex h-9 items-center overflow-hidden px-3 font-sans text-body"
      style={{ top: label ? 'calc(1.25rem + 4px)' : 0 }}
    >
      <span className="invisible whitespace-pre">{value}</span>
      <span className="whitespace-pre text-ink-subtle">{ghost}</span>
      <span className="ml-1 rounded-xs border border-line px-1 font-sans text-caption text-ink-muted">Tab</span>
    </div>
  );
  const labelClassName = label ? 'block' : undefined;

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      {/* Always wrapped in <label> (with htmlFor+id, even when there's no visible
          caption) so the control is a real nested-and-id-associated label target —
          the caption span itself is optional/visual only. Two literal <label> blocks
          (rather than one wrapping a ternary) so each one's control child is a direct,
          unconditional descendant — label-has-for's nesting check doesn't evaluate
          conditional expressions, only literal JSX structure. */}
      {multiline ? (
        <label htmlFor={fieldId} className={labelClassName}>
          {captionSpan}
          {ghostOverlay}
          <textarea
            ref={inputRef as React.Ref<HTMLTextAreaElement>}
            id={fieldId}
            aria-label={captionId || idProp ? undefined : (placeholder || undefined)}
            aria-labelledby={captionId}
            value={value}
            disabled={disabled}
            placeholder={placeholder}
            rows={rows}
            role="combobox"
            aria-expanded={showPanel}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={showPanel && list[highlight] ? optionId(highlight) : undefined}
            className={cn(BASE_CLS, 'py-2 leading-6')}
            onChange={e => handleChange(e.target.value)}
            onFocus={() => setOpen(true)}
            onBlur={handleBlur}
            onKeyDown={handleKey}
          />
        </label>
      ) : (
        <label htmlFor={fieldId} className={labelClassName}>
          {captionSpan}
          {ghostOverlay}
          <input
            ref={inputRef as React.Ref<HTMLInputElement>}
            type="text"
            id={fieldId}
            aria-label={captionId || idProp ? undefined : (placeholder || undefined)}
            aria-labelledby={captionId}
            value={value}
            disabled={disabled}
            placeholder={placeholder}
            autoComplete="off"
            role="combobox"
            aria-expanded={showPanel}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={showPanel && list[highlight] ? optionId(highlight) : undefined}
            className={cn(BASE_CLS, 'h-9')}
            onChange={e => handleChange(e.target.value)}
            onFocus={() => setOpen(true)}
            onBlur={handleBlur}
            onKeyDown={handleKey}
          />
        </label>
      )}

      {error && <p role="alert" className="mt-1 font-sans text-caption font-medium text-danger">{error}</p>}

      {/* Dropdown — portaled (see the note above the position-tracking state) so it
          can't be clipped by an overflow-hidden ancestor. */}
      {mounted && showPanel && pos && createPortal(
        <div
          id={listboxId}
          role="listbox"
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 180 }}
          // pointer-events-auto — a CenterModal (Radix Dialog) sets pointer-events:none
          // on <body> while open; this panel is portaled to document.body directly (a
          // sibling of Dialog.Content, not a descendant), so without this it silently
          // inherits `none` and becomes unclickable from inside any modal.
          className={cn(floatingSurface, 'pointer-events-auto')}
        >
          <div className="max-h-44 overflow-y-auto p-1">
            {list.map((entry, i) => {
              // Highlight matching portion
              const text = entry.label;
              const qi = text.toLowerCase().indexOf(value.toLowerCase());
              const before = qi >= 0 ? text.slice(0, qi) : text;
              const match  = qi >= 0 ? text.slice(qi, qi + value.length) : '';
              const after  = qi >= 0 ? text.slice(qi + value.length) : '';
              return (
                <button
                  key={entry.key}
                  id={optionId(i)}
                  role="option"
                  aria-selected={i === highlight}
                  aria-disabled={entry.disabled || undefined}
                  type="button"
                  onMouseDown={e => {
                    e.preventDefault();
                    if (entry.disabled) return;
                    onChange(entry.label);
                    if (entry.option) onPick?.(entry.option);
                    commit(entry.label);
                    setOpen(false);
                  }}
                  onMouseEnter={() => setHighlight(i)}
                  className={cn('focus-ring flex min-h-9 w-full flex-col items-start justify-center rounded-control px-2.5 py-1.5 text-left font-sans text-body', entry.disabled ? 'cursor-not-allowed text-ink-muted' : 'text-ink', i === highlight && 'bg-surface-muted')}
                >
                  <span>
                    {before}
                    <span className={entry.disabled ? 'font-semibold' : 'font-semibold text-action'}>{match}</span>
                    {after}
                  </span>
                  {entry.description && <span className="text-caption text-ink-muted">{entry.description}</span>}
                  {entry.disabled && entry.note && <span className="text-caption font-medium text-warning">{entry.note}</span>}
                </button>
              );
            })}
          </div>
          {!multiline && ghost && (
            <div className="border-t border-line-subtle px-3 py-1.5 font-sans text-caption text-ink-muted">
              Tab to accept suggestion · ↑↓ navigate
            </div>
          )}
        </div>,
        document.body,
      )}
    </div>
  );
}
