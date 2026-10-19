// app/documents/viewer/useFetchedFile.ts — read a stored file into the page so it can be drawn (Word, spreadsheet, text) or printed.
// The storage server allows this from the app (it answers with Access-Control-Allow-Origin: *). The answer is kept per address,
// so moving to another file shows "loading" at once instead of the previous file's content.
'use client';

import { useEffect, useState } from 'react';

/** Larger than this and drawing it in the page would freeze the tab: the person is told to download it instead. */
export const MAX_INLINE_BYTES = 40 * 1024 * 1024;

type Shape = 'text' | 'buffer' | 'blob';
type Data<S extends Shape> = S extends 'text' ? string : S extends 'buffer' ? ArrayBuffer : Blob;
type Answer<S extends Shape> = { url: string; data?: Data<S>; error?: string };

export interface FetchedFile<S extends Shape> { status: 'loading' | 'ready' | 'error'; data: Data<S> | null; error: string | null }

export function useFetchedFile<S extends Shape>(url: string, shape: S, enabled = true): FetchedFile<S> {
  const [answer, setAnswer] = useState<Answer<S> | null>(null);

  useEffect(() => {
    if (!enabled || !url) return;
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`The file could not be loaded (the server said ${res.status}).`);
        const length = Number(res.headers.get('content-length') ?? 0);
        if (length > MAX_INLINE_BYTES) throw new Error('This file is too large to open in the page. Download it instead.');
        const data = (shape === 'text' ? await res.text() : shape === 'buffer' ? await res.arrayBuffer() : await res.blob()) as Data<S>;
        setAnswer({ url, data });
      } catch (e) {
        if (controller.signal.aborted) return;
        setAnswer({ url, error: e instanceof TypeError ? 'The file could not be reached. Check the connection and try again.' : e instanceof Error ? e.message : 'The file could not be loaded.' });
      }
    })();
    return () => controller.abort();
  }, [url, shape, enabled]);

  const mine = answer && answer.url === url ? answer : null;
  if (!mine) return { status: 'loading', data: null, error: null };
  if (mine.error) return { status: 'error', data: null, error: mine.error };
  return { status: 'ready', data: mine.data ?? null, error: null };
}
