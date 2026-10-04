// app/documents/documentLogic.ts — pure rules for the hub: how a stored row becomes a document, how files are typed and
// sized, the folder list a category shows, and the filters and sort a folder offers.
import type { IconMeaning, Tone } from '@/components/ui-system';
import type { DocumentFile, Folder, FolderEntry } from './types';

export const FILE_TYPES: Record<string, { label: string; icon: IconMeaning; tone: Tone }> = {
  pdf: { label: 'PDF', icon: 'pdf', tone: 'danger' },
  document: { label: 'Document', icon: 'documents', tone: 'info' },
  spreadsheet: { label: 'Spreadsheet', icon: 'sheet-view', tone: 'success' },
  image: { label: 'Image', icon: 'image', tone: 'brand' },
  video: { label: 'Video', icon: 'attachment', tone: 'warning' },
  audio: { label: 'Audio', icon: 'attachment', tone: 'warning' },
  archive: { label: 'Archive', icon: 'archive', tone: 'neutral' },
  file: { label: 'File', icon: 'attachment', tone: 'neutral' },
};
export const typeMeta = (type: string) => FILE_TYPES[type] ?? FILE_TYPES.file;

const EXTENSIONS: Record<string, string[]> = {
  image: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'], video: ['mp4', 'avi', 'mov', 'wmv', 'mkv', 'webm'],
  audio: ['mp3', 'wav', 'ogg', 'm4a', 'flac'], document: ['doc', 'docx', 'txt', 'md', 'rtf'],
  spreadsheet: ['xls', 'xlsx', 'csv'], pdf: ['pdf'], archive: ['zip', 'rar', '7z', 'tar', 'gz'],
};
/** The file type the server will give this name (mirrors the backend so the upload list shows the same). */
export function fileTypeOf(filename: string): string {
  const ext = filename.includes('.') ? filename.split('.').pop()!.toLowerCase() : '';
  return Object.keys(EXTENSIONS).find(t => EXTENSIONS[t].includes(ext)) ?? 'file';
}

export { formatFileSize as formatSize } from '@/lib/format';

export function fromRow(row: Record<string, unknown>): DocumentFile {
  return {
    id: String(row.id), name: String(row.name ?? row.original_name ?? 'Untitled'), originalName: String(row.original_name ?? row.name ?? ''),
    type: String(row.file_type ?? 'file'), categoryId: String(row.category_id ?? ''), categoryName: String(row.category_name ?? ''),
    folder: row.folder_id ? String(row.folder_id) : null, size: Number(row.file_size ?? 0), starred: Boolean(row.starred),
    description: String(row.description ?? ''), createdAt: String(row.created_at ?? ''), updatedAt: String(row.updated_at ?? row.created_at ?? ''),
    url: String(row.file_url ?? ''),
  };
}

/** Built-in folders first, then the custom ones. A custom folder that shares a built-in name is the same folder, shown once. */
export function mergeFolders(builtIn: string[], custom: Folder[]): FolderEntry[] {
  const known = new Set(builtIn);
  return [...builtIn.map(name => ({ name, builtIn: true })), ...custom.filter(f => !known.has(f.name)).map(f => ({ name: f.name, id: f.id, builtIn: false }))];
}

export type View = 'all' | 'starred' | 'recent';
export type SortKey = 'name' | 'type' | 'size' | 'date';
export interface DocFilters { search: string; view: View; type: string; added: 'all' | 'today' | 'week' | 'month'; size: 'all' | 'small' | 'medium' | 'large' }
export const NO_FILTERS: DocFilters = { search: '', view: 'all', type: 'all', added: 'all', size: 'all' };
export const isFiltered = (f: DocFilters) => f.search.trim() !== '' || f.view !== 'all' || f.type !== 'all' || f.added !== 'all' || f.size !== 'all';

const MB = 1024 * 1024;
const daysAgo = (now: Date, n: number) => { const d = new Date(now); d.setDate(d.getDate() - n); return d; };
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export function filterDocuments(docs: DocumentFile[], f: DocFilters, now = new Date()): DocumentFile[] {
  const q = f.search.trim().toLowerCase();
  return docs.filter(d => {
    if (q && !d.name.toLowerCase().includes(q) && !d.description.toLowerCase().includes(q) && !d.originalName.toLowerCase().includes(q)) return false;
    if (f.type !== 'all' && d.type !== f.type) return false;
    if (f.view === 'starred' && !d.starred) return false;
    if (f.view === 'recent' && !(new Date(d.updatedAt) > daysAgo(now, 7))) return false;
    const added = new Date(d.createdAt);
    if (f.added === 'today' && !sameDay(added, now)) return false;
    if (f.added === 'week' && !(added > daysAgo(now, 7))) return false;
    if (f.added === 'month' && !(added > daysAgo(now, 30))) return false;
    if (f.size === 'small' && d.size >= MB) return false;
    if (f.size === 'medium' && (d.size < MB || d.size >= 10 * MB)) return false;
    if (f.size === 'large' && d.size < 10 * MB) return false;
    return true;
  });
}

export function sortDocuments(docs: DocumentFile[], key: SortKey, dir: 'asc' | 'desc'): DocumentFile[] {
  const value = (d: DocumentFile): string | number => (key === 'name' ? d.name.toLowerCase() : key === 'type' ? d.type : key === 'size' ? d.size : new Date(d.createdAt).getTime() || 0);
  const sign = dir === 'asc' ? 1 : -1;
  return [...docs].sort((a, b) => { const x = value(a), y = value(b); return x === y ? 0 : (x > y ? 1 : -1) * sign; });
}

/** Search results stop at this many on the server, so a result list that reaches it may be missing matches. */
export const SEARCH_LIMIT = 100;
