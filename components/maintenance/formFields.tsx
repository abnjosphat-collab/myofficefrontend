'use client';
// frontend/components/maintenance/formFields.tsx — themed field primitives and
// autocomplete pickers shared by the work-order/schedule modals.
import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  useTheme, FormField, Combobox, type ComboOption, StatusBadge,
} from "@/components/shared/theme";
import { useEquipment, useSpares } from "@/hooks/useLookups";
import type { EquipmentItem, SpareRegisterItem } from "../../app/maintenance/types";
export { PersonAutocomplete } from "@/components/shared/EmployeeAutocomplete";

export function ThemedInput({ id, label, value, onChange, placeholder, type = 'text', readOnly, autoComplete }: {
  id: string; label: string; value: string; onChange?: (v: string) => void;
  placeholder?: string; type?: string; readOnly?: boolean; autoComplete?: string;
}) {
  const t = useTheme();
  return (
    <FormField label={label}>
      <Input id={id} type={type} value={value} readOnly={readOnly} onChange={e => onChange?.(e.target.value)}
        placeholder={placeholder} autoComplete={autoComplete}
        className={`h-8 text-sm ${t.inputBg} ${readOnly ? 'opacity-60 cursor-default' : ''}`} />
    </FormField>
  );
}

export function NAToggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex items-center gap-1.5 ml-auto">
      <span className={`text-xs transition-colors ${checked ? 'text-orange-400' : 'opacity-40'}`}>{label}</span>
      <div className={`w-8 h-4 rounded-full transition-colors relative ${checked ? 'bg-orange-500/50' : 'bg-white/20'}`}>
        <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </div>
    </button>
  );
}

// ==================== PREDICTION ====================
const MAINT_VOCAB: string[] = [
  'adjusted', 'bearing', 'bearings', 'belt', 'belts', 'broken', 'calibrated', 'checked', 'cleaned',
  'compressor', 'conveyor', 'corrective', 'coupling', 'cracked', 'damaged', 'drained', 'electrical',
  'filter', 'flushed', 'gasket', 'gaskets', 'gearbox', 'greased', 'hydraulic', 'inspected', 'installed',
  'lubricated', 'maintenance', 'mechanical', 'motor', 'overhauled', 'pneumatic', 'preventive', 'pump',
  'realigned', 'rectified', 'refitted', 'removed', 'repaired', 'replaced', 'seal', 'seals', 'serviced',
  'shaft', 'tightened', 'tested', 'valve', 'vibration', 'welded',
  'preventive maintenance completed', 'corrective maintenance done', 'no further action required',
  'machine running normally', 'awaiting spare parts', 'spare parts ordered', 'bearing worn out',
  'belt worn out', 'belt slipping', 'oil level low', 'oil leak detected', 'oil changed',
  'found and rectified', 'found fault in', 'maintenance complete', 'works normally after repair',
  'safety hazard identified', 'lockout tagout applied',
];
function getPrediction(text: string): string {
  if (!text) return '';
  if (text.endsWith(' ') || text.endsWith('\n')) {
    const trimmed = text.trimEnd().toLowerCase();
    const phrase = MAINT_VOCAB.filter(v => v.includes(' ')).find(v => v.toLowerCase().startsWith(trimmed + ' '));
    return phrase ? phrase.slice(trimmed.length + 1) : '';
  }
  const last = text.split(/[\s\n]+/).pop() || '';
  if (last.length < 2) return '';
  const lower = last.toLowerCase();
  const match = MAINT_VOCAB.find(v => v.toLowerCase().startsWith(lower) && v.toLowerCase() !== lower);
  return match ? match.slice(last.length) : '';
}

export function PredictiveArea({ id, label, value, onChange, placeholder, rows = 3, autoComplete }: {
  id: string; label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; autoComplete?: string;
}) {
  const t = useTheme();
  const [ghost, setGhost] = useState('');
  const accept = () => { if (!ghost) return; onChange(value + ghost + ' '); setGhost(''); };
  return (
    <FormField label={label}>
      <Textarea id={id} value={value} rows={rows} autoComplete={autoComplete} placeholder={placeholder}
        className={`h-auto resize-none text-sm ${t.inputBg}`}
        onChange={e => { onChange(e.target.value); setGhost(getPrediction(e.target.value)); }}
        onKeyDown={e => { if (e.key === 'Tab' && ghost) { e.preventDefault(); accept(); } else if (e.key === 'Escape') setGhost(''); }}
        onBlur={() => setGhost('')} />
      {ghost && (
        <div className="flex items-center gap-2 px-0.5 mt-1">
          <kbd className={`text-[9px] rounded px-1 py-px font-mono leading-none ${t.chipBg} ${t.textFaint}`}>Tab</kbd>
          <button type="button" onClick={accept} className="text-[11px] text-brand-400 bg-brand-500/[0.08] hover:bg-brand-500/[0.16] px-2 py-0.5 rounded transition-colors max-w-[240px] truncate">{ghost.trim()}</button>
          <span className={`text-[10px] hidden sm:inline ${t.textFaint}`}>or click to accept</span>
        </div>
      )}
    </FormField>
  );
}

