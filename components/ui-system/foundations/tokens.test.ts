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

// Mono dark: the contrast battery for the single override combination.
// Sage/light needs no block (the :root base already paints it), so the battery
// runs on mono/dark merged over :root. Chrome is neutral grey; brand action,
// status meaning, focus and the chart series keep dark-scheme hues.

/** Effective tokens: :root base merged with the mono/dark override block. */
const comboTokens = (): Record<string, string> => {
  const merged: Record<string, string> = {};
  for (const m of css.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})/g)) merged[m[1]] = m[2];
  const block = /html\[data-theme='mono'\]\[data-darkness='dark'\]\s*\{([^}]*)\}/.exec(themesCss);
  if (!block) throw new Error('theme block mono/dark not found in themes.css');
  for (const m of block[1].matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})/g)) merged[m[1]] = m[2];
  return merged;
};

/** Raw (possibly non-hex) declaration; throws when the block or token is missing. */
const rawDecl = (name: string): string => {
  const block = /html\[data-theme='mono'\]\[data-darkness='dark'\]\s*\{([^}]*)\}/.exec(themesCss);
  if (!block) throw new Error('theme block mono/dark not found in themes.css');
  const m = new RegExp(`--${name}:\\s*([^;]+);`).exec(block[1]);
  if (!m) throw new Error(`token --${name} missing for mono/dark`);
  return m[1].trim();
};

const comboSeries = (tokens: Record<string, string>): string[] =>
  Array.from({ length: 8 }, (_, i) => tokens[`mo-chart-${i + 1}`]);

describe('mono dark token contrast', () => {
  it('holds the contrast battery', () => {
    const tokens = comboTokens();
    const at = (name: string): string => {
      const value = tokens[name];
      if (!value) throw new Error(`token --${name} missing for mono/dark`);
      return value;
    };
    for (let slot = 1; slot <= 8; slot += 1) {
      for (const ground of ['mo-surface', 'mo-surface-raised', 'mo-surface-subtle']) {
        expect(ratio(at(`mo-chart-${slot}`), at(ground)), `chart-${slot} on ${ground}`).toBeGreaterThanOrEqual(3);
      }
    }
    for (const name of ['success', 'warning', 'danger', 'info', 'neutral']) {
      expect(ratio(at(`mo-${name}`), at(`mo-${name}-soft`)), name).toBeGreaterThanOrEqual(4.5);
    }
    expect(ratio(at('mo-chart-axis'), at('mo-surface')), 'axis').toBeGreaterThanOrEqual(4.5);
    expect(ratio(at('mo-action'), at('mo-surface-muted')), 'pill on track').toBeGreaterThanOrEqual(3);
    expect(ratio(at('mo-action-ink'), at('mo-action')), 'ink on pill').toBeGreaterThanOrEqual(4.5);
    expect(ratio(at('mo-ink-muted'), at('mo-surface-muted')), 'idle on track').toBeGreaterThanOrEqual(4.5);
    for (const ground of ['mo-canvas', 'mo-surface', 'mo-surface-raised', 'mo-surface-muted']) {
      expect(ratio(at('mo-line-control'), at(ground)), `line-control on ${ground}`).toBeGreaterThanOrEqual(3);
    }
    expect(ratio(at('mo-ink'), at('mo-surface-subtle')), 'ink on subtle').toBeGreaterThanOrEqual(4.5);
    expect(ratio(at('mo-action'), at('mo-action-soft')), 'action on soft').toBeGreaterThanOrEqual(4.5);
    expect(ratio(at('mo-ink'), at('mo-canvas')), 'body text pops').toBeGreaterThanOrEqual(12);
  });

  it('keeps chrome neutral grey (no hue in grounds, ink or lines)', () => {
    const tokens = comboTokens();
    const spread = (hex: string): number => {
      const c = [0, 2, 4].map(i => parseInt(hex.slice(i + 1, i + 3), 16) / 255);
      return Math.max(...c) - Math.min(...c);
    };
    for (const name of ['mo-canvas', 'mo-surface', 'mo-surface-raised', 'mo-surface-subtle', 'mo-surface-muted',
      'mo-paper', 'mo-soft', 'mo-surface-interactive', 'mo-surface-interactive-hover',
      'mo-ink', 'mo-ink-muted', 'mo-ink-subtle', 'mo-line', 'mo-line-subtle',
      'mo-line-control', 'mo-line-strong', 'mo-chart-grid']) {
      expect(spread(tokens[name]), name).toBeLessThanOrEqual(0.02);
    }
  });

  it('the chart series stay distinct (dE > 30) and deuteranopia-separable', () => {
    const labs = comboSeries(comboTokens()).map(hexToLab);
    for (let i = 0; i < labs.length; i += 1) {
      for (let j = i + 1; j < labs.length; j += 1) {
        expect(deltaE(labs[i], labs[j]), `chart-${i + 1} vs chart-${j + 1}`).toBeGreaterThan(30);
      }
    }
    const deut = comboSeries(comboTokens()).map(deuteranopia);
    for (let i = 0; i < deut.length; i += 1) {
      for (let j = i + 1; j < deut.length; j += 1) {
        expect(deltaE(deut[i], deut[j]), `chart-${i + 1} vs chart-${j + 1} (deuteranopia)`).toBeGreaterThanOrEqual(10);
      }
    }
  });

  it('the dialog scrim is a black veil (never ink-derived: ink is light)', () => {
    // The floor derives --mo-overlay from --mo-ink, which is light in dark mode
    // and washed the whole page pale behind every dialog.
    expect(rawDecl('mo-overlay'), 'scrim').toMatch(/^rgb\(0 0 0 \/ 0\.\d+\)$/);
  });

  it('elevation shadows are neutral black (no ink-derived halo)', () => {
    for (const name of ['mo-shadow-card', 'mo-shadow-card-hover', 'mo-shadow-popover', 'mo-shadow-dialog']) {
      expect(rawDecl(name), name).not.toContain('var(--mo-ink)');
    }
  });

  it('light needs no override block (the base look is untouched)', () => {
    expect(themesCss).not.toContain("data-darkness='light'");
    expect(themesCss.match(/html\[data-theme=/g)?.length ?? 0).toBe(1);
  });
});
