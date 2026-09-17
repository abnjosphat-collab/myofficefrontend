'use client';

import { Clock4 } from '@/components/shared/theme';
import {
  FormField, SelectField, TYPE_WEIGHT, accentText, useTheme,
} from '@/components/shared/design-system';
import {
  CUSTOM_SHIFT_PRESET_ID,
  findShiftTimePresetId,
  type ShiftTimePreset,
  FREQUENT_SHIFT_TIME_PRESETS,
} from '@/lib/shiftTimePresets';

export type ShiftTimeRangeFieldProps = {
  start: string;
  end: string;
  onChange: (start: string, end: string) => void;
  presets?: ShiftTimePreset[];
  disabled?: boolean;
  inputClassName?: string;
  /** Optional third column (e.g. computed duration in overtime form). */
  trailing?: React.ReactNode;
  startLabel?: string;
  endLabel?: string;
};

export function ShiftTimeRangeField({
  start,
  end,
  onChange,
  presets = FREQUENT_SHIFT_TIME_PRESETS,
  disabled = false,
  inputClassName,
  trailing,
  startLabel = 'Start',
  endLabel = 'End',
}: ShiftTimeRangeFieldProps) {
  const t = useTheme();
  const inputCls = inputClassName ?? `w-full h-9 rounded-lg px-3 text-sm outline-none transition-colors ${t.inputBg}`;
  const activePresetId = findShiftTimePresetId(start, end, presets);
  const selectValue = activePresetId ?? CUSTOM_SHIFT_PRESET_ID;

  const applyPreset = (id: string) => {
    const p = presets.find(x => x.id === id);
    if (p) onChange(p.start, p.end);
  };

  const chipCls = (active: boolean) =>
    `text-[11px] px-2.5 py-1.5 rounded-lg transition-colors ${TYPE_WEIGHT.medium} ${
      active
        ? 'bg-brand-500/25 text-brand-400 ring-1 ring-brand-400/30'
        : `${t.chipBg} ${t.textFaint} ${t.hoverBg} hover:text-brand-300`
    }`;

  return (
    <div className="space-y-2">
      {!disabled && presets.length > 0 && (
        <>
          <FormField label="Quick shift">
            <SelectField
              size="form"
              title="Pick a common shift time"
              value={selectValue}
              onChange={v => {
                if (v !== CUSTOM_SHIFT_PRESET_ID) applyPreset(v);
              }}
              options={[
                { value: CUSTOM_SHIFT_PRESET_ID, label: 'Custom times…' },
                ...presets.map(p => ({ value: p.id, label: p.description })),
              ]}
            />
          </FormField>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Quick shift times">
            {presets.map(p => (
              <button
                key={p.id}
                type="button"
                title={p.description}
                onClick={() => applyPreset(p.id)}
                className={chipCls(activePresetId === p.id)}
              >
                <Clock4 className="w-3 h-3 inline -mt-0.5 mr-1 opacity-70" aria-hidden />
                {p.label}
              </button>
            ))}
          </div>
        </>
      )}
      <div className={`grid gap-3 ${trailing ? 'grid-cols-3' : 'grid-cols-2'}`}>
        <FormField label={startLabel} required={!disabled}>
          <input
            aria-label={startLabel}
            type="time"
            disabled={disabled}
            className={inputCls}
            value={start}
            onChange={e => onChange(e.target.value, end)}
          />
        </FormField>
        <FormField label={endLabel} required={!disabled}>
          <input
            aria-label={endLabel}
            type="time"
            disabled={disabled}
            className={inputCls}
            value={end}
            onChange={e => onChange(start, e.target.value)}
          />
        </FormField>
        {trailing}
      </div>
      {!disabled && activePresetId && (
        <p className={`text-[11px] ${t.textFaint}`}>
          <span className={accentText('brand', t.light)}>Preset applied</span>
          {' — adjust start/end below if needed.'}
        </p>
      )}
    </div>
  );
}
