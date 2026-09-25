import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Button } from './Button';
import { CloseButton } from './CloseButton';

describe('design-aware Button and CloseButton', () => {
  it('exposes variants pages can request without picking a glyph colour', () => {
    const html = renderToStaticMarkup(createElement(Button, { variant: 'subtle', size: 'xs' }, 'Add'));
    expect(html).toContain('Add');
    expect(html).toMatch(/data-ds="(button|cta)"/);
  });

  it('keeps an accessible name on CloseButton', () => {
    const html = renderToStaticMarkup(createElement(CloseButton, { label: 'Close dialog' }));
    expect(html).toContain('aria-label="Close dialog"');
    expect(html).toContain('data-ds="close"');
  });
});
