// components/safety/index.tsx — Shared UI primitives for all Safety pages
'use client';

import React, { useState } from 'react';
import {
  RefreshCw, ChevronUp, ChevronDown, ChevronRight,
  Search, X, Loader2, Plus, Trash2, Check,
  AlertCircle, TrendingUp, TrendingDown,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://myofficebackend.onrender.com';

export const glassInput =
  'w-full px-3 py-2 text-sm rounded-lg bg-white/[0.07] border border-white/[0.12] text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 focus:bg-white/[0.11] transition-all';

export const glassLabel = 'text-xs font-medium text-white/55 mb-1 block';

export const glassTextarea =
  'w-full px-3 py-2 text-sm rounded-lg bg-white/[0.07] border border-white/[0.12] text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 focus:bg-white/[0.11] transition-all resize-none';

export const glassSelect =
  'w-full px-3 py-2 text-sm rounded-lg bg-white/[0.07] border border-white/[0.12] text-white focus:outline-none focus:border-white/30 transition-all cursor-pointer';

// ─── COLOR MAPS ───────────────────────────────────────────────────────────────

export const STATUS_COLORS: Record<string, string> = {
  open:        '#f59e0b',
  'in-progress': '#60a5fa',
  'in progress': '#60a5fa',
  closed:      '#34d399',
  overdue:     '#f43f5e',
  draft:       '#94a3b8',
  submitted:   '#a78bfa',
  approved:    '#34d399',
  rejected:    '#f43f5e',
  reviewed:    '#60a5fa',
  pending:     '#f59e0b',
  completed:   '#34d399',
  active:      '#34d399',
  inactive:    '#f43f5e',
  suspended:   '#f59e0b',
};

export const PRIORITY_COLORS: Record<string, string> = {
  low:      '#34d399',
  medium:   '#f59e0b',
  high:     '#fb923c',
  critical: '#f43f5e',
};

export const SECTION_COLORS: Record<string, string> = {
  Mechanical: '#86BBD8',
  Electrical: '#f59e0b',
  General:    '#a78bfa',
  mechanical: '#86BBD8',
  electrical: '#f59e0b',
  general:    '#a78bfa',
};

// ─── API FETCH WRAPPER ────────────────────────────────────────────────────────

export async function safetyFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    let msg = `API error ${res.status}`;
    try { const j = await res.json(); msg = j.detail || msg; } catch {}
    throw new Error(msg);
  }
  return res.json();
}

// ─── BADGES ───────────────────────────────────────────────────────────────────

export function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status?.toLowerCase()] || '#86BBD8';
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize"
      style={{ color, background: `${color}18`, border: `1px solid ${color}35` }}>
      <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
      {status}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  const color = PRIORITY_COLORS[priority?.toLowerCase()] || '#86BBD8';
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize"
      style={{ color, background: `${color}18`, border: `1px solid ${color}35` }}>
      {priority}
    </span>
  );
}

export function SectionBadge({ section }: { section: string }) {
  const color = SECTION_COLORS[section] || '#86BBD8';
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
      style={{ color, background: `${color}18`, border: `1px solid ${color}35` }}>
      {section}
    </span>
  );
}

// ─── LOADING / EMPTY STATES ───────────────────────────────────────────────────

export function LoadingState({ message = 'Loading…' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center py-24 text-white/30 gap-2">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="text-sm">{message}</span>
    </div>
  );
}

export function EmptyState({
  icon: Icon, title, message, onAdd, addLabel,
}: {
  icon: React.ElementType; title: string; message?: string;
  onAdd?: () => void; addLabel?: string;
}) {
  return (
    <div className="text-center py-24 text-white/25">
      <Icon className="h-12 w-12 mx-auto mb-4 opacity-20" />
      <div className="text-sm font-medium text-white/40">{title}</div>
      {message && <div className="text-xs mt-1 text-white/20">{message}</div>}
      {onAdd && (
        <button type="button" onClick={onAdd}
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all hover:-translate-y-0.5"
          style={{ background: 'linear-gradient(135deg,#2A4D69,#1e3a52)', border: '1px solid rgba(134,187,216,0.3)' }}>
          <Plus className="h-3.5 w-3.5" /> {addLabel || 'Add Record'}
        </button>
      )}
    </div>
  );
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────

export function SafetyStatCard({
  label, value, color = '#86BBD8', sub, trend,
}: {
  label: string; value: string | number; color?: string;
  sub?: string; trend?: 'up' | 'down' | 'neutral';
}) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : null;
  return (
    <div className="rounded-xl p-3 border border-white/[0.08] bg-white/[0.05]">
      <div className="text-xl font-bold leading-none" style={{ color }}>{value}</div>
      <div className="text-[11px] text-white/45 mt-1">{label}</div>
      {sub && (
        <div className="flex items-center gap-1 mt-1">
          {TrendIcon && <TrendIcon className="h-3 w-3" style={{ color }} />}
          <span className="text-[10px] text-white/30">{sub}</span>
        </div>
      )}
    </div>
  );
}

