'use client';

import { useState, useEffect, useMemo, useRef, useCallback, useId } from 'react';
import { API_BASE } from '@/lib/config';
import { UserCircle, ChevronDown, X, Loader2, useTheme } from '@/components/shared/theme';

const API = API_BASE;

export interface EmployeeRecord {
  id: number;
  employee_id: string;
  first_name: string;
  last_name: string;
  designation?: string;
  department?: string;
  phone?: string;
  supervisor?: string;
  section?: string;
}

function fullName(e: EmployeeRecord) {
  return `${e.first_name} ${e.last_name}`.trim();
}

export interface EmployeeNameInputProps {
  /** Current text value */
  value: string;
  /** Called with (nameString, employeeRecord | null) — null when manually typed */
  onChange: (name: string, employee: EmployeeRecord | null) => void;
  label?: string;
  required?: boolean;
  placeholder?: string;
  /** Extra CSS class on the wrapper */
  className?: string;
  disabled?: boolean;
  /** If true, shows error styling */
  error?: string;
}

let _cache: EmployeeRecord[] | null = null;
let _loading = false;
const _listeners: Array<() => void> = [];

async function ensureEmployees(): Promise<EmployeeRecord[]> {
  if (_cache) return _cache;
  if (_loading) {
    return new Promise(resolve => {
      _listeners.push(() => resolve(_cache ?? []));
    });
  }
  _loading = true;
  try {
    const r = await fetch(`${API}/api/employees`);
    if (r.ok) {
      _cache = (await r.json()) as EmployeeRecord[];
    } else {
      _cache = [];
    }
  } catch {
    _cache = [];
  }
  _loading = false;
  _listeners.forEach(fn => fn());
  _listeners.length = 0;
  return _cache ?? [];
}

export function EmployeeNameInput({
  value,
  onChange,
  label,
  required = false,
  placeholder = 'Select employee or type name…',
  className = '',
  disabled = false,
  error,
}: EmployeeNameInputProps) {
  const [employees,  setEmployees]  = useState<EmployeeRecord[]>([]);
  const [open,       setOpen]       = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [highlight,  setHighlight]  = useState(0);
  const wrapRef  = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load employees once
  useEffect(() => {
    setLoading(true);
    ensureEmployees().then(list => {
      setEmployees(list);
      setLoading(false);
    });
  }, []);

  // Filtered list is purely derived from value/employees — compute it during render
  // instead of syncing it via an effect (was react-hooks/set-state-in-effect: the
  // effect version added an extra render pass on every keystroke for no benefit,
  // 2026-08-30 fix). highlight isn't purely derived (also moves via arrow keys), so
  // it keeps its own effect resetting it whenever the filtered set changes.
  const filtered = useMemo(() => {
    if (!value.trim()) return employees.slice(0, 8);
    const q = value.toLowerCase();
    return employees.filter(e =>
      fullName(e).toLowerCase().includes(q) ||
      e.employee_id.toLowerCase().includes(q) ||
      (e.designation ?? '').toLowerCase().includes(q) ||
      (e.department ?? '').toLowerCase().includes(q)
    ).slice(0, 10);
  }, [value, employees]);

  useEffect(() => { setHighlight(0); }, [value, employees]);

  // Close on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  function select(emp: EmployeeRecord) {
    onChange(fullName(emp), emp);
    setOpen(false);
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') setOpen(true); return; }
    if (e.key === 'ArrowDown')  { e.preventDefault(); setHighlight(h => Math.min(h + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp')    { e.preventDefault(); setHighlight(h => Math.max(h - 1, 0)); }
    if (e.key === 'Enter' && filtered[highlight]) { e.preventDefault(); select(filtered[highlight]); }
    if (e.key === 'Escape') setOpen(false);
  }

  const t = useTheme();
  const inputId = useId();
  const GIN = `w-full h-9 px-3 pr-8 rounded-lg outline-none transition-all text-sm ${
    error ? (t.light ? 'border border-red-400' : 'border border-red-400/50') : ''
  } ${t.inputBg}`;

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      {label && (
        <label htmlFor={inputId} className={`text-xs font-medium block mb-1 ${t.textFaint}`}>
          {label}{required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        <UserCircle className={`absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none ${t.textFaint}`} />
        <input
          id={inputId}
          ref={inputRef}
          type="text"
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          aria-label={label || placeholder || 'Employee name'}
          className={GIN + ' pl-8'}
          autoComplete="off"
          onChange={e => { onChange(e.target.value, null); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKey}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {loading && <Loader2 className={`h-3 w-3 animate-spin ${t.textFaint}`} />}
          {value && !disabled && (
            <button type="button" onClick={() => { onChange('', null); setOpen(false); inputRef.current?.focus(); }}
              className={`h-4 w-4 flex items-center justify-center transition-colors ${t.textFaint} ${t.hoverText}`}>
              <X className="h-3 w-3" />
            </button>
          )}
          <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''} ${t.textFaint}`} />
        </div>
      </div>

      {error && <p className="text-red-400 text-[11px] mt-0.5">{error}</p>}

      {/* Dropdown */}
      {open && !disabled && (
        <div className={`absolute left-0 right-0 top-full mt-1 z-[180] rounded-xl overflow-hidden oz-slide-up ${t.glassPopover} ${t.shadow}`}>
          {filtered.length === 0 ? (
            <div className={`px-3 py-3 text-xs italic ${t.textFaint}`}>
              No employees found — name will be saved as typed
            </div>
          ) : (
            <div className="max-h-56 overflow-y-auto p-1">
              {filtered.map((emp, i) => (
                <button
                  key={emp.id}
                  type="button"
                  onMouseDown={e => { e.preventDefault(); select(emp); }}
                  onMouseEnter={() => setHighlight(i)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${
                    i === highlight ? `${t.chipBg} ${t.textPrimary}` : `${t.textMuted} ${t.hoverBgSoft}`
                  }`}
                >
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-brand-600 to-brand-400 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                    {emp.first_name[0]}{emp.last_name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{fullName(emp)}</p>
                    <p className={`text-[10px] truncate ${t.textFaint}`}>
                      <span className="font-mono text-brand-400">{emp.employee_id}</span>
                      {emp.designation && ` · ${emp.designation}`}
                      {emp.department && ` · ${emp.department}`}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
          <div className={`px-3 py-1.5 border-t text-[10px] ${t.border} ${t.textFaint}`}>
            ↑↓ navigate · Enter select · Type freely to enter manually
          </div>
        </div>
      )}
    </div>
  );
}
