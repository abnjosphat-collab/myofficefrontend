// app/documents/viewer/printing.ts — print from inside the page, with no download first. Everything prints through a hidden frame, so
// the page behind the viewer is never printed by mistake and nothing is left on screen afterwards.
import type { PrintRoute } from '../documentLogic';

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function hiddenFrame(): HTMLIFrameElement {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.tabIndex = -1;
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  document.body.appendChild(frame);
  return frame;
}

/** Remove the frame once the print dialog has been dealt with (or, if the browser never says so, after a minute). */
function cleanUpLater(frame: HTMLIFrameElement, extra?: () => void): void {
  const done = () => { frame.remove(); extra?.(); };
  frame.contentWindow?.addEventListener('afterprint', () => setTimeout(done, 500), { once: true });
  setTimeout(done, 60_000);
}

/** Print a piece of HTML (a drawn Word file, a table, plain text, an image). Waits for its images first. */
export async function printHtml(html: string, title: string, css = ''): Promise<void> {
  const frame = hiddenFrame();
  const doc = frame.contentDocument;
  if (!doc || !frame.contentWindow) { frame.remove(); throw new Error('This browser would not open the print dialog.'); }
  doc.open();
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>body{margin:0;font-family:system-ui,sans-serif;color:black}${css}</style></head><body>${html}</body></html>`);
  doc.close();
  await Promise.all(Array.from(doc.images).map(img => (img.complete ? null : new Promise(resolve => { img.onload = img.onerror = () => resolve(null); }))));
  frame.contentWindow.focus();
  frame.contentWindow.print();
  cleanUpLater(frame);
}

/** An image, fitted to the page. */
export const printImage = (url: string, title: string) =>
  printHtml(`<img src="${escapeHtml(url)}" alt="" style="max-width:100%;max-height:100vh;display:block;margin:0 auto">`, title, '@page{margin:12mm}');

/** A PDF held in memory: shown in a hidden frame and printed from there. */
export function printPdf(blob: Blob): Promise<void> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const frame = hiddenFrame();
    frame.onload = () => {
      try {
        frame.contentWindow?.focus();
        frame.contentWindow?.print();
        resolve();
      } catch (e) {
        reject(e instanceof Error ? e : new Error('This browser would not open the print dialog.'));
      }
    };
    frame.src = objectUrl;
    cleanUpLater(frame, () => URL.revokeObjectURL(objectUrl));
  });
}

/** Plain text, keeping its line breaks. */
export const printText = (text: string, title: string) =>
  printHtml(`<pre>${escapeHtml(text)}</pre>`, title, 'pre{white-space:pre-wrap;word-break:break-word;font:12px/1.5 ui-monospace,monospace;margin:12mm}');

/** A table of rows of cells (a spreadsheet sheet). */
export function printTable(rows: readonly (readonly string[])[], title: string): Promise<void> {
  const body = rows.map(r => `<tr>${r.map(c => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`).join('');
  return printHtml(`<h1>${escapeHtml(title)}</h1><table>${body}</table>`, title, 'h1{font-size:14px;margin:8mm 8mm 3mm}table{border-collapse:collapse;margin:0 8mm;font-size:11px}td{border:1px solid gray;padding:2px 5px;vertical-align:top}@page{size:landscape;margin:8mm}');
}

/** Fetch a stored PDF and print it, page for page as its author laid it out. */
async function printStoredPdf(url: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`the server said ${res.status}`);
  await printPdf(await res.blob());
}

/**
 * Print a file without opening it: its PDF print copy, or the PDF or picture itself. Returns false for a file the page must
 * draw first (a Word file or a spreadsheet with no print copy): open it and print from the viewer.
 */
export async function printWithoutOpening(doc: { url: string; name: string; printCopyUrl: string }, route: PrintRoute): Promise<boolean> {
  if (route === 'copy') { await printStoredPdf(doc.printCopyUrl); return true; }
  if (route === 'pdf') { await printStoredPdf(doc.url); return true; }
  if (route === 'image') { await printImage(doc.url, doc.name); return true; }
  return false;
}
