// app/spares/page.tsx
'use client';

import { AppShell } from '@/components/app-shell';
import { formatDate } from '@/lib/format';
import { formatCurrency, lineTotal as calcLineTotal } from '@/components/shared/utils';
import { api } from '@/lib/apiClient';
import { EXPORT_BRAND_RGB } from '@/lib/exportUtils';
import { useTheme, accentText, PageHero, StatTile, StatusBadge, SearchInput, ViewToggle, FormField, FormActions, CenterModal, ACCENT_HEX, STATUS_TONE, GlowCard, SelectField, GroupSection, staggerContainer, fadeUp, Combobox, type ComboOption as SharedComboOption, TYPE_WEIGHT } from '@/components/shared/theme';
import { PredictiveInput } from '@/components/shared/PredictiveInput';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import {
  Package, Search, Plus, Pencil, Trash2, Copy, RefreshCw, AlertTriangle,
  ChevronDown, ChevronUp, ShoppingCart, AlertOctagon,
  Loader2, List, X, Star, BarChart3, Filter,
  SortAsc, ChevronsUp, ChevronsDown, Grid3x3, MoreVertical, Check,
  Database, ClipboardList, Download, Upload,
} from '@/components/shared/theme';
import Link from 'next/link';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import type { ReqHeader, ReqLine, SavedRequisition, SortConfig, Spare, SpareFormData, StockStatus } from './types';
import { apiCreate, apiCreateSavedReq, apiDelete, apiDeleteSavedReq, apiFetchAll, apiGetSavedReqs, apiUpdate } from './api';

// ─── CONSTANTS & UTILS ───────────────────────────────────────────────────────

// formatDate/formatCurrency were identical to the shared ones — imported at the top instead.

const getStockStatus = (current: number, min: number): StockStatus => {
  if (current <= 0) return { label: 'Out of Stock', color: STATUS_TONE.critical };
  if (current <= min) return { label: 'Low Stock', color: STATUS_TONE.warning };
  if (current <= min * 1.5) return { label: 'Adequate', color: STATUS_TONE.info };
  return { label: 'In Stock', color: STATUS_TONE.good };
};
const PRIORITY_COLOR: Record<string, string> = { critical: STATUS_TONE.critical, high: STATUS_TONE.warning, medium: STATUS_TONE.info, low: STATUS_TONE.neutral };
const PRIORITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

// Palette for categories — drawn from the shared ACCENT_HEX brand palette (not
// arbitrary hexes), hashed so each distinct category name gets a stable color.
const GROUP_PALETTE = [ACCENT_HEX.blue, ACCENT_HEX.amber, ACCENT_HEX.emerald, ACCENT_HEX.violet, ACCENT_HEX.cyan, ACCENT_HEX.indigo];
function categoryColor(category?: string) {
  if (!category) return '#94a3b8';
  let h = 0;
  for (let i = 0; i < category.length; i++) h = (h * 31 + category.charCodeAt(i)) >>> 0;
  return GROUP_PALETTE[h % GROUP_PALETTE.length];
}
const uid = () => Math.random().toString(36).slice(2);
const PAGE_SIZE = 24;

// ─── FIELD MEMORY & SAVED REQS (localStorage) ────────────────────────────────

const FIELD_MEM_KEY = 'ozech_field_memory';
const SAVED_REQS_KEY = 'ozech_saved_reqs';
const CUSTOM_CATS_KEY = 'ozech_spare_custom_categories';
const PREDEFINED_PART_CATS = ['Hydraulic power packs', 'Lubricants', 'Dewatering/Pumps', 'Steels', 'Stationery'];
const PREDEFINED_EQUIP_CATS = ['Winders', 'Conveyance', 'Airloaders', 'Compressors', 'Locomotives', 'Scrappers', 'Winches', 'Transformers'];
const ALL_PREDEFINED_CATS = [...PREDEFINED_PART_CATS, ...PREDEFINED_EQUIP_CATS];

const getCustomCats = (): string[] => { if (typeof window === 'undefined') return []; try { return JSON.parse(localStorage.getItem(CUSTOM_CATS_KEY) || '[]'); } catch { return []; } };
const saveCustomCat = (cat: string) => {
  if (!cat.trim() || typeof window === 'undefined') return;
  try {
    const existing = getCustomCats();
    if (!ALL_PREDEFINED_CATS.includes(cat.trim()) && !existing.includes(cat.trim())) localStorage.setItem(CUSTOM_CATS_KEY, JSON.stringify([cat.trim(), ...existing].slice(0, 50)));
  } catch {}
};
const getFieldMemory = (field: string): string[] => { if (typeof window === 'undefined') return []; try { return (JSON.parse(localStorage.getItem(FIELD_MEM_KEY) || '{}')[field] || []) as string[]; } catch { return []; } };
const rememberField = (field: string, value: string) => {
  if (!value.trim() || typeof window === 'undefined') return;
  try { const m = JSON.parse(localStorage.getItem(FIELD_MEM_KEY) || '{}'); m[field] = [value.trim(), ...((m[field] || []) as string[]).filter(v => v !== value.trim())].slice(0, 25); localStorage.setItem(FIELD_MEM_KEY, JSON.stringify(m)); } catch {}
};
const getSavedReqs = (): SavedRequisition[] => { if (typeof window === 'undefined') return []; try { return JSON.parse(localStorage.getItem(SAVED_REQS_KEY) || '[]'); } catch { return []; } };
const persistSavedReqs = (reqs: SavedRequisition[]) => { try { localStorage.setItem(SAVED_REQS_KEY, JSON.stringify(reqs)); } catch {} };
const defaultReqHeader: ReqHeader = { requester: '', reason: '', urgency: 'routine', priority: 'medium', required_for: '' };

// ─── ENTITY COMBO INPUT (pick from API list or type freely, blended with recent
// values) — built on the shared portal-based Combobox so it inherits correct
// positioning (no more clipping inside overflow-hidden cards) instead of the old
// hand-rolled absolutely-positioned dropdown. Free-text "Reason for Order" uses the
// shared PredictiveInput directly instead (see call site) — no API involved there. ──

interface ComboOption { label: string; sub?: string; }

const EntityComboInput = React.memo(({ fetchUrl, mapOptions, value, onChange, placeholder, memKey }: {
  fetchUrl: string; mapOptions: (data: Record<string, unknown>[]) => ComboOption[]; value: string; onChange: (v: string) => void; placeholder?: string; memKey?: string;
}) => {
  const [options, setOptions] = useState<ComboOption[]>([]);
  const [fetched, setFetched] = useState(false);
  const [loading, setLoading] = useState(false);

  const ensureFetched = useCallback(async () => {
    if (fetched) return;
    setLoading(true);
    try {
      const data = await api.get<any>(fetchUrl);
      setOptions(mapOptions(Array.isArray(data) ? data : []));
      setFetched(true);
    } catch (e: unknown) {
      // Deliberately NOT setting fetched here — that used to make a failed load
      // permanent (the guard above would then skip every future attempt), so the
      // combo just sat empty forever with no error and no way to retry. Leaving it
      // false means the next focus (onFocusLoad below) tries again.
      toast.error(`Couldn't load options: ${(e as Error).message}`);
    } finally { setLoading(false); }
  }, [fetched, fetchUrl, mapOptions]);

  const apiFiltered = useMemo(() => {
    if (!value.trim()) return options.slice(0, 12);
    const q = value.toLowerCase();
    return options.filter(o => o.label.toLowerCase().includes(q) || (o.sub || '').toLowerCase().includes(q)).slice(0, 10);
  }, [value, options]);
  const memSuggestions = useMemo(() => {
    if (!memKey) return [];
    return getFieldMemory(memKey).filter(s => s.toLowerCase().includes(value.toLowerCase()) && !apiFiltered.some(o => o.label === s)).slice(0, 3).map(s => ({ label: s, sub: 'recent' }));
  }, [memKey, value, apiFiltered]);
  const comboOptions: SharedComboOption[] = [...apiFiltered, ...memSuggestions].map(o => ({ value: o.label, label: o.label, sub: o.sub }));

  return (
    <Combobox
      value={value}
      onChange={onChange}
      onSelect={o => { onChange(o.value); if (memKey) rememberField(memKey, o.value); }}
      onBlurCommit={() => { if (value.trim() && memKey) rememberField(memKey, value); }}
      options={comboOptions}
      loading={loading}
      onFocusLoad={ensureFetched}
      placeholder={placeholder}
      size="form"
    />
  );
});
EntityComboInput.displayName = 'EntityComboInput';

// ─── SPARE CARD ──────────────────────────────────────────────────────────────

