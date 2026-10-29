// components/ui-system/patterns/MultiSelectFilter.tsx — one filter control for
// "which of these values": a button ("All types", "3 types", "Excluding 2")
// opening a popover with an include/exclude switch and the shared
// OptionChecklist, plus removable chips while filtered.
'use client';

import { useMemo, useState } from 'react';
import { Tag } from '../primitives/Badge';
import { Button } from '../primitives/Button';
import { Segmented } from '../primitives/Segmented';
import { Popover, PopoverContent, PopoverTrigger } from '../overlays/Popover';
import { OptionChecklist } from './OptionChecklist';
import { MotionList, MotionListItem } from '../motion/Presence';
import { NumberTransition } from '../motion/NumberTransition';

export interface FilterOption {
  value: string;
  label: string;
  /** Shown beside the label ("Safety Shoes (72)"); unknown when omitted. */
  count?: number;
}

export function MultiSelectFilter({ label, unit, options, value, onChange, mode, onModeChange, allLabel }: {
  /** What is filtered ("PPE types"); seeds the accessible names. */
  label: string;
  /** Button unit when including ("types" → "3 types"). */
  unit: string;
  options: FilterOption[];
  value: string[];
  onChange: (next: string[]) => void;
  mode: 'include' | 'exclude';
  onModeChange: (mode: 'include' | 'exclude') => void;
  /** Button text when nothing is chosen ("All types"). */
  allLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const raw = useMemo(() => new Map(options.map(o => [o.value, o.label])), [options]);
  const checklist = useMemo(
    () => options.map(o => ({ value: o.value, label: o.count === undefined ? o.label : `${o.label} (${o.count})` })),
    [options],
  );
  const text = value.length === 0 ? allLabel : mode === 'include' ? `${value.length} ${unit}` : `Excluding ${value.length}`;
  const reset = () => { onChange([]); onModeChange('include'); };
  return (
    <div className="flex flex-col gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button icon="filter" aria-label={`${label} filter: ${text}${value.length > 0 ? ` (${value.map(v => raw.get(v) ?? v).join(', ')})` : ''}`}>
            {value.length === 0 ? allLabel : mode === 'include' ? (<><NumberTransition value={value.length} /> {unit}</>) : (<>Excluding <NumberTransition value={value.length} /></>)}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <p className="font-sans text-label font-medium text-ink">Show</p>
              <Segmented label="Which values to show" value={mode} onValueChange={onModeChange}
                options={[{ value: 'include', label: 'Only these' }, { value: 'exclude', label: 'All except these' }]} />
            </div>
            <OptionChecklist
              label={label} options={checklist} value={value} onChange={onChange}
              search={options.length > 8} emptyText={`No ${unit} match.`}
              pickedWord="selected" noneText={`${allLabel}.`} showChips={false}
              labelOf={v => raw.get(v) ?? v}
            />
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => onChange([])} disabled={value.length === 0}>Clear</Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      {value.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 max-sm:flex-nowrap">
          <MotionList as="ul" className="flex flex-wrap gap-1.5 max-sm:min-w-0 max-sm:flex-1 max-sm:flex-nowrap max-sm:overflow-x-auto max-sm:snap-x max-sm:snap-proximity [scrollbar-width:none] [&>*]:max-sm:shrink-0 [&>*]:max-sm:snap-start" aria-label={`${label}, filtered`}>
            {value.map(v => (
              <MotionListItem as="li" key={v}><Tag onRemove={() => onChange(value.filter(x => x !== v))}>{raw.get(v) ?? v}</Tag></MotionListItem>
            ))}
          </MotionList>
          <button type="button" className="font-sans text-caption font-medium text-action underline" onClick={reset}>Reset</button>
        </div>
      )}
    </div>
  );
}
