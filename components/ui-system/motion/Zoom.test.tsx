// ZoomLink/ZoomTarget under reduced motion (the repo's forced test mode):
// sources register by id and clicks mark them; targets render the panel
// with no transform (a crossfade), in every placement.
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ZoomLink, ZoomTarget } from './Zoom';
import { __clearZoomSources, consumeZoomSource } from './zoomRegistry';

describe('ZoomLink', () => {
  it('registers its element and marks it used on click', () => {
    __clearZoomSources();
    const { container, unmount } = render(<ZoomLink zoomId="test:rec:1"><p>Card</p></ZoomLink>);
    const link = container.querySelector('[data-zoom-link="test:rec:1"]') as HTMLElement;
    expect(link.tagName).toBe('DIV');
    fireEvent.click(link);
    expect(consumeZoomSource('test:rec:1')).toBe(link);
    unmount();
    expect(consumeZoomSource('test:rec:1')).toBeNull();
  });

  it('renders inline for thumbnails', () => {
    const { container } = render(<ZoomLink zoomId="test:thumb:1" inline><i>i</i></ZoomLink>);
    expect((container.querySelector('[data-zoom-link="test:thumb:1"]') as HTMLElement).tagName).toBe('SPAN');
  });
});

describe('ZoomTarget (reduced motion)', () => {
  it('renders the panel with no transform in both placements', () => {
    for (const placement of ['center', 'right'] as const) {
      const { container, unmount } = render(
        <ZoomLink zoomId={`test:panel:${placement}`}><p>Source</p></ZoomLink>,
      );
      const link = container.querySelector(`[data-zoom-link="test:panel:${placement}"]`) as HTMLElement;
      fireEvent.click(link);
      const view = render(<ZoomTarget zoomId={`test:panel:${placement}`} placement={placement}><p>Detail</p></ZoomTarget>);
      const panel = view.container.querySelector('[data-zoom-panel]') as HTMLElement;
      expect(panel).toBeInTheDocument();
      expect(panel.dataset.zoomMode).toBe('reduce');
      expect(panel.style.transform).toBe('');
      view.unmount();
      unmount();
    }
  });
});