// PersonAutocomplete now lives in components/shared/EmployeeAutocomplete.tsx —
// re-exported above so existing imports from "./formFields" keep working.
// EquipmentAutocomplete and SpareAutocomplete (below) still sit on the same
// shared Combobox primitive, just filtering different data sources.

export function EquipmentAutocomplete({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const t = useTheme();
  const equipment = useEquipment();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // This field holds a comma-separated list — one work order per machine — so
  // it filters on the fragment after the last comma and replaces only that
  // fragment on select, rather than the whole value.
  const fragment = value.split(',').pop()?.trimStart() ?? '';
  const q = fragment.toLowerCase();
  const matches = q.length === 0 ? equipment.slice(0, 8) : equipment.filter(e =>
    (e.name || '').toLowerCase().includes(q) || (e.equipment_id || '').toLowerCase().includes(q) ||
    (e.department || '').toLowerCase().includes(q) || (e.location || '').toLowerCase().includes(q)
  ).slice(0, 8);

  const byValue = new Map(matches.map(e => [String(e.id), e]));
  const options: ComboOption[] = matches.map(e => ({
    value: String(e.id),
    label: e.name || e.equipment_id || '',
    sub: [e.equipment_id, e.department, e.location].filter(Boolean).join(' · '),
  }));

  const pick = (eq: EquipmentItem) => {
    const parts = value.split(',').map(s => s.trim()).filter(Boolean);
    parts.splice(parts.length > 0 && !value.endsWith(',') ? parts.length - 1 : parts.length, 1, eq.name || eq.equipment_id || '');
    onChange(parts.join(', '));
  };

  return (
    <div className="space-y-1.5">
      <Combobox
        value={value}
        onChange={onChange}
        onSelect={opt => { const eq = byValue.get(opt.value); if (eq) pick(eq); }}
        options={options}
        placeholder="Type machine name — comma-separate for multiple…"
        renderOption={opt => {
          const eq = byValue.get(opt.value);
          return (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex-1 min-w-0">
                <div className={`text-xs font-medium truncate ${t.textPrimary}`}>{opt.label}</div>
                <div className={`text-[10px] truncate ${t.textFaint}`}>{opt.sub}</div>
              </div>
              <StatusBadge color={eq?.status === 'operational' ? '#4ade80' : '#fb923c'} label={eq?.status || 'unknown'} />
            </div>
          );
        }}
      />
      {value.includes(',') && <p className="text-[10px] text-brand-400/70 px-0.5">{value.split(',').filter(s => s.trim()).length} machines — will create one work order each</p>}
    </div>
  );
}

export function SpareAutocomplete({ value, onChange, onSelect, placeholder }: { value: string; onChange: (v: string) => void; onSelect: (item: SpareRegisterItem) => void; placeholder?: string; }) {
  const t = useTheme();
  const spares = useSpares();

  const q = value.toLowerCase();
  const matches = q.length === 0 ? spares.slice(0, 8) : spares.filter(s =>
    (s.description || '').toLowerCase().includes(q) || (s.stock_code || '').toLowerCase().includes(q) || (s.category || '').toLowerCase().includes(q)
  ).slice(0, 8);

  const byValue = new Map(matches.map(s => [String(s.id), s]));
  const options: ComboOption[] = matches.map(s => ({
    value: String(s.id),
    label: s.description || '',
    sub: [s.stock_code, s.category, s.unit_of_measure, s.current_quantity !== undefined ? `Stock: ${s.current_quantity}` : '']
      .filter(Boolean).join(' · '),
  }));

  return (
    <Combobox
      value={value}
      onChange={onChange}
      onSelect={opt => { const s = byValue.get(opt.value); if (s) onSelect(s); }}
      options={options}
      loading={spares.length === 0}
      emptyText="No matches — value will be saved as typed"
      placeholder={placeholder || 'Search spares register or type manually…'}
      renderOption={opt => {
        const s = byValue.get(opt.value);
        return (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex-1 min-w-0">
              <div className={`text-xs font-medium truncate ${t.textPrimary}`}>{opt.label}</div>
              <div className={`text-[10px] truncate ${t.textFaint}`}>{opt.sub}</div>
            </div>
            <span className="text-amber-400 text-xs font-mono flex-shrink-0">R {(s?.unit_price || 0).toFixed(2)}</span>
          </div>
        );
      }}
    />
  );
}
