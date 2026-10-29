// app/documents/documentLogic.ts — the pure rules of the document library page: what each kind of file is called and drawn as,
// which files can be previewed or printed in the page, how the person's search and filters become one server request, how the
// folder tree is built and walked, and how a match is highlighted. No React and no network, so every rule has a plain test.
import type { IconMeaning, Tone } from '@/components/ui-system';
import { toLocalISODate } from '@/lib/dates';
import { formatFileSize } from '@/lib/format';
import type { ActivityEntry, DatePreset, DocFilters, DocFolder, DocumentFile, FolderNode, Place, SizePreset, SortId } from './types';

export { formatFileSize as formatSize };

// ── Kinds of file ────────────────────────────────────────────────────────────────────────────────────────────────────
export const FILE_TYPES: Record<string, { label: string; plural: string; icon: IconMeaning; tone: Tone }> = {
  pdf: { label: 'PDF', plural: 'PDFs', icon: 'pdf', tone: 'danger' },
  document: { label: 'Word document', plural: 'Word documents', icon: 'file-word', tone: 'info' },
  spreadsheet: { label: 'Spreadsheet', plural: 'Spreadsheets', icon: 'sheet-view', tone: 'success' },
  presentation: { label: 'Presentation', plural: 'Presentations', icon: 'file-slides', tone: 'warning' },
  text: { label: 'Text', plural: 'Text files', icon: 'file-text', tone: 'neutral' },
  image: { label: 'Image', plural: 'Images', icon: 'image', tone: 'brand' },
  audio: { label: 'Audio', plural: 'Audio', icon: 'file-audio', tone: 'warning' },
  video: { label: 'Video', plural: 'Videos', icon: 'file-video', tone: 'warning' },
  archive: { label: 'Archive', plural: 'Archives', icon: 'file-zip', tone: 'neutral' },
  email: { label: 'Email', plural: 'Emails', icon: 'mail', tone: 'info' },
  drawing: { label: 'Drawing', plural: 'Drawings', icon: 'file-drawing', tone: 'neutral' },
  file: { label: 'Other file', plural: 'Other files', icon: 'attachment', tone: 'neutral' },
};
export const TYPE_ORDER = Object.keys(FILE_TYPES);
export const typeMeta = (type: string) => FILE_TYPES[type] ?? FILE_TYPES.file;

/** The kind the server will give a file name (mirrors backend/app/document_rules.py so the upload list shows the same). */
const EXTENSIONS: Record<string, string[]> = {
  pdf: ['pdf'], document: ['doc', 'docx', 'rtf', 'odt'], spreadsheet: ['xls', 'xlsx', 'xlsm', 'csv', 'tsv', 'ods'],
  presentation: ['ppt', 'pptx', 'pps', 'ppsx', 'odp'], text: ['txt', 'md', 'log', 'json', 'xml'],
  image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tif', 'tiff', 'svg', 'heic', 'heif', 'avif', 'ico'],
  audio: ['mp3', 'wav', 'm4a', 'ogg', 'oga', 'aac', 'flac', 'opus', 'wma', 'amr'],
  video: ['mp4', 'mov', 'avi', 'wmv', 'mkv', 'webm', 'm4v', '3gp', 'mpg', 'mpeg'],
  archive: ['zip', 'rar', '7z', 'tar', 'gz'], email: ['eml', 'msg'], drawing: ['dwg', 'dxf'],
};
export const UPLOAD_EXTENSIONS = new Set(Object.values(EXTENSIONS).flat());
/** For the file picker's `accept` attribute. */
export const UPLOAD_ACCEPT = [...UPLOAD_EXTENSIONS].map(e => `.${e}`).join(',');
export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

export const extOf = (filename: string): string => {
  const name = filename.trim().toLowerCase();
  return name.includes('.') && name.replace(/^\.+/, '').includes('.') ? name.split('.').pop()! : '';
};
export const fileTypeOf = (filename: string): string => Object.keys(EXTENSIONS).find(t => EXTENSIONS[t].includes(extOf(filename))) ?? 'file';

/** Why a file cannot be uploaded, or null when it can. */
export function uploadProblem(file: { name: string; size: number }): string | null {
  if (!UPLOAD_EXTENSIONS.has(extOf(file.name))) return extOf(file.name) ? `.${extOf(file.name)} files are not accepted here.` : 'Files without an extension are not accepted.';
  if (file.size === 0) return 'The file is empty.';
  if (file.size > MAX_UPLOAD_BYTES) return `Larger than the ${formatFileSize(MAX_UPLOAD_BYTES)} limit.`;
  return null;
}

