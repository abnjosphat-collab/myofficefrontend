// The caps from PLAN 5.1/5.2: no transition over 0.5 s, no bounce over 0.15,
// linear only in SPIN. The highlight wash is the sole documented exception.
import { describe, expect, it } from 'vitest';
import { FADE, HIGHLIGHT_WASH_S, SPIN, SPRING } from './presets';

const transitions = {
  ...SPRING,
  FADE,
  SPIN,
} as Record<string, { visualDuration?: number; duration?: number; bounce?: number; ease?: unknown }>;

describe('motion preset caps', () => {
  it('keeps every spring at or under 0.5 s perceptual duration', () => {
    for (const [name, preset] of Object.entries(SPRING)) {
      expect(preset.visualDuration, name).toBeGreaterThan(0);
      expect(preset.visualDuration, name).toBeLessThanOrEqual(0.5);
    }
    expect(FADE.duration).toBeLessThanOrEqual(0.5);
    expect(SPIN.duration).toBeLessThanOrEqual(0.5);
  });

  it('keeps every bounce at or under 0.15', () => {
    for (const [name, preset] of Object.entries(SPRING)) {
      expect(preset.bounce, name).toBeGreaterThanOrEqual(0);
      expect(preset.bounce, name).toBeLessThanOrEqual(0.15);
    }
  });

  it('allows linear easing only in SPIN', () => {
    for (const [name, preset] of Object.entries(transitions)) {
      if (name === 'SPIN') {
        expect(preset.ease).toBe('linear');
      } else {
        expect(preset.ease ?? 'spring', name).not.toBe('linear');
      }
    }
  });

  it('pins the highlight wash as the sole documented cap exception', () => {
    expect(HIGHLIGHT_WASH_S).toBe(1.2);
  });

  it('keeps the documented table values', () => {
    expect(SPRING.smooth).toEqual({ type: 'spring', visualDuration: 0.3, bounce: 0 });
    expect(SPRING.gentle).toEqual({ type: 'spring', visualDuration: 0.45, bounce: 0 });
    expect(SPRING.snappy).toEqual({ type: 'spring', visualDuration: 0.2, bounce: 0.1 });
    expect(SPRING.quick).toEqual({ type: 'spring', visualDuration: 0.15, bounce: 0 });
    expect(FADE).toEqual({ duration: 0.15, ease: 'easeOut' });
  });
});
