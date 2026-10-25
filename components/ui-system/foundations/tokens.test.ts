// F3: lock the chart-series and status-pair contrast the October audit measured.
// Series colours must hold WCAG 1.4.11 graphics contrast (3:1) on every surface a
// chart can sit on; status text must hold WCAG 1.4.3 text contrast (4.5:1) on its
// soft fill. Values are read from tokens.css itself, so a future re-tint that
// breaks contrast fails here instead of silently shipping.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Read from the repo (vitest mocks `?raw` CSS imports as empty, and import.meta.url
// is not a file URL under the transform, so resolve from the project root instead).
const css = readFileSync(
  join(process.cwd(), 'components/ui-system/foundations/tokens.css'),
  'utf8',
);

const themesCss = readFileSync(
  join(process.cwd(), 'components/ui-system/foundations/themes.css'),
  'utf8',
);

const token = (name: string): string => {
  const m = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!m) throw new Error(`token --${name} not found in tokens.css`);
  return m[1];
};

const luminance = (hex: string): number => {
  const f = (i: number) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(1) + 0.7152 * f(3) + 0.0722 * f(5);
};

const ratio = (a: string, b: string): number => {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

type Lab = [number, number, number];

const linearChannel = (v: number): number => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};

const linearToLab = ([r, g, b]: [number, number, number]): Lab => {
  const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const f = (t: number): number => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
};

const hexToLab = (hex: string): Lab => linearToLab([
  linearChannel(parseInt(hex.slice(1, 3), 16)),
  linearChannel(parseInt(hex.slice(3, 5), 16)),
  linearChannel(parseInt(hex.slice(5, 7), 16)),
]);

/** Machado et al. severity-1 deuteranopia: what the series colour looks like without M cones. */
const deuteranopia = (hex: string): Lab => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  return linearToLab([
    linearChannel((0.625 * r + 0.375 * g) * 255),
    linearChannel((0.7 * r + 0.3 * g) * 255),
    linearChannel((0.3 * g + 0.7 * b) * 255),
  ]);
};

const deltaE = (a: Lab, b: Lab): number => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

const seriesHex = (): string[] => Array.from({ length: 8 }, (_, i) => token(`mo-chart-${i + 1}`));

