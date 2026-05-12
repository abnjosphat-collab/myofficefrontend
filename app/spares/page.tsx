// app/spares/page.tsx
'use client';

import { PageShell } from '@/components/PageShell';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Package, Search, Plus, Edit, Trash2, Copy, RefreshCw, AlertTriangle,
  ChevronDown, ChevronUp, ChevronRight, ShoppingCart, AlertOctagon,
  Loader2, DollarSign, List, X, Star, Eye, BarChart3, Filter,
  Shield, CheckCircle2, FileText, Truck, Cpu, MapPin,
  SortAsc, ChevronsUp, ChevronsDown, Grid3x3, MoreVertical, Check,
  Database, Tag, ClipboardList, Layers, Hash, Settings2, Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea as SA } from '@/components/ui/scroll-area';

// ─── INTERFACES ──────────────────────────────────────────────────────────────

interface Spare {
  id: number;
  stock_code: string;
  description: string;
  category?: string;
  machine_type?: string;
  current_quantity: number;
  min_quantity: number;
  max_quantity: number;
  unit_price: number;
  unit_of_measure?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  storage_location?: string;
  supplier?: string;
  safety_stock: boolean;
  notes?: string;
  lead_time_days?: number;
  last_ordered_date?: string;
  updated_at?: string;
}

interface ReqLine {
  id: string;
  spare: Spare | null;
  searchValue: string;
  qty: number;
  dropdownOpen: boolean;
}

interface ReqHeader {
  requester: string;
  reason: string;
  urgency: 'routine' | 'urgent' | 'emergency';
  priority: 'low' | 'medium' | 'high' | 'critical';
  required_for: string;
}

interface SavedRequisition {
  id: string;
  name: string;
  saved_at: string;
  updated_at?: string;
  header: ReqHeader;
  lines: Array<{ spare_id: number; stock_code: string; description: string; unit_of_measure?: string; unit_price: number; qty: number }>;
  grand_total: number;
}

interface SpareFormData {
  stock_code: string;
  description: string;
  category: string;
  machine_type: string;
  current_quantity: number;
  min_quantity: number;
  max_quantity: number;
  unit_price: number;
  unit_of_measure: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  storage_location: string;
  supplier: string;
  safety_stock: boolean;
  notes: string;
}

interface SortConfig { field: keyof Spare | 'status'; direction: 'asc' | 'desc'; }

// ─── CONSTANTS & UTILS ───────────────────────────────────────────────────────

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n || 0);

const formatDate = (s?: string | null) => {
  if (!s) return '—';
  try { return new Date(s).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch { return '—'; }
};

interface StockStatus { label: string; color: string; }
const getStockStatus = (current: number, min: number): StockStatus => {
  if (current <= 0) return { label: 'Out of Stock', color: '#f43f5e' };
  if (current <= min) return { label: 'Low Stock', color: '#f59e0b' };
  if (current <= min * 1.5) return { label: 'Adequate', color: '#86BBD8' };
  return { label: 'In Stock', color: '#34d399' };
};

const PRIORITY_COLOR: Record<string, string> = {
  critical: '#f43f5e', high: '#f59e0b', medium: '#86BBD8', low: 'rgba(255,255,255,0.3)',
};
const PRIORITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

const glassInput = 'w-full px-3 py-2 text-sm rounded-lg bg-white/[0.07] border border-white/12 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 focus:bg-white/[0.11] transition-all';
const glassLabel = 'text-xs font-medium text-white/55 mb-1 block';

const uid = () => Math.random().toString(36).slice(2);
const PAGE_SIZE = 24;

// ─── FIELD MEMORY & SAVED REQS (localStorage) ────────────────────────────────

const FIELD_MEM_KEY = 'ozech_field_memory';
const SAVED_REQS_KEY = 'ozech_saved_reqs';

const getFieldMemory = (field: string): string[] => {
  if (typeof window === 'undefined') return [];
  try { return (JSON.parse(localStorage.getItem(FIELD_MEM_KEY) || '{}')[field] || []) as string[]; }
  catch { return []; }
};

const rememberField = (field: string, value: string) => {
  if (!value.trim() || typeof window === 'undefined') return;
  try {
    const m = JSON.parse(localStorage.getItem(FIELD_MEM_KEY) || '{}');
    m[field] = [value.trim(), ...((m[field] || []) as string[]).filter(v => v !== value.trim())].slice(0, 25);
    localStorage.setItem(FIELD_MEM_KEY, JSON.stringify(m));
  } catch {}
};

const getSavedReqs = (): SavedRequisition[] => {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(SAVED_REQS_KEY) || '[]'); }
  catch { return []; }
};

const persistSavedReqs = (reqs: SavedRequisition[]) => {
  try { localStorage.setItem(SAVED_REQS_KEY, JSON.stringify(reqs)); } catch {}
};

const defaultReqHeader: ReqHeader = {
  requester: '', reason: '', urgency: 'routine', priority: 'medium', required_for: '',
};

// ─── MEMORY INPUT (tab-to-complete, remembers previous entries) ───────────────

