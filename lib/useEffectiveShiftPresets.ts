'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ShiftTimePreset } from './shiftTimePresets';
import { FREQUENT_SHIFT_TIME_PRESETS } from './shiftTimePresets';
import {
  addCustomShiftPreset,
  loadPersonalShiftStore,
  mergeEffectiveShiftPresets,
  recordShiftTimeUsage,
  subscribePersonalShiftPresets,
} from './shiftTimePresetsPersonal';

export function useEffectiveShiftPresets(builtin: ShiftTimePreset[] = FREQUENT_SHIFT_TIME_PRESETS) {
  const [version, setVersion] = useState(0);

  useEffect(() => subscribePersonalShiftPresets(() => setVersion(v => v + 1)), []);

  const presets = useMemo(
    () => mergeEffectiveShiftPresets(builtin, loadPersonalShiftStore().entries),
    [builtin, version],
  );

  return {
    presets,
    recordUsage: recordShiftTimeUsage,
    addCustom: addCustomShiftPreset,
  };
}
