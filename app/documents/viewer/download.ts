// app/documents/viewer/download.ts — save a stored file to the computer under its proper name. A browser ignores the "download name"
// of a link to another address, so the file is read first and saved from memory; if that fails the file opens in a new tab instead.
import { downloadName } from '../documentLogic';
import type { DocumentFile } from '../types';

export async function saveFile(doc: Pick<DocumentFile, 'url' | 'name' | 'ext'>): Promise<void> {
  if (!doc.url) throw new Error(`${doc.name} has no stored link.`);
  try {
    const res = await fetch(doc.url);
    if (!res.ok) throw new Error(`the server said ${res.status}`);
    const objectUrl = URL.createObjectURL(await res.blob());
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = downloadName(doc);
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
  } catch {
    window.open(doc.url, '_blank', 'noopener,noreferrer');
  }
}

export const openInNewTab = (doc: Pick<DocumentFile, 'url'>): void => { if (doc.url) window.open(doc.url, '_blank', 'noopener,noreferrer'); };
