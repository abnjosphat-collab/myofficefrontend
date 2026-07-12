'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, UserCircle, ChevronDown, X, Loader2 } from '@/components/shared/theme';

const API = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/$/, '');

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
  const [filtered,   setFiltered]   = useState<EmployeeRecord[]>([]);
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

  // Filter on every keystroke
  useEffect(() => {
    if (!value.trim()) { setFiltered(employees.slice(0, 8)); return; }
    const q = value.toLowerCase();
    const results = employees.filter(e =>
      fullName(e).toLowerCase().includes(q) ||
      e.employee_id.toLowerCase().includes(q) ||
      (e.designation ?? '').toLowerCase().includes(q) ||
      (e.department ?? '').toLowerCase().includes(q)
    ).slice(0, 10);
    setFiltered(results);
    setHighlight(0);
  }, [value, employees]);

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

  const GIN = `w-full h-9 px-3 pr-8 rounded-lg bg-white/[0.07] border ${
    error ? 'border-red-400/50' : 'border-white/[0.12]'
  } text-white placeholder:text-white/30 focus:border-[#86BBD8]/50 focus:bg-white/[0.10] text-sm focus:outline-none transition-all`;

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      {label && (
        <label className="text-white/55 text-xs font-medium block mb-1">
          {label}{required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        <UserCircle className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          className={GIN + ' pl-8'}
          autoComplete="off"
          onChange={e => { onChange(e.target.value, null); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKey}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {loading && <Loader2 className="h-3 w-3 animate-spin text-white/30" />}
          {value && !disabled && (
            <button type="button" onClick={() => { onChange('', null); setOpen(false); inputRef.current?.focus(); }}
              className="h-4 w-4 flex items-center justify-center text-white/25 hover:text-white/60 transition-colors">
              <X className="h-3 w-3" />
            </button>
          )}
          <ChevronDown className={`h-3 w-3 text-white/25 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {error && <p className="text-red-400 text-[11px] mt-0.5">{error}</p>}

      {/* Dropdown */}
      {open && !disabled && (
        <div className="absolute left-0 right-0 top-full mt-1 z-[180] rounded-xl border border-white/[0.12] bg-[#060f1c]/95 backdrop-blur-2xl shadow-2xl overflow-hidden oz-slide-up">
          {filtered.length === 0 ? (
            <div className="px-3 py-3 text-xs text-white/40 italic">
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
                    i === highlight ? 'bg-[#2A4D69]/50 text-white' : 'text-white/70 hover:bg-white/[0.06]'
                  }`}
                >
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[#2A4D69] to-[#86BBD8] flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                    {emp.first_name[0]}{emp.last_name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{fullName(emp)}</p>
                    <p className="text-[10px] text-white/40 truncate">
                      <span className="font-mono text-[#86BBD8]/80">{emp.employee_id}</span>
                      {emp.designation && ` · ${emp.designation}`}
                      {emp.department && ` · ${emp.department}`}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
          <div className="px-3 py-1.5 border-t border-white/[0.06] text-[10px] text-white/25">
            ↑↓ navigate · Enter select · Type freely to enter manually
          </div>
        </div>
      )}
    </div>
  );
}