// ── Preview and print ────────────────────────────────────────────────────────────────────────────────────────────────
export type PreviewKind = 'image' | 'pdf' | 'audio' | 'video' | 'text' | 'docx' | 'sheet' | 'office' | 'none';
const IMAGE = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'avif', 'ico']);
const AUDIO = new Set(['mp3', 'wav', 'm4a', 'ogg', 'oga', 'aac', 'flac', 'opus']);
const VIDEO = new Set(['mp4', 'webm', 'm4v', 'mov', 'ogv']);
const TEXT = new Set(['txt', 'md', 'log', 'json', 'xml']);
const SHEET = new Set(['xlsx', 'xlsm', 'xls', 'csv', 'tsv', 'ods']);
/** Formats a browser cannot draw by itself and this page cannot convert: shown through Microsoft's viewer when the person asks. */
const OFFICE_ONLY = new Set(['doc', 'rtf', 'odt', 'ppt', 'pptx', 'pps', 'ppsx', 'odp']);

/** How a file can be shown inside the page. */
export function previewKind(ext: string): PreviewKind {
  const e = ext.toLowerCase();
  if (e === 'pdf') return 'pdf';
  if (e === 'docx') return 'docx';
  if (IMAGE.has(e)) return 'image';
  if (AUDIO.has(e)) return 'audio';
  if (VIDEO.has(e)) return 'video';
  if (TEXT.has(e)) return 'text';
  if (SHEET.has(e)) return 'sheet';
  if (OFFICE_ONLY.has(e)) return 'office';
  return 'none';
}
/** Kinds that print from inside the page. A "office" file prints from Microsoft's viewer; the rest cannot be printed here. */
export const canPrint = (kind: PreviewKind): boolean => kind === 'image' || kind === 'pdf' || kind === 'text' || kind === 'docx' || kind === 'sheet';

/**
 * How a file prints, best first. 'copy': its PDF print copy, the author's exact pages. 'pdf' / 'image': the file itself, exact.
 * 'render': the page draws it (Word, a spreadsheet, text) and prints that, close but not the author's layout. 'none': it cannot.
 */
export type PrintRoute = 'copy' | 'pdf' | 'image' | 'render' | 'none';
export function printRoute(doc: Pick<DocumentFile, 'ext' | 'printCopyUrl'>): PrintRoute {
  if (doc.printCopyUrl) return 'copy';
  const kind = previewKind(doc.ext);
  if (kind === 'pdf' || kind === 'image') return kind;
  return canPrint(kind) ? 'render' : 'none';
}
/** Files whose own layout the browser cannot reproduce (Word, Excel, PowerPoint...): these want a PDF print copy. */
export const takesPrintCopy = (doc: Pick<DocumentFile, 'ext'>): boolean => ['docx', 'sheet', 'office'].includes(previewKind(doc.ext));

/** The name a download is saved under: the display name, with the real extension when the display name has none. */
export function downloadName(doc: Pick<DocumentFile, 'name' | 'ext'>): string {
  return doc.ext && !doc.name.toLowerCase().endsWith(`.${doc.ext}`) ? `${doc.name}.${doc.ext}` : doc.name;
}

// ── Rows from the server ─────────────────────────────────────────────────────────────────────────────────────────────
export function fromRow(row: Record<string, unknown>): DocumentFile {
  return {
    id: String(row.id), name: String(row.name ?? row.original_name ?? 'Untitled'), originalName: String(row.original_name ?? row.name ?? ''),
    type: String(row.file_type ?? 'file'), ext: String(row.ext ?? ''), folderId: row.folder_ref ? String(row.folder_ref) : null,
    folderPath: String(row.folder_path ?? ''), size: Number(row.file_size ?? 0), starred: Boolean(row.starred),
    description: String(row.description ?? ''), tags: Array.isArray(row.tags) ? row.tags.map(String) : [], uploadedBy: String(row.uploaded_by ?? ''),
    createdAt: String(row.created_at ?? ''), updatedAt: String(row.updated_at ?? row.created_at ?? ''), url: String(row.file_url ?? ''),
    deletedAt: row.deleted_at ? String(row.deleted_at) : null, deletedBy: String(row.deleted_by ?? ''), foundInside: Boolean(row.found_inside),
    printCopyUrl: String(row.print_copy_url ?? ''), printCopyName: String(row.print_copy_name ?? ''), printCopySize: Number(row.print_copy_size ?? 0),
  };
}