const SpareCard = React.memo(({ spare, isFavorite, isExpanded, onEdit, onDelete, onFavorite, onAddToReq, onToggleExpand }: {
  spare: Spare; isFavorite: boolean; isExpanded: boolean; onEdit: (s: Spare) => void; onDelete: (id: number) => void;
  onFavorite: (id: number) => void; onAddToReq: (s: Spare) => void; onToggleExpand: () => void;
}) => {
  const t = useTheme();
  const status = getStockStatus(spare.current_quantity, spare.min_quantity);
  const pct = spare.max_quantity > 0 ? Math.min(100, (spare.current_quantity / spare.max_quantity) * 100) : 0;
  const invValue = calcLineTotal(spare.current_quantity, spare.unit_price);
  const pc = PRIORITY_COLOR[spare.priority] || ACCENT_HEX.blue;

  return (
    <GlowCard color={pc} surface={`${t.glass} rounded-xl`} className="group relative overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0 pr-2">
            <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
              <span className={`font-mono ${TYPE_WEIGHT.bold} text-sm ${t.textPrimary}`}>{spare.stock_code}</span>
              {spare.safety_stock && <StatusBadge color={ACCENT_HEX.blue} label="Safety" />}
              {isFavorite && <Star className={`h-3 w-3 fill-amber-400 ${accentText('amber', t.light)} flex-shrink-0`} />}
            </div>
            <div className={`text-xs line-clamp-2 leading-snug ${t.textMuted}`}>{spare.description}</div>
            {spare.notes && <div className={`text-[11px] line-clamp-1 mt-0.5 italic ${t.textFaint}`}>{spare.notes}</div>}
          </div>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button title={isFavorite ? 'Unfavourite' : 'Favourite'} onClick={() => onFavorite(spare.id)} className={`h-6 w-6 flex items-center justify-center rounded ${t.hoverBg} ${t.textFaint} hover:${t.light ? 'text-amber-600' : 'text-amber-400'} transition-all`}>
              <Star className={`h-3 w-3 ${isFavorite ? `fill-amber-400 ${accentText('amber', t.light)}` : ''}`} />
            </button>
            <button title={isExpanded ? 'Collapse' : 'Expand'} onClick={onToggleExpand} className={`h-6 w-6 flex items-center justify-center rounded ${t.hoverBg} ${t.textFaint} transition-all`}>
              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button title="More options" className={`h-6 w-6 flex items-center justify-center rounded ${t.hoverBg} ${t.textFaint} transition-all`}><MoreVertical className="h-3 w-3" /></button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(spare)}><Pencil className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem>
                <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(spare.stock_code); toast.success('Copied'); }}><Copy className="h-4 w-4 mr-2" /> Copy Code</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-rose-500 focus:text-rose-500" onClick={() => onDelete(spare.id)}><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mb-3">
          {(spare.categories && spare.categories.length > 0 ? spare.categories : spare.category ? [spare.category] : []).map(cat => (
            <span key={cat} className={`text-[10px] px-1.5 py-0.5 rounded ${t.chipBg} ${t.textMuted}`}>{cat}</span>
          ))}
          <StatusBadge color={status.color} label={status.label} />
          <StatusBadge color={pc} label={spare.priority} />
        </div>

        <div className="mb-3">
          <div className={`flex justify-between text-[11px] mb-1 ${t.textFaint}`}>
            <span>Stock: <span className={t.textMuted}>{spare.current_quantity}</span>/{spare.max_quantity} {spare.unit_of_measure || 'UN'}</span>
            <span>Min: {spare.min_quantity}</span>
          </div>
          <div className={`h-1.5 rounded-full ${t.chipBg} overflow-hidden relative`}>
            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: status.color, opacity: 0.65 }} />
            {spare.max_quantity > 0 && spare.min_quantity > 0 && <div className="absolute top-0 h-full w-px bg-current opacity-40" style={{ left: `${Math.min(100, (spare.min_quantity / spare.max_quantity) * 100)}%` }} />}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className={`text-sm ${TYPE_WEIGHT.bold} ${t.textPrimary}`}>{formatCurrency(spare.unit_price)}<span className={`text-[10px] ml-1 ${t.textFaint}`}>/{spare.unit_of_measure || 'UN'}</span></div>
            <div className={`text-[10px] ${t.textFaint}`}>Inv: {formatCurrency(invValue)}</div>
          </div>
          <button onClick={() => onAddToReq(spare)} className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs ${TYPE_WEIGHT.medium} text-white transition-all hover:-translate-y-0.5 bg-gradient-to-br from-brand-500 to-brand-700 hover:brightness-110`}>
            <ShoppingCart className="h-3 w-3" /> Add to Req
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className={`border-t ${t.border} px-4 pt-3 pb-4 space-y-2.5 text-xs`}>
          <div className={`p-2.5 rounded-lg ${t.chipBg}`}><div className={`text-[10px] uppercase tracking-wide mb-1 ${t.textFaint}`}>Description</div><div className={`leading-relaxed ${t.textMuted}`}>{spare.description}</div></div>
          <div className="grid grid-cols-3 gap-2">
            <div className={`p-2 rounded-lg ${t.chipBg}`}><div className={`text-[10px] uppercase tracking-wide mb-0.5 ${t.textFaint}`}>Category</div><div className={t.textMuted}>{spare.category || '—'}</div></div>
            <div className={`p-2 rounded-lg ${t.chipBg}`}><div className={`text-[10px] uppercase tracking-wide mb-0.5 ${t.textFaint}`}>Machine</div><div className={t.textMuted}>{spare.machine_type || '—'}</div></div>
            <div className={`p-2 rounded-lg ${t.chipBg}`}><div className={`text-[10px] uppercase tracking-wide mb-0.5 ${t.textFaint}`}>UoM</div><div className={t.textMuted}>{spare.unit_of_measure || 'UN'}</div></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className={`p-2.5 rounded-lg ${t.chipBg} space-y-1`}>
              <div className={`text-[10px] uppercase tracking-wide ${t.textFaint}`}>Stock Levels</div>
              <div className="flex justify-between"><span className={t.textFaint}>Current</span><span className={`${TYPE_WEIGHT.semibold} ${t.textMuted}`}>{spare.current_quantity}</span></div>
              <div className="flex justify-between"><span className={t.textFaint}>Minimum</span><span className={t.textMuted}>{spare.min_quantity}</span></div>
              <div className="flex justify-between"><span className={t.textFaint}>Maximum</span><span className={t.textMuted}>{spare.max_quantity}</span></div>
            </div>
            <div className={`p-2.5 rounded-lg ${t.chipBg} space-y-1`}>
              <div className={`text-[10px] uppercase tracking-wide ${t.textFaint}`}>Pricing</div>
              <div className="flex justify-between"><span className={t.textFaint}>Unit Price</span><span className={`${TYPE_WEIGHT.semibold} ${t.textMuted}`}>{formatCurrency(spare.unit_price)}</span></div>
              <div className="flex justify-between"><span className={t.textFaint}>Inv. Value</span><span className={t.textMuted}>{formatCurrency(invValue)}</span></div>
              <div className="flex justify-between"><span className={t.textFaint}>Safety Stock</span><span className={spare.safety_stock ? 'text-brand-400' : t.textFaint}>{spare.safety_stock ? 'Yes' : 'No'}</span></div>
            </div>
          </div>
          {(spare.supplier || spare.storage_location || spare.last_ordered_date || spare.lead_time_days) && (
            <div className="grid grid-cols-2 gap-2">
              {spare.supplier && <div className={`p-2 rounded-lg ${t.chipBg}`}><div className={`text-[10px] uppercase tracking-wide mb-0.5 ${t.textFaint}`}>Supplier</div><div className={t.textMuted}>{spare.supplier}</div></div>}
              {spare.storage_location && <div className={`p-2 rounded-lg ${t.chipBg}`}><div className={`text-[10px] uppercase tracking-wide mb-0.5 ${t.textFaint}`}>Storage Location</div><div className={t.textMuted}>{spare.storage_location}</div></div>}
              {spare.last_ordered_date && <div className={`p-2 rounded-lg ${t.chipBg}`}><div className={`text-[10px] uppercase tracking-wide mb-0.5 ${t.textFaint}`}>Last Ordered</div><div className={t.textMuted}>{formatDate(spare.last_ordered_date)}</div></div>}
              {spare.lead_time_days ? <div className={`p-2 rounded-lg ${t.chipBg}`}><div className={`text-[10px] uppercase tracking-wide mb-0.5 ${t.textFaint}`}>Lead Time</div><div className={t.textMuted}>{spare.lead_time_days} days</div></div> : null}
            </div>
          )}
          {spare.notes && <div className={`p-2.5 rounded-lg ${t.chipBg}`}><div className={`text-[10px] uppercase tracking-wide mb-1 ${t.textFaint}`}>Notes</div><div className={`leading-relaxed ${t.textMuted}`}>{spare.notes}</div></div>}
        </div>
      )}
    </GlowCard>
  );
});
SpareCard.displayName = 'SpareCard';

// ─── REQUISITION LINE ROW ─────────────────────────────────────────────────────

function RequisitionLineRow({ line, allSpares, onUpdate, onRemove }: {
  line: ReqLine; allSpares: Spare[]; onUpdate: (id: string, patch: Partial<ReqLine>) => void; onRemove: (id: string) => void;
}) {
  const t = useTheme();
  const suggestions = useMemo(() => {
    const v = line.searchValue.trim();
    if (v.length < 2) return [];
    const q = v.toLowerCase();
    return allSpares.filter(s => s.stock_code.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)).slice(0, 12);
  }, [line.searchValue, allSpares]);
  const lineTotal = calcLineTotal(line.qty, line.spare?.unit_price ?? 0);
  const pick = (spare: Spare) => onUpdate(line.id, { spare, searchValue: spare.stock_code, dropdownOpen: false });

  return (
    <div className={`grid gap-1.5 items-center p-2 rounded-xl ${t.chipBg}`} style={{ gridTemplateColumns: '180px 1fr 48px 96px 80px 90px 28px' }}>
      <div className="relative">
        <input type="text" value={line.searchValue} placeholder="Stock code…" aria-label="Search stock code"
          onChange={e => onUpdate(line.id, { searchValue: e.target.value, spare: null, dropdownOpen: true })}
          onFocus={() => onUpdate(line.id, { dropdownOpen: true })}
          onBlur={() => setTimeout(() => onUpdate(line.id, { dropdownOpen: false }), 160)}
          className={`w-full px-2 py-1.5 text-xs rounded-lg font-mono ${t.inputBg} focus:outline-none`} />
        {line.dropdownOpen && suggestions.length > 0 && (
          <div className={`absolute top-full left-0 right-0 z-50 mt-0.5 rounded-xl overflow-hidden max-h-[220px] overflow-y-auto ${t.glass} ${t.shadow}`}>
            {suggestions.map(s => (
              <button key={s.id} onMouseDown={() => pick(s)} className={`w-full text-left px-3 py-2 ${t.hoverBgSoft} transition-all border-b ${t.border} last:border-0`}>
                <div className={`font-mono text-xs ${TYPE_WEIGHT.semibold} ${t.textPrimary}`}>{s.stock_code}<span className={`ml-2 text-[10px] font-normal ${t.textFaint}`}>{s.unit_of_measure || 'UN'}</span></div>
                <div className={`text-[11px] truncate ${t.textFaint}`}>{s.description}</div>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className={`text-[11px] truncate px-1 ${t.textMuted}`}>{line.spare?.description ?? <span className={`italic ${t.textFaint}`}>—</span>}</div>
      <div className={`text-[11px] text-center ${t.textFaint}`}>{line.spare?.unit_of_measure ?? '—'}</div>
      <div className="flex items-center gap-0.5">
        <button onClick={() => onUpdate(line.id, { qty: Math.max(1, line.qty - 1) })} className={`h-6 w-5 flex items-center justify-center rounded ${t.hoverBg} ${t.textFaint} text-sm leading-none transition-all`}>−</button>
        <input type="number" min={1} value={line.qty} onChange={e => onUpdate(line.id, { qty: Math.max(1, Number(e.target.value) || 1) })} title="Quantity" aria-label="Quantity"
          className={`w-10 text-center text-xs rounded-md ${t.inputBg} py-1`} />
        <button onClick={() => onUpdate(line.id, { qty: line.qty + 1 })} className={`h-6 w-5 flex items-center justify-center rounded ${t.hoverBg} ${t.textFaint} text-sm leading-none transition-all`}>+</button>
      </div>
      <div className={`text-xs text-right pr-1 ${t.textMuted}`}>{line.spare ? formatCurrency(line.spare.unit_price) : '—'}</div>
      <div className={`text-xs ${TYPE_WEIGHT.bold} text-right pr-1 ${t.textPrimary}`}>{line.spare ? formatCurrency(lineTotal) : '—'}</div>
      <button title="Remove line" onClick={() => onRemove(line.id)} className={`h-6 w-6 flex items-center justify-center rounded hover:bg-rose-500/15 ${t.textFaint} hover:text-rose-500 transition-all`}><X className="h-3 w-3" /></button>
    </div>
  );
}

// ─── SEARCHABLE DROPDOWN ─────────────────────────────────────────────────────

const SearchableDropdown = React.memo(({ value, onChange, options, placeholder = 'Select…' }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder?: string;
}) => {
  const t = useTheme();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const filtered = useMemo(() => { const q = search.toLowerCase(); return options.filter(o => o.label.toLowerCase().includes(q)).slice(0, 60); }, [options, search]);
  const selected = options.find(o => o.value === value);

  // Panel renders through a portal to document.body (fixed-positioned from the trigger's
  // own bounding rect) so no ancestor's overflow-hidden (this sits inside a filter panel
  // card that clips to its rounded corners) can clip the open dropdown — see GlowCard/
  // Combobox docs for the same fix applied to the issues-page pickers.
  useEffect(() => {
    if (!open) return;
    const reposition = () => {
      const r = triggerRef.current?.getBoundingClientRect();
      if (r) setPos({ top: r.bottom + 4, left: r.left, width: r.width });
    };
    reposition();
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => { window.removeEventListener('scroll', reposition, true); window.removeEventListener('resize', reposition); };
  }, [open]);

  return (
    <div className="relative">
      <button ref={triggerRef} type="button" onClick={() => setOpen(v => !v)} className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg ${t.inputBg} focus:outline-none`}>
        <span className={selected ? t.textMuted : t.textFaint}>{selected ? selected.label : placeholder}</span>
        <ChevronDown className={`h-3.5 w-3.5 flex-shrink-0 ${t.textFaint}`} />
      </button>
      {open && pos && createPortal(
        <>
          <button type="button" aria-label="Close menu" onClick={() => setOpen(false)}
            className="fixed inset-0 z-[9998] cursor-default border-0 bg-transparent p-0 pointer-events-auto" />
          {/* pointer-events-auto — a CenterModal (Radix Dialog) sets pointer-events:none
              on <body> while open; this panel is portaled to document.body directly (a
              sibling of Dialog.Content, not a descendant), so without this it silently
              inherits `none` and becomes unclickable from inside any modal. */}
          <div style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
            className={`pointer-events-auto rounded-xl overflow-hidden ${t.glass} ${t.shadow}`}>
            <div className={`p-2 border-b ${t.border}`}>
              <div className="relative">
                <Search className={`absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 ${t.textFaint}`} />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search categories…" aria-label="Search categories" className={`w-full pl-6 pr-2 py-1.5 text-xs rounded-lg ${t.inputBg} focus:outline-none`} />
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {filtered.map(o => (
                <button key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false); setSearch(''); }}
                  className={`w-full text-left px-3 py-2 text-xs transition-all border-b ${t.border} last:border-0 ${value === o.value ? 'bg-brand-500/15 text-brand-400' : `${t.textMuted} ${t.hoverBgSoft}`}`}>
                  {o.label}
                </button>
              ))}
              {filtered.length === 0 && <div className={`px-3 py-3 text-xs text-center ${t.textFaint}`}>No matches</div>}
            </div>
          </div>
        </>,
        document.body,
      )}
    </div>
  );
});
SearchableDropdown.displayName = 'SearchableDropdown';

