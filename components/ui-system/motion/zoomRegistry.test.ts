// zoomRegistry: stable-id lookup. Last click wins, disconnected nodes are
// skipped, unregister only clears its own element, consume clears the mark.
import { afterEach, describe, expect, it } from 'vitest';
import { __clearZoomSources, consumeZoomSource, lookupZoomSource, markZoomSourceUsed, registerZoomSource, unregisterZoomSource } from './zoomRegistry';

function attached(tag = 'div'): HTMLElement {
  const el = document.createElement(tag);
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
  __clearZoomSources();
});

describe('zoomRegistry', () => {
  it('looks a mounted source up by its stable id', () => {
    const el = attached();
    registerZoomSource('page:rec:1', el);
    expect(lookupZoomSource('page:rec:1')).toBe(el);
  });

  it('returns null for unknown ids and skips disconnected nodes', () => {
    expect(lookupZoomSource('page:rec:nope')).toBeNull();
    const el = attached();
    registerZoomSource('page:rec:2', el);
    el.remove();
    expect(lookupZoomSource('page:rec:2')).toBeNull();
  });

  it('prefers the clicked source when two share one id', () => {
    const header = attached();
    const empty = attached();
    registerZoomSource('page:new', header);
    registerZoomSource('page:new', empty);
    markZoomSourceUsed('page:new', header);
    expect(lookupZoomSource('page:new')).toBe(header);
  });

  it('consume clears the click, so a sourceless open falls back', () => {
    const header = attached();
    const empty = attached();
    registerZoomSource('page:new', header);
    registerZoomSource('page:new', empty);
    markZoomSourceUsed('page:new', header);
    expect(consumeZoomSource('page:new')).toBe(header);
    // The click is spent: the next open sees the registered element.
    expect(consumeZoomSource('page:new')).toBe(empty);
  });

  it('unregister only clears its own element', () => {
    const first = attached();
    const second = attached();
    registerZoomSource('page:rec:3', first);
    registerZoomSource('page:rec:3', second);
    unregisterZoomSource('page:rec:3', first);
    expect(lookupZoomSource('page:rec:3')).toBe(second);
    unregisterZoomSource('page:rec:3', second);
    expect(lookupZoomSource('page:rec:3')).toBeNull();
  });
});
