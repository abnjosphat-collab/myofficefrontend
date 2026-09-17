'use client';

import { useState } from 'react';
import { Clock4, Plus } from '@/components/shared/theme';
import {
  FormField, SelectField, PrimaryButton, TYPE_WEIGHT, accentText, useTheme,
} from '@/components/shared/design-system';
import {
  CUSTOM_SHIFT_PRESET_ID,
  findShiftTimePresetId,
  normalizeClockTime,
  type ShiftTimePreset,
  FREQUENT_SHIFT_TIME_PRESETS,
} from '@/lib/shiftTimePresets';
import {
  SAVE_CURRENT_SHIFT_PRESET_ID,
  formatCompactShiftLabel,
} from '@/lib/shiftTimePresetsPersonal';
import { useEffectiveShiftPresets } from '@/lib/useEffectiveShiftPresets';

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
  presets: builtinPresets = FREQUENT_SHIFT_TIME_PRESETS,
  disabled = false,
  inputClassName,
  trailing,
  startLabel = 'Start',
  endLabel = 'End',
}: ShiftTimeRangeFieldProps) {
  const t = useTheme();
  const { presets, recordUsage, addCustom } = useEffectiveShiftPresets(builtinPresets);
  const [showSaveCustom, setShowSaveCustom] = useState(false);
  const [customLabel, setCustomLabel] = useState('');

  const inputCls = inputClassName ?? `w-full h-9 rounded-lg px-3 text-sm outline-none transition-colors ${t.inputBg}`;
  const activePresetId = findShiftTimePresetId(start, end, presets);
  const selectValue = activePresetId ?? CUSTOM_SHIFT_PRESET_ID;

  const applyPreset = (id: string) => {
    const p = presets.find(x => x.id === id);
    if (!p) return;
    onChange(p.start, p.end);
  };

  const chipCls = (active: boolean) =>
    `text-[11px] px-2.5 py-1.5 rounded-lg transition-colors ${TYPE_WEIGHT.medium} ${
      active
        ? 'bg-brand-500/25 text-brand-400 ring-1 ring-brand-400/30'
        : `${t.chipBg} ${t.textFaint} ${t.hoverBg} hover:text-brand-300`
    }`;

  const canSaveCurrent = !!normalizeClockTime(start) && !!normalizeClockTime(end);

  const handleSaveCurrentAsQuickShift = () => {
    if (!canSaveCurrent) return;
    addCustom(start, end, customLabel.trim() || formatCompactShiftLabel(start, end));
    recordUsage(start, end);
    setShowSaveCustom(false);
    setCustomLabel('');
  };

  return (
    <div className="space-y-2">
      {!disabled && (
        <>
          <FormField label="Quick shift">
            <SelectField
              size="form"
              title="Pick a common shift time"
              value={showSaveCustom ? SAVE_CURRENT_SHIFT_PRESET_ID : selectValue}
              onChange={v => {
                if (v === SAVE_CURRENT_SHIFT_PRESET_ID) {
                  setShowSaveCustom(true);
                  setCustomLabel(formatCompactShiftLabel(start, end));
                  return;
                }
                setShowSaveCustom(false);
                if (v !== CUSTOM_SHIFT_PRESET_ID) applyPreset(v);
              }}
              options={[
                { value: CUSTOM_SHIFT_PRESET_ID, label: 'Custom times…' },
                ...presets.map(p => ({ value: p.id, label: p.description })),
                { value: SAVE_CURRENT_SHIFT_PRESET_ID, label: '＋ Save current times as quick shift…' },
              ]}
            />
          </FormField>
          {showSaveCustom && (
            <div className={`flex flex-wrap items-end gap-2 p-3 rounded-lg ${t.chipBg}`}>
              <div className="flex-1 min-w-[140px]">
                <label className={`text-xs ${t.textFaint} block mb-1`}>Name (optional)</label>
                <input
                  type="text"
                  className={inputCls}
                  value={customLabel}
                  onChange={e => setCustomLabel(e.target.value)}
                  placeholder={formatCompactShiftLabel(start, end)}
                  aria-label="Quick shift name"
                />
              </div>
              <PrimaryButton type="button" size="sm" icon={Plus} onClick={handleSaveCurrentAsQuickShift} disabled={!canSaveCurrent}>
                Add
              </PrimaryButton>
              <button type="button" className={`text-xs ${t.textFaint} hover:underline pb-2`} onClick={() => setShowSaveCustom(false)}>
                Cancel
              </button>
            </div>
          )}
          {presets.length > 0 && (
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
          )}
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
