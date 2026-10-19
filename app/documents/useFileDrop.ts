// app/documents/useFileDrop.ts — drop files anywhere on the page, or paste a picture (a screenshot, a copied image), to start an
// upload. Only real files react: dragging text or a link around the page does nothing. A pasted picture gets a dated name instead of "image.png".
'use client';

import { useEffect, useState } from 'react';
import { toLocalISODate } from '@/lib/dates';

const stamp = () => { const d = new Date(); return `${toLocalISODate(d)} ${String(d.getHours()).padStart(2, '0')}-${String(d.getMinutes()).padStart(2, '0')}`; };
const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files');

/** A file pasted from the clipboard arrives called "image.png" every time; give it a name that tells one from another. */
export function nameForPasted(file: File): File {
  if (!/^image\.\w+$/i.test(file.name)) return file;
  return new File([file], `Pasted image ${stamp()}.${file.name.split('.').pop()}`, { type: file.type });
}

/** `dragging` is true while files are held over the page. Pass a stable `onFiles`. */
export function useFileDrop(enabled: boolean, onFiles: (files: File[]) => void): boolean {
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let depth = 0;
    const enter = (e: DragEvent) => { if (hasFiles(e)) { depth += 1; setDragging(true); } };
    const leave = (e: DragEvent) => { if (hasFiles(e)) { depth = Math.max(0, depth - 1); if (depth === 0) setDragging(false); } };
    const over = (e: DragEvent) => { if (hasFiles(e)) e.preventDefault(); };
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault(); depth = 0; setDragging(false);
      const files = Array.from(e.dataTransfer?.files ?? []);
      if (files.length) onFiles(files);
    };
    const paste = (e: ClipboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable)) return;
      const files = Array.from(e.clipboardData?.files ?? []).map(nameForPasted);
      if (files.length) { e.preventDefault(); onFiles(files); }
    };
    window.addEventListener('dragenter', enter); window.addEventListener('dragleave', leave); window.addEventListener('dragover', over);
    window.addEventListener('drop', drop); window.addEventListener('paste', paste);
    return () => {
      window.removeEventListener('dragenter', enter); window.removeEventListener('dragleave', leave); window.removeEventListener('dragover', over);
      window.removeEventListener('drop', drop); window.removeEventListener('paste', paste);
      setDragging(false);
    };
  }, [enabled, onFiles]);

  return dragging;
}
