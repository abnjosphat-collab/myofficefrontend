'use client';
// components/shared/SpareAutocomplete.tsx — pick a spare from the Spares register via
// the shared Combobox primitive, autofilling its details on select; typing without a
// match just saves as free text. Promoted from components/maintenance/formFields.tsx
// (its one prior consumer, WorkOrderDetailModal, still gets it via the re-export left
// there) since app/overtime/page.tsx's new "Spares Used" field needs the exact same
// pick-or-type-manually behavior — same "define once, reuse everywhere" move already
// made for EmployeeAutocomplete.
import { useTheme, Combobox, type ComboOption } from '@/components/shared/theme';
import { useSpares } from '@/hooks/useLookups';
import type { SpareLookup } from '@/hooks/useLookups';

export function SpareAutocomplete({ value, onChange, onSelect, placeholder }: {
  value: string; onChange: (v: string) => void; onSelect: (item: SpareLookup) => void; placeholder?: string;
}) {
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
