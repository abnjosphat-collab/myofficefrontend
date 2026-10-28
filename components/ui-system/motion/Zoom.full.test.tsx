// ZoomTarget with full motion (real framer module, OS not asking): a live
// on-screen source zooms; a missing or off-screen source falls back to the
// placement's normal open; close re-looks the source up and shrinks back.
// Separate file: framer's OS-preference listener is a module singleton.
import { fireEvent, render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('framer-motion', async (importOriginal) => {
  return await importOriginal<typeof import('framer-motion')>();
});

import { ZoomBoundary, ZoomLink, ZoomTarget } from './Zoom';
import { __clearZoomSources } from './zoomRegistry';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  })),
});

function rect(x: number, y: number, width: number, height: number): DOMRect {
  return { x, y, width, height, top: y, left: x, right: x + width, bottom: y + height, toJSON: () => ({}) } as DOMRect;
}

/** jsdom has no layout: source links and panels measure what the test says. */
function mockLayout(source: DOMRect, panel: DOMRect) {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    const el = this as HTMLElement;
    if (el.dataset?.zoomLink !== undefined) return source;
    if (el.dataset?.zoomPanel !== undefined) return panel;
    return rect(0, 0, 0, 0);
  });
}

describe('ZoomTarget (full motion)', () => {
  it('zooms from a live on-screen source', async () => {
    __clearZoomSources();
    mockLayout(rect(100, 200, 300, 120), rect(400, 100, 600, 500));
    const page = render(<ZoomLink zoomId="full:rec:1"><p>Card</p></ZoomLink>);
    fireEvent.click(page.container.querySelector('[data-zoom-link]') as HTMLElement);
    const view = render(
      <ZoomBoundary>
        <ZoomTarget key="panel" zoomId="full:rec:1" placement="center"><p>Detail</p></ZoomTarget>
      </ZoomBoundary>,
    );
    const panel = view.container.querySelector('[data-zoom-panel]') as HTMLElement;
    await waitFor(() => expect(panel.dataset.zoomMode).toBe('zoom'));
    expect(panel.dataset.zoomFallback).toBeUndefined();
    vi.restoreAllMocks();
  });

  it('falls back when the source is missing', async () => {
    __clearZoomSources();
    mockLayout(rect(0, 0, 0, 0), rect(800, 0, 500, 800));
    const view = render(
      <ZoomBoundary>
        <ZoomTarget key="panel" zoomId="full:rec:gone" placement="right"><p>Detail</p></ZoomTarget>
      </ZoomBoundary>,
    );
    const panel = view.container.querySelector('[data-zoom-panel]') as HTMLElement;
    await waitFor(() => expect(panel.dataset.zoomMode).toBe('fallback'));
    expect(panel.dataset.zoomFallback).toBe('true');
    vi.restoreAllMocks();
  });

  it('falls back when the source is off-screen', async () => {
    __clearZoomSources();
    mockLayout(rect(100, 5000, 300, 120), rect(400, 100, 600, 500));
    const page = render(<ZoomLink zoomId="full:rec:far"><p>Card</p></ZoomLink>);
    fireEvent.click(page.container.querySelector('[data-zoom-link]') as HTMLElement);
    const view = render(
      <ZoomBoundary>
        <ZoomTarget key="panel" zoomId="full:rec:far" placement="center"><p>Detail</p></ZoomTarget>
      </ZoomBoundary>,
    );
    const panel = view.container.querySelector('[data-zoom-panel]') as HTMLElement;
    await waitFor(() => expect(panel.dataset.zoomMode).toBe('fallback'));
    vi.restoreAllMocks();
  });

  it('closes and unmounts through the exit (mid-flight safe)', async () => {
    __clearZoomSources();
    mockLayout(rect(100, 200, 300, 120), rect(400, 100, 600, 500));
    const page = render(<ZoomLink zoomId="full:rec:exit"><p>Card</p></ZoomLink>);
    fireEvent.click(page.container.querySelector('[data-zoom-link]') as HTMLElement);
    const view = render(
      <ZoomBoundary>
        <ZoomTarget key="panel" zoomId="full:rec:exit" placement="center"><p>Detail</p></ZoomTarget>
      </ZoomBoundary>,
    );
    const panel = view.container.querySelector('[data-zoom-panel]') as HTMLElement;
    await waitFor(() => expect(panel.dataset.zoomMode).toBe('zoom'));
    // Close immediately — mid-enter — and the exit still completes.
    view.rerender(<ZoomBoundary>{null}</ZoomBoundary>);
    await waitFor(() => expect(view.container.querySelector('[data-zoom-panel]')).toBeNull(), { timeout: 8000 });
    vi.restoreAllMocks();
  });
});
