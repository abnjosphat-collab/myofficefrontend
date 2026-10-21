// base.test.ts — lock the pointer-cursor base rule: every clickable control shows a
// hand (Tailwind's reset leaves buttons with the arrow), disabled stays forbidden.
// Read from base.css itself, like tokens.test.ts.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(
  join(process.cwd(), 'components/ui-system/foundations/base.css'),
  'utf8',
).replace(/\s+/g, ' ');

describe('base cursor rule', () => {
  it('gives enabled buttons, role=button, summary and links a pointer', () => {
    expect(css).toMatch(
      /button:not\(:disabled\), \[role='button'\]:not\(\[aria-disabled='true'\]\), summary, a\[href\] \{ cursor: pointer; \}/,
    );
  });

  it('keeps disabled buttons forbidden', () => {
    expect(css).toContain(':where(button):disabled { cursor: not-allowed; }');
  });
});
