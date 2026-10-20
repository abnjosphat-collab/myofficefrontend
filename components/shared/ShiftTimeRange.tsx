// components/shared/ShiftTimeRange.tsx — a start and end time with the quick shifts this person uses most. The quick shifts are the
// common mine ranges plus the ones learned from their own use; the current times can be saved as a new one. Built on the shared
// system's controls (the older ShiftTimeRangeField still serves the legacy timesheet grid).
'use client';

import type { ReactNode } from 'react';
import { Button, Field, Input, Menu, MenuContent, MenuItem, MenuTrigger, useMarkDirty } from '@/components/ui-system';
import { FREQUENT_SHIFT_TIME_PRESETS, findShiftTimePresetId, normalizeClockTime, splitShiftPresets, type ShiftTimePreset } from '@/lib/shiftTimePresets';
import { formatCompactShiftLabel } from '@/lib/shiftTimePresetsPersonal';
import { useEffectiveShiftPresets } from '@/lib/useEffectiveShiftPresets';

export function ShiftTimeRange({ start, end, onChange, trailing, startError, endError, builtin = FREQUENT_SHIFT_TIME_PRESETS }: {
  start: string; end: string; onChange: (start: string, end: string) => void; trailing?: ReactNode; startError?: string; endError?: string; builtin?: ShiftTimePreset[];
}) {
  const markDirty = useMarkDirty();
  const { presets, addCustom } = useEffectiveShiftPresets(builtin);
  const active = findShiftTimePresetId(start, end, presets);
  const canSave = !active && !!normalizeClockTime(start) && !!normalizeClockTime(end);
  // The few most used shifts stay one tap away; the rest wait in a menu so the row stays short as more are learned.
  const { chips, more } = splitShiftPresets(presets, active);
  return (
    <div className="flex flex-col gap-3">
      <div role="group" aria-label="Quick shift times" className="flex flex-wrap items-center gap-1.5">
        {chips.map(p => (
          <Button key={p.id} size="sm" variant={active === p.id ? 'primary' : 'secondary'} aria-pressed={active === p.id} title={p.description} onClick={() => { markDirty(); onChange(p.start, p.end); }}>{p.label}</Button>
        ))}
        {more.length > 0 && (
          <Menu>
            <MenuTrigger asChild><Button size="sm" variant="ghost" iconAfter="chevron-down">More shifts</Button></MenuTrigger>
            <MenuContent align="start">
              {more.map(p => <MenuItem key={p.id} onSelect={() => { markDirty(); onChange(p.start, p.end); }}>{p.description}</MenuItem>)}
            </MenuContent>
          </Menu>
        )}
        {canSave && <Button size="sm" variant="ghost" icon="plus" onClick={() => addCustom(start, end, formatCompactShiftLabel(start, end))}>Save these times</Button>}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Start time" required error={startError}><Input type="time" value={start} onChange={e => onChange(e.target.value, end)} /></Field>
        <Field label="End time" required error={endError}><Input type="time" value={end} onChange={e => onChange(start, e.target.value)} /></Field>
        {trailing}
      </div>
    </div>
  );
}
