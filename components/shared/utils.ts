// Shared utility functions — import these instead of re-defining in every page

import type { EquipmentBase } from '@/app/equipment/types';

export function fmtDate(s?: string | null, style: 'short' | 'long' = 'short'): string {
  if (!s) return '—';
  try {
    const d = new Date(s);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-GB',
      style === 'short'
        ? { day: '2-digit', month: 'short', year: 'numeric' }
        : { day: 'numeric', month: 'long', year: 'numeric' }
    );
  } catch { return '—'; }
}

export function fmtDateTime(s?: string | null): string {
  if (!s) return '—';
  try {
    const d = new Date(s);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return '—'; }
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(n => n[0]?.toUpperCase() ?? '')
    .join('');
}

export function calcDays(start?: string | null, end?: string | null): number {
  if (!start || !end) return 0;
  try {
    const s = new Date(start), e = new Date(end);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0;
    return Math.ceil(Math.abs(e.getTime() - s.getTime()) / 86_400_000) + 1;
  } catch { return 0; }
}

export function formatCurrency(n: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency,
    minimumFractionDigits: 2,
  }).format(n || 0);
}

export function formatCurrencyShort(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

// The qty × unit-price line-item total, repeated ~18 times across
// WorkOrderDetailModal/maintenance/breakdowns/spares/issues/quotations under 3
// different field-naming conventions (unit_cost, unit_price, rate). The math
// itself is trivial — this exists so there's one place to add tax/rounding
// logic later, and so every call site reads the same intent instead of a bare
// `*`.
export function lineTotal(qty: number, unitPrice: number): number {
  return (qty || 0) * (unitPrice || 0);
}

export function nowLocal(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

// One consistent "how do I show this equipment as one string" — every picker/
// dropdown/breadcrumb should call this instead of re-deriving its own format.
// Mirrors the backend's Equipment.display_name computed field (backend/app/
// routers/equipment.py) — same rule, per-language idiom (a plain function here
// since EquipmentBase is an interface, not a class with methods).
export function equipmentDisplayName(eq: EquipmentBase): string {
  return eq.equipment_id ? `${eq.equipment_id} — ${eq.name}` : eq.name;
}

// The one search-match rule, so every equipment search/filter (EquipmentAutocomplete,
// a future compressor picker, etc.) agrees on what "matches" means instead of each
// reimplementing it slightly differently. Mirrors the backend's Equipment.matches().
export function equipmentMatches(eq: EquipmentBase, query: string): boolean {
  const q = query.toLowerCase();
  return [eq.name, eq.equipment_id, eq.model, eq.manufacturer].some(v => (v || '').toLowerCase().includes(q));
}

export function clsx(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