export function folderFromRow(row: Record<string, unknown>): DocFolder {
  return {
    id: String(row.id), parentId: row.parent_id ? String(row.parent_id) : null, name: String(row.name ?? ''), sortOrder: Number(row.sort_order ?? 1000),
    seeded: Boolean(row.seed_key), quickPrint: row.seed_key === 'quick-print', description: String(row.description ?? ''), createdBy: String(row.created_by ?? ''),
    fileCount: Number(row.file_count ?? 0), totalCount: Number(row.total_count ?? 0),
  };
}

// ── The folder tree ──────────────────────────────────────────────────────────────────────────────────────────────────
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
const byOrder = (a: DocFolder, b: DocFolder) => a.sortOrder - b.sortOrder || collator.compare(a.name, b.name);
export const PATH_SEPARATOR = ' › ';

/** Folders as a tree: in the order the structure sets, then by name with numbers read as numbers ("2.10" after "2.9"). */
export function buildTree(folders: readonly DocFolder[]): FolderNode[] {
  const known = new Set(folders.map(f => f.id));
  const kids = new Map<string | null, DocFolder[]>();
  for (const f of folders) {
    const parent = f.parentId && known.has(f.parentId) ? f.parentId : null; // a folder whose parent is missing is shown at the top, not lost
    kids.set(parent, [...(kids.get(parent) ?? []), f]);
  }
  const grow = (parent: string | null, depth: number, seen: ReadonlySet<string>): FolderNode[] =>
    (kids.get(parent) ?? []).slice().sort(byOrder).filter(f => !seen.has(f.id)).map(f => ({ ...f, depth, children: grow(f.id, depth + 1, new Set([...seen, f.id])) }));
  return grow(null, 0, new Set());
}

export function flattenTree(nodes: readonly FolderNode[]): FolderNode[] {
  return nodes.flatMap(n => [n, ...flattenTree(n.children)]);
}

/** The folders from the top down to `id`, itself included. Empty for an unknown id. */
export function folderTrail(folders: readonly DocFolder[], id: string | null): DocFolder[] {
  const byId = new Map(folders.map(f => [f.id, f]));
  const trail: DocFolder[] = [];
  for (let current = id ? byId.get(id) : undefined; current && trail.length < 32; current = current.parentId ? byId.get(current.parentId) : undefined) trail.unshift(current);
  return trail;
}

export function descendantIds(folders: readonly DocFolder[], id: string): string[] {
  const out = [id];
  for (let i = 0; i < out.length; i += 1) for (const f of folders) if (f.parentId === out[i] && !out.includes(f.id)) out.push(f.id);
  return out;
}

/** "A › B › C" for a folder, "Unfiled" for none. */
export const pathLabel = (folders: readonly DocFolder[], id: string | null): string =>
  id ? folderTrail(folders, id).map(f => f.name).join(PATH_SEPARATOR) || 'Unfiled' : 'Unfiled';

/** A file's location for a list: the last two folders, with an ellipsis when the path is longer. */
export function shortLocation(path: string): string {
  if (!path) return 'Unfiled';
  const parts = path.split(' > ');
  return parts.length <= 2 ? parts.join(PATH_SEPARATOR) : `…${PATH_SEPARATOR}${parts.slice(-2).join(PATH_SEPARATOR)}`;
}

/** Folders whose name contains `text` (all folders for blank text), with the path that tells apart two folders of one name. */
export function matchFolders(folders: readonly DocFolder[], text: string): { folder: DocFolder; path: string }[] {
  const q = text.trim().toLowerCase();
  return folders
    .filter(f => !q || f.name.toLowerCase().includes(q))
    .map(folder => ({ folder, path: pathLabel(folders, folder.id) }))
    .sort((a, b) => collator.compare(a.path, b.path));
}

// ── Search and filters ───────────────────────────────────────────────────────────────────────────────────────────────
export const NO_FILTERS: DocFilters = {
  q: '', everywhere: false, subfolders: false, namesOnly: false, types: [], exts: [], tags: [], uploader: '', starred: false,
  added: 'any', from: '', to: '', size: 'any', sort: 'auto',
};

