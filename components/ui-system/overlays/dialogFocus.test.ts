import { describe, expect, it, vi } from 'vitest';
import { firstDialogField } from './dialogFocus';

// jsdom reports no layout boxes; pretend every element is visible.
vi.spyOn(Element.prototype, 'getClientRects').mockImplementation(() => [{}] as unknown as DOMRectList);

const root = (html: string): HTMLElement => {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div;
};

describe('firstDialogField', () => {
  it('returns null without a root or without fields', () => {
    expect(firstDialogField(null)).toBeNull();
    expect(firstDialogField(root('<p>no fields</p>'))).toBeNull();
  });

  it('finds native fields', () => {
    expect(firstDialogField(root('<input type="text" />'))?.tagName).toBe('INPUT');
    expect(firstDialogField(root('<select></select>'))?.tagName).toBe('SELECT');
    expect(firstDialogField(root('<textarea></textarea>'))?.tagName).toBe('TEXTAREA');
  });

  it('skips hidden inputs', () => {
    expect(firstDialogField(root('<input type="hidden" />'))).toBeNull();
  });

  it('finds picker and select triggers (button[role=combobox])', () => {
    const el = firstDialogField(root('<button role="combobox">Pick an employee</button>'));
    expect(el?.tagName).toBe('BUTTON');
  });

  it('skips disabled combobox triggers', () => {
    expect(firstDialogField(root('<button role="combobox" disabled>Pick</button>'))).toBeNull();
  });

  it('ignores plain buttons (close, submit, segments)', () => {
    expect(firstDialogField(root('<button>Close</button>'))).toBeNull();
  });
});