const MemoryInput = React.memo(({ memKey, value, onChange, className, placeholder }: {
  memKey: string; value: string; onChange: (v: string) => void;
  className?: string; placeholder?: string;
}) => {
  const [open, setOpen] = useState(false);
  const suggestions = useMemo(() => {
    if (value.length < 1) return [];
    return getFieldMemory(memKey)
      .filter(s => s.toLowerCase().startsWith(value.toLowerCase()) && s.toLowerCase() !== value.toLowerCase())
      .slice(0, 7);
  }, [value, memKey]);

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        className={className}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onKeyDown={e => {
          if (e.key === 'Tab' && suggestions.length > 0) {
            e.preventDefault();
            onChange(suggestions[0]);
            rememberField(memKey, suggestions[0]);
            setOpen(false);
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => { setTimeout(() => setOpen(false), 160); if (value.trim()) rememberField(memKey, value); }}
      />
      {open && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-0.5 rounded-xl overflow-hidden shadow-2xl"
          style={{ background: 'rgba(4,12,24,0.98)', border: '1px solid rgba(255,255,255,0.15)' }}>
          {suggestions.map((s, i) => (
            <button key={s} type="button"
              onMouseDown={e => { e.preventDefault(); onChange(s); rememberField(memKey, s); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-xs hover:bg-white/[0.08] transition-all border-b border-white/[0.05] last:border-0 flex items-center justify-between">
              <span className="text-white/75">{s}</span>
              {i === 0 && <span className="text-[10px] text-white/25 flex-shrink-0 ml-2">Tab ↵</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
MemoryInput.displayName = 'MemoryInput';

// ─── ENTITY COMBO INPUT (pick from API list or type freely) ──────────────────

interface ComboOption { label: string; sub?: string; }

const EntityComboInput = React.memo(({
  fetchUrl, mapOptions, value, onChange, className, placeholder, memKey,
}: {
  fetchUrl: string; mapOptions: (data: any[]) => ComboOption[];
  value: string; onChange: (v: string) => void;
  className?: string; placeholder?: string; memKey?: string;
}) => {
  const [options, setOptions] = useState<ComboOption[]>([]);
  const [fetched, setFetched] = useState(false);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const ensureFetched = useCallback(async () => {
    if (fetched) return;
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}${fetchUrl}`);
      const data = await r.json();
      setOptions(mapOptions(Array.isArray(data) ? data : []));
    } catch {}
    finally { setFetched(true); setLoading(false); }
  }, [fetched, fetchUrl, mapOptions]);

  const apiFiltered = useMemo(() => {
    if (!value.trim()) return options.slice(0, 12);
    const t = value.toLowerCase();
    return options.filter(o => o.label.toLowerCase().includes(t) || (o.sub || '').toLowerCase().includes(t)).slice(0, 10);
  }, [value, options]);

  const memSuggestions = useMemo(() => {
    if (!memKey) return [];
    return getFieldMemory(memKey)
      .filter(s => s.toLowerCase().includes(value.toLowerCase()) && !apiFiltered.some(o => o.label === s))
      .slice(0, 3)
      .map(s => ({ label: s, sub: 'recent' }));
  }, [memKey, value, apiFiltered]);

  const allOptions = [...apiFiltered, ...memSuggestions];

  return (
    <div className="relative">
      <input type="text" value={value} placeholder={placeholder} className={className}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => { ensureFetched(); setOpen(true); }}
        onKeyDown={e => {
          if (e.key === 'Escape') { setOpen(false); }
          else if (e.key === 'Tab' && allOptions.length > 0) {
            e.preventDefault();
            onChange(allOptions[0].label);
            if (memKey) rememberField(memKey, allOptions[0].label);
            setOpen(false);
          }
        }}
        onBlur={() => { setTimeout(() => setOpen(false), 160); if (value.trim() && memKey) rememberField(memKey, value); }}
      />
      {open && (loading || allOptions.length > 0) && (
        <div className="absolute top-full left-0 right-0 z-50 mt-0.5 rounded-xl overflow-hidden shadow-2xl max-h-52 overflow-y-auto"
          style={{ background: 'rgba(4,12,24,0.98)', border: '1px solid rgba(255,255,255,0.15)' }}>
          {loading && <div className="px-3 py-2 text-xs text-white/35 flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" />Loading…</div>}
          {allOptions.map((o, i) => (
            <button key={`${o.label}-${i}`} type="button"
              onMouseDown={e => { e.preventDefault(); onChange(o.label); if (memKey) rememberField(memKey, o.label); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-xs hover:bg-white/[0.08] transition-all border-b border-white/[0.05] last:border-0 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="text-white/80">{o.label}</span>
                {o.sub && <span className="text-[10px] text-white/30 ml-2">{o.sub}</span>}
              </div>
              {i === 0 && <span className="text-[10px] text-white/20 flex-shrink-0">Tab ↵</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
EntityComboInput.displayName = 'EntityComboInput';

// ─── SAVED REQS API HELPERS ───────────────────────────────────────────────────

const dbRowToReq = (row: any): SavedRequisition => ({
  id: row.id,
  name: row.name,
  saved_at: row.saved_at || row.updated_at || new Date().toISOString(),
  updated_at: row.updated_at,
  header: {
    requester: row.requester || '',
    reason: row.reason || '',
    urgency: (row.urgency as ReqHeader['urgency']) || 'routine',
    priority: (row.priority as ReqHeader['priority']) || 'medium',
    required_for: row.required_for || '',
  },
  lines: Array.isArray(row.lines) ? row.lines : [],
  grand_total: Number(row.grand_total) || 0,
});

const reqToDbPayload = (req: SavedRequisition) => ({
  name: req.name,
  requester: req.header.requester || null,
  reason: req.header.reason || null,
  urgency: req.header.urgency,
  priority: req.header.priority,
  required_for: req.header.required_for || null,
  lines: req.lines,
  grand_total: req.grand_total,
});

const apiGetSavedReqs = async (): Promise<SavedRequisition[]> => {
  try {
    const r = await fetch(`${API_URL}/api/spares/saved-requisitions`);
    if (!r.ok) return [];
    const data = await r.json();
    return (Array.isArray(data) ? data : []).map(dbRowToReq);
  } catch { return []; }
};

const apiCreateSavedReq = async (req: SavedRequisition): Promise<SavedRequisition | null> => {
  try {
    const r = await fetch(`${API_URL}/api/spares/saved-requisitions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqToDbPayload(req)),
    });
    if (!r.ok) return null;
    return dbRowToReq(await r.json());
  } catch { return null; }
};

const apiDeleteSavedReq = async (id: string): Promise<boolean> => {
  try {
    const r = await fetch(`${API_URL}/api/spares/saved-requisitions/${id}`, { method: 'DELETE' });
    return r.ok;
  } catch { return false; }
};

// ─── API ─────────────────────────────────────────────────────────────────────

async function apiFetchAll(): Promise<Spare[]> {
  const r = await fetch(`${API_URL}/api/spares?limit=5000`);
  if (!r.ok) throw new Error(`Fetch failed: ${r.status}`);
  const d = await r.json();
  return Array.isArray(d) ? d : d?.items ?? d?.data ?? [];
}

async function apiCreate(data: Partial<SpareFormData>): Promise<Spare> {
  const r = await fetch(`${API_URL}/api/spares`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.detail || 'Create failed'); }
  return r.json();
}

async function apiUpdate(id: number, data: Partial<SpareFormData>): Promise<Spare> {
  const r = await fetch(`${API_URL}/api/spares/${id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.detail || 'Update failed'); }
  return r.json();
}

async function apiDelete(id: number): Promise<void> {
  const r = await fetch(`${API_URL}/api/spares/${id}`, { method: 'DELETE' });
  if (!r.ok) throw new Error('Delete failed');
}

// ─── SPARE CARD ──────────────────────────────────────────────────────────────

const SpareCard = React.memo(({
  spare, isFavorite, isExpanded,
  onEdit, onDelete, onFavorite, onAddToReq, onToggleExpand,
}: {
  spare: Spare; isFavorite: boolean; isExpanded: boolean;
  onEdit: (s: Spare) => void; onDelete: (id: number) => void;
  onFavorite: (id: number) => void; onAddToReq: (s: Spare) => void;
  onToggleExpand: () => void;
}) => {
  const status = getStockStatus(spare.current_quantity, spare.min_quantity);
  const pct = spare.max_quantity > 0 ? Math.min(100, (spare.current_quantity / spare.max_quantity) * 100) : 0;
  const invValue = spare.current_quantity * spare.unit_price;
  const pc = PRIORITY_COLOR[spare.priority] || '#86BBD8';

  return (
    <div
      className="group relative overflow-hidden rounded-xl transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5"
      style={{ background: 'rgba(5,15,28,0.75)', backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)', border: '1px solid rgba(255,255,255,0.10)' }}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0 pr-2">
            <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
              <span className="font-mono font-bold text-sm text-white">{spare.stock_code}</span>
              {spare.safety_stock && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#86BBD8]/20 border border-[#86BBD8]/30 text-[#86BBD8]">Safety</span>}
              {isFavorite && <Star className="h-3 w-3 fill-amber-400 text-amber-400 flex-shrink-0" />}
            </div>
            <div className="text-xs text-white/60 line-clamp-2 leading-snug">{spare.description}</div>
          </div>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button title={isFavorite ? 'Unfavourite' : 'Favourite'} onClick={() => onFavorite(spare.id)} className="h-6 w-6 flex items-center justify-center rounded hover:bg-white/[0.10] text-white/30 hover:text-amber-400 transition-all">
              <Star className={`h-3 w-3 ${isFavorite ? 'fill-amber-400 text-amber-400' : ''}`} />
            </button>
            <button title={isExpanded ? 'Collapse' : 'Expand'} onClick={onToggleExpand} className="h-6 w-6 flex items-center justify-center rounded hover:bg-white/[0.10] text-white/30 transition-all">
              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button title="More options" className="h-6 w-6 flex items-center justify-center rounded hover:bg-white/[0.10] text-white/30 transition-all">
                  <MoreVertical className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" style={{ background: 'rgba(5,15,28,0.97)', border: '1px solid rgba(255,255,255,0.15)' }}>
                <DropdownMenuItem className="text-white/75 hover:bg-white/[0.10] focus:bg-white/[0.10] focus:text-white" onClick={() => onEdit(spare)}>
                  <Edit className="h-4 w-4 mr-2" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem className="text-white/75 hover:bg-white/[0.10] focus:bg-white/[0.10] focus:text-white" onClick={() => { navigator.clipboard.writeText(spare.stock_code); toast.success('Copied'); }}>
                  <Copy className="h-4 w-4 mr-2" /> Copy Code
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem className="text-rose-400 hover:bg-rose-500/20 focus:bg-rose-500/20 focus:text-rose-300" onClick={() => onDelete(spare.id)}>
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1 mb-3">
          {spare.category && <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/10 text-white/55">{spare.category}</span>}
          <span className="text-[10px] px-1.5 py-0.5 rounded border font-medium" style={{ background: `${status.color}1a`, borderColor: `${status.color}40`, color: status.color }}>{status.label}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded border font-medium capitalize" style={{ background: `${pc}1a`, borderColor: `${pc}40`, color: pc }}>{spare.priority}</span>
        </div>

        {/* Stock bar */}
        <div className="mb-3">
          <div className="flex justify-between text-[11px] text-white/40 mb-1">
            <span>Stock: <span className="text-white/65">{spare.current_quantity}</span>/{spare.max_quantity} {spare.unit_of_measure || 'UN'}</span>
            <span>Min: {spare.min_quantity}</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden relative">
            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: status.color, opacity: 0.65 }} />
            {spare.max_quantity > 0 && spare.min_quantity > 0 && (
              <div className="absolute top-0 h-full w-px bg-white/40" style={{ left: `${Math.min(100, (spare.min_quantity / spare.max_quantity) * 100)}%` }} />
            )}
          </div>
        </div>

        {/* Price & action */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-white">{formatCurrency(spare.unit_price)}<span className="text-[10px] text-white/35 ml-1">/{spare.unit_of_measure || 'UN'}</span></div>
            <div className="text-[10px] text-white/40">Inv: {formatCurrency(invValue)}</div>
          </div>
          <button onClick={() => onAddToReq(spare)} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-white transition-all hover:-translate-y-0.5 hover:shadow-lg active:scale-95" style={{ background: 'rgba(42,77,105,0.55)', border: '1px solid rgba(134,187,216,0.3)' }}>
            <ShoppingCart className="h-3 w-3" /> Add to Req
          </button>
        </div>
      </div>

      {/* Expanded — full details */}
      {isExpanded && (
        <div className="border-t border-white/[0.07] px-4 pt-3 pb-4 space-y-2.5 text-xs">
          {/* Description (full, untruncated) */}
          <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.05]">
            <div className="text-[10px] text-white/30 uppercase tracking-wide mb-1">Description</div>
            <div className="text-white/70 leading-relaxed">{spare.description}</div>
          </div>

          {/* Identification row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
              <div className="text-[10px] text-white/30 uppercase tracking-wide mb-0.5">Category</div>
              <div className="text-white/70">{spare.category || '—'}</div>
            </div>
            <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
              <div className="text-[10px] text-white/30 uppercase tracking-wide mb-0.5">Machine</div>
              <div className="text-white/70">{spare.machine_type || '—'}</div>
            </div>
            <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
              <div className="text-[10px] text-white/30 uppercase tracking-wide mb-0.5">UoM</div>
              <div className="text-white/70">{spare.unit_of_measure || 'UN'}</div>
            </div>
          </div>

          {/* Stock & pricing row */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.05] space-y-1">
              <div className="text-[10px] text-white/30 uppercase tracking-wide">Stock Levels</div>
              <div className="flex justify-between"><span className="text-white/40">Current</span><span className="text-white/75 font-semibold">{spare.current_quantity}</span></div>
              <div className="flex justify-between"><span className="text-white/40">Minimum</span><span className="text-white/65">{spare.min_quantity}</span></div>
              <div className="flex justify-between"><span className="text-white/40">Maximum</span><span className="text-white/65">{spare.max_quantity}</span></div>
            </div>
            <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.05] space-y-1">
              <div className="text-[10px] text-white/30 uppercase tracking-wide">Pricing</div>
              <div className="flex justify-between"><span className="text-white/40">Unit Price</span><span className="text-white/75 font-semibold">{formatCurrency(spare.unit_price)}</span></div>
              <div className="flex justify-between"><span className="text-white/40">Inv. Value</span><span className="text-white/65">{formatCurrency(invValue)}</span></div>
              <div className="flex justify-between"><span className="text-white/40">Safety Stock</span><span className={spare.safety_stock ? 'text-[#86BBD8]' : 'text-white/35'}>{spare.safety_stock ? 'Yes' : 'No'}</span></div>
            </div>
          </div>

          {/* Supplier / location / dates */}
          {(spare.supplier || spare.storage_location || spare.last_ordered_date || spare.lead_time_days) && (
            <div className="grid grid-cols-2 gap-2">
              {spare.supplier && (
                <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                  <div className="text-[10px] text-white/30 uppercase tracking-wide mb-0.5">Supplier</div>
                  <div className="text-white/70">{spare.supplier}</div>
                </div>
              )}
              {spare.storage_location && (
                <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                  <div className="text-[10px] text-white/30 uppercase tracking-wide mb-0.5">Storage Location</div>
                  <div className="text-white/70">{spare.storage_location}</div>
                </div>
              )}
              {spare.last_ordered_date && (
                <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                  <div className="text-[10px] text-white/30 uppercase tracking-wide mb-0.5">Last Ordered</div>
                  <div className="text-white/70">{formatDate(spare.last_ordered_date)}</div>
                </div>
              )}
              {spare.lead_time_days ? (
                <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                  <div className="text-[10px] text-white/30 uppercase tracking-wide mb-0.5">Lead Time</div>
                  <div className="text-white/70">{spare.lead_time_days} days</div>
                </div>
              ) : null}
            </div>
          )}

          {/* Notes */}
          {spare.notes && (
            <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.05]">
              <div className="text-[10px] text-white/30 uppercase tracking-wide mb-1">Notes</div>
              <div className="text-white/55 leading-relaxed">{spare.notes}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
SpareCard.displayName = 'SpareCard';

// ─── REQUISITION LINE ROW ─────────────────────────────────────────────────────

const RequisitionLineRow = ({
  line, allSpares, onUpdate, onRemove,
}: {
  line: ReqLine; allSpares: Spare[];
  onUpdate: (id: string, patch: Partial<ReqLine>) => void;
  onRemove: (id: string) => void;
}) => {
  const suggestions = useMemo(() => {
    const v = line.searchValue.trim();
    if (v.length < 2) return [];
    const t = v.toLowerCase();
    return allSpares.filter(s =>
      s.stock_code.toLowerCase().includes(t) || s.description.toLowerCase().includes(t)
    ).slice(0, 12);
  }, [line.searchValue, allSpares]);

  const lineTotal = (line.spare?.unit_price ?? 0) * line.qty;

  const pick = (spare: Spare) => onUpdate(line.id, { spare, searchValue: spare.stock_code, dropdownOpen: false });

  return (
    <div className="grid gap-1.5 items-center p-2 rounded-xl bg-white/[0.04] border border-white/[0.06]"
      style={{ gridTemplateColumns: '180px 1fr 48px 96px 80px 90px 28px' }}>
      {/* Stock code combobox */}
      <div className="relative">
        <input
          type="text"
          value={line.searchValue}
          placeholder="Stock code…"
          onChange={e => onUpdate(line.id, { searchValue: e.target.value, spare: null, dropdownOpen: true })}
          onFocus={() => onUpdate(line.id, { dropdownOpen: true })}
          onBlur={() => setTimeout(() => onUpdate(line.id, { dropdownOpen: false }), 160)}
          className="w-full px-2 py-1.5 text-xs rounded-lg bg-white/[0.07] border border-white/12 text-white placeholder:text-white/30 font-mono focus:outline-none focus:border-white/30 transition-all"
        />
        {line.dropdownOpen && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-50 mt-0.5 rounded-xl overflow-hidden shadow-2xl max-h-[220px] overflow-y-auto"
            style={{ background: 'rgba(4,12,24,0.98)', border: '1px solid rgba(255,255,255,0.15)' }}>
            {suggestions.map(s => (
              <button key={s.id} onMouseDown={() => pick(s)} className="w-full text-left px-3 py-2 hover:bg-white/[0.08] transition-all border-b border-white/[0.05] last:border-0">
                <div className="font-mono text-xs font-semibold text-white">{s.stock_code}
                  <span className="ml-2 text-[10px] text-white/40 font-normal non-mono">{s.unit_of_measure || 'UN'}</span>
                </div>
                <div className="text-[11px] text-white/50 truncate">{s.description}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Description */}
      <div className="text-[11px] text-white/55 truncate px-1">{line.spare?.description ?? <span className="text-white/25 italic">—</span>}</div>

      {/* UoM */}
      <div className="text-[11px] text-white/40 text-center">{line.spare?.unit_of_measure ?? '—'}</div>

      {/* Qty */}
      <div className="flex items-center gap-0.5">
        <button onClick={() => onUpdate(line.id, { qty: Math.max(1, line.qty - 1) })} className="h-6 w-5 flex items-center justify-center rounded bg-white/[0.07] hover:bg-white/[0.15] text-white/50 text-sm leading-none transition-all">−</button>
        <input type="number" min={1} value={line.qty} onChange={e => onUpdate(line.id, { qty: Math.max(1, Number(e.target.value) || 1) })}
          className="w-10 text-center text-xs rounded-md bg-white/[0.07] border border-white/10 text-white focus:outline-none focus:border-white/30 py-1 transition-all" />
        <button onClick={() => onUpdate(line.id, { qty: line.qty + 1 })} className="h-6 w-5 flex items-center justify-center rounded bg-white/[0.07] hover:bg-white/[0.15] text-white/50 text-sm leading-none transition-all">+</button>
      </div>

      {/* Unit price */}
      <div className="text-xs text-white/55 text-right pr-1">{line.spare ? formatCurrency(line.spare.unit_price) : '—'}</div>

      {/* Line total */}
      <div className="text-xs font-bold text-white text-right pr-1">{line.spare ? formatCurrency(lineTotal) : '—'}</div>

      {/* Remove */}
      <button title="Remove line" onClick={() => onRemove(line.id)} className="h-6 w-6 flex items-center justify-center rounded hover:bg-rose-500/20 text-white/30 hover:text-rose-400 transition-all">
        <X className="h-3 w-3" />
      </button>
    </div>
  );
};

// ─── SPARE FORM DIALOG ────────────────────────────────────────────────────────

const defaultForm: SpareFormData = {
  stock_code: '', description: '', category: '', machine_type: '',
  current_quantity: 0, min_quantity: 1, max_quantity: 10,
  unit_price: 0, unit_of_measure: 'UN', priority: 'medium',
  storage_location: '', supplier: '', safety_stock: false, notes: '',
};

const SpareFormDialog = ({ open, onClose, onSave, editData, categories }: {
  open: boolean; onClose: () => void;
  onSave: (d: SpareFormData) => Promise<void>;
  editData?: Spare | null; categories: string[];
}) => {
  const [form, setForm] = useState<SpareFormData>(defaultForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(editData ? {
      stock_code: editData.stock_code, description: editData.description,
      category: editData.category || '', machine_type: editData.machine_type || '',
      current_quantity: editData.current_quantity, min_quantity: editData.min_quantity,
      max_quantity: editData.max_quantity, unit_price: editData.unit_price,
      unit_of_measure: editData.unit_of_measure || 'UN', priority: editData.priority,
      storage_location: editData.storage_location || '', supplier: editData.supplier || '',
      safety_stock: editData.safety_stock, notes: editData.notes || '',
    } : defaultForm);
  }, [editData, open]);

  const set = <K extends keyof SpareFormData>(k: K, v: SpareFormData[K]) =>
    setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.stock_code.trim()) { toast.error('Stock code is required'); return; }
    if (!form.description.trim()) { toast.error('Description is required'); return; }
    setSaving(true);
    try { await onSave(form); onClose(); }
    catch (e: any) { toast.error(e.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const section = (title: string, children: React.ReactNode) => (
    <div className="rounded-xl bg-white/[0.04] border border-white/[0.07] p-3 space-y-3">
      <div className="text-[11px] font-semibold text-[#86BBD8] uppercase tracking-wider">{title}</div>
      {children}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent style={{ background: 'rgba(4,12,24,0.98)', border: '1px solid rgba(255,255,255,0.12)', maxWidth: '600px' }} className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white font-heading text-base">{editData ? 'Edit Spare Part' : 'Add New Spare Part'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          {/* Required */}
          {section('Required', <>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={glassLabel}>Stock Code *</label>
                <input className={glassInput} value={form.stock_code} onChange={e => set('stock_code', e.target.value)} placeholder="e.g. 106335" disabled={!!editData} /></div>
              <div><label className={glassLabel}>Unit Price (USD) *</label>
                <input type="number" step="0.01" min="0" className={glassInput} value={form.unit_price} onChange={e => set('unit_price', parseFloat(e.target.value) || 0)} /></div>
            </div>
            <div><label className={glassLabel}>Description *</label>
              <input className={glassInput} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Part description" /></div>
          </>)}

          {/* Stock levels */}
          {section('Stock Levels', <>
            <div className="grid grid-cols-4 gap-2">
              {([['Current Qty', 'current_quantity'], ['Min Qty', 'min_quantity'], ['Max Qty', 'max_quantity']] as const).map(([lbl, key]) => (
                <div key={key}><label className={glassLabel}>{lbl}</label>
                  <input type="number" min="0" className={glassInput} value={form[key] as number} onChange={e => set(key, parseInt(e.target.value) || 0)} /></div>
              ))}
              <div><label className={glassLabel}>UoM</label>
                <input className={glassInput} value={form.unit_of_measure} onChange={e => set('unit_of_measure', e.target.value)} placeholder="UN" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3 items-center">
              <div><label className={glassLabel}>Priority</label>
                <select value={form.priority} onChange={e => set('priority', e.target.value as SpareFormData['priority'])}
                  className={glassInput + ' appearance-none cursor-pointer'} style={{ colorScheme: 'dark' }}>
                  {['critical', 'high', 'medium', 'low'].map(p => <option key={p} value={p} className="bg-[#050f1c] capitalize">{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-3 pt-4">
                <Switch id="sf-ss" checked={form.safety_stock} onCheckedChange={v => set('safety_stock', v)} />
                <Label htmlFor="sf-ss" className="text-xs text-white/55 cursor-pointer">Safety Stock</Label>
              </div>
            </div>
          </>)}

          {/* Classification */}
          {section('Classification (Optional)', <>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={glassLabel}>Category</label>
                <input className={glassInput} value={form.category} onChange={e => set('category', e.target.value)} placeholder="e.g. CONS, PMA03" list="spare-cats" />
                <datalist id="spare-cats">{categories.slice(0, 100).map(c => <option key={c} value={c} />)}</datalist>
              </div>
              <div><label className={glassLabel}>Machine / Equipment</label>
                <input className={glassInput} value={form.machine_type} onChange={e => set('machine_type', e.target.value)} placeholder="e.g. Crusher, Winder" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={glassLabel}>Supplier</label>
                <input className={glassInput} value={form.supplier} onChange={e => set('supplier', e.target.value)} placeholder="Supplier name" /></div>
              <div><label className={glassLabel}>Storage Location</label>
                <input className={glassInput} value={form.storage_location} onChange={e => set('storage_location', e.target.value)} placeholder="e.g. A1-S3" /></div>
            </div>
          </>)}

          {/* Notes */}
          {section('Notes (Optional)', <>
            <textarea rows={2} className={glassInput + ' resize-none'} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any additional notes…" />
          </>)}

        </div>
        <DialogFooter>
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-white/55 hover:text-white hover:bg-white/[0.08] transition-all">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0"
            style={{ background: 'linear-gradient(135deg, #2A4D69, #1e3a52)', border: '1px solid rgba(134,187,216,0.25)' }}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {editData ? 'Update' : 'Add Spare'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function SparesPage() {
  // Data
  const [spares, setSpares] = useState<Spare[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Panels visibility
  const [showHeroStats, setShowHeroStats] = useState(true);
  const [showCategoryBreakdown, setShowCategoryBreakdown] = useState(true);
  const [showRequisition, setShowRequisition] = useState(false);
  const [filterPanelMinimized, setFilterPanelMinimized] = useState(false);
  const [recordsPanelMinimized, setRecordsPanelMinimized] = useState(false);
  const [expandAllCards, setExpandAllCards] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'stock_code', direction: 'asc' });
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [showFavOnly, setShowFavOnly] = useState(false);

  // UI state
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [expandedTableRows, setExpandedTableRows] = useState<Set<number>>(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [editingSpare, setEditingSpare] = useState<Spare | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Requisition builder
  const [reqLines, setReqLines] = useState<ReqLine[]>([]);
  const [reqHeader, setReqHeader] = useState<ReqHeader>(defaultReqHeader);
  const [savedReqs, setSavedReqs] = useState<SavedRequisition[]>(() => getSavedReqs());
  const [showSavedReqs, setShowSavedReqs] = useState(false);
  const [saveReqName, setSaveReqName] = useState('');
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [savedReqsLoaded, setSavedReqsLoaded] = useState(false);
  const setReqH = useCallback(<K extends keyof ReqHeader>(k: K, v: ReqHeader[K]) =>
    setReqHeader(p => ({ ...p, [k]: v })), []);

  // Load data
  const loadData = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setRefreshing(true);
    try {
      const data = await apiFetchAll();
      setSpares(data.map(s => ({
        ...s,
        current_quantity: Number(s.current_quantity ?? 0),
        min_quantity: Number(s.min_quantity ?? 1),
        max_quantity: Number(s.max_quantity ?? 5),
        unit_price: Number(s.unit_price ?? 0),
        safety_stock: Boolean(s.safety_stock),
      })));
    } catch (e: any) {
      toast.error(`Failed to load: ${e.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Load saved reqs from Supabase (falls back to localStorage already in state)
  useEffect(() => {
    if (savedReqsLoaded) return;
    setSavedReqsLoaded(true);
    apiGetSavedReqs().then(serverReqs => {
      if (serverReqs.length > 0) {
        setSavedReqs(serverReqs);
        persistSavedReqs(serverReqs); // sync localStorage
      }
    });
  }, [savedReqsLoaded]);

  // Derived lists
  const categories = useMemo(() =>
    [...new Set(spares.map(s => s.category).filter(Boolean) as string[])].sort(),
    [spares]);

  // Stats
  const stats = useMemo(() => {
    const outOfStock = spares.filter(s => s.current_quantity <= 0).length;
    const lowStock = spares.filter(s => s.current_quantity > 0 && s.current_quantity <= s.min_quantity).length;
    const totalValue = spares.reduce((sum, s) => sum + s.current_quantity * s.unit_price, 0);
    const safetyCount = spares.filter(s => s.safety_stock).length;
    return { total: spares.length, outOfStock, lowStock, totalValue, categories: categories.length, safetyCount };
  }, [spares, categories]);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, { count: number; value: number; out: number; low: number }> = {};
    spares.forEach(s => {
      const cat = s.category || 'Uncategorised';
      if (!map[cat]) map[cat] = { count: 0, value: 0, out: 0, low: 0 };
      map[cat].count++;
      map[cat].value += s.current_quantity * s.unit_price;
      const st = getStockStatus(s.current_quantity, s.min_quantity);
      if (st.label === 'Out of Stock') map[cat].out++;
      else if (st.label === 'Low Stock') map[cat].low++;
    });
    return Object.entries(map)
      .map(([cat, d]) => ({ cat, ...d, pct: spares.length > 0 ? Math.round((d.count / spares.length) * 100) : 0 }))
      .sort((a, b) => b.count - a.count);
  }, [spares]);

  // Filtered & sorted spares
  const filteredSpares = useMemo(() => {
    let list = spares.filter(s => {
      if (showFavOnly && !favorites.has(s.id)) return false;
      if (categoryFilter !== 'all' && s.category !== categoryFilter) return false;
      if (priorityFilter !== 'all' && s.priority !== priorityFilter) return false;
      const status = getStockStatus(s.current_quantity, s.min_quantity).label;
      if (stockFilter === 'out' && status !== 'Out of Stock') return false;
      if (stockFilter === 'low' && status !== 'Low Stock') return false;
      if (stockFilter === 'adequate' && status !== 'Adequate') return false;
      if (stockFilter === 'in' && status !== 'In Stock') return false;
      if (search) {
        const t = search.toLowerCase();
        if (!s.stock_code.toLowerCase().includes(t) &&
            !s.description.toLowerCase().includes(t) &&
            !(s.category || '').toLowerCase().includes(t) &&
            !(s.supplier || '').toLowerCase().includes(t)) return false;
      }
      return true;
    });

    list.sort((a, b) => {
      let av: any, bv: any;
      const f = sortConfig.field;
      if (f === 'status') {
        av = getStockStatus(a.current_quantity, a.min_quantity).label;
        bv = getStockStatus(b.current_quantity, b.min_quantity).label;
      } else if (f === 'priority') {
        av = PRIORITY_ORDER[a.priority] ?? 2;
        bv = PRIORITY_ORDER[b.priority] ?? 2;
      } else {
        av = (a as any)[f] ?? '';
        bv = (b as any)[f] ?? '';
      }
      if (av < bv) return sortConfig.direction === 'asc' ? -1 : 1;
      if (av > bv) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    // Favorites bubble to top
    if (favorites.size > 0) {
      list.sort((a, b) => {
        const af = favorites.has(a.id), bf = favorites.has(b.id);
        return af === bf ? 0 : af ? -1 : 1;
      });
    }

    return list;
  }, [spares, search, categoryFilter, priorityFilter, stockFilter, favorites, showFavOnly, sortConfig]);

  const activeFilterCount = [
    search, stockFilter !== 'all', categoryFilter !== 'all', priorityFilter !== 'all', showFavOnly,
  ].filter(Boolean).length;

  // Reset to page 1 only when filters change, not when data reloads after an edit
  useEffect(() => { setCurrentPage(1); }, [search, stockFilter, categoryFilter, priorityFilter, showFavOnly]);

  const totalPages = Math.max(1, Math.ceil(filteredSpares.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedSpares = useMemo(
    () => filteredSpares.slice((safeCurrentPage - 1) * PAGE_SIZE, safeCurrentPage * PAGE_SIZE),
    [filteredSpares, safeCurrentPage],
  );

  const clearFilters = () => { setSearch(''); setStockFilter('all'); setCategoryFilter('all'); setPriorityFilter('all'); setShowFavOnly(false); };

  // Handlers
  const handleSave = async (data: SpareFormData) => {
    // Explicit whitelist — only send columns that exist in the DB schema
    // Only the 12 columns confirmed in the DB schema are sent.
    // unit_of_measure / notes / lead_time_days / last_ordered_date are held by
    // the backend filter until you run the Supabase migration:
    //   ALTER TABLE spares ADD COLUMN IF NOT EXISTS unit_of_measure TEXT DEFAULT 'UN';
    //   ALTER TABLE spares ADD COLUMN IF NOT EXISTS notes TEXT;
    const payload = {
      stock_code: data.stock_code,
      description: data.description,
      category: data.category,
      machine_type: data.machine_type,
      current_quantity: data.current_quantity,
      min_quantity: data.min_quantity,
      max_quantity: data.max_quantity,
      unit_price: data.unit_price,
      unit_of_measure: data.unit_of_measure,
      priority: data.priority,
      storage_location: data.storage_location,
      supplier: data.supplier,
      safety_stock: data.safety_stock,
      notes: data.notes,
    };
    if (editingSpare) {
      await apiUpdate(editingSpare.id, payload);
      toast.success('Spare updated');
    } else {
      await apiCreate(payload);
      toast.success('Spare added');
    }
    setEditingSpare(null);
    await loadData(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this spare part? This cannot be undone.')) return;
    try { await apiDelete(id); toast.success('Deleted'); await loadData(true); }
    catch (e: any) { toast.error(e.message); }
  };

  const toggleFavorite = (id: number) =>
    setFavorites(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleExpand = (id: number) => {
    if (expandAllCards) { setExpandAllCards(false); setExpandedItems(new Set([id])); return; }
    setExpandedItems(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const isExpanded = (id: number) => expandAllCards || expandedItems.has(id);

  const handleToggleExpandAll = () => {
    if (expandAllCards) { setExpandAllCards(false); setExpandedItems(new Set()); }
    else { setExpandAllCards(true); setExpandedItems(new Set()); }
  };

  const handleSort = (field: SortConfig['field']) =>
    setSortConfig(prev => ({ field, direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc' }));

  // Requisition
  const addReqLine = (spare?: Spare) =>
    setReqLines(p => [...p, { id: uid(), spare: spare ?? null, searchValue: spare?.stock_code ?? '', qty: 1, dropdownOpen: false }]);

  const updateReqLine = (id: string, patch: Partial<ReqLine>) =>
    setReqLines(p => p.map(l => l.id === id ? { ...l, ...patch } : l));

  const removeReqLine = (id: string) =>
    setReqLines(p => p.filter(l => l.id !== id));

  const reqGrandTotal = reqLines.reduce((sum, l) => sum + (l.spare?.unit_price ?? 0) * l.qty, 0);

  const addToReq = (spare: Spare) => {
    setShowRequisition(true);
    addReqLine(spare);
    toast.success(`${spare.stock_code} added to requisition`);
  };

  const saveCurrentRequisition = async () => {
    if (!saveReqName.trim()) return;
    const localReq: SavedRequisition = {
      id: uid(),
      name: saveReqName.trim(),
      saved_at: new Date().toISOString(),
      header: reqHeader,
      lines: reqLines.filter(l => l.spare).map(l => ({
        spare_id: l.spare!.id,
        stock_code: l.spare!.stock_code,
        description: l.spare!.description,
        unit_of_measure: l.spare!.unit_of_measure,
        unit_price: l.spare!.unit_price,
        qty: l.qty,
      })),
      grand_total: reqGrandTotal,
    };
    // Optimistically update UI
    const withoutSameName = savedReqs.filter(r => r.name !== saveReqName.trim());
    const optimistic = [localReq, ...withoutSameName];
    setSavedReqs(optimistic);
    persistSavedReqs(optimistic);
    setSaveReqName('');
    setShowSavePrompt(false);
    toast.success('Requisition saved');
    // Persist to Supabase in background
    const serverReq = await apiCreateSavedReq(localReq);
    if (serverReq) {
      // Replace local temp ID with server UUID
      setSavedReqs(prev => [serverReq, ...prev.filter(r => r.id !== localReq.id && r.name !== serverReq.name)]);
      persistSavedReqs([serverReq, ...withoutSameName]);
    }
  };

  const loadSavedRequisition = (req: SavedRequisition) => {
    setReqHeader(req.header);
    setReqLines(req.lines.map(l => ({
      id: uid(),
      spare: spares.find(s => s.id === l.spare_id) ?? {
        id: l.spare_id, stock_code: l.stock_code, description: l.description,
        unit_of_measure: l.unit_of_measure || 'UN', unit_price: l.unit_price,
        current_quantity: 0, min_quantity: 0, max_quantity: 0,
        priority: 'medium' as const, safety_stock: false,
      },
      searchValue: l.stock_code,
      qty: l.qty,
      dropdownOpen: false,
    })));
    setShowSavedReqs(false);
    toast.success(`Loaded: ${req.name}`);
  };

  const deleteSavedReq = (id: string) => {
    const updated = savedReqs.filter(r => r.id !== id);
    setSavedReqs(updated);
    persistSavedReqs(updated);
    apiDeleteSavedReq(id); // fire-and-forget
  };

  const downloadRequisitionPDF = async () => {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const lines = reqLines.filter(l => l.spare);

    // ── Header banner ───────────────────────────────────────────────────────────
    doc.setFillColor(42, 77, 105);
    doc.rect(0, 0, 297, 26, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Ozech MyOffice', 12, 11);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('SPARE PARTS MANAGEMENT', 12, 17);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Parts Requisition', 285, 11, { align: 'right' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(today, 285, 17, { align: 'right' });

    // ── Requisition meta row ─────────────────────────────────────────────────────
    const urgencyLabel = reqHeader.urgency.charAt(0).toUpperCase() + reqHeader.urgency.slice(1);
    const priorityLabel = reqHeader.priority.charAt(0).toUpperCase() + reqHeader.priority.slice(1);
    doc.setFillColor(235, 242, 248);
    doc.rect(0, 26, 297, 14, 'F');
    doc.setTextColor(42, 77, 105);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    const metaY = 33;
    const metaItems: [string, string][] = [
      ['Requested By', reqHeader.requester || '—'],
      ['Required For', reqHeader.required_for || '—'],
      ['Urgency', urgencyLabel],
      ['Priority', priorityLabel],
    ];
    const colW = 70;
    metaItems.forEach(([lbl, val], i) => {
      const x = 12 + i * colW;
      doc.text(lbl + ':', x, metaY - 3);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(26, 37, 51);
      doc.text(val, x, metaY + 2);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(42, 77, 105);
    });
    if (reqHeader.reason) {
      doc.setFont('helvetica', 'bold');
      doc.text('Reason:', 12, metaY + 8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(26, 37, 51);
      doc.text(reqHeader.reason.slice(0, 120), 38, metaY + 8);
    }

    // ── Table ────────────────────────────────────────────────────────────────────
    const tableRows = lines.map((l, i) => [
      i + 1,
      l.spare!.stock_code,
      l.spare!.description,
      l.spare!.unit_of_measure || 'UN',
      l.qty,
      formatCurrency(l.spare!.unit_price),
      formatCurrency(l.spare!.unit_price * l.qty),
    ]);

    autoTable(doc, {
      startY: reqHeader.reason ? 52 : 46,
      head: [['#', 'Stock Code', 'Description', 'UoM', 'Qty', 'Unit Price', 'Line Total']],
      body: tableRows,
      foot: [['', '', '', '', '', 'Grand Total', formatCurrency(reqGrandTotal)]],
      headStyles: { fillColor: [42, 77, 105], textColor: 255, fontStyle: 'bold', fontSize: 9 },
      footStyles: { fillColor: [220, 231, 240], textColor: [42, 77, 105] as [number, number, number], fontStyle: 'bold', fontSize: 10 },
      bodyStyles: { fontSize: 9, textColor: [26, 37, 51] as [number, number, number] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' as const },
        1: { cellWidth: 34, fontStyle: 'bold' },
        2: { cellWidth: 'auto' as const },
        3: { cellWidth: 16, halign: 'center' as const },
        4: { cellWidth: 16, halign: 'right' as const },
        5: { cellWidth: 32, halign: 'right' as const },
        6: { cellWidth: 32, halign: 'right' as const },
      },
      margin: { left: 12, right: 12 },
      showFoot: 'lastPage',
    });

    // ── Page footer ───────────────────────────────────────────────────────────────
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(160, 160, 160);
      doc.text(`Generated by Ozech MyOffice · ${today}`, 12, 205);
      doc.text(`Page ${i} of ${pageCount}`, 285, 205, { align: 'right' });
    }

    doc.save(`requisition-${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success('Requisition PDF downloaded');
  };

  const copyRequisition = () => {
    const rows = reqLines
      .filter(l => l.spare)
      .map(l => `${l.spare!.stock_code}\t${l.spare!.description}\t${l.spare!.unit_of_measure || 'UN'}\t${l.qty}\t${formatCurrency(l.spare!.unit_price)}\t${formatCurrency((l.spare!.unit_price) * l.qty)}`)
      .join('\n');
    navigator.clipboard.writeText(`Stock Code\tDescription\tUoM\tQty\tUnit Price\tTotal\n${rows}\n\nGRAND TOTAL: ${formatCurrency(reqGrandTotal)}`);
    toast.success('Requisition copied to clipboard');
  };

  const SortBtn = ({ field, label }: { field: SortConfig['field']; label: string }) => {
    const active = sortConfig.field === field;
    const Icon = active ? (sortConfig.direction === 'asc' ? ChevronsUp : ChevronsDown) : SortAsc;
    return (
      <button onClick={() => handleSort(field)} className={`inline-flex items-center gap-1 text-[11px] transition-all ${active ? 'text-[#86BBD8]' : 'text-white/40 hover:text-white/70'}`}>
        {label} <Icon className="h-3 w-3" />
      </button>
    );
  };

  // ── RENDER ──────────────────────────────────────────────────────────────────

  return (
    <PageShell>
      <main className="container mx-auto px-4 py-8 space-y-4">

        {/* ─ PANEL 1: HERO ─────────────────────────────────────────────── */}
        <div className="oz-glass-dark rounded-2xl overflow-hidden">
          <div className="px-6 py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 rounded-xl bg-[#2A4D69]/50 border border-[#86BBD8]/20 flex-shrink-0">
                <Package className="h-5 w-5 text-[#86BBD8]" />
              </div>
              <div className="min-w-0">
                <nav className="flex items-center gap-1.5 text-xs text-white/40 mb-0.5">
                  <span>Home</span><ChevronRight className="h-3 w-3" /><span className="text-white/70 font-medium">Spares</span>
                </nav>
                <h1 className="text-xl font-bold text-white font-heading tracking-tight">Spare Parts Inventory</h1>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => loadData(true)} disabled={refreshing} title="Refresh"
                className="h-8 w-8 flex items-center justify-center rounded-lg bg-white/[0.07] hover:bg-white/[0.15] border border-white/12 text-white/50 transition-all disabled:opacity-40">
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <button onClick={() => setShowRequisition(v => !v)}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-white transition-all hover:-translate-y-0.5 ${showRequisition ? 'bg-[#86BBD8]/30 border-[#86BBD8]/45' : 'bg-white/[0.07] border-white/12'} border`}>
                <ShoppingCart className="h-3.5 w-3.5" /> Requisition {reqLines.length > 0 && <span className="px-1 rounded-full bg-[#86BBD8]/40 text-[10px]">{reqLines.length}</span>}
              </button>
              <button onClick={() => { setEditingSpare(null); setFormOpen(true); }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg"
                style={{ background: 'linear-gradient(135deg, #2A4D69, #1e3a52)', border: '1px solid rgba(134,187,216,0.25)' }}>
                <Plus className="h-4 w-4" /> Add Spare
              </button>
              <button title={showHeroStats ? 'Hide stats' : 'Show stats'} onClick={() => setShowHeroStats(v => !v)} className="h-8 w-8 flex items-center justify-center rounded-lg bg-white/[0.07] hover:bg-white/[0.15] border border-white/12 text-white/50 transition-all">
                {showHeroStats ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
          {showHeroStats && (
            <div className="px-6 pb-4 pt-3 border-t border-white/[0.07] grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: 'Total Items', value: stats.total, color: '#86BBD8', onClick: clearFilters },
                { label: 'Total Value', value: formatCurrency(stats.totalValue), color: '#a78bfa', onClick: undefined },
                { label: 'Out of Stock', value: stats.outOfStock, color: '#f43f5e', onClick: () => setStockFilter('out') },
                { label: 'Low Stock', value: stats.lowStock, color: '#f59e0b', onClick: () => setStockFilter('low') },
                { label: 'Categories', value: stats.categories, color: '#34d399', onClick: undefined },
                { label: 'Safety Stock', value: stats.safetyCount, color: '#60a5fa', onClick: undefined },
              ].map(s => (
                <button key={s.label} onClick={s.onClick}
                  className={`rounded-xl p-3 text-left border border-white/[0.08] bg-white/[0.05] transition-all ${s.onClick ? 'hover:bg-white/[0.10] cursor-pointer' : 'cursor-default'}`}>
                  <div className="text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-[11px] text-white/45 mt-0.5">{s.label}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ─ PANEL 2: CATEGORY BREAKDOWN ───────────────────────────────── */}
        {categoryBreakdown.length > 0 && (
          <div className="oz-glass-panel rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.07]">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-3.5 w-3.5 text-[#86BBD8]" />
                <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">Category Breakdown</span>
                <span className="text-[11px] text-white/35">{categoryBreakdown.length} categories — click to filter</span>
                {categoryFilter !== 'all' && (
                  <button onClick={() => setCategoryFilter('all')} className="text-[11px] px-1.5 py-0.5 rounded bg-[#86BBD8]/20 border border-[#86BBD8]/30 text-[#86BBD8]">{categoryFilter} ×</button>
                )}
              </div>
              <button title={showCategoryBreakdown ? 'Hide categories' : 'Show categories'} onClick={() => setShowCategoryBreakdown(v => !v)} className="h-6 w-6 flex items-center justify-center rounded-md bg-white/[0.07] hover:bg-white/[0.15] text-white/50 border border-white/12 transition-all">
                {showCategoryBreakdown ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            </div>
            {showCategoryBreakdown && (
              <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                {categoryBreakdown.map(({ cat, count, value, pct, out, low }) => {
                  const isActive = categoryFilter === cat;
                  const hasIssues = out > 0 || low > 0;
                  return (
                    <button key={cat} onClick={() => setCategoryFilter(isActive ? 'all' : cat)}
                      className={`rounded-xl p-3 text-left border transition-all duration-200 hover:-translate-y-0.5 ${isActive ? 'border-[#86BBD8]/50 bg-[#86BBD8]/15' : 'border-white/[0.08] bg-white/[0.04] hover:border-white/[0.18] hover:bg-white/[0.08]'}`}>
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-[11px] font-semibold text-white/85 leading-tight break-words">{cat}</span>
                        {hasIssues && (
                          out > 0
                            ? <AlertOctagon className="h-3 w-3 text-rose-400 flex-shrink-0 ml-1 mt-0.5" />
                            : <AlertTriangle className="h-3 w-3 text-amber-400 flex-shrink-0 ml-1 mt-0.5" />
                        )}
                      </div>
                      <div className="flex items-baseline gap-1 mb-0.5">
                        <span className="text-base font-bold text-white">{count}</span>
                        <span className="text-[10px] text-white/40">items</span>
                      </div>
                      <div className="text-[10px] text-white/40 mb-2">{formatCurrency(value)}</div>
                      <div className="h-1 rounded-full bg-white/10 overflow-hidden mb-1.5">
                        <div className="h-full rounded-full bg-[#86BBD8]/55" style={{ width: `${pct}%` }} />
                      </div>
                      {hasIssues ? (
                        <div className="flex gap-1 flex-wrap">
                          {out > 0 && <span className="text-[9px] px-1 py-0.5 rounded bg-rose-500/20 border border-rose-500/25 text-rose-400">{out} out</span>}
                          {low > 0 && <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/20 border border-amber-500/25 text-amber-400">{low} low</span>}
                        </div>
                      ) : (
                        <div className="text-[9px] text-white/25">{pct}% of stock</div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─ PANEL 3: REQUISITION BUILDER ──────────────────────────────── */}
        {showRequisition && (
          <div className="oz-glass-panel rounded-2xl overflow-hidden">
            {/* Header bar */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.07]">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-3.5 w-3.5 text-[#86BBD8]" />
                <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">Requisition / Price Builder</span>
                {reqLines.length > 0 && <span className="text-[11px] text-white/35">{reqLines.length} line{reqLines.length !== 1 ? 's' : ''} · {formatCurrency(reqGrandTotal)}</span>}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                <button onClick={() => setShowSavedReqs(v => !v)}
                  className={`inline-flex items-center gap-1 h-6 px-2 text-[11px] rounded-lg border transition-all ${showSavedReqs ? 'bg-[#86BBD8]/20 border-[#86BBD8]/35 text-[#86BBD8]' : 'bg-white/[0.07] border-white/12 text-white/60 hover:bg-white/[0.15]'}`}>
                  <ClipboardList className="h-2.5 w-2.5" /> Saved {savedReqs.length > 0 && `(${savedReqs.length})`}
                </button>
                {reqLines.length > 0 && (<>
                  {showSavePrompt ? (
                    <div className="flex items-center gap-1">
                      <input autoFocus value={saveReqName} onChange={e => setSaveReqName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveCurrentRequisition(); if (e.key === 'Escape') setShowSavePrompt(false); }}
                        placeholder="Requisition name…"
                        className="h-6 px-2 text-[11px] rounded-lg bg-white/[0.07] border border-white/20 text-white placeholder:text-white/30 focus:outline-none focus:border-[#86BBD8]/50 w-36 transition-all" />
                      <button onClick={saveCurrentRequisition} className="h-6 px-2 text-[11px] rounded-lg bg-[#2A4D69]/50 border border-[#86BBD8]/30 text-[#86BBD8] hover:bg-[#2A4D69]/70 transition-all">Save</button>
                      <button type="button" title="Cancel" onClick={() => setShowSavePrompt(false)} className="h-6 w-6 flex items-center justify-center rounded text-white/40 hover:text-white transition-all"><X className="h-3 w-3" /></button>
                    </div>
                  ) : (
                    <button onClick={() => setShowSavePrompt(true)} className="inline-flex items-center gap-1 h-6 px-2 text-[11px] rounded-lg bg-white/[0.07] hover:bg-white/[0.15] border border-white/12 text-white/60 transition-all">
                      <Database className="h-2.5 w-2.5" /> Save
                    </button>
                  )}
                  <button onClick={copyRequisition} className="inline-flex items-center gap-1 h-6 px-2 text-[11px] rounded-lg bg-white/[0.07] hover:bg-white/[0.15] border border-white/12 text-white/60 transition-all">
                    <Copy className="h-2.5 w-2.5" /> Copy
                  </button>
                  <button onClick={downloadRequisitionPDF} className="inline-flex items-center gap-1 h-6 px-2 text-[11px] rounded-lg bg-[#2A4D69]/40 hover:bg-[#2A4D69]/60 border border-[#86BBD8]/30 text-[#86BBD8] transition-all">
                    <Download className="h-2.5 w-2.5" /> PDF
                  </button>
                  <button onClick={() => { setReqLines([]); setReqHeader(defaultReqHeader); }} className="h-6 px-2 text-[11px] rounded-lg bg-white/[0.07] hover:bg-rose-500/20 border border-white/12 hover:border-rose-500/30 text-white/40 hover:text-rose-400 transition-all">
                    Clear
                  </button>
                </>)}
                <button onClick={() => addReqLine()}
                  className="inline-flex items-center gap-1 h-6 px-2 text-[11px] rounded-lg border text-white font-medium transition-all hover:-translate-y-0.5"
                  style={{ background: 'rgba(42,77,105,0.5)', borderColor: 'rgba(134,187,216,0.3)' }}>
                  <Plus className="h-2.5 w-2.5" /> Add Line
                </button>
                <button title="Close" onClick={() => setShowRequisition(false)} className="h-6 w-6 flex items-center justify-center rounded-md bg-white/[0.07] hover:bg-white/[0.15] text-white/50 border border-white/12 transition-all">
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* Saved requisitions list */}
            {showSavedReqs && (
              <div className="px-5 py-3 border-b border-white/[0.07] space-y-1.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-white/35 uppercase tracking-wide">Saved Requisitions</span>
                  <span className="text-[10px] text-white/25">{savedReqs.length} saved · synced to server</span>
                </div>
                {savedReqs.length === 0 && (
                  <div className="text-center py-4 text-white/25 text-xs">No saved requisitions yet</div>
                )}
                {savedReqs.map(req => (
                  <div key={req.id} className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.07] hover:border-white/[0.14] transition-all group">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-white/85">{req.name}</span>
                        {req.header.urgency !== 'routine' && (
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${req.header.urgency === 'emergency' ? 'bg-rose-500/25 text-rose-400' : 'bg-amber-500/25 text-amber-400'}`}>
                            {req.header.urgency}
                          </span>
                        )}
                        {req.header.priority === 'critical' && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-rose-500/15 text-rose-400/80">critical</span>
                        )}
                      </div>
                      <div className="text-[10px] text-white/30 mt-0.5 flex items-center gap-2 flex-wrap">
                        <span>{req.lines.length} item{req.lines.length !== 1 ? 's' : ''}</span>
                        <span>·</span>
                        <span className="text-white/50 font-medium">{formatCurrency(req.grand_total)}</span>
                        {req.header.requester && <><span>·</span><span>{req.header.requester}</span></>}
                        {req.header.required_for && <><span>·</span><span className="italic">{req.header.required_for}</span></>}
                        <span>·</span>
                        <span>{new Date(req.updated_at || req.saved_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-3">
                      <button onClick={() => loadSavedRequisition(req)}
                        className="h-6 px-2.5 text-[11px] rounded-lg bg-[#2A4D69]/40 border border-[#86BBD8]/25 text-[#86BBD8] hover:bg-[#2A4D69]/60 transition-all">
                        Load
                      </button>
                      <button title="Delete" onClick={() => deleteSavedReq(req.id)}
                        className="h-6 w-6 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 hover:bg-rose-500/20 text-white/25 hover:text-rose-400 transition-all">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="p-4 space-y-3">
              {/* Requisition header fields */}
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.07] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div>
                  <label className={glassLabel}>Requested By</label>
                  <EntityComboInput
                    fetchUrl="/api/employees"
                    mapOptions={data => data.map((e: any) => ({
                      label: `${e.first_name} ${e.last_name}`,
                      sub: e.employee_id ? `${e.employee_id}${e.designation ? ' · ' + e.designation : ''}` : undefined,
                    }))}
                    value={reqHeader.requester}
                    onChange={v => setReqH('requester', v)}
                    placeholder="Name or employee ID…"
                    className={glassInput}
                    memKey="req_requester"
                  />
                </div>
                <div className="lg:col-span-2">
                  <label className={glassLabel}>Reason for Order</label>
                  <MemoryInput memKey="req_reason" value={reqHeader.reason} onChange={v => setReqH('reason', v)}
                    placeholder="e.g. Scheduled maintenance, breakdown repair…" className={glassInput} />
                </div>
                <div>
                  <label className={glassLabel}>Required For</label>
                  <EntityComboInput
                    fetchUrl="/api/equipment"
                    mapOptions={data => data.map((e: any) => ({
                      label: e.name,
                      sub: [e.equipment_id, e.location].filter(Boolean).join(' · ') || undefined,
                    }))}
                    value={reqHeader.required_for}
                    onChange={v => setReqH('required_for', v)}
                    placeholder="Equipment, machine or department…"
                    className={glassInput}
                    memKey="req_required_for"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={glassLabel}>Urgency</label>
                    <select value={reqHeader.urgency} onChange={e => setReqH('urgency', e.target.value as ReqHeader['urgency'])}
                      className={glassInput + ' appearance-none cursor-pointer'} style={{ colorScheme: 'dark' }}>
                      <option value="routine" className="bg-[#050f1c]">Routine</option>
                      <option value="urgent" className="bg-[#050f1c]">Urgent</option>
                      <option value="emergency" className="bg-[#050f1c]">Emergency</option>
                    </select>
                  </div>
                  <div>
                    <label className={glassLabel}>Priority</label>
                    <select value={reqHeader.priority} onChange={e => setReqH('priority', e.target.value as ReqHeader['priority'])}
                      className={glassInput + ' appearance-none cursor-pointer'} style={{ colorScheme: 'dark' }}>
                      {(['critical', 'high', 'medium', 'low'] as const).map(p => (
                        <option key={p} value={p} className="bg-[#050f1c] capitalize">{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Line items */}
              {reqLines.length === 0 ? (
                <div className="text-center py-6 text-white/30 text-sm">
                  Click <strong className="text-white/50">+ Add Line</strong> or <strong className="text-white/50">Add to Req</strong> on any spare card to build a price list.
                </div>
              ) : (<>
                <div className="grid text-[10px] font-semibold text-white/35 uppercase tracking-wider px-2 pb-1"
                  style={{ gridTemplateColumns: '180px 1fr 48px 96px 80px 90px 28px' }}>
                  <div>Stock Code</div><div>Description</div><div className="text-center">UoM</div>
                  <div className="text-center">Qty</div><div className="text-right">Unit Price</div>
                  <div className="text-right">Total</div><div />
                </div>
                {reqLines.map(line => (
                  <RequisitionLineRow key={line.id} line={line} allSpares={spares} onUpdate={updateReqLine} onRemove={removeReqLine} />
                ))}
                <div className="grid items-center pt-2 border-t border-white/[0.08] mt-2" style={{ gridTemplateColumns: '180px 1fr 48px 96px 80px 90px 28px' }}>
                  <div className="col-span-5 text-right pr-1 text-xs font-semibold text-white/55 uppercase tracking-wider">Grand Total</div>
                  <div className="text-right pr-1 text-base font-bold text-white">{formatCurrency(reqGrandTotal)}</div>
                  <div />
                </div>
              </>)}
            </div>
          </div>
        )}

        {/* ─ PANEL 4: FILTERS ──────────────────────────────────────────── */}
        <div className="oz-glass-panel rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.07]">
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-[#86BBD8]" />
              <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">Filters</span>
              {activeFilterCount > 0 && (
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-[#86BBD8]/20 border border-[#86BBD8]/30 text-[#86BBD8]">{activeFilterCount} active</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {activeFilterCount > 0 && (
                <button onClick={clearFilters} className="h-6 px-2 flex items-center gap-1 rounded-md bg-white/[0.07] hover:bg-white/[0.15] text-white/50 text-[11px] border border-white/12 transition-all">
                  <X className="h-2.5 w-2.5" /> Clear
                </button>
              )}
              <button title={filterPanelMinimized ? 'Expand filters' : 'Collapse filters'} onClick={() => setFilterPanelMinimized(v => !v)} className="h-6 w-6 flex items-center justify-center rounded-md bg-white/[0.07] hover:bg-white/[0.15] text-white/50 border border-white/12 transition-all">
                {filterPanelMinimized ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
              </button>
            </div>
          </div>
          {!filterPanelMinimized && (
            <div className="px-5 pb-4 pt-3 space-y-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
                <input type="text" placeholder="Search stock code, description, category, supplier…" value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8 pr-3 py-2 w-full text-sm rounded-lg bg-white/[0.07] border border-white/12 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 focus:bg-white/[0.11] transition-all" />
              </div>

              {/* Stock status */}
              <div>
                <div className="text-[11px] text-white/45 mb-1.5">Stock Status</div>
                <div className="flex flex-wrap gap-1.5">
                  {[['all', 'All'], ['out', 'Out of Stock'], ['low', 'Low Stock'], ['adequate', 'Adequate'], ['in', 'In Stock']].map(([v, l]) => (
                    <button key={v} onClick={() => setStockFilter(v)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${stockFilter === v ? 'bg-[#86BBD8]/30 border-[#86BBD8]/45 text-white font-semibold' : 'bg-white/[0.05] border-white/12 text-white/60 hover:bg-white/[0.12] hover:text-white/90'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority */}
              <div>
                <div className="text-[11px] text-white/45 mb-1.5">Priority</div>
                <div className="flex flex-wrap gap-1.5">
                  {[['all', 'All'], ['critical', 'Critical'], ['high', 'High'], ['medium', 'Medium'], ['low', 'Low']].map(([v, l]) => (
                    <button key={v} onClick={() => setPriorityFilter(v)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${priorityFilter === v ? 'bg-[#86BBD8]/30 border-[#86BBD8]/45 text-white font-semibold' : 'bg-white/[0.05] border-white/12 text-white/60 hover:bg-white/[0.12] hover:text-white/90'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bottom row: sort + favorites */}
              <div className="flex flex-wrap items-center gap-4 pt-1">
                <div className="flex items-center gap-2 text-[11px] text-white/45">
                  <span className="font-semibold uppercase tracking-wider">Sort:</span>
                  <SortBtn field="stock_code" label="Code" />
                  <SortBtn field="description" label="Description" />
                  <SortBtn field="unit_price" label="Price" />
                  <SortBtn field="current_quantity" label="Stock" />
                  <SortBtn field="priority" label="Priority" />
                  <SortBtn field="category" label="Category" />
                </div>
                <button onClick={() => setShowFavOnly(v => !v)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition-all ${showFavOnly ? 'bg-amber-400/20 border-amber-400/35 text-amber-300' : 'bg-white/[0.05] border-white/12 text-white/50 hover:bg-white/[0.12]'}`}>
                  <Star className={`h-3 w-3 ${showFavOnly ? 'fill-amber-400 text-amber-400' : ''}`} /> Favorites{favorites.size > 0 && ` (${favorites.size})`}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ─ PANEL 5: RECORDS ──────────────────────────────────────────── */}
        <div className="oz-glass-panel rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.07]">
            <div className="flex items-center gap-2 flex-shrink-0">
              <Package className="h-3.5 w-3.5 text-[#86BBD8]" />
              <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">Records</span>
              <span className="text-[11px] text-white/35">{filteredSpares.length} of {spares.length}</span>
            </div>
            <div className="flex-1 relative min-w-0 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-white/30 pointer-events-none" />
              <input
                type="text"
                placeholder="Search spares…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-7 pr-3 h-7 w-full text-xs rounded-lg bg-white/[0.07] border border-white/[0.12] text-white placeholder:text-white/30 focus:outline-none focus:border-[#86BBD8]/40 focus:bg-white/[0.11] transition-all"
              />
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0 ml-auto">
              {viewMode === 'grid' && (
                <button onClick={handleToggleExpandAll} title={expandAllCards ? 'Collapse all' : 'Expand all'}
                  className="h-7 px-2 inline-flex items-center gap-1 text-[11px] rounded-lg bg-white/[0.07] hover:bg-white/[0.15] border border-white/12 text-white/50 transition-all">
                  {expandAllCards ? <ChevronsUp className="h-3 w-3" /> : <ChevronsDown className="h-3 w-3" />}
                  {expandAllCards ? 'Collapse' : 'Expand'}
                </button>
              )}
              <div className="flex rounded-lg border border-white/12 overflow-hidden">
                <button onClick={() => setViewMode('grid')} className={`h-7 w-7 flex items-center justify-center transition-all ${viewMode === 'grid' ? 'bg-[#86BBD8]/30 text-white' : 'bg-white/[0.05] text-white/50 hover:bg-white/[0.12]'}`}>
                  <Grid3x3 className="h-3 w-3" />
                </button>
                <button onClick={() => setViewMode('table')} className={`h-7 w-7 flex items-center justify-center border-l border-white/12 transition-all ${viewMode === 'table' ? 'bg-[#86BBD8]/30 text-white' : 'bg-white/[0.05] text-white/50 hover:bg-white/[0.12]'}`}>
                  <List className="h-3 w-3" />
                </button>
              </div>
              <button title={recordsPanelMinimized ? 'Expand records' : 'Collapse records'} onClick={() => setRecordsPanelMinimized(v => !v)} className="h-6 w-6 flex items-center justify-center rounded-md bg-white/[0.07] hover:bg-white/[0.15] text-white/50 border border-white/12 transition-all">
                {recordsPanelMinimized ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
              </button>
            </div>
          </div>

          {!recordsPanelMinimized && (
            <div className="p-4">
              {loading ? (
                <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-white/30" /></div>
              ) : filteredSpares.length === 0 ? (
                <div className="text-center py-16">
                  <Package className="h-12 w-12 mx-auto text-white/15 mb-4" />
                  <div className="text-white/50 text-base font-medium mb-2">No spare parts found</div>
                  <div className="text-white/30 text-sm mb-6">
                    {spares.length === 0 ? 'Add your first spare part or run the seed script to import the stock list.' : 'Try adjusting your filters.'}
                  </div>
                  {activeFilterCount > 0 ? (
                    <button onClick={clearFilters} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-white/70 hover:text-white bg-white/[0.07] border border-white/12 transition-all">
                      <X className="h-4 w-4" /> Clear Filters
                    </button>
                  ) : (
                    <button onClick={() => setFormOpen(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all" style={{ background: 'rgba(42,77,105,0.6)', border: '1px solid rgba(134,187,216,0.25)' }}>
                      <Plus className="h-4 w-4" /> Add Spare Part
                    </button>
                  )}
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {paginatedSpares.map(spare => (
                    <SpareCard key={spare.id} spare={spare}
                      isFavorite={favorites.has(spare.id)} isExpanded={isExpanded(spare.id)}
                      onEdit={s => { setEditingSpare(s); setFormOpen(true); }}
                      onDelete={handleDelete} onFavorite={toggleFavorite}
                      onAddToReq={addToReq} onToggleExpand={() => toggleExpand(spare.id)} />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl overflow-hidden border border-white/[0.07]">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/[0.07] hover:bg-transparent">
                        {[['Stock Code', 'stock_code'], ['Description', 'description'], ['Category', 'category'], ['Machine', 'machine_type'], ['Stock', 'current_quantity'], ['Unit Price', 'unit_price'], ['Value', null], ['Status', 'status'], ['Priority', 'priority']].map(([label, field]) => (
                          <TableHead key={label as string}
                            className={`text-white/55 bg-white/[0.05] ${field ? 'cursor-pointer hover:text-white/80' : ''}`}
                            onClick={() => field && handleSort(field as SortConfig['field'])}>
                            <div className="flex items-center gap-1">
                              {label as string}
                              {field && sortConfig.field === field && (sortConfig.direction === 'asc' ? <ChevronsUp className="h-3 w-3 text-[#86BBD8]" /> : <ChevronsDown className="h-3 w-3 text-[#86BBD8]" />)}
                            </div>
                          </TableHead>
                        ))}
                        <TableHead className="text-white/55 bg-white/[0.05] w-8"></TableHead>
                        <TableHead className="text-white/55 bg-white/[0.05] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedSpares.map(spare => {
                        const st = getStockStatus(spare.current_quantity, spare.min_quantity);
                        const pc2 = PRIORITY_COLOR[spare.priority] || '#86BBD8';
                        const rowExpanded = expandedTableRows.has(spare.id);
                        const invVal = spare.current_quantity * spare.unit_price;
                        const toggleTableRow = () => setExpandedTableRows(prev => {
                          const n = new Set(prev); n.has(spare.id) ? n.delete(spare.id) : n.add(spare.id); return n;
                        });
                        return (
                          <React.Fragment key={spare.id}>
                            <TableRow
                              className={`border-white/[0.06] cursor-pointer transition-colors ${rowExpanded ? 'bg-white/[0.07]' : 'hover:bg-white/[0.04]'}`}
                              onClick={toggleTableRow}>
                              <TableCell className="font-mono font-semibold text-white text-xs">{spare.stock_code}</TableCell>
                              <TableCell className="text-white/75 text-xs max-w-[220px]"><div className="truncate">{spare.description}</div></TableCell>
                              <TableCell><span className="text-[11px] px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/10 text-white/55">{spare.category || '—'}</span></TableCell>
                              <TableCell className="text-white/55 text-xs">{spare.machine_type || '—'}</TableCell>
                              <TableCell>
                                <div className="text-xs text-white/75">{spare.current_quantity}/{spare.max_quantity}</div>
                                <div className="h-1 w-16 rounded-full bg-white/10 mt-1 overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, (spare.current_quantity / (spare.max_quantity || 1)) * 100)}%`, backgroundColor: st.color, opacity: 0.65 }} />
                                </div>
                              </TableCell>
                              <TableCell className="text-white/75 text-xs">{formatCurrency(spare.unit_price)}</TableCell>
                              <TableCell className="text-white/55 text-xs">{formatCurrency(invVal)}</TableCell>
                              <TableCell><span className="text-[11px] px-1.5 py-0.5 rounded border font-medium" style={{ background: `${st.color}1a`, borderColor: `${st.color}40`, color: st.color }}>{st.label}</span></TableCell>
                              <TableCell><span className="text-[11px] px-1.5 py-0.5 rounded border font-medium capitalize" style={{ background: `${pc2}1a`, borderColor: `${pc2}40`, color: pc2 }}>{spare.priority}</span></TableCell>
                              <TableCell onClick={e => e.stopPropagation()}>
                                <button title={rowExpanded ? 'Collapse' : 'Expand'} onClick={toggleTableRow} className="h-6 w-6 flex items-center justify-center rounded text-white/30 hover:text-white/70 transition-all">
                                  {rowExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                </button>
                              </TableCell>
                              <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-1">
                                  <button title="Add to requisition" className="h-7 w-7 inline-flex items-center justify-center rounded-lg bg-white/[0.06] hover:bg-[#86BBD8]/20 text-white/40 hover:text-[#86BBD8] transition-all" onClick={() => addToReq(spare)}>
                                    <ShoppingCart className="h-3.5 w-3.5" />
                                  </button>
                                  <button title="Edit" className="h-7 w-7 inline-flex items-center justify-center rounded-lg bg-white/[0.06] hover:bg-white/[0.15] text-white/40 transition-all" onClick={() => { setEditingSpare(spare); setFormOpen(true); }}>
                                    <Edit className="h-3.5 w-3.5" />
                                  </button>
                                  <button title="Delete" className="h-7 w-7 inline-flex items-center justify-center rounded-lg bg-white/[0.06] hover:bg-rose-500/20 text-white/40 hover:text-rose-400 transition-all" onClick={() => handleDelete(spare.id)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </TableCell>
                            </TableRow>
                            {rowExpanded && (
                              <TableRow className="border-white/[0.04]">
                                <TableCell colSpan={11} className="py-3 px-6">
                                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
                                    <div>
                                      <div className="text-[10px] text-white/30 uppercase tracking-wide mb-0.5">Full Description</div>
                                      <div className="text-white/70 leading-relaxed">{spare.description}</div>
                                    </div>
                                    <div>
                                      <div className="text-[10px] text-white/30 uppercase tracking-wide mb-0.5">Stock Levels</div>
                                      <div className="text-white/65">Current: <span className="text-white font-semibold">{spare.current_quantity}</span> · Min: {spare.min_quantity} · Max: {spare.max_quantity}</div>
                                    </div>
                                    <div>
                                      <div className="text-[10px] text-white/30 uppercase tracking-wide mb-0.5">Pricing</div>
                                      <div className="text-white/65">Unit: <span className="text-white font-semibold">{formatCurrency(spare.unit_price)}</span> · Inv: {formatCurrency(invVal)}</div>
                                    </div>
                                    <div>
                                      <div className="text-[10px] text-white/30 uppercase tracking-wide mb-0.5">Unit of Measure</div>
                                      <div className="text-white/70">{spare.unit_of_measure || 'UN'} {spare.safety_stock && <span className="ml-1 text-[#86BBD8]">· Safety Stock</span>}</div>
                                    </div>
                                    {spare.supplier && <div>
                                      <div className="text-[10px] text-white/30 uppercase tracking-wide mb-0.5">Supplier</div>
                                      <div className="text-white/70">{spare.supplier}</div>
                                    </div>}
                                    {spare.storage_location && <div>
                                      <div className="text-[10px] text-white/30 uppercase tracking-wide mb-0.5">Storage Location</div>
                                      <div className="text-white/70">{spare.storage_location}</div>
                                    </div>}
                                    {spare.last_ordered_date && <div>
                                      <div className="text-[10px] text-white/30 uppercase tracking-wide mb-0.5">Last Ordered</div>
                                      <div className="text-white/70">{formatDate(spare.last_ordered_date)}</div>
                                    </div>}
                                    {spare.notes && <div className="col-span-2">
                                      <div className="text-[10px] text-white/30 uppercase tracking-wide mb-0.5">Notes</div>
                                      <div className="text-white/55 leading-relaxed">{spare.notes}</div>
                                    </div>}
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-5 pt-4 border-t border-white/[0.07]">
                  <span className="text-[11px] text-white/35">
                    Showing {(safeCurrentPage - 1) * PAGE_SIZE + 1}–{Math.min(safeCurrentPage * PAGE_SIZE, filteredSpares.length)} of {filteredSpares.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage(1)} disabled={safeCurrentPage === 1}
                      className="h-7 w-7 flex items-center justify-center rounded-lg bg-white/[0.05] border border-white/10 text-white/40 hover:bg-white/[0.12] hover:text-white disabled:opacity-25 disabled:cursor-not-allowed transition-all text-xs font-bold">
                      «
                    </button>
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safeCurrentPage === 1}
                      className="h-7 w-7 flex items-center justify-center rounded-lg bg-white/[0.05] border border-white/10 text-white/40 hover:bg-white/[0.12] hover:text-white disabled:opacity-25 disabled:cursor-not-allowed transition-all">
                      <ChevronDown className="h-3.5 w-3.5 rotate-90" />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPages || Math.abs(p - safeCurrentPage) <= 2)
                      .reduce<(number | '…')[]>((acc, p, i, arr) => {
                        if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('…');
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((p, i) =>
                        p === '…'
                          ? <span key={`ellipsis-${i}`} className="h-7 w-6 flex items-center justify-center text-white/25 text-xs">…</span>
                          : <button key={p}
                              onClick={() => setCurrentPage(p as number)}
                              className={`h-7 min-w-[28px] px-1.5 flex items-center justify-center rounded-lg border text-xs font-medium transition-all ${safeCurrentPage === p ? 'bg-[#86BBD8]/30 border-[#86BBD8]/45 text-white' : 'bg-white/[0.05] border-white/10 text-white/45 hover:bg-white/[0.12] hover:text-white'}`}>
                              {p}
                            </button>
                      )
                    }
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safeCurrentPage === totalPages}
                      className="h-7 w-7 flex items-center justify-center rounded-lg bg-white/[0.05] border border-white/10 text-white/40 hover:bg-white/[0.12] hover:text-white disabled:opacity-25 disabled:cursor-not-allowed transition-all">
                      <ChevronDown className="h-3.5 w-3.5 -rotate-90" />
                    </button>
                    <button
                      onClick={() => setCurrentPage(totalPages)} disabled={safeCurrentPage === totalPages}
                      className="h-7 w-7 flex items-center justify-center rounded-lg bg-white/[0.05] border border-white/10 text-white/40 hover:bg-white/[0.12] hover:text-white disabled:opacity-25 disabled:cursor-not-allowed transition-all text-xs font-bold">
                      »
                    </button>
                  </div>
                  <span className="text-[11px] text-white/35">Page {safeCurrentPage} of {totalPages}</span>
                </div>
              )}
            </div>
          )}
        </div>

      </main>

      {/* Form Dialog */}
      <SpareFormDialog open={formOpen} onClose={() => { setFormOpen(false); setEditingSpare(null); }}
        onSave={handleSave} editData={editingSpare} categories={categories} />

    </PageShell>
  );
}