export const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'any', label: 'Any time' }, { value: 'today', label: 'Today' }, { value: 'week', label: 'Last 7 days' },
  { value: 'month', label: 'Last 30 days' }, { value: 'year', label: 'This year' }, { value: 'custom', label: 'Choose dates' },
];
export const SIZE_PRESETS: { value: SizePreset; label: string }[] = [
  { value: 'any', label: 'Any size' }, { value: 'small', label: 'Under 1 MB' }, { value: 'medium', label: '1 to 10 MB' }, { value: 'large', label: 'Over 10 MB' },
];
export const SORTS: { value: SortId; label: string; sort?: string; dir?: 'asc' | 'desc' }[] = [
  { value: 'auto', label: 'Automatic' },
  { value: 'relevance', label: 'Best match', sort: 'relevance' },
  { value: 'newest', label: 'Newest first', sort: 'date', dir: 'desc' },
  { value: 'oldest', label: 'Oldest first', sort: 'date', dir: 'asc' },
  { value: 'updated', label: 'Recently changed', sort: 'updated', dir: 'desc' },
  { value: 'name', label: 'Name, A to Z', sort: 'name', dir: 'asc' },
  { value: 'name-desc', label: 'Name, Z to A', sort: 'name', dir: 'desc' },
  { value: 'largest', label: 'Largest first', sort: 'size', dir: 'desc' },
  { value: 'smallest', label: 'Smallest first', sort: 'size', dir: 'asc' },
  { value: 'type', label: 'Type', sort: 'type', dir: 'asc' },
];

const MB = 1024 * 1024;
const SIZE_RANGE: Record<SizePreset, { min?: number; max?: number }> = {
  any: {}, small: { max: MB - 1 }, medium: { min: MB, max: 10 * MB - 1 }, large: { min: 10 * MB },
};
const daysBack = (now: Date, n: number): string => { const d = new Date(now); d.setDate(d.getDate() - n); return toLocalISODate(d); };

/** The first and last day (YYYY-MM-DD) a date filter allows; either may be empty. */
export function dateRange(f: Pick<DocFilters, 'added' | 'from' | 'to'>, now = new Date()): { from: string; to: string } {
  switch (f.added) {
    case 'today': return { from: toLocalISODate(now), to: toLocalISODate(now) };
    case 'week': return { from: daysBack(now, 6), to: '' };
    case 'month': return { from: daysBack(now, 29), to: '' };
    case 'year': return { from: `${now.getFullYear()}-01-01`, to: '' };
    case 'custom': return { from: f.from, to: f.to };
    default: return { from: '', to: '' };
  }
}

/** Any filter beyond the words typed. */
export const hasFilters = (f: DocFilters): boolean =>
  f.types.length > 0 || f.exts.length > 0 || f.tags.length > 0 || f.uploader !== '' || f.starred || f.added !== 'any' || f.size !== 'any';
/** Anything that narrows the files shown: words or filters. */
export const isNarrowed = (f: DocFilters): boolean => f.q.trim() !== '' || hasFilters(f);

/** The sort the server is asked for: "Automatic" is best match while searching and newest first otherwise. */
export function effectiveSort(f: Pick<DocFilters, 'sort' | 'q'>): SortId {
  return f.sort === 'auto' ? (f.q.trim() ? 'relevance' : 'newest') : f.sort;
}

/**
 * The one request behind every view. Browsing a folder lists what is directly in it (its subfolders are cards above); as soon as
 * something is typed or filtered, the folder and everything below it is searched, unless the person chose "Everywhere".
 */
export function searchPath(place: Place, f: DocFilters, now = new Date()): string {
  const p = new URLSearchParams();
  const q = f.q.trim();
  if (q) p.set('q', q);
  if (f.namesOnly && q) p.set('names_only', 'true');
  const narrowed = isNarrowed(f);

  if (place.kind === 'folder' && !(f.everywhere && narrowed)) {
    p.set('folder_id', place.id);
    p.set('recursive', String(f.subfolders || narrowed));
  }
  if (place.kind === 'unfiled') p.set('unfiled', 'true');
  if (place.kind === 'trash') p.set('trashed', 'true');
  if (f.starred || place.kind === 'starred') p.set('starred', 'true');
  if (f.types.length) p.set('types', f.types.join(','));
  if (f.exts.length) p.set('exts', f.exts.join(','));
  if (f.tags.length) p.set('tags', f.tags.join(','));
  if (f.uploader.trim()) p.set('uploader', f.uploader.trim());

  const range = dateRange(f, now);
  const to = range.to;
  const from = place.kind === 'recent' && f.added === 'any' ? daysBack(now, 6) : range.from;
  if (from) p.set('added_from', from);
  if (to) p.set('added_to', to);
  const size = SIZE_RANGE[f.size];
  if (size.min !== undefined) p.set('min_size', String(size.min));
  if (size.max !== undefined) p.set('max_size', String(size.max));

  const sort = SORTS.find(s => s.value === effectiveSort(f));
  if (sort?.sort) p.set('sort', sort.sort);
  if (sort?.dir) p.set('dir', sort.dir);
  return `/api/documents/search?${p}`;
}

