import { describe, expect, it } from 'vitest';
import { themeClasses } from './tokens';

describe('themeClasses design language', () => {
  it('keeps Classic glass surfaces by default', () => {
    const classic = themeClasses(true);
    expect(classic.glass).toContain('bg-white');
    expect(classic.cta).toContain('bg-gradient-to-br');
    expect(classic.pageBg).toContain('bg-stone-50');
  });

  it('uses Dallaglio canvas tokens when design is dallaglio', () => {
    const dallaglio = themeClasses(true, 'dallaglio');
    expect(dallaglio.glass).toContain('--d-surface');
    expect(dallaglio.glass).not.toContain('backdrop-blur');
    expect(dallaglio.cta).toContain('--d-accent');
    expect(dallaglio.cta).not.toContain('gradient');
    expect(dallaglio.pageBg).toContain('--d-canvas');
    expect(dallaglio.glassPopover).toContain('--d-surface');
  });

  it('uses Dallaglio dark tokens without frosted glass', () => {
    const dark = themeClasses(false, 'dallaglio');
    expect(dark.glass).toContain('--d-surface');
    expect(dark.glass).not.toContain('backdrop-blur');
    expect(dark.cta).toContain('--d-accent');
  });

  it('covers the same theme surface as Classic (cards, type, inputs, CTAs, page)', () => {
    const classic = themeClasses(true, 'classic');
    const dallaglio = themeClasses(true, 'dallaglio');
    expect(Object.keys(dallaglio).sort()).toEqual(Object.keys(classic).sort());
    expect(dallaglio.inputBg).toContain('--d-canvas');
    expect(dallaglio.textPrimary).toContain('--d-ink');
    expect(dallaglio.scrim).toContain('27,22,43');
    expect(dallaglio.glassPopover).not.toContain('backdrop-blur');
  });
});
