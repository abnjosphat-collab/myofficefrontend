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
});
