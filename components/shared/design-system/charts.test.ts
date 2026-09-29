import { describe, expect, it } from 'vitest';

import { chartTheme } from './charts';
import { DALLAGLIO_DARK } from './dallaglio/tokens';

describe('Dallaglio color responsibilities', () => {
  it('keeps dark structural interactions achromatic', () => {
    expect(DALLAGLIO_DARK.cta).toContain('#f7f7f8');
    expect(DALLAGLIO_DARK.cta).not.toMatch(/c4b5f5|7652c5/i);
  });

  it('retains categorical color for dark data visualizations', () => {
    const theme = chartTheme('dallaglio', false);

    expect(theme.accent).toBe('#c4b5f5');
    expect(new Set(theme.series).size).toBe(theme.series.length);
    expect(theme.series).toContain('#8fd0ba');
    expect(theme.series).toContain('#e7b783');
  });
});

