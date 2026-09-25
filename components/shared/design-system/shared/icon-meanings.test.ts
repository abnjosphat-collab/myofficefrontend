import { describe, expect, it } from 'vitest';
import { ICON_MEANINGS, meaningFromStatLabel, meaningFromViewValue } from './icon-meanings';
import { CLASSIC_ICONS } from '../classic/icons';
import { DALLAGLIO_ICONS } from '../dallaglio/icons';

describe('semantic icon registry', () => {
  it('maps Employee Register labels to distinct Dallaglio glyphs', () => {
    expect(meaningFromStatLabel('Total Staff')).toBe('employees');
    expect(meaningFromStatLabel('Artisans')).toBe('artisans');
    expect(meaningFromStatLabel('NEC')).toBe('nec-staff');
    expect(meaningFromStatLabel('Salaried')).toBe('salaried-staff');
    expect(meaningFromStatLabel('Permanent')).toBe('permanent-staff');
    expect(DALLAGLIO_ICONS.employees).not.toBe(DALLAGLIO_ICONS['nec-staff']);
    expect(DALLAGLIO_ICONS['nec-staff']).not.toBe(DALLAGLIO_ICONS['salaried-staff']);
  });

  it('maps view values to Tools-style grid/list/table meanings', () => {
    expect(meaningFromViewValue('grid')).toBe('grid-view');
    expect(meaningFromViewValue('card')).toBe('grid-view');
    expect(meaningFromViewValue('list')).toBe('list-view');
    expect(meaningFromViewValue('table')).toBe('table-view');
    expect(meaningFromViewValue('sheet')).toBe('sheet-view');
  });

  it('covers every meaning in both Classic and Dallaglio maps', () => {
    for (const meaning of ICON_MEANINGS) {
      expect(CLASSIC_ICONS[meaning], `classic missing ${meaning}`).toBeTruthy();
      expect(DALLAGLIO_ICONS[meaning], `dallaglio missing ${meaning}`).toBeTruthy();
    }
  });
});