// ─── CATEGORY TAG PICKER ──────────────────────────────────────────────────────

const CategoryTagPicker = React.memo(({ selected, onChange }: { selected: string[]; onChange: (cats: string[]) => void; }) => {
  const t = useTheme();
  const [inputVal, setInputVal] = useState('');
  const [customCats, setCustomCats] = useState<string[]>(() => getCustomCats());
  const toggle = (cat: string) => onChange(selected.includes(cat) ? selected.filter(c => c !== cat) : [...selected, cat]);
  const addCustom = () => {
    const val = inputVal.trim(); if (!val) return;
    saveCustomCat(val); setCustomCats(getCustomCats());
    if (!selected.includes(val)) onChange([...selected, val]);
    setInputVal('');
  };
  const pillCls = (active: boolean) => `text-[11px] px-2 py-0.5 rounded-full transition-all ${active ? 'bg-brand-500/20 text-brand-400' : `${t.chipBg} ${t.textFaint} ${t.hoverText}`}`;

  return (
    <div className="space-y-2">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map(cat => (
            <span key={cat} className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full ${TYPE_WEIGHT.medium} bg-brand-500/15 text-brand-400`}>
              {cat}<button type="button" onClick={() => toggle(cat)} className="hover:opacity-70 transition-opacity leading-none">×</button>
            </span>
          ))}
        </div>
      )}
      <div><div className={`text-[10px] uppercase tracking-wide mb-1 ${t.textFaint}`}>Parts</div><div className="flex flex-wrap gap-1">{PREDEFINED_PART_CATS.map(cat => <button key={cat} type="button" onClick={() => toggle(cat)} className={pillCls(selected.includes(cat))}>{cat}</button>)}</div></div>
      <div><div className={`text-[10px] uppercase tracking-wide mb-1 ${t.textFaint}`}>Equipment</div><div className="flex flex-wrap gap-1">{PREDEFINED_EQUIP_CATS.map(cat => <button key={cat} type="button" onClick={() => toggle(cat)} className={pillCls(selected.includes(cat))}>{cat}</button>)}</div></div>
      {customCats.filter(c => !ALL_PREDEFINED_CATS.includes(c)).length > 0 && (
        <div><div className={`text-[10px] uppercase tracking-wide mb-1 ${t.textFaint}`}>Custom</div><div className="flex flex-wrap gap-1">{customCats.filter(c => !ALL_PREDEFINED_CATS.includes(c)).map(cat => <button key={cat} type="button" onClick={() => toggle(cat)} className={pillCls(selected.includes(cat))}>{cat}</button>)}</div></div>
      )}
      <div className="flex gap-1.5">
        <input type="text" value={inputVal} onChange={e => setInputVal(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
          placeholder="Type a new category and press Enter…" aria-label="Add custom category" className={`flex-1 px-2.5 py-1.5 text-xs rounded-lg ${t.inputBg} focus:outline-none`} />
        <button type="button" onClick={addCustom} className={`px-2.5 py-1.5 text-xs rounded-lg ${t.chipBg} ${t.hoverBg} ${t.textMuted}`}>Add</button>
      </div>
    </div>
  );
});
CategoryTagPicker.displayName = 'CategoryTagPicker';

// ─── SPARE FORM DIALOG ────────────────────────────────────────────────────────

const defaultForm: SpareFormData = {
  stock_code: '', description: '', category: '', categories: [], machine_type: '',
  current_quantity: 0, min_quantity: 1, max_quantity: 10, unit_price: 0, unit_of_measure: 'UN',
  priority: 'medium', storage_location: '', supplier: '', safety_stock: false, notes: '',
};

function SpareFormDialog({ open, onClose, onSave, editData }: {
  open: boolean; onClose: () => void; onSave: (d: SpareFormData) => Promise<void>; editData?: Spare | null;
}) {
  const t = useTheme();
  const [form, setForm] = useState<SpareFormData>(defaultForm);
  const [saving, setSaving] = useState(false);
  const inputCls = `w-full h-9 px-3 rounded-lg text-sm ${t.inputBg} focus:outline-none`;

  useEffect(() => {
    setForm(editData ? {
      stock_code: editData.stock_code, description: editData.description, category: editData.category || '',
      categories: editData.categories && editData.categories.length > 0 ? editData.categories : editData.category ? [editData.category] : [],
      machine_type: editData.machine_type || '', current_quantity: editData.current_quantity, min_quantity: editData.min_quantity,
      max_quantity: editData.max_quantity, unit_price: editData.unit_price, unit_of_measure: editData.unit_of_measure || 'UN',
      priority: editData.priority, storage_location: editData.storage_location || '', supplier: editData.supplier || '',
      safety_stock: editData.safety_stock, notes: editData.notes || '',
    } : defaultForm);
  }, [editData, open]);

  const set = <K extends keyof SpareFormData>(k: K, v: SpareFormData[K]) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.stock_code.trim()) { toast.error('Stock code is required'); return; }
    if (!form.description.trim()) { toast.error('Description is required'); return; }
    setSaving(true);
    try { await onSave(form); onClose(); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Save failed'); }
    finally { setSaving(false); }
  };

  const section = (title: string, children: React.ReactNode) => (
    <div className={`rounded-xl ${t.chipBg} p-3 space-y-3`}>
      <div className={`text-[11px] ${TYPE_WEIGHT.semibold} text-brand-400 uppercase tracking-wider`}>{title}</div>
      {children}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader><DialogTitle>{editData ? 'Edit Spare Part' : 'Add New Spare Part'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSave} className="space-y-3 py-1">
          {section('Required', <>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Stock Code" required><input className={inputCls} value={form.stock_code} onChange={e => set('stock_code', e.target.value)} placeholder="e.g. 106335" disabled={!!editData} aria-label="Stock Code" /></FormField>
              <FormField label="Unit Price (USD)" required><input type="number" step="0.01" min="0" className={inputCls} value={form.unit_price} onChange={e => set('unit_price', parseFloat(e.target.value) || 0)} aria-label="Unit Price (USD)" /></FormField>
            </div>
            <FormField label="Description" required><input className={inputCls} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Part description" aria-label="Description" /></FormField>
          </>)}

          {section('Stock Levels', <>
            <div className="grid grid-cols-4 gap-2">
              {([['Current Qty', 'current_quantity'], ['Min Qty', 'min_quantity'], ['Max Qty', 'max_quantity']] as const).map(([lbl, key]) => (
                <FormField key={key} label={lbl}><input type="number" min="0" className={inputCls} value={form[key] as number} onChange={e => set(key, parseInt(e.target.value) || 0)} aria-label={lbl} /></FormField>
              ))}
              <FormField label="UoM"><input className={inputCls} value={form.unit_of_measure} onChange={e => set('unit_of_measure', e.target.value)} placeholder="UN" aria-label="UoM" /></FormField>
            </div>
            <div className="grid grid-cols-2 gap-3 items-center">
              <FormField label="Priority">
                <SelectField size="form" title="Priority" value={form.priority} onChange={v => set('priority', v as SpareFormData['priority'])}
                  options={['critical', 'high', 'medium', 'low'].map(p => ({ value: p, label: p.charAt(0).toUpperCase() + p.slice(1) }))} />
              </FormField>
              <div className="flex items-center gap-3 pt-5">
                <Switch id="sf-ss" checked={form.safety_stock} onCheckedChange={v => set('safety_stock', v)} />
                <Label htmlFor="sf-ss" className={`text-xs cursor-pointer ${t.textMuted}`}>Safety Stock</Label>
              </div>
            </div>
          </>)}

          {section('Classification (Optional)', <>
            <FormField label="Categories (select multiple or type custom)"><CategoryTagPicker selected={form.categories} onChange={cats => setForm(p => ({ ...p, categories: cats, category: cats[0] || '' }))} /></FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Machine / Equipment"><input className={inputCls} value={form.machine_type} onChange={e => set('machine_type', e.target.value)} placeholder="e.g. Crusher, Winder" aria-label="Machine / Equipment" /></FormField>
              <FormField label="Storage Location"><input className={inputCls} value={form.storage_location} onChange={e => set('storage_location', e.target.value)} placeholder="e.g. A1-S3" aria-label="Storage Location" /></FormField>
            </div>
            <FormField label="Supplier"><input className={inputCls} value={form.supplier} onChange={e => set('supplier', e.target.value)} placeholder="Supplier name" aria-label="Supplier" /></FormField>
          </>)}

          {section('Notes (Optional)', <textarea rows={2} className={`${inputCls} h-auto py-2 resize-none`} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any additional notes…" aria-label="Notes" />)}

          <DialogFooter><FormActions onCancel={onClose} submitting={saving} submitLabel={editData ? 'Update' : 'Add Spare'} accent="violet" /></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

function SparesPageContent() {
  const t = useTheme();
  const [spares, setSpares] = useState<Spare[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showStats, setShowStats] = useState(true);
  const [showCategoryBreakdown, setShowCategoryBreakdown] = useState(false);
  const [showRequisition, setShowRequisition] = useState(false);
  const [filterPanelMinimized, setFilterPanelMinimized] = useState(true);
  const [recordsPanelMinimized, setRecordsPanelMinimized] = useState(false);
  const [expandAllCards, setExpandAllCards] = useState(false);
  // Grid view groups the current page's records by category (homepage
  // category-accordion vocabulary); tracks which groups the user collapsed.
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const [search, setSearch] = useState('');
  const [catSearch, setCatSearch] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'stock_code', direction: 'asc' });
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [showFavOnly, setShowFavOnly] = useState(false);

  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [expandedTableRows, setExpandedTableRows] = useState<Set<number>>(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [editingSpare, setEditingSpare] = useState<Spare | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const [reqLines, setReqLines] = useState<ReqLine[]>([]);
  const [reqHeader, setReqHeader] = useState<ReqHeader>(defaultReqHeader);
  const [savedReqs, setSavedReqs] = useState<SavedRequisition[]>(() => getSavedReqs());
  const [showSavedReqs, setShowSavedReqs] = useState(false);
  const [saveReqName, setSaveReqName] = useState('');
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [savedReqsLoaded, setSavedReqsLoaded] = useState(false);
  const setReqH = useCallback(<K extends keyof ReqHeader>(k: K, v: ReqHeader[K]) => setReqHeader(p => ({ ...p, [k]: v })), []);

  const loadData = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setRefreshing(true);
    try {
      const data = await apiFetchAll();
      setSpares(data.map(s => ({ ...s, current_quantity: Number(s.current_quantity ?? 0), min_quantity: Number(s.min_quantity ?? 1), max_quantity: Number(s.max_quantity ?? 5), unit_price: Number(s.unit_price ?? 0), safety_stock: Boolean(s.safety_stock) })));
    } catch (e) { toast.error(`Failed to load: ${(e as Error).message}`); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    if (savedReqsLoaded) return;
    setSavedReqsLoaded(true);
    apiGetSavedReqs().then(serverReqs => { if (serverReqs.length > 0) { setSavedReqs(serverReqs); persistSavedReqs(serverReqs); } });
  }, [savedReqsLoaded]);

  const categories = useMemo(() => { const set = new Set<string>(); spares.forEach(s => { if (s.category) set.add(s.category); (s.categories || []).forEach(c => set.add(c)); }); return [...set].sort(); }, [spares]);

  const stats = useMemo(() => {
    const outOfStock = spares.filter(s => s.current_quantity <= 0).length;
    const lowStock = spares.filter(s => s.current_quantity > 0 && s.current_quantity <= s.min_quantity).length;
    const totalValue = spares.reduce((sum, s) => sum + calcLineTotal(s.current_quantity, s.unit_price), 0);
    const safetyCount = spares.filter(s => s.safety_stock).length;
    return { total: spares.length, outOfStock, lowStock, totalValue, categories: categories.length, safetyCount };
  }, [spares, categories]);

  const categoryBreakdown = useMemo(() => {
    const map: Record<string, { count: number; value: number; out: number; low: number }> = {};
    spares.forEach(s => {
      const cats = s.categories && s.categories.length > 0 ? s.categories : s.category ? [s.category] : ['Uncategorised'];
      const st = getStockStatus(s.current_quantity, s.min_quantity);
      const isOut = st.label === 'Out of Stock'; const isLow = st.label === 'Low Stock';
      cats.forEach(cat => {
        if (!map[cat]) map[cat] = { count: 0, value: 0, out: 0, low: 0 };
        map[cat].count++; map[cat].value += calcLineTotal(s.current_quantity, s.unit_price);
        if (isOut) map[cat].out++; else if (isLow) map[cat].low++;
      });
    });
    return Object.entries(map).map(([cat, d]) => ({ cat, ...d, pct: spares.length > 0 ? Math.round((d.count / spares.length) * 100) : 0 })).sort((a, b) => b.count - a.count);
  }, [spares]);

  const filteredSpares = useMemo(() => {
    const list = spares.filter(s => {
      if (showFavOnly && !favorites.has(s.id)) return false;
      if (categoryFilter !== 'all') { const inSingle = s.category === categoryFilter; const inMulti = (s.categories || []).includes(categoryFilter); if (!inSingle && !inMulti) return false; }
      if (priorityFilter !== 'all' && s.priority !== priorityFilter) return false;
      const status = getStockStatus(s.current_quantity, s.min_quantity).label;
      if (stockFilter === 'out' && status !== 'Out of Stock') return false;
      if (stockFilter === 'low' && status !== 'Low Stock') return false;
      if (stockFilter === 'adequate' && status !== 'Adequate') return false;
      if (stockFilter === 'in' && status !== 'In Stock') return false;
      if (search) {
        const q = search.toLowerCase();
        const allCats = [...(s.categories || []), s.category || ''].join(' ').toLowerCase();
        if (!s.stock_code.toLowerCase().includes(q) && !s.description.toLowerCase().includes(q) && !allCats.includes(q) && !(s.supplier || '').toLowerCase().includes(q) && !(s.notes || '').toLowerCase().includes(q)) return false;
      }
      return true;
    });
    list.sort((a, b) => {
      let av: string | number, bv: string | number;
      const f = sortConfig.field;
      if (f === 'status') { av = getStockStatus(a.current_quantity, a.min_quantity).label; bv = getStockStatus(b.current_quantity, b.min_quantity).label; }
      else if (f === 'priority') { av = PRIORITY_ORDER[a.priority] ?? 2; bv = PRIORITY_ORDER[b.priority] ?? 2; }
      else { av = (a[f as keyof Spare] as string | number) ?? ''; bv = (b[f as keyof Spare] as string | number) ?? ''; }
      if (av < bv) return sortConfig.direction === 'asc' ? -1 : 1;
      if (av > bv) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    if (favorites.size > 0) list.sort((a, b) => { const af = favorites.has(a.id), bf = favorites.has(b.id); return af === bf ? 0 : af ? -1 : 1; });
    return list;
  }, [spares, search, categoryFilter, priorityFilter, stockFilter, favorites, showFavOnly, sortConfig]);

  const activeFilterCount = [search, stockFilter !== 'all', categoryFilter !== 'all', priorityFilter !== 'all', showFavOnly].filter(Boolean).length;
  useEffect(() => { setCurrentPage(1); }, [search, stockFilter, categoryFilter, priorityFilter, showFavOnly]);
  const totalPages = Math.max(1, Math.ceil(filteredSpares.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedSpares = useMemo(() => filteredSpares.slice((safeCurrentPage - 1) * PAGE_SIZE, safeCurrentPage * PAGE_SIZE), [filteredSpares, safeCurrentPage]);
  const clearFilters = () => { setSearch(''); setStockFilter('all'); setCategoryFilter('all'); setPriorityFilter('all'); setShowFavOnly(false); };

  // Group the current page's grid-view cards by (primary) category — alphabetically,
  // "Uncategorized" last. Table view is left flat (sortable columns already group work).
  const groupedSpares = useMemo(() => {
    const map = new Map<string, Spare[]>();
    for (const s of paginatedSpares) {
      const key = (s.categories && s.categories[0]) || s.category || 'Uncategorized';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return [...map.keys()]
      .sort((a, b) => (a === 'Uncategorized' ? 1 : b === 'Uncategorized' ? -1 : a.localeCompare(b)))
      .map(category => ({ category, color: categoryColor(category === 'Uncategorized' ? undefined : category), items: map.get(category)! }));
  }, [paginatedSpares]);
  const isGroupOpen = (category: string) => !!search || !collapsedGroups.has(category);
  const toggleGroup = (category: string) => setCollapsedGroups(prev => {
    const next = new Set(prev);
    next.has(category) ? next.delete(category) : next.add(category);
    return next;
  });

  const handleSave = async (data: SpareFormData) => {
    const payload = {
      stock_code: data.stock_code, description: data.description, category: data.categories[0] || data.category || '',
      categories: data.categories, machine_type: data.machine_type, current_quantity: data.current_quantity,
      min_quantity: data.min_quantity, max_quantity: data.max_quantity, unit_price: data.unit_price,
      unit_of_measure: data.unit_of_measure, priority: data.priority, storage_location: data.storage_location,
      supplier: data.supplier, safety_stock: data.safety_stock, notes: data.notes,
    };
    if (editingSpare) { await apiUpdate(editingSpare.id, payload); toast.success('Spare updated'); }
    else { await apiCreate(payload); toast.success('Spare added'); }
    setEditingSpare(null);
    await loadData(true);
  };

  const confirmDelete = async () => {
    if (deleteId === null) return;
    try { await apiDelete(deleteId); toast.success('Deleted'); await loadData(true); }
    catch (e) { toast.error((e as Error).message); }
    setDeleteId(null);
  };

  const toggleFavorite = (id: number) => setFavorites(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleExpand = (id: number) => { if (expandAllCards) { setExpandAllCards(false); setExpandedItems(new Set([id])); return; } setExpandedItems(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); };
  const isExpanded = (id: number) => expandAllCards || expandedItems.has(id);
  const handleToggleExpandAll = () => { if (expandAllCards) { setExpandAllCards(false); setExpandedItems(new Set()); } else { setExpandAllCards(true); setExpandedItems(new Set()); } };
  const handleSort = (field: SortConfig['field']) => setSortConfig(prev => ({ field, direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc' }));

  const addReqLine = (spare?: Spare) => setReqLines(p => [...p, { id: uid(), spare: spare ?? null, searchValue: spare?.stock_code ?? '', qty: 1, dropdownOpen: false }]);
  const updateReqLine = (id: string, patch: Partial<ReqLine>) => setReqLines(p => p.map(l => l.id === id ? { ...l, ...patch } : l));
  const removeReqLine = (id: string) => setReqLines(p => p.filter(l => l.id !== id));
  const reqGrandTotal = reqLines.reduce((sum, l) => sum + calcLineTotal(l.qty, l.spare?.unit_price ?? 0), 0);
  const addToReq = (spare: Spare) => { setShowRequisition(true); addReqLine(spare); toast.success(`${spare.stock_code} added to requisition`); };

  const saveCurrentRequisition = async () => {
    if (!saveReqName.trim()) return;
    const localReq: SavedRequisition = {
      id: uid(), name: saveReqName.trim(), saved_at: new Date().toISOString(), header: reqHeader,
      lines: reqLines.filter(l => l.spare).map(l => ({ spare_id: l.spare!.id, stock_code: l.spare!.stock_code, description: l.spare!.description, unit_of_measure: l.spare!.unit_of_measure, unit_price: l.spare!.unit_price, qty: l.qty })),
      grand_total: reqGrandTotal,
    };
    const withoutSameName = savedReqs.filter(r => r.name !== saveReqName.trim());
    const optimistic = [localReq, ...withoutSameName];
    setSavedReqs(optimistic); persistSavedReqs(optimistic); setSaveReqName(''); setShowSavePrompt(false);
    toast.success('Requisition saved');
    const serverReq = await apiCreateSavedReq(localReq);
    if (serverReq) { setSavedReqs(prev => [serverReq, ...prev.filter(r => r.id !== localReq.id && r.name !== serverReq.name)]); persistSavedReqs([serverReq, ...withoutSameName]); }
  };

  const loadSavedRequisition = (req: SavedRequisition) => {
    setReqHeader(req.header);
    setReqLines(req.lines.map(l => ({
      id: uid(),
      spare: spares.find(s => s.id === l.spare_id) ?? { id: l.spare_id, stock_code: l.stock_code, description: l.description, unit_of_measure: l.unit_of_measure || 'UN', unit_price: l.unit_price, current_quantity: 0, min_quantity: 0, max_quantity: 0, priority: 'medium' as const, safety_stock: false },
      searchValue: l.stock_code, qty: l.qty, dropdownOpen: false,
    })));
    setShowSavedReqs(false);
    toast.success(`Loaded: ${req.name}`);
  };

  const deleteSavedReq = (id: string) => { const updated = savedReqs.filter(r => r.id !== id); setSavedReqs(updated); persistSavedReqs(updated); apiDeleteSavedReq(id); };

  const downloadRequisitionPDF = async () => {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const lines = reqLines.filter(l => l.spare);

    doc.setFillColor(...EXPORT_BRAND_RGB); doc.rect(0, 0, 297, 26, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.text('Ozech MyOffice', 12, 11);
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.text('SPARE PARTS MANAGEMENT', 12, 17);
    doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.text('Parts Requisition', 285, 11, { align: 'right' });
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.text(today, 285, 17, { align: 'right' });

    const urgencyLabel = reqHeader.urgency.charAt(0).toUpperCase() + reqHeader.urgency.slice(1);
    const priorityLabel = reqHeader.priority.charAt(0).toUpperCase() + reqHeader.priority.slice(1);
    doc.setFillColor(235, 242, 248); doc.rect(0, 26, 297, 14, 'F');
    doc.setTextColor(...EXPORT_BRAND_RGB); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
    const metaY = 33;
    const metaItems: [string, string][] = [['Requested By', reqHeader.requester || '—'], ['Required For', reqHeader.required_for || '—'], ['Urgency', urgencyLabel], ['Priority', priorityLabel]];
    metaItems.forEach(([lbl, val], i) => {
      const x = 12 + i * 70;
      doc.text(lbl + ':', x, metaY - 3); doc.setFont('helvetica', 'normal'); doc.setTextColor(26, 37, 51);
      doc.text(val, x, metaY + 2); doc.setFont('helvetica', 'bold'); doc.setTextColor(...EXPORT_BRAND_RGB);
    });
    if (reqHeader.reason) {
      doc.setFont('helvetica', 'bold'); doc.text('Reason:', 12, metaY + 8);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(26, 37, 51); doc.text(reqHeader.reason.slice(0, 120), 38, metaY + 8);
    }

    const tableRows = lines.map((l, i) => [i + 1, l.spare!.stock_code, l.spare!.description, l.spare!.unit_of_measure || 'UN', l.qty, formatCurrency(l.spare!.unit_price), formatCurrency(calcLineTotal(l.qty, l.spare!.unit_price))]);
    autoTable(doc, {
      startY: reqHeader.reason ? 52 : 46,
      head: [['#', 'Stock Code', 'Description', 'UoM', 'Qty', 'Unit Price', 'Line Total']],
      body: tableRows, foot: [['', '', '', '', '', 'Grand Total', formatCurrency(reqGrandTotal)]],
      headStyles: { fillColor: EXPORT_BRAND_RGB, textColor: 255, fontStyle: 'bold', fontSize: 9 },
      footStyles: { fillColor: [220, 231, 240], textColor: EXPORT_BRAND_RGB, fontStyle: 'bold', fontSize: 10 },
      bodyStyles: { fontSize: 9, textColor: [26, 37, 51] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 1: { cellWidth: 34, fontStyle: 'bold' }, 2: { cellWidth: 'auto' }, 3: { cellWidth: 16, halign: 'center' }, 4: { cellWidth: 16, halign: 'right' }, 5: { cellWidth: 32, halign: 'right' }, 6: { cellWidth: 32, halign: 'right' } },
      margin: { left: 12, right: 12 }, showFoot: 'lastPage',
    });

    const pageCount = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i); doc.setFontSize(8); doc.setTextColor(160, 160, 160);
      doc.text(`Generated by Ozech MyOffice · ${today}`, 12, 205);
      doc.text(`Page ${i} of ${pageCount}`, 285, 205, { align: 'right' });
    }
    doc.save(`requisition-${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success('Requisition PDF downloaded');
  };

  const copyRequisition = () => {
    const rows = reqLines.filter(l => l.spare).map(l => `${l.spare!.stock_code}\t${l.spare!.description}\t${l.spare!.unit_of_measure || 'UN'}\t${l.qty}\t${formatCurrency(l.spare!.unit_price)}\t${formatCurrency(calcLineTotal(l.qty, l.spare!.unit_price))}`).join('\n');
    navigator.clipboard.writeText(`Stock Code\tDescription\tUoM\tQty\tUnit Price\tTotal\n${rows}\n\nGRAND TOTAL: ${formatCurrency(reqGrandTotal)}`);
    toast.success('Requisition copied to clipboard');
  };

  const SortBtn = ({ field, label }: { field: SortConfig['field']; label: string }) => {
    const active = sortConfig.field === field;
    const Icon = active ? (sortConfig.direction === 'asc' ? ChevronsUp : ChevronsDown) : SortAsc;
    return <button onClick={() => handleSort(field)} className={`inline-flex items-center gap-1 text-[11px] transition-all ${active ? 'text-brand-400' : `${t.textFaint} ${t.hoverText}`}`}>{label} <Icon className="h-3 w-3" /></button>;
  };

  return (
    <main className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <PageHero
        icon={Package}
        accent="violet"
        crumbs={['Operations & Maintenance', 'Spares']}
        title="Spare Parts Inventory"
        statsOpen={showStats}
        actions={
          <>
            <button onClick={() => loadData(true)} disabled={refreshing} title="Refresh" className={`h-8 w-8 flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} ${t.hoverText} disabled:opacity-40`}><RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} /></button>
            <button onClick={() => setShowRequisition(v => !v)} className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs ${TYPE_WEIGHT.semibold} transition-all ${showRequisition ? 'bg-brand-500/20 text-brand-400' : `${t.chipBg} ${t.textMuted} ${t.hoverBg}`}`}>
              <ShoppingCart className="h-3.5 w-3.5" /> Requisition {reqLines.length > 0 && <span className="px-1 rounded-full bg-brand-500/30 text-[10px]">{reqLines.length}</span>}
            </button>
            <Link href="/spares/import"><button className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs ${TYPE_WEIGHT.semibold} ${t.textMuted} ${t.chipBg} ${t.hoverBg}`}><Upload className="h-3.5 w-3.5" /> Import Excel</button></Link>
            <button onClick={() => { setEditingSpare(null); setFormOpen(true); }} className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm ${TYPE_WEIGHT.semibold} text-white bg-gradient-to-br from-brand-500 to-brand-700 hover:brightness-110 transition-all`}><Plus className="h-4 w-4" /> Add Spare</button>
            <button title={showStats ? 'Hide stats' : 'Show stats'} onClick={() => setShowStats(v => !v)} className={`h-8 w-8 flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} ${t.hoverText}`}>{showStats ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}</button>
          </>
        }
      >
        <div className="flex flex-wrap gap-1">
          <StatTile icon={Package} color={ACCENT_HEX.blue} value={stats.total} label="Total Items" onClick={clearFilters} />
          <StatTile icon={Database} color={ACCENT_HEX.violet} value={formatCurrency(stats.totalValue)} label="Total Value" />
          <StatTile icon={AlertOctagon} color="#f43f5e" value={stats.outOfStock} label="Out of Stock" onClick={() => setStockFilter('out')} />
          <StatTile icon={AlertTriangle} color="#f59e0b" value={stats.lowStock} label="Low Stock" onClick={() => setStockFilter('low')} />
          <StatTile icon={BarChart3} color="#34d399" value={stats.categories} label="Categories" />
          <StatTile icon={Check} color="#60a5fa" value={stats.safetyCount} label="Safety Stock" />
        </div>
      </PageHero>

      {/* Category Breakdown */}
      {categoryBreakdown.length > 0 && (
        <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
          <div className={`flex items-center justify-between px-5 py-3 border-b ${t.border}`}>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-3.5 w-3.5 text-brand-400" />
              <span className={`text-xs ${TYPE_WEIGHT.semibold} uppercase tracking-wider ${t.textMuted}`}>Category Breakdown</span>
              <span className={`text-[11px] ${t.textFaint}`}>{categoryBreakdown.length} categories — click to filter</span>
              {categoryFilter !== 'all' && <button onClick={() => setCategoryFilter('all')} className="text-[11px] px-1.5 py-0.5 rounded bg-brand-500/15 text-brand-400">{categoryFilter} ×</button>}
            </div>
            <button title={showCategoryBreakdown ? 'Hide categories' : 'Show categories'} onClick={() => setShowCategoryBreakdown(v => !v)} className={`h-6 w-6 flex items-center justify-center rounded-md ${t.chipBg} ${t.hoverBg} ${t.textFaint}`}>{showCategoryBreakdown ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}</button>
          </div>
          {showCategoryBreakdown && (
            <div className="p-4 space-y-3">
              <div className="relative max-w-xs">
                <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none ${t.textFaint}`} />
                <input type="text" value={catSearch} onChange={e => setCatSearch(e.target.value)} placeholder="Search categories…" aria-label="Search categories" className={`pl-8 pr-3 py-1.5 w-full text-xs rounded-lg ${t.inputBg} focus:outline-none`} />
                {catSearch && <button onClick={() => setCatSearch('')} className={`absolute right-2 top-1/2 -translate-y-1/2 ${t.textFaint} ${t.hoverText}`}><X className="h-3 w-3" /></button>}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                {categoryBreakdown.filter(({ cat }) => !catSearch || cat.toLowerCase().includes(catSearch.toLowerCase())).map(({ cat, count, pct, out, low }) => {
                  const isActive = categoryFilter === cat; const hasIssues = out > 0 || low > 0;
                  const catColor = out > 0 ? '#f43f5e' : low > 0 ? '#f59e0b' : '#60a5fa';
                  return (
                    <GlowCard key={cat} onClick={() => setCategoryFilter(isActive ? 'all' : cat)} color={catColor}
                      surface="rounded-xl p-3"
                      className={`text-left cursor-pointer ${isActive ? 'bg-brand-500/15 ring-1 ring-brand-400/40' : `${t.chipBg} ${t.hoverBg}`}`}>
                      <div className="flex items-start justify-between mb-2">
                        <span className={`text-[11px] ${TYPE_WEIGHT.semibold} leading-tight break-words ${t.textMuted}`}>{cat}</span>
                        {hasIssues && (out > 0 ? <AlertOctagon className="h-3 w-3 text-rose-500 flex-shrink-0 ml-1 mt-0.5" /> : <AlertTriangle className="h-3 w-3 text-amber-500 flex-shrink-0 ml-1 mt-0.5" />)}
                      </div>
                      <div className="flex items-baseline gap-1 mb-2"><span className={`text-base ${TYPE_WEIGHT.bold} ${t.textPrimary}`}>{count}</span><span className={`text-[10px] ${t.textFaint}`}>items</span></div>
                      <div className={`h-1 rounded-full ${t.chipBg} overflow-hidden mb-1.5`}><div className="h-full rounded-full bg-brand-400/60" style={{ width: `${pct}%` }} /></div>
                      {hasIssues ? (
                        <div className="flex gap-1 flex-wrap">
                          {out > 0 && <span className="text-[9px] px-1 py-0.5 rounded bg-rose-500/15 text-rose-500">{out} out</span>}
                          {low > 0 && <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/15 text-amber-500">{low} low</span>}
                        </div>
                      ) : <div className={`text-[9px] ${t.textFaint}`}>{pct}% of stock</div>}
                    </GlowCard>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Requisition Builder */}
      {showRequisition && (
        <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
          <div className={`flex items-center justify-between px-5 py-3 border-b ${t.border} flex-wrap gap-2`}>
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-3.5 w-3.5 text-brand-400" />
              <span className={`text-xs ${TYPE_WEIGHT.semibold} uppercase tracking-wider ${t.textMuted}`}>Requisition / Price Builder</span>
              {reqLines.length > 0 && <span className={`text-[11px] ${t.textFaint}`}>{reqLines.length} line{reqLines.length !== 1 ? 's' : ''} · {formatCurrency(reqGrandTotal)}</span>}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              <button onClick={() => setShowSavedReqs(v => !v)} className={`inline-flex items-center gap-1 h-6 px-2 text-[11px] rounded-lg transition-all ${showSavedReqs ? 'bg-brand-500/20 text-brand-400' : `${t.chipBg} ${t.textMuted} ${t.hoverBg}`}`}><ClipboardList className="h-2.5 w-2.5" /> Saved {savedReqs.length > 0 && `(${savedReqs.length})`}</button>
              {reqLines.length > 0 && (<>
                {showSavePrompt ? (
                  <div className="flex items-center gap-1">
                    <input value={saveReqName} onChange={e => setSaveReqName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveCurrentRequisition(); if (e.key === 'Escape') setShowSavePrompt(false); }} placeholder="Requisition name…" aria-label="Requisition name" className={`h-6 px-2 text-[11px] rounded-lg w-36 ${t.inputBg} focus:outline-none`} />
                    <button onClick={saveCurrentRequisition} className="h-6 px-2 text-[11px] rounded-lg bg-brand-500/20 text-brand-400 hover:bg-brand-500/30">Save</button>
                    <button type="button" title="Cancel" onClick={() => setShowSavePrompt(false)} className={`h-6 w-6 flex items-center justify-center rounded ${t.textFaint} ${t.hoverText}`}><X className="h-3 w-3" /></button>
                  </div>
                ) : <button onClick={() => setShowSavePrompt(true)} className={`inline-flex items-center gap-1 h-6 px-2 text-[11px] rounded-lg ${t.chipBg} ${t.hoverBg} ${t.textMuted}`}><Database className="h-2.5 w-2.5" /> Save</button>}
                <button onClick={copyRequisition} className={`inline-flex items-center gap-1 h-6 px-2 text-[11px] rounded-lg ${t.chipBg} ${t.hoverBg} ${t.textMuted}`}><Copy className="h-2.5 w-2.5" /> Copy</button>
                <button onClick={downloadRequisitionPDF} className="inline-flex items-center gap-1 h-6 px-2 text-[11px] rounded-lg bg-brand-500/20 hover:bg-brand-500/30 text-brand-400"><Download className="h-2.5 w-2.5" /> PDF</button>
                <button onClick={() => { setReqLines([]); setReqHeader(defaultReqHeader); }} className={`h-6 px-2 text-[11px] rounded-lg ${t.chipBg} hover:bg-rose-500/15 ${t.textFaint} hover:text-rose-500`}>Clear</button>
              </>)}
              <button onClick={() => addReqLine()} className={`inline-flex items-center gap-1 h-6 px-2 text-[11px] rounded-lg text-white ${TYPE_WEIGHT.medium} bg-brand-500/80 hover:bg-brand-500`}><Plus className="h-2.5 w-2.5" /> Add Line</button>
              <button title="Close" aria-label="Close" onClick={() => setShowRequisition(false)} className={`h-9 w-9 flex items-center justify-center rounded-lg ${t.chipBg} ${t.hoverBg} ${t.textFaint}`}><X className="h-4 w-4" /></button>
            </div>
          </div>

          {showSavedReqs && (
            <div className={`px-5 py-3 border-b ${t.border} space-y-1.5`}>
              <div className="flex items-center justify-between mb-2"><span className={`text-[10px] uppercase tracking-wide ${t.textFaint}`}>Saved Requisitions</span><span className={`text-[10px] ${t.textFaint}`}>{savedReqs.length} saved · synced to server</span></div>
              {savedReqs.length === 0 && <div className={`text-center py-4 text-xs ${t.textFaint}`}>No saved requisitions yet</div>}
              {savedReqs.map(req => (
                <div key={req.id} className={`flex items-center justify-between p-2.5 rounded-xl ${t.chipBg} group`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs ${TYPE_WEIGHT.medium} ${t.textMuted}`}>{req.name}</span>
                      {req.header.urgency !== 'routine' && <span className={`px-1.5 py-0.5 rounded text-[9px] ${TYPE_WEIGHT.medium} ${req.header.urgency === 'emergency' ? 'bg-rose-500/20 text-rose-500' : 'bg-amber-500/20 text-amber-500'}`}>{req.header.urgency}</span>}
                      {req.header.priority === 'critical' && <span className={`px-1.5 py-0.5 rounded text-[9px] ${TYPE_WEIGHT.medium} bg-rose-500/10 text-rose-500/80`}>critical</span>}
                    </div>
                    <div className={`text-[10px] mt-0.5 flex items-center gap-2 flex-wrap ${t.textFaint}`}>
                      <span>{req.lines.length} item{req.lines.length !== 1 ? 's' : ''}</span><span>·</span><span className={`${TYPE_WEIGHT.medium} ${t.textMuted}`}>{formatCurrency(req.grand_total)}</span>
                      {req.header.requester && <><span>·</span><span>{req.header.requester}</span></>}
                      {req.header.required_for && <><span>·</span><span className="italic">{req.header.required_for}</span></>}
                      <span>·</span><span>{formatDate(req.updated_at || req.saved_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-3">
                    <button onClick={() => loadSavedRequisition(req)} className="h-6 px-2.5 text-[11px] rounded-lg bg-brand-500/15 text-brand-400 hover:bg-brand-500/25">Load</button>
                    <button title="Delete" onClick={() => deleteSavedReq(req.id)} className={`h-6 w-6 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 hover:bg-rose-500/15 ${t.textFaint} hover:text-rose-500`}><X className="h-3 w-3" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="p-4 space-y-3">
            <div className={`p-3 rounded-xl ${t.chipBg} grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3`}>
              <FormField label="Requested By"><EntityComboInput fetchUrl="/api/employees" mapOptions={data => data.map((e) => ({ label: `${e.first_name} ${e.last_name}`, sub: e.employee_id ? `${e.employee_id}${e.designation ? ' · ' + e.designation : ''}` : undefined } as ComboOption))} value={reqHeader.requester} onChange={v => setReqH('requester', v)} placeholder="Name or employee ID…" memKey="req_requester" /></FormField>
              <div className="lg:col-span-2"><FormField label="Reason for Order"><PredictiveInput historyKey="spares_req_reason" value={reqHeader.reason} onChange={v => setReqH('reason', v)} placeholder="e.g. Scheduled maintenance, breakdown repair…" /></FormField></div>
              <FormField label="Required For"><EntityComboInput fetchUrl="/api/equipment" mapOptions={data => data.map((e) => ({ label: String(e.name), sub: [e.equipment_id, e.location].filter(Boolean).join(' · ') || undefined } as ComboOption))} value={reqHeader.required_for} onChange={v => setReqH('required_for', v)} placeholder="Equipment, machine or department…" memKey="req_required_for" /></FormField>
              <div className="grid grid-cols-2 gap-2">
                <FormField label="Urgency"><SelectField size="form" title="Urgency" value={reqHeader.urgency} onChange={v => setReqH('urgency', v as ReqHeader['urgency'])} options={[{ value: 'routine', label: 'Routine' }, { value: 'urgent', label: 'Urgent' }, { value: 'emergency', label: 'Emergency' }]} /></FormField>
                <FormField label="Priority"><SelectField size="form" title="Priority" value={reqHeader.priority} onChange={v => setReqH('priority', v as ReqHeader['priority'])} options={(['critical', 'high', 'medium', 'low'] as const).map(p => ({ value: p, label: p.charAt(0).toUpperCase() + p.slice(1) }))} /></FormField>
              </div>
            </div>

            {reqLines.length === 0 ? (
              <div className={`text-center py-6 text-sm ${t.textFaint}`}>Click <strong className={t.textMuted}>+ Add Line</strong> or <strong className={t.textMuted}>Add to Req</strong> on any spare card to build a price list.</div>
            ) : (<>
              <div className={`grid text-[10px] ${TYPE_WEIGHT.semibold} uppercase tracking-wider px-2 pb-1 ${t.textFaint}`} style={{ gridTemplateColumns: '180px 1fr 48px 96px 80px 90px 28px' }}>
                <div>Stock Code</div><div>Description</div><div className="text-center">UoM</div><div className="text-center">Qty</div><div className="text-right">Unit Price</div><div className="text-right">Total</div><div />
              </div>
              {reqLines.map(line => <RequisitionLineRow key={line.id} line={line} allSpares={spares} onUpdate={updateReqLine} onRemove={removeReqLine} />)}
              <div className={`grid items-center pt-2 border-t ${t.border} mt-2`} style={{ gridTemplateColumns: '180px 1fr 48px 96px 80px 90px 28px' }}>
                <div className={`col-span-5 text-right pr-1 text-xs ${TYPE_WEIGHT.semibold} uppercase tracking-wider ${t.textFaint}`}>Grand Total</div>
                <div className={`text-right pr-1 text-base ${TYPE_WEIGHT.bold} ${t.textPrimary}`}>{formatCurrency(reqGrandTotal)}</div><div />
              </div>
            </>)}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
        <div className={`flex items-center justify-between px-5 py-3 border-b ${t.border}`}>
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-brand-400" />
            <span className={`text-xs ${TYPE_WEIGHT.semibold} uppercase tracking-wider ${t.textMuted}`}>Filters</span>
            {activeFilterCount > 0 && <span className="text-[11px] px-1.5 py-0.5 rounded bg-brand-500/15 text-brand-400">{activeFilterCount} active</span>}
          </div>
          <div className="flex items-center gap-1">
            {activeFilterCount > 0 && <button onClick={clearFilters} className={`h-6 px-2 flex items-center gap-1 rounded-md ${t.chipBg} ${t.hoverBg} ${t.textFaint} text-[11px]`}><X className="h-2.5 w-2.5" /> Clear</button>}
            <button title={filterPanelMinimized ? 'Expand filters' : 'Collapse filters'} onClick={() => setFilterPanelMinimized(v => !v)} className={`h-6 w-6 flex items-center justify-center rounded-md ${t.chipBg} ${t.hoverBg} ${t.textFaint}`}>{filterPanelMinimized ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}</button>
          </div>
        </div>
        {!filterPanelMinimized && (
          <div className="px-5 pb-4 pt-3 space-y-3">
            <SearchInput value={search} onChange={setSearch} placeholder="Search stock code, description, category, supplier, notes…" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
              <div><div className={`text-[11px] mb-1.5 ${t.textFaint}`}>Category</div><SearchableDropdown value={categoryFilter} onChange={setCategoryFilter} placeholder="All categories" options={[{ value: 'all', label: 'All categories' }, ...ALL_PREDEFINED_CATS.map(c => ({ value: c, label: c })), ...categories.filter(c => !ALL_PREDEFINED_CATS.includes(c)).map(c => ({ value: c, label: c }))]} /></div>
              {categoryFilter !== 'all' && <button onClick={() => setCategoryFilter('all')} className={`h-9 px-3 inline-flex items-center gap-1.5 rounded-lg text-xs ${t.chipBg} ${t.textMuted} ${t.hoverBg} self-end`}><X className="h-3 w-3" /> Clear: {categoryFilter}</button>}
            </div>
            <div><div className={`text-[11px] mb-1.5 ${t.textFaint}`}>Stock Status</div><div className="flex flex-wrap gap-1.5">{[['all', 'All'], ['out', 'Out of Stock'], ['low', 'Low Stock'], ['adequate', 'Adequate'], ['in', 'In Stock']].map(([v, l]) => <button key={v} onClick={() => setStockFilter(v)} className={`px-3 py-1.5 rounded-lg text-xs ${TYPE_WEIGHT.medium} transition-all ${stockFilter === v ? `bg-brand-500/20 text-brand-400 ${TYPE_WEIGHT.semibold}` : `${t.chipBg} ${t.textMuted} ${t.hoverBg}`}`}>{l}</button>)}</div></div>
            <div><div className={`text-[11px] mb-1.5 ${t.textFaint}`}>Priority</div><div className="flex flex-wrap gap-1.5">{[['all', 'All'], ['critical', 'Critical'], ['high', 'High'], ['medium', 'Medium'], ['low', 'Low']].map(([v, l]) => <button key={v} onClick={() => setPriorityFilter(v)} className={`px-3 py-1.5 rounded-lg text-xs ${TYPE_WEIGHT.medium} transition-all ${priorityFilter === v ? `bg-brand-500/20 text-brand-400 ${TYPE_WEIGHT.semibold}` : `${t.chipBg} ${t.textMuted} ${t.hoverBg}`}`}>{l}</button>)}</div></div>
            <div className="flex flex-wrap items-center gap-4 pt-1">
              <div className={`flex items-center gap-2 text-[11px] ${t.textFaint}`}>
                <span className={`${TYPE_WEIGHT.semibold} uppercase tracking-wider`}>Sort:</span>
                <SortBtn field="stock_code" label="Code" /><SortBtn field="description" label="Description" /><SortBtn field="unit_price" label="Price" /><SortBtn field="current_quantity" label="Stock" /><SortBtn field="priority" label="Priority" /><SortBtn field="category" label="Category" />
              </div>
              <button onClick={() => setShowFavOnly(v => !v)} className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all ${showFavOnly ? 'bg-amber-500/15 text-amber-500' : `${t.chipBg} ${t.textFaint} ${t.hoverBg}`}`}><Star className={`h-3 w-3 ${showFavOnly ? `fill-amber-400 ${accentText('amber', t.light)}` : ''}`} /> Favorites{favorites.size > 0 && ` (${favorites.size})`}</button>
            </div>
          </div>
        )}
      </div>

      {/* Records */}
      <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
        <div className={`flex items-center gap-3 px-5 py-3 border-b ${t.border} flex-wrap`}>
          <div className="flex items-center gap-2 flex-shrink-0"><Package className="h-3.5 w-3.5 text-brand-400" /><span className={`text-xs ${TYPE_WEIGHT.semibold} uppercase tracking-wider ${t.textMuted}`}>Records</span><span className={`text-[11px] ${t.textFaint}`}>{filteredSpares.length} of {spares.length}</span></div>
          <div className="flex-1 min-w-0 max-w-xs"><SearchInput value={search} onChange={setSearch} placeholder="Search spares…" /></div>
          <div className="flex items-center gap-1.5 flex-shrink-0 ml-auto">
            {viewMode === 'grid' && <button onClick={handleToggleExpandAll} title={expandAllCards ? 'Collapse all' : 'Expand all'} className={`h-7 px-2 inline-flex items-center gap-1 text-[11px] rounded-lg ${t.chipBg} ${t.hoverBg} ${t.textFaint}`}>{expandAllCards ? <ChevronsUp className="h-3 w-3" /> : <ChevronsDown className="h-3 w-3" />}{expandAllCards ? 'Collapse' : 'Expand'}</button>}
            <ViewToggle value={viewMode} onChange={setViewMode} options={[{ value: 'grid', icon: Grid3x3, label: 'Grid view' }, { value: 'table', icon: List, label: 'Table view' }]} />
            <button title={recordsPanelMinimized ? 'Expand records' : 'Collapse records'} onClick={() => setRecordsPanelMinimized(v => !v)} className={`h-6 w-6 flex items-center justify-center rounded-md ${t.chipBg} ${t.hoverBg} ${t.textFaint}`}>{recordsPanelMinimized ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}</button>
          </div>
        </div>

        {!recordsPanelMinimized && (
          <div className="p-4">
            {loading ? (
              <div className="flex justify-center py-16"><Loader2 className={`h-8 w-8 animate-spin ${t.textFaint}`} /></div>
            ) : filteredSpares.length === 0 ? (
              <div className="text-center py-16">
                <Package className={`h-12 w-12 mx-auto mb-4 ${t.textFaint}`} />
                <div className={`text-base ${TYPE_WEIGHT.medium} mb-2 ${t.textMuted}`}>No spare parts found</div>
                <div className={`text-sm mb-6 ${t.textFaint}`}>{spares.length === 0 ? 'Add your first spare part or run the seed script to import the stock list.' : 'Try adjusting your filters.'}</div>
                {activeFilterCount > 0 ? (
                  <button onClick={clearFilters} className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm ${t.textMuted} ${t.chipBg} ${t.hoverBg}`}><X className="h-4 w-4" /> Clear Filters</button>
                ) : (
                  <button onClick={() => setFormOpen(true)} className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm ${TYPE_WEIGHT.semibold} text-white bg-gradient-to-br from-brand-500 to-brand-700 hover:brightness-110`}><Plus className="h-4 w-4" /> Add Spare Part</button>
                )}
              </div>
            ) : viewMode === 'grid' ? (
              <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-3">
                {groupedSpares.map(g => (
                  <GroupSection
                    key={g.category}
                    icon={Package}
                    accentHex={g.color}
                    title={g.category}
                    count={g.items.length}
                    countLabel={g.items.length === 1 ? 'item' : 'items'}
                    open={isGroupOpen(g.category)}
                    onToggle={() => toggleGroup(g.category)}
                    gridClassName="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                  >
                    {g.items.map(spare => (
                      <motion.div key={spare.id} variants={fadeUp}>
                        <SpareCard spare={spare} isFavorite={favorites.has(spare.id)} isExpanded={isExpanded(spare.id)}
                          onEdit={s => { setEditingSpare(s); setFormOpen(true); }} onDelete={id => setDeleteId(id)} onFavorite={toggleFavorite} onAddToReq={addToReq} onToggleExpand={() => toggleExpand(spare.id)} />
                      </motion.div>
                    ))}
                  </GroupSection>
                ))}
              </motion.div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={`border-b ${t.border}`}>
                      {[['Stock Code', 'stock_code'], ['Description', 'description'], ['Category', null], ['Machine', 'machine_type'], ['Stock', 'current_quantity'], ['Unit Price', 'unit_price'], ['Value', null], ['Status', 'status'], ['Priority', 'priority']].map(([label, field]) => (
                        <th key={label as string} className={`text-left p-3 text-xs ${TYPE_WEIGHT.semibold} uppercase tracking-wide ${t.textFaint} ${field ? `cursor-pointer ${t.hoverText}` : ''}`} onClick={() => field && handleSort(field as SortConfig['field'])}>
                          <div className="flex items-center gap-1">{label}{field && sortConfig.field === field && (sortConfig.direction === 'asc' ? <ChevronsUp className="h-3 w-3 text-brand-400" /> : <ChevronsDown className="h-3 w-3 text-brand-400" />)}</div>
                        </th>
                      ))}
                      <th className={`p-3 text-xs ${TYPE_WEIGHT.semibold} uppercase tracking-wide w-8 ${t.textFaint}`}><span className="sr-only">Expand</span></th>
                      <th className={`p-3 text-right text-xs ${TYPE_WEIGHT.semibold} uppercase tracking-wide ${t.textFaint}`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedSpares.map(spare => {
                      const st = getStockStatus(spare.current_quantity, spare.min_quantity);
                      const pc2 = PRIORITY_COLOR[spare.priority] || ACCENT_HEX.blue;
                      const rowExpanded = expandedTableRows.has(spare.id);
                      const invVal = calcLineTotal(spare.current_quantity, spare.unit_price);
                      const toggleTableRow = () => setExpandedTableRows(prev => { const n = new Set(prev); n.has(spare.id) ? n.delete(spare.id) : n.add(spare.id); return n; });
                      return (
                        <React.Fragment key={spare.id}>
                          <tr className={`border-b ${t.border} cursor-pointer transition-colors ${rowExpanded ? t.chipBg : t.hoverBgSoft}`} onClick={toggleTableRow}>
                            <td className={`p-3 font-mono ${TYPE_WEIGHT.semibold} text-xs ${t.textPrimary}`}>{spare.stock_code}</td>
                            <td className={`p-3 text-xs max-w-[220px] ${t.textMuted}`}><div className="truncate">{spare.description}</div></td>
                            <td className="p-3"><div className="flex flex-wrap gap-0.5">{(spare.categories && spare.categories.length > 0 ? spare.categories : spare.category ? [spare.category] : ['—']).map(cat => <span key={cat} className={`text-[11px] px-1.5 py-0.5 rounded ${t.chipBg} ${t.textMuted}`}>{cat}</span>)}</div></td>
                            <td className={`p-3 text-xs ${t.textFaint}`}>{spare.machine_type || '—'}</td>
                            <td className="p-3"><div className={`text-xs ${t.textMuted}`}>{spare.current_quantity}/{spare.max_quantity}</div><div className={`h-1 w-16 rounded-full ${t.chipBg} mt-1 overflow-hidden`}><div className="h-full rounded-full" style={{ width: `${Math.min(100, (spare.current_quantity / (spare.max_quantity || 1)) * 100)}%`, backgroundColor: st.color, opacity: 0.65 }} /></div></td>
                            <td className={`p-3 text-xs ${t.textMuted}`}>{formatCurrency(spare.unit_price)}</td>
                            <td className={`p-3 text-xs ${t.textFaint}`}>{formatCurrency(invVal)}</td>
                            <td className="p-3"><StatusBadge color={st.color} label={st.label} /></td>
                            <td className="p-3"><StatusBadge color={pc2} label={spare.priority} /></td>
                            <td className="p-3" onClick={e => e.stopPropagation()}><button title={rowExpanded ? 'Collapse' : 'Expand'} onClick={toggleTableRow} className={`h-6 w-6 flex items-center justify-center rounded ${t.textFaint} ${t.hoverText}`}>{rowExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}</button></td>
                            <td className="p-3 text-right" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1">
                                <button title="Add to requisition" aria-label={`Add ${spare.stock_code} to requisition`} className={`h-7 w-7 inline-flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} hover:text-brand-400`} onClick={() => addToReq(spare)}><ShoppingCart className="h-3.5 w-3.5" /></button>
                                <button title="Edit" aria-label={`Edit ${spare.stock_code}`} className={`h-7 w-7 inline-flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint}`} onClick={() => { setEditingSpare(spare); setFormOpen(true); }}><Pencil className="h-3.5 w-3.5" /></button>
                                <button title="Delete" aria-label={`Delete ${spare.stock_code}`} className={`h-7 w-7 inline-flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} hover:text-rose-500`} onClick={() => setDeleteId(spare.id)}><Trash2 className="h-3.5 w-3.5" /></button>
                              </div>
                            </td>
                          </tr>
                          {rowExpanded && (
                            <tr className={`border-b ${t.border}`} aria-label={`Details for ${spare.stock_code}`}>
                              <td colSpan={11} className="py-3 px-6">
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
                                  <div><div className={`text-[10px] uppercase tracking-wide mb-0.5 ${t.textFaint}`}>Full Description</div><div className={`leading-relaxed ${t.textMuted}`}>{spare.description}</div></div>
                                  <div><div className={`text-[10px] uppercase tracking-wide mb-0.5 ${t.textFaint}`}>Stock Levels</div><div className={t.textMuted}>Current: <span className={`${TYPE_WEIGHT.semibold} ${t.textPrimary}`}>{spare.current_quantity}</span> · Min: {spare.min_quantity} · Max: {spare.max_quantity}</div></div>
                                  <div><div className={`text-[10px] uppercase tracking-wide mb-0.5 ${t.textFaint}`}>Pricing</div><div className={t.textMuted}>Unit: <span className={`${TYPE_WEIGHT.semibold} ${t.textPrimary}`}>{formatCurrency(spare.unit_price)}</span> · Inv: {formatCurrency(invVal)}</div></div>
                                  <div><div className={`text-[10px] uppercase tracking-wide mb-0.5 ${t.textFaint}`}>Unit of Measure</div><div className={t.textMuted}>{spare.unit_of_measure || 'UN'} {spare.safety_stock && <span className="ml-1 text-brand-400">· Safety Stock</span>}</div></div>
                                  {spare.supplier && <div><div className={`text-[10px] uppercase tracking-wide mb-0.5 ${t.textFaint}`}>Supplier</div><div className={t.textMuted}>{spare.supplier}</div></div>}
                                  {spare.storage_location && <div><div className={`text-[10px] uppercase tracking-wide mb-0.5 ${t.textFaint}`}>Storage Location</div><div className={t.textMuted}>{spare.storage_location}</div></div>}
                                  {spare.last_ordered_date && <div><div className={`text-[10px] uppercase tracking-wide mb-0.5 ${t.textFaint}`}>Last Ordered</div><div className={t.textMuted}>{formatDate(spare.last_ordered_date)}</div></div>}
                                  {spare.notes && <div className="col-span-2"><div className={`text-[10px] uppercase tracking-wide mb-0.5 ${t.textFaint}`}>Notes</div><div className={`leading-relaxed ${t.textMuted}`}>{spare.notes}</div></div>}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {totalPages > 1 && (
              <div className={`flex items-center justify-between mt-5 pt-4 border-t ${t.border}`}>
                <span className={`text-[11px] ${t.textFaint}`}>Showing {(safeCurrentPage - 1) * PAGE_SIZE + 1}–{Math.min(safeCurrentPage * PAGE_SIZE, filteredSpares.length)} of {filteredSpares.length}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setCurrentPage(1)} disabled={safeCurrentPage === 1} className={`h-7 w-7 flex items-center justify-center rounded-lg ${t.chipBg} ${t.textFaint} ${t.hoverBg} disabled:opacity-25 text-xs ${TYPE_WEIGHT.bold}`}>«</button>
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safeCurrentPage === 1} className={`h-7 w-7 flex items-center justify-center rounded-lg ${t.chipBg} ${t.textFaint} ${t.hoverBg} disabled:opacity-25`}><ChevronDown className="h-3.5 w-3.5 rotate-90" /></button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => p === 1 || p === totalPages || Math.abs(p - safeCurrentPage) <= 2).reduce<(number | '…')[]>((acc, p, i, arr) => { if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('…'); acc.push(p); return acc; }, []).map((p, i) =>
                    p === '…' ? <span key={`ellipsis-${i}`} className={`h-7 w-6 flex items-center justify-center text-xs ${t.textFaint}`}>…</span>
                      : <button key={p} onClick={() => setCurrentPage(p as number)} className={`h-7 min-w-[28px] px-1.5 flex items-center justify-center rounded-lg text-xs ${TYPE_WEIGHT.medium} transition-all ${safeCurrentPage === p ? 'bg-brand-500/20 text-brand-400' : `${t.chipBg} ${t.textFaint} ${t.hoverBg}`}`}>{p}</button>
                  )}
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safeCurrentPage === totalPages} className={`h-7 w-7 flex items-center justify-center rounded-lg ${t.chipBg} ${t.textFaint} ${t.hoverBg} disabled:opacity-25`}><ChevronDown className="h-3.5 w-3.5 -rotate-90" /></button>
                  <button onClick={() => setCurrentPage(totalPages)} disabled={safeCurrentPage === totalPages} className={`h-7 w-7 flex items-center justify-center rounded-lg ${t.chipBg} ${t.textFaint} ${t.hoverBg} disabled:opacity-25 text-xs ${TYPE_WEIGHT.bold}`}>»</button>
                </div>
                <span className={`text-[11px] ${t.textFaint}`}>Page {safeCurrentPage} of {totalPages}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <SpareFormDialog open={formOpen} onClose={() => { setFormOpen(false); setEditingSpare(null); }} onSave={handleSave} editData={editingSpare} />

      <CenterModal open={deleteId !== null} onClose={() => setDeleteId(null)} title="Delete Spare Part" accent="amber" width="max-w-sm">
        <div className="p-5 space-y-4">
          <p className={`text-sm ${t.textMuted}`}>Delete this spare part? This cannot be undone.</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setDeleteId(null)} className={`flex-1 py-2.5 rounded-xl text-sm ${t.textMuted} ${t.hoverText} border ${t.border}`}>Cancel</button>
            <button type="button" onClick={confirmDelete} className={`flex-1 py-2.5 rounded-xl text-sm ${TYPE_WEIGHT.semibold} text-white bg-gradient-to-br from-rose-500 to-rose-700 hover:brightness-110 inline-flex items-center justify-center gap-2`}><Trash2 className="h-4 w-4" /> Delete</button>
          </div>
        </div>
      </CenterModal>
    </main>
  );
}

export default function SparesPage() {
  return (
    <AppShell>
      <SparesPageContent />
    </AppShell>
  );
}
