/**
 * @/components/ui-system/motion/zoomRegistry — stable-id lookup for zoom
 * sources. A zoom source (a card, a row thumbnail, a New button) registers
 * its element under a stable id (`maintenance:order:12`); the zoom target
 * looks the element up when the zoom opens and again when it closes. The
 * registry never holds a node across an open: disconnected elements are
 * skipped, and the click that opened the zoom disambiguates when two
 * sources share one id (a header New button and its empty-state twin).
 */

/** Currently mounted source elements by stable id. Last mount wins. */
const registered = new Map<string, HTMLElement>();
/** The source the last click landed on, by id. Consumed when a zoom opens. */
const lastUsed = new Map<string, HTMLElement>();

function live(el: HTMLElement | undefined): el is HTMLElement {
  return !!el && el.isConnected;
}

/** A ZoomLink mount. Unregister with the same element on unmount. */
export function registerZoomSource(id: string, el: HTMLElement): void {
  registered.set(id, el);
}

/** A ZoomLink unmount. Only clears when the same element is registered. */
export function unregisterZoomSource(id: string, el: HTMLElement): void {
  if (registered.get(id) === el) registered.delete(id);
  if (lastUsed.get(id) === el) lastUsed.delete(id);
}

/** A click (or keyboard activation) landed on this source. */
export function markZoomSourceUsed(id: string, el: HTMLElement): void {
  lastUsed.set(id, el);
}

function pick(id: string): HTMLElement | null {
  const used = lastUsed.get(id);
  if (live(used)) return used;
  const reg = registered.get(id);
  if (live(reg)) return reg;
  return null;
}

/**
 * The element to zoom from, or null when the source is gone (filtered
 * away, unmounted, on another page). The caller measures it now and keeps
 * nothing: look it up again when the zoom closes.
 */
export function lookupZoomSource(id: string): HTMLElement | null {
  return pick(id);
}

/**
 * Like lookup, and clears the last-used mark, so a later open that was not
 * started from a source (a row Edit button, a deep link) falls back to the
 * plain open instead of reusing a stale click.
 */
export function consumeZoomSource(id: string): HTMLElement | null {
  const el = pick(id);
  lastUsed.delete(id);
  return el;
}

/** Test-only: empty the registry between cases. */
export function __clearZoomSources(): void {
  registered.clear();
  lastUsed.clear();
}