/** The filters in force as removable chips. */
export function filterChips(f: DocFilters): { id: string; label: string }[] {
  const chips: { id: string; label: string }[] = [];
  f.types.forEach(t => chips.push({ id: `type:${t}`, label: typeMeta(t).plural }));
  f.exts.forEach(e => chips.push({ id: `ext:${e}`, label: `.${e}` }));
  f.tags.forEach(t => chips.push({ id: `tag:${t}`, label: `Tag: ${t}` }));
  if (f.uploader) chips.push({ id: 'uploader', label: `Added by ${f.uploader}` });
  if (f.starred) chips.push({ id: 'starred', label: 'Starred' });
  if (f.added !== 'any') {
    const preset = DATE_PRESETS.find(d => d.value === f.added)!;
    chips.push({ id: 'added', label: f.added === 'custom' ? `Added ${f.from || '…'} to ${f.to || '…'}` : `Added: ${preset.label.toLowerCase()}` });
  }
  if (f.size !== 'any') chips.push({ id: 'size', label: SIZE_PRESETS.find(s => s.value === f.size)!.label });
  return chips;
}

export function removeChip(f: DocFilters, id: string): DocFilters {
  const [kind, value] = [id.split(':')[0], id.slice(id.indexOf(':') + 1)];
  switch (kind) {
    case 'type': return { ...f, types: f.types.filter(t => t !== value) };
    case 'ext': return { ...f, exts: f.exts.filter(e => e !== value) };
    case 'tag': return { ...f, tags: f.tags.filter(t => t !== value) };
    case 'uploader': return { ...f, uploader: '' };
    case 'starred': return { ...f, starred: false };
    case 'added': return { ...f, added: 'any', from: '', to: '' };
    case 'size': return { ...f, size: 'any' };
    default: return f;
  }
}

/** Toggle one value in a list filter. */
export const toggled = (list: readonly string[], value: string): string[] => (list.includes(value) ? list.filter(v => v !== value) : [...list, value]);

// ── Showing a match ──────────────────────────────────────────────────────────────────────────────────────────────────
/** `text` cut into pieces, each marked as a match of one of the search words or not, so a result can show why it was found. */
export function highlightParts(text: string, terms: readonly string[]): { text: string; hit: boolean }[] {
  const words = [...new Set(terms.map(t => t.trim()).filter(Boolean))].sort((a, b) => b.length - a.length);
  if (!text || words.length === 0) return [{ text, hit: false }];
  const pattern = new RegExp(`(${words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  return text.split(pattern).filter(part => part !== '').map(part => ({ text: part, hit: words.some(w => w.toLowerCase() === part.toLowerCase()) }));
}

// ── History ──────────────────────────────────────────────────────────────────────────────────────────────────────────
const ACTION_LABEL: Record<string, string> = {
  upload: 'Uploaded', update: 'Edited', move: 'Moved', trash: 'Moved to the trash', restore: 'Restored from the trash', purge: 'Deleted for good',
};
export function activityLabel(entry: Pick<ActivityEntry, 'action' | 'details'>): string {
  const base = ACTION_LABEL[entry.action] ?? entry.action;
  const d = entry.details ?? {};
  const changed = Array.isArray(d.changed) ? d.changed.map(c => String(c).replace(/_/g, ' ')).join(', ') : '';
  const where = typeof d.to === 'string' && d.to ? ` to ${d.to.split(' > ').slice(-1)[0]}` : typeof d.folder === 'string' && d.folder && entry.action === 'upload' ? ` into ${d.folder.split(' > ').slice(-1)[0]}` : '';
  return `${base}${entry.action === 'update' && changed ? ` (${changed})` : ''}${where}`;
}

/** The files either side of `id` in a list, for the viewer's previous and next. */
export function neighbours<T extends { id: string }>(list: readonly T[], id: string): { previous: T | null; next: T | null; position: number } {
  const i = list.findIndex(x => x.id === id);
  return { previous: i > 0 ? list[i - 1] : null, next: i >= 0 && i < list.length - 1 ? list[i + 1] : null, position: i };
}