describe('foundation token contrast', () => {
  it('all eight chart series hold 3:1 on every chart ground', () => {
    const grounds = ['mo-surface', 'mo-surface-raised', 'mo-surface-subtle'].map(token);
    for (let slot = 1; slot <= 8; slot += 1) {
      const series = token(`mo-chart-${slot}`);
      for (const ground of grounds) {
        expect(ratio(series, ground), `chart-${slot} ${series} on ${ground}`).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('status text holds 4.5:1 on its soft fill', () => {
    for (const name of ['success', 'warning', 'danger', 'info', 'neutral']) {
      expect(ratio(token(`mo-${name}`), token(`mo-${name}-soft`)), name).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('chart axis text holds 4.5:1 on the card ground', () => {
    expect(ratio(token('mo-chart-axis'), token('mo-surface'))).toBeGreaterThanOrEqual(4.5);
  });

  it('segmented selected state is unmistakable: filled pill vs track, ink on pill, idle label on track', () => {
    // The old selected fill (action-soft on the muted track) measured 1.04:1 — indistinguishable.
    expect(ratio(token('mo-action'), token('mo-surface-muted')), 'selected pill on track').toBeGreaterThanOrEqual(3);
    expect(ratio(token('mo-action-ink'), token('mo-action')), 'selected label on pill').toBeGreaterThanOrEqual(4.5);
    expect(ratio(token('mo-ink-muted'), token('mo-surface-muted')), 'idle label on track').toBeGreaterThanOrEqual(4.5);
  });

  it('control boundaries hold 3:1 on every ground they sit on (WCAG 1.4.11)', () => {
    // Was 2.82:1 on canvas / 2.61:1 on muted — darkened along the same hue 2026-10-18.
    for (const ground of ['mo-canvas', 'mo-surface', 'mo-surface-raised', 'mo-surface-muted']) {
      expect(ratio(token('mo-line-control'), token(ground)), `line-control on ${ground}`).toBeGreaterThanOrEqual(3);
    }
  });

  it('every chart-series pair is dE > 30 apart', () => {
    // Orange vs red used to be dE 20.3 — neighbouring slices blurred together.
    const labs = seriesHex().map(hexToLab);
    let min = Infinity;
    let minPair = '';
    for (let i = 0; i < labs.length; i += 1) {
      for (let j = i + 1; j < labs.length; j += 1) {
        const d = deltaE(labs[i], labs[j]);
        if (d < min) { min = d; minPair = `${i + 1}v${j + 1}`; }
        expect(d, `chart-${i + 1} vs chart-${j + 1}`).toBeGreaterThan(30);
      }
    }
    expect(min, `minimum pair dE (${minPair})`).toBeGreaterThan(30);
  });

  it('every chart-series pair stays distinct under deuteranopia simulation', () => {
    // Machado et al. severity-1 deuteranopia on sRGB; threshold 10 is ~4x the
    // just-noticeable difference, so pairs stay separable for red-green colour blindness.
    const labs = seriesHex().map(deuteranopia);
    for (let i = 0; i < labs.length; i += 1) {
      for (let j = i + 1; j < labs.length; j += 1) {
        expect(deltaE(labs[i], labs[j]), `chart-${i + 1} vs chart-${j + 1} (deuteranopia)`).toBeGreaterThanOrEqual(10);
      }
    }
  });

  it('grid tone pairs hold 4.5:1 (the status test above covers info/warning/danger/success)', () => {
    expect(ratio(token('mo-ink'), token('mo-surface-subtle')), 'neutral cell text').toBeGreaterThanOrEqual(4.5);
    expect(ratio(token('mo-action'), token('mo-action-soft')), 'brand cell text').toBeGreaterThanOrEqual(4.5);
  });

  it('data-grid radii exist and stay sharper than controls (2px cells, 4px container)', () => {
    const px = (name: string): number => {
      const m = css.match(new RegExp(`--${name}:\\s*(\\d+)px`));
      if (!m) throw new Error(`token --${name} not found in tokens.css`);
      return Number(m[1]);
    };
    expect(px('mo-radius-cell')).toBe(2);
    expect(px('mo-radius-grid')).toBe(4);
    expect(px('mo-radius-grid')).toBeLessThan(px('mo-radius-control'));
  });
});

// C7: the same contrast battery for every theme/darkness combination (6 x 4).
// Brand action, status meaning and chart order never change hue per theme;
// themes tint surfaces, text and lines only. Dark steps carry their own
// lightened chart series, which get their own distinctness proof below.
const THEMES = ['sage', 'forest', 'ocean', 'clay', 'slate', 'sand'];
const DARKNESS = ['light', 'shaded', 'dark', 'deep'];

/** Effective tokens for one combination: :root base merged with its override block. */
const comboTokens = (theme: string, darkness: string): Record<string, string> => {
  const merged: Record<string, string> = {};
  for (const m of css.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})/g)) merged[m[1]] = m[2];
  const block = new RegExp(
    `:root\\[data-theme='${theme}'\\]\\[data-darkness='${darkness}'\\]\\s*\\{([^}]*)\\}`,
  ).exec(themesCss);
  if (!block) throw new Error(`theme block ${theme}/${darkness} not found in themes.css`);
  for (const m of block[1].matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})/g)) merged[m[1]] = m[2];
  return merged;
};

/** Raw (possibly non-hex) declaration for one combination; throws when the block or token is missing. */
const rawDecl = (theme: string, darkness: string, name: string): string => {
  const block = new RegExp(
    `:root\\[data-theme='${theme}'\\]\\[data-darkness='${darkness}'\\]\\s*\\{([^}]*)\\}`,
  ).exec(themesCss);
  if (!block) throw new Error(`theme block ${theme}/${darkness} not found in themes.css`);
  const m = new RegExp(`--${name}:\\s*([^;]+);`).exec(block[1]);
  if (!m) throw new Error(`token --${name} missing for ${theme}/${darkness}`);
  return m[1].trim();
};

const comboSeries = (tokens: Record<string, string>): string[] =>
  Array.from({ length: 8 }, (_, i) => tokens[`mo-chart-${i + 1}`]);

describe('theme and darkness token contrast', () => {
  it('every combination holds the contrast battery', () => {
    for (const theme of THEMES) {
      for (const darkness of DARKNESS) {
        const at = (name: string): string => {
          const value = comboTokens(theme, darkness)[name];
          if (!value) throw new Error(`token --${name} missing for ${theme}/${darkness}`);
          return value;
        };
        const where = `${theme}/${darkness}`;
        for (let slot = 1; slot <= 8; slot += 1) {
          for (const ground of ['mo-surface', 'mo-surface-raised', 'mo-surface-subtle']) {
            expect(ratio(at(`mo-chart-${slot}`), at(ground)), `${where} chart-${slot} on ${ground}`).toBeGreaterThanOrEqual(3);
          }
        }
        for (const name of ['success', 'warning', 'danger', 'info', 'neutral']) {
          expect(ratio(at(`mo-${name}`), at(`mo-${name}-soft`)), `${where} ${name}`).toBeGreaterThanOrEqual(4.5);
        }
        expect(ratio(at('mo-chart-axis'), at('mo-surface')), `${where} axis`).toBeGreaterThanOrEqual(4.5);
        expect(ratio(at('mo-action'), at('mo-surface-muted')), `${where} pill on track`).toBeGreaterThanOrEqual(3);
        expect(ratio(at('mo-action-ink'), at('mo-action')), `${where} ink on pill`).toBeGreaterThanOrEqual(4.5);
        expect(ratio(at('mo-ink-muted'), at('mo-surface-muted')), `${where} idle on track`).toBeGreaterThanOrEqual(4.5);
        for (const ground of ['mo-canvas', 'mo-surface', 'mo-surface-raised', 'mo-surface-muted']) {
          expect(ratio(at('mo-line-control'), at(ground)), `${where} line-control on ${ground}`).toBeGreaterThanOrEqual(3);
        }
        expect(ratio(at('mo-ink'), at('mo-surface-subtle')), `${where} ink on subtle`).toBeGreaterThanOrEqual(4.5);
        expect(ratio(at('mo-action'), at('mo-action-soft')), `${where} action on soft`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('the dark chart series stay distinct (dE > 30) and deuteranopia-separable', () => {
    const dark = comboSeries(comboTokens('sage', 'dark'));
    const labs = dark.map(hexToLab);
    for (let i = 0; i < labs.length; i += 1) {
      for (let j = i + 1; j < labs.length; j += 1) {
        expect(deltaE(labs[i], labs[j]), `dark chart-${i + 1} vs chart-${j + 1}`).toBeGreaterThan(30);
      }
    }
    const deut = dark.map(deuteranopia);
    for (let i = 0; i < deut.length; i += 1) {
      for (let j = i + 1; j < deut.length; j += 1) {
        expect(deltaE(deut[i], deut[j]), `dark chart-${i + 1} vs chart-${j + 1} (deuteranopia)`).toBeGreaterThanOrEqual(10);
      }
    }
  });

  it('the dialog scrim stays dark in every step (never ink-derived when ink is light)', () => {
    // The floor derives --mo-overlay from --mo-ink, which is light in dark mode
    // and washed the whole page pale behind every dialog. Each theme block pins
    // its own scrim: the live formula where ink is dark, a black veil where not.
    const FLOOR_FORMULA = 'color-mix(in srgb, var(--mo-ink) 38%, transparent)';
    for (const theme of THEMES) {
      for (const darkness of DARKNESS) {
        const overlay = rawDecl(theme, darkness, 'mo-overlay');
        if (darkness === 'dark' || darkness === 'deep') {
          expect(overlay, `${theme}/${darkness} scrim`).toMatch(/^rgb\(0 0 0 \/ 0\.\d+\)$/);
        } else {
          expect(overlay, `${theme}/${darkness} scrim keeps the live formula`).toBe(FLOOR_FORMULA);
        }
      }
    }
  });

  it('elevation shadows stay dark in dark mode (no ink-derived halo)', () => {
    // Same floor leak as the scrim: ink-derived shadows glow pale on dark grounds.
    for (const theme of THEMES) {
      for (const darkness of ['dark', 'deep']) {
        for (const name of ['mo-shadow-card', 'mo-shadow-card-hover', 'mo-shadow-popover', 'mo-shadow-dialog']) {
          expect(rawDecl(theme, darkness, name), `${theme}/${darkness} ${name}`).not.toContain('var(--mo-ink)');
        }
      }
      for (const darkness of ['light', 'shaded']) {
        // Light steps keep the live floor formulas byte-for-byte: nobody's look changes.
        expect(rawDecl(theme, darkness, 'mo-shadow-card'), `${theme}/${darkness} card shadow`).toContain('var(--mo-ink)');
      }
    }
  });

  it('dark and deep share one lightened series; light and shaded share the :root series', () => {
    expect(comboSeries(comboTokens('sage', 'deep'))).toEqual(comboSeries(comboTokens('sage', 'dark')));
    expect(comboSeries(comboTokens('ocean', 'shaded'))).toEqual(comboSeries(comboTokens('sage', 'light')));
    expect(comboSeries(comboTokens('sage', 'dark'))).not.toEqual(comboSeries(comboTokens('sage', 'light')));
  });
});
