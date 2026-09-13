/** Pointer-driven horizontal fill — sync listeners (no useEffect race on mouseup). */

export type FillDragState = { empId: string; sourceDayIndex: number; endDayIndex: number };

export const FILL_DRAG_THRESHOLD_PX = 5;

export function dayIndexFromPoint(clientX: number, clientY: number, empId: string): number | null {
  const under = document.elementFromPoint(clientX, clientY);
  const cell = under?.closest('[data-fill-cell]') as HTMLElement | null;
  if (!cell || cell.dataset.empId !== empId) return null;
  const idx = Number(cell.dataset.dayIndex);
  return Number.isNaN(idx) ? null : idx;
}

export function attachFillPointerDrag(opts: {
  empId: string;
  sourceDayIndex: number;
  pointerId: number;
  captureEl: HTMLElement;
  startClientX: number;
  startClientY: number;
  scrollEl: HTMLElement | null;
  onPreview: (drag: FillDragState) => void;
  onCommit: (drag: FillDragState) => void;
  onCancel: () => void;
}): () => void {
  const {
    empId, sourceDayIndex, pointerId, captureEl, startClientX, startClientY, scrollEl,
    onPreview, onCommit, onCancel,
  } = opts;

  let drag: FillDragState = { empId, sourceDayIndex, endDayIndex: sourceDayIndex };
  let movedPx = 0;
  let scrollVel = 0;
  let scrollRaf: number | null = null;

  const stopScroll = () => {
    scrollVel = 0;
    if (scrollRaf != null) {
      cancelAnimationFrame(scrollRaf);
      scrollRaf = null;
    }
  };

  const scrollLoop = () => {
    if (!scrollEl || scrollVel === 0) {
      scrollRaf = null;
      return;
    }
    scrollEl.scrollLeft += scrollVel;
    scrollRaf = requestAnimationFrame(scrollLoop);
  };

  const updateScroll = (clientX: number) => {
    if (!scrollEl) return;
    const rect = scrollEl.getBoundingClientRect();
    const EDGE = 72;
    if (clientX > rect.right - EDGE) scrollVel = 36;
    else if (clientX < rect.left + EDGE) scrollVel = -36;
    else scrollVel = 0;
    if (scrollVel !== 0 && scrollRaf == null) scrollRaf = requestAnimationFrame(scrollLoop);
    if (scrollVel === 0) stopScroll();
  };

  const move = (clientX: number, clientY: number) => {
    movedPx = Math.max(movedPx, Math.abs(clientX - startClientX));
    updateScroll(clientX);
    const idx = dayIndexFromPoint(clientX, clientY, empId);
    if (idx != null) drag = { ...drag, endDayIndex: idx };
    onPreview(drag);
  };

  const finish = (commit: boolean) => {
    stopScroll();
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
    try { captureEl.releasePointerCapture(pointerId); } catch { /* already released */ }
    if (commit && movedPx >= FILL_DRAG_THRESHOLD_PX && drag.endDayIndex !== drag.sourceDayIndex) {
      onCommit(drag);
    } else {
      onCancel();
    }
  };

  const onPointerMove = (e: PointerEvent) => {
    if (e.pointerId !== pointerId) return;
    e.preventDefault();
    move(e.clientX, e.clientY);
  };

  const onPointerUp = (e: PointerEvent) => {
    if (e.pointerId !== pointerId) return;
    finish(true);
  };

  try { captureEl.setPointerCapture(pointerId); } catch { /* ignore */ }

  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);
  move(startClientX, startClientY);
  onPreview(drag);

  return () => finish(false);
}
