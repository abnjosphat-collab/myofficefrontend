'use client';

/**
 * PredictiveInput — single-line input + textarea with:
 *  • localStorage history per key (saves up to 40 recent unique values)
 *  • Inline ghost-text suggestion (Tab to accept)
 *  • Dropdown for multiple matching suggestions
 *  • Predefined hints that can be seeded per-instance
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from '@/components/shared/theme';

const MAX_HISTORY = 40;

function loadHistory(key: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(`prd_hist_${key}`) ?? '[]') as string[];
  } catch { return []; }
}

function saveToHistory(key: string, value: string) {
  if (!value.trim()) return;
  const existing = loadHistory(key).filter(v => v !== value);
  const updated = [value, ...existing].slice(0, MAX_HISTORY);
  localStorage.setItem(`prd_hist_${key}`, JSON.stringify(updated));
}

export interface PredictiveInputProps {
  /** Stable key used for localStorage persistence (e.g. "breakdown_location") */
  historyKey: string;
  value: string;
  onChange: (v: string) => void;
  /** Called when the user commits a value (blur or Enter on single-line) */
  onCommit?: (v: string) => void;
  label?: string;
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
}

export function PredictiveInput({
  historyKey,
  value,
  onChange,
  onCommit,
  label,
  placeholder = '',
  required = false,
  disabled = false,
  error,
  className = '',
  multiline = false,
  rows = 3,
  hints = [],
  inputClassName = '',
}: PredictiveInputProps) {
  const [history,   setHistory]   = useState<string[]>([]);
  const [ghost,     setGhost]     = useState('');        // inline ghost text
  const [open,      setOpen]      = useState(false);    // dropdown open
  const [highlight, setHighlight] = useState(0);
  const wrapRef  = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  // Load history on mount
  useEffect(() => {
    setHistory(loadHistory(historyKey));
  }, [historyKey]);

  // Derive suggestions and ghost text
  const suggestions = useCallback(() => {
    if (!value.trim()) return [...hints, ...history].filter((v, i, a) => a.indexOf(v) === i).slice(0, 8);
    const q = value.toLowerCase();
    const all = [...hints, ...history].filter((v, i, a) => a.indexOf(v) === i);
    return all.filter(s => s.toLowerCase().includes(q) && s.toLowerCase() !== q).slice(0, 8);
  }, [value, history, hints]);

  // Update ghost text
  useEffect(() => {
    const q = value;
    if (!q.trim()) { setGhost(''); return; }
    const match = suggestions().find(s => s.toLowerCase().startsWith(q.toLowerCase()));
    setGhost(match ? match.slice(q.length) : '');
  }, [value, suggestions]);

  // Outside click closes dropdown
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  function acceptGhost() {
    if (!ghost) return false;
    const accepted = value + ghost;
    onChange(accepted);
    setGhost('');
    return true;
  }

  function commit(v: string) {
    if (!v.trim()) return;
    saveToHistory(historyKey, v.trim());
    setHistory(loadHistory(historyKey));
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
      onChange(chosen);
      commit(chosen);
      setOpen(false);
    }
    if (e.key === 'Escape') setOpen(false);
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
  const t = useTheme();

  const BASE_CLS = `w-full px-3 rounded-lg outline-none transition-all resize-none text-sm ${
    error ? (t.light ? 'border border-red-400' : 'border border-red-400/50') : ''
  } ${t.inputBg} ${inputClassName}`;

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      {label && (
        <label className={`text-xs font-medium block mb-1 ${t.textFaint}`}>
          {label}{required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
      )}

      {/* Ghost text layer (single-line only) */}
      {!multiline && ghost && (
        <div
          aria-hidden
          className="absolute left-0 right-0 px-3 h-9 flex items-center pointer-events-none text-sm overflow-hidden"
          style={{ top: label ? 'calc(1.25rem + 4px)' : 0 }}
        >
          <span className="invisible whitespace-pre">{value}</span>
          <span className={`whitespace-pre ${t.textFaint}`}>{ghost}</span>
          <span className="ml-1 text-[9px] text-brand-400 border border-brand-400/30 rounded px-0.5">Tab</span>
        </div>
      )}

      {multiline ? (
        <textarea
          ref={inputRef as React.Ref<HTMLTextAreaElement>}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          rows={rows}
          className={BASE_CLS + ' py-2'}
          onChange={e => handleChange(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={handleBlur}
          onKeyDown={handleKey}
        />
      ) : (
        <input
          ref={inputRef as React.Ref<HTMLInputElement>}
          type="text"
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          className={BASE_CLS + ' h-9'}
          onChange={e => handleChange(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={handleBlur}
          onKeyDown={handleKey}
        />
      )}

      {error && <p className="text-red-400 text-[11px] mt-0.5">{error}</p>}

      {/* Dropdown */}
      {open && list.length > 0 && !disabled && (
        <div className={`absolute left-0 right-0 top-full mt-1 z-[180] rounded-xl overflow-hidden oz-slide-up ${t.glassPopover} ${t.shadow}`}>
          <div className="max-h-44 overflow-y-auto p-1">
            {list.map((s, i) => {
              // Highlight matching portion
              const qi = s.toLowerCase().indexOf(value.toLowerCase());
              const before = qi >= 0 ? s.slice(0, qi) : s;
              const match  = qi >= 0 ? s.slice(qi, qi + value.length) : '';
              const after  = qi >= 0 ? s.slice(qi + value.length) : '';
              return (
                <button
                  key={s}
                  type="button"
                  onMouseDown={e => { e.preventDefault(); onChange(s); commit(s); setOpen(false); }}
                  onMouseEnter={() => setHighlight(i)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-sm transition-colors ${
                    i === highlight ? `${t.chipBg} ${t.textPrimary}` : `${t.textMuted} ${t.hoverBgSoft}`
                  }`}
                >
                  {before}
                  <span className="font-semibold text-brand-400">{match}</span>
                  {after}
                </button>
              );
            })}
          </div>
          {!multiline && ghost && (
            <div className={`px-3 py-1 border-t text-[10px] ${t.border} ${t.textFaint}`}>
              Tab to accept suggestion · ↑↓ navigate
            </div>
          )}
        </div>
      )}
    </div>
  );
}