// ─── HERO PANEL ───────────────────────────────────────────────────────────────

export function SafetyHero({
  icon: Icon, title, subtitle, accentColor = '#86BBD8',
  stats, onRefresh, refreshing, showStats, onToggleStats, actions,
}: {
  icon: React.ElementType; title: string; subtitle: string;
  accentColor?: string;
  stats?: { label: string; value: string | number; color?: string; sub?: string }[];
  onRefresh?: () => void; refreshing?: boolean;
  showStats?: boolean; onToggleStats?: () => void;
  actions?: React.ReactNode;
}) {
  return (
    <div className="oz-glass-dark rounded-2xl overflow-hidden">
      <div className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2 sm:gap-3">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="p-2 sm:p-2.5 rounded-xl flex-shrink-0"
            style={{ background: 'rgba(42,77,105,0.5)', border: `1px solid ${accentColor}30` }}>
            <Icon className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: accentColor }} />
          </div>
          <div className="min-w-0">
            <nav className="flex items-center gap-1.5 text-xs text-white/40 mb-0.5">
              <span>Home</span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-white/70 font-medium truncate">{title}</span>
            </nav>
            <h1 className="text-lg sm:text-xl font-bold text-white font-heading tracking-tight truncate">{title}</h1>
            <p className="text-xs text-white/35 mt-0.5 truncate">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {actions}
          {onRefresh && (
            <button type="button" onClick={onRefresh} disabled={refreshing} title="Refresh"
              className="h-10 w-10 sm:h-8 sm:w-8 flex items-center justify-center rounded-lg bg-white/[0.07] hover:bg-white/[0.15] border border-white/[0.12] text-white/50 transition-all disabled:opacity-40">
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          )}
          {onToggleStats && (
            <button type="button" title={showStats ? 'Hide stats' : 'Show stats'}
              onClick={onToggleStats}
              className="h-10 w-10 sm:h-8 sm:w-8 flex items-center justify-center rounded-lg bg-white/[0.07] hover:bg-white/[0.15] border border-white/[0.12] text-white/50 transition-all">
              {showStats ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
      </div>
      {stats && showStats !== false && (
        <div className={`px-4 sm:px-6 pb-4 pt-3 border-t border-white/[0.07] grid gap-2 sm:gap-3 ${
          stats.length <= 4 ? 'grid-cols-2 sm:grid-cols-4' :
          stats.length === 5 ? 'grid-cols-2 sm:grid-cols-5' :
          'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6'
        }`}>
          {stats.map(s => (
            <SafetyStatCard key={s.label} label={s.label} value={s.value}
              color={s.color} sub={s.sub} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── CONTROLS BAR ─────────────────────────────────────────────────────────────

export function SafetyControls({ children }: { children: React.ReactNode }) {
  return (
    <div className="oz-glass-panel rounded-2xl overflow-hidden">
      <div className="px-4 sm:px-5 py-3 flex flex-wrap items-center gap-2 sm:gap-3">
        {children}
      </div>
    </div>
  );
}

// ─── SEARCH BAR ───────────────────────────────────────────────────────────────

export function SafetySearchBar({
  value, onChange, placeholder = 'Search…', className,
}: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; className?: string;
}) {
  return (
    <div className={`relative flex-1 min-w-0 sm:min-w-48 sm:max-w-72 ${className || ''}`}>
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30 pointer-events-none" />
      <input type="text" value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-8 pr-8 py-2 sm:py-1.5 w-full text-xs rounded-lg bg-white/[0.07] border border-white/[0.12] text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-all" />
      {value && (
        <button type="button" onClick={() => onChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center text-white/25 hover:text-white/60 transition-colors">
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

// ─── FILTER PILLS ─────────────────────────────────────────────────────────────

export function FilterPills({
  label, options, value, onChange, accentColor = '#86BBD8',
}: {
  label?: string; options: { value: string; label: string }[];
  value: string; onChange: (v: string) => void; accentColor?: string;
}) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {label && <span className="text-[10px] text-white/30 uppercase tracking-wider mr-1">{label}</span>}
      {options.map(o => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
          className="h-9 sm:h-7 px-3 sm:px-2.5 text-[11px] rounded-lg border capitalize transition-all"
          style={value === o.value ? {
            background: `${accentColor}20`, borderColor: `${accentColor}40`,
            color: accentColor,
          } : {
            background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.10)',
            color: 'rgba(255,255,255,0.40)',
          }}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ─── PANEL WRAPPER ────────────────────────────────────────────────────────────

export function SafetyPanel({
  children, label, count, className,
}: {
  children: React.ReactNode; label?: string;
  count?: number; className?: string;
}) {
  return (
    <div className={`oz-glass-panel rounded-2xl overflow-hidden ${className || ''}`}>
      {label && (
        <div className="px-5 py-2.5 border-b border-white/[0.07] flex items-center justify-between">
          <span className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">{label}</span>
          {count !== undefined && (
            <span className="text-[11px] text-white/30">{count} record{count !== 1 ? 's' : ''}</span>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

// ─── MODAL ────────────────────────────────────────────────────────────────────

export function SafetyModal({
  open, onClose, title, icon: Icon, width = 'max-w-xl', children, accentColor = '#86BBD8',
}: {
  open: boolean; onClose: () => void; title: string;
  icon?: React.ElementType; width?: string;
  children: React.ReactNode; accentColor?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`w-full ${width} rounded-2xl shadow-2xl my-4`}
        style={{ background: 'rgba(8,18,32,0.98)', border: '1px solid rgba(255,255,255,0.12)' }}>
        <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {Icon && (
              <div className="p-1.5 rounded-lg"
                style={{ background: 'rgba(42,77,105,0.5)', border: `1px solid ${accentColor}30` }}>
                <Icon className="h-4 w-4" style={{ color: accentColor }} />
              </div>
            )}
            <span className="text-sm font-semibold text-white">{title}</span>
          </div>
          <button type="button" onClick={onClose} title="Close"
            className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-white/[0.08] text-white/40 hover:text-white transition-all">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── FORM FIELD ───────────────────────────────────────────────────────────────

export function FormField({
  label, required, children, className,
}: {
  label: string; required?: boolean; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={className}>
      <label className={glassLabel}>
        {label}{required && <span className="text-rose-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

// ─── MODAL FOOTER BUTTONS ─────────────────────────────────────────────────────

export function ModalActions({
  onCancel, onSubmit, submitLabel = 'Save', submitting, cancelLabel = 'Cancel',
}: {
  onCancel: () => void; onSubmit?: () => void;
  submitLabel?: string; submitting?: boolean; cancelLabel?: string;
}) {
  return (
    <div className="flex gap-2 px-5 py-4 border-t border-white/[0.08]">
      <button type="button" onClick={onCancel}
        className="flex-1 py-2.5 rounded-xl text-sm text-white/50 hover:text-white border border-white/10 hover:border-white/20 transition-all">
        {cancelLabel}
      </button>
      <button type={onSubmit ? 'button' : 'submit'} onClick={onSubmit} disabled={submitting}
        className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white inline-flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0"
        style={{ background: 'linear-gradient(135deg,#2A4D69,#1e3a52)', border: '1px solid rgba(134,187,216,0.3)' }}>
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        {submitLabel}
      </button>
    </div>
  );
}

// ─── ACTION ITEMS EDITOR ──────────────────────────────────────────────────────
// Reused by: SHEQ Inspection, Work Stoppage, VFL, PTO

export interface ActionItem {
  id: string;
  action: string;
  responsible: string;
  targetDate: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  completedDate?: string;
  remarks?: string;
}

const uid = () => Math.random().toString(36).slice(2);

export function newActionItem(): ActionItem {
  return { id: uid(), action: '', responsible: '', targetDate: '', status: 'Pending' };
}

export function ActionItemsEditor({
  items, onChange, readOnly = false,
}: {
  items: ActionItem[]; onChange?: (items: ActionItem[]) => void; readOnly?: boolean;
}) {
  const update = (id: string, patch: Partial<ActionItem>) =>
    onChange?.(items.map(i => i.id === id ? { ...i, ...patch } : i));
  const remove = (id: string) => onChange?.(items.filter(i => i.id !== id));
  const add = () => onChange?.([...items, newActionItem()]);

  return (
    <div className="space-y-2">
      {items.length === 0 && !readOnly && (
        <div className="text-center py-6 text-white/25 text-xs">No action items yet</div>
      )}
      {items.map((item, idx) => (
        <div key={item.id} className="rounded-xl p-3 bg-white/[0.03] border border-white/[0.06] space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-white/30 font-semibold uppercase tracking-wider">Action {idx + 1}</span>
            {!readOnly && (
              <button type="button" onClick={() => remove(item.id)} title="Remove"
                className="h-5 w-5 flex items-center justify-center rounded hover:bg-rose-500/20 text-white/20 hover:text-rose-400 transition-all">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          {readOnly ? (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-white/35">Action: </span><span className="text-white/75">{item.action}</span></div>
              <div><span className="text-white/35">Responsible: </span><span className="text-white/75">{item.responsible}</span></div>
              <div><span className="text-white/35">Target: </span><span className="text-white/75">{item.targetDate}</span></div>
              <div><span className="text-white/35">Status: </span><StatusBadge status={item.status} /></div>
              {item.remarks && <div className="col-span-2"><span className="text-white/35">Remarks: </span><span className="text-white/75">{item.remarks}</span></div>}
            </div>
          ) : (
            <>
              <textarea value={item.action} onChange={e => update(item.id, { action: e.target.value })}
                placeholder="Describe the corrective action…"
                rows={2} className={glassTextarea} />
              <div className="grid grid-cols-3 gap-2">
                <input type="text" value={item.responsible}
                  onChange={e => update(item.id, { responsible: e.target.value })}
                  placeholder="Responsible person"
                  className={glassInput + ' text-xs py-1.5'} />
                <input type="date" value={item.targetDate}
                  onChange={e => update(item.id, { targetDate: e.target.value })}
                  className={glassInput + ' text-xs py-1.5'} style={{ colorScheme: 'dark' }} />
                <select value={item.status}
                  onChange={e => update(item.id, { status: e.target.value as ActionItem['status'] })}
                  className={glassSelect + ' text-xs py-1.5'} style={{ colorScheme: 'dark' }}>
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
              {item.status === 'Completed' && (
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" value={item.completedDate || ''}
                    onChange={e => update(item.id, { completedDate: e.target.value })}
                    placeholder="Completion date"
                    className={glassInput + ' text-xs py-1.5'} style={{ colorScheme: 'dark' }} />
                  <input type="text" value={item.remarks || ''}
                    onChange={e => update(item.id, { remarks: e.target.value })}
                    placeholder="Remarks…"
                    className={glassInput + ' text-xs py-1.5'} />
                </div>
              )}
            </>
          )}
        </div>
      ))}
      {!readOnly && (
        <button type="button" onClick={add}
          className="inline-flex items-center gap-1 text-[11px] text-white/35 hover:text-[#86BBD8] transition-colors">
          <Plus className="h-3 w-3" /> Add action item
        </button>
      )}
    </div>
  );
}

// ─── TABLE WRAPPER ────────────────────────────────────────────────────────────

export function SafetyTable({
  headers, children, className,
}: {
  headers: { label: string; className?: string }[];
  children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`overflow-x-auto ${className || ''}`}>
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/[0.06]">
            {headers.map((h, i) => (
              <th key={i} className={`py-2.5 text-[10px] font-semibold text-white/35 uppercase tracking-wider ${h.className || (i === 0 ? 'pl-5 pr-3 text-left' : 'px-3 text-left')}`}>
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

// ─── EXPANDABLE TABLE ROW ACTIONS ─────────────────────────────────────────────

export function RowActions({
  expanded, onToggle, onEdit, onDelete, editLabel = 'Edit', deleteLabel = 'Delete',
}: {
  expanded?: boolean; onToggle?: () => void;
  onEdit?: () => void; onDelete?: () => void;
  editLabel?: string; deleteLabel?: string;
}) {
  return (
    <div className="flex items-center justify-end gap-0.5" onClick={e => e.stopPropagation()}>
      {onToggle && (
        <button type="button" title={expanded ? 'Collapse' : 'Expand'}
          onClick={e => { e.stopPropagation(); onToggle(); }}
          className="h-9 w-9 sm:h-7 sm:w-7 flex items-center justify-center rounded text-white/25 hover:text-white/70 transition-all">
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      )}
      {onEdit && (
        <button type="button" title={editLabel}
          onClick={e => { e.stopPropagation(); onEdit(); }}
          className="h-9 w-9 sm:h-7 sm:w-7 flex items-center justify-center rounded hover:bg-[#86BBD8]/15 text-white/25 hover:text-[#86BBD8] transition-all">
          <svg className="h-3.5 w-3.5 sm:h-3 sm:w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
      )}
      {onDelete && (
        <button type="button" title={deleteLabel}
          onClick={e => { e.stopPropagation(); onDelete(); }}
          className="h-9 w-9 sm:h-7 sm:w-7 flex items-center justify-center rounded hover:bg-rose-500/20 text-white/20 hover:text-rose-400 transition-all">
          <Trash2 className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
        </button>
      )}
    </div>
  );
}

// ─── SECTION PICKER ───────────────────────────────────────────────────────────

export function SectionPicker({
  value, onChange, options = ['Mechanical', 'Electrical', 'General'],
}: {
  value: string; onChange: (v: string) => void; options?: string[];
}) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {options.map(s => {
        const color = SECTION_COLORS[s] || '#86BBD8';
        const active = value === s;
        return (
          <button key={s} type="button" onClick={() => onChange(s)}
            className="h-7 px-3 text-[11px] rounded-lg border transition-all"
            style={active ? {
              background: `${color}20`, borderColor: `${color}45`, color,
            } : {
              background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.10)',
              color: 'rgba(255,255,255,0.40)',
            }}>
            {s}
          </button>
        );
      })}
    </div>
  );
}

// ─── INLINE TAB BAR ───────────────────────────────────────────────────────────

export function TabBar({
  tabs, active, onChange, accentColor = '#86BBD8',
}: {
  tabs: { id: string; label: string; icon?: React.ElementType }[];
  active: string; onChange: (id: string) => void; accentColor?: string;
}) {
  return (
    <div className="flex items-center gap-1">
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = active === tab.id;
        return (
          <button key={tab.id} type="button" onClick={() => onChange(tab.id)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all border"
            style={isActive ? {
              background: `${accentColor}20`, borderColor: `${accentColor}35`, color: accentColor,
            } : {
              background: 'transparent', borderColor: 'transparent',
              color: 'rgba(255,255,255,0.45)',
            }}>
            {Icon && <Icon className="h-3 w-3" />}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── ADD BUTTON ───────────────────────────────────────────────────────────────

export function AddButton({
  label, onClick, icon: Icon = Plus,
}: {
  label: string; onClick: () => void; icon?: React.ElementType;
}) {
  return (
    <button type="button" onClick={onClick}
      className="h-10 sm:h-8 px-4 sm:px-3 flex items-center gap-1.5 text-xs rounded-xl font-semibold text-white transition-all hover:-translate-y-0.5 flex-shrink-0"
      style={{ background: 'linear-gradient(135deg,#2A4D69,#1e3a52)', border: '1px solid rgba(134,187,216,0.3)' }}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

// ─── DATE RANGE FILTER ────────────────────────────────────────────────────────

export function DateRangeFilter({
  from, to, onFromChange, onToChange,
}: {
  from: string; to: string;
  onFromChange: (v: string) => void; onToChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input type="date" value={from} onChange={e => onFromChange(e.target.value)}
        title="From date"
        className="px-3 py-2 sm:py-1.5 text-xs rounded-lg bg-white/[0.07] border border-white/[0.12] text-white focus:outline-none focus:border-white/30 transition-all min-w-0"
        style={{ colorScheme: 'dark' }} />
      <span className="text-white/20 text-xs">to</span>
      <input type="date" value={to} onChange={e => onToChange(e.target.value)}
        title="To date"
        className="px-3 py-2 sm:py-1.5 text-xs rounded-lg bg-white/[0.07] border border-white/[0.12] text-white focus:outline-none focus:border-white/30 transition-all min-w-0"
        style={{ colorScheme: 'dark' }} />
    </div>
  );
}

// ─── CLEAR FILTERS BUTTON ─────────────────────────────────────────────────────

export function ClearFiltersButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="h-9 sm:h-7 px-3 sm:px-2.5 flex items-center gap-1 text-[11px] rounded-lg bg-white/[0.05] border border-white/10 text-white/40 hover:text-white/60 transition-all">
      <X className="h-3 w-3" /> Clear
    </button>
  );
}

// ─── INITIALS AVATAR ─────────────────────────────────────────────────────────

export function InitialsAvatar({ name, size = 8 }: { name: string; size?: number }) {
  const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div className={`h-${size} w-${size} rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white`}
      style={{ background: 'rgba(42,77,105,0.6)', border: '1px solid rgba(134,187,216,0.25)' }}>
      {initials}
    </div>
  );
}
