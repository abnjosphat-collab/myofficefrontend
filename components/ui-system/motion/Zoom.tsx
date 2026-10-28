'use client';

import { AnimatePresence, motion, useAnimate, usePresence } from 'framer-motion';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { FADE, SPRING } from './presets';
import { useIsReducedMotion } from './useMotionSafe';
import { consumeZoomSource, lookupZoomSource, markZoomSourceUsed, registerZoomSource, unregisterZoomSource } from './zoomRegistry';

export interface ZoomLinkProps {
  /** Stable id the target looks up (`maintenance:order:12`). Namespaced per page. */
  zoomId: string;
  /** Render an inline span (table thumbnails) instead of a block div (cards, buttons). */
  inline?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * A zoom source: the card, thumbnail or button the detail grows out of and
 * shrinks back into. Registers its element under `zoomId` while mounted;
 * the click that opens the detail marks it as the used source, so two
 * same-id buttons (a header New and its empty-state twin) disambiguate.
 */
export function ZoomLink({ zoomId, inline = false, className, children }: ZoomLinkProps) {
  const current = useRef<HTMLElement | null>(null);
  const setRef = useCallback((el: HTMLElement | null) => {
    if (current.current) unregisterZoomSource(zoomId, current.current);
    current.current = el;
    if (el) registerZoomSource(zoomId, el);
  }, [zoomId]);
  useEffect(() => () => {
    if (current.current) unregisterZoomSource(zoomId, current.current);
    current.current = null;
  }, [zoomId]);
  const markUsed = useCallback((event: MouseEvent<HTMLElement>) => {
    markZoomSourceUsed(zoomId, event.currentTarget);
  }, [zoomId]);
  if (inline) {
    return <span ref={setRef as (el: HTMLSpanElement | null) => void} onClickCapture={markUsed} className={className} data-zoom-link={zoomId}>{children}</span>;
  }
  return <div ref={setRef as (el: HTMLDivElement | null) => void} onClickCapture={markUsed} className={className} data-zoom-link={zoomId}>{children}</div>;
}

interface Rect { x: number; y: number; width: number; height: number }

function rectOf(el: Element): Rect {
  const r = el.getBoundingClientRect();
  return { x: r.x, y: r.y, width: r.width, height: r.height };
}

function hasSize(r: Rect): boolean {
  return r.width > 0 && r.height > 0;
}

/** Fully or partly inside the viewport. Off-screen sources fall back. */
function onScreen(r: Rect): boolean {
  if (!hasSize(r)) return false;
  const w = window.innerWidth;
  const h = window.innerHeight;
  return r.x < w && r.y < h && r.x + r.width > 0 && r.y + r.height > 0;
}

/**
 * The transform that maps the panel's box onto the source's: scale plus
 * translate, about the centre. The panel springs from this to identity.
 */
function zoomStart(source: Rect, panel: Rect): { scaleX: number; scaleY: number; x: number; y: number } {
  return {
    scaleX: source.width / panel.width,
    scaleY: source.height / panel.height,
    x: (source.x + source.width / 2) - (panel.x + panel.width / 2),
    y: (source.y + source.height / 2) - (panel.y + panel.height / 2),
  };
}

export interface ZoomTargetProps {
  /** Stable id of the source to grow out of. Missing/off-screen → the normal open. */
  zoomId: string;
  /** Which fallback to take: the drawer edge-slide or the dialog scale+fade. */
  placement?: 'center' | 'right';
  className?: string;
  children: ReactNode;
}

type ZoomMode = 'zoom' | 'fallback' | 'reduce';

/**
 * The zoom half of a dialog/drawer panel: grows out of the looked-up source
 * and shrinks back into it on close (re-looked-up, never held). Reversible
 * mid-flight — springs retarget, so closing mid-open never jerks. Under
 * reduced motion (or a missing source) it is a crossfade (or the placement's
 * normal open). Must render inside a ZoomBoundary with a stable key.
 */
export function ZoomTarget({ zoomId, placement = 'center', className, children }: ZoomTargetProps) {
  const reduce = useIsReducedMotion();
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const [isPresent, safeToRemove] = usePresence();
  // Whether THIS open zoomed (a boolean, never the node). Decided at open,
  // honoured at close; the source element is looked up fresh both times.
  const didZoom = useRef(false);
  const [mode, setMode] = useState<ZoomMode>(reduce ? 'reduce' : 'fallback');

  // Enter. useLayoutEffect: the jump to the start pose happens before paint,
  // so the first visible frame is already the zoom, never a flash.
  useLayoutEffect(() => {
    if (!isPresent || !scope.current) return;
    const panel = scope.current;
    if (reduce) {
      setMode('reduce');
      didZoom.current = false;
      animate(panel, { opacity: 0 }, { duration: 0 });
      const fade = animate(panel, { opacity: 1 }, FADE);
      return () => fade.stop();
    }
    const source = consumeZoomSource(zoomId);
    const panelRect = rectOf(panel);
    if (source && hasSize(panelRect)) {
      const sourceRect = rectOf(source);
      if (onScreen(sourceRect)) {
        setMode('zoom');
        didZoom.current = true;
        const start = zoomStart(sourceRect, panelRect);
        animate(panel, { ...start, opacity: 0 }, { duration: 0 });
        const move = animate(panel, { scaleX: 1, scaleY: 1, x: 0, y: 0 }, SPRING.gentle);
        const fade = animate(panel, { opacity: 1 }, SPRING.quick);
        return () => { move.stop(); fade.stop(); };
      }
    }
    // Fallback: the placement's normal open.
    setMode('fallback');
    didZoom.current = false;
    if (placement === 'right') {
      animate(panel, { x: '100%' }, { duration: 0 });
      const slide = animate(panel, { x: 0 }, SPRING.gentle);
      return () => slide.stop();
    }
    animate(panel, { scale: 0.98, opacity: 0 }, { duration: 0 });
    const grow = animate(panel, { scale: 1 }, SPRING.smooth);
    const fade = animate(panel, { opacity: 1 }, SPRING.quick);
    return () => { grow.stop(); fade.stop(); };
    // Runs once per mount; the exit is the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPresent]);

  // Exit. Runs only while AnimatePresence keeps the panel mounted for it.
  useEffect(() => {
    if (isPresent || !scope.current) return;
    const panel = scope.current;
    const finish = () => safeToRemove();
    if (reduce) {
      const fade = animate(panel, { opacity: 0 }, FADE);
      fade.then(finish, finish);
      return () => fade.stop();
    }
    if (didZoom.current) {
      const source = lookupZoomSource(zoomId);
      const panelRect = rectOf(panel);
      if (source && hasSize(panelRect)) {
        const sourceRect = rectOf(source);
        if (onScreen(sourceRect)) {
          const back = zoomStart(sourceRect, panelRect);
          const move = animate(panel, back, SPRING.gentle);
          const fade = animate(panel, { opacity: 0 }, SPRING.quick);
          const done = Promise.allSettled([move, fade]).then(finish, finish);
          void done;
          return () => { move.stop(); fade.stop(); };
        }
      }
    }
    if (placement === 'right') {
      const slide = animate(panel, { x: '100%' }, SPRING.gentle);
      slide.then(finish, finish);
      return () => slide.stop();
    }
    const shrink = animate(panel, { scale: 0.98 }, SPRING.smooth);
    const fade = animate(panel, { opacity: 0 }, SPRING.quick);
    const done = Promise.allSettled([shrink, fade]).then(finish, finish);
    void done;
    return () => { shrink.stop(); fade.stop(); };
  }, [isPresent, reduce, zoomId, placement, animate, safeToRemove, scope]);

  return (
    <motion.div
      ref={scope}
      className={className}
      data-zoom-panel={zoomId}
      data-zoom-mode={mode}
      data-zoom-fallback={mode === 'fallback' ? 'true' : undefined}
      style={{ transformOrigin: 'center' }}
    >
      {children}
    </motion.div>
  );
}

/**
 * The AnimatePresence boundary a ZoomTarget needs. `initial={false}`: a
 * dialog that mounts already open (a deep link) pops in instead of
 * performing its enter on page load; every real open still animates.
 */
export function ZoomBoundary({ children }: { children: ReactNode }) {
  return <AnimatePresence initial={false}>{children}</AnimatePresence>;
}

/**
 * The overlay half of a zoom dialog: a plain crossfade in and out (FADE),
 * the same in both motion modes — a fade IS the reduced-motion swap.
 */
export function ZoomOverlay({ className }: { className?: string }) {
  return (
    <motion.div
      data-zoom-overlay=""
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={FADE}
    />
  );
}
