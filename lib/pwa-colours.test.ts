// PWA chrome colours must equal the canvas token: the installed splash, the browser
// title bar and the page ground are one continuous surface. The metadata APIs take
// literals, not CSS vars, so this test re-checks the literals against tokens.css.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (rel: string): string => readFileSync(join(process.cwd(), rel), 'utf8');
const css = read('components/ui-system/foundations/tokens.css');

const token = (name: string): string => {
  const m = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!m) throw new Error(`token --${name} not found in tokens.css`);
  return m[1].toLowerCase();
};

const themeColorOf = (rel: string): string => {
  const m = read(rel).match(/themeColor:\s*["'](#[0-9a-fA-F]{6})["']/);
  if (!m) throw new Error(`themeColor not found in ${rel}`);
  return m[1].toLowerCase();
};

describe('PWA colours follow the canvas token', () => {
  const canvas = token('mo-canvas');

  it.each(['public/manifest.json', 'public/tools/manifest.webmanifest'])('%s matches the canvas token', rel => {
    const manifest = JSON.parse(read(rel)) as { background_color: string; theme_color: string };
    expect(manifest.background_color.toLowerCase(), `${rel} background_color`).toBe(canvas);
    expect(manifest.theme_color.toLowerCase(), `${rel} theme_color`).toBe(canvas);
  });

  it.each(['app/layout.tsx', 'app/tools/layout.tsx'])('%s viewport themeColor matches the canvas token', rel => {
    expect(themeColorOf(rel)).toBe(canvas);
  });

  it('the floor title-bar override matches the floor canvas (a deliberate second alignment)', () => {
    const floorCss = read('components/shared/floor/floor-themes.css');
    const floorCanvas = floorCss.match(/data-floor-theme='sage'\][\s\S]*?--mo-canvas:\s*(#[0-9a-fA-F]{6})/)?.[1].toLowerCase();
    const titleBar = read('components/shared/floor/themes.ts').match(/TITLE_BAR\s*=\s*'(#[0-9a-fA-F]{6})'/)?.[1].toLowerCase();
    expect(floorCanvas, 'sage --mo-canvas').toBeDefined();
    expect(titleBar, 'TITLE_BAR follows the sage canvas').toBe(floorCanvas);
    // Floor pages paint the sage canvas, so their chrome differs from the base token by design.
    expect(floorCanvas).not.toBe(canvas);
  });
});
